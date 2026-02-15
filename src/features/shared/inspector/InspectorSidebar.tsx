import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NexusObject,
  isLink,
  NexusType,
  NexusNote,
  NexusLink,
  NexusCategory,
} from '../../../types';
import { InspectorHeader } from './components/InspectorHeader';
import { StructuralAudit } from './components/sections/StructuralAudit';
import { ReificationPromotion } from './components/sections/ReificationPromotion';
import { TemporalEraAudit } from './components/sections/TemporalEraAudit';
import { TemporalLineage } from './components/sections/TemporalLineage';
import { NeuralAbstract } from './components/sections/NeuralAbstract';
import { ManifestRecords } from './components/sections/ManifestRecords';
import { InspectorFooter } from './components/InspectorFooter';
import { Layout, GitBranch, History as HistoryIcon, X } from 'lucide-react';
import { getTimeState } from '../../../core/utils/nexus-accessors';
import { RegistryValidator } from '../../../core/utils/RegistryValidator';

interface InspectorSidebarProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onClose: () => void;
  onUpdate: (updates: Partial<NexusObject>) => void;
  onUpdateObject?: (id: string, updates: Partial<NexusObject>) => void;
  onOpenWiki?: (id: string) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** When true, renders as a flow-based column instead of a fixed overlay */
  embedded?: boolean;
}

