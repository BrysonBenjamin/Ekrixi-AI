import React, { useRef } from 'react';
import { NexusObject } from '../../../types';

interface UseSystemPersistenceProps {
  registry: Record<string, NexusObject>;
  onImport: (data: Record<string, NexusObject>) => void;
}

export const useSystemPersistence = ({ registry, onImport }: UseSystemPersistenceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(registry, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `nexus_export_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const imported = JSON.parse(content);
          if (typeof imported === 'object' && imported !== null) {
            onImport(imported);
          } else {
            alert('Invalid JSON structure');
          }
        } catch (error) {
          console.error(error);
          alert('Failed to parse JSON file');
        }
      }
    };
    reader.readAsText(fileObj);
    event.target.value = '';
  };

  return {
    fileInputRef,
    handleExport,
    handleImportClick,
    handleFileChange,
  };
};
