import React from 'react';
import {
  Activity,
  Plus,
  ArrowLeft,
  Download,
  Upload,
  ShieldAlert,
  ChevronLeft,
  RotateCw,
} from 'lucide-react';

import { NexusObject, StoryNote } from '../../../../types';

import { StudioBlock } from '../../types';
import { StudioWeaver } from './StudioWeaver';
import { SpineManifestation } from './SpineManifestation';
import { ChapterList } from './ChapterList';
import { useStudioSpineLogic } from './useStudioSpineLogic';
import { AuditModal } from './AuditModal';

interface StudioSpineProps {
  items: NexusObject[];
  onUpdate: (items: NexusObject[]) => void;
  registry: Record<string, NexusObject>;
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  onCommitBatch: (items: NexusObject[]) => void;
  onDeleteBatch: (ids: string[]) => void;
  onBackToManifesto?: () => void;
  zoomedChapterId: string | null;
  onSetZoomedChapterId: (id: string | null) => void;
  zoomedSceneId: string | null;
  onSetZoomedSceneId: (id: string | null) => void;
  isCompositeMode: boolean;
  onSetCompositeMode: (val: boolean) => void;
  isChapterBlueprintMode: boolean;
  onSetChapterBlueprintMode: (val: boolean) => void;
  isSaving?: boolean;
}

