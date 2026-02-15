import React, { useState, useEffect } from 'react';
import { Database, BrainCircuit } from 'lucide-react';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  isLink,
  HierarchyType,
  ConflictStatus,
  isBinaryLink,
  isM2M,
  Participant,
  NexusLink,
} from '../../types';
import { GraphIntegrityService } from '../integrity/GraphIntegrityService';
import { GraphOperations } from '../../core/services/GraphOperations';
import { generateId } from '../../utils/ids';
import { useMCPScanner } from './hooks/useMCPScanner';
import { MCPStatusBadge } from '../shared/MCPStatusBadge';
import { ScannerHeader } from './components/ScannerHeader';
import { ScannerInput } from './components/ScannerInput';
import { ScannerProcessing } from './components/ScannerProcessing';
import { ScannerReview } from './components/ScannerReview';
import { PreprocessorAgent } from './components/PreprocessorAgent';

interface ScannerFeatureProps {
  onCommitBatch: (batch: NexusObject[]) => void;
  registry?: Record<string, NexusObject>;
  initialText?: string;
  onClearPendingText?: () => void;
}

export type ScanStage = 'INPUT' | 'PREPROCESS' | 'PROCESSING' | 'REVIEW';

export interface EntitySeed {
  id: string;
  title: string;
  aliases: string[];
  gist: string;
  category: NexusCategory;
  isManual: boolean;
  isAuthorNote: boolean;
  timeData?: {
    baseId: string;
    year: number;
    baseTitle: string;
  };
  suggestedChildren: Array<{
    title: string;
    category: NexusCategory;
    gist: string;
    isAuthorNote: boolean;
  }>;
}

export type ExtractedItem = NexusObject & {
  conflict?: {
    status: ConflictStatus;
    reason?: string;
    suggestion?: string;
    existingPath?: string[];
  };
};

interface ArchitectLink {
  source: string;
  target: string;
  verb: string;
  type: 'HIERARCHICAL' | 'SEMANTIC';
  verb_inverse?: string;
}

interface ArchitectUpdate {
  title: string;
  gist: string;
  records: string;
}

interface ArchitectResponse {
  links: ArchitectLink[];
  updates: ArchitectUpdate[];
}

