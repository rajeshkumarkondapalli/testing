// Replicate API — $5 free credit on signup, no card needed initially
// Best free text-to-video models on Replicate:
//   minimax/video-01        : high quality, 6s clips
//   luma/ray                : cinematic quality
//   wavespeedai/wan-2.1-t2v-480p : fast, good quality

const REPLICATE_BASE = 'https://api.replicate.com/v1';

export const REPLICATE_MODELS = {
  'minimax/video-01': {
    label: 'Minimax Video-01',
    version: null, // use latest via model name directly
    input: (prompt: string) => ({ prompt, duration: 6 }),
  },
  'wavespeedai/wan-2.1-t2v-480p': {
    label: 'Wan 2.1 (Fast)',
    version: null,
    input: (prompt: string) => ({ prompt, num_frames: 81, resolution: '480p' }),
  },
  'luma/ray': {
    label: 'Luma Ray',
    version: null,
    input: (prompt: string, aspectRatio = '16:9') => ({ prompt, aspect_ratio: aspectRatio, duration: '5s' }),
  },
} as const;

export type ReplicateModel = keyof typeof REPLICATE_MODELS;

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  urls: { get: string; cancel: string };
}

export async function startReplicateGeneration(
  prompt: string,
  token: string,
  model: ReplicateModel = 'wavespeedai/wan-2.1-t2v-480p',
  aspectRatio = '16:9'
): Promise<ReplicatePrediction> {
  const cfg = REPLICATE_MODELS[model];
  const input = cfg.input(prompt, aspectRatio);

  const res = await fetch(`${REPLICATE_BASE}/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5', // wait up to 5s before returning (short jobs finish inline)
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Replicate API error: ${res.status}`);
  }

  return res.json();
}

export async function pollReplicatePrediction(
  predictionId: string,
  token: string
): Promise<ReplicatePrediction> {
  const res = await fetch(`${REPLICATE_BASE}/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Replicate poll error: ${res.status}`);
  }

  return res.json();
}

/** Extract the video URL from a completed prediction */
export function extractVideoUrl(prediction: ReplicatePrediction): string | null {
  if (!prediction.output) return null;
  if (typeof prediction.output === 'string') return prediction.output;
  if (Array.isArray(prediction.output)) return prediction.output[0] ?? null;
  return null;
}
