import React, { useState } from 'react';
import {
  ScrollText,
  Plus,
  X,
  Edit3,
  Save,
  RotateCw,
  BookOpen,
  Link2,
  Search,
  Tag,
} from 'lucide-react';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  StoryType,
  SimpleNote,
  StoryNote,
  SimpleLink,
} from '../../../../../types';
import { generateId } from '../../../../../utils/ids';

interface AuthorsNotesWidgetProps {
  items: NexusObject[];
  onUpdate: (items: NexusObject[]) => void;
  onClose: () => void;
  registry?: Record<string, NexusObject>; // Full registry for querying existing notes
  contextId?: string | null; // Current chapter/scene ID for contextual linking
}

export const AuthorsNotesWidget: React.FC<AuthorsNotesWidgetProps> = ({
  items,
  onUpdate,
  onClose,
  registry,
  contextId,
}) => {
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProtocolData, setNewProtocolData] = useState({ title: '', gist: '', targetId: 'book' });
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [managingLinksForNoteId, setManagingLinksForNoteId] = useState<string | null>(null);

  const allAuthorNotes = items.filter((i) => (i as SimpleNote).is_author_note);

  // Get all author's notes from the full registry (excluding ones already in items)
  const registryAuthorNotes = registry
    ? (Object.values(registry) as NexusObject[]).filter(
        (i) => (i as SimpleNote).is_author_note && !items.some((item) => item.id === i.id),
      )
    : [];

  const filteredRegistryNotes = registryAuthorNotes.filter((note) => {
    const n = note as SimpleNote;
    if (!searchQuery) return true;
    return (
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.gist?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const chapters = items
    .filter((i) => (i as StoryNote).story_type === StoryType.CHAPTER)
    .sort(
      (a, b) => ((a as StoryNote).sequence_index || 0) - ((b as StoryNote).sequence_index || 0),
    );
  const scenes = items.filter((i) => (i as StoryNote).story_type === StoryType.SCENE);
  const bookNode = items.find(
    (i) =>
      (i as StoryNote).story_type === StoryType.MANUSCRIPT ||
      (i as StoryNote).story_type === StoryType.BOOK,
  );

  // Helper to get linked chapters for a note
  const getLinkedChapters = (noteId: string) => {
    const links = items.filter(
      (i) =>
        i._type === NexusType.SEMANTIC_LINK && (i as unknown as SimpleLink).source_id === noteId,
    ) as unknown as SimpleLink[];
    return links
      .map((link) => chapters.find((ch) => ch.id === link.target_id))
      .filter(Boolean) as StoryNote[];
  };

  const handleUpdateBeat = (id: string, updates: Partial<NexusObject>) => {
    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, ...updates, last_modified: new Date().toISOString() } : item,
      ) as NexusObject[],
    );
  };

  const handleAnchorProtocol = () => {
    if (!newProtocolData.title.trim()) return;
    const now = new Date().toISOString();
    const noteId = generateId();
    const newNote = {
      id: noteId,
      _type: NexusType.SIMPLE_NOTE,
      title: newProtocolData.title,
      gist: newProtocolData.gist,
      category_id: NexusCategory.META,
      is_author_note: true,
      created_at: now,
      last_modified: now,
      link_ids: [],
      internal_weight: 1.0,
      total_subtree_mass: 0,
      aliases: [],
      tags: [],
      prose_content: '',
      is_ghost: false,
    } as SimpleNote;

    let nextItems: NexusObject[] = [...items, newNote];
    const actualTargetId =
      newProtocolData.targetId === 'book' ? bookNode?.id : newProtocolData.targetId;

    if (actualTargetId) {
      nextItems.push({
        id: generateId(),
        _type: NexusType.SEMANTIC_LINK,
        source_id: noteId,
        target_id: actualTargetId,
        verb: 'governs',
        verb_inverse: 'governed by',
        created_at: now,
        last_modified: now,
        link_ids: [],
        internal_weight: 0,
        total_subtree_mass: 0,
      } as unknown as SimpleLink);
    }

    onUpdate(nextItems);
    setShowNewProtocol(false);
    setNewProtocolData({ title: '', gist: '', targetId: 'book' });
  };

  const handleLinkExistingNote = (noteId: string) => {
    const now = new Date().toISOString();
    const targetId = contextId || bookNode?.id;

    if (!targetId) return;

    // Add the note to items if not already present
    const existingNote = registry?.[noteId];
    if (!existingNote) return;

    const noteAlreadyInItems = items.some((i) => i.id === noteId);
    let nextItems = noteAlreadyInItems ? [...items] : [...items, existingNote];

    // Create link to current context
    nextItems.push({
      id: generateId(),
      _type: NexusType.SEMANTIC_LINK,
      source_id: noteId,
      target_id: targetId,
      verb: 'governs',
      verb_inverse: 'governed by',
      created_at: now,
      last_modified: now,
      link_ids: [],
      internal_weight: 0,
      total_subtree_mass: 0,
    } as unknown as SimpleLink);

    onUpdate(nextItems);
  };

  const handleToggleChapterLink = (noteId: string, chapterId: string) => {
    const now = new Date().toISOString();
    const existingLink = items.find(
      (i) =>
        i._type === NexusType.SEMANTIC_LINK &&
        (i as unknown as SimpleLink).source_id === noteId &&
        (i as unknown as SimpleLink).target_id === chapterId,
    );

    if (existingLink) {
      // Remove the link
      onUpdate(items.filter((i) => i.id !== existingLink.id));
    } else {
      // Add the link
      const newLink: SimpleLink = {
        id: generateId(),
        _type: NexusType.SEMANTIC_LINK,
        source_id: noteId,
        target_id: chapterId,
        verb: 'governs',
        verb_inverse: 'governed by',
        created_at: now,
        last_modified: now,
        link_ids: [],
        internal_weight: 0,
        total_subtree_mass: 0,
      } as unknown as SimpleLink;
      onUpdate([...items, newLink]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-900 border-l border-nexus-800 shadow-2xl overflow-hidden font-sans">
      <header className="h-16 flex items-center px-8 border-b border-nexus-800 bg-amber-500/5 shrink-0">
        <ScrollText size={18} className="text-amber-500 mr-3" />
        <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-[0.3em]">
          Author's Notes
        </h3>
        <div className="flex-1" />
        {registry && (
          <button
            onClick={() => {
              setShowLinkExisting(!showLinkExisting);
              setShowNewProtocol(false);
            }}
            className={`p-2 rounded-lg transition-all mr-2 ${
              showLinkExisting
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white'
            }`}
            title="Link Existing Note"
          >
            <Link2 size={18} />
          </button>
        )}
        <button
          onClick={() => {
            setShowNewProtocol(true);
            setShowLinkExisting(false);
          }}
          className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black transition-all"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={onClose}
          className="ml-2 p-1.5 text-nexus-muted hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
        {showLinkExisting && registry && (
          <div className="bg-nexus-950 border border-blue-500/50 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-display font-black text-blue-500 uppercase tracking-widest">
                Link Existing Note
              </span>
              <button onClick={() => setShowLinkExisting(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-3 text-nexus-muted" />
              <input
                autoFocus
                placeholder="Search notes by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-nexus-900 border border-nexus-800 rounded-xl pl-10 pr-4 py-3 text-xs text-nexus-text outline-none focus:border-blue-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto no-scrollbar space-y-2">
              {filteredRegistryNotes.length === 0 ? (
                <p className="text-center text-[10px] text-nexus-muted italic py-8">
                  {searchQuery ? 'No matching notes found' : 'No existing notes available'}
                </p>
              ) : (
                filteredRegistryNotes.map((note) => {
                  const n = note as SimpleNote;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleLinkExistingNote(n.id)}
                      className="w-full text-left p-3 bg-nexus-900 border border-nexus-800 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
                    >
                      <div className="text-[10px] font-display font-black text-nexus-text uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">
                        {n.title}
                      </div>
                      <p className="text-[9px] text-nexus-muted italic line-clamp-2">{n.gist}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showNewProtocol && (
          <div className="bg-nexus-950 border border-amber-500/50 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-display font-black text-amber-500 uppercase tracking-widest">
                Draft New Directive
              </span>
              <button onClick={() => setShowNewProtocol(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                autoFocus
                placeholder="Core Goal or Theme..."
                value={newProtocolData.title}
                onChange={(e) => setNewProtocolData({ ...newProtocolData, title: e.target.value })}
                className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text outline-none focus:border-amber-500"
              />
              <select
                value={newProtocolData.targetId}
                onChange={(e) =>
                  setNewProtocolData({ ...newProtocolData, targetId: e.target.value })
                }
                className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="book">Manuscript Context</option>
                <optgroup label="Chapters" className="bg-nexus-950">
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {(ch as StoryNote).title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Scenes" className="bg-nexus-950">
                  {scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {(sc as StoryNote).title}
                    </option>
                  ))}
                </optgroup>
              </select>
              <textarea
                placeholder="Record the authorial intent..."
                value={newProtocolData.gist}
                onChange={(e) => setNewProtocolData({ ...newProtocolData, gist: e.target.value })}
                className="w-full h-24 bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[11px] text-nexus-muted outline-none focus:border-amber-500 resize-none font-serif italic"
              />
              <button
                onClick={handleAnchorProtocol}
                className="w-full py-3 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 shadow-lg transition-all"
              >
                <Save size={14} /> Anchor Note
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {allAuthorNotes.length === 0 && !showNewProtocol && (
            <div className="py-20 text-center opacity-30 px-10">
              <BookOpen size={32} className="mx-auto mb-4" />
              <p className="text-[10px] font-display font-black uppercase tracking-widest">
                No Active Notes
              </p>
              <p className="text-[9px] font-serif italic mt-2">
                Establish directives to maintain thematic mass.
              </p>
            </div>
          )}
          {allAuthorNotes.map((n) => {
            const note = n as SimpleNote;
            return (
              <div
                key={note.id}
                className="bg-nexus-950 border border-amber-500/20 rounded-[32px] p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all"
              >
                {editingProtocolId === note.id ? (
                  <div className="space-y-4">
                    <input
                      autoFocus
                      value={note.title}
                      onChange={(e) => handleUpdateBeat(note.id, { title: e.target.value })}
                      className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-2 text-xs font-bold text-nexus-text outline-none"
                    />
                    <textarea
                      value={note.gist}
                      onChange={(e) => handleUpdateBeat(note.id, { gist: e.target.value })}
                      className="w-full h-24 bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-2 text-[11px] text-nexus-muted outline-none resize-none font-serif italic"
                    />
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setEditingProtocolId(null)}
                        className="px-4 py-1.5 bg-amber-500 text-black rounded-lg text-[9px] font-black uppercase"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">
                        {note.title}
                      </h4>
                      <button
                        onClick={() => setEditingProtocolId(note.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-amber-500 transition-all bg-nexus-900 border border-nexus-800 rounded-lg"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <p className="text-[12px] text-nexus-muted font-serif italic leading-relaxed text-nexus-text/80">
                      "{note.gist}"
                    </p>

                    {/* Chapter Links Management */}
                    {managingLinksForNoteId === note.id && (
                      <div className="mt-4 pt-4 border-t border-amber-500/20 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[9px] font-display font-black text-amber-500 uppercase tracking-widest">
                            Linked Chapters
                          </span>
                          <button
                            onClick={() => setManagingLinksForNoteId(null)}
                            className="text-[8px] text-nexus-muted hover:text-white"
                          >
                            Done
                          </button>
                        </div>
                        <div className="space-y-2">
                          {chapters.length === 0 ? (
                            <p className="text-[9px] text-nexus-muted italic text-center py-2">
                              No chapters available
                            </p>
                          ) : (
                            chapters.map((ch) => {
                              const isLinked = getLinkedChapters(note.id).some(
                                (linked) => linked.id === ch.id,
                              );
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => handleToggleChapterLink(note.id, ch.id)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isLinked
                                      ? 'bg-amber-500 text-black'
                                      : 'bg-nexus-900 border border-nexus-800 text-nexus-muted hover:border-amber-500/50'
                                  }`}
                                >
                                  {(ch as StoryNote).title}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show linked chapters summary when not managing */}
                    {managingLinksForNoteId !== note.id &&
                      (() => {
                        const linkedChapters = getLinkedChapters(note.id);
                        return linkedChapters.length > 0 ? (
                          <div className="mt-4 pt-4 border-t border-amber-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag size={10} className="text-amber-500/50" />
                              <span className="text-[8px] font-mono text-amber-500/50 uppercase tracking-widest">
                                Linked to {linkedChapters.length} chapter
                                {linkedChapters.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {linkedChapters.map((ch) => (
                                <span
                                  key={ch.id}
                                  className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[8px] font-bold text-amber-500 uppercase tracking-wider"
                                >
                                  {ch.title}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => setManagingLinksForNoteId(note.id)}
                              className="mt-2 text-[8px] text-amber-500/70 hover:text-amber-500 uppercase tracking-widest font-bold"
                            >
                              Manage Links →
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setManagingLinksForNoteId(note.id)}
                            className="mt-4 pt-4 border-t border-amber-500/10 w-full text-[8px] text-amber-500/50 hover:text-amber-500 uppercase tracking-widest font-bold text-left"
                          >
                            + Link to Chapters
                          </button>
                        );
                      })()}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="p-6 border-t border-nexus-800 bg-nexus-950/50 flex items-center gap-3 shrink-0">
        <RotateCw size={12} className="text-amber-500 opacity-40" />
        <span className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest font-bold">
          Protocol_Engine_v1.2
        </span>
      </footer>
    </div>
  );
};
