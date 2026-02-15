import React, { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import * as d3 from 'd3';

interface TimelineKeyframe {
  date: Date;
  label: string;
  id: string;
}

interface TimelineControlProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  keyframes: TimelineKeyframe[];
  minDate?: Date;
  maxDate?: Date;
  themeColor?: string;
}

export const TimelineControl: React.FC<TimelineControlProps> = ({
  currentDate,
  onDateChange,
  keyframes,
  minDate = new Date('2023-01-01'),
  maxDate = new Date(),
  themeColor = 'nexus-accent',
}) => {
  // Normalize dates to eliminate time component for day-level snapping if needed
  // For now, we assume continuous time but scrubber steps could be granular.

  const progress = useMemo(() => {
    const total = maxDate.getTime() - minDate.getTime();
    const current = currentDate.getTime() - minDate.getTime();
    return Math.max(0, Math.min(100, (current / total) * 100));
  }, [currentDate, minDate, maxDate]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const total = maxDate.getTime() - minDate.getTime();
    const newTime = minDate.getTime() + (total * val) / 1000;
    onDateChange(new Date(newTime));
  };

  const formattedDate = useMemo(() => {
    return currentDate.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [currentDate]);

  return (
    <div className="w-full bg-nexus-900/80 backdrop-blur-md border-t border-nexus-800 px-6 py-3 flex items-center gap-6 shadow-2xl relative z-30">
      {/* 1. Date Display & Controls */}
      <div className="flex items-center gap-3 shrink-0 min-w-[180px]">
        <div className="w-10 h-10 rounded-xl bg-nexus-950 border border-nexus-800 flex items-center justify-center text-nexus-accent shadow-inner">
          <Calendar size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">
            Effective Date
          </span>
          <span className="text-sm font-display font-black text-nexus-text tracking-tight">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* 2. Scrubber Track */}
      <div className="flex-1 relative h-10 flex items-center group">
        {/* Keyframe Markers */}
        <div className="absolute inset-x-0 h-1 top-1/2 -translate-y-1/2 overflow-visible pointer-events-none">
          {keyframes.map((kf) => {
            const kfTime = kf.date.getTime();
            const total = maxDate.getTime() - minDate.getTime();
            const pos = ((kfTime - minDate.getTime()) / total) * 100;
            if (pos < 0 || pos > 100) return null;

            return (
              <div
                key={kf.id}
                className="absolute w-0.5 h-3 bg-nexus-700/50 -top-1 group-hover:bg-nexus-500 transition-colors"
                style={{ left: `${pos}%` }}
                title={`${kf.label} (${kf.date.toLocaleDateString()})`}
              />
            );
          })}
        </div>

        {/* Input Range */}
        <input
          type="range"
          min="0"
          max="1000"
          value={(progress / 100) * 1000}
          onChange={handleScrub}
          className="w-full h-1 bg-nexus-800 rounded-full appearance-none cursor-pointer hover:bg-nexus-700 transition-colors focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 z-10"
          style={{
            backgroundImage: `linear-gradient(to right, var(--color-nexus-accent) ${progress}%, transparent ${progress}%)`,
          }}
        />
      </div>

      {/* 3. Snapshot Info */}
      <div className="flex items-center gap-4 shrink-0 border-l border-nexus-800 pl-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">
            Snapshots
          </span>
          <div className="flex items-center gap-2">
            <Hash size={12} className="text-nexus-muted" />
            <span className="text-sm font-bold text-nexus-text">{keyframes.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              // Find previous keyframe
              const currentTs = currentDate.getTime();
              const prev = keyframes
                .slice()
                .reverse()
                .find((k) => k.date.getTime() < currentTs - 1000); // buffer
              if (prev) onDateChange(prev.date);
              else onDateChange(minDate);
            }}
            className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              // Find next keyframe
              const currentTs = currentDate.getTime();
              const next = keyframes.find((k) => k.date.getTime() > currentTs + 1000);
              if (next) onDateChange(next.date);
              else onDateChange(maxDate);
            }}
            className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
