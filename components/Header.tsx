'use client';

import { Film, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-yt-dark/95 backdrop-blur-sm border-b border-yt-light-gray/20">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-yt-red rounded-lg">
            <Film className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-yt-text font-bold text-base tracking-tight">VeoGen</span>
            <span className="text-yt-text-secondary text-[10px] tracking-widest uppercase">AI Video Studio</span>
          </div>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-1.5 bg-yt-gray border border-yt-light-gray/30 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yt-text-secondary text-xs">Powered by Google Veo 2</span>
        </div>
      </div>
    </header>
  );
}
