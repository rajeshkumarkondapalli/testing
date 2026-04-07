import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY environment variable is not configured' },
      { status: 500 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  if (prompt.trim().length > 1000) {
    return NextResponse.json({ error: 'Prompt must be under 1000 characters' }, { status: 400 });
  }

  try {
    const enhanced = await enhancePrompt(prompt.trim(), apiKey);
    return NextResponse.json({ enhanced });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enhance prompt';
    console.error('Enhance error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
