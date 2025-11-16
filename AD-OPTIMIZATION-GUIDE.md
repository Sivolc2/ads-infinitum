# Ad Infinitum - Auto-Optimization Guide

## Overview

The Ad Infinitum platform now includes an automatic ad optimization system that continuously monitors ad performance and takes actions to improve results. The system can:

- **Pause underperforming ads** based on CPL (Cost Per Lead) thresholds
- **Launch new ad variants** automatically to replace paused ads
- **Schedule evaluations** at custom intervals (hourly, daily, etc.)
- **Track optimization history** with detailed decision logs

## Features

### 1. Performance-Based Evaluation

The optimizer evaluates each ad variant based on:
- **CPL (Cost Per Lead)**: Pauses ads that exceed `target_cpl × cpl_multiplier`
- **Minimum Impressions**: Only evaluates ads with sufficient data
- **Minimum Leads**: Requires minimum leads before making decisions
- **Lead Trends**: Analyzes performance trends over time

### 2. Automatic Actions

When evaluation criteria are met, the system can:
- **Pause** ads that consistently underperform
- **Launch** new variants to replace paused ads (if enabled)
- **Keep** ads that meet or exceed performance targets

### 3. Countdown Timer

Each experiment shows a real-time countdown to the next evaluation:
- Updates every second
- Shows time remaining in hours, minutes, and seconds
- Displays "Evaluating soon..." when time expires

### 4. Customizable Configuration

Users can configure:
- **Evaluation Interval**: 1-168 hours (1 hour to 7 days)
- **CPL Multiplier**: Pause threshold (e.g., 1.5× target CPL)
- **Min Impressions**: Required impressions before evaluation
- **Min Leads**: Required leads before making decisions
- **Max Variants**: Total ad variants to maintain per experiment
- **Auto-Relaunch**: Whether to generate new variants automatically
- **Pause Underperforming**: Whether to auto-pause bad performers

## How It Works

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Cron Scheduler (Hourly)                 │
│               optimizer-cron.ts scheduled()              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           AdOptimizerService.evaluateAllExperiments()   │
│   - Finds experiments ready for evaluation              │
│   - Filters by status=running & enabled=true            │
│   - Checks next_optimization_at timestamp               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  For Each Experiment       │
        └────────┬───────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│     AdOptimizerService.evaluateExperiment(id)           │
│                                                          │
│   1. Load experiment configuration                      │
│   2. Get all active ad variants                         │
│   3. Fetch latest metrics for each                      │
│   4. Evaluate performance:                              │
│      - Check impressions >= threshold                   │
│      - Check leads >= min_leads_for_decision            │
│      - Compare CPL to target × multiplier               │
│   5. Take actions:                                      │
│      - Pause underperforming ads                        │
│      - Generate new variants (if auto_relaunch)         │
│      - Launch replacement ads                           │
│   6. Update next_optimization_at timestamp              │
│   7. Return OptimizationResult with decisions           │
└─────────────────────────────────────────────────────────┘
```

### Decision Flow

```
For Each Active Ad Variant:

  1. Has enough impressions?
     NO  → Keep (insufficient data)
     YES → Continue

  2. Has enough leads?
     NO  → Keep (insufficient leads)
     YES → Continue

  3. Is CPL > target × multiplier?
     YES → Pause (underperforming)
     NO  → Keep (performing well)

After Evaluation:

  1. Were any ads paused?
     NO  → Done
     YES → Continue

  2. Is auto_relaunch enabled?
     NO  → Done
     YES → Continue

  3. Are we under max_variants_per_experiment?
     NO  → Done
     YES → Generate and launch new variants
```

## Setup Instructions

### 1. Backend Setup

#### Configure Cron Trigger

Copy the example configuration:
```bash
cd repo_src/backend-raindrop
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` to set your desired cron schedule:
```toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

Common cron patterns:
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Once daily at midnight
- `0 0,12 * * *` - Twice daily (midnight and noon)

#### Deploy the Worker

```bash
npm install
npx wrangler deploy
```

