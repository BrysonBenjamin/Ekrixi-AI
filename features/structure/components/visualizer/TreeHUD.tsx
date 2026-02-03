
import React from 'react';
import { Target, ZoomIn, ZoomOut, ArrowDown, ArrowRight } from 'lucide-react';

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
    onToggleOrientation
}) => {
    return (
        <>
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <Target size={14} className="text-nexus-accent" />
                    <span className="text-[10px] font-display font-black text-nexus-text uppercase tracking-[0.3em]">H-Tree Visualizer</span>
                </div>
                <div className="text-[9px] text-nexus-muted font-mono uppercase tracking-widest opacity-60">Neural Infrastructure // {nodeCount} Nodes Active</div>
            </div>

            <div className="absolute bottom-8 left-8 z-10 flex flex-col gap-3">
                <div className="flex bg-nexus-900/80 backdrop-blur-xl border border-nexus-800 rounded-2xl p-1.5 shadow-2xl pointer-events-auto">
                    <button onClick={onResetZoom} className="p-2.5 rounded-xl hover:bg-nexus-800 text-nexus-muted hover:text-nexus-text transition-all" title="Reset Camera"><Target size={20} /></button>
                    <div className="w-px h-6 bg-nexus-800 mx-1.5 self-center" />
                    <button onClick={onZoomIn} className="p-2.5 rounded-xl hover:bg-nexus-800 text-nexus-muted hover:text-nexus-text transition-all"><ZoomIn size={20} /></button>
                    <button onClick={onZoomOut} className="p-2.5 rounded-xl hover:bg-nexus-800 text-nexus-muted hover:text-nexus-text transition-all"><ZoomOut size={20} /></button>
                    <div className="w-px h-6 bg-nexus-800 mx-1.5 self-center" />
                    <button 
                        onClick={onToggleOrientation} 
                        className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${orientation === 'VERTICAL' ? 'bg-nexus-accent text-nexus-950 shadow-lg shadow-nexus-accent/20' : 'text-nexus-muted hover:bg-nexus-800 hover:text-nexus-text'}`}
                        title={orientation === 'VERTICAL' ? "Switch to Horizontal" : "Switch to Vertical"}
                    >
                        {orientation === 'VERTICAL' ? <ArrowRight size={20} /> : <ArrowDown size={20} />}
                    </button>
                </div>
                <div className="bg-nexus-900/40 backdrop-blur-md px-4 py-2 rounded-xl border border-nexus-800 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-nexus-essence animate-pulse shadow-[0_0_8px_var(--essence-color)]" />
                    <span className="text-[9px] font-mono text-nexus-muted font-bold uppercase tracking-[0.2em]">Logic Kernel: Validated</span>
                </div>
            </div>
        </>
    );
};