type TabMode = 'OVERVIEW' | 'STRUCTURE' | 'HISTORY';

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  object,
  registry,
  onClose,
  onUpdate,
  onUpdateObject,
  onOpenWiki,
  onSelect,
  onDelete,
  embedded = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabMode>('OVERVIEW');

  const isL = isLink(object);
  const isStory = object._type === NexusType.STORY_NOTE;
  const title =
    ('title' in object ? (object as NexusNote).title : null) ||
    (isL && 'verb' in object ? (object as NexusLink).verb : 'Untitled');

  const handleCommit = () => {
    if (registry[object.id] && (object as NexusNote).prose_content) {
      navigate(`/wiki/${object.id}`);
    }
    onClose();
  };

  const rootClassName = embedded
    ? 'w-full h-full bg-nexus-950/40 backdrop-blur-3xl border-l border-nexus-800/50 flex flex-col overflow-hidden'
    : 'fixed top-0 right-0 w-[440px] h-full bg-nexus-950/40 backdrop-blur-3xl border-l border-nexus-800/50 shadow-[-40px_0_80px_rgba(0,0,0,0.6)] flex flex-col z-[1000] animate-in slide-in-from-right duration-500 ease-out overflow-hidden';

  const tabItems = [
    { id: 'OVERVIEW', label: 'Overview', icon: Layout },
    { id: 'STRUCTURE', label: 'Structure', icon: GitBranch },
    { id: 'HISTORY', label: 'History', icon: HistoryIcon },
  ];

  const activeNote = object as NexusNote;
  const isSnapshot = 'time_state' in object && object.time_state?.is_historical_snapshot;
  const isLocked = RegistryValidator.isDataLocked(object);

  const handleCategoryUpdate = (cat: NexusCategory) => {
    const result = RegistryValidator.validateCategoryChange(object, cat);
    if (!result.isValid) {
      alert(result.error);
      return;
    }
    onUpdate({ category_id: cat });
  };

  return (
    <div className={rootClassName}>
      <InspectorHeader object={object} onClose={onClose} onUpdate={onUpdate} />

      {/* Tab Switcher */}
      <div className="px-6 py-2 border-b border-nexus-800/30 bg-nexus-900/40 flex items-center gap-1 shrink-0">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabMode)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 group
                ${
                  isActive
                    ? 'bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]'
                    : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/40 border border-transparent'
                }
              `}
            >
              <Icon
                size={14}
                className={`${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Snapshot Warning */}
      {isSnapshot && (
        <div className="bg-nexus-ruby/10 border-b border-nexus-ruby/20 px-6 py-2 flex items-center justify-center gap-2">
          <HistoryIcon size={12} className="text-nexus-ruby animate-pulse" />
          <span className="text-[9px] uppercase font-black tracking-[0.3em] text-nexus-ruby">
            Immutable Historical Snapshot
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-12 pb-40">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            <NeuralAbstract object={object} onUpdate={onUpdate} />

            {/* Classification Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-accent">
                  <GitBranch size={14} />
                </div>
                <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
                  Classification
                </h3>
              </div>

              <div className="bg-nexus-900/40 border border-nexus-800/50 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase tracking-widest ml-1">
                    Category Registry
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(NexusCategory).map((cat) => (
                      <button
                        key={cat}
                        disabled={isLocked && activeNote.category_id !== cat}
                        onClick={() => handleCategoryUpdate(cat as NexusCategory)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                          activeNote.category_id === cat
                            ? 'bg-nexus-accent text-nexus-950 shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]'
                            : isLocked
                              ? 'opacity-20 cursor-not-allowed border-nexus-800'
                              : 'bg-nexus-800/50 text-nexus-muted hover:bg-nexus-800 hover:text-nexus-text'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase tracking-widest ml-1">
                    Lexicon Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 italic">
                    {activeNote.tags?.map((tag, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-2 px-3 py-1 bg-nexus-950 border border-nexus-800 rounded-full"
                      >
                        <span className="text-[10px] text-nexus-text/80">#{tag}</span>
                        <button
                          onClick={() =>
                            onUpdate({ tags: activeNote.tags.filter((t) => t !== tag) })
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-nexus-ruby" />
                        </button>
                      </div>
                    ))}
                    <button className="px-3 py-1 border border-dashed border-nexus-800 rounded-full text-[10px] text-nexus-muted hover:border-nexus-accent hover:text-nexus-accent transition-all">
                      + Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Archetype (Story Only) */}
            {isStory && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-nexus-ruby">
                  <Layout size={14} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">
                    Narrative Archetype
                  </h3>
                </div>

                <div className="bg-nexus-ruby/5 border border-nexus-ruby/20 rounded-2xl p-5 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase">
                        Status Gate
                      </label>
                      <div className="flex bg-nexus-950 p-1 rounded-xl border border-nexus-800/50">
                        {['VOID', 'OUTLINE', 'DRAFT', 'POLISHED'].map((s) => (
                          <button
                            key={s}
                            onClick={() => onUpdate({ status: s as any })}
                            className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all ${activeNote.status === s ? 'bg-nexus-ruby text-white shadow-lg shadow-nexus-ruby/20' : 'text-nexus-muted hover:text-nexus-text'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase">
                        Archetype
                      </label>
                      <select
                        value={activeNote.story_type || ''}
                        onChange={(e) => onUpdate({ story_type: e.target.value as any })}
                        className="w-full bg-nexus-950 border border-nexus-800/50 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-nexus-ruby outline-none"
                      >
                        <option value="BOOK">BOOK</option>
                        <option value="CHAPTER">CHAPTER</option>
                        <option value="SCENE">SCENE</option>
                        <option value="BEAT">BEAT</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dangerous Area */}
            {!isSnapshot && (
              <div className="pt-8 border-t border-nexus-800/20">
                <div className="bg-nexus-ruby/5 border border-nexus-ruby/10 rounded-2xl p-6 flex items-center justify-between group grayscale hover:grayscale-0 transition-all duration-500">
                  <div>
                    <h4 className="text-[10px] font-black text-nexus-ruby uppercase tracking-[0.2em]">
                      Dangerous Area
                    </h4>
                    <p className="text-[9px] text-nexus-muted uppercase mt-1">
                      Erase this identity from the Nexus
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete?.(object.id)}
                    className="px-6 py-2 bg-nexus-ruby/10 border border-nexus-ruby/20 rounded-xl text-[10px] font-black text-nexus-ruby uppercase tracking-widest hover:bg-nexus-ruby hover:text-white transition-all shadow-lg shadow-nexus-ruby/0 hover:shadow-nexus-ruby/20"
                  >
                    Redact
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'STRUCTURE' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both">
            <StructuralAudit
              object={object}
              registry={registry}
              onUpdate={onUpdate}
              onUpdateObject={onUpdateObject}
              isStory={isStory}
            />
            <ReificationPromotion object={object} onUpdate={onUpdate} />
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both">
            <TemporalEraAudit object={object} registry={registry} onUpdate={onUpdate} />
            <TemporalLineage
              object={object}
              registry={registry}
              onSelect={(id) => onSelect?.(id)}
            />
          </div>
        )}
      </div>

      <InspectorFooter
        onCommit={handleCommit}
        isWikiLink={!!(registry[object.id] && (object as NexusNote).prose_content)}
      />
    </div>
  );
};
