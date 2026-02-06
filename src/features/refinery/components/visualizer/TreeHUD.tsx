import React from 'react';
import { Target, ZoomIn, ZoomOut, LayoutGrid, ArrowDown, ArrowRight } from 'lucide-react';

interface TreeHUDProps {
  nodeCount: number;
  orientation: 'HORIZONTAL' | 'VERTICAL';
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleOrientation: () => void;
}

export const TreeHUD: React.FC<TreeHUDProps> = ({
  nodeCount,
  orientation,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onToggleOrientation,
}) => {
  return (
    <>
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <Target size={14} className="text-nexus-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            H-Tree Visualizer
          </span>
        </div>
        <div className="text-[9px] text-slate-600 font-mono">
          Structural Relationships // {nodeCount} Nodes
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
        <div className="flex bg-nexus-900 border border-nexus-800 rounded-xl p-1 shadow-2xl pointer-events-auto">
          <button
            onClick={onResetZoom}
            className="p-2 hover:bg-nexus-800 text-slate-400 hover:text-white transition-all"
            title="Reset Camera"
          >
            <Target size={18} />
          </button>
          <div className="w-px h-6 bg-nexus-800 mx-1" />
          <button
            onClick={onZoomIn}
            className="p-2 hover:bg-nexus-800 text-slate-400 hover:text-white transition-all"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={onZoomOut}
            className="p-2 hover:bg-nexus-800 text-slate-400 hover:text-white transition-all"
          >
            <ZoomOut size={18} />
          </button>
          <div className="w-px h-6 bg-nexus-800 mx-1" />
          <button
            onClick={onToggleOrientation}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${orientation === 'VERTICAL' ? 'bg-nexus-500/10 text-nexus-accent' : 'text-slate-400 hover:bg-nexus-800 hover:text-white'}`}
            title={orientation === 'VERTICAL' ? 'Switch to Horizontal' : 'Switch to Vertical'}
          >
            {orientation === 'VERTICAL' ? <ArrowRight size={18} /> : <ArrowDown size={18} />}
          </button>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-nexus-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-nexus-500 animate-pulse" />
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
            Logic Flow: Valid
          </span>
        </div>
      </div>
    </>
  );
};
