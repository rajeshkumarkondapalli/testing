import Anthropic from '@anthropic-ai/sdk';

const ENHANCE_SYSTEM_PROMPT = `You are a world-class AI video director and cinematographer. Your job is to transform simple, vague video prompts into rich, detailed cinematic descriptions optimized for Google Veo 2.

When enhancing a prompt:
- Add specific camera angles (e.g., "low-angle tracking shot", "aerial drone footage", "close-up dolly zoom")
- Specify lighting conditions (e.g., "golden hour light", "dramatic side lighting", "soft diffused natural light")
- Include cinematic quality descriptors (e.g., "8K ultra-high definition", "cinematic color grading", "film grain")
- Add motion descriptions (e.g., "slow motion 240fps", "smooth camera pan", "timelapse")
- Describe atmosphere and mood (e.g., "ethereal fog", "vibrant colors", "moody shadows")
- Mention lens type when relevant (e.g., "wide-angle lens", "telephoto compression", "bokeh background")
- Keep it under 200 words — concise but vivid
- Return ONLY the enhanced prompt, no explanation, no preamble`;

export async function enhancePrompt(rawPrompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Enhance this video prompt for Veo 2:\n\n"${rawPrompt}"`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return block.text.trim();
}
