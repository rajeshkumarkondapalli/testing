// HuggingFace Inference API — free GPU video generation
// Models ranked by quality (best first):
//   zeroscope_v2_xl   : 1024×576, 24 frames, needs ~15GB VRAM on HF
//   zeroscope_v2_576w : 576×320, 24 frames, ~8GB — most reliable free tier
//   text-to-video-ms  : 256×256, 16 frames, smallest / fastest

const HF_MODELS = {
  zeroscope: 'cerspense/zeroscope_v2_576w',
  zeroscope_xl: 'cerspense/zeroscope_v2_XL',
  modelscope: 'damo-vilab/text-to-video-ms-1.7b',
} as const;

export type HFModel = keyof typeof HF_MODELS;

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 min

export async function generateVideoHuggingFace(
  prompt: string,
  token: string,
  model: HFModel = 'zeroscope'
): Promise<string> {
  const modelId = HF_MODELS[model];
  const url = `https://api-inference.huggingface.co/models/${modelId}`;

  const started = Date.now();

  // HF Inference API may return 503 while model is loading — keep polling
  while (true) {
    if (Date.now() - started > MAX_WAIT_MS) {
      throw new Error('HuggingFace model timed out after 5 minutes');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true', // wait instead of 503
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_inference_steps: 25, num_frames: 24 },
      }),
    });

    // Model still loading
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      const waitSec: number = body.estimated_time ?? 20;
      console.log(`HF model loading, retry in ${waitSec}s`);
      await sleep(Math.min(waitSec * 1000, 30_000));
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HuggingFace API error: ${res.status}`);
    }

    // Success — response is raw video bytes (MP4 or GIF)
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') ?? 'video/mp4';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  }
}

/** Generate via a locally-running GPU server (see scripts/local_gpu_server.py) */
export async function generateVideoLocal(
  prompt: string,
  serverUrl: string,
  aspectRatio: string = '16:9',
  durationSeconds: number = 5
): Promise<string> {
  const res = await fetch(`${serverUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, duration_seconds: durationSeconds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Local GPU server error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.video_url) throw new Error('Local server returned no video URL');
  return data.video_url;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
