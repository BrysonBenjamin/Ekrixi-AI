import React, { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface YearSliderProps {
  currentDate: { year: number; month: number; day: number };
  onDateChange: (date: { year: number; month: number; day: number }) => void;
  timelineBounds: { startYear: number; endYear: number };
  onBoundsChange: (bounds: { startYear: number; endYear: number }) => void;
}

export const YearSlider: React.FC<YearSliderProps> = ({
  currentDate,
  onDateChange,
  timelineBounds,
  onBoundsChange,
}) => {
  const { startYear, endYear } = timelineBounds;
  const [showBounds, setShowBounds] = React.useState(false);

  const sliderValue = useMemo(() => {
    return (
      (currentDate.year - startYear) * 372 + (currentDate.month - 1) * 31 + (currentDate.day - 1)
    );
  }, [currentDate, startYear]);

  const maxSliderValue = (endYear - startYear) * 372 + 11 * 31 + 30;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const year = Math.floor(val / 372) + startYear;
    const monthRem = val % 372;
    const month = Math.floor(monthRem / 31) + 1;
    const day = (monthRem % 31) + 1;

    const d = new Date(year, month - 1, day);
    onDateChange({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });
  };

  const incrementYear = (delta: number) => {
    onDateChange({
      ...currentDate,
      year: Math.min(endYear, Math.max(startYear, currentDate.year + delta)),
    });
  };

  const handleBoundEdit = (type: 'start' | 'end', val: string) => {
    const year = parseInt(val);
    if (!isNaN(year)) {
      if (type === 'start') {
        onBoundsChange({ ...timelineBounds, startYear: Math.min(year, endYear - 1) });
      } else {
        onBoundsChange({ ...timelineBounds, endYear: Math.max(year, startYear + 1) });
      }
    }
  };

  const formatDate = () => {
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    return `${currentDate.day} ${months[currentDate.month - 1]} ${currentDate.year}`;
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg bg-nexus-900/60 backdrop-blur-2xl border border-nexus-800/50 p-3 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.4)] relative">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-nexus-accent/15 rounded-xl text-nexus-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]">
            <Calendar size={16} />
          </div>
          <div className="flex flex-col gap-0">
            <span className="text-[9px] text-nexus-muted font-display font-black uppercase tracking-[0.1em] opacity-60">
              Temporal Focus
            </span>
            <span className="text-[13px] font-display font-bold text-nexus-text tracking-wider">
              {formatDate()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Era Configuration Toggle */}
          <div className="flex items-center gap-2">
            {showBounds ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                <input
                  type="text"
                  className="bg-nexus-950/50 border border-nexus-800/60 p-1 rounded-lg text-[10px] font-mono font-bold text-nexus-accent w-12 focus:outline-none focus:border-nexus-accent/50 text-center"
                  defaultValue={startYear}
                  onBlur={(e) => handleBoundEdit('start', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  autoFocus
                />
                <span className="text-nexus-muted opacity-30 text-[9px]">TO</span>
                <input
                  type="text"
                  className="bg-nexus-950/50 border border-nexus-800/60 p-1 rounded-lg text-[10px] font-mono font-bold text-nexus-accent w-12 focus:outline-none focus:border-nexus-accent/50 text-center"
                  defaultValue={endYear}
                  onBlur={(e) => handleBoundEdit('end', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
                <button
                  onClick={() => setShowBounds(false)}
                  className="text-[8px] font-black uppercase text-nexus-muted hover:text-white px-1.5 py-0.5 bg-nexus-800/50 rounded-md"
                >
                  SET
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBounds(true)}
                className="px-2.5 py-1 bg-nexus-950/50 border border-nexus-800/80 rounded-lg text-[9px] font-black uppercase tracking-widest text-nexus-muted hover:border-nexus-accent hover:text-nexus-accent transition-all flex items-center gap-1.5"
              >
                <span className="opacity-40">Era:</span> {startYear}—{endYear}
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-nexus-950/50 rounded-xl p-0.5 border border-nexus-800/40">
            <button
              onClick={() => incrementYear(-1)}
              className="p-1 hover:bg-nexus-800 rounded-md text-nexus-muted hover:text-nexus-text transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="w-px h-3 bg-nexus-800 mx-0.5" />
            <button
              onClick={() => incrementYear(1)}
              className="p-1 hover:bg-nexus-800 rounded-md text-nexus-muted hover:text-nexus-text transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative h-4 flex items-center px-1">
        <input
          type="range"
          min="0"
          max={maxSliderValue}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-nexus-800/50 rounded-full appearance-none cursor-pointer accent-nexus-accent hover:accent-nexus-accent-bright transition-all"
          style={{
            background: `linear-gradient(to right, var(--color-nexus-accent, #3b82f6) ${
              (sliderValue / (maxSliderValue || 1)) * 100
            }%, rgba(30, 41, 59, 0.4) ${(sliderValue / (maxSliderValue || 1)) * 100}%)`,
          }}
        />
        <div className="absolute inset-x-2 h-full pointer-events-none flex justify-between items-center opacity-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-px h-1.5 bg-nexus-text" />
          ))}
        </div>
      </div>
    </div>
  );
};
