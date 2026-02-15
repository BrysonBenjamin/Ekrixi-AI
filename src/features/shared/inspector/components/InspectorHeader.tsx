import React from 'react';
import {
  X,
  Copy,
  Check,
  Fingerprint,
  Box,
  Target,
  Cpu,
  Landmark,
  Sparkles,
  Globe,
  Zap,
} from 'lucide-react';
import { NexusObject, NexusCategory } from '../../../../types';

interface InspectorHeaderProps {
  object: NexusObject;
  onClose: () => void;
  onUpdate: (updates: Partial<NexusObject>) => void;
}

const CategoryIcon = ({
  categoryId,
  className,
  size,
}: {
  categoryId: NexusCategory | null;
  className?: string;
  size?: number;
}) => {
  switch (categoryId) {
    case NexusCategory.CHARACTER:
      return <Cpu className={className} size={size} />;
    case NexusCategory.LOCATION:
      return <Globe className={className} size={size} />;
    case NexusCategory.ITEM:
      return <Box className={className} size={size} />;
    case NexusCategory.EVENT:
      return <Zap className={className} size={size} />;
    case NexusCategory.ORGANIZATION:
      return <Landmark className={className} size={size} />;
    case NexusCategory.STORY:
      return <Sparkles className={className} size={size} />;
    case NexusCategory.WORLD:
      return <Globe className={className} size={size} />;
    case NexusCategory.CONCEPT:
      return <Fingerprint className={className} size={size} />;
    default:
      return <Target className={className} size={size} />;
  }
};

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({ object, onClose, onUpdate }) => {
  const [copied, setCopied] = React.useState(false);

  const categoryId = 'category_id' in object ? (object.category_id as NexusCategory) : null;
  const title = 'title' in object ? object.title : 'verb' in object ? object.verb : 'Untitled';

  const handleCopyId = () => {
    navigator.clipboard.writeText(object.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sticky top-0 z-20 bg-nexus-950/80 backdrop-blur-xl border-b border-nexus-800/50 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {/* Category Hex Pill */}
        <div className="relative group">
          <div className="absolute inset-0 bg-nexus-accent/20 blur-xl group-hover:bg-nexus-accent/40 transition-all duration-700" />
          <div className="relative w-16 h-16 bg-nexus-900 border border-nexus-accent/30 rounded-[2rem] flex items-center justify-center shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-nexus-accent/10 to-transparent" />
            <CategoryIcon
              categoryId={categoryId}
              className="text-nexus-accent relative z-10"
              size={32}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-nexus-muted hover:text-nexus-ruby hover:rotate-90 transition-all duration-500 bg-nexus-900/50 rounded-full border border-nexus-800/50"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-2">
        <input
          value={title || ''}
          onChange={(e) => {
            if ('title' in object) onUpdate({ title: e.target.value });
            else if ('verb' in object) onUpdate({ verb: e.target.value });
          }}
          className="w-full bg-transparent text-3xl font-black text-nexus-text tracking-tight placeholder:text-nexus-muted/20 outline-none focus:ring-0 uppercase italic"
          placeholder="Enter Identity..."
        />

        <div className="flex items-center gap-3">
          {/* UUID Chip */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-2 px-3 py-1 bg-nexus-900/60 border border-nexus-800/80 rounded-full hover:border-nexus-accent/50 transition-all group"
          >
            <Fingerprint
              size={10}
              className="text-nexus-muted group-hover:text-nexus-accent transition-colors"
            />
            <span className="text-[9px] font-mono font-bold text-nexus-muted tracking-widest uppercase">
              Identity::Locker
            </span>
            {copied ? (
              <Check size={10} className="text-green-500 animate-in zoom-in" />
            ) : (
              <Copy
                size={10}
                className="text-nexus-muted/40 group-hover:text-nexus-text transition-colors"
              />
            )}
          </button>

          <div className="px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/20 rounded-full">
            <span className="text-[9px] font-black text-nexus-accent uppercase tracking-widest">
              {object._type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
