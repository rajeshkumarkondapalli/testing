'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Wand2, Zap, RotateCcw, ArrowRight, Loader2, Cpu } from 'lucide-react';
import type { GeneratedVideo } from '@/lib/veo';
import type { ProviderStatus } from '@/app/api/providers/route';

const EXAMPLE_PROMPTS = [
  'A majestic eagle soaring over snow-capped mountains at golden hour',
  'Neon-lit cyberpunk city street in heavy rain, cinematic shot',
  'Underwater coral reef teeming with colorful tropical fish',
  'Time-lapse of a flower blooming in a misty forest at dawn',
  'Futuristic spacecraft entering a wormhole in deep space',
  'Slow motion ocean waves crashing against dramatic sea cliffs',
];

const MODEL_OPTIONS: Record<string, { label: string; models: { id: string; name: string }[] }> = {
  replicate: {
    label: 'Model',
    models: [
      { id: 'wavespeedai/wan-2.1-t2v-480p', name: 'Wan 2.1 (Fast)' },
      { id: 'minimax/video-01', name: 'Minimax Video-01' },
      { id: 'luma/ray', name: 'Luma Ray' },
    ],
  },
  huggingface: {
    label: 'Model',
    models: [
      { id: 'zeroscope', name: 'ZeroScope 576w' },
      { id: 'zeroscope_xl', name: 'ZeroScope XL' },
      { id: 'modelscope', name: 'ModelScope' },
    ],
  },
  veo: { label: 'Model', models: [{ id: 'veo-2', name: 'Veo 2' }] },
};

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
  const [duration, setDuration] = useState(6);
  const [showOptions, setShowOptions] = useState(false);

  // Provider state
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingProviders, setLoadingProviders] = useState(true);

  const isEnhanced = !!enhancedPrompt && prompt === enhancedPrompt;

  // Load available providers on mount
  useEffect(() => {
    fetch('/api/providers')
      .then((r) => r.json())
      .then(({ providers: list, defaultProvider }) => {
        setProviders(list);
        const def = defaultProvider ?? list[0]?.id ?? '';
        setSelectedProvider(def);
        setSelectedModel(MODEL_OPTIONS[def]?.models[0]?.id ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  const handleProviderChange = (id: string) => {
    setSelectedProvider(id);
    setSelectedModel(MODEL_OPTIONS[id]?.models[0]?.id ?? '');
  };

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
      if (!res.ok || data.error) { setEnhanceError(data.error || 'Enhancement failed'); return; }
      setOriginalPrompt(prompt.trim());
      setEnhancedPrompt(data.enhanced);
      setPrompt(data.enhanced);
    } catch {
      setEnhanceError('Network error — check ANTHROPIC_API_KEY');
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
    if (isEnhanced && value !== enhancedPrompt) setEnhancedPrompt('');
  };

  const pollStatus = useCallback(async (operationName: string, videoId: string) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts++ >= 60) {
        onVideoUpdated(videoId, { status: 'failed', error: 'Timed out after 5 minutes' });
        return;
      }
      try {
        const res = await fetch('/api/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const data = await res.json();
        if (data.error) { onVideoUpdated(videoId, { status: 'failed', error: data.error }); return; }
        if (data.done) {
          onVideoUpdated(videoId, {
            status: data.videoUrl ? 'completed' : 'failed',
            videoUrl: data.videoUrl ?? null,
            error: data.videoUrl ? undefined : 'No video returned',
          });
          return;
        }
        setTimeout(poll, 5000);
      } catch { setTimeout(poll, 8000); }
    };
    setTimeout(poll, 5000);
  }, [onVideoUpdated]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedProvider) return;

    const videoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const finalPrompt = prompt.trim();

    onVideoCreated({
      id: videoId,
      prompt: finalPrompt,
      videoUrl: null,
      status: 'generating',
      operationName: null,
      createdAt: Date.now(),
      aspectRatio,
      enhanced: isEnhanced,
      provider: selectedProvider,
    });

    setPrompt('');
    setEnhancedPrompt('');
    setOriginalPrompt('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio,
          durationSeconds: duration,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        onVideoUpdated(videoId, { status: 'failed', error: data.error || 'Generation failed' });
        return;
      }

      // Immediate result (HuggingFace sync or Replicate fast finish)
      if (data.done && data.videoUrl) {
        onVideoUpdated(videoId, { status: 'completed', videoUrl: data.videoUrl });
        return;
      }

      // Async: poll for completion
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleGenerate(); }
  };

  const availableProviders = providers.filter((p) => p.available);
  const noProviders = !loadingProviders && availableProviders.length === 0;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-yt-gray rounded-2xl border border-yt-light-gray/30 overflow-hidden shadow-2xl">

        {/* Enhancement banner */}
        {isEnhanced && (
          <div className="px-4 pt-3">
            <div className="flex items-start gap-2 bg-purple-900/30 border border-purple-700/40 rounded-xl p-3">
              <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 text-xs font-semibold mb-1">Claude Enhanced</p>
                <div className="flex items-center gap-2 text-xs text-purple-400/80">
                  <span className="truncate max-w-[180px] line-through opacity-60">{originalPrompt}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-purple-300">Enhanced below</span>
                </div>
              </div>
              <button onClick={handleRevert} className="flex items-center gap-1 text-purple-400 hover:text-purple-200 text-xs transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Revert
              </button>
            </div>
          </div>
        )}

        {/* No providers warning */}
        {noProviders && (
          <div className="mx-4 mt-3 bg-yellow-900/30 border border-yellow-700/40 rounded-xl px-3 py-2 text-yellow-300 text-xs">
            No provider configured. Add <code className="bg-black/30 px-1 rounded">REPLICATE_API_TOKEN</code>,{' '}
            <code className="bg-black/30 px-1 rounded">HUGGINGFACE_API_TOKEN</code>, or{' '}
            <code className="bg-black/30 px-1 rounded">VEO_API_KEY</code> to your <code className="bg-black/30 px-1 rounded">.env.local</code>.
          </div>
        )}

        {/* Textarea */}
        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the video you want to create… (Ctrl+Enter to generate)"
            className={`w-full bg-transparent placeholder-yt-text-secondary resize-none outline-none text-base leading-relaxed min-h-[80px] max-h-[200px] transition-colors ${isEnhanced ? 'text-purple-200' : 'text-yt-text'}`}
            rows={3}
            maxLength={1000}
          />
          {enhanceError && (
            <p className="text-red-400 text-xs mb-2">{enhanceError}</p>
          )}
          <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
            <span className="text-yt-text-secondary text-xs">{prompt.length}/1000</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-yt-text-secondary hover:text-yt-text text-sm transition-colors px-2 py-1 rounded-lg hover:bg-yt-light-gray/30"
              >
                Options {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleEnhance}
                disabled={!prompt.trim() || isEnhancing}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
              >
                {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isEnhancing ? 'Enhancing…' : 'Enhance'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || noProviders}
                className="flex items-center gap-2 bg-yt-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl transition-all text-sm"
              >
                <Wand2 className="w-4 h-4" /> Generate
              </button>
            </div>
          </div>
        </div>

        {/* Options panel */}
        {showOptions && (
          <div className="border-t border-yt-light-gray/30 px-4 py-3 flex flex-wrap gap-4">

            {/* Provider selector */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-yt-text-secondary text-xs font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> GPU Provider
              </label>
              {loadingProviders ? (
                <div className="flex items-center gap-2 text-yt-text-secondary text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting providers…
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => p.available && handleProviderChange(p.id)}
                      disabled={!p.available}
                      title={p.available ? p.description : `Not configured — set ${p.id.toUpperCase().replace(/-/g,'_')}_API_TOKEN`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedProvider === p.id && p.available
                          ? 'bg-yt-red border-yt-red text-white'
                          : p.available
                          ? 'border-yt-light-gray text-yt-text-secondary hover:border-yt-text-secondary'
                          : 'border-yt-light-gray/30 text-yt-text-secondary/40 cursor-not-allowed'
                      }`}
                    >
                      {p.label}
                      {p.free && p.available && (
                        <span className="ml-1.5 text-green-400 text-[10px]">FREE</span>
                      )}
                      {!p.available && (
                        <span className="ml-1.5 text-yt-text-secondary/40 text-[10px]">not set</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model selector */}
            {selectedProvider && MODEL_OPTIONS[selectedProvider]?.models.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-yt-text-secondary text-xs font-medium">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-yt-dark border border-yt-light-gray text-yt-text text-xs rounded-lg px-2 py-1.5 outline-none"
                >
                  {MODEL_OPTIONS[selectedProvider].models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Aspect ratio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-yt-text-secondary text-xs font-medium">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === ratio ? 'bg-yt-red border-yt-red text-white' : 'border-yt-light-gray text-yt-text-secondary hover:border-yt-text-secondary'
                    }`}
                  >
                    {ratio === '16:9' ? '🖥 Landscape' : '📱 Portrait'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-yt-text-secondary text-xs font-medium">
                Duration: <span className="text-yt-text">{duration}s</span>
              </label>
              <input type="range" min={3} max={8} step={1} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-32 accent-yt-red" />
            </div>
          </div>
        )}
      </div>

      {/* Example prompts */}
      <div className="mt-4">
        <p className="text-yt-text-secondary text-xs mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Try an example — then hit Enhance to improve it
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.slice(0, 4).map((ex) => (
            <button key={ex} onClick={() => { setPrompt(ex); setEnhancedPrompt(''); setOriginalPrompt(''); }}
              className="text-xs bg-yt-gray hover:bg-yt-light-gray border border-yt-light-gray/50 hover:border-yt-text-secondary text-yt-text-secondary hover:text-yt-text px-3 py-1.5 rounded-full transition-all truncate max-w-[220px]">
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
