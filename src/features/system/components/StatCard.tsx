import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  highlight,
}) => (
  <div
    className={`p-6 rounded-3xl border ${highlight ? 'bg-nexus-500/10 border-nexus-500/40 shadow-[0_0_30px_var(--ley-color)]' : 'bg-nexus-900 border-nexus-800'} relative overflow-hidden group transition-all hover:translate-y-[-2px]`}
  >
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={highlight ? 'text-nexus-accent' : 'text-nexus-muted'} />
        <span
          className={`text-[10px] font-display font-black uppercase tracking-widest ${highlight ? 'text-nexus-300' : 'text-nexus-muted'}`}
        >
          {label}
        </span>
      </div>
      <div className={`text-3xl font-display font-black tracking-tight text-nexus-text`}>
        {value}
      </div>
      <div className="text-[10px] text-nexus-muted mt-1 font-medium italic">{subtext}</div>
    </div>
  </div>
);