export const ScannerFeature: React.FC<ScannerFeatureProps> = ({
  onCommitBatch,
  registry = {},
  initialText = '',
  onClearPendingText,
}) => {
  const { scanText, state: mcpState } = useMCPScanner();
  const [stage, setStage] = useState<ScanStage>('INPUT');
  const [statusMsg, setStatusMsg] = useState('Initializing Agents...');
  const [inputText, setInputText] = useState(initialText);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialText) {
      queueMicrotask(() => {
        setInputText(initialText);
      });
      onClearPendingText?.();
    }
  }, [initialText, onClearPendingText]);

  const handleStartPreprocess = async () => {
    if (!inputText.trim()) return;
    setStage('PREPROCESS');
  };

  const handleInitiateScan = async (seeds: EntitySeed[]) => {
    setStage('PROCESSING');
    setError(null);

    try {
      setStatusMsg('MCP Pipeline: Extracting entities and relationships...');

      // Use MCP scanText with anchored mode — seeds become anchors
      const result = await scanText(inputText, {
        anchors: seeds.map((s) => ({
          title: s.title,
          aliases: s.aliases,
          category: s.category,
          gist: s.gist,
        })),
        registry,
      });

      if (!result) {
        throw new Error('MCP scan returned no result');
      }

      setStatusMsg('Building graph from batch...');

      // The MCP pipeline returns a batch_id with all operations.
      // We need to retrieve the batch objects and convert them to ExtractedItems.
      // For the sidecar prototype, we can read directly from the batch store.
      const { getMCPScannerClient } = await import('../../core/services/MCPScannerClient');
      const client = getMCPScannerClient();
      const batchObjects = client.getBatchObjects(result.batch_id);

      // Convert batch objects to ExtractedItems with integrity analysis
      const tempRegistry: Record<string, NexusObject> = { ...registry };
      const finalBatch: ExtractedItem[] = [];

      for (const obj of batchObjects) {
        tempRegistry[obj.id] = obj;

        if (isLink(obj)) {
          if (isM2M(obj)) {
            // M2M hubs bypass standard binary integrity checks for now
            // They represent complex multi-party relations which are generally deliberate
            finalBatch.push({ ...obj, conflict: { status: 'APPROVED' } } as ExtractedItem);
          } else if (isBinaryLink(obj)) {
            // Run integrity analysis on binary links
            const link = obj as NexusLink;
            const integrity = GraphIntegrityService.analyzeLinkIntegrity(
              link.source_id,
              link.target_id,
              tempRegistry,
              link._type,
            );
            finalBatch.push({ ...obj, conflict: integrity } as ExtractedItem);
          }
        } else {
          finalBatch.push(obj as ExtractedItem);
        }
      }

      // Apply time data from seeds — in schema v2, time links are HIERARCHICAL_LINKs with time_state
      for (const seed of seeds) {
        if (seed.timeData) {
          const timeLink = GraphOperations.createHierarchicalLink(
            tempRegistry,
            seed.timeData.baseId,
            seed.id,
            'has_state',
            'state_of',
            HierarchyType.PARENT_OF,
            {
              is_historical_snapshot: true,
              effective_date: { year: seed.timeData.year },
              parent_identity_id: seed.timeData.baseId,
            },
          );

          if (timeLink) {
            finalBatch.push(timeLink as unknown as ExtractedItem);
          }
        }
      }

      setExtractedItems(finalBatch);
      setStage('REVIEW');
    } catch (err) {
      console.error('Scanner Processing Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Extraction Pipeline Interrupted.';
      setError(errorMessage);
      setStage('INPUT');
    }
  };

  const handleCommitReview = (items: NexusObject[]) => {
    // Ensure that any existing nodes modified by GraphOperations are also saved?
    // Currently, GraphOperations mutates registry in place.
    // If we commit items, we expect them to be added.
    // Existing nodes with updated link_ids must also be saved.
    // Strategy: We can't easily detect here which *existing* nodes were modified without tracking.
    // For now, we rely on the fact that Scanner usually creates NEW content.
    // Reified links from anomalies are handled separately.
    onCommitBatch(items);
    setStage('INPUT');
    setExtractedItems([]);
  };

  return (
    <div className="flex flex-col h-full bg-nexus-950 font-sans">
      <ScannerHeader
        stage={stage}
        onReset={() => {
          setStage('INPUT');
          setError(null);
        }}
      />
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {stage === 'INPUT' && (
          <div className="max-w-6xl mx-auto p-4 md:p-8 h-full">
            <ScannerInput
              value={inputText}
              onChange={setInputText}
              onScan={handleStartPreprocess}
              error={error}
            />
          </div>
        )}
        {stage === 'PREPROCESS' && (
          <div className="h-full flex flex-col">
            <PreprocessorAgent
              text={inputText}
              registry={registry}
              onFinalize={handleInitiateScan}
              onCancel={() => setStage('INPUT')}
            />
          </div>
        )}
        {stage === 'PROCESSING' && <ScannerProcessing customStatus={statusMsg} />}
        {stage === 'REVIEW' && (
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <ScannerReview
              items={extractedItems}
              onUpdate={setExtractedItems}
              onCommit={handleCommitReview}
              onCancel={() => setStage('INPUT')}
            />
          </div>
        )}
      </main>
      <footer className="h-10 border-t border-nexus-800 bg-nexus-900 flex items-center px-4 md:px-6 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-mono text-nexus-muted tracking-widest uppercase">
          <span className="flex items-center gap-1.5">
            <Database size={12} className="text-nexus-accent" /> {Object.keys(registry).length}{' '}
            UNITS IN MEMORY
          </span>
          <span className="flex items-center gap-1.5">
            <BrainCircuit size={12} className="text-nexus-essence" /> INTEGRITY ENGINE READY
          </span>
        </div>
        <MCPStatusBadge status={mcpState.status} error={mcpState.error} />
      </footer>
    </div>
  );
};
