// AI Product Concept Generator
// Generates product concepts using LLM (OpenRouter or Raindrop AI)

import { ProductConcept, generateProductId, createTimestamps } from '../models/product';

interface GenerateProductOptions {
  openrouterApiKey?: string;
  raindropAI?: any;
  useRaindrop?: boolean;
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * Generate a product concept using AI
 */
export async function generateProductConcept(
  options: GenerateProductOptions
): Promise<ProductConcept> {
  const { openrouterApiKey, raindropAI, useRaindrop } = options;

  // Check if we have an LLM provider
  if (!raindropAI && !openrouterApiKey) {
    throw new Error('No LLM provider available. Set OPENROUTER_API_KEY in .env or deploy to Raindrop platform.');
  }

  const systemPrompt = `You are a creative product strategist and startup advisor specializing in physical consumer products.
Your goal is to generate innovative, viable PHYSICAL/HARDWARE product concepts that solve real problems.

Key principles:
- Identify underserved markets or pain points
- Create PHYSICAL products (gadgets, devices, tools, accessories, wearables, etc.) - NO software, apps, or digital services
- Target specific, reachable audiences
- Validate assumptions with clear hypotheses
- Focus on products that can be tested quickly with ads

IMPORTANT: Every product must be a tangible, physical item that can be manufactured and shipped.`;

  const userPrompt = `Generate a single innovative PHYSICAL product concept. This must be a hardware/physical product, not software.

CRITICAL REQUIREMENTS:
1. Must be a PHYSICAL/HARDWARE product (e.g., gadget, device, tool, wearable, accessory)
2. NO software, apps, digital services, or platforms
3. Must be tangible and shippable
4. Solve a real problem for a specific audience
5. Be testable with online advertising (can show in photos/videos)
6. Have a clear value proposition
7. Target a reachable market

Generate something COMPLETELY DIFFERENT and creative each time. Consider:
- Different product categories (home, fitness, productivity, travel, wellness, etc.)
- Different target markets and demographics
- Different price points and use cases
- Emerging trends and unmet needs

Current timestamp for uniqueness: ${Date.now()}

Provide your response as a JSON object with these fields:
{
  "title": "Product name (2-4 words)",
  "tagline": "Short tagline (5-10 words)",
  "description": "Detailed description explaining what the physical product does and how it works (2-3 sentences)",
  "hypothesis": "The core problem this solves and why people will pay for it (1-2 sentences)",
  "target_audience": "Specific target audience with demographics/psychographics (e.g., 'Remote workers aged 25-40 who struggle with focus')"
}

Be creative, innovative, and practical. Generate a unique physical product that could be validated through ad campaigns.`;

  let responseText: string;

  if (useRaindrop && raindropAI) {
    // Use Raindrop AI (in dev mode, this will use OpenRouter as fallback)
    console.log('🤖 Using Raindrop AI (deepseek-r1) to generate product concept...');

    const response = await raindropAI.run('deepseek-r1', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.0, // Maximum temperature for maximum creativity and variance
      max_tokens: 1000
    });

    responseText = response.text || response.response || '';

    if (!responseText) {
      throw new Error('Raindrop AI returned empty response');
    }
  } else if (openrouterApiKey) {
    // Use OpenRouter
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ads-infinitum.app',
        'X-Title': 'Ad Infinitum',
        'X-No-Cache': '1'  // Disable caching to ensure fresh responses
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 1.0,  // Maximum temperature for maximum variance
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();
    responseText = data.choices[0]?.message?.content || '';
  } else {
    throw new Error('No LLM provider available. Set OPENROUTER_API_KEY or use Raindrop AI.');
  }

  // Parse the JSON response
  let productData: any;
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      productData = JSON.parse(jsonMatch[0]);
    } else {
      productData = JSON.parse(responseText);
    }
  } catch (error) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('Failed to parse AI response as JSON');
  }

  // Validate required fields
  if (!productData.title || !productData.tagline || !productData.description ||
      !productData.hypothesis || !productData.target_audience) {
    throw new Error('AI response missing required fields');
  }

  // Create the product concept
  const product: ProductConcept = {
    id: generateProductId(),
    title: productData.title,
    tagline: productData.tagline,
    description: productData.description,
    hypothesis: productData.hypothesis,
    target_audience: productData.target_audience,
    status: 'draft',
    created_by: 'agent',
    ...createTimestamps()
  };

  return product;
}

/**
 * Estimate the cost of generating a product concept
 */
export function estimateProductGenerationCost(): {
  llm_tokens_estimated: number;
  cost_usd_estimated: number;
} {
  return {
    llm_tokens_estimated: 1000,
    cost_usd_estimated: 0.003 // ~$0.003 per product concept with Claude 3.5 Sonnet
  };
}
