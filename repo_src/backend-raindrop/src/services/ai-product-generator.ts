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
 * Generate a mock product concept for development
 */
function generateMockProduct(): ProductConcept {
  const templates = [
    {
      title: 'FocusFlow Timer',
      tagline: 'Stay focused with ambient productivity cues',
      description: 'A smart desk timer that uses subtle light and sound patterns to help you maintain focus during work sessions. Integrates with your calendar and learns your productivity patterns.',
      hypothesis: 'Remote workers struggle with maintaining focus in home environments. A physical device that provides ambient cues can help create work boundaries without being disruptive.',
      target_audience: 'Remote workers and freelancers aged 25-45 who work from home and value productivity tools'
    },
    {
      title: 'SnapRecipe AI',
      tagline: 'Photo to recipe in seconds',
      description: 'Take a photo of any meal and instantly get a detailed recipe with ingredients and cooking instructions. Perfect for recreating restaurant dishes at home.',
      hypothesis: 'Home cooks want to recreate dishes they see but struggle to figure out ingredients and techniques. AI can analyze food photos and generate accurate recipes.',
      target_audience: 'Home cooking enthusiasts aged 25-50 who eat out frequently and enjoy experimenting in the kitchen'
    },
    {
      title: 'PlantPal Sensor',
      tagline: 'Never kill a houseplant again',
      description: 'Smart soil sensor that monitors moisture, light, and nutrients for your plants. Sends personalized care reminders and tips via app.',
      hypothesis: 'Plant parents struggle to provide proper care because each plant has different needs. Real-time monitoring removes the guesswork.',
      target_audience: 'Urban millennials aged 25-40 who love houseplants but struggle to keep them alive'
    },
    {
      title: 'PetCam Treat',
      tagline: 'See, talk to, and treat your pet remotely',
      description: 'HD camera with treat dispenser that lets you check on and interact with your pets throughout the day. Includes two-way audio and automated treat scheduling.',
      hypothesis: 'Pet owners feel guilty leaving pets alone and want to maintain connection during the day. Interactive features reduce separation anxiety for both.',
      target_audience: 'Pet owners aged 25-50 who work outside the home and treat their pets like family'
    },
    {
      title: 'SleepSync Pod',
      tagline: 'Personal sleep environment optimization',
      description: 'Smart sleep device that optimizes your bedroom temperature, sounds, and lighting based on your sleep patterns. Learns what helps you sleep best.',
      hypothesis: 'Poor sleep quality stems from environmental factors people can\'t easily control. Automated optimization removes the trial-and-error.',
      target_audience: 'Professionals aged 30-55 struggling with sleep quality who value health optimization'
    }
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: generateProductId(),
    ...template,
    status: 'draft',
    created_by: 'agent',
    ...createTimestamps()
  };
}

/**
 * Generate a product concept using AI
 */
export async function generateProductConcept(
  options: GenerateProductOptions
): Promise<ProductConcept> {
  const { openrouterApiKey, raindropAI, useRaindrop } = options;

  // If no LLM provider is available, use mock generator for development
  if (!openrouterApiKey && (!useRaindrop || !raindropAI)) {
    console.log('⚠️  No LLM provider available, using mock product generator for development');
    return generateMockProduct();
  }

  const systemPrompt = `You are a creative product strategist and startup advisor.
Your goal is to generate innovative, viable product concepts that solve real problems.

Key principles:
- Identify underserved markets or pain points
- Create products that are technically feasible
- Target specific, reachable audiences
- Validate assumptions with clear hypotheses
- Focus on products that can be tested quickly with ads`;

  const userPrompt = `Generate a single innovative product concept.

The product should:
1. Solve a real problem for a specific audience
2. Be testable with online advertising
3. Have a clear value proposition
4. Target a reachable market

Provide your response as a JSON object with these fields:
{
  "title": "Product name (2-4 words)",
  "tagline": "Short tagline (5-10 words)",
  "description": "Detailed description explaining what the product does and how it works (2-3 sentences)",
  "hypothesis": "The core problem this solves and why people will pay for it (1-2 sentences)",
  "target_audience": "Specific target audience with demographics/psychographics (e.g., 'Remote workers aged 25-40 who struggle with focus')"
}

Be creative but practical. Think about products that could be validated through ad campaigns.`;

  let responseText: string;

  if (useRaindrop && raindropAI) {
    // Use Raindrop AI (with fallback to mock if it fails)
    try {
      console.log('🤖 Using Raindrop AI (deepseek-r1) to generate product concept...');

      const response = await raindropAI.run('deepseek-r1', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9, // Higher temperature for more creativity
        max_tokens: 1000
      });

      responseText = response.text || response.response || '';

      if (!responseText) {
        throw new Error('Raindrop AI returned empty response');
      }
    } catch (error) {
      // Raindrop AI failed (likely in dev mode), fall back to mock
      console.log('⚠️  Raindrop AI unavailable, using mock product generator for development');
      return generateMockProduct();
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
        'X-Title': 'Ad Infinitum'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 0.9,
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
