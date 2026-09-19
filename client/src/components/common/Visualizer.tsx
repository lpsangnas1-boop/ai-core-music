import React from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  className?: string;
  barColor?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  className = '',
  barColor = 'bg-[#5865f2]',
}) => {
  return (
    <div className={`flex items-end gap-0.5 h-4 w-5 ${className}`} title={isPlaying ? 'Playing' : 'Paused'}>
      <span
        className={`w-0.5 rounded-[1px] transition-all duration-300 ${barColor} ${
          isPlaying ? 'animate-eq-1' : 'h-1 opacity-40'
        }`}
      />
      <span
        className={`w-0.5 rounded-[1px] transition-all duration-300 ${barColor} ${
          isPlaying ? 'animate-eq-2' : 'h-2.5 opacity-40'
        }`}
      />
      <span
        className={`w-0.5 rounded-[1px] transition-all duration-300 ${barColor} ${
          isPlaying ? 'animate-eq-3' : 'h-1 opacity-40'
        }`}
      />
      <span
        className={`w-0.5 rounded-[1px] transition-all duration-300 ${barColor} ${
          isPlaying ? 'animate-eq-4' : 'h-1.5 opacity-40'
        }`}
      />
    </div>
  );
};
