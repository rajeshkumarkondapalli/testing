export type Provider = 'veo' | 'huggingface' | 'local';

export interface ProviderInfo {
  id: Provider;
  name: string;
  label: string;
  description: string;
  free: boolean;
  quality: 'high' | 'medium' | 'low';
  available: boolean;
}

export interface GenerateResult {
  /** For async providers (Veo): operation name to poll */
  operationName?: string;
  /** For sync providers (HF / local): direct video data URL or URL */
  videoUrl?: string;
  /** Whether the result is immediately available (no polling needed) */
  immediate: boolean;
}

/** Check which providers are usable based on env vars */
export function getAvailableProviders(): ProviderInfo[] {
  return [
    {
      id: 'local',
      name: 'Local GPU',
      label: '🖥 Local GPU',
      description: 'Your own GPU — fastest, fully private, no API costs',
      free: true,
      quality: 'high',
      available: !!process.env.LOCAL_GPU_URL,
    },
    {
      id: 'huggingface',
      name: 'HuggingFace',
      label: '🤗 HuggingFace (Free)',
      description: 'Free serverless GPU via HuggingFace Inference API',
      free: true,
      quality: 'medium',
      available: !!process.env.HUGGINGFACE_API_TOKEN,
    },
    {
      id: 'veo',
      name: 'Google Veo 2',
      label: '⚡ Google Veo 2',
      description: "Google's state-of-the-art video model (paid API)",
      free: false,
      quality: 'high',
      available: !!process.env.VEO_API_KEY,
    },
  ];
}

export function getBestAvailableProvider(): Provider | null {
  const providers = getAvailableProviders();
  // Prefer local GPU → HuggingFace → Veo
  const preferred: Provider[] = ['local', 'huggingface', 'veo'];
  for (const id of preferred) {
    if (providers.find((p) => p.id === id)?.available) return id;
  }
  return null;
}