The cron job will automatically start running on the configured schedule.

#### Manual Trigger (Optional)

You can also trigger optimization manually via API:
```bash
POST /api/optimization/evaluate-all
```

### 2. Frontend Setup

The UI is already integrated into the Experiments page. No additional setup needed.

### 3. Enable Optimization for an Experiment

1. Go to the **Experiments** page
2. Find a **Running** experiment
3. In the **Auto-Optimization** panel:
   - Toggle the switch to **Enabled**
   - Click **⚙️ Settings** to configure parameters
   - Adjust values as needed
   - Click **Save Settings**

## Usage Guide

### Viewing Optimization Status

On the Experiments page, each running experiment shows:

```
🤖 Auto-Optimization                    ⚙️ Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next Evaluation    Interval    Last Run
23h 45m 12s       24h         Jan 15, 3:00 PM

              ▶️ Evaluate Now
```

### Configuring Settings

Click **⚙️ Settings** to customize:

- **Evaluation Interval (hours)**: How often to check performance (1-168)
- **CPL Multiplier**: Pause threshold (e.g., 1.5 = pause if CPL > 1.5× target)
- **Min Impressions Threshold**: Required impressions before evaluating
- **Min Leads for Decision**: Required leads before pausing
- **Max Variants per Experiment**: Total variants to maintain (1-20)
- **Auto-relaunch new variants**: Generate replacements automatically
- **Automatically pause underperforming ads**: Enable auto-pausing

### Manual Evaluation

Click **▶️ Evaluate Now** to trigger an immediate evaluation without waiting for the scheduled time.

You'll see a summary of actions taken:
```
Evaluation complete!

✅ Evaluated: 5 variants
⏸️ Paused: 2 underperforming
🚀 Launched: 2 new variants
```

### Default Configuration

New experiments start with these defaults:
```javascript
{
  enabled: false,                      // Must be manually enabled
  evaluation_interval_hours: 24,       // Daily evaluation
  min_impressions_threshold: 1000,     // 1000 impressions minimum
  cpl_multiplier: 1.5,                 // Pause if CPL > 1.5× target
  min_leads_for_decision: 5,           // 5 leads minimum
  auto_relaunch: true,                 // Auto-generate replacements
  max_variants_per_experiment: 10,     // Max 10 variants total
  pause_underperforming: true,         // Auto-pause enabled
}
```

## API Reference

### Get Optimization Status

```
GET /api/experiments/:id/optimization/status
```

Response:
```json
{
  "success": true,
  "data": {
    "config": {
      "enabled": true,
      "evaluation_interval_hours": 24,
      "min_impressions_threshold": 1000,
      "cpl_multiplier": 1.5,
      "min_leads_for_decision": 5,
      "auto_relaunch": true,
      "max_variants_per_experiment": 10,
      "pause_underperforming": true
    },
    "last_optimization_at": "2025-01-15T15:00:00.000Z",
    "next_optimization_at": "2025-01-16T15:00:00.000Z",
    "time_until_next_ms": 86400000
  }
}
```

### Update Optimization Config

```
PATCH /api/experiments/:id/optimization/config
Content-Type: application/json

{
  "enabled": true,
  "evaluation_interval_hours": 12,
  "cpl_multiplier": 2.0
}
```

### Trigger Manual Evaluation

```
POST /api/experiments/:id/optimization/evaluate
```

Response:
```json
{
  "success": true,
  "data": {
    "experiment_id": "exp_123",
    "evaluated_at": "2025-01-15T16:00:00.000Z",
    "next_evaluation_at": "2025-01-16T04:00:00.000Z",
    "variants_evaluated": 5,
    "variants_paused": 2,
    "variants_launched": 2,
    "decisions": [
      {
        "ad_id": "ad_456",
        "headline": "Amazing Product Launch",
        "action": "pause",
        "reason": "CPL $3.50 exceeds threshold $3.00",
        "metrics": { ... }
      },
      {
        "ad_id": "ad_789",
        "headline": "New Ad Variant #1",
        "action": "launch",
        "reason": "Launched to replace underperforming variant"
      }
    ]
  },
  "message": "Evaluation complete: 2 paused, 2 launched"
}
```

