import React from 'react';
import { NexusObject } from '../../types';
import { WikiRegistryView } from './components/WikiRegistryView';

// New Editor Components
import { useBacklinkIndex } from './hooks/useNexusGraph';
import { NexusEditorLayout } from './components/editor/NexusEditorLayout';
import { HierarchySidebar } from './components/editor/HierarchySidebar';
import { NexusProseEditor } from './components/editor/NexusProseEditor';
import { LinksManager } from './components/editor/LinksManager';
import { MetadataRail } from './components/editor/MetadataRail';

// Hooks
import { useWikiState } from './hooks/useWikiState';
import { useWikiActions } from './hooks/useWikiActions';
// Note: useWikiGeneration is available but not currently exposed in the simplified layout
// We can re-add it if we want generation buttons in the sidebar or header

interface WikiFeatureProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
  onAddObject?: (obj: NexusObject) => void;
}

import { RevisionSelector } from './components/editor/RevisionSelector';
import { StructuredNotePreview } from './components/StructuredNotePreview';
import { EncyclopediaView } from './components/EncyclopediaView';
import { useWikiGeneration } from './hooks/useWikiGeneration';

export const WikiFeature: React.FC<WikiFeatureProps> = ({
  registry,
  selectedId,
  onSelect,
  onUpdateObject,
  onAddObject,
}) => {
  // 1. State Management
  const {
    activeNode,
    identityNode,
    historyStack,
    handleBackToDirectory,
    handleSelect,
    setActiveSnapshotId,
  } = useWikiState({ registry, selectedId, onSelect });

  const [viewMode, setViewMode] = React.useState<'EDIT' | 'PREVIEW' | 'ENCYCLOPEDIA'>('EDIT');

  // 2. Indexes
  const backlinkIndex = useBacklinkIndex(registry);

  // 3. Actions
  const { handleAddChild, handleCreateSnapshot, handleReifyLink } = useWikiActions({
    currentObject: activeNode,
    identityNode,
    onAddObject,
    onUpdateObject,
    setActiveSnapshotId,
    registry,
  });

  // 4. Generation
  const { isGenerating, handleGenerateEncyclopedia, artifacts } = useWikiGeneration({
    registry,
    currentObject: activeNode,
    selectedId: activeNode?.id || null,
    onUpdateObject,
  });

  // --- RENDER ---

  // A. No Selection -> Registry View
  if (!selectedId || !activeNode || !identityNode) {
    return <WikiRegistryView registry={registry} onSelect={handleSelect} />;
  }

  // B. Selection -> Nexus Editor Layout
  const incomingLinks = backlinkIndex[activeNode.id] || [];
  const outgoingLinks = (activeNode.link_ids || [])
    .map((lid) => registry[lid])
    .filter((l) => l && 'source_id' in l && (l as any).source_id === activeNode.id); // Valid outgoing links

  const encyclopediaContent = activeNode.encyclopedia_content || artifacts[activeNode.id]?.content;

  return (
    <NexusEditorLayout
      title={activeNode.title}
      type={activeNode.category_id || 'UNKNOWN'}
      id={activeNode.id}
      viewMode={viewMode}
      onChangeViewMode={setViewMode}
      onBack={handleBackToDirectory}
      onGenerateEncyclopedia={handleGenerateEncyclopedia}
      hierarchySidebar={
        <HierarchySidebar
          currentNode={activeNode}
          registry={registry}
          incomingLinks={incomingLinks}
          onSelect={handleSelect}
          onAddChild={handleAddChild}
        />
      }
      mainEditor={
        <div className="flex flex-col h-full">
          {viewMode === 'EDIT' && (
            <>
              <div className="flex-1 min-h-0 border-b border-nexus-800/50">
                <NexusProseEditor
                  identityNode={identityNode}
                  activeNode={activeNode}
                  snapshots={historyStack}
                  registry={registry}
                  onSelectSnapshot={setActiveSnapshotId}
                  onUpdateProse={(newProse) =>
                    onUpdateObject(activeNode.id, { prose_content: newProse })
                  }
                />
              </div>
              <div className="h-1/3 flex-none min-h-[200px]">
                <LinksManager
                  nodeId={activeNode.id}
                  outgoingLinks={outgoingLinks}
                  registry={registry}
                  onCreateLink={() => {}}
                  onReifyLink={handleReifyLink}
                />
              </div>
            </>
          )}

          {viewMode === 'PREVIEW' && <StructuredNotePreview node={activeNode} />}

          {viewMode === 'ENCYCLOPEDIA' && (
            <EncyclopediaView
              node={activeNode}
              content={encyclopediaContent || ''}
              onGenerate={handleGenerateEncyclopedia}
              isGenerating={isGenerating}
            />
          )}
        </div>
      }
      metadataRail={
        <div className="flex flex-col h-full gap-4">
          {/* New Revision Selector anchored at top of rail */}
          <div className="max-h-[300px] flex-none border-b border-nexus-800/50 pb-4">
            <RevisionSelector
              identityNode={identityNode}
              snapshots={historyStack}
              activeNodeId={activeNode.id}
              onSelect={setActiveSnapshotId}
              className="w-full h-full border-none bg-transparent"
            />
          </div>

          {/* Standard Metadata Controls */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <MetadataRail
              node={activeNode}
              historyStack={[]} // Pass empty since we use RevisionSelector now
              onSelectSnapshot={setActiveSnapshotId}
              onUpdate={(updates) => onUpdateObject(activeNode.id, updates)}
              onCreateSnapshot={handleCreateSnapshot}
            />
          </div>
        </div>
      }
    />
  );
};
