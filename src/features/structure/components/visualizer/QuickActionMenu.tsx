import React from 'react';
import {
  Search,
  Plus,
  Trash2,
  Share2,
  X,
  ArrowRight,
  Box,
  Zap,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
} from 'lucide-react';
import {
  NexusObject,
  isLink,
  isContainer,
  isReified,
  SimpleNote,
  SimpleLink,
} from '../../../../types';
import { LucideIcon } from 'lucide-react';

interface QuickActionMenuProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onClose: () => void;
  onInspect: (id: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReify?: (id: string) => void;
  onInvert?: (id: string) => void;
  onSelectNode?: (id: string) => void;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  object,
  registry,
  onClose,
  onInspect,
  onAddChild,
  onDelete,
  onReify,
  onInvert,
  onSelectNode,
}) => {
  const isL = isLink(object);
  const isC = isContainer(object);
  const reified = isReified(object);

  const title = (object as SimpleNote).title || (object as SimpleLink).verb || 'Untitled';
  const type = object._type.replace(/_/g, ' ');

  let sourceTitle = 'Unknown';
  let targetTitle = 'Unknown';
  if (isL) {
    const link = object as SimpleLink;
    const s = registry[link.source_id];
    const t = registry[link.target_id];
    sourceTitle = s ? (s as SimpleNote).title || 'Untitled' : 'Unknown';
    targetTitle = t ? (t as SimpleNote).title || 'Untitled' : 'Unknown';
  }

  const getHeaderIcon = () => {
    if (reified) return <Share2 size={32} className="text-nexus-accent" />;
    if (isL) return <Zap size={32} className="text-nexus-arcane" />;
    if (isC) return <Box size={32} className="text-nexus-essence" />;
    return <Box size={32} className="text-nexus-muted" />;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-nexus-900 border border-nexus-800 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
        <div className="px-8 pt-10 pb-8 text-center border-b border-nexus-800/50">
          <div className="flex justify-center mb-6">
            <div
              className={`w-20 h-20 rounded-[28px] flex items-center justify-center shadow-lg border transition-all ${reified ? 'bg-nexus-accent/10 border-nexus-accent/20 shadow-nexus-accent/10' : 'bg-nexus-900 border-nexus-800 shadow-sm'}`}
            >
              {getHeaderIcon()}
            </div>
          </div>

          {isL && !reified ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 text-nexus-muted mb-2">
                <span className="text-[10px] font-display font-black uppercase tracking-widest truncate max-w-[120px]">
                  {sourceTitle}
                </span>
                <ArrowRightLeft size={10} className="text-nexus-accent opacity-50" />
                <span className="text-[10px] font-display font-black uppercase tracking-widest truncate max-w-[120px]">
                  {targetTitle}
                </span>
              </div>
              <h3 className="text-2xl font-display font-black text-nexus-text tracking-tight px-4 capitalize italic">
                "{(object as SimpleLink).verb}"
              </h3>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-display font-black text-nexus-text tracking-tight mb-2 truncate px-4">
                {title}
              </h3>
              <div
                className={`text-[10px] font-mono font-black uppercase tracking-[0.3em] ${reified ? 'text-nexus-accent' : 'text-nexus-muted'}`}
              >
                {reified ? 'Reified Logic Unit' : type}
              </div>
            </>
          )}
        </div>

        <div className="p-4 grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto no-scrollbar">
          <ActionButton
            icon={Search}
            label="Inspect Unit"
            desc="Detailed manifest & records"
            onClick={() => {
              onInspect(object.id);
              onClose();
            }}
          />

          {isL && (
            <ActionButton
              icon={Repeat}
              label="Invert Logic"
              desc="Swap source and terminal direction"
              onClick={() => {
                if (onInvert) onInvert(object.id);
                onClose();
              }}
            />
          )}

          {(isC || (isL && reified)) && onAddChild && (
            <ActionButton
              icon={Plus}
              label="Establish Sub-Unit"
              desc="Append nested logical unit"
              color="text-nexus-essence"
              onClick={() => {
                onAddChild(object.id);
                onClose();
              }}
            />
          )}

          {isL && !reified && onReify && (
            <ActionButton
              icon={Share2}
              label="Reify Connection"
              desc="Promote logic to First-Class Unit"
              color="text-nexus-accent"
              onClick={() => {
                onReify(object.id);
                onClose();
              }}
            />
          )}

          {isL && onSelectNode && (
            <>
              <div className="h-px bg-nexus-800/30 my-2 mx-4" />
              <ActionButton
                icon={ArrowUpRight}
                label={`Origin: ${sourceTitle}`}
                desc="Jump to scrying focus"
                onClick={() => {
                  onSelectNode((object as SimpleLink).source_id);
                  onClose();
                }}
              />
              <ActionButton
                icon={ArrowDownLeft}
                label={`Terminal: ${targetTitle}`}
                desc="Jump to scrying focus"
                onClick={() => {
                  onSelectNode((object as SimpleLink).target_id);
                  onClose();
                }}
              />
            </>
          )}

          <div className="h-px bg-nexus-800/30 my-2 mx-4" />

          <ActionButton
            icon={Trash2}
            label="Terminate Unit"
            desc="Permanent purge from registry"
            color="text-red-500"
            onClick={() => {
              if (onDelete) onDelete(object.id);
              onClose();
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-6 bg-nexus-950 hover:bg-nexus-800 text-nexus-muted font-display font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 border-t border-nexus-800/50 transition-all"
        >
          <X size={14} /> Cancel Selection
        </button>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  desc: string;
  onClick: () => void;
  color?: string;
}

const ActionButton = ({
  icon: Icon,
  label,
  desc,
  onClick,
  color = 'text-nexus-accent',
}: ActionButtonProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-5 p-4 rounded-3xl bg-nexus-950/40 hover:bg-nexus-800 border border-transparent hover:border-nexus-800 transition-all group active:scale-[0.98] text-left"
  >
    <div
      className={`p-3 rounded-2xl bg-nexus-900 border border-nexus-800 group-hover:border-nexus-700 transition-all ${color} shadow-sm`}
    >
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-display font-bold text-nexus-text transition-colors truncate">
        {label}
      </div>
      <div className="text-[9px] text-nexus-muted font-black uppercase tracking-widest truncate mt-0.5">
        {desc}
      </div>
    </div>
    <ArrowRight
      size={18}
      className="text-nexus-muted group-hover:text-nexus-text group-hover:translate-x-1 transition-all shrink-0 opacity-40"
    />
  </button>
);
