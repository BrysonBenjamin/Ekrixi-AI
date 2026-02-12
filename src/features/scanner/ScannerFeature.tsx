import React, { useState, useEffect } from 'react';
import { Database, BrainCircuit } from 'lucide-react';
import { safeParseJson } from '../../utils/json';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  isLink,
  // Added isContainer to imports to resolve narrowing issues and allow access to children_ids property
  isContainer,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
  ConflictStatus,
  HierarchicalLink,
  ContainerNote,
} from '../../types';
import { GraphIntegrityService } from '../integrity/GraphIntegrityService';
import { generateId } from '../../utils/ids';
import { useLLM } from '../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../core/llm';
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
  const { generateContent } = useLLM();
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
      setStatusMsg('The Architect: Reconciling seeds with structural intel...');

      // Analyze the text to find links between detected seeds and extract content for them
      const architectResponse = await generateContent({
        model: GEMINI_MODELS.PRO,
        systemInstruction: `You are 'The Architect'. Your task is to extract a knowledge graph from text.
                    1. IDENTIFY HIERARCHY: If A is a component, member, or part of B, mark as a 'HIERARCHICAL' link.
                    2. IDENTIFY ASSOCIATIONS: If A relates to B but doesn't live inside it, mark as 'SEMANTIC'.
                    3. EXTRACT CONTENT: For each entity, provide a concise gist and more detailed records from the text.
                    4. Output JSON only. Format: { "links": [{ "source": "Title", "target": "Title", "verb": "contains", "type": "HIERARCHICAL" | "SEMANTIC" }], "updates": [{ "title": "Title", "gist": "Summary", "records": "Markdown content" }] }`,
        generationConfig: {
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `CONTEXT: ${inputText}\n\nTARGET ENTITIES: ${seeds.map((s) => s.title).join(', ')}`,
              },
            ],
          },
        ],
      });

      const result = await architectResponse.response;
      const architecture = safeParseJson<ArchitectResponse>(
        result.text() || '{"links": [], "updates": []}',
        {
          links: [],
          updates: [],
        },
      );

      const finalBatch: ExtractedItem[] = [];
      const idMap: Record<string, string> = {};
      const now = new Date().toISOString();

      // 1. Process Seeds and suggested children
      (seeds || []).forEach((s) => {
        idMap[s.title.toLowerCase()] = s.id;
        const childIds: string[] = [];

        (s.suggestedChildren || []).forEach((childBlueprint) => {
          const childId = generateId();
          childIds.push(childId);
          idMap[childBlueprint.title.toLowerCase()] = childId;

          finalBatch.push({
            id: childId,
            _type: 'SIMPLE_NOTE',
            title: childBlueprint.title,
            gist: childBlueprint.gist,
            category_id: childBlueprint.category,
            is_author_note: childBlueprint.isAuthorNote,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
            prose_content: '',
            is_ghost: false,
            aliases: [],
            tags: [],
          } as NexusObject);

          // Create hierarchical link for suggested child
          finalBatch.push({
            id: generateId(),
            _type: 'HIERARCHICAL_LINK',
            source_id: s.id,
            target_id: childId,
            verb: 'contains',
            verb_inverse: 'part of',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
          } as NexusObject);
        });

        // Get content update for this seed
        const update = architecture.updates?.find(
          (u) => u.title.toLowerCase() === s.title.toLowerCase(),
        );

        // Determine Base Note properties if Time Data is present
        const timeDataInfo = s.timeData
          ? {
              year: s.timeData.year,
              base_node_id: s.timeData.baseId,
            }
          : undefined;

        finalBatch.push({
          id: s.id,
          _type: childIds.length > 0 ? 'CONTAINER_NOTE' : 'SIMPLE_NOTE',
          title: s.title,
          gist: update?.gist || s.gist || 'Identity established via extraction.',
          prose_content: update?.records || '',
          category_id: s.category,
          is_author_note: s.isAuthorNote,
          created_at: now,
          last_modified: now,
          link_ids: [],
          internal_weight: 1.0,
          total_subtree_mass: 0,
          aliases: s.aliases || [],
          tags: [],
          is_ghost: false,
          time_data: timeDataInfo,
          ...(childIds.length > 0
            ? {
                children_ids: childIds,
                containment_type: ContainmentType.FOLDER,
                is_collapsed: false,
                default_layout: DefaultLayout.GRID,
              }
            : {}),
        } as NexusObject);

        // If this is a Time Node, creating the TIME_LINK to the Base
        if (s.timeData) {
          finalBatch.push({
            id: generateId(),
            _type: NexusType.TIME_LINK,
            source_id: s.timeData.baseId,
            target_id: s.id,
            year: s.timeData.year,
            verb: 'has_state',
            verb_inverse: 'state_of',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
          } as NexusObject);
        }
      });

      // 2. Resolve Links from AI Architecture
      setStatusMsg('The Chronicler: Binding relationships...');
      const tempRegistry: Record<string, NexusObject> = { ...registry };
      finalBatch.forEach((item) => {
        tempRegistry[item.id] = item;
      });

      (architecture.links || []).forEach((l) => {
        const sId = idMap[l.source.toLowerCase()];
        const tId = idMap[l.target.toLowerCase()];

        if (sId && tId && sId !== tId) {
          const isHierarchical = l.type === 'HIERARCHICAL';
          const linkType = isHierarchical ? NexusType.HIERARCHICAL_LINK : NexusType.SEMANTIC_LINK;

          const integrity = GraphIntegrityService.analyzeLinkIntegrity(
            sId,
            tId,
            tempRegistry,
            linkType,
          );

          const newLink: ExtractedItem = {
            id: generateId(),
            _type: linkType as NexusType.HIERARCHICAL_LINK | NexusType.SEMANTIC_LINK,
            source_id: sId,
            target_id: tId,
            verb: l.verb || (isHierarchical ? 'contains' : 'relates to'),
            verb_inverse: l.verb_inverse || (isHierarchical ? 'part of' : 'associated with'),
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
            conflict: integrity,
          } as ExtractedItem;

          if (isHierarchical) {
            (newLink as HierarchicalLink).hierarchy_type = HierarchyType.PARENT_OF;
            // Also update parent's child list
            const parent = finalBatch.find((i) => i.id === sId);
            // Fixed: Correctly using isContainer type guard to narrow ExtractedItem and allow children_ids access
            if (parent && isContainer(parent)) {
              parent.children_ids = Array.from(new Set([...parent.children_ids, tId]));
            } else if (parent && !isLink(parent)) {
              // Upgrade to container
              (parent as NexusObject as ContainerNote)._type = NexusType.CONTAINER_NOTE;
              (parent as NexusObject as ContainerNote).children_ids = [tId];
              (parent as NexusObject as ContainerNote).containment_type = ContainmentType.FOLDER;
              (parent as NexusObject as ContainerNote).is_collapsed = false;
              (parent as NexusObject as ContainerNote).default_layout = DefaultLayout.GRID;
            }
          }

          finalBatch.push(newLink);
          tempRegistry[newLink.id] = newLink;
        }
      });

      setExtractedItems(finalBatch);
      setStage('REVIEW');
    } catch (err) {
      console.error('Scanner Processing Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Extraction Pipeline Interrupted.';
      let msg = errorMessage;
      if (msg.includes('404')) msg += ' (Model not found? Check GEMINI_MODELS)';
      if (msg.includes('400')) msg += ' (Bad Request? Check prompt/context size)';

      setError(msg);
      setStage('INPUT');
    }
  };

  const handleCommitReview = (items: NexusObject[]) => {
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
      </footer>
    </div>
  );
};
