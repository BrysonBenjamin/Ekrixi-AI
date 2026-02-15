import React from 'react';
import {
  Box,
  Target,
  Compass,
  ArrowRightLeft,
  GitMerge,
  Fingerprint,
  ChevronRight,
  Activity,
  X,
} from 'lucide-react';
import {
  NexusObject,
  NexusNote,
  NexusLink,
  NexusCategory,
  isLink,
  isM2M,
  Participant,
} from '../../../../../types';
import { GraphOperations } from '../../../../../core/services/GraphOperations';

interface NoteStructuralSectionProps {
  object: NexusNote;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
}

export const NoteStructuralSection: React.FC<NoteStructuralSectionProps> = ({
  object,
  registry,
  onUpdate,
}) => {
  const children = object.children_ids?.map((id) => registry[id]).filter(Boolean) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Topology Card */}
      <div className="bg-nexus-950/40 border border-nexus-800/60 rounded-2xl p-5 space-y-4 shadow-inner">
        <div className="flex items-center justify-between">
          <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase tracking-widest">
            Organizational Topology
          </label>
          <div className="px-2 py-0.5 bg-nexus-blue/10 border border-nexus-blue/20 rounded-md">
            <span className="text-[7px] font-black text-nexus-blue uppercase tracking-widest">
              Parent::Root
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-nexus-900/60 border border-nexus-800/80 rounded-xl group cursor-pointer hover:border-nexus-blue/50 transition-all">
          <div className="w-8 h-8 rounded-lg bg-nexus-800 flex items-center justify-center text-nexus-muted group-hover:text-nexus-blue transition-colors">
            <Box size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-black text-nexus-text uppercase truncate italic">
              Registry Root
            </div>
            <div className="text-[7px] font-mono text-nexus-muted uppercase">TOPOLOGY::ROOT</div>
          </div>
          <ChevronRight size={12} className="text-nexus-muted" />
        </div>
      </div>

      {/* Logical Containment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[8px] font-black text-nexus-text uppercase tracking-[0.2em] italic">
            Containment Herd
          </h4>
          <span className="text-[7px] font-mono text-nexus-muted uppercase">
            {children.length} Units
          </span>
        </div>
        <div className="space-y-2">
          {children.length === 0 ? (
            <div className="p-8 border border-dashed border-nexus-800 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-40">
              <Compass size={20} className="text-nexus-muted" />
              <span className="text-[8px] font-black uppercase tracking-widest">
                No Descendants Detected
              </span>
            </div>
          ) : (
            children.map((child: any) => {
              const proseLength = child.prose_content?.length || 0;
              const healthColor =
                proseLength > 1000
                  ? 'bg-green-500'
                  : proseLength > 200
                    ? 'bg-nexus-amber'
                    : 'bg-nexus-ruby';
              return (
                <div
                  key={child.id}
                  className="flex items-center gap-4 p-3 bg-nexus-900/40 border border-nexus-800/50 rounded-xl hover:bg-nexus-800/40 transition-all group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-nexus-text truncate group-hover:text-nexus-accent transition-colors">
                      {child.title || 'Untitled Unit'}
                    </div>
                    {/* Health Bar */}
                    <div className="mt-1.5 h-0.5 w-full bg-nexus-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${healthColor} shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]`}
                        style={{ width: `${Math.min(100, (proseLength / 2000) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-nexus-900 border border-nexus-800 rounded text-[7px] font-black text-nexus-muted uppercase group-hover:text-nexus-text transition-colors">
                      {child.category_id}
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-nexus-muted group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface LinkStructuralSectionProps {
  object: NexusLink;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
}

export const LinkStructuralSection: React.FC<LinkStructuralSectionProps> = ({
  object,
  registry,
  onUpdate,
}) => {
  const source = registry[object.source_id] as NexusNote;
  const target = registry[object.target_id] as NexusNote;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Identity Mapping (Flow Diagram) */}
      <div className="relative p-6 bg-nexus-950/60 border border-nexus-800/50 rounded-3xl space-y-8 overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Fingerprint size={80} className="text-nexus-accent" />
        </div>

        {/* Source Node */}
        <div className="relative z-10 space-y-2">
          <label className="text-[7px] font-mono font-bold text-nexus-muted/40 uppercase tracking-[0.3em] ml-1">
            Origin Node
          </label>
          <div className="flex items-center gap-3 p-3 bg-nexus-900 border border-nexus-800 rounded-2xl hover:border-nexus-accent/50 transition-all cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-nexus-800 flex items-center justify-center text-nexus-accent shadow-inner">
              <Target size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-nexus-text uppercase truncate italic">
                {source?.title || 'Unknown'}
              </div>
              <div className="text-[7px] font-mono text-nexus-muted uppercase">
                IDENTITY::ANCHOR
              </div>
            </div>
          </div>
        </div>

        {/* Relational Bridge */}
        <div className="relative flex flex-col items-center gap-2 py-2">
          <div className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-nexus-accent/40 via-nexus-accent/10 to-nexus-accent/40" />

          <button
            onClick={() => onUpdate({ verb: object.verb_inverse, verb_inverse: object.verb })}
            className="relative z-10 w-8 h-8 rounded-full bg-nexus-900 border border-nexus-accent/30 flex items-center justify-center text-nexus-accent hover:rotate-180 hover:bg-nexus-accent hover:text-nexus-950 transition-all duration-500 shadow-xl"
            title="Reverse Direction"
          >
            <ArrowRightLeft size={12} />
          </button>

          <div className="relative z-10 px-4 py-2 bg-nexus-900 border border-nexus-800 rounded-xl shadow-2xl">
            <input
              value={object.verb || ''}
              onChange={(e) => onUpdate({ verb: e.target.value })}
              className="w-full bg-transparent text-center text-[10px] font-black text-nexus-accent uppercase tracking-widest outline-none placeholder:text-nexus-muted/20"
              placeholder="ACTION VERB..."
            />
          </div>
        </div>

        {/* Target Node */}
        <div className="relative z-10 space-y-2">
          <label className="text-[7px] font-mono font-bold text-nexus-muted/40 uppercase tracking-[0.3em] ml-1 text-right block">
            Terminal Node
          </label>
          <div className="flex items-center gap-3 p-3 bg-nexus-900 border border-nexus-800 rounded-2xl hover:border-nexus-accent/50 transition-all cursor-pointer group">
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[10px] font-black text-nexus-text uppercase truncate italic">
                {target?.title || 'Unknown'}
              </div>
              <div className="text-[7px] font-mono text-nexus-muted uppercase">
                IDENTITY::TERMINAL
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-nexus-800 flex items-center justify-center text-nexus-blue shadow-inner">
              <Activity size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Reciprocal Label */}
      <div className="space-y-1 px-1">
        <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
          Inverse Sequence Logic
        </label>
        <input
          value={object.verb_inverse || ''}
          onChange={(e) => onUpdate({ verb_inverse: e.target.value })}
          className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black text-nexus-text/60 focus:border-nexus-accent outline-none uppercase tracking-widest"
          placeholder="Reciprocal Relation..."
        />
      </div>
    </div>
  );
};

// ============================================================
// M2M Structural Section
// ============================================================

interface M2MStructuralSectionProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
  onUpdateObject?: (id: string, val: Partial<NexusObject>) => void;
}

const M2MStructuralSection: React.FC<M2MStructuralSectionProps> = ({
  object,
  registry,
  onUpdate,
  onUpdateObject,
}) => {
  const hub = object as unknown as {
    id: string;
    global_verb: string;
    participants: Participant[];
  };

  const handleRemoveParticipant = (nodeId: string) => {
    // Use GraphOperations for multi-node update
    GraphOperations.removeParticipant(registry, hub.id, nodeId);

    // Persist Changes
    if (onUpdateObject) {
      // Update Hub
      onUpdateObject(hub.id, registry[hub.id]);
      // Update Participant Node (link_ids removed)
      const participant = registry[nodeId];
      if (participant) {
        onUpdateObject(participant.id, participant);
      }
    } else {
      // Fallback (only updates current object view if parent doesn't handle multi-update)
      onUpdate(registry[hub.id]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Global Verb */}
      <div className="space-y-1 px-1">
        <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
          Hub Verb (Global)
        </label>
        <input
          value={hub.global_verb || ''}
          onChange={(e) => onUpdate({ global_verb: e.target.value } as Partial<NexusObject>)}
          className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black text-nexus-accent uppercase tracking-widest outline-none placeholder:text-nexus-muted/20 focus:border-nexus-accent"
          placeholder="HUB ACTION VERB..."
        />
      </div>

      {/* Participants Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[8px] font-black text-nexus-text uppercase tracking-[0.2em] italic">
            Participants
          </h4>
          <span className="text-[7px] font-mono text-nexus-muted uppercase">
            {hub.participants.length} Units
          </span>
        </div>
        <div className="space-y-2">
          {hub.participants.map((p, idx) => {
            const pNode = registry[p.node_id] as NexusNote | undefined;
            return (
              <div
                key={`${p.node_id}-${idx}`}
                className="flex items-center gap-3 p-3 bg-nexus-900/40 border border-nexus-800/50 rounded-xl hover:bg-nexus-800/40 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-black">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-nexus-text truncate">
                    {pNode?.title || p.node_id.slice(0, 8)}
                  </div>
                  <div className="text-[8px] font-mono text-nexus-muted mt-0.5">{p.verb}</div>
                </div>
                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[7px] font-black text-amber-500 uppercase">
                  {p.role_id}
                </div>
                <button
                  onClick={() => handleRemoveParticipant(p.node_id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                  title="Remove Participant"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Qualifier Editor
// ============================================================

interface QualifierEditorProps {
  linkId: string;
  qualifiers: Record<string, string | number | boolean>;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
  onUpdateObject?: (id: string, val: Partial<NexusObject>) => void;
}

const QualifierEditor: React.FC<QualifierEditorProps> = ({
  linkId,
  qualifiers,
  registry,
  onUpdate,
  onUpdateObject,
}) => {
  const entries = Object.entries(qualifiers);

  const commitChange = () => {
    if (onUpdateObject) {
      onUpdateObject(linkId, registry[linkId]);
    } else {
      onUpdate(registry[linkId]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[8px] font-black text-nexus-text uppercase tracking-[0.2em] italic flex items-center gap-2">
          <Fingerprint size={10} className="text-nexus-accent" /> Qualifiers
        </h4>
        <button
          onClick={() => {
            const key = `qualifier_${entries.length + 1}`;
            GraphOperations.setQualifier(registry, linkId, key, '');
            commitChange();
          }}
          className="text-[7px] px-2 py-0.5 bg-nexus-800 hover:bg-nexus-700 rounded text-nexus-text transition-colors font-black uppercase"
        >
          + Add
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="p-4 border border-dashed border-nexus-800 rounded-xl flex items-center justify-center opacity-40">
          <span className="text-[8px] font-black uppercase tracking-widest text-nexus-muted">
            No Qualifiers
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 group">
              <input
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  // Remove old, add new with same value
                  GraphOperations.removeQualifier(registry, linkId, key);
                  GraphOperations.setQualifier(registry, linkId, newKey, value);
                  commitChange();
                }}
                className="w-1/3 bg-nexus-900 border border-nexus-800 rounded-lg px-2 py-1.5 text-[9px] font-mono text-nexus-muted outline-none focus:border-nexus-accent"
                placeholder="key"
              />
              <span className="text-[8px] text-nexus-muted/30">:</span>
              <input
                value={String(value)}
                onChange={(e) => {
                  GraphOperations.setQualifier(registry, linkId, key, e.target.value);
                  commitChange();
                }}
                className="flex-1 bg-nexus-900 border border-nexus-800 rounded-lg px-2 py-1.5 text-[9px] font-mono text-nexus-text outline-none focus:border-nexus-accent"
                placeholder="value"
              />
              <button
                onClick={() => {
                  GraphOperations.removeQualifier(registry, linkId, key);
                  commitChange();
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                title="Remove Qualifier"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Structural Audit — Dispatch
// ============================================================

interface StructuralAuditProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
  onUpdateObject?: (id: string, val: Partial<NexusObject>) => void;
  isStory?: boolean;
}

export const StructuralAudit: React.FC<StructuralAuditProps> = ({
  object,
  registry,
  onUpdate,
  onUpdateObject,
}) => {
  const isL = isLink(object);
  const isLinkM2M = isL && isM2M(object);
  const isLinkBinary = isL && !isLinkM2M;

  // Extract qualifiers for link objects
  const qualifiers = isL
    ? (object as unknown as { qualifiers?: Record<string, string | number | boolean> })
        .qualifiers || {}
    : {};
  const hasQualifiers = Object.keys(qualifiers).length > 0 || isL;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20">
          {isLinkM2M ? (
            <GitMerge className="text-amber-500" size={14} />
          ) : isL ? (
            <GitMerge className="text-nexus-accent" size={14} />
          ) : (
            <Compass className="text-nexus-accent" size={14} />
          )}
        </div>
        <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
          {isLinkM2M ? 'M2M Hub Logic' : 'Structural Logic'}
        </h3>
      </div>

      <div className="space-y-4">
        {!isL ? (
          <NoteStructuralSection
            object={object as NexusNote}
            registry={registry}
            onUpdate={onUpdate}
          />
        ) : isLinkM2M ? (
          <M2MStructuralSection
            object={object}
            registry={registry}
            onUpdate={onUpdate}
            onUpdateObject={onUpdateObject}
          />
        ) : (
          <LinkStructuralSection
            object={object as NexusLink}
            registry={registry}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Qualifier Editor — shown for all link types */}
      {isL && (
        <QualifierEditor
          linkId={object.id}
          qualifiers={qualifiers}
          registry={registry}
          onUpdate={onUpdate}
          onUpdateObject={onUpdateObject}
        />
      )}
    </div>
  );
};
