import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Compass,
  ArrowLeft,
  Sparkles,
  History,
  Layers,
  Database,
  Activity,
  Eye,
  Zap,
  Link2,
  CheckCircle,
  X,
  RotateCw,
  Maximize2,
  Minimize2,
  BookOpen,
  ScrollText,
  ShieldCheck,
  Quote,
  LayoutTemplate,
  Focus,
  MousePointer2,
  Wand2,
} from 'lucide-react';
import {
  NexusObject,
  isLink,
  isContainer,
  NexusType,
  NexusCategory,
  StoryType,
} from '../../../types';
import { LocalizedWorldWiki } from './LocalizedWorldWiki';
import { WeaverChatAssistant } from './WeaverChatAssistant';

interface StudioWeaverProps {
  activeId: string | null;
  isChapterMode?: boolean;
  studioItems: NexusObject[];
  onUpdate: (items: NexusObject[]) => void;
  worldRegistry: Record<string, NexusObject>;
  onSetZoomedSceneId: (id: string | null) => void;
  onSetCompositeMode: (val: boolean) => void;
}

export const StudioWeaver: React.FC<StudioWeaverProps> = ({
  activeId,
  isChapterMode,
  studioItems,
  onUpdate,
  worldRegistry,
  onSetZoomedSceneId,
  onSetCompositeMode,
}) => {
  const [scannedMentions, setScannedMentions] = useState<Set<string>>(new Set());
  const [showContext, setShowContext] = useState(true);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Resolve context for switching
  const focusedNode = studioItems.find((i) => i.id === activeId) as any;
  const parentChapterId = useMemo(() => {
    if (isChapterMode) return activeId;
    // Fix: Use any cast to handle source_id/target_id access on NexusObject union in find callback
    const link = studioItems.find(
      (l) =>
        isLink(l) &&
        (l as any).target_id === activeId &&
        (studioItems.find((p) => p.id === (l as any).source_id) as any)?.story_type ===
          StoryType.CHAPTER,
    );
    return link ? (link as any).source_id : null;
  }, [studioItems, activeId, isChapterMode]);

  const scenesInChapter = useMemo(() => {
    const chId = parentChapterId;
    if (!chId) return [];
    return studioItems
      .filter(
        (i) =>
          (i as any).story_type === StoryType.SCENE &&
          studioItems.some((l) => isLink(l) && l.source_id === chId && l.target_id === i.id),
      )
      .sort((a, b) => ((a as any).sequence_index || 0) - ((b as any).sequence_index || 0));
  }, [studioItems, parentChapterId]);

  const activeNotes = useMemo(() => {
    if (!parentChapterId) return [];
    return studioItems.filter((i) => {
      if (!(i as any).is_author_note) return false;
      return studioItems.some(
        (l) => isLink(l) && l.source_id === i.id && l.target_id === parentChapterId,
      );
    });
  }, [studioItems, parentChapterId]);

  const handleTextChange = useCallback(
    (val: string, sceneId?: string) => {
      const targetId = sceneId || activeId;
      const nextItems = studioItems.map((item) =>
        item.id === targetId
          ? { ...item, prose_content: val, last_modified: new Date().toISOString() }
          : item,
      );
      onUpdate(nextItems as NexusObject[]);

      // Search Mentions - Still useful for sidebars
      const mentions = new Set<string>();
      const wikiRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = wikiRegex.exec(val)) !== null) {
        const title = match[1].trim().toLowerCase();
        const worldNode = (Object.values(worldRegistry) as NexusObject[]).find(
          (n) => !isLink(n) && (n as any).title?.toLowerCase() === title,
        );
        if (worldNode) mentions.add(worldNode.id);
      }
      setScannedMentions((prev) => new Set([...Array.from(prev), ...Array.from(mentions)]));
    },
    [studioItems, activeId, worldRegistry, onUpdate],
  );

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const selText = selection?.toString().trim();
    if (selText && selText.length > 3) {
      setSelectionMenu({
        x: e.clientX,
        y: e.clientY - 60,
        text: selText,
      });
    } else {
      setSelectionMenu(null);
    }
  };

  const handlePushSelectionToAssistant = () => {
    if (selectionMenu) {
      setSelectedText(selectionMenu.text);
      setShowContext(true);
      setSelectionMenu(null);
    }
  };

  const handleToggleContext = (mode: 'SCENE' | 'CHAPTER') => {
    if (mode === 'CHAPTER' && !isChapterMode) {
      onSetCompositeMode(true);
      onSetZoomedSceneId(null);
    } else if (mode === 'SCENE' && isChapterMode) {
      const firstScene = scenesInChapter[0];
      onSetCompositeMode(false);
      if (firstScene) onSetZoomedSceneId(firstScene.id);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-nexus-950 overflow-hidden animate-in zoom-in-95 duration-500">
      {/* Selection Search Tooltip */}
      {selectionMenu && (
        <div
          className="fixed z-[1000] bg-nexus-accent border border-nexus-accent/50 rounded-2xl p-1 shadow-2xl flex items-center gap-1 animate-in zoom-in-95 duration-200"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
        >
          <button
            onClick={handlePushSelectionToAssistant}
            className="px-4 py-2 bg-nexus-950 text-white hover:bg-nexus-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Sparkles size={14} className="text-nexus-accent animate-pulse" />
            Search Selection
          </button>
          <div className="w-px h-6 bg-nexus-800/40" />
          <button
            onClick={() => setSelectionMenu(null)}
            className="p-2 hover:bg-nexus-900 text-white/50 hover:text-white rounded-xl"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Left: Writing Area */}
      <div
        className={`flex-1 flex flex-col border-r border-nexus-800 transition-all duration-700 ${showContext ? 'md:w-3/5' : 'md:w-full'}`}
      >
        <header className="h-16 border-b border-nexus-800 bg-nexus-900/30 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-lg ${isChapterMode ? 'bg-nexus-arcane/10 text-nexus-arcane' : 'bg-nexus-ruby/10 text-nexus-ruby'}`}
              >
                {isChapterMode ? <Layers size={16} /> : <Focus size={16} />}
              </div>
              <h3 className="text-xs font-display font-black text-nexus-text uppercase tracking-widest truncate max-w-[200px]">
                {isChapterMode ? `Chapter Weave: ${focusedNode?.title}` : focusedNode?.title}
              </h3>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner scale-90 origin-left">
              <button
                onClick={() => handleToggleContext('SCENE')}
                className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isChapterMode ? 'bg-nexus-ruby text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
              >
                <PenTool size={10} /> Scene Focus
              </button>
              <button
                onClick={() => handleToggleContext('CHAPTER')}
                className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isChapterMode ? 'bg-nexus-arcane text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
              >
                <Layers size={10} /> Chapter Stack
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedText && (
              <div className="animate-in slide-in-from-right-4 flex items-center gap-2 px-3 py-1 bg-nexus-essence/10 border border-nexus-essence/30 rounded-full text-nexus-essence text-[9px] font-black uppercase tracking-widest">
                <Quote size={10} /> Search Selection Active
              </div>
            )}
            <button
              onClick={() => setShowContext(!showContext)}
              className={`p-2 rounded-xl transition-all ${showContext ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20' : 'text-nexus-muted hover:text-nexus-text'}`}
              title="Context Chat"
            >
              <Compass size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 lg:p-12 relative bg-nexus-950">
          <div className="max-w-4xl mx-auto pb-40">
            {isChapterMode ? (
              <div className="space-y-0">
                {scenesInChapter.map((scene: any, idx: number) => (
                  <div
                    key={scene.id}
                    className="group/weave relative pb-20 animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Scene Boundary Label */}
                    <div className="flex items-center gap-4 mb-10">
                      <div className="h-px flex-1 bg-nexus-800 group-hover/weave:bg-nexus-arcane/40 transition-colors" />
                      <div className="flex flex-col items-center gap-1 shrink-0 px-4">
                        <span className="text-[8px] font-mono font-black text-nexus-muted uppercase tracking-[0.4em] group-hover/weave:text-nexus-arcane transition-colors">
                          SCENE_{String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest opacity-40 group-hover/weave:opacity-100 transition-all">
                          {scene.title}
                        </h4>
                      </div>
                      <div className="h-px flex-1 bg-nexus-800 group-hover/weave:bg-nexus-arcane/40 transition-colors" />

                      {/* Quick Switch Button */}
                      <button
                        onClick={() => {
                          onSetCompositeMode(false);
                          onSetZoomedSceneId(scene.id);
                        }}
                        className="absolute right-0 top-[-8px] opacity-0 group-hover/weave:opacity-100 p-2 bg-nexus-900 border border-nexus-800 rounded-xl text-nexus-muted hover:text-nexus-ruby transition-all hover:scale-110"
                        title="Focus this Scene"
                      >
                        <Focus size={14} />
                      </button>
                    </div>

                    <textarea
                      value={scene.prose_content || ''}
                      onMouseUp={handleMouseUp}
                      onChange={(e) => handleTextChange(e.target.value, scene.id)}
                      placeholder="Weave this sequence..."
                      spellCheck={false}
                      className="w-full h-auto min-h-[300px] bg-transparent border-none outline-none resize-none font-serif text-xl leading-[1.8] text-nexus-text selection:bg-nexus-accent/20 placeholder:text-nexus-muted/10 overflow-hidden"
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const el = e.target as HTMLTextAreaElement;
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-8 h-full animate-in fade-in duration-500">
                <textarea
                  ref={editorRef}
                  value={focusedNode?.prose_content || ''}
                  onMouseUp={handleMouseUp}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Manifest the search..."
                  spellCheck={false}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none font-serif text-2xl leading-[1.8] text-nexus-text selection:bg-nexus-accent/20 placeholder:text-nexus-muted/20 no-scrollbar"
                />
              </div>
            )}
          </div>
        </div>

        <footer className="h-12 border-t border-nexus-800 bg-nexus-900 flex items-center px-6 justify-between shrink-0 z-10">
          <div className="flex items-center gap-6 text-[9px] font-mono text-nexus-muted uppercase tracking-widest font-bold">
            <span className="flex items-center gap-2">
              <LayoutTemplate size={12} className="text-nexus-arcane" />{' '}
              {isChapterMode ? 'COMPOSITE_RAW' : 'FOCUSED_RAW'}
            </span>
            <span>{focusedNode?.prose_content?.length || 0} symbols manifest</span>
            <span>{scannedMentions.size} world syncs active</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-nexus-essence animate-pulse" />
              <span className="text-[9px] font-black text-nexus-essence uppercase tracking-widest">
                Neural Stability: Optimal
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Right Context Sidebar */}
      {showContext && (
        <div className="md:w-2/5 flex flex-col bg-nexus-900 relative border-l border-nexus-800 animate-in slide-in-from-right-8 duration-700">
          <ContextTabs
            registry={localizedRegistry(studioItems, worldRegistry, scannedMentions)}
            mentions={scannedMentions}
            notes={activeNotes}
            chapter={focusedNode}
            isChapterMode={isChapterMode}
            onUpdate={onUpdate}
            studioItems={studioItems}
            selectedText={selectedText}
            onClearSelection={() => setSelectedText('')}
          />
        </div>
      )}
    </div>
  );
};

const ContextTabs = ({
  chapter,
  isChapterMode,
  registry,
  mentions,
  notes,
  onUpdate,
  studioItems,
  selectedText,
  onClearSelection,
}: any) => {
  const [activeTab, setActiveTab] = useState<'WIKI' | 'CHAT' | 'NOTES'>('CHAT');

  return (
    <div className="flex flex-col h-full">
      <nav className="h-14 border-b border-nexus-800 flex items-center px-4 gap-2 shrink-0 bg-nexus-950/40">
        <TabButton
          active={activeTab === 'CHAT'}
          icon={Sparkles}
          label="Assistant"
          onClick={() => setActiveTab('CHAT')}
        />
        <TabButton
          active={activeTab === 'WIKI'}
          icon={Database}
          label="World Bank"
          onClick={() => setActiveTab('WIKI')}
        />
        <TabButton
          active={activeTab === 'NOTES'}
          icon={ScrollText}
          label="Notes"
          onClick={() => setActiveTab('NOTES')}
        />
      </nav>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'WIKI' && <LocalizedWorldWiki registry={registry} mentions={mentions} />}
        {activeTab === 'CHAT' && (
          <WeaverChatAssistant
            chapter={chapter}
            isChapterMode={isChapterMode}
            notes={notes}
            studioItems={studioItems}
            onUpdate={onUpdate}
            worldRegistry={registry}
            selection={selectedText}
            onClearSelection={onClearSelection}
          />
        )}
        {activeTab === 'NOTES' && (
          <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2 opacity-50">
              <ShieldCheck size={16} className="text-amber-500" />
              <span className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
                Active Directives
              </span>
            </div>
            {notes.length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <ScrollText size={32} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  No Directives Resolved
                </p>
              </div>
            ) : (
              notes.map((note: any) => (
                <div
                  key={note.id}
                  className="p-5 bg-nexus-950 border border-amber-500/20 rounded-2xl shadow-sm hover:border-amber-500 transition-all group"
                >
                  <h4 className="text-[11px] font-display font-black text-nexus-text uppercase tracking-wider mb-2">
                    {note.title}
                  </h4>
                  <p className="text-[10px] text-nexus-muted font-serif italic leading-relaxed">
                    "{note.gist}"
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-display font-black uppercase tracking-widest transition-all ${active ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/40'}`}
  >
    <Icon size={14} /> {label}
  </button>
);

const localizedRegistry = (
  studioItems: any[],
  worldRegistry: any,
  scannedMentions: Set<string>,
) => {
  const reg: Record<string, NexusObject> = {};
  studioItems.forEach((i) => (reg[i.id] = i));
  scannedMentions.forEach((id) => {
    const node = worldRegistry[id];
    if (node) reg[id] = node;
  });
  Object.values(worldRegistry).forEach((l: any) => {
    if (isLink(l) && reg[l.source_id] && reg[l.target_id]) reg[l.id] = l;
  });
  return reg;
};
