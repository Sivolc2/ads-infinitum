At a high level, Ad Infinitum is:

> A self-evolving “product scout” that uses ads as probes: generate ideas → test them with Meta ads → keep only what works → spin up a landing page → start collecting real humans → (optionally) hand off to builders.

Let’s design it like a proper system, not just a demo.

---

## 1. Component Map (who does what)

### A. Agent & Orchestration Layer (Raindrop + OpenRouter)

* **Orchestrator Agent (Raindrop)**

  * Owns the *loop* for each product concept:

    * Generate product ideas
    * Spin up ad experiments
    * Evaluate performance
    * Decide to refine / scale / kill / promote to landing page / handoff to builders
  * Uses **OpenRouter** as the LLM backend for reasoning & copywriting.

* **Experiment Manager (Raindrop Actors + Observers)**

  * Actor: `AdExperimentActor` – creates/updates ad sets + creatives on Meta.
  * Observer: `MetricsCollectorObserver` – periodically pulls performance from Meta and logs metrics.
  * Actor: `PromotionActor` – when thresholds hit, triggers landing-page creation + builder handoff.

* **Analytics / Batch Intelligence (Daft)**

  * Uses Daft’s `prompt` function to perform massively-parallel operations on logs:

    * Cluster user feedback
    * Generate improved copy at scale for underperforming segments
    * Run “what’s working & why” analyses over thousands of rows. ([Daft][1])

### B. External Tools & Integrations

* **Meta Ads (Marketing API)**

  * Create campaigns, ad sets, creatives, and lead forms.
  * Retrieve performance and leads via Graph API / Lead Ads endpoints. ([Facebook Developers][2])

* **fal.ai (image generation)**

  * Generate product hero images and ad visuals. ([Fal.ai][3])

* **Fastino (GLiNER-2)**

  * Entity extraction + text classification for:

    * Enriching lead data into user profiles/personas.
    * Guardrails (e.g., “is this feedback abusive/spam?”) ([Fastino][4])

* **Lovable**

  * “Build-with-URL” portal to spin up a Kickstarter-style landing page:

    * Product description, visuals, “likes / dislikes”, estimated cost.

* **Freelancer.com (and/or Upwork)**

  * Posting jobs when a product meets success criteria:

    * “Build this product to spec using these creatives + user feedback.”

### C. Data & Storage

You can choose:

* A simple **Postgres** (via Supabase/Raindrop SmartSQL), plus
* **Raindrop SmartBuckets** for semi-structured blobs / logs.

---

## 2. Core Data Contracts (the shared language between everything)

I’ll define these as JSON-like schemas you can turn into SQL tables or SmartBuckets.

### 2.1 Product & Experiment

```ts
// products
ProductConcept {
  id: string;                 // "pc_..."
  title: string;              // "Solarpunk AI Desk Buddy"
  tagline: string;
  description: string;
  hypothesis: string;         // what we think it solves
  target_audience: string;    // text segment, e.g. "Gen Z students with ADHD"
  status: "draft" | "testing" | "validated" | "killed" | "handoff";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

// experiments
AdExperiment {
  id: string;                 // "exp_..."
  product_id: string;
  platform: "meta";
  goal: "leads" | "clicks";
  budget_total_usd: number;
  budget_per_day_usd: number;
  min_leads_for_decision: number;
  target_cpl_threshold_usd: number;    // e.g. 1.0
  status: "pending" | "running" | "paused" | "completed";
  round: number;              // exploration / iteration cycle
  created_at: string;
  updated_at: string;
}
```

### 2.2 Ads & Metrics

```ts
// ad variants
AdVariant {
  id: string;                 // "ad_..."
  experiment_id: string;
  product_id: string;

  platform: "meta";
  meta_campaign_id: string;
  meta_adset_id: string;
  meta_ad_id: string;         // Graph API ID

  headline: string;
  body: string;
  image_url: string;          // from fal.ai
  cta: string;                // "Sign up", etc.

  status: "draft" | "active" | "paused" | "deleted";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

// metrics snapshots pulled from Meta
AdMetricsSnapshot {
  id: string;                 // "ams_..."
  ad_id: string;              // FK -> AdVariant.id
  pulled_at: string;          // timestamp we pulled metrics

  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;

  ctr: number;                // derived: clicks/impressions
  cpl_usd: number;            // derived: spend/leads
  cpc_usd: number;            // derived: spend/clicks
}
```

