import React from 'react';
import {
  NexusObject,
  NexusLink,
  SimpleNote,
  isReified,
  isBinaryLink,
  isM2M,
} from '../../../../types';
import { Link2, ArrowRightCircle, Box, Calendar, GitMerge } from 'lucide-react';
import { getTimeState } from '../../../../core/utils/nexus-accessors';

interface LinksManagerProps {
  nodeId: string;
  outgoingLinks: NexusObject[]; // Links where source_id === nodeId
  registry: Record<string, NexusObject>;

  onReifyLink: (linkId: string) => void;
  onCreateLink: () => void; // Placeholder for now
}

export const LinksManager: React.FC<LinksManagerProps> = ({
  nodeId,
  outgoingLinks,
  registry,
  onReifyLink,
  onCreateLink,
}) => {
  // Separate binary links from M2M hubs
  const binaryLinks = outgoingLinks.filter((l) => isBinaryLink(l));
  const m2mHubs = outgoingLinks.filter((l) => isM2M(l));

  return (
    <div className="flex flex-col h-full bg-nexus-950 border-t border-nexus-800/50">
      {/* Binary Outgoing Links */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-nexus-800/30 bg-nexus-900/20">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-nexus-muted flex items-center gap-2">
          <Link2 size={12} /> Outgoing Connections ({binaryLinks.length})
        </h3>
        <button
          onClick={onCreateLink}
          className="text-[10px] px-2 py-1 bg-nexus-800 hover:bg-nexus-700 rounded text-nexus-text transition-colors"
        >
          + NEW LINK
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {binaryLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-nexus-muted opacity-40 gap-2">
            <Link2 size={24} />
            <span className="text-xs">No outgoing connections</span>
          </div>
        ) : (
          binaryLinks.map((link) => {
            const linkObj = link as any;
            const target = registry[linkObj.target_id] as SimpleNote;
            const isReifiedLink = isReified(link);
            const timeState = getTimeState(link as unknown as SimpleNote);
            const qualifiers = (linkObj.qualifiers || {}) as Record<
              string,
              string | number | boolean
            >;
            const hasQualifiers = Object.keys(qualifiers).length > 0;

            return (
              <div
                key={link.id}
                className={`
                                    group flex items-center gap-3 p-3 rounded-xl border transition-all
                                    ${
                                      isReifiedLink
                                        ? 'bg-nexus-900/40 border-nexus-800 hover:border-nexus-accent/40'
                                        : 'bg-transparent border-transparent hover:bg-nexus-900/50 hover:border-nexus-800/50'
                                    }
                                `}
              >
                <div
                  className={`p-2 rounded-lg ${isReifiedLink ? 'bg-nexus-accent/10 text-nexus-accent' : 'bg-nexus-800/30 text-nexus-muted'}`}
                >
                  {isReifiedLink ? <Box size={14} /> : <ArrowRightCircle size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-nexus-muted">
                      {linkObj.verb || 'related to'}
                    </span>
                    <span className="text-xs font-bold text-nexus-text truncate">
                      {target?.title || 'Unknown Node'}
                    </span>
                  </div>

                  {isReifiedLink && (
                    <div className="text-[10px] text-nexus-muted mt-1 truncate pl-2 border-l-2 border-nexus-800">
                      {(link as unknown as SimpleNote).gist || 'No description provided.'}
                    </div>
                  )}

                  {/* Qualifier Pills */}
                  {hasQualifiers && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(qualifiers)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[8px] px-1.5 py-0.5 bg-nexus-800/60 border border-nexus-700/30 rounded-full font-mono text-nexus-muted"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      {Object.keys(qualifiers).length > 3 && (
                        <span className="text-[8px] text-nexus-muted/40 font-mono">
                          +{Object.keys(qualifiers).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {timeState && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-amber-500 bg-amber-900/10 px-1.5 py-0.5 rounded">
                      <Calendar size={10} />
                      {timeState.effective_date.year}
                    </div>
                  )}
                  {!isReifiedLink && (
                    <button
                      onClick={() => onReifyLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-nexus-accent hover:text-white rounded text-nexus-muted transition-all"
                      title="Reify Link (Convert to Node)"
                    >
                      <Box size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* M2M Hub Memberships */}
        {m2mHubs.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-4 pb-2 px-1 border-t border-nexus-800/30 mt-4">
              <GitMerge size={12} className="text-amber-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                Hub Memberships ({m2mHubs.length})
              </h3>
            </div>
            {m2mHubs.map((hub) => {
              const hubData = hub as unknown as {
                global_verb: string;
                participants: { node_id: string; role_id: string; verb: string }[];
                title?: string;
              };
              const myRole = hubData.participants?.find((p) => p.node_id === nodeId);

              return (
                <div
                  key={hub.id}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-all"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <GitMerge size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-amber-500 uppercase">
                        {hubData.global_verb || 'hub'}
                      </span>
                      <span className="text-xs font-bold text-nexus-text truncate">
                        {hubData.title || hub.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {myRole && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-black text-amber-500 uppercase">
                          {myRole.role_id}
                        </span>
                      )}
                      <span className="text-[8px] text-nexus-muted font-mono">
                        {hubData.participants?.length || 0} participants
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
