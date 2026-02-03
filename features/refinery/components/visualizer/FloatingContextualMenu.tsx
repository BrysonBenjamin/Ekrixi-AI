import React, { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Share2, Repeat, X, ArrowUpRight, Zap, Box } from 'lucide-react';
import { NexusObject, isLink, isContainer, isReified } from '../../../../types';

interface FloatingContextualMenuProps {
    object: NexusObject;
    x: number;
    y: number;
    onClose: () => void;
    onInspect: (id: string) => void;
    onAddChild?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReify?: (id: string) => void;
    onInvert?: (id: string) => void;
}

export const FloatingContextualMenu: React.FC<FloatingContextualMenuProps> = ({
    object, x, y, onClose, onInspect, onAddChild, onDelete, onReify, onInvert
}) => {
    const isL = isLink(object);
    const isC = isContainer(object);
    const reified = isReified(object);

    // Calculate position to keep it within viewport
    const menuWidth = 180;
    const menuHeight = 180;
    const posX = Math.min(window.innerWidth - menuWidth / 2 - 20, Math.max(menuWidth / 2 + 20, x));
    const posY = Math.min(window.innerHeight - menuHeight / 2 - 20, Math.max(menuHeight / 2 + 20, y));

    // Common action buttons logic
    const actions = [
        { id: 'inspect', icon: Search, label: 'Inspect', color: 'text-nexus-accent', onClick: () => onInspect(object.id) },
        // Reified links are containers, so enable "Add" for them too
        ...((isC || (isL && reified)) ? [{ id: 'add', icon: Plus, label: 'Add Sub-Unit', color: 'text-green-400', onClick: () => onAddChild?.(object.id) }] : []),
        ...(isL && !reified ? [{ id: 'reify', icon: Share2, label: 'Reify Logic', color: 'text-orange-500', onClick: () => onReify?.(object.id) }] : []),
        ...(isL ? [{ id: 'invert', icon: Repeat, label: 'Invert', color: 'text-nexus-500', onClick: () => onInvert?.(object.id) }] : []),
        { id: 'delete', icon: Trash2, label: 'Terminate', color: 'text-red-400', onClick: () => onDelete?.(object.id) },
    ];

    return (
        <div className="fixed inset-0 z-[400] pointer-events-none overflow-hidden">
            {/* Darken Backdrop slightly */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" 
                onClick={onClose}
            />

            {/* Menu Container */}
            <div 
                className="absolute pointer-events-auto flex items-center justify-center"
                style={{ left: posX, top: posY, width: 0, height: 0 }}
            >
                {/* Visual Center Point */}
                <div className="absolute w-4 h-4 rounded-full bg-nexus-500/40 animate-ping" />
                <div className={`absolute w-2 h-2 rounded-full ${reified ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-nexus-accent shadow-[0_0_10px_#06b6d4]'}`} />

                {/* Arcing Actions */}
                {actions.map((action, i) => {
                    const angle = (i / actions.length) * 2 * Math.PI - Math.PI / 2;
                    const distance = 80;
                    const tx = Math.cos(angle) * distance;
                    const ty = Math.sin(angle) * distance;

                    return (
                        <div 
                            key={action.id}
                            className="absolute animate-in zoom-in fade-in duration-300 fill-mode-both"
                            style={{ 
                                transform: `translate(${tx}px, ${ty}px)`,
                                animationDelay: `${i * 40}ms`
                            }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick();
                                    onClose();
                                }}
                                className="flex flex-col items-center group"
                            >
                                <div className={`w-12 h-12 rounded-full bg-nexus-900 border ${reified ? 'border-orange-500/30' : 'border-nexus-800'} flex items-center justify-center shadow-2xl group-active:scale-90 group-active:bg-nexus-800 transition-all`}>
                                    <action.icon size={20} className={action.color} />
                                </div>
                                <span className="absolute top-14 text-[8px] font-bold uppercase tracking-widest text-slate-300 bg-black/80 px-2 py-0.5 rounded-full border border-nexus-800 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap">
                                    {action.label}
                                </span>
                            </button>
                        </div>
                    );
                })}

                {/* Cancel Center Icon */}
                <div 
                    className="absolute w-6 h-6 rounded-full bg-nexus-800 border border-nexus-700 flex items-center justify-center text-slate-500 translate-y-12 opacity-50 pointer-events-none"
                    style={{ transform: 'translateY(125px)' }}
                >
                    <X size={10} />
                </div>
            </div>
        </div>
    );
};
