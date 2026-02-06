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
  object,
  x,
  y,
  onClose,
  onInspect,
  onAddChild,
  onDelete,
  onReify,
  onInvert,
}) => {
  const isL = isLink(object);
  const reified = isReified(object);

  const menuWidth = 200;
  const menuHeight = 200;
  const posX = Math.min(window.innerWidth - menuWidth / 2 - 20, Math.max(menuWidth / 2 + 20, x));
  const posY = Math.min(window.innerHeight - menuHeight / 2 - 20, Math.max(menuHeight / 2 + 20, y));

  const actions = [
    {
      id: 'inspect',
      icon: Search,
      label: 'Inspect',
      color: 'text-nexus-accent',
      onClick: () => onInspect(object.id),
    },
    // All non-link nodes (or reified) can have children now
    ...(!isL || reified
      ? [
          {
            id: 'add',
            icon: Plus,
            label: 'Add Unit',
            color: 'text-nexus-essence',
            onClick: () => onAddChild?.(object.id),
          },
        ]
      : []),
    ...(isL && !reified
      ? [
          {
            id: 'reify',
            icon: Share2,
            label: 'Reify',
            color: 'text-nexus-accent',
            onClick: () => onReify?.(object.id),
          },
        ]
      : []),
    ...(isL
      ? [
          {
            id: 'invert',
            icon: Repeat,
            label: 'Invert',
            color: 'text-nexus-arcane',
            onClick: () => onInvert?.(object.id),
          },
        ]
      : []),
    {
      id: 'delete',
      icon: Trash2,
      label: 'Purge',
      color: 'text-red-500',
      onClick: () => onDelete?.(object.id),
    },
  ];

  return (
    <div className="fixed inset-0 z-[400] pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      <div
        className="absolute pointer-events-auto flex items-center justify-center"
        style={{ left: posX, top: posY, width: 0, height: 0 }}
      >
        <div className="absolute w-8 h-8 rounded-full bg-nexus-accent/20 animate-ping" />
        <div
          className={`absolute w-3 h-3 rounded-full ${reified ? 'bg-nexus-accent shadow-[0_0_15px_var(--accent-color)]' : 'bg-nexus-text shadow-[0_0_10px_var(--text-main)]'}`}
        />

        {actions.map((action, i) => {
          const angle = (i / actions.length) * 2 * Math.PI - Math.PI / 2;
          const distance = 90;
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance;

          return (
            <div
              key={action.id}
              className="absolute animate-in zoom-in fade-in duration-300 fill-mode-both"
              style={{
                transform: `translate(${tx}px, ${ty}px)`,
                animationDelay: `${i * 50}ms`,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  onClose();
                }}
                className="flex flex-col items-center group relative"
              >
                <div
                  className={`w-14 h-14 rounded-full bg-nexus-900 border border-nexus-800 flex items-center justify-center shadow-2xl group-active:scale-90 group-active:bg-nexus-800 transition-all ring-2 ring-transparent group-hover:ring-nexus-accent/20`}
                >
                  <action.icon size={22} className={action.color} />
                </div>
                <span className="absolute top-16 text-[9px] font-display font-black uppercase tracking-widest text-nexus-text bg-nexus-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-nexus-800 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all whitespace-nowrap shadow-xl">
                  {action.label}
                </span>
              </button>
            </div>
          );
        })}

        <div
          className="absolute w-8 h-8 rounded-full bg-nexus-800/80 border border-nexus-700 flex items-center justify-center text-nexus-muted shadow-xl opacity-0 animate-in fade-in duration-500 delay-300"
          style={{ transform: 'translateY(140px)' }}
        >
          <X size={12} />
        </div>
      </div>
    </div>
  );
};
