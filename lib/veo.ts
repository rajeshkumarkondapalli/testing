export interface VeoGenerateRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: number;
  numberOfVideos?: number;
}

export interface VeoOperation {
  name: string;
  done?: boolean;
  error?: { code: number; message: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: { uri: string };
        startTime?: string;
        endTime?: string;
      }>;
      raiMediaFilteredCount?: number;
    };
  };
  metadata?: {
    '@type': string;
    [key: string]: unknown;
  };
}

export interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string | null;
  status: 'generating' | 'completed' | 'failed';
  operationName: string | null;
  createdAt: number;
  aspectRatio: string;
  error?: string;
}

const VEO_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateVideo(
  request: VeoGenerateRequest,
  apiKey: string
): Promise<VeoOperation> {
  const { prompt, aspectRatio = '16:9', durationSeconds = 8, numberOfVideos = 1 } = request;

  const response = await fetch(
    `${VEO_BASE_URL}/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/veo-2.0-generate-001',
        instances: [{ prompt }],
        parameters: {
          aspectRatio,
          durationSeconds,
          numberOfVideos,
          sampleCount: numberOfVideos,
          storageUri: '',
          enhancePrompt: true,
          generateAudio: false,
          personGeneration: 'dont_allow',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

export async function getOperationStatus(
  operationName: string,
  apiKey: string
): Promise<VeoOperation> {
  // operationName is like "operations/abc123" — use the full path
  const encodedName = encodeURIComponent(operationName);
  const response = await fetch(
    `${VEO_BASE_URL}/${operationName}?key=${apiKey}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Status check error: ${response.status}`);
  }

  return response.json();
}
