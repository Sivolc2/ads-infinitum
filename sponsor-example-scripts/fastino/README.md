# Fastino GLiNER-2 API Example

This example demonstrates how to use Fastino's GLiNER-2 API for zero-shot entity extraction, text classification, and structured JSON extraction from user feedback and marketing responses.

## Setup

1. Get your API key from [Fastino.ai](https://fastino.ai)

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key to the `.env` file:
   ```
   FASTINO_API_KEY=your_actual_api_key_here
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the example:
```bash
npm run dev
```

Or build and run:
```bash
npm run build
npm start
```

## What it does

The example demonstrates two key use cases:

### 1. Classify User Interest Level
Categorizes user messages into interest categories:
- `high_interest` - Users ready to buy/engage
- `curious` - Users wanting more information
- `uninterested` - Users not interested
- `complaint` - Users with issues/complaints

### 2. Extract Structured Feedback
Extracts structured data from freeform user feedback:
- Product name or type
- User sentiment (happy, frustrated, confused, excited)
- Feature requests or improvements

## API Features Used

- **Task Types**: `classify_text` and `extract_json`
- **Zero-shot Learning**: No training data needed
- **Custom Schemas**: Define your own categories and fields
- **Threshold Control**: Adjust confidence thresholds (0.4-0.5)

## Integration

To integrate into your ad feedback pipeline, import the functions:

```typescript
import { classifyInterest, extractFeedbackFields } from './lib/fastino.js';

// Classify new leads by interest level
const interest = await classifyInterest(
  "This looks interesting, tell me more about pricing"
);
// → "curious"

// Extract structured feedback
const feedback = await extractFeedbackFields(
  "I love the SolarPanel X3 idea! Would be amazing if it had built-in battery storage though."
);
// → [{ product: "SolarPanel X3", sentiment: "excited", feature_request: "built-in battery storage" }]
```

## Use Cases

Perfect for:
- Processing ad responses and Kickstarter comments
- Categorizing user feedback by intent
- Extracting product insights from unstructured text
- Feeding structured data into SmartMemory or analytics pipelines
- Prioritizing leads based on interest level
