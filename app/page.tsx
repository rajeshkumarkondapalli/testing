'use client';

import { useState, useCallback } from 'react';
import { Video, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import VideoGenerator from '@/components/VideoGenerator';
import VideoCard from '@/components/VideoCard';
import type { GeneratedVideo } from '@/lib/veo';

export default function Home() {
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);

  const handleVideoCreated = useCallback((video: GeneratedVideo) => {
    setVideos((prev) => [video, ...prev]);
  }, []);

  const handleVideoUpdated = useCallback((id: string, updates: Partial<GeneratedVideo>) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const clearCompleted = () => {
    setVideos((prev) => prev.filter((v) => v.status === 'generating'));
  };

  const completedCount = videos.filter((v) => v.status === 'completed').length;
  const generatingCount = videos.filter((v) => v.status === 'generating').length;

  return (
    <div className="min-h-screen bg-yt-dark flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-yt-dark to-yt-dark pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yt-red/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-10">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-yt-text mb-3 tracking-tight">
              Generate Videos with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yt-red to-orange-400">
                AI Magic
              </span>
            </h1>
            <p className="text-yt-text-secondary text-lg max-w-xl mx-auto">
              Transform your ideas into stunning videos using Google Veo 2 — just describe what you want to see.
            </p>
          </div>

          {/* Generator */}
          <VideoGenerator
            onVideoCreated={handleVideoCreated}
            onVideoUpdated={handleVideoUpdated}
          />
        </div>
      </section>

      {/* Videos Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pb-16">
        {videos.length > 0 ? (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-6 mt-2">
              <div className="flex items-center gap-3">
                <h2 className="text-yt-text font-semibold text-lg">Your Videos</h2>
                <div className="flex items-center gap-2">
                  {generatingCount > 0 && (
                    <span className="bg-yt-red/20 text-yt-red text-xs px-2 py-0.5 rounded-full border border-yt-red/30 generating-pulse">
                      {generatingCount} generating
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-700/30">
                      {completedCount} ready
                    </span>
                  )}
                </div>
              </div>
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="flex items-center gap-1.5 text-yt-text-secondary hover:text-yt-text text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-yt-gray"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear done
                </button>
              )}
            </div>

            {/* Video grid — YouTube-like responsive layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-yt-gray rounded-2xl flex items-center justify-center mb-5 border border-yt-light-gray/20">
              <Video className="w-9 h-9 text-yt-text-secondary" />
            </div>
            <h3 className="text-yt-text text-xl font-semibold mb-2">No videos yet</h3>
            <p className="text-yt-text-secondary text-sm max-w-sm">
              Enter a prompt above and click Generate to create your first AI video. Videos typically take 2–4 minutes.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-yt-text-secondary">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-yt-red rounded-full" />
                Up to 8s duration
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Landscape & Portrait
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                HD Quality
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-yt-light-gray/20 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-yt-text-secondary text-xs">
            © 2024 VeoGen · Powered by Google Veo 2 API
          </p>
          <p className="text-yt-text-secondary text-xs">
            Set <code className="bg-yt-gray px-1 py-0.5 rounded text-yt-text">VEO_API_KEY</code> in your environment to get started
          </p>
        </div>
      </footer>
    </div>
  );
}
