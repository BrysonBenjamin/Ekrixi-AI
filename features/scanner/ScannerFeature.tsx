import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Database, BrainCircuit } from 'lucide-react';
import { 
    NexusObject, 
    NexusType, 
    NexusCategory, 
    isLink, 
    ContainmentType, 
    HierarchyType, 
    ConflictStatus 
} from '../../types';
import { GraphIntegrityService } from '../integrity/GraphIntegrityService';
import { generateId } from '../../utils/ids';
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
    suggestedChildren: Array<{ title: string, category: NexusCategory, gist: string, isAuthorNote: boolean }>;
}

export type ExtractedItem = NexusObject & {
    conflict?: {
        status: ConflictStatus;
        reason?: string;
        suggestion?: string;
        existingPath?: string[];
    }
};

const safeParseJson = (text: string, fallback: any = {}) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        return fallback;
    }
};

export const ScannerFeature: React.FC<ScannerFeatureProps> = ({ onCommitBatch, registry = {}, initialText = '', onClearPendingText }) => {
    const [stage, setStage] = useState<ScanStage>('INPUT');
    const [statusMsg, setStatusMsg] = useState('Initializing Agents...');
    const [inputText, setInputText] = useState(initialText);
    const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialText) {
            setInputText(initialText);
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            setStatusMsg('The Architect: Reconciling seeds with intel...');
            
            const architectResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                config: {
                    systemInstruction: `You are 'The Architect'. Your task is to extract a knowledge graph. Output JSON only.`,
                    responseMimeType: 'application/json'
                },
                contents: [{ parts: [{ text: `CONTEXT: ${inputText.slice(0, 10000)}` }] }]
            });

            const architecture = safeParseJson(architectResponse.text || '{"resolved_units": [], "links": []}', { resolved_units: [], links: [] });

            const finalBatch: ExtractedItem[] = [];
            const idMap: Record<string, string> = {};
            const now = new Date().toISOString();

            // 1. Process Seeds & Units
            (seeds || []).forEach(s => {
                idMap[s.title] = s.id;
                idMap[s.id] = s.id;
                const childIds: string[] = [];
                (s.suggestedChildren || []).forEach(childBlueprint => {
                    const childId = generateId();
                    childIds.push(childId);
                    finalBatch.push({
                        id: childId, _type: 'SIMPLE_NOTE', title: childBlueprint.title, gist: childBlueprint.gist, category_id: childBlueprint.category, 
                        is_author_note: childBlueprint.isAuthorNote, created_at: now, last_modified: now, link_ids: [], internal_weight: 1.0, total_subtree_mass: 0
                    } as any);
                    finalBatch.push({
                        id: generateId(), _type: 'HIERARCHICAL_LINK', source_id: s.id, target_id: childId, verb: 'contains', verb_inverse: 'part of',
                        hierarchy_type: HierarchyType.PARENT_OF, created_at: now, last_modified: now, link_ids: [], internal_weight: 1.0, total_subtree_mass: 0
                    } as any);
                });
                finalBatch.push({
                    id: s.id, _type: (childIds.length > 0) ? 'CONTAINER_NOTE' : 'SIMPLE_NOTE', title: s.title, gist: s.gist, category_id: s.category, 
                    is_author_note: s.isAuthorNote, created_at: now, last_modified: now, link_ids: [], internal_weight: 1.0, total_subtree_mass: 0,
                    ...( (childIds.length > 0) ? { children_ids: childIds, containment_type: 'FOLDER' as ContainmentType } : {})
                } as any);
            });

            // 2. Conflict Analysis
            setStatusMsg('The Chronicler: Scrying for Redundancies...');
            const tempRegistry: Record<string, NexusObject> = { ...registry };
            finalBatch.forEach(item => { tempRegistry[item.id] = item; });

            (architecture.links || []).forEach((l: any) => {
                const sId = idMap[l.source] || l.source;
                const tId = idMap[l.target] || l.target;
                
                if (tempRegistry[sId] && tempRegistry[tId]) {
                    // Critical Fix: Explicitly pass SEMANTIC_LINK type to analyzer so it checks redundancy correctly
                    const integrity = GraphIntegrityService.analyzeLinkIntegrity(sId, tId, tempRegistry, NexusType.SEMANTIC_LINK);
                    const newLink: ExtractedItem = {
                        id: generateId(), _type: 'SEMANTIC_LINK', source_id: sId, target_id: tId, verb: l.verb, verb_inverse: l.verb_inverse,
                        created_at: now, last_modified: now, link_ids: [], internal_weight: 1.0, total_subtree_mass: 0, conflict: integrity
                    } as any;
                    finalBatch.push(newLink);
                    tempRegistry[newLink.id] = newLink;
                }
            });

            setExtractedItems(finalBatch);
            setStage('REVIEW');
        } catch (err: any) {
            setError(err.message || "Extraction Pipeline Interrupted.");
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
            <ScannerHeader stage={stage} onReset={() => { setStage('INPUT'); setError(null); }} />
            <main className="flex-1 overflow-y-auto no-scrollbar relative">
                {stage === 'INPUT' && <div className="max-w-6xl mx-auto p-8"><ScannerInput value={inputText} onChange={setInputText} onScan={handleStartPreprocess} error={error} /></div>}
                {stage === 'PREPROCESS' && <PreprocessorAgent text={inputText} onFinalize={handleInitiateScan} onCancel={() => setStage('INPUT')} />}
                {stage === 'PROCESSING' && <ScannerProcessing customStatus={statusMsg} />}
                {stage === 'REVIEW' && <div className="max-w-6xl mx-auto p-8"><ScannerReview items={extractedItems} onUpdate={setExtractedItems} onCommit={handleCommitReview} onCancel={() => setStage('INPUT')} /></div>}
            </main>
            <footer className="h-10 border-t border-nexus-800 bg-nexus-900 flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4 text-[9px] font-mono text-nexus-muted tracking-widest uppercase">
                    <span className="flex items-center gap-1.5"><Database size={12} className="text-nexus-accent" /> {Object.keys(registry).length} UNITS IN MEMORY</span>
                    <span className="flex items-center gap-1.5"><BrainCircuit size={12} className="text-nexus-essence" /> INTEGRITY ENGINE READY</span>
                </div>
            </footer>
        </div>
    );
};