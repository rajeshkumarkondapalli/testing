import { NextResponse } from 'next/server';

export interface ProviderStatus {
  id: string;
  name: string;
  label: string;
  description: string;
  free: boolean;
  available: boolean;
  models?: string[];
}

export async function GET() {
  const providers: ProviderStatus[] = [
    {
      id: 'replicate',
      name: 'Replicate',
      label: '🎬 Replicate (Free credits)',
      description: '$5 free credit on signup — high quality models: Minimax, Wan, Luma Ray',
      free: true,
      available: !!process.env.REPLICATE_API_TOKEN,
      models: ['wavespeedai/wan-2.1-t2v-480p', 'minimax/video-01', 'luma/ray'],
    },
    {
      id: 'huggingface',
      name: 'HuggingFace',
      label: '🤗 HuggingFace (Free)',
      description: 'Fully free with a free HF account — ZeroScope & ModelScope models',
      free: true,
      available: !!process.env.HUGGINGFACE_API_TOKEN,
      models: ['zeroscope_576w', 'zeroscope_xl', 'modelscope'],
    },
    {
      id: 'veo',
      name: 'Google Veo 2',
      label: '⚡ Google Veo 2',
      description: "Google's state-of-the-art model — best quality, paid API",
      free: false,
      available: !!process.env.VEO_API_KEY,
    },
  ];

  const available = providers.filter((p) => p.available);

  return NextResponse.json({ providers, defaultProvider: available[0]?.id ?? null });
}
