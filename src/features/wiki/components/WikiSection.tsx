import React from 'react';
import {
  ArrowRight,
  Compass,
  Pencil,
  ShieldCheck,
  AtSign,
  Tag,
  Save,
  Link2,
  Layers,
} from 'lucide-react';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  isLink,
  isContainer,
  isReified,
  isStrictHierarchy,
} from '../../../types';
import { WikiEditForm } from './WikiEditForm';
import { NexusMarkdown } from '../../../components/shared/NexusMarkdown';

interface WikiSectionProps {
  node: NexusObject;
  depth: number;
  visited: Set<string>;
  registry: Record<string, NexusObject>;
  editingNodeId: string | null;
  editData: any;
  currentObject: NexusObject; // The root object being viewed
  onSelect: (id: string) => void;
  handleStartEdit: (node: NexusObject) => void;
  handleSaveEdit: (id: string) => void;
  setEditData: (data: any) => void;
  setEditingNodeId: (id: string | null) => void;
}

export const WikiSection: React.FC<WikiSectionProps> = ({
  node,
  depth,
  visited,
  registry,
  editingNodeId,
  editData,
  currentObject,
  onSelect,
  handleStartEdit,
  handleSaveEdit,
  setEditData,
  setEditingNodeId,
}) => {
  // Prevent infinite recursion
  if (depth > 2 || visited.has(node.id)) return null;

  // Create new Set for children to avoid mutating props (Strict Mode fix)
  const nextVisited = new Set(visited);
  nextVisited.add(node.id);

  const isLinkNode = isLink(node);
  const reified = isReified(node);
  const isEditingThis = editingNodeId === node.id;
  const isStoryNode = node._type === NexusType.STORY_NOTE;

  // SECTION 1: LINK RENDERING
  if (isLinkNode && !reified) {
    // Special rendering for pure links
    const link = node as any;
    const source = registry[link.source_id];
    const target = registry[link.target_id];
    const isHierarchical = isStrictHierarchy(link);

    return (
      <section id={`section-${link.id}`} className="mb-20 animate-in fade-in duration-700">
        <div className="flex items-center justify-between mb-12 border-b border-nexus-800/30 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-nexus-arcane/10 rounded-2xl border border-nexus-arcane/30 text-nexus-arcane">
              <Link2 size={24} />
            </div>
            <div>
              <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.4em]">
                Neural Logic Manifest
              </h2>
              <p className="text-[10px] font-mono text-nexus-muted/40 uppercase tracking-widest mt-1">
                PROTOCOL: {link._type}
              </p>
            </div>
          </div>
          <button
            onClick={() => (isEditingThis ? handleSaveEdit(link.id) : handleStartEdit(link))}
            className={`px-6 py-2.5 rounded-2xl transition-all border font-display font-black text-[10px] uppercase tracking-widest flex items-center gap-3 ${isEditingThis ? 'bg-nexus-essence text-white border-nexus-essence shadow-lg' : 'bg-nexus-800/30 border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white'}`}
          >
            {isEditingThis ? (
              <>
                <Save size={14} /> Commit Changes
              </>
            ) : (
              <>
                <Pencil size={14} /> Refine Records
              </>
            )}
          </button>
        </div>

        {isEditingThis ? (
          <WikiEditForm
            node={node}
            editData={editData}
            setEditData={setEditData}
            onSave={handleSaveEdit}
            onCancel={() => setEditingNodeId(null)}
            registry={registry}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-16">
              <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] text-center shadow-xl group hover:border-nexus-accent transition-all">
                <span className="text-[9px] font-black uppercase text-nexus-muted tracking-widest block mb-4 opacity-50">
                  Origin Node
                </span>
                <div className="text-xl font-display font-bold text-nexus-text truncate px-4">
                  {(source as any)?.title || 'Uncharted'}
                </div>
                <button
                  onClick={() => onSelect(link.source_id)}
                  className="mt-6 text-[9px] font-black text-nexus-accent hover:underline uppercase tracking-widest"
                >
                  Focus origin scry
                </button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-nexus-accent/30 to-transparent relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-nexus-950 border border-nexus-800 rounded-full shadow-2xl flex items-center gap-2">
                    {isHierarchical ? (
                      <Layers size={14} className="text-nexus-essence" />
                    ) : (
                      <Link2 size={14} className="text-nexus-accent" />
                    )}
                    <span className="text-nexus-accent font-display font-black text-xs uppercase tracking-[0.2em]">
                      {link.verb}
                    </span>
                  </div>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-nexus-muted/20 to-transparent relative mt-2">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-nexus-950 border border-nexus-800 rounded-full shadow-lg">
                    <span className="text-nexus-muted font-display font-black text-[10px] uppercase tracking-[0.1em] opacity-40">
                      {link.verb_inverse}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] text-center shadow-xl group hover:border-nexus-accent transition-all">
                <span className="text-[9px] font-black uppercase text-nexus-muted tracking-widest block mb-4 opacity-50">
                  Terminal Node
                </span>
                <div className="text-xl font-display font-bold text-nexus-text truncate px-4">
                  {(target as any)?.title || 'Uncharted'}
                </div>
                <button
                  onClick={() => onSelect(link.target_id)}
                  className="mt-6 text-[9px] font-black text-nexus-accent hover:underline uppercase tracking-widest"
                >
                  Focus terminal scry
                </button>
              </div>
            </div>

            <div className="space-y-16">
              <div className="space-y-4">
                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">
                  Causal Logic Abstract
                </label>
                <div className="bg-nexus-900/40 border border-nexus-800/50 rounded-[32px] p-10 backdrop-blur-sm">
                  <p className="text-xl md:text-2xl font-serif italic text-nexus-text/90 leading-relaxed">
                    "{link.gist || 'This connection has not yet been structurally abstracted.'}"
                  </p>
                </div>
              </div>

              <div className="space-y-4 relative">
                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">
                  Deep Records (Prose)
                </label>
                <div className="wiki-content p-4">
                  <NexusMarkdown
                    content={link.prose_content || ''}
                    registry={registry}
                    onLinkClick={onSelect}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  // SECTION 2: NORMAL NODE RENDERING (and Reified Links)
  const children = isContainer(node)
    ? node.children_ids
        .map((id: string) => registry[id])
        .filter((child: any) => !!child && (!isLink(child) || isReified(child))) // Recursively render non-link children (or reified ones)
    : [];

  // Determine theme color inheritance
  const themeColor = (node as any).theme_color || (currentObject as any)?.theme_color;

  return (
    <section
      key={node.id}
      id={`section-${node.id}`}
      className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 scroll-mt-32 group/section"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-nexus-800/30 pb-4">
          <div className="flex items-center gap-4">
            <span
              className="px-3 py-1 border rounded-full text-[9px] font-display font-black uppercase tracking-widest"
              style={{
                borderColor: isStoryNode
                  ? 'rgba(225,29,72,0.5)'
                  : `${themeColor || 'var(--nexus-500)'}50`,
                backgroundColor: isStoryNode
                  ? 'rgba(225,29,72,0.15)'
                  : `${themeColor || 'var(--nexus-500)'}15`,
                color: isStoryNode ? '#e11d48' : themeColor || 'var(--accent-color)',
              }}
            >
              {isStoryNode
                ? 'STORY UNIT'
                : reified
                  ? 'REIFIED LOGIC'
                  : node.category_id || 'CONCEPT'}
            </span>
            {reified && (
              <div className="flex items-center gap-2 text-[8px] font-mono text-nexus-muted uppercase tracking-widest opacity-60">
                {(registry[node.source_id] as any)?.title} <ArrowRight size={8} />{' '}
                {(registry[node.target_id] as any)?.title}
              </div>
            )}
            {node.is_author_note && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-[9px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} /> Author Protocol
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-40 group-hover/section:opacity-100 transition-all">
            <button
              onClick={() => handleStartEdit(node)}
              className={`p-2.5 rounded-xl transition-all border ${isEditingThis ? 'bg-nexus-accent text-white border-nexus-accent shadow-lg' : 'bg-nexus-800/30 border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white hover:border-nexus-accent'}`}
              title="Edit Unit Records"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onSelect(node.id)}
              className="p-2.5 rounded-xl bg-nexus-800/30 border border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white hover:border-nexus-accent transition-all"
              title="Set as Scrying Focus"
            >
              <Compass size={14} />
            </button>
          </div>
        </div>

        {isEditingThis ? (
          <WikiEditForm
            node={node}
            editData={editData}
            setEditData={setEditData}
            onSave={handleSaveEdit}
            onCancel={() => setEditingNodeId(null)}
            registry={registry}
          />
        ) : (
          <div className="space-y-10">
            <div>
              {depth === 0 ? (
                <h1 className="text-5xl md:text-7xl font-display font-black text-nexus-text tracking-tighter mb-4 leading-tight uppercase">
                  {(node as any).title || (node as any).verb}
                </h1>
              ) : (
                <h2 className="text-3xl md:text-4xl font-display font-bold text-nexus-text tracking-tight mb-4 uppercase">
                  {(node as any).title || (node as any).verb}
                </h2>
              )}

              <div
                className="relative pl-6 md:pl-10 border-l-4 py-1 mb-8"
                style={{
                  borderColor: isStoryNode ? '#e11d48' : themeColor || 'var(--accent-color)',
                }}
              >
                <p className="text-xl md:text-2xl text-nexus-text/80 font-serif italic leading-relaxed">
                  "{node.gist || 'This manifestation remains uncharted.'}"
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-10">
                {(node as any).aliases &&
                  (node as any).aliases.length > 0 &&
                  (node as any).aliases.map((a: string) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm"
                    >
                      <AtSign size={10} className="text-nexus-accent" /> {a}
                    </span>
                  ))}
                {(node as any).tags &&
                  (node as any).tags.length > 0 &&
                  (node as any).tags.map((t: string) => (
                    <span
                      key={t}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm"
                    >
                      <Tag size={10} className="text-nexus-essence" /> {t}
                    </span>
                  ))}
              </div>

              <div className="wiki-content max-w-4xl">
                <NexusMarkdown
                  content={(node as any).prose_content || ''}
                  color={isStoryNode ? '#e11d48' : themeColor}
                  registry={registry}
                  onLinkClick={onSelect}
                />
              </div>
            </div>

            {children.length > 0 && (
              <div className="pt-16 border-t border-nexus-800/30 ml-4 lg:ml-12">
                {children.map((child: any) => (
                  <WikiSection
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    visited={nextVisited}
                    registry={registry}
                    editingNodeId={editingNodeId}
                    editData={editData}
                    currentObject={currentObject}
                    onSelect={onSelect}
                    handleStartEdit={handleStartEdit}
                    handleSaveEdit={handleSaveEdit}
                    setEditData={setEditData}
                    setEditingNodeId={setEditingNodeId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
