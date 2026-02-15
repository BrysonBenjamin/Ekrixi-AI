import React, { useState, useRef, useEffect } from 'react';
import { WeightedContextUnit } from '../../core/services/ContextAssemblyService';
import { NexusObject, SimpleNote } from '../../types';
import { X, ChevronDown, Plus, Trash2, Network } from 'lucide-react';

interface ContextPillProps {
  unit: WeightedContextUnit;
  registry: Record<string, NexusObject>;
  onUpdate: (updatedUnit: WeightedContextUnit) => void;
  onRemove: () => void;
}

export const ContextPill: React.FC<ContextPillProps> = ({ unit, registry, onUpdate, onRemove }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rootNote = registry[unit.id] as SimpleNote;
  const title = rootNote?.title || unit.id;

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleScoreChange = (newScore: number) => {
    onUpdate({ ...unit, score: newScore });
  };

  const handleApplyChild = (childId: string) => {
    // Prevent duplicates
    if (unit.children?.some((c) => c.id === childId)) return;

    const newChildren = [...(unit.children || []), { id: childId, score: 10 }]; // Default score 10 (MAX) as requested
    onUpdate({ ...unit, children: newChildren });
  };

  const handleUpdateChildScore = (childId: string, score: number) => {
    const newChildren = unit.children?.map((c) => (c.id === childId ? { ...c, score } : c)) || [];
    onUpdate({ ...unit, children: newChildren });
  };

  const handleRemoveChild = (childId: string) => {
    const newChildren = unit.children?.filter((c) => c.id !== childId) || [];
    onUpdate({ ...unit, children: newChildren });
  };

  // --- SMART CHILD SUGGESTIONS ---
  // Suggest nodes that are 1-depth away (links OR children)
  const directConnections = React.useMemo(() => {
    const links = rootNote?.link_ids || [];
    const children = (rootNote as any).children_ids || []; // Cast for container check
    // Combine unique IDs
    return [...new Set([...links, ...children])];
  }, [rootNote]);

  const suggestions = directConnections
    .map((id) => registry[id])
    .filter(
      (n) =>
        n &&
        n._type === 'SIMPLE_NOTE' &&
        n.id !== unit.id &&
        !unit.children?.some((c) => c.id === n.id),
    )
    .map((n) => n as SimpleNote)
    .slice(0, 50); // Increased limit as requested by "scrollable" preference

  return (
    <div className="relative inline-block mr-2 mb-2" ref={popoverRef}>
      {/* --- MAIN PILL --- */}
      <div
        className={`
            flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-2xl border transition-all cursor-pointer select-none
            ${isOpen ? 'ring-4 ring-nexus-accent/50 border-nexus-accent bg-nexus-800 shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]' : 'bg-nexus-900 border-nexus-700 hover:border-nexus-500 shadow-lg'}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-nexus-text max-w-[280px] truncate uppercase tracking-tight">
            {title}
          </span>

          {/* Score Badge */}
          <div
            className={`
                px-2.5 py-1 rounded-lg text-xs font-mono font-black min-w-[28px] text-center
                ${getScoreColor(unit.score)}
            `}
          >
            {unit.score}
          </div>
        </div>

        {/* Child Indicator */}
        {(unit.children?.length || 0) > 0 && (
          <div className="flex items-center gap-1.5 text-nexus-accent px-3 border-l border-nexus-700/50 ml-1">
            <Network size={16} />
            <span className="text-xs font-black">{unit.children?.length}</span>
          </div>
        )}

        {/* Remove Button */}
        <div
          role="button"
          className="p-1.5 rounded-xl hover:bg-white/10 text-nexus-muted hover:text-red-400 ml-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={18} />
        </div>
      </div>

      {/* --- POPOVER EDITOR --- */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-4 w-[500px] bg-nexus-900/95 backdrop-blur-2xl border border-nexus-700/80 rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 origin-top-left ring-2 ring-white/5">
          {/* Header / Main Score */}
          <div className="p-8 border-b border-nexus-800 bg-nexus-950/30">
            <div className="flex justify-between items-center mb-6">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted flex items-center gap-3">
                <Network size={16} className="text-nexus-accent" />
                Context Resonance Weight
              </label>
              <span
                className={`text-base font-black px-4 py-1.5 rounded-xl ${getScoreColor(unit.score)}`}
              >
                {unit.score} / 10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={unit.score}
              onChange={(e) => handleScoreChange(parseInt(e.target.value))}
              className="w-full h-2.5 bg-nexus-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-nexus-accent [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:shadow-nexus-accent/40 transition-all"
            />
            <div className="flex justify-between mt-4 text-[11px] text-nexus-muted font-bold uppercase tracking-widest opacity-60">
              <span>Background Noise</span>
              <span>Direct Interference</span>
            </div>
          </div>

          {/* Children Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-6 bg-nexus-950/50 border-b border-nexus-800">
              <div className="text-[11px] font-black uppercase tracking-widest text-nexus-muted mb-4 opacity-50">
                Entangled Scope ({unit.children?.length || 0})
              </div>

              {/* List of Attached Children */}
              <div className="max-h-[220px] overflow-y-auto no-scrollbar space-y-2">
                {unit.children?.map((child) => {
                  const childNote = registry[child.id] as SimpleNote;
                  return (
                    <div
                      key={child.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-nexus-900 border border-nexus-800 group hover:border-nexus-700 transition-all shadow-sm"
                    >
                      <span className="text-[14px] font-bold text-nexus-text truncate flex-1 leading-tight">
                        {childNote?.title || child.id}
                      </span>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={child.score}
                          onChange={(e) =>
                            handleUpdateChildScore(child.id, parseInt(e.target.value))
                          }
                          className="w-12 bg-nexus-950 border border-nexus-700 rounded-xl text-xs font-black text-center text-nexus-text focus:border-nexus-accent outline-none py-1.5"
                        />
                        <button
                          className="text-nexus-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-400/10 rounded-lg"
                          onClick={() => handleRemoveChild(child.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!unit.children || unit.children.length === 0) && (
                  <div className="text-xs text-nexus-muted/40 font-serif italic text-center py-6">
                    No nested logic segments entangled.
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions (Direct Links) */}
            <div className="p-6 bg-nexus-950/80 flex-1 overflow-hidden flex flex-col min-h-[240px]">
              <div className="text-[11px] font-black uppercase tracking-widest text-nexus-accent mb-4 px-2">
                Potential Resonances (1-Depth)
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left p-4 rounded-2xl bg-nexus-900/50 hover:bg-nexus-800 border border-nexus-800/50 hover:border-nexus-accent/40 transition-all group flex items-center justify-between shadow-sm"
                    onClick={() => handleApplyChild(s.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-black text-nexus-text/90 truncate group-hover:text-nexus-accent transition-colors mb-0.5">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-nexus-muted font-bold tracking-wider uppercase opacity-50">
                        {s.category_id || 'Entity'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-nexus-950 text-nexus-muted group-hover:text-nexus-accent group-hover:bg-nexus-accent/10 transition-all border border-nexus-800 group-hover:border-nexus-accent/30">
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
                {suggestions.length === 0 && (
                  <div className="text-xs text-nexus-muted/30 font-serif italic text-center py-10">
                    No direct neural pathways found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getScoreColor(score: number): string {
  if (score >= 8) return 'bg-red-500/20 text-red-300';
  if (score >= 5) return 'bg-nexus-accent/20 text-nexus-accent';
  return 'bg-nexus-muted/20 text-nexus-muted';
}
