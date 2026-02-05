
import React, { useState, useEffect, useCallback } from 'react';
import { 
    PenTool, 
    GitBranch, 
    FileText,
    Save,
    Download,
    Upload,
    Library as LibraryIcon,
    PanelRightOpen,
    PanelRightClose,
    SaveAll,
    ChevronRight,
    ChevronLeft,
    PanelLeftClose,
    PanelLeft,
    Sparkles,
    MessageSquare,
    BookOpen,
    ShieldCheck,
    ScrollText
} from 'lucide-react';
import { 
    NexusObject, 
    NexusType, 
    NexusCategory, 
    isLink, 
    isContainer,
    StoryType,
    StoryNote,
    ContainmentType,
    DefaultLayout,
    NarrativeStatus
} from '../../types';
import { generateId } from '../../utils/ids';
import { StudioBookends } from './components/StudioBookends';
import { StudioSpine } from './components/StudioSpine';
import { StudioStage } from './StoryStage';
import { LoreScryer } from './components/LoreScryer';
import { ManifestoChatbot } from './components/ManifestoChatbot';
import { AuthorsNotesWidget } from './components/AuthorsNotesWidget';
import { ManuscriptGallery } from './components/ManuscriptGallery';

export type BlockType = 'THESIS' | 'DELTA' | 'CONTEXT' | 'LATENT_UNIT' | 'ORACLE_PROMPT' | 'IMPORT_NODE' | 'LITERARY_APPROACH';

export interface StudioBlock {
    id: string;
    type: BlockType;
    data: any;
}

interface StoryStudioFeatureProps {
    onCommitBatch: (items: NexusObject[]) => void;
    registry: Record<string, NexusObject>;
}

