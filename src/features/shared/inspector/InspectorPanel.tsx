import React from 'react';
import { NexusObject } from '../../../types';
import { InspectorSidebar } from './InspectorSidebar';

interface InspectorPanelProps {
  isOpen: boolean;
  selectedObject: NexusObject | null;
  registry: Record<string, NexusObject>;
  onUpdate: (updates: Partial<NexusObject>) => void;
  onUpdateObject?: (id: string, updates: Partial<NexusObject>) => void;
  onClose: () => void;
  onOpenWiki?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isOpen,
  selectedObject,
  registry,
  onUpdate,
  onUpdateObject,
  onClose,
  onOpenWiki,
  onSelect,
}) => {
  return (
    <div
      className={`
        fixed inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] bg-nexus-900 md:border-l border-nexus-800 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[500]
        transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${isOpen && selectedObject ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
      `}
    >
      {selectedObject && (
        <InspectorSidebar
          object={selectedObject}
          registry={registry}
          onUpdate={onUpdate}
          onUpdateObject={onUpdateObject}
          onClose={onClose}
          onOpenWiki={onOpenWiki}
          onSelect={onSelect}
        />
      )}
    </div>
  );
};
