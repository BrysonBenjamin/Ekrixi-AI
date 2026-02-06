import React, { useState } from 'react';
import { NexusObject } from '../../types';
import { useStoryStudio } from './hooks/useStoryStudio';
import { StudioHeader } from './components/layout/StudioHeader';
import { StudioBookends } from './components/StudioBookends';
import { StudioSpine } from './components/StudioSpine';
import { LoreScryer } from './components/LoreScryer';
import { ManifestoChatbot } from './components/ManifestoChatbot';
import { AuthorsNotesWidget } from './components/AuthorsNotesWidget';
import { ManuscriptGallery } from './components/ManuscriptGallery';
import { RightWidgetMode } from './types';

interface StoryStudioFeatureProps {
  onCommitBatch: (items: NexusObject[]) => void;
  registry: Record<string, NexusObject>;
}

export const StoryStudioFeature: React.FC<StoryStudioFeatureProps> = ({
  onCommitBatch,
  registry,
}) => {
  const studio = useStoryStudio(registry, onCommitBatch);
  const [isGalleryOpen, setIsGalleryOpen] = useState(true);
  const [activeRightWidget, setActiveRightWidget] = useState<RightWidgetMode>(null);

  const toggleRightWidget = (widget: 'CHAT' | 'LIBRARY' | 'NOTES') => {
    setActiveRightWidget((prev) => (prev === widget ? null : widget));
  };

  const handleExportBlueprint = () => {
    const data = JSON.stringify(studio.blocks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportBlueprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        studio.setBlocks(imported);
      } catch (_err) {
        alert('Invalid Blueprint format.');
      }
    };
    reader.readAsText(file);
  };

  const spineContextLabel =
    studio.zoomedSceneId || studio.isCompositeMode
      ? studio.isCompositeMode
        ? 'Composite Weave'
        : 'Scene Chat'
      : studio.isChapterBlueprintMode
        ? 'Chapter Blueprint'
        : studio.zoomedChapterId
          ? 'Chapter Spine'
          : 'Story Spine';

  return (
    <div className="flex flex-col h-full bg-nexus-950 font-sans text-nexus-text overflow-hidden relative">
      <StudioHeader
        isGalleryOpen={isGalleryOpen}
        onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}
        activeBookTitle={studio.activeBook?.title}
        stage={studio.stage}
        onSetStage={studio.setStage}
        activeRightWidget={activeRightWidget}
        onToggleRightWidget={toggleRightWidget}
        onSave={studio.handleSave}
        isSaveEnabled={
          studio.stage === 'BLUEPRINT' ? studio.blocks.length > 0 : studio.studioItems.length > 0
        }
        onExportBlueprint={handleExportBlueprint}
        onImportBlueprint={handleImportBlueprint}
        spineContextLabel={spineContextLabel}
      />

      <main className="flex-1 relative overflow-hidden flex">
        {isGalleryOpen && (
          <ManuscriptGallery
            registry={registry}
            onLoadBook={studio.handleLoadBook}
            onCreateNewBook={studio.handleCreateNewBook}
          />
        )}

        <div className="flex-1 h-full relative overflow-hidden">
          {studio.stage === 'BLUEPRINT' ? (
            <StudioBookends
              registry={registry}
              blocks={studio.blocks}
              onUpdateBlocks={studio.setBlocks}
              onFinalize={(b) => {
                studio.setBlocks(b);
                studio.setStage('SPINE');
              }}
              hasSpine={studio.studioItems.length > 1}
              onJumpToSpine={() => studio.setStage('SPINE')}
            />
          ) : (
            <StudioSpine
              items={studio.studioItems}
              onUpdate={studio.setStudioItems}
              registry={registry}
              blocks={studio.blocks}
              onUpdateBlocks={studio.setBlocks}
              onCommitBatch={onCommitBatch}
              onBackToManifesto={() => studio.setStage('BLUEPRINT')}
              zoomedChapterId={studio.zoomedChapterId}
              onSetZoomedChapterId={studio.setZoomedChapterId}
              zoomedSceneId={studio.zoomedSceneId}
              onSetZoomedSceneId={studio.setZoomedSceneId}
              isCompositeMode={studio.isCompositeMode}
              onSetCompositeMode={studio.setIsCompositeMode}
              isChapterBlueprintMode={studio.isChapterBlueprintMode}
              onSetChapterBlueprintMode={studio.setIsChapterBlueprintMode}
            />
          )}
        </div>

        <div
          className={`flex shrink-0 h-full transition-all duration-500 ease-in-out border-l border-nexus-800 ${activeRightWidget ? 'w-[420px]' : 'w-0 overflow-hidden'}`}
        >
          <div className="w-[420px] h-full bg-nexus-900 shadow-2xl flex flex-col relative">
            {activeRightWidget === 'CHAT' && (
              <ManifestoChatbot
                blocks={studio.blocks}
                onUpdateBlocks={studio.setBlocks}
                registry={registry}
                onClose={() => setActiveRightWidget(null)}
              />
            )}
            {activeRightWidget === 'LIBRARY' && (
              <LoreScryer
                registry={registry}
                isOpen={true}
                onClose={() => setActiveRightWidget(null)}
                inline
              />
            )}
            {activeRightWidget === 'NOTES' && (
              <AuthorsNotesWidget
                items={studio.studioItems}
                onUpdate={studio.setStudioItems}
                onClose={() => setActiveRightWidget(null)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
