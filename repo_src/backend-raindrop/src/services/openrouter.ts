// OpenRouter LLM integration for ad copy generation
import { CopyVariation } from '../models/types';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate ad copy variations using OpenRouter LLM
 * @param productName - The name of the product
 * @param productDescription - Description of what the product does
 * @param targetAudience - Who the product is for
 * @param hypothesis - What problem it solves
 * @param numVariations - How many copy variations to generate (default: 3)
 * @returns Array of copy variations with headline, body, CTA, and value prop
 */
export async function generateAdCopy(options: {
  productName: string;
  productDescription: string;
  targetAudience: string;
  hypothesis: string;
  numVariations?: number;
  apiKey: string;
}): Promise<CopyVariation[]> {
  const {
    productName,
    productDescription,
    targetAudience,
    hypothesis,
    numVariations = 3,
    apiKey
  } = options;

  const systemPrompt = `You are a world-class performance marketer and copywriter specializing in Meta ads.
Your goal is to create compelling, high-converting ad copy that stops scrollers and drives action.

Key principles:
- Hook within first 3 words
- Lead with benefits, not features
- Speak directly to pain points
- Use social proof when relevant
- Clear, urgent CTAs
- Mobile-optimized (short, punchy)`;

  const userPrompt = `Create ${numVariations} distinct ad copy variations for:

Product: ${productName}
Description: ${productDescription}
Target Audience: ${targetAudience}
Core Problem/Solution: ${hypothesis}

For each variation, provide:
1. headline: A short, attention-grabbing headline (max 40 chars, optimized for mobile)
2. body: Compelling body copy (125-150 chars, focusing on benefits and social proof)
3. cta: A clear call-to-action (e.g., "Sign Up", "Learn More", "Get Started", "Join Waitlist")
4. value_proposition: The specific angle/benefit this variant emphasizes (e.g., "time savings", "anxiety relief", "status/aesthetic")

Requirements:
- Each variation should test a DIFFERENT value proposition or emotional angle
- Headlines should be provocative, curiosity-driven, or benefit-focused
- Body text should elaborate on the headline and build desire
- Avoid generic corporate speak - write like a human
- Optimize for Meta's algorithm (engagement, dwell time)

Return ONLY valid JSON in this exact format:
{
  "variations": [
    {
      "headline": "...",
      "body": "...",
      "cta": "...",
      "value_proposition": "..."
    }
  ]
}`;

  const requestBody: OpenRouterRequest = {
    model: 'anthropic/claude-3.5-sonnet',  // Using Claude for high-quality copy
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,  // Higher creativity for diverse variations
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ads-infinitum.ai',  // Optional: for rankings
      'X-Title': 'Ad Infinitum'  // Optional: show in rankings
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenRouter');
  }

  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (!parsed.variations || !Array.isArray(parsed.variations)) {
    throw new Error('Invalid response format from OpenRouter');
  }

  return parsed.variations as CopyVariation[];
}

/**
 * Generate multiple value propositions for a product
 * Used to create diverse ad angles
 */
export async function generateValuePropositions(options: {
  productName: string;
  productDescription: string;
  targetAudience: string;
  hypothesis: string;
  numPropositions?: number;
  apiKey: string;
}): Promise<string[]> {
  const {
    productName,
    productDescription,
    targetAudience,
    hypothesis,
    numPropositions = 3,
    apiKey
  } = options;

  const systemPrompt = `You are a strategic product marketer. Your goal is to identify diverse value propositions and angles for products.`;

  const userPrompt = `For the following product, generate ${numPropositions} distinct value propositions/angles to test in ads:

Product: ${productName}
Description: ${productDescription}
Target Audience: ${targetAudience}
Core Problem/Solution: ${hypothesis}

Each value proposition should emphasize a DIFFERENT benefit or emotional angle:
- Functional benefit (e.g., "saves 2 hours/day")
- Emotional benefit (e.g., "reduces anxiety", "boosts confidence")
- Social benefit (e.g., "impressive desk setup", "conversation starter")
- Aspirational (e.g., "future of work", "cutting-edge tech")

Return ONLY valid JSON:
{
  "propositions": ["proposition 1", "proposition 2", ...]
}`;

  const requestBody: OpenRouterRequest = {
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.9,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ads-infinitum.ai',
      'X-Title': 'Ad Infinitum'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);

  return parsed.propositions as string[];
}
