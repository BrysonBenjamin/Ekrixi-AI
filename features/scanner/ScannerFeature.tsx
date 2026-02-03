
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Database, BrainCircuit } from 'lucide-react';
import { NexusObject, NexusType, NexusCategory, isLink, ContainmentType, HierarchyType } from '../../types';
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

/**
 * Utility to safely parse JSON from AI responses which may be malformed or truncated.
 */
const safeParseJson = (text: string, fallback: any = {}) => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("JSON Parse Error. Attempting partial recovery...", e);
        try {
            const trimmed = text.trim();
            if (trimmed.startsWith('{') && !trimmed.endsWith('}')) return JSON.parse(trimmed + '}');
            if (trimmed.startsWith('[') && !trimmed.endsWith(']')) return JSON.parse(trimmed + ']');
        } catch (inner) {}
        return fallback;
    }
};

export const ScannerFeature: React.FC<ScannerFeatureProps> = ({ onCommitBatch, registry = {}, initialText = '', onClearPendingText }) => {
    const [stage, setStage] = useState<ScanStage>('INPUT');
    const [statusMsg, setStatusMsg] = useState('Initializing Agents...');
    const [inputText, setInputText] = useState(initialText);
    const [extractedItems, setExtractedItems] = useState<NexusObject[]>([]);
    const [entitySeeds, setEntitySeeds] = useState<EntitySeed[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialText) {
            setInputText(initialText);
            onClearPendingText?.();
        }
    }, [initialText, onClearPendingText]);

    const existingEntities = useMemo(() => {
        return (Object.values(registry) as NexusObject[])
            .filter(obj => !isLink(obj))
            .map(obj => ({ 
                id: obj.id, 
                title: ((obj as any).title || '').slice(0, 50), 
                category: (obj as any).category_id,
                gist: ((obj as any).gist || '').slice(0, 100),
                isAuthorNote: (obj as any).is_author_note 
            }));
    }, [registry]);

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
            
            const authorNotesSeeds = seeds.filter(s => s.isAuthorNote);
            const standardSeeds = seeds.filter(s => !s.isAuthorNote);

            const architectResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                config: {
                    systemInstruction: `You are 'The Architect'. Your task is to extract a knowledge graph.
                    CRITICAL: Use these pre-defined seeds.
                    - STANDARD_SEEDS: ${JSON.stringify(standardSeeds.map(s => ({ id: s.id, title: s.title, category: s.category })))}
                    - AUTHORS_NOTES_ANCHORS: ${JSON.stringify(authorNotesSeeds.map(s => ({ id: s.id, title: s.title })))}
                    - EXISTING_CONTEXT: ${JSON.stringify(existingEntities.slice(0, 30))}
                    Output JSON only.`,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resolved_units: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        temp_id: { type: Type.STRING },
                                        seed_id: { type: Type.STRING },
                                        title: { type: Type.STRING },
                                        category: { type: Type.STRING },
                                        gist: { type: Type.STRING },
                                        prose: { type: Type.STRING },
                                        aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        containment_type: { type: Type.STRING }
                                    }
                                }
                            },
                            links: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        source: { type: Type.STRING },
                                        target: { type: Type.STRING },
                                        verb: { type: Type.STRING },
                                        verb_inverse: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                },
                contents: [{ parts: [{ text: `CONTEXT: ${inputText.slice(0, 10000)}` }] }]
            });

            const architecture = safeParseJson(architectResponse.text || '{"resolved_units": [], "links": []}', { resolved_units: [], links: [] });

            const finalBatch: NexusObject[] = [];
            const idMap: Record<string, string> = {};
            const now = new Date().toISOString();

            (seeds || []).forEach(s => {
                idMap[s.title] = s.id;
                idMap[s.id] = s.id;
                
                const resolved = (architecture.resolved_units || []).find((u: any) => u.seed_id === s.id);
                const childIds: string[] = [];

                (s.suggestedChildren || []).forEach(childBlueprint => {
                    const childId = generateId();
                    childIds.push(childId);
                    
                    finalBatch.push({
                        id: childId,
                        _type: 'SIMPLE_NOTE',
                        title: childBlueprint.title,
                        gist: childBlueprint.gist,
                        prose_content: '',
                        category_id: childBlueprint.category,
                        aliases: [],
                        tags: childBlueprint.isAuthorNote ? ['meta'] : [],
                        is_ghost: false,
                        is_author_note: childBlueprint.isAuthorNote,
                        created_at: now,
                        last_modified: now,
                        link_ids: [],
                        internal_weight: 1.0,
                        total_subtree_mass: 0
                    } as any);

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
                        total_subtree_mass: 0
                    } as any);
                });

                finalBatch.push({
                    id: s.id,
                    _type: (childIds.length > 0) ? 'CONTAINER_NOTE' : 'SIMPLE_NOTE',
                    title: s.title,
                    gist: s.gist || resolved?.gist || '',
                    prose_content: resolved?.prose || '',
                    category_id: s.category || resolved?.category || 'CONCEPT',
                    aliases: s.aliases || resolved?.aliases || [],
                    tags: resolved?.tags || [],
                    is_ghost: false,
                    is_author_note: s.isAuthorNote,
                    created_at: now,
                    last_modified: now,
                    link_ids: [],
                    internal_weight: 1.0,
                    total_subtree_mass: 0,
                    ...( (childIds.length > 0) ? {
                        children_ids: childIds,
                        is_collapsed: false,
                        containment_type: 'FOLDER' as ContainmentType,
                        default_layout: 'GRID'
                    } : {})
                } as any);
            });

            (architecture.resolved_units || []).forEach((u: any) => {
                if (u.seed_id && idMap[u.seed_id]) return; 

                const finalId = generateId();
                idMap[u.temp_id || u.title] = finalId;

                finalBatch.push({
                    id: finalId,
                    _type: u.containment_type ? 'CONTAINER_NOTE' : 'SIMPLE_NOTE',
                    title: u.title,
                    gist: u.gist || '',
                    prose_content: u.prose || '',
                    category_id: u.category || 'CONCEPT',
                    aliases: u.aliases || [],
                    tags: u.tags || [],
                    is_ghost: false,
                    is_author_note: false,
                    created_at: now,
                    last_modified: now,
                    link_ids: [],
                    internal_weight: 1.0,
                    total_subtree_mass: 0,
                    ...(u.containment_type ? {
                        children_ids: [],
                        is_collapsed: false,
                        containment_type: u.containment_type as ContainmentType,
                        default_layout: 'GRID'
                    } : {})
                } as NexusObject);
            });

            (architecture.links || []).forEach((l: any) => {
                const sId = idMap[l.source] || l.source;
                const tId = idMap[l.target] || l.target;
                
                if (finalBatch.some(i => i.id === sId || i.id === tId) || registry[sId] || registry[tId]) {
                    finalBatch.push({
                        id: generateId(),
                        _type: 'SEMANTIC_LINK',
                        source_id: sId,
                        target_id: tId,
                        verb: l.verb,
                        verb_inverse: l.verb_inverse,
                        created_at: now,
                        last_modified: now,
                        link_ids: [],
                        internal_weight: 1.0,
                        total_subtree_mass: 0
                    } as any);
                }
            });

            setExtractedItems(finalBatch);
            setStage('REVIEW');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Extraction Pipeline Interrupted.");
            setStage('INPUT');
        }
    };

    const handleCommitReview = (items: NexusObject[]) => {
        onCommitBatch(items);
        setStage('INPUT');
        setExtractedItems([]);
        setInputText('');
    };

    return (
        <div className="flex flex-col h-full bg-nexus-950 font-sans">
            <ScannerHeader 
                stage={stage} 
                onReset={() => { setStage('INPUT'); setError(null); }} 
            />

            <main className="flex-1 overflow-y-auto no-scrollbar relative">
                <div className="h-full w-full">
                    {stage === 'INPUT' && (
                        <div className="max-w-6xl mx-auto p-4 md:p-8">
                            <ScannerInput 
                                value={inputText} 
                                onChange={setInputText} 
                                onScan={handleStartPreprocess}
                                error={error}
                            />
                        </div>
                    )}

                    {stage === 'PREPROCESS' && (
                        <PreprocessorAgent 
                            text={inputText} 
                            onFinalize={handleInitiateScan}
                            onCancel={() => setStage('INPUT')}
                        />
                    )}

                    {stage === 'PROCESSING' && (
                        <ScannerProcessing customStatus={statusMsg} />
                    )}

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
                </div>
            </main>

            <footer className="h-10 border-t border-nexus-800 bg-nexus-900 flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4 text-[9px] font-mono text-nexus-muted tracking-widest uppercase">
                    <span className="flex items-center gap-1.5"><Database size={12} className="text-nexus-accent" /> {Object.keys(registry).length} UNITS IN MEMORY</span>
                    <span className="hidden md:block">|</span>
                    <span className="flex items-center gap-1.5"><BrainCircuit size={12} className="text-nexus-500" /> MULTI-AGENT ARCHITECTURE</span>
                </div>
            </footer>
        </div>
    );
};