This is enough for the **Experiment Manager** to decide:

* “Kill variants with CPL > threshold and enough trials”
* “Allocate more budget to top 20% CTR/CPL variants”
* “Promote product to `validated` when at least one variant hits CPL threshold with N leads”.

### 2.3 Landing Page & Public Presence

```ts
LandingPage {
  id: string;                 // "lp_..."
  product_id: string;
  lovable_url: string;        // generated via Build-with-URL
  hero_image_url: string;
  gallery_image_urls: string[];

  pitch_markdown: string;     // copy used on the page
  estimate_cost_to_deliver_usd: number | null;
  call_to_action: string;     // "Join the waitlist", etc.

  likes_count: number;
  dislikes_count: number;
  created_at: string;
  updated_at: string;
}
```

The landing page front-end can POST feedback into a simple API that increments likes / dislikes and records optional comments.

### 2.4 Leads, Profiles & Feedback

```ts
// raw lead from Meta or landing form
Lead {
  id: string;                 // "lead_..."
  product_id: string;
  ad_id: string | null;       // null if direct from page
  landing_page_id: string | null;

  source: "meta_lead_form" | "landing_form";
  email: string | null;
  name: string | null;
  raw_form_data: any;         // JSON from Meta or your form

  created_at: string;
}

// processed / enriched view of that lead
UserProfile {
  id: string;                 // "usr_..."
  lead_id: string;
  segments: string[];         // "creator", "student", "freelancer"
  interest_level: "high" | "medium" | "low";
  budget_band: "low" | "mid" | "high" | null;
  problem_tags: string[];     // ["overwhelm", "task management"]
  feature_requests: string[];
  sentiment: "excited" | "neutral" | "skeptical" | "negative" | null;

  created_at: string;
  updated_at: string;
}
```

The **Fastino** side is basically:

* Input: `Lead.raw_form_data` (plus optionally any open-text feedback from your page)
* Output: `UserProfile` fields (segments, problem tags, sentiment) via `POST /gliner-2` & your schema. ([Fastino][4])

### 2.5 Build Handoff

```ts
BuildContract {
  id: string;                 // "build_..."
  product_id: string;
  platform: "freelancer" | "upwork";
  external_job_id: string | null;  // set after posting

  status: "draft" | "posted" | "in_progress" | "completed" | "cancelled";

  spec_markdown: string;      // generated requirements doc
  budget_usd: number;
  notes_for_builder: string;  // high-level context from experiments

  created_at: string;
  updated_at: string;
}
```

The spec is generated by the Orchestrator using:

* Winning ad creatives
* Landing page copy
* Aggregated user feedback (via Daft)
* Performance metrics (CPL, volume).

---

## 3. End-to-End Flow (how the pieces talk)

Let’s walk one product through the machine.

### Step 0 – Human or Agent seeds a goal

Input: “Find & validate <$1 CPL> ideas for AI-enabled desk gadgets for remote workers.”

* Orchestrator (Raindrop + OpenRouter) generates N `ProductConcept`s.
* For each: creates an `AdExperiment` with a budget & CPL threshold.

### Step 1 – Generate ads (copy + images)

For each `ProductConcept`:

1. Orchestrator asks OpenRouter:

   * “Generate 3 value propositions and 3 CTAs.”
2. For each proposition:

   * Call **fal.ai** to generate a hero image:

     * prompt includes product description, audience, vibe (solarpunk/cyberpunk/etc). ([Fal.ai][3])
3. Assemble 3–6 `AdVariant` records with:

   * headline, body, CTA, `image_url`.

### Step 2 – Push to Meta Ads

`AdExperimentActor`:

* For each `AdVariant`:

  * Uses Meta Marketing API to:

    * Ensure a Campaign + Ad Set exists for that experiment.
    * Create or reuse a Lead Form.
    * Create an Ad Creative with the fal.ai image.
    * Create the Ad with targeting derived from the product’s audience. ([Facebook Developers][2])
  * Fills `AdVariant.meta_*_id` fields.

Experiment status → `"running"`.

### Step 3 – Pull metrics & evolve (loop)

`MetricsCollectorObserver` runs every X minutes:

