'use client';

import { useState, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import type { GeneratedVideo } from '@/lib/veo';

const EXAMPLE_PROMPTS = [
  'A majestic eagle soaring over snow-capped mountains at golden hour',
  'Neon-lit cyberpunk city street in heavy rain, cinematic shot',
  'Underwater coral reef teeming with colorful tropical fish',
  'Time-lapse of a flower blooming in a misty forest at dawn',
  'Futuristic spacecraft entering a wormhole in deep space',
  'Slow motion ocean waves crashing against dramatic sea cliffs',
  'Aerial view of a dense rainforest with morning fog',
  'Abstract liquid metal flowing and morphing in zero gravity',
];

interface VideoGeneratorProps {
  onVideoCreated: (video: GeneratedVideo) => void;
  onVideoUpdated: (id: string, updates: Partial<GeneratedVideo>) => void;
}

export default function VideoGenerator({ onVideoCreated, onVideoUpdated }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState(8);
  const [showOptions, setShowOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (operationName: string, videoId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        onVideoUpdated(videoId, {
          status: 'failed',
          error: 'Generation timed out after 5 minutes',
        });
        return;
      }

      attempts++;

      try {
        const res = await fetch('/api/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const data = await res.json();

        if (data.error) {
          onVideoUpdated(videoId, { status: 'failed', error: data.error });
          return;
        }

        if (data.done) {
          onVideoUpdated(videoId, {
            status: data.videoUrl ? 'completed' : 'failed',
            videoUrl: data.videoUrl || null,
            error: data.videoUrl ? undefined : 'No video was generated',
          });
          return;
        }

        // Not done yet, poll again in 5 seconds
        setTimeout(poll, 5000);
      } catch (err) {
        console.error('Poll error:', err);
        setTimeout(poll, 8000); // Retry on network error
      }
    };

    setTimeout(poll, 5000); // First check after 5s
  }, [onVideoUpdated]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);

    const videoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Optimistically add the video card
    const newVideo: GeneratedVideo = {
      id: videoId,
      prompt: prompt.trim(),
      videoUrl: null,
      status: 'generating',
      operationName: null,
      createdAt: Date.now(),
      aspectRatio,
    };
    onVideoCreated(newVideo);
    setPrompt('');
    setIsGenerating(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newVideo.prompt, aspectRatio, durationSeconds: duration }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        onVideoUpdated(videoId, { status: 'failed', error: data.error || 'Generation failed' });
        return;
      }

      onVideoUpdated(videoId, { operationName: data.operationName });
      pollStatus(data.operationName, videoId);
    } catch (err) {
      onVideoUpdated(videoId, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Network error',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const useExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main input area */}
      <div className="bg-yt-gray rounded-2xl border border-yt-light-gray/30 overflow-hidden shadow-2xl">
        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the video you want to create... (Ctrl+Enter to generate)"
            className="w-full bg-transparent text-yt-text placeholder-yt-text-secondary resize-none outline-none text-base leading-relaxed min-h-[80px] max-h-[200px]"
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-yt-text-secondary text-xs">
              {prompt.length}/1000
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-yt-text-secondary hover:text-yt-text text-sm transition-colors px-2 py-1 rounded-lg hover:bg-yt-light-gray/30"
              >
                Options
                {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="flex items-center gap-2 bg-yt-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl transition-all duration-200 text-sm"
              >
                <Wand2 className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Advanced options */}
        {showOptions && (
          <div className="border-t border-yt-light-gray/30 px-4 py-3 flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-yt-text-secondary text-xs font-medium">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-yt-red border-yt-red text-white'
                        : 'border-yt-light-gray text-yt-text-secondary hover:border-yt-text-secondary'
                    }`}
                  >
                    {ratio === '16:9' ? '🖥 Landscape' : '📱 Portrait'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-yt-text-secondary text-xs font-medium">
                Duration: <span className="text-yt-text">{duration}s</span>
              </label>
              <input
                type="range"
                min={5}
                max={8}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-32 accent-yt-red"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-3 bg-red-900/30 border border-red-700/50 text-red-400 text-sm px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      {/* Example prompts */}
      <div className="mt-4">
        <p className="text-yt-text-secondary text-xs mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
            <button
              key={example}
              onClick={() => useExamplePrompt(example)}
              className="text-xs bg-yt-gray hover:bg-yt-light-gray border border-yt-light-gray/50 hover:border-yt-text-secondary text-yt-text-secondary hover:text-yt-text px-3 py-1.5 rounded-full transition-all duration-200 truncate max-w-[220px]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
