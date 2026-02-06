import React from 'react';
import { Database } from 'lucide-react';

export const SystemHeader: React.FC = () => {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-nexus-500/10 rounded-xl border border-nexus-500/20">
          <Database className="text-nexus-accent" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-black text-nexus-text tracking-tight">
            SYSTEM <span className="text-nexus-500">CORE</span>
          </h1>
          <p className="text-xs text-nexus-muted font-mono uppercase tracking-[0.2em] mt-1">
            Mainframe Status: Online // Registry Verified
          </p>
        </div>
      </div>
    </div>
  );
};
