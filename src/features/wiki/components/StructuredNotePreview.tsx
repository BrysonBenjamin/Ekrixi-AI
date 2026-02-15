import React from 'react';
import { NexusNote, NexusCategory } from '../../../types';
import { getTimeState } from '../../../core/utils/nexus-accessors';
import { Tag, MapPin, Hash, Activity } from 'lucide-react';

interface StructuredNotePreviewProps {
  node: NexusNote;
}

export const StructuredNotePreview: React.FC<StructuredNotePreviewProps> = ({ node }) => {
  const time = getTimeState(node);

  return (
    <div className="w-full max-w-3xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Block */}
      <div className="space-y-4 border-b border-nexus-800/50 pb-8">
        <div className="flex items-center gap-2 text-nexus-accent">
          <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-nexus-accent/30 bg-nexus-accent/10">
            {node.category_id || NexusCategory.CONCEPT}
          </span>
          {time?.effective_date?.year !== undefined && (
            <span className="text-xs font-mono text-nexus-muted">
              • {time.effective_date.year}
              {time.effective_date.month !== undefined && `-${time.effective_date.month}`}
              {time.effective_date.day !== undefined && `-${time.effective_date.day}`}
              {time.valid_until?.year !== undefined
                ? ` – ${time.valid_until.year}${time.valid_until.month !== undefined ? `-${time.valid_until.month}` : ''}${time.valid_until.day !== undefined ? `-${time.valid_until.day}` : ''}`
                : ' onwards'}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-display font-bold text-nexus-text">{node.title}</h1>
        {node.gist && (
          <p className="text-lg text-nexus-muted/80 font-light leading-relaxed">{node.gist}</p>
        )}
      </div>

      {/* Structured Data Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Classification */}
        <div className="p-4 rounded-xl bg-nexus-900/30 border border-nexus-800/50 space-y-2">
          <div className="flex items-center gap-2 text-nexus-muted text-[10px] uppercase tracking-widest font-bold">
            <Hash size={12} /> Core Data
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-nexus-muted">ID</span>
              <span className="font-mono text-nexus-text/70">{node.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-nexus-muted">Aliases</span>
              <span className="text-nexus-text">{node.aliases?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Stats / Metrics - Removed Tension */}
        <div className="p-4 rounded-xl bg-nexus-900/30 border border-nexus-800/50 space-y-2 opacity-50 grayscale">
          <div className="flex items-center gap-2 text-nexus-muted text-[10px] uppercase tracking-widest font-bold">
            <Activity size={12} /> Metrics
          </div>
          <div className="text-xs text-nexus-muted italic">No active metrics available.</div>
        </div>

        {/* Placeholder for custom fields based on category */}
        {node.category_id === NexusCategory.LOCATION && (
          <div className="p-6 rounded-xl bg-emerald-900/10 border border-emerald-500/20 text-emerald-200/80">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} />
              <span className="font-bold">Location Data</span>
            </div>
            <p className="text-sm italic opacity-70">
              Coordinates and regional data would be visualized here.
            </p>
          </div>
        )}

        {/* Prose Content (Read Only) */}
        <div className="prose prose-invert prose-nexus max-w-none pt-4">
          {node.prose_content ? (
            <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-nexus-text/90">
              {node.prose_content}
            </div>
          ) : (
            <div className="text-nexus-muted italic">No narrative content established.</div>
          )}
        </div>
      </div>
    </div>
  );
};
