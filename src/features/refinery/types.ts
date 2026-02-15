import type { NexusObject } from '../../types';

export interface RefineryBatch {
  id: string;
  name: string;
  timestamp: string;
  items: NexusObject[];
  status: 'pending' | 'processed' | 'committed';
  source: 'SCANNER' | 'IMPORT' | 'GENERATOR';
}

export type ViewMode = 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export interface RefineryFeatureProps {
  batches: RefineryBatch[];
  onUpdateBatch: (batchId: string, items: NexusObject[]) => void;
  _onDeleteBatch: (id: string) => void;
  onCommitBatch: (batchId: string, items: NexusObject[]) => void;
}
