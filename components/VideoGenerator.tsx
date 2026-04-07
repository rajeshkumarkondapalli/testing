'use client';

import { useState, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Wand2, Zap, RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import type { GeneratedVideo } from '@/lib/veo';

const EXAMPLE_PROMPTS = [
  'A majestic eagle soaring over snow-capped mountains at golden hour',
  'Neon-lit cyberpunk city street in heavy rain, cinematic shot',
  'Underwater coral reef teeming with colorful tropical fish',
  'Time-lapse of a flower blooming in a misty forest at dawn',
  'Futuristic spacecraft entering a wormhole in deep space',
  'Slow motion ocean waves crashing against dramatic sea cliffs',
];

interface VideoGeneratorProps {
  onVideoCreated: (video: GeneratedVideo) => void;
  onVideoUpdated: (id: string, updates: Partial<GeneratedVideo>) => void;
}

export default function VideoGenerator({ onVideoCreated, onVideoUpdated }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState(8);
  const [showOptions, setShowOptions] = useState(false);

  const isEnhanced = !!enhancedPrompt && prompt === enhancedPrompt;

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setEnhanceError(null);

    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setEnhanceError(data.error || 'Enhancement failed');
        return;
      }

      setOriginalPrompt(prompt.trim());
      setEnhancedPrompt(data.enhanced);
      setPrompt(data.enhanced);
    } catch {
      setEnhanceError('Network error — check your ANTHROPIC_API_KEY');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRevert = () => {
    setPrompt(originalPrompt);
    setEnhancedPrompt('');
    setOriginalPrompt('');
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    // If user edits after enhancement, clear the enhanced state
    if (isEnhanced && value !== enhancedPrompt) {
      setEnhancedPrompt('');
    }
  };

  const pollStatus = useCallback(async (operationName: string, videoId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        onVideoUpdated(videoId, { status: 'failed', error: 'Generation timed out after 5 minutes' });
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
        setTimeout(poll, 5000);
      } catch {
        setTimeout(poll, 8000);
      }
    };

    setTimeout(poll, 5000);
  }, [onVideoUpdated]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const videoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const finalPrompt = prompt.trim();

    const newVideo: GeneratedVideo = {
      id: videoId,
      prompt: finalPrompt,
      videoUrl: null,
      status: 'generating',
      operationName: null,
      createdAt: Date.now(),
      aspectRatio,
      enhanced: isEnhanced,
    };

    onVideoCreated(newVideo);
    setPrompt('');
    setEnhancedPrompt('');
    setOriginalPrompt('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, aspectRatio, durationSeconds: duration }),
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-yt-gray rounded-2xl border border-yt-light-gray/30 overflow-hidden shadow-2xl">

        {/* Before/After enhancement banner */}
        {isEnhanced && (
          <div className="px-4 pt-3 pb-0">
            <div className="flex items-start gap-2 bg-purple-900/30 border border-purple-700/40 rounded-xl p-3">
              <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 text-xs font-semibold mb-1 flex items-center gap-1.5">
                  Claude Enhanced
                  <span className="bg-purple-700/50 text-purple-200 text-[10px] px-1.5 py-0.5 rounded-full">AI</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-purple-400/80">
                  <span className="truncate max-w-[180px] line-through opacity-60">{originalPrompt}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-purple-300 truncate max-w-[220px]">Enhanced below</span>
                </div>
              </div>
              <button
                onClick={handleRevert}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-200 text-xs transition-colors flex-shrink-0"
                title="Revert to original"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revert
              </button>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the video you want to create... (Ctrl+Enter to generate)"
            className={`w-full bg-transparent placeholder-yt-text-secondary resize-none outline-none text-base leading-relaxed min-h-[80px] max-h-[200px] transition-colors ${
              isEnhanced ? 'text-purple-200' : 'text-yt-text'
            }`}
            rows={3}
            maxLength={1000}
          />

          {/* Enhance error */}
          {enhanceError && (
            <p className="text-red-400 text-xs mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              {enhanceError}
            </p>
          )}

          <div className="flex items-center justify-between mt-1">
            <span className="text-yt-text-secondary text-xs">{prompt.length}/1000</span>

            <div className="flex items-center gap-2">
              {/* Options toggle */}
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-yt-text-secondary hover:text-yt-text text-sm transition-colors px-2 py-1 rounded-lg hover:bg-yt-light-gray/30"
              >
                Options
                {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Enhance button */}
              <button
                onClick={handleEnhance}
                disabled={!prompt.trim() || isEnhancing}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-sm"
                title="Let Claude rewrite your prompt for better Veo results"
              >
                {isEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isEnhancing ? 'Enhancing…' : 'Enhance'}
              </button>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
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

      {/* Example prompts */}
      <div className="mt-4">
        <p className="text-yt-text-secondary text-xs mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Try an example — then hit Enhance to see Claude improve it
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
            <button
              key={example}
              onClick={() => { setPrompt(example); setEnhancedPrompt(''); setOriginalPrompt(''); }}
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
