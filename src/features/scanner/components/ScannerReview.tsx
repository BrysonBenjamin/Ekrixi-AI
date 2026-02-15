import React from 'react';
import {
  CheckCircle,
  Trash2,
  Box,
  Link2,
  ChevronRight,
  Share2,
  ShieldAlert,
  GitMerge,
} from 'lucide-react';
import { NexusObject, isLink, SimpleNote, isM2M, isBinaryLink } from '../../../types';
import { ExtractedItem } from '../ScannerFeature';
import { IntegrityBadge } from '../../integrity/components/IntegrityBadge';
import { IntegrityPathTrace } from '../../integrity/components/IntegrityPathTrace';

interface ScannerReviewProps {
  items: ExtractedItem[];
  onUpdate: (items: ExtractedItem[]) => void;
  onCommit: (items: NexusObject[]) => void;
  onCancel: () => void;
}

export const ScannerReview: React.FC<ScannerReviewProps> = ({
  items,
  onUpdate,
  onCommit,
  onCancel,
}) => {
  const nodes = items.filter((i) => !isLink(i));
  const binaryLinks = items.filter((i) => isBinaryLink(i));
  const m2mHubs = items.filter((i) => isM2M(i));

  // For PathTrace to work in Scanner, we need a local registry of the extracted items
  const localRegistry = React.useMemo(() => {
    const reg: Record<string, NexusObject> = {};
    items.forEach((i) => (reg[i.id] = i));
    return reg;
  }, [items]);

  const handleRemove = (id: string) => {
    onUpdate(items.filter((i) => i.id !== id));
  };

  const handleApproveAll = () => {
    const approved = items.filter((i) => !i.conflict || i.conflict.status !== 'REDUNDANT');
    onCommit(approved);
  };

  const totalConflicts = binaryLinks.filter(
    (l) => l.conflict && l.conflict.status !== 'APPROVED',
  ).length;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
      <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-nexus-800/50 pb-6 md:pb-8 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-black text-nexus-text tracking-tight flex items-center gap-3 md:gap-4 uppercase">
            <div className="p-1.5 md:p-2 bg-nexus-accent/10 rounded-xl">
              <CheckCircle className="text-nexus-accent" size={20} />
            </div>
            Extraction <span className="text-nexus-accent">Verified</span>
          </h2>
          <p className="text-xs md:text-sm text-nexus-muted mt-2 font-medium">
            Discovered <span className="text-nexus-text font-bold">{nodes.length}</span> atomic
            units, <span className="text-nexus-text font-bold">{binaryLinks.length}</span>{' '}
            associations, and <span className="text-nexus-text font-bold">{m2mHubs.length}</span>{' '}
            hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {totalConflicts > 0 && (
            <div className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 md:gap-3">
              <span className="text-[9px] md:text-[10px] font-display font-black text-amber-500 uppercase tracking-widest">
                {totalConflicts} Flags
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 md:gap-4 ml-auto md:ml-0">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-nexus-700 text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all text-[9px] md:text-[10px] font-display font-black uppercase tracking-widest"
            >
              Abort
            </button>
            <button
              onClick={handleApproveAll}
              className="px-5 py-2.5 md:px-8 md:py-3 rounded-xl md:rounded-2xl bg-nexus-accent hover:brightness-110 text-white shadow-lg md:shadow-xl shadow-nexus-accent/20 transition-all text-[9px] md:text-[10px] font-display font-black uppercase tracking-[0.2em] flex items-center gap-2 md:gap-3 active:scale-95"
            >
              <span className="hidden md:inline">Commit to Refinery</span>
              <span className="md:hidden">Commit</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6 flex-1 overflow-hidden min-h-0 pb-4 md:pb-10">
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5 px-2">
            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-2.5">
              <Box size={14} className="text-nexus-accent" /> Atomic Units ({nodes.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-3">
            {nodes.map((node) => (
              <ReviewCard
                key={node.id}
                title={(node as SimpleNote).title}
                category={(node as SimpleNote).category_id}
                gist={(node as SimpleNote).gist}
                onRemove={() => handleRemove(node.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5 px-2">
            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-2.5">
              <Link2 size={14} className="text-nexus-arcane" /> Logic Streams ({binaryLinks.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-3">
            {binaryLinks.map((link) => (
              <ReviewCard
                key={link.id}
                title={link.verb}
                category="ASSOCIATION"
                isLink
                qualifiers={(link as any).qualifiers}
                conflict={link.conflict}
                localRegistry={localRegistry}
                onRemove={() => handleRemove(link.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5 px-2">
            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-2.5">
              <GitMerge size={14} className="text-amber-500" /> Complex Hubs ({m2mHubs.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-3">
            {m2mHubs.map((hub) => (
              <HubReviewCard
                key={hub.id}
                hub={hub}
                onRemove={() => handleRemove(hub.id)}
                localRegistry={localRegistry}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReviewCardProps {
  title: string;
  category?: string;
  gist?: string;
  isLink?: boolean;
  qualifiers?: Record<string, string | number | boolean>;
  conflict?: ExtractedItem['conflict'];
  localRegistry?: Record<string, NexusObject>;
  onRemove: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  title,
  category,
  gist,
  isLink,
  qualifiers,
  conflict,
  localRegistry,
  onRemove,
}) => {
  const isRedundant = conflict?.status === 'REDUNDANT';
  const isImplied = conflict?.status === 'IMPLIED';
  const hasQualifiers = qualifiers && Object.keys(qualifiers).length > 0;

  return (
    <div
      className={`
            group relative border rounded-[28px] p-5 flex flex-col gap-4 transition-all hover:bg-nexus-900 shadow-sm
            ${
              isRedundant
                ? 'bg-red-950/20 border-red-500/40 opacity-80'
                : isImplied
                  ? 'bg-amber-950/10 border-amber-500/40 border-dashed'
                  : 'bg-nexus-900/40 border-nexus-800 hover:border-nexus-accent/40'
            }
        `}
    >
      <div className="flex items-start gap-5">
        <div
          className={`
                    w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-colors
                    ${isRedundant ? 'bg-red-500/10 border-red-500/20 text-red-500' : isLink ? 'bg-nexus-arcane/5 border-nexus-arcane/20 text-nexus-arcane' : 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent'}
                `}
        >
          {isRedundant ? (
            <ShieldAlert size={20} />
          ) : isLink ? (
            <Share2 size={20} />
          ) : (
            <Box size={20} />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-3 mb-1.5">
            <h3
              className={`text-sm font-display font-black uppercase tracking-tight truncate ${isRedundant ? 'text-red-400 line-through' : 'text-nexus-text'}`}
            >
              {title || 'Untitled'}
            </h3>
            <span className="text-[8px] font-mono font-black bg-nexus-800 border border-nexus-700 px-2 py-0.5 rounded-full text-nexus-muted uppercase tracking-widest">
              {category}
            </span>
          </div>
          {gist && (
            <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic line-clamp-2">
              "{gist}"
            </p>
          )}

          {hasQualifiers && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(qualifiers!).map(([k, v]) => (
                <span
                  key={k}
                  className="text-[9px] px-2 py-0.5 bg-nexus-800/60 border border-nexus-700/30 rounded-full font-mono text-nexus-muted"
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="p-2.5 text-nexus-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90 shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {conflict && conflict.status !== 'APPROVED' && (
        <div className="mt-2">
          <IntegrityBadge
            status={conflict.status}
            reason={conflict.reason}
            suggestion={conflict.suggestion}
          />
          {conflict.existingPath && (
            <IntegrityPathTrace
              path={conflict.existingPath}
              registry={localRegistry}
              className="mt-2 pl-5"
            />
          )}
        </div>
      )}
    </div>
  );
};

interface HubReviewCardProps {
  hub: NexusObject;
  onRemove: () => void;
  localRegistry: Record<string, NexusObject>;
}

const HubReviewCard: React.FC<HubReviewCardProps> = ({ hub, onRemove, localRegistry }) => {
  const hubData = hub as unknown as {
    global_verb: string;
    participants: { node_id: string; role_id: string; verb: string }[];
    title?: string;
    qualifiers?: Record<string, string | number | boolean>;
  };

  const hasQualifiers = hubData.qualifiers && Object.keys(hubData.qualifiers).length > 0;

  return (
    <div className="group relative border border-amber-500/30 rounded-[28px] p-5 flex flex-col gap-4 transition-all hover:bg-nexus-900 shadow-sm bg-amber-500/5 hover:border-amber-500/50">
      <div className="flex items-start gap-5">
        <div className="w-12 h-12 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-sm transition-colors">
          <GitMerge size={20} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-sm font-display font-black uppercase tracking-tight truncate text-nexus-text">
              {hubData.global_verb || 'M2M Hub'}
            </h3>
            <span className="text-[8px] font-mono font-black bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-500 uppercase tracking-widest">
              HUB
            </span>
          </div>
          <div className="space-y-1 mt-2">
            {hubData.participants.slice(0, 3).map((p, idx) => {
              const pNode = localRegistry[p.node_id] as SimpleNote | undefined;
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className="text-amber-500/70 font-mono">{p.role_id}:</span>
                  <span className="text-nexus-muted truncate flex-1">
                    {pNode?.title || p.node_id.slice(0, 8)}
                  </span>
                </div>
              );
            })}
            {hubData.participants.length > 3 && (
              <div className="text-[9px] text-nexus-muted/50 italic pl-1">
                +{hubData.participants.length - 3} more participants
              </div>
            )}
          </div>

          {hasQualifiers && (
            <div className="flex flex-wrap gap-1 mt-3">
              {Object.entries(hubData.qualifiers!).map(([k, v]) => (
                <span
                  key={k}
                  className="text-[9px] px-2 py-0.5 bg-nexus-800/60 border border-nexus-700/30 rounded-full font-mono text-nexus-muted"
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="p-2.5 text-nexus-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90 shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
