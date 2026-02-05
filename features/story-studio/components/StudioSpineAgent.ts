import { GoogleGenAI, Type } from "@google/genai";
// Fix: Import StudioBlock from types
import { StudioBlock } from '../types';
import { 
    NexusObject, 
    NexusType, 
    NexusCategory, 
    StoryType, 
    NarrativeStatus, 
    HierarchyType 
} from '../../../types';
import { generateId } from '../../../utils/ids';

// NOTE: Currently operating in RAW TEXT MODE for maximum structural stability. 
// Markdown symbols are treated as literal characters to prevent parsing drift during recursive search.

export const StudioSpineAgent = {
    /**
     * Agent: Blueprint Synthesizer
     * Generates a full protocol block array from a simple seed.
     */
    async synthesizeManifestoBlocks(seed: string): Promise<StudioBlock[]> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            ACT AS: The Ekrixi Blueprint Chat.
            TASK: Generate a high-fidelity narrative blueprint from the user's seed IDEA.
            
            SEED: "${seed}"
            
            GOAL: Produce 4-6 structural blocks that establish the narrative framework.
            OUTPUT: JSON ONLY list of objects with { "type": "THESIS" | "DELTA" | "LATENT_UNIT" | "LITERARY_APPROACH" | "ORACLE_PROMPT", "data": object }.
            
            SCHEMA FOR DATA:
            - THESIS: { "text": string }
            - LITERARY_APPROACH: { "archetype": "THREE_ACT" | "SAVE_CAT" | "HERO_JOURNEY" | "FICHTEAN", "rationale": string }
            - DELTA: { "start": string, "end": string }
            - LATENT_UNIT: { "title": string, "category": string, "gist": string, "draftPrompt": string }
            - ORACLE_PROMPT: { "text": string }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const rawBlocks = JSON.parse(response.text || "[]");
        return rawBlocks.map((b: any) => ({
            id: generateId(),
            type: b.type,
            data: b.data
        }));
    },

    /**
     * Agent: Latent Unit Synthesizer
     * Consumes the entire blueprint and world registry context to suggest unit metadata.
     */
    async autofillLatentUnit(title: string, intent: string, manifesto: StudioBlock[], registry: Record<string, NexusObject>): Promise<any> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const thesis = manifesto.find(b => b.type === 'THESIS')?.data.text || "";
        const approach = manifesto.find(b => b.type === 'LITERARY_APPROACH')?.data || {};
        const contextStr = manifesto
            .filter(b => b.type === 'CONTEXT' || b.type === 'ORACLE_PROMPT')
            .map(b => b.data.text || b.data.fact)
            .join(' | ');

        const knownUnits = (Object.values(registry) as NexusObject[])
            .filter(o => o._type === NexusType.SIMPLE_NOTE || o._type === NexusType.CONTAINER_NOTE)
            .slice(0, 20)
            .map(o => `${(o as any).title}: ${(o as any).gist}`)
            .join('\n');
        
        const prompt = `
            ACT AS: The Ekrixi Neural Unit Forge.
            TASK: Suggest metadata for a new unit titled "${title}".
            
            USER INTENT: ${intent || "Establish logical narrative footprint."}
            BLUEPRINT THESIS: ${thesis}
            LITERARY APPROACH: ${approach.archetype} (${approach.rationale})
            ADDITIONAL CONTEXT: ${contextStr}

            WORLD MEMORY BANK (REFERENCE):
            ${knownUnits}

            GOAL: Produce a unit that fits seamlessly into the current structure and thematic weight.
            OUTPUT: JSON ONLY: {
                "category": "CHARACTER" | "LOCATION" | "ITEM" | "ORGANIZATION" | "CONCEPT",
                "gist": "One sentence summary capturing its primary role",
                "aliases": ["Name 1", "Name 2"],
                "tags": ["tag1", "tag2"],
                "thematicWeight": "Short note on how this unit inherits or subverts the blueprint thesis"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    },

    /**
     * Agent 1: The Chapter Architect
     */
    async synthesizeChapters(blocks: StudioBlock[]): Promise<NexusObject[]> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const summary = blocks.map(b => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
        
        const prompt = `
            ACT AS: The Ekrixi AI Chapter Architect.
            TASK: Generate a sequence of 5-10 logical Story Chapters from Blueprint.
            ${summary}
            OUTPUT: JSON ONLY: { "chapters": [ { "title": "string", "gist": "string", "tension_level": number } ] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const result = JSON.parse(response.text || '{"chapters": []}');
        const now = new Date().toISOString();
        
        return (result.chapters || []).map((ch: any, idx: number) => ({
            id: generateId(),
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.CHAPTER,
            title: ch.title,
            gist: ch.gist,
            sequence_index: idx + 1,
            tension_level: ch.tension_level || 50,
            status: NarrativeStatus.OUTLINE,
            category_id: NexusCategory.STORY,
            created_at: now,
            last_modified: now,
            link_ids: [],
            children_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any));
    },

    async synthesizeScenes(chapterId: string, chapterBlocks: StudioBlock[], globalBlocks: StudioBlock[]): Promise<NexusObject[]> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const globalSummary = globalBlocks.map(b => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
        const chapterSummary = chapterBlocks.map(b => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
        
        const prompt = `
            ACT AS: The Ekrixi AI Scene Architect.
            TASK: Generate a sequence of 3-5 logical Story Scenes for the focused Chapter.
            GLOBAL BLUEPRINT CONTEXT:
            ${globalSummary}
            CHAPTER BLUEPRINT:
            ${chapterSummary}
            OUTPUT: JSON ONLY: { "scenes": [ { "title": "string", "gist": "string", "tension_level": number } ] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const result = JSON.parse(response.text || '{"scenes": []}');
        const now = new Date().toISOString();
        
        return (result.scenes || []).map((sc: any, idx: number) => ({
            id: generateId(),
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.SCENE,
            title: sc.title,
            gist: sc.gist,
            sequence_index: idx + 1,
            tension_level: sc.tension_level || 50,
            status: NarrativeStatus.OUTLINE,
            category_id: NexusCategory.STORY,
            created_at: now,
            last_modified: now,
            link_ids: [],
            children_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any));
    },

    async autoFillMetadata(target: any, prev: any | null, next: any | null, globalBlocks: StudioBlock[], userPrompt: string): Promise<{ title: string, gist: string }> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const thesis = globalBlocks.find(b => b.type === 'THESIS')?.data.text || "";
        
        const prompt = `
            ACT AS: The Ekrixi Neural Architect.
            TASK: Suggest a Title and a Gist (short description) for this narrative beat.
            CONTEXT:
            - GLOBAL THESIS: ${thesis}
            - PREVIOUS BEAT: ${prev ? `${prev.title}: ${prev.gist}` : "None (Start of sequence)"}
            - NEXT BEAT: ${next ? `${next.title}: ${next.gist}` : "None (End of sequence)"}
            - USER DIRECTION: ${userPrompt || "Ensure logical narrative flow and causal continuity."}
            TARGET BEAT TYPE: ${target.story_type}
            OUTPUT: JSON ONLY: { "title": "string", "gist": "string" }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{ "title": "New Beat", "gist": "..." }');
    },

    async completeDraft(target: any, prev: any | null, next: any | null, blocks: StudioBlock[]): Promise<{ gist: string, content: string }> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const thesis = blocks.find(b => b.type === 'THESIS')?.data.text || "";
        
        const prompt = `
            ACT AS: The Ekrixi Neural Draftsman.
            TASK: Expand raw text prose for a narrative beat.
            UNIT_FOCUS: ${target.title} (${target.story_type})
            SUMMARY: ${target.gist}
            CONTEXTUAL NEIGHBORS:
            - PREV: ${prev ? `${prev.title}: ${prev.gist}` : "None (Start)"}
            - NEXT: ${next ? `${next.title}: ${next.gist}` : "None (End)"}
            MANUSCRIPT THESIS: ${thesis}
            
            REQUIREMENT: Return RAW TEXT only for the content field. Do not use Markdown formatting.
            
            OUTPUT: JSON ONLY: { "gist": "string", "content": "string" }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{ "gist": "", "content": "" }');
    },

    async analyzeStructure(blocks: StudioBlock[], chapters: NexusObject[]): Promise<any> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const summary = blocks.map(b => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
        const chapterList = chapters.map(c => `CH_${(c as any).sequence_index}: ${(c as any).title}`).join('\n');

        const prompt = `
            ACT AS: The Ekrixi Structural Auditor.
            GOAL: Evaluate spine suitability.
            BLUEPRINT: ${summary}
            SEQUENCE: ${chapterList}
            OUTPUT: JSON ONLY: { "status": "SUITABLE" | "NEEDS_REFACTOR", "critique": "string", "alternatives": [ { "name": "string", "rationale": "string" } ] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    }
};
