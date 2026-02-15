import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  desc?: string;
  onClick: () => void;
  color?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  desc,
  onClick,
  color = 'text-nexus-muted',
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-white/[0.04] rounded-2xl transition-all group text-left"
  >
    <div
      className={`p-2 rounded-xl bg-nexus-950 border border-nexus-800 transition-colors group-hover:border-nexus-700 shadow-sm ${color}`}
    >
      <Icon size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] font-display font-black text-nexus-text group-hover:text-white transition-colors truncate">
        {label}
      </div>
      {desc && (
        <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-nexus-muted group-hover:text-nexus-400 truncate mt-0.5">
          {desc}
        </div>
      )}
    </div>
  </button>
);