1. Query Meta Ads Insights for each active `AdVariant`.
2. Insert an `AdMetricsSnapshot` row.
3. For each `AdExperiment`, compute aggregate stats.
4. Trigger Orchestrator to:

   * Kill losing ads (high CPL, enough samples).
   * Duplicate & slightly mutate winners (new copy/image).
   * Adjust budgets between variants (basic bandit policy).

**Daft integration**: when there’s enough data:

* Load `AdMetricsSnapshot` + `UserProfile` into a Daft DataFrame.
* Use `daft.functions.ai.prompt` to:

  * Generate improved copy for each underperforming segment in parallel.
  * Summarize “what resonates” per persona cluster. ([Daft][1])

### Step 4 – Landing page promotion

When a product has at least one variant with:

* `cpl_usd <= target_cpl_threshold_usd`, and
* `leads >= min_leads_for_decision`

Then:

1. Orchestrator marks `ProductConcept.status = "validated"`.
2. Generates:

   * a “Kickstarter-style” blurb + feature list (OpenRouter),
   * hero/gallery images (fal.ai, potentially reusing the winning ad creative).
3. Builds a **Lovable Build-with-URL** link that encodes:

   * title, tagline, hero copy, feature bullets, etc.
4. Opens that link (human clicks in demo) → Lovable spins up landing page.
5. Save the resulting URL in `LandingPage.lovable_url`.

### Step 5 – Lead capture & enrichment

Leads now come from two paths:

* Meta Lead Forms
* Landing page form

Either way, your backend:

1. Normalizes into `Lead` rows.
2. For each `Lead`, calls **Fastino**:

   * Task: `extract_json` on any open response fields:

     * “What problem are you hoping this solves?”
     * “Tell us about your work setup.”
   * Schema for problem tags, sentiment, budget, etc. ([Fastino][4])
3. Writes a `UserProfile` row.

This data feeds back into:

* Better targeting on Meta.
* Better copy via Daft/OpenRouter.
* More accurate build spec later.

### Step 6 – Handoff to builders (Freelancer.com / Upwork)

When you reach a “build-worthy” condition, e.g.:

* CPL < $1 for 3 days
* N ≥ 100 leads
* High proportion of “high_interest” profiles

Then:

1. Orchestrator composes a `BuildContract` spec:

   * Top-performing creatives & copy.
   * UserProfile segment breakdown.
   * Key problem/feature insights (from Daft).
2. Posts a job via the chosen freelancer marketplace API with:

   * Project title, description, deliverables, deadlines, budget.
3. `BuildContract.status = "posted"` and `external_job_id` set.

For hackathon day, you can:

* Either actually post a *draft/hidden* job,
* Or stub the API call and show the generated spec JSON in the demo.

---

## 4. Hackathon-Sane Scope vs Stretch

**Core (definitely build):**

* Raindrop backend with:

  * `ProductConcept`, `AdExperiment`, `AdVariant`, `AdMetricsSnapshot`.
* One orchestrator loop:

  * Generate ads (OpenRouter + fal.ai),
  * Push to Meta,
  * Pull metrics & re-rank,
  * When threshold hit → generate Lovable URL + mark `LandingPage`.
* Basic lead handling + Fastino enrichment for 1–2 sample leads.
* Simple UI (even just JSON & logs) that:

  * Shows experiment list,
  * Shows ad variants & metrics,
  * Shows “Promoted to landing page” + link.

**Stretch:**

* Daft-based batch improvement of copy.
* Full freelancer.com posting with a generated spec.
* Airia as a “PM control panel” that wires into Raindrop’s APIs.

---

If you’d like, next step I can:

* Turn these data contracts into a **concrete SQL schema**, and
* Sketch **one or two Raindrop service/actor files** wired to Meta + fal.ai so you have a starting repo structure for the hack.

[1]: https://www.daft.ai/blog/prompting-with-dataframes-massively-parallel-context-engineering-is-here?utm_source=chatgpt.com "Prompting with DataFrames: Massively Parallel Context Eng..."
[2]: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/?utm_source=chatgpt.com "Lead Ads - Marketing API - Meta for Developers - Facebook"
[3]: https://fal.ai/?utm_source=chatgpt.com "Generative AI APIs | Run Img, 3D, Video AI Models 4x Faster ..."
[4]: https://fastino.ai/api-reference/gliner-2?utm_source=chatgpt.com "Run Inference - Docs Template"