export const StudioSpine: React.FC<StudioSpineProps> = ({
  items,
  onUpdate,
  registry,
  blocks,
  onUpdateBlocks,
  onCommitBatch,
  onDeleteBatch,
  onBackToManifesto,
  zoomedChapterId,
  onSetZoomedChapterId,
  zoomedSceneId,
  onSetZoomedSceneId,
  isCompositeMode,
  onSetCompositeMode,
  isChapterBlueprintMode,
  onSetChapterBlueprintMode,
  isSaving,
}) => {
  const logic = useStudioSpineLogic(
    items,
    onUpdate,
    registry,
    blocks,
    onUpdateBlocks,
    onCommitBatch,
    onDeleteBatch,
    onBackToManifesto,
    zoomedChapterId,
    onSetZoomedChapterId,
    onSetZoomedSceneId,
    onSetChapterBlueprintMode,
  );

  const [isRegenerating, setIsRegenerating] = React.useState(false);

  if (zoomedSceneId || isCompositeMode) {
    return (
      <StudioWeaver
        activeId={zoomedSceneId || zoomedChapterId}
        isChapterMode={isCompositeMode}
        studioItems={items}
        onUpdate={onUpdate}
        worldRegistry={registry}
        onSetZoomedSceneId={onSetZoomedSceneId}
        onSetCompositeMode={onSetCompositeMode}
        blocks={blocks}
        onUpdateBlocks={onUpdateBlocks}
      />
    );
  }

  if ((logic.chapters.length === 0 || isRegenerating) && !logic.isSynthesizing) {
    return (
      <SpineManifestation
        blocks={blocks}
        handleManifestFromBlueprint={() => {
          logic.handleManifestFromBlueprint();
          setIsRegenerating(false);
        }}
        onBackToManifesto={onBackToManifesto}
        handleSmartSpineGeneration={logic.handleSmartSpineGeneration}
        registry={registry}
        isRegeneration={logic.chapters.length > 0}
        onCancel={() => setIsRegenerating(false)}
      />
    );
  }

  if (logic.isSynthesizing) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8 bg-nexus-950 p-20">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-nexus-ruby/10 border-t-nexus-ruby animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-nexus-ruby animate-pulse" size={40} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-display font-black text-nexus-text uppercase tracking-widest">
            Neural Synthesis Active
          </h3>
          <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-[0.4em]">
            {logic.synthStatus}
          </p>
        </div>
      </div>
    );
  }

  if (zoomedChapterId) {
    const zoomedNode = items.find((i) => i.id === zoomedChapterId) as StoryNote;
    return (
      <div className="h-full flex flex-col bg-nexus-950 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
        <header className="h-20 flex items-center justify-between px-10 border-b border-nexus-800 bg-nexus-900/20 shrink-0">
          <div className="flex items-center gap-4 min-w-0 overflow-hidden">
            <button
              onClick={() => {
                onSetZoomedChapterId(null);
                onSetChapterBlueprintMode(false);
              }}
              className="p-2 bg-nexus-900 border border-nexus-800 rounded-xl text-nexus-muted hover:text-nexus-ruby mr-2 shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-display font-black text-nexus-text tracking-tighter uppercase truncate">
                {isChapterBlueprintMode ? 'Chapter Blueprint' : 'Scene Directory'}
              </h2>
              <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest truncate">
                BEAT_FOCUS: {zoomedNode?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isChapterBlueprintMode && (
              <div className="flex gap-1.5 mr-2">
                <button
                  onClick={() => logic.handleExportChapterBlueprint(zoomedChapterId)}
                  className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white"
                  title="Export Chapter Blueprint"
                >
                  <Download size={14} />
                </button>
                <label
                  className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white cursor-pointer"
                  title="Import Chapter Blueprint"
                >
                  <Upload size={14} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => logic.handleImportChapterBlueprint(e, zoomedChapterId)}
                    accept=".json"
                  />
                </label>
              </div>
            )}
            <button
              onClick={() => logic.handleAddScene(zoomedChapterId)}
              className="flex items-center gap-2 px-4 py-1.5 border hover:text-white transition-all rounded-full text-[9px] font-black uppercase tracking-widest bg-nexus-arcane/10 border-nexus-arcane/30 text-nexus-arcane hover:bg-nexus-arcane"
            >
              <Plus size={14} /> Append Scene
            </button>
          </div>
        </header>

        <ChapterList
          items={items}
          zoomedChapterId={zoomedChapterId}
          onSetZoomedChapterId={onSetZoomedChapterId}
          onSetZoomedSceneId={onSetZoomedSceneId}
          onUpdate={onUpdate}
          isChapterBlueprintMode={isChapterBlueprintMode}
          onSetChapterBlueprintMode={onSetChapterBlueprintMode}
          blocks={blocks}
          onUpdateBlocks={onUpdateBlocks}
          handleSynthesizeScenesForChapter={logic.handleSynthesizeScenesForChapter}
          registry={registry}
          handleAddScene={logic.handleAddScene}
          currentList={logic.scenesForZoomedChapter}
          handleMoveBeat={logic.handleMoveBeat}
          editingId={logic.editingId}
          setEditingId={logic.setEditingId}
          handleUpdateBeat={logic.handleUpdateBeat}
          handleAutoFillMetadata={logic.handleAutoFillMetadata}
          isAutoFilling={logic.isAutoFilling}
          autoFillPrompt={logic.autoFillPrompt}
          setAutoFillPrompt={logic.setAutoFillPrompt}
          handleDeleteBeat={logic.handleDeleteBeat}
          handleNeuralFill={logic.handleNeuralFill}
          isFillingId={logic.isFillingId}
          zoomedNode={zoomedNode}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-nexus-950 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
      <header className="h-20 flex items-center justify-between px-10 border-b border-nexus-800 bg-nexus-900/20 shrink-0">
        <div className="flex items-center gap-4 min-w-0 overflow-hidden">
          <div className="p-2 bg-nexus-ruby/10 rounded-xl text-nexus-ruby border border-nexus-ruby/20 shrink-0">
            <Activity size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-display font-black text-nexus-text tracking-tighter uppercase truncate">
              Nodic <span className="text-nexus-ruby">History</span>
            </h2>
            <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest truncate">
              Structural Chapters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onBackToManifesto}
            className="flex items-center gap-2 px-4 py-1.5 bg-nexus-900 border border-nexus-800 text-nexus-muted rounded-full text-[9px] font-black uppercase tracking-widest hover:text-nexus-ruby transition-all mr-2 group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />{' '}
            Global Blueprint
          </button>

          <button
            onClick={() => setIsRegenerating(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-nexus-ruby/10 border border-nexus-ruby/30 text-nexus-ruby rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-nexus-ruby hover:text-white transition-all mr-2"
          >
            <RotateCw size={14} /> Regenerate Spine
          </button>

          <button
            onClick={logic.handleRunAudit}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
          >
            <ShieldAlert size={14} /> Audit
          </button>

          <button
            onClick={logic.handleAddManualBeat}
            className="flex items-center gap-2 px-4 py-1.5 border hover:text-white transition-all rounded-full text-[9px] font-black uppercase tracking-widest bg-nexus-950 border border-nexus-800 hover:border-nexus-ruby text-nexus-text"
          >
            <Plus size={14} /> Append Chapter
          </button>
        </div>
      </header>

      <ChapterList
        items={items}
        zoomedChapterId={null}
        onSetZoomedChapterId={onSetZoomedChapterId}
        onSetZoomedSceneId={onSetZoomedSceneId}
        onUpdate={onUpdate}
        isChapterBlueprintMode={false}
        onSetChapterBlueprintMode={onSetChapterBlueprintMode}
        blocks={blocks}
        onUpdateBlocks={onUpdateBlocks}
        handleSynthesizeScenesForChapter={logic.handleSynthesizeScenesForChapter}
        registry={registry}
        handleAddScene={logic.handleAddScene}
        currentList={logic.chapters}
        handleMoveBeat={logic.handleMoveBeat}
        editingId={logic.editingId}
        setEditingId={logic.setEditingId}
        handleUpdateBeat={logic.handleUpdateBeat}
        handleAutoFillMetadata={logic.handleAutoFillMetadata}
        isAutoFilling={logic.isAutoFilling}
        autoFillPrompt={logic.autoFillPrompt}
        setAutoFillPrompt={logic.setAutoFillPrompt}
        handleDeleteBeat={logic.handleDeleteBeat}
        handleNeuralFill={logic.handleNeuralFill}
        isFillingId={logic.isFillingId}
        zoomedNode={null}
        isSaving={isSaving}
      />

      <AuditModal
        show={logic.showAudit}
        onClose={() => logic.setShowAudit(false)}
        isAuditing={logic.isAuditing}
        auditResult={logic.auditResult}
      />
    </div>
  );
};
