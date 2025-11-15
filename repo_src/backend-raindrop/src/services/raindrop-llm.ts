/**
 * Raindrop Native LLM Service
 *
 * Uses Raindrop's built-in AI capabilities instead of OpenRouter.
 * Provides the same interface as openrouter.ts for easy swapping.
 */

import { CopyVariation } from '../models/types';

// Raindrop AI interface (from env.AI in Raindrop Service)
export interface RaindropAI {
  run(model: string, options: {
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: 'json_object' };
  }): Promise<any>;
}

/**
 * Generate ad copy variations using Raindrop's built-in LLM
 * Uses deepseek-r1 as specified
 *
 * @param productName - The name of the product
 * @param productDescription - Description of what the product does
 * @param targetAudience - Who the product is for
 * @param hypothesis - What problem it solves
 * @param numVariations - How many copy variations to generate (default: 3)
 * @param ai - Raindrop AI instance from env.AI
 * @returns Array of copy variations with headline, body, CTA, and value prop
 */
export async function generateAdCopy(options: {
  productName: string;
  productDescription: string;
  targetAudience: string;
  hypothesis: string;
  numVariations?: number;
  ai: RaindropAI;
}): Promise<CopyVariation[]> {
  const {
    productName,
    productDescription,
    targetAudience,
    hypothesis,
    numVariations = 3,
    ai
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

  try {
    const aiResponse = await ai.run('deepseek-r1', {
      model: 'deepseek-r1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,  // Higher creativity for diverse variations
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    // Parse response (Raindrop AI returns similar structure to OpenRouter)
    const content = (aiResponse as any).choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    if (!parsed.variations || !Array.isArray(parsed.variations)) {
      throw new Error('Invalid response format from Raindrop AI');
    }

    return parsed.variations as CopyVariation[];
  } catch (error) {
    console.error('❌ Raindrop AI error:', error);
    throw new Error(`Failed to generate ad copy: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  ai: RaindropAI;
}): Promise<string[]> {
  const {
    productName,
    productDescription,
    targetAudience,
    hypothesis,
    numPropositions = 3,
    ai
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

  try {
    const aiResponse = await ai.run('deepseek-r1', {
      model: 'deepseek-r1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = (aiResponse as any).choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    return parsed.propositions as string[];
  } catch (error) {
    console.error('❌ Raindrop AI error:', error);
    throw new Error(`Failed to generate value propositions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Factory function to determine which LLM provider to use
 * Controlled by LLM_PROVIDER environment variable
 */
export function shouldUseRaindropAI(env: any): boolean {
  // Check LLM_PROVIDER env var
  const provider = env.LLM_PROVIDER || process.env.LLM_PROVIDER || 'raindrop';
  return provider.toLowerCase() === 'raindrop';
}

/**
 * Get LLM provider name for logging
 */
export function getLLMProvider(env: any): string {
  return shouldUseRaindropAI(env) ? 'Raindrop AI (deepseek-r1)' : 'OpenRouter';
}
