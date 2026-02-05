import React, { useState } from 'react';
import { ScrollText, Plus, X, Edit3, Save, RotateCw, BookOpen } from 'lucide-react';
import { NexusObject, NexusType, NexusCategory, StoryType } from '../../../types';
import { generateId } from '../../../utils/ids';

interface AuthorsNotesWidgetProps {
    items: NexusObject[];
    onUpdate: (items: NexusObject[]) => void;
    onClose: () => void;
}

export const AuthorsNotesWidget: React.FC<AuthorsNotesWidgetProps> = ({ items, onUpdate, onClose }) => {
    const [showNewProtocol, setShowNewProtocol] = useState(false);
    const [newProtocolData, setNewProtocolData] = useState({ title: '', gist: '', targetId: 'book' });
    const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);

    const allAuthorNotes = items.filter(i => (i as any).is_author_note);
    const chapters = items.filter(i => (i as any).story_type === StoryType.CHAPTER);
    const bookNode = items.find(i => (i as any).story_type === StoryType.BOOK);

    const handleUpdateBeat = (id: string, updates: Partial<NexusObject>) => {
        onUpdate(items.map(item => item.id === id ? { ...item, ...updates, last_modified: new Date().toISOString() } : item) as any);
    };

    const handleAnchorProtocol = () => {
        if (!newProtocolData.title.trim()) return;
        const now = new Date().toISOString();
        const noteId = generateId();
        const newNote: any = { 
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
            total_subtree_mass: 0 
        };
        
        let nextItems: any[] = [...items, newNote];
        const actualTargetId = newProtocolData.targetId === 'book' ? bookNode?.id : newProtocolData.targetId;
        
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
                link_ids: [] 
            });
        }
        
        onUpdate(nextItems as any);
        setShowNewProtocol(false);
        setNewProtocolData({ title: '', gist: '', targetId: 'book' });
    };

    return (
        <div className="flex flex-col h-full bg-nexus-900 border-l border-nexus-800 shadow-2xl overflow-hidden font-sans">
            <header className="h-16 flex items-center px-8 border-b border-nexus-800 bg-amber-500/5 shrink-0">
                <ScrollText size={18} className="text-amber-500 mr-3" />
                <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-[0.3em]">Author's Notes</h3>
                <div className="flex-1" />
                <button 
                    onClick={() => setShowNewProtocol(true)} 
                    className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black transition-all"
                >
                    <Plus size={18} />
                </button>
                <button onClick={onClose} className="ml-2 p-1.5 text-nexus-muted hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
                {showNewProtocol && (
                    <div className="bg-nexus-950 border border-amber-500/50 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                         <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-display font-black text-amber-500 uppercase tracking-widest">Draft New Directive</span>
                            <button onClick={() => setShowNewProtocol(false)}><X size={14}/></button>
                         </div>
                         <div className="space-y-4">
                            <input 
                                autoFocus 
                                placeholder="Core Goal or Theme..." 
                                value={newProtocolData.title} 
                                onChange={(e) => setNewProtocolData({...newProtocolData, title: e.target.value})} 
                                className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text outline-none focus:border-amber-500" 
                            />
                            <select 
                                value={newProtocolData.targetId} 
                                onChange={(e) => setNewProtocolData({...newProtocolData, targetId: e.target.value})} 
                                className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text outline-none focus:border-amber-500 cursor-pointer"
                            >
                                <option value="book">Manuscript Context</option>
                                {chapters.map(ch => <option key={ch.id} value={ch.id}>Chapter: {(ch as any).title}</option>)}
                            </select>
                            <textarea 
                                placeholder="Record the authorial intent..." 
                                value={newProtocolData.gist} 
                                onChange={(e) => setNewProtocolData({...newProtocolData, gist: e.target.value})} 
                                className="w-full h-24 bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[11px] text-nexus-muted outline-none focus:border-amber-500 resize-none font-serif italic" 
                            />
                            <button 
                                onClick={handleAnchorProtocol}
                                className="w-full py-3 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 shadow-lg transition-all"
                            >
                                <Save size={14}/> Anchor Note
                            </button>
                         </div>
                    </div>
                )}

                <div className="space-y-6">
                    {allAuthorNotes.length === 0 && !showNewProtocol && (
                        <div className="py-20 text-center opacity-30 px-10">
                            <BookOpen size={32} className="mx-auto mb-4" />
                            <p className="text-[10px] font-display font-black uppercase tracking-widest">No Active Notes</p>
                            <p className="text-[9px] font-serif italic mt-2">Establish directives to maintain thematic mass.</p>
                        </div>
                    )}
                    {allAuthorNotes.map((note: any) => (
                        <div key={note.id} className="bg-nexus-950 border border-amber-500/20 rounded-[32px] p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
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
                                        <button onClick={() => setEditingProtocolId(null)} className="px-4 py-1.5 bg-amber-500 text-black rounded-lg text-[9px] font-black uppercase">Complete</button>
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                     <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">{note.title}</h4>
                                        <button 
                                            onClick={() => setEditingProtocolId(note.id)} 
                                            className="p-1.5 opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-amber-500 transition-all bg-nexus-900 border border-nexus-800 rounded-lg"
                                        >
                                            <Edit3 size={14}/>
                                        </button>
                                     </div>
                                     <p className="text-[12px] text-nexus-muted font-serif italic leading-relaxed text-nexus-text/80">"{note.gist}"</p>
                                 </>
                             )}
                        </div>
                    ))}
                </div>
            </div>
            
            <footer className="p-6 border-t border-nexus-800 bg-nexus-950/50 flex items-center gap-3 shrink-0">
                <RotateCw size={12} className="text-amber-500 opacity-40" />
                <span className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest font-bold">Protocol_Engine_v1.2</span>
            </footer>
        </div>
    );
};