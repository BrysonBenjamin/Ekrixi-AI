import React from 'react';
import { Plus, Trash2, Archive } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}) => {
  return (
    <aside className="w-full h-full bg-nexus-900 border-r border-nexus-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-nexus-800">
        <div className="flex items-center gap-2">
          <Archive size={16} className="text-nexus-accent" />
          <div className="text-[11px] font-display font-black text-nexus-muted uppercase tracking-[0.2em]">
            Archives
          </div>
        </div>
        <button
          onClick={onCreate}
          className="p-1.5 rounded-lg bg-nexus-800 hover:bg-nexus-accent hover:text-white text-nexus-muted transition-all"
          title="New Universe"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
        {sessions.length === 0 && (
          <div className="p-8 text-center text-[11px] text-nexus-muted font-display font-semibold uppercase tracking-widest opacity-40">
            No active timelines.
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`
                            group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                            ${
                              activeId === session.id
                                ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-text shadow-sm'
                                : 'text-nexus-muted border-transparent hover:bg-nexus-800 hover:text-nexus-text'
                            }
                        `}
          >
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300"
                style={{
                  backgroundColor: activeId === session.id ? 'var(--accent-color)' : 'transparent',
                }}
              ></div>
              <span
                className={`text-sm truncate font-medium block w-full ${activeId === session.id ? 'font-bold' : ''}`}
              >
                {session.title}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className={`
                                p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100
                                ${activeId === session.id ? 'opacity-100' : ''}
                            `}
              title="Delete Timeline"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-nexus-800 text-[9px] text-nexus-muted font-mono flex items-center justify-center gap-2 uppercase tracking-[0.3em]">
        <div className="w-1 h-1 bg-nexus-accent rounded-full animate-pulse"></div>
        Nexus Registry
      </div>
    </aside>
  );
};