### Evaluate All Experiments (Background Job)

```
POST /api/optimization/evaluate-all
```

Response:
```json
{
  "success": true,
  "data": {
    "experiments_evaluated": 3,
    "total_variants_paused": 5,
    "total_variants_launched": 5,
    "results": [ ... ]
  },
  "message": "Evaluated 3 experiments"
}
```

## Best Practices

### 1. Start Conservative

Begin with conservative settings:
- Higher CPL multiplier (2.0-3.0×)
- Longer evaluation interval (24-48 hours)
- Higher minimum impressions (2000+)

This prevents premature decisions on ads that need more time to gather data.

### 2. Monitor Initial Runs

Watch the first few automated evaluations to ensure:
- Decisions align with your expectations
- No good ads are being paused incorrectly
- New variants maintain quality

### 3. Adjust Based on Results

After 1-2 weeks, review performance and adjust:
- Lower CPL multiplier if too many bad ads run too long
- Raise CPL multiplier if good ads are paused too early
- Adjust evaluation interval based on traffic volume

### 4. Budget Considerations

Set appropriate limits:
- Keep `max_variants_per_experiment` reasonable (5-15)
- Monitor total spend across all variants
- Set experiment-level budget caps

### 5. Quality Control

If auto-relaunch is enabled:
- Periodically review generated ad variants
- Ensure AI-generated content maintains brand voice
- Manually adjust or pause poor-quality variants

## Troubleshooting

### Optimization Not Running

**Issue**: Countdown timer not appearing or never triggers

**Solutions**:
1. Check that experiment status is "running"
2. Verify optimization is enabled (toggle switch)
3. Check `next_optimization_at` is set correctly
4. Verify cron job is configured in `wrangler.toml`
5. Check Cloudflare Workers logs for errors

### Too Many Ads Paused

**Issue**: Good ads are being paused prematurely

**Solutions**:
1. Increase `cpl_multiplier` (e.g., from 1.5 to 2.5)
2. Increase `min_leads_for_decision` to require more data
3. Increase `min_impressions_threshold` to wait longer
4. Extend `evaluation_interval_hours` for more data collection

### Not Enough Ads Paused

**Issue**: Underperforming ads continue running

**Solutions**:
1. Decrease `cpl_multiplier` (e.g., from 2.0 to 1.3)
2. Decrease `min_leads_for_decision` to act sooner
3. Decrease `evaluation_interval_hours` to check more often
4. Verify `pause_underperforming` is enabled

### No New Variants Launched

**Issue**: Ads paused but no replacements generated

**Solutions**:
1. Verify `auto_relaunch` is enabled
2. Check `max_variants_per_experiment` limit not reached
3. Review backend logs for AI generation errors
4. Verify LLM provider (Raindrop/OpenRouter) is configured
5. Check image generation service (Freepik/fal.ai) is working

## Monitoring & Logs

### Cron Job Logs

View scheduled optimization logs in Cloudflare Workers dashboard:
```
🤖 Starting scheduled ad optimization...
📊 Found 3 experiments ready for evaluation
🔍 Evaluating experiment exp_123...
✅ Experiment exp_123: 5 evaluated, 2 paused, 2 launched
📈 Optimization Summary:
  ✅ Experiments evaluated: 3
  ⏸️  Variants paused: 5
  🚀 Variants launched: 5
  ⏱️  Duration: 2341ms
✅ Scheduled optimization complete
```

### Manual Evaluation Logs

Similar format when triggered manually via UI or API.

### Decision History

Detailed decision logs include:
- Ad ID and headline
- Action taken (keep/pause/launch)
- Reason for decision
- Performance metrics at time of decision

## Support

For issues, questions, or feature requests:
- Check this guide first
- Review Cloudflare Workers logs
- Contact support team
- File issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: January 2025