export const StoryStudioFeature: React.FC<StoryStudioFeatureProps> = ({ onCommitBatch, registry }) => {
    const [stage, setStage] = useState<StudioStage>('MANIFESTO');
    const [blocks, setBlocks] = useState<StudioBlock[]>([]);
    const [studioItems, setStudioItems] = useState<NexusObject[]>([]);
    
    // UI State
    const [isGalleryOpen, setIsGalleryOpen] = useState(true);
    const [activeRightWidget, setActiveRightWidget] = useState<'CHAT' | 'LIBRARY' | 'NOTES' | null>(null);
    
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [zoomedChapterId, setZoomedChapterId] = useState<string | null>(null);
    const [zoomedSceneId, setZoomedSceneId] = useState<string | null>(null);
    const [isCompositeMode, setIsCompositeMode] = useState(false);
    const [isChapterManifestoMode, setIsChapterManifestoMode] = useState(false);

    const toggleRightWidget = (widget: 'CHAT' | 'LIBRARY' | 'NOTES') => {
        setActiveRightWidget(prev => prev === widget ? null : widget);
    };

    const handleExportManifesto = () => {
        const data = JSON.stringify(blocks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manifesto_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const handleImportManifesto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                setBlocks(imported);
            } catch (err) {
                alert("Invalid Manifesto format.");
            }
        };
        reader.readAsText(file);
    };

    const handleCreateNewBook = useCallback((initialBlocks?: StudioBlock[]) => {
        setActiveBookId(null);
        setBlocks(initialBlocks || []);
        setStudioItems([]);
        setStage('MANIFESTO');
        setZoomedChapterId(null);
        setZoomedSceneId(null);
        setIsCompositeMode(false);
        setIsChapterManifestoMode(false);
        
        if (initialBlocks && initialBlocks.length > 0) {
            const now = new Date().toISOString();
            const id = generateId();
            const newBook: StoryNote = {
                id,
                _type: NexusType.STORY_NOTE,
                story_type: StoryType.BOOK,
                title: "New Manuscript",
                gist: "Drafting in progress...",
                prose_content: "",
                category_id: NexusCategory.STORY,
                is_ghost: false,
                containment_type: ContainmentType.MANUSCRIPT,
                is_collapsed: false,
                default_layout: DefaultLayout.TREE,
                children_ids: [],
                sequence_index: 0,
                tension_level: 0,
                status: NarrativeStatus.VOID,
                internal_weight: 1.0,
                total_subtree_mass: 0,
                created_at: now,
                last_modified: now,
                link_ids: [],
                aliases: [],
                tags: ["draft"],
                manifesto_data: initialBlocks
            };
            onCommitBatch([newBook]);
            setActiveBookId(id);
        }
    }, [onCommitBatch]);

    const handleUpdateBlocks = (newBlocks: StudioBlock[]) => {
        setBlocks(newBlocks);
        if (newBlocks.length > 0 && !activeBookId) {
            const now = new Date().toISOString();
            const id = generateId();
            const newBook: StoryNote = {
                id,
                _type: NexusType.STORY_NOTE,
                story_type: StoryType.BOOK,
                title: "New Manuscript",
                gist: "Drafting in progress...",
                prose_content: "",
                category_id: NexusCategory.STORY,
                is_ghost: false,
                containment_type: ContainmentType.MANUSCRIPT,
                is_collapsed: false,
                default_layout: DefaultLayout.TREE,
                children_ids: [],
                sequence_index: 0,
                tension_level: 0,
                status: NarrativeStatus.VOID,
                internal_weight: 1.0,
                total_subtree_mass: 0,
                created_at: now,
                last_modified: now,
                link_ids: [],
                aliases: [],
                tags: ["draft"],
                manifesto_data: newBlocks
            };
            onCommitBatch([newBook]);
            setActiveBookId(id);
        }
    };

    const handleSaveManifestoProgress = () => {
        if (!activeBookId) {
            handleCreateNewBook(blocks);
            alert("Draft persisted as a new Manuscript node.");
        } else {
            const book = registry[activeBookId] as StoryNote;
            if (book) {
                const updatedBook = {
                    ...book,
                    manifesto_data: blocks,
                    last_modified: new Date().toISOString()
                };
                onCommitBatch([updatedBook]);
                alert("Protocol progress synced to manuscript memory.");
            }
        }
    };

    const handleLoadBook = (bookId: string) => {
        const book = registry[bookId] as StoryNote;
        if (!book) return;

        setActiveBookId(bookId);
        setZoomedChapterId(null);
        setZoomedSceneId(null);
        setIsCompositeMode(false);
        setIsChapterManifestoMode(false);

        if (book.manifesto_data && book.manifesto_data.length > 0) {
            setBlocks(book.manifesto_data);
        } else {
            setBlocks([]); 
        }

        const itemsToLoad = new Map<string, NexusObject>();
        itemsToLoad.set(book.id, book);
        const allRegistryItems = Object.values(registry) as NexusObject[];

        const findChildren = (parentId: string) => {
            allRegistryItems.forEach(item => {
                if (isLink(item) && item.source_id === parentId && item._type === NexusType.HIERARCHICAL_LINK) {
                    itemsToLoad.set(item.id, item);
                    const child = registry[item.target_id];
                    if (child && !itemsToLoad.has(child.id)) {
                        itemsToLoad.set(child.id, child);
                        if (isContainer(child)) findChildren(child.id);
                    }
                }
            });
        };

        findChildren(bookId);

        const activeNodeIds = Array.from(itemsToLoad.values())
            .filter(i => !isLink(i))
            .map(i => i.id);

        allRegistryItems.forEach(item => {
            if (isLink(item)) {
                const isSourceActive = activeNodeIds.includes(item.source_id);
                const isTargetActive = activeNodeIds.includes(item.target_id);

                if (isSourceActive || isTargetActive) {
                    const peerId = isSourceActive ? item.target_id : item.source_id;
                    const peer = registry[peerId];
                    if (peer && (peer as any).is_author_note) {
                        itemsToLoad.set(item.id, item);
                        itemsToLoad.set(peer.id, peer);
                    }
                }
            }
        });

        setStudioItems(Array.from(itemsToLoad.values()));
    };

    const handleCommitStudioBatch = (items: NexusObject[]) => {
        const bookNodeIdx = items.findIndex(i => (i as any).story_type === StoryType.BOOK);
        let finalItems = [...items];
        
        if (bookNodeIdx !== -1) {
            finalItems[bookNodeIdx] = {
                ...finalItems[bookNodeIdx],
                manifesto_data: blocks
            } as any;
        }

        onCommitBatch(finalItems);
        alert("Manuscript saved to Global Registry.");
    };

    const handleUnifiedSave = () => {
        if (stage === 'MANIFESTO') {
            handleSaveManifestoProgress();
        } else {
            handleCommitStudioBatch(studioItems);
        }
    };

    const isSaveEnabled = stage === 'MANIFESTO' ? blocks.length > 0 : studioItems.length > 0;
    const activeBook = activeBookId ? registry[activeBookId] as StoryNote : null;

    const isAtGlobalManifesto = stage === 'MANIFESTO';
    const isAtSpineRoot = stage === 'SPINE' && !zoomedChapterId && !zoomedSceneId;
    const isAtChapterScenes = stage === 'SPINE' && zoomedChapterId && !zoomedSceneId && !isChapterManifestoMode;
    const isAtChapterManifesto = stage === 'SPINE' && zoomedChapterId && isChapterManifestoMode;
    const isAtSceneWeaver = stage === 'SPINE' && (zoomedSceneId || isCompositeMode);

    return (
        <div className="flex flex-col h-full bg-nexus-950 font-sans text-nexus-text overflow-hidden relative">
            <header className="h-16 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-xl flex items-center px-8 justify-between shrink-0 z-50 shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                            className="p-2 text-nexus-muted hover:text-nexus-ruby transition-colors"
                        >
                            {isGalleryOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                        </button>
                        <div className="p-2 bg-nexus-ruby/10 rounded-xl border border-nexus-ruby/30 text-nexus-ruby">
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-display font-black text-nexus-text uppercase tracking-[0.3em] leading-tight">Story <span className="text-nexus-ruby">Studio</span></h2>
                            {activeBook && <p className="text-[9px] font-mono text-nexus-muted uppercase tracking-widest truncate max-w-[120px]">{activeBook.title}</p>}
                        </div>
                    </div>

                    <nav className="flex items-center bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner">
                        <StageButton 
                            active={isAtGlobalManifesto} 
                            label="Global Manifesto" 
                            icon={FileText} 
                            onClick={() => { setStage('MANIFESTO'); setZoomedChapterId(null); setZoomedSceneId(null); setIsCompositeMode(false); setIsChapterManifestoMode(false); }} 
                        />
                        <StageButton 
                            active={isAtSpineRoot || isAtChapterScenes || isAtChapterManifesto || isAtSceneWeaver} 
                            label={isAtSceneWeaver ? (isCompositeMode ? "Composite Weave" : "Scene Weaver") : isAtChapterManifesto ? "Chapter Manifesto" : isAtChapterScenes ? "Chapter Spine" : "Story Spine"}
                            icon={isAtSceneWeaver ? PenTool : isAtChapterManifesto ? FileText : GitBranch} 
                            onClick={() => setStage('SPINE')} 
                        />
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {stage === 'MANIFESTO' && (
                        <div className="flex gap-2 mr-4">
                            <button onClick={handleExportManifesto} className="p-2.5 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white"><Download size={18}/></button>
                            <label className="p-2.5 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white cursor-pointer"><Upload size={18}/><input type="file" className="hidden" onChange={handleImportManifesto} accept=".json" /></label>
                        </div>
                    )}

                    <button 
                        onClick={() => toggleRightWidget('CHAT')}
                        className={`p-2.5 rounded-xl border transition-all ${activeRightWidget === 'CHAT' ? 'bg-nexus-ruby text-white border-nexus-ruby shadow-lg' : 'bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-nexus-ruby'}`}
                        title="Manifesto Weaver AI"
                    >
                        <MessageSquare size={20} />
                    </button>

                    <button 
                        onClick={() => toggleRightWidget('LIBRARY')}
                        className={`p-2.5 rounded-xl border transition-all ${activeRightWidget === 'LIBRARY' ? 'bg-nexus-accent text-white border-nexus-accent shadow-lg' : 'bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-nexus-accent'}`}
                        title="World Bank Scryer"
                    >
                        <LibraryIcon size={20} />
                    </button>

                    <button 
                        onClick={() => toggleRightWidget('NOTES')}
                        className={`p-2.5 rounded-xl border transition-all ${activeRightWidget === 'NOTES' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-amber-500'}`}
                        title="Author's Notes"
                    >
                        <ScrollText size={20} />
                    </button>

                    <button 
                        onClick={handleUnifiedSave}
                        className={`px-6 py-2 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${isSaveEnabled ? 'bg-nexus-ruby text-white hover:brightness-110' : 'bg-nexus-800 text-nexus-muted border border-nexus-700 cursor-not-allowed'}`}
                        disabled={!isSaveEnabled}
                    >
                        <Save size={14} /> Save Manuscript
                    </button>
                </div>
            </header>

            <main className="flex-1 relative overflow-hidden flex">
                {isGalleryOpen && (
                    <ManuscriptGallery 
                        registry={registry} 
                        onLoadBook={handleLoadBook} 
                        onCreateNewBook={handleCreateNewBook}
                    />
                )}

                <div className="flex-1 h-full relative overflow-hidden">
                    {stage === 'MANIFESTO' ? (
                        <StudioBookends 
                            registry={registry} 
                            blocks={blocks}
                            onUpdateBlocks={handleUpdateBlocks}
                            onFinalize={(b) => { setBlocks(b); setStage('SPINE'); }} 
                            hasSpine={studioItems.length > 1}
                            onJumpToSpine={() => setStage('SPINE')}
                        />
                    ) : (
                        <StudioSpine 
                            items={studioItems} 
                            onUpdate={setStudioItems} 
                            registry={registry}
                            blocks={blocks}
                            onUpdateBlocks={handleUpdateBlocks}
                            onCommitBatch={handleCommitStudioBatch}
                            onBackToManifesto={() => setStage('MANIFESTO')}
                            zoomedChapterId={zoomedChapterId}
                            onSetZoomedChapterId={setZoomedChapterId}
                            zoomedSceneId={zoomedSceneId}
                            onSetZoomedSceneId={setZoomedSceneId}
                            isCompositeMode={isCompositeMode}
                            onSetCompositeMode={setIsCompositeMode}
                            isChapterManifestoMode={isChapterManifestoMode}
                            onSetChapterManifestoMode={setIsChapterManifestoMode}
                        />
                    )}
                </div>
                
                {/* Unified Right Sidebar Slots - Standardized 420px */}
                <div className={`flex shrink-0 h-full transition-all duration-500 ease-in-out border-l border-nexus-800 ${activeRightWidget ? 'w-[420px]' : 'w-0 overflow-hidden'}`}>
                    <div className="w-[420px] h-full bg-nexus-900 shadow-2xl flex flex-col relative">
                        {activeRightWidget === 'CHAT' && (
                            <ManifestoChatbot 
                                blocks={blocks} 
                                onUpdateBlocks={handleUpdateBlocks} 
                                registry={registry}
                                onClose={() => setActiveRightWidget(null)}
                            />
                        )}
                        {activeRightWidget === 'LIBRARY' && (
                            <LoreScryer registry={registry} isOpen={true} onClose={() => setActiveRightWidget(null)} inline />
                        )}
                        {activeRightWidget === 'NOTES' && (
                            <AuthorsNotesWidget 
                                items={studioItems} 
                                onUpdate={setStudioItems} 
                                onClose={() => setActiveRightWidget(null)}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const StageButton = ({ active, label, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-nexus-ruby text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
    >
        <Icon size={12} />
        {label}
    </button>
);
