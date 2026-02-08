import React, { useMemo, useState, useRef } from 'react';
import {
  Settings2,
  GitBranch,
  Link2,
  Repeat,
  Save,
  Settings,
  ShieldCheck,
  AtSign,
  Plus,
  X,
  Tag,
} from 'lucide-react';
import {
  NexusObject,
  NexusCategory,
  NexusType,
  HierarchyType,
  isLink,
  isReified,
  SimpleNote,
} from '../../../types';
import { MarkdownToolbar } from '../../shared/MarkdownToolbar';
import { WikiEditData } from '../types';

interface WikiEditFormProps {
  node: NexusObject;
  editData: WikiEditData;
  setEditData: (data: WikiEditData) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  registry: Record<string, NexusObject>;
}

export const WikiEditForm: React.FC<WikiEditFormProps> = ({
  node,
  editData,
  setEditData,
  onSave,
  onCancel,
  registry,
}) => {
  const [aliasInput, setAliasInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [atMenu, setAtMenu] = useState<{
    query: string;
    pos: number;
    field: 'prose' | 'encyclopedia';
  } | null>(null);
  const sectionProseRef = useRef<HTMLTextAreaElement>(null);
  const sectionEncyclopediaRef = useRef<HTMLTextAreaElement>(null);

  const isStoryNode = node._type === NexusType.STORY_NOTE;
  const reified = isReified(node);
  const isLinkNode = isLink(node) && !reified;

  // Scry Detection
  const handleProseChange = (val: string, pos: number, field: 'prose' | 'encyclopedia') => {
    if (field === 'prose') {
      setEditData({ ...editData, prose_content: val });
    } else {
      setEditData({ ...editData, encyclopedia_content: val });
    }

    const beforeCursor = val.slice(0, pos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && !beforeCursor.slice(lastAt).includes(' ')) {
      setAtMenu({ query: beforeCursor.slice(lastAt + 1), pos, field });
    } else {
      setAtMenu(null);
    }
  };

  const scrySuggestions = useMemo(() => {
    if (!atMenu) return [];
    const q = atMenu.query.replace(/_/g, ' ').toLowerCase();
    const allItems = Object.values(registry) as NexusObject[];

    // Use a simplified depth calculation or heuristic since we don't have full graph traversal here easily
    // Or reconstruct a localized hierarchy map if needed. For now, simple title match.
    const filtered = allItems
      .filter((n) => !isLink(n) && (n as SimpleNote).title?.toLowerCase().includes(q))
      .slice(0, 15);

    return filtered;
  }, [atMenu, registry]);

  const insertMention = (title: string) => {
    if (!atMenu) return;
    const isProse = atMenu.field === 'prose';
    const text = isProse ? editData.prose_content || '' : editData.encyclopedia_content || '';
    const before = text.slice(0, atMenu.pos);
    const after = text.slice(atMenu.pos);
    const lastAt = before.lastIndexOf('@');
    const newText = before.slice(0, lastAt) + `[[${title}]]` + after;

    if (isProse) {
      setEditData({ ...editData, prose_content: newText });
    } else {
      setEditData({ ...editData, encyclopedia_content: newText });
    }

    setAtMenu(null);
    const ref = isProse ? sectionProseRef : sectionEncyclopediaRef;
    if (ref.current) ref.current.focus();
  };

  if (isLinkNode) {
    return (
      <div className="space-y-10 mb-16 animate-in zoom-in-95 duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Settings2 size={12} /> Logic Protocol
            </label>
            <select
              value={editData._type}
              onChange={(e) => setEditData({ ...editData, _type: e.target.value as NexusType })}
              className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
            >
              <option value={NexusType.SEMANTIC_LINK}>Semantic Association</option>
              <option value={NexusType.HIERARCHICAL_LINK}>Structural Hierarchy</option>
              <option value={NexusType.AGGREGATED_SEMANTIC_LINK}>Reified Association</option>
              <option value={NexusType.AGGREGATED_HIERARCHICAL_LINK}>Reified Hierarchy</option>
            </select>
          </div>
          {(editData._type === NexusType.HIERARCHICAL_LINK ||
            editData._type === NexusType.AGGREGATED_HIERARCHICAL_LINK) && (
            <div className="space-y-3">
              <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <GitBranch size={12} /> Hierarchy Type
              </label>
              <select
                value={editData.hierarchy_type}
                onChange={(e) =>
                  setEditData({ ...editData, hierarchy_type: e.target.value as HierarchyType })
                }
                className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-essence outline-none focus:border-nexus-essence transition-all shadow-inner"
              >
                <option value={HierarchyType.PARENT_OF}>Parent Of (A contains B)</option>
                <option value={HierarchyType.PART_OF}>Part Of (A is inside B)</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Link2 size={12} /> Active Verb
            </label>
            <input
              value={editData.verb || ''}
              onChange={(e) => setEditData({ ...editData, verb: e.target.value })}
              className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent shadow-inner"
              placeholder="Direct relationship..."
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Repeat size={12} /> Reciprocal Verb
            </label>
            <input
              value={editData.verb_inverse || ''}
              onChange={(e) => setEditData({ ...editData, verb_inverse: e.target.value })}
              className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-500 outline-none focus:border-nexus-accent shadow-inner"
              placeholder="Inverse relationship..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">
            Causal Logic Abstract
          </label>
          <textarea
            value={editData.gist || ''}
            onChange={(e) => setEditData({ ...editData, gist: e.target.value })}
            className="w-full bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 text-nexus-text text-base font-serif italic outline-none focus:border-nexus-accent shadow-inner h-32 resize-none"
            placeholder="Manifest the core logic of this stream..."
          />
        </div>

        <div className="space-y-4 relative">
          <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">
            Deep Records (Prose)
          </label>
          <div className="space-y-4 relative">
            <MarkdownToolbar
              textareaRef={sectionProseRef}
              content={editData.prose_content || ''}
              onUpdate={(val) =>
                handleProseChange(val, sectionProseRef.current?.selectionStart || 0, 'prose')
              }
            />
            <textarea
              ref={sectionProseRef}
              value={editData.prose_content || ''}
              onChange={(e) => handleProseChange(e.target.value, e.target.selectionStart, 'prose')}
              spellCheck={false}
              className="w-full bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 text-nexus-text text-sm font-mono outline-none focus:border-nexus-accent shadow-inner h-[400px] no-scrollbar leading-[1.8] tracking-tight selection:bg-nexus-accent/30"
              placeholder="# Document the nuances of this causality..."
            />
            {/* Mention UI */}
            {atMenu && scrySuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95 backdrop-blur-2xl">
                <div className="px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-nexus-accent uppercase tracking-widest">
                  Neural Scry
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                  {scrySuggestions.map((n) => {
                    const note = n as SimpleNote;
                    return (
                      <button
                        key={note.id}
                        onClick={() => insertMention(note.title)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-nexus-accent hover:text-white transition-all text-left group rounded-xl"
                      >
                        <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">
                          {note.category_id?.charAt(0)}
                        </div>
                        <div className="text-[10px] font-bold truncate">{note.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-nexus-800">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl text-[10px] font-display font-black text-nexus-muted hover:text-nexus-text transition-all uppercase tracking-widest"
          >
            Discard
          </button>
          <button
            onClick={() => onSave(node.id)}
            className="px-10 py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20 flex items-center gap-3"
          >
            <Save size={16} /> Commit Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-nexus-900 border border-nexus-700 rounded-[32px] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Settings size={120} className="animate-spin-slow" />
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
              Unit Name
            </label>
            <input
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-xl font-display font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner"
            />
          </div>
          {!reified && (
            <div className="space-y-2">
              <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
                Category Signature
              </label>
              <select
                value={editData.category_id}
                disabled={isStoryNode}
                onChange={(e) =>
                  setEditData({ ...editData, category_id: e.target.value as NexusCategory })
                }
                className={`w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner h-[60px] ${isStoryNode ? 'opacity-50 grayscale' : ''}`}
              >
                {Object.values(NexusCategory).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-4 p-6 bg-nexus-950/50 border border-nexus-800 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-amber-500" />
              <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
                Author Metadata Layer
              </span>
            </div>
            <button
              onClick={() => setEditData({ ...editData, is_author_note: !editData.is_author_note })}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${editData.is_author_note ? 'bg-amber-500 text-black' : 'bg-nexus-800 text-nexus-muted'}`}
            >
              {editData.is_author_note ? 'PROTOCOL ACTIVE' : 'MARK AS PROTOCOL'}
            </button>
          </div>
          <p className="text-[9px] text-nexus-muted italic font-serif leading-relaxed">
            Author protocols are reified narrative governed units that appear in the Story Studio as
            strategic anchors.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center gap-2">
            The Gist <span className="text-[8px] opacity-40 font-mono">(Brief Summary)</span>
          </label>
          <textarea
            value={editData.gist || ''}
            onChange={(e) => setEditData({ ...editData, gist: e.target.value })}
            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-serif italic text-nexus-text focus:border-nexus-accent outline-none resize-none h-24 shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-2 flex items-center gap-2">
              <AtSign size={12} className="text-nexus-arcane" /> Designations (AKA)
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = aliasInput.trim();
                    if (val && !editData.aliases.includes(val)) {
                      setEditData({ ...editData, aliases: [...editData.aliases, val] });
                    }
                    setAliasInput('');
                  }
                }}
                placeholder="Add nickname..."
                className="flex-1 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-2.5 text-xs text-nexus-text outline-none focus:border-nexus-arcane shadow-inner"
              />
              <button
                onClick={() => {
                  const val = aliasInput.trim();
                  if (val && !editData.aliases.includes(val)) {
                    setEditData({ ...editData, aliases: [...editData.aliases, val] });
                    setAliasInput('');
                  }
                }}
                className="p-2.5 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-arcane transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
              {editData.aliases?.map((a: string) => (
                <span
                  key={a}
                  className="flex items-center gap-2 px-3 py-1 bg-nexus-900 border border-nexus-800 rounded-lg text-[10px] font-bold text-nexus-arcane"
                >
                  {a}
                  <button
                    onClick={() =>
                      setEditData({
                        ...editData,
                        aliases: editData.aliases.filter((al: string) => al !== a),
                      })
                    }
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-2 flex items-center gap-2">
              <Tag size={12} className="text-nexus-essence" /> Semantic Markers
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = tagInput.trim();
                    if (val && !editData.tags.includes(val)) {
                      setEditData({ ...editData, tags: [...editData.tags, val] });
                    }
                    setTagInput('');
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-2.5 text-xs text-nexus-text outline-none focus:border-nexus-essence shadow-inner"
              />
              <button
                onClick={() => {
                  const val = tagInput.trim();
                  if (val && !editData.tags.includes(val)) {
                    setEditData({ ...editData, tags: [...editData.tags, val] });
                    setTagInput('');
                  }
                }}
                className="p-2.5 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-essence transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
              {editData.tags?.map((t: string) => (
                <span
                  key={t}
                  className="flex items-center gap-2 px-3 py-1 bg-nexus-900 border border-nexus-800 rounded-lg text-[10px] font-bold text-nexus-essence"
                >
                  #{t}
                  <button
                    onClick={() =>
                      setEditData({
                        ...editData,
                        tags: editData.tags.filter((ta: string) => ta !== t),
                      })
                    }
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 relative">
          <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
            Primary Records (Markdown)
          </label>
          <div className="space-y-3 relative">
            <MarkdownToolbar
              textareaRef={sectionProseRef}
              content={editData.prose_content || ''}
              onUpdate={(val) =>
                handleProseChange(val, sectionProseRef.current?.selectionStart || 0, 'prose')
              }
            />
            <textarea
              ref={sectionProseRef}
              value={editData.prose_content || ''}
              onChange={(e) => handleProseChange(e.target.value, e.target.selectionStart, 'prose')}
              spellCheck={false}
              className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-6 text-[13px] font-mono text-nexus-text focus:border-nexus-accent outline-none resize-none h-64 shadow-inner no-scrollbar leading-[1.8] tracking-tight selection:bg-nexus-accent/30"
              placeholder="# The history of this unit..."
            />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">
            Encyclopedia Records (Neural Synthesis)
          </label>
          <div className="space-y-3 relative">
            <MarkdownToolbar
              textareaRef={sectionEncyclopediaRef}
              content={editData.encyclopedia_content || ''}
              onUpdate={(val) =>
                handleProseChange(
                  val,
                  sectionEncyclopediaRef.current?.selectionStart || 0,
                  'encyclopedia',
                )
              }
            />
            <textarea
              ref={sectionEncyclopediaRef}
              value={editData.encyclopedia_content || ''}
              onChange={(e) =>
                handleProseChange(e.target.value, e.target.selectionStart, 'encyclopedia')
              }
              spellCheck={false}
              className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-6 text-[13px] font-mono text-nexus-text focus:border-nexus-accent outline-none resize-none h-64 shadow-inner no-scrollbar leading-[1.8] tracking-tight selection:bg-nexus-accent/30"
              placeholder="# Generated or manual encyclopedia content..."
            />
            {/* Mention UI */}
            {atMenu && scrySuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95 backdrop-blur-2xl">
                <div className="px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-nexus-accent uppercase tracking-widest">
                  Neural Scry
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                  {scrySuggestions.map((n) => {
                    const note = n as SimpleNote;
                    return (
                      <button
                        key={note.id}
                        onClick={() => insertMention(note.title)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-nexus-accent hover:text-white transition-all text-left group rounded-xl"
                      >
                        <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">
                          {note.category_id?.charAt(0)}
                        </div>
                        <div className="text-[10px] font-bold truncate">{note.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-nexus-800">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl text-[10px] font-display font-black text-nexus-muted hover:text-nexus-text transition-all uppercase tracking-widest"
          >
            Discard
          </button>
          <button
            onClick={() => onSave(node.id)}
            className="px-10 py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20 flex items-center gap-3"
          >
            <Save size={16} /> Commit Change
          </button>
        </div>
      </div>
    </div>
  );
};
