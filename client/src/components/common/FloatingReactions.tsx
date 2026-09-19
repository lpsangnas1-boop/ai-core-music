import React, { useEffect, useState } from 'react';
import type { ReactionItem } from '../../types/index.js';

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onSendReaction: (emoji: string) => void;
}

const REACTION_EMOJIS = ['🔥', '❤️', '👏', '😂', '💤'];

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({
  reactions,
  onSendReaction,
}) => {
  const [activeParticles, setActiveParticles] = useState<ReactionItem[]>([]);
  const [recentEmoji, setRecentEmoji] = useState<string | null>(null);

  // When new reaction arrives, push to active particles and auto-clean after 2.6s
  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[reactions.length - 1];
      setActiveParticles((prev) => [...prev.slice(-25), latest]);
    }
  }, [reactions]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveParticles((prev) => prev.filter((p) => now - p.timestamp < 2600));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleClick = (emoji: string) => {
    onSendReaction(emoji);
    setRecentEmoji(emoji);
    setTimeout(() => setRecentEmoji(null), 300);
  };

  return (
    <div className="relative">
      {/* Floating particles container */}
      <div className="absolute inset-x-0 bottom-full h-48 pointer-events-none overflow-hidden z-20">
        {activeParticles.map((particle) => {
          return (
            <div
              key={particle.id}
              className="absolute bottom-0 flex flex-col items-center animate-reaction-float select-none pointer-events-none"
              style={{
                left: `${particle.xOffset}%`,
              }}
            >
              <span className="text-2xl drop-shadow-md filter">{particle.emoji}</span>
              {particle.userName && particle.userName !== 'Guest' && (
                <span className="text-[10px] font-bold text-[#ffffff] bg-[#25385b] px-2.5 py-0.5 rounded-full border border-[#a2b0ff]/50 shadow-md whitespace-nowrap mt-0.5 font-mono">
                  {particle.userName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recess Emoji Reaction Bar */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#fffcef] border border-[#25385b] rounded-full shadow-xs">
        <span className="text-[11px] font-bold text-[#25385b] uppercase tracking-wider pl-3 hidden sm:inline font-mono">
          Cảm xúc:
        </span>
        <div className="flex items-center gap-1.5 flex-1 justify-around sm:justify-end">
          {REACTION_EMOJIS.map((emoji) => {
            const isJustClicked = recentEmoji === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleClick(emoji)}
                className={`flex items-center justify-center w-9 h-8 sm:w-10 sm:h-9 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] border border-[#25385b]/30 hover:border-[#25385b] text-base transition-all transform active:scale-90 hover:scale-110 shadow-xs cursor-pointer ${
                  isJustClicked ? 'scale-125 border-[#25385b] bg-[#a2b0ff]/30 shadow-xs' : ''
                }`}
                title={`Thả reaction ${emoji}`}
              >
                <span>{emoji}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
