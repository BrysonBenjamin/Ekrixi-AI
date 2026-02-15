import React, { useRef } from 'react';
import { Anchor } from 'lucide-react';
import { NexusObject, NexusNote, NexusType } from '../../../../../types';
import { MarkdownToolbar } from '../../../MarkdownToolbar';

interface ManifestRecordsProps {
  object: NexusObject;
  onUpdate: (val: Partial<NexusObject>) => void;
}

export const ManifestRecords: React.FC<ManifestRecordsProps> = ({ object, onUpdate }) => {
  const proseRef = useRef<HTMLTextAreaElement>(null);
  const isL = 'source_id' in object;
  const isReified =
    object._type === NexusType.AGGREGATED_SIMPLE_LINK ||
    object._type === NexusType.AGGREGATED_HIERARCHICAL_LINK;

  // Only allow prose for notes and reified links
  if (isL && !isReified) return null;

  const prose = 'prose_content' in object ? (object as NexusNote).prose_content : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20">
          <Anchor className="text-nexus-accent" size={14} />
        </div>
        <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
          Manifest Records
        </h3>
      </div>
      <div className="space-y-3">
        <MarkdownToolbar
          textareaRef={proseRef}
          content={prose || ''}
          onUpdate={(val) => onUpdate({ prose_content: val } as Partial<NexusObject>)}
        />
        <textarea
          ref={proseRef}
          value={prose || ''}
          onChange={(e) => onUpdate({ prose_content: e.target.value } as Partial<NexusObject>)}
          spellCheck={false}
          className="w-full h-80 bg-nexus-900 border border-nexus-800 rounded-2xl p-6 text-[13px] text-nexus-text font-mono outline-none focus:border-nexus-accent resize-none no-scrollbar leading-[1.8] shadow-inner selection:bg-nexus-accent/30 tracking-tight"
          placeholder="Record the manifestation in full prose..."
        />
      </div>
    </div>
  );
};
