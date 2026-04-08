'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Clock, Loader2, AlertCircle, Download, Zap } from 'lucide-react';
import type { GeneratedVideo } from '@/lib/veo';

interface VideoCardProps {
  video: GeneratedVideo;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  if (video.status === 'generating') {
    return (
      <div className="bg-yt-gray rounded-xl overflow-hidden group">
        <div className="relative aspect-video bg-yt-dark flex flex-col items-center justify-center gap-3">
          <div className="absolute inset-0 shimmer opacity-30" />
          <Loader2 className="w-10 h-10 text-yt-red animate-spin relative z-10" />
          <span className="text-yt-text-secondary text-sm generating-pulse relative z-10">
            Generating video...
          </span>
          <div className="w-48 h-1 bg-yt-light-gray rounded-full overflow-hidden relative z-10">
            <div
              className="h-full bg-yt-red rounded-full transition-all duration-1000"
              style={{ animation: 'progress 30s linear infinite' }}
            />
          </div>
        </div>
        <div className="p-3">
          <p className="text-yt-text text-sm font-medium line-clamp-2">{video.prompt}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5 text-yt-text-secondary" />
            <span className="text-yt-text-secondary text-xs">Generating • {timeAgo(video.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (video.status === 'failed') {
    return (
      <div className="bg-yt-gray rounded-xl overflow-hidden">
        <div className="aspect-video bg-yt-dark flex flex-col items-center justify-center gap-2 p-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-yt-text-secondary text-sm text-center">
            {video.error || 'Generation failed'}
          </p>
        </div>
        <div className="p-3">
          <p className="text-yt-text text-sm font-medium line-clamp-2">{video.prompt}</p>
          <span className="text-red-400 text-xs">Failed • {timeAgo(video.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-yt-gray rounded-xl overflow-hidden group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowControls(false); }}
    >
      {/* Video Container */}
      <div
        className="relative aspect-video bg-black"
        onClick={togglePlay}
        onMouseMove={showControlsTemporarily}
      >
        {video.videoUrl ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-contain"
            muted={isMuted}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-yt-text-secondary text-sm">No video available</span>
          </div>
        )}

        {/* Play/Pause overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            (!isPlaying && isHovered) || (!isPlaying && !isHovered) ? 'bg-black/20' : ''
          }`}
        >
          {!isPlaying && (
            <div className="w-14 h-14 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play className="w-7 h-7 text-white ml-1" fill="white" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-200 ${
            isPlaying ? (showControls ? 'opacity-100' : 'opacity-0') : 'opacity-100'
          }`}
        >
          {/* Progress bar */}
          <div
            className="mx-3 mb-1 h-1 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-yt-red rounded-full relative group-hover/progress:h-1.5 transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-yt-red rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2 px-3 pb-2 bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="text-white hover:text-yt-red transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5" fill="white" />}
            </button>

            <button onClick={toggleMute} className="text-white hover:text-yt-red transition-colors">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <span className="text-white/70 text-xs flex-1">
              {duration > 0 && `${formatTime(videoRef.current?.currentTime ?? 0)} / ${formatTime(duration)}`}
            </span>

            {video.videoUrl && (
              <a
                href={video.videoUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="text-white hover:text-yt-red transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button onClick={handleFullscreen} className="text-white hover:text-yt-red transition-colors">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {video.enhanced && (
            <div className="flex items-center gap-0.5 bg-purple-700/80 text-purple-200 text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
              <Zap className="w-3 h-3" />
              Enhanced
            </div>
          )}
          <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {video.aspectRatio}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-yt-text text-sm font-medium line-clamp-2 leading-snug">{video.prompt}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yt-red to-purple-600 flex-shrink-0" />
          <span className="text-yt-text-secondary text-xs truncate">
            {video.provider === 'replicate' ? 'Replicate' : video.provider === 'huggingface' ? 'HuggingFace' : 'Veo 2'}
          </span>
          <span className="text-yt-text-secondary text-xs">•</span>
          <span className="text-yt-text-secondary text-xs whitespace-nowrap">{timeAgo(video.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
