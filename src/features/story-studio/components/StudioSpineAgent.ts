import { getGeminiClient, GEMINI_MODELS } from '../../../core/llm';
// Fix: Import StudioBlock, BlockType from types
import { StudioBlock, BlockType } from '../types';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  StoryType,
  NarrativeStatus,
  SimpleNote,
  StoryNote,
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
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');

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

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    const rawBlocks = JSON.parse(response.text() || '[]');
    return rawBlocks.map((b: { type: string; data: Record<string, unknown> }) => ({
      id: generateId(),
      type: b.type as BlockType,
      data: b.data,
    }));
  },

  /**
   * Agent: Latent Unit Synthesizer
   * Consumes the entire blueprint and world registry context to suggest unit metadata.
   */
  async autofillLatentUnit(
    title: string,
    intent: string,
    manifesto: StudioBlock[],
    registry: Record<string, NexusObject>,
  ): Promise<{
    category: string;
    gist: string;
    aliases: string[];
    tags: string[];
    thematicWeight: string;
  }> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');

    const thesis = manifesto.find((b) => b.type === 'THESIS')?.data as { text?: string };
    const thesisText = thesis?.text || '';
    const approach =
      (manifesto.find((b) => b.type === 'LITERARY_APPROACH')?.data as {
        archetype?: string;
        rationale?: string;
      }) || {};
    const contextStr = manifesto
      .filter((b) => b.type === 'CONTEXT' || b.type === 'ORACLE_PROMPT')
      .map(
        (b) =>
          (b.data as { text?: string; fact?: string }).text ||
          (b.data as { text?: string; fact?: string }).fact,
      )
      .join(' | ');

    const knownUnits = (Object.values(registry) as NexusObject[])
      .filter((o) => o._type === NexusType.SIMPLE_NOTE || o._type === NexusType.CONTAINER_NOTE)
      .slice(0, 20)
      .map((o) => {
        const note = o as SimpleNote;
        return `${note.title}: ${note.gist}`;
      })
      .join('\n');

    const prompt = `
            ACT AS: The Ekrixi Neural Unit Forge.
            TASK: Suggest metadata for a new unit titled "${title}".
            
            USER INTENT: ${intent || 'Establish logical narrative footprint.'}
            BLUEPRINT THESIS: ${thesisText}
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

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    return JSON.parse(response.text() || '{}');
  },

  /**
   * Agent 1: The Chapter Architect
   */
  async synthesizeChapters(blocks: StudioBlock[]): Promise<NexusObject[]> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');
    const summary = blocks.map((b) => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');

    const prompt = `
            ACT AS: The Ekrixi AI Chapter Architect.
            TASK: Generate a sequence of 5-10 logical Story Chapters from Blueprint.
            ${summary}
            OUTPUT: JSON ONLY: { "chapters": [ { "title": "string", "gist": "string", "tension_level": number } ] }
        `;

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    const resultJson = JSON.parse(response.text() || '{"chapters": []}');
    const now = new Date().toISOString();

    return (resultJson.chapters || []).map(
      (ch: { title: string; gist: string; tension_level?: number }, idx: number) =>
        ({
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
          total_subtree_mass: 0,
        }) as StoryNote,
    );
  },

  async synthesizeScenes(
    chapterId: string,
    chapterBlocks: StudioBlock[],
    globalBlocks: StudioBlock[],
  ): Promise<NexusObject[]> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');
    const globalSummary = globalBlocks
      .map((b) => `${b.type}: ${JSON.stringify(b.data)}`)
      .join('\n');
    const chapterSummary = chapterBlocks
      .map((b) => `${b.type}: ${JSON.stringify(b.data)}`)
      .join('\n');

    const prompt = `
            ACT AS: The Ekrixi AI Scene Architect.
            TASK: Generate a sequence of 3-5 logical Story Scenes for the focused Chapter.
            GLOBAL BLUEPRINT CONTEXT:
            ${globalSummary}
            CHAPTER BLUEPRINT:
            ${chapterSummary}
            OUTPUT: JSON ONLY: { "scenes": [ { "title": "string", "gist": "string", "tension_level": number } ] }
        `;

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    const resultJson = JSON.parse(response.text() || '{"scenes": []}');
    const now = new Date().toISOString();

    return (resultJson.scenes || []).map(
      (sc: { title: string; gist: string; tension_level?: number }, idx: number) =>
        ({
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
          total_subtree_mass: 0,
        }) as StoryNote,
    );
  },

  async autoFillMetadata(
    target: StoryNote,
    prev: StoryNote | null,
    next: StoryNote | null,
    globalBlocks: StudioBlock[],
    userPrompt: string,
  ): Promise<{ title: string; gist: string }> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');
    const thesis =
      (globalBlocks.find((b) => b.type === 'THESIS')?.data as { text?: string })?.text || '';

    const prompt = `
            ACT AS: The Ekrixi Neural Architect.
            TASK: Suggest a Title and a Gist (short description) for this narrative beat.
            CONTEXT:
            - GLOBAL THESIS: ${thesis}
            - PREVIOUS BEAT: ${prev ? `${prev.title}: ${prev.gist}` : 'None (Start of sequence)'}
            - NEXT BEAT: ${next ? `${next.title}: ${next.gist}` : 'None (End of sequence)'}
            - USER DIRECTION: ${userPrompt || 'Ensure logical narrative flow and causal continuity.'}
            TARGET BEAT TYPE: ${target.story_type}
            OUTPUT: JSON ONLY: { "title": "string", "gist": "string" }
        `;

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    return JSON.parse(response.text() || '{ "title": "New Beat", "gist": "..." }');
  },

  async completeDraft(
    target: StoryNote,
    prev: StoryNote | null,
    next: StoryNote | null,
    blocks: StudioBlock[],
  ): Promise<{ gist: string; content: string }> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');
    const thesis = (blocks.find((b) => b.type === 'THESIS')?.data as { text?: string })?.text || '';

    const prompt = `
            ACT AS: The Ekrixi Neural Draftsman.
            TASK: Expand raw text prose for a narrative beat.
            UNIT_FOCUS: ${target.title} (${target.story_type})
            SUMMARY: ${target.gist}
            CONTEXTUAL NEIGHBORS:
            - PREV: ${prev ? `${prev.title}: ${prev.gist}` : 'None (Start)'}
            - NEXT: ${next ? `${next.title}: ${next.gist}` : 'None (End)'}
            MANUSCRIPT THESIS: ${thesis}
            
            REQUIREMENT: Return RAW TEXT only for the content field. Do not use Markdown formatting.
            
            OUTPUT: JSON ONLY: { "gist": "string", "content": "string" }
        `;

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    return JSON.parse(response.text() || '{ "gist": "", "content": "" }');
  },

  async analyzeStructure(
    blocks: StudioBlock[],
    chapters: NexusObject[],
  ): Promise<{
    status: 'SUITABLE' | 'NEEDS_REFACTOR';
    critique: string;
    alternatives: Array<{ name: string; rationale: string }>;
  }> {
    const ai = getGeminiClient();
    if (!ai) throw new Error('Gemini client not initialized. Check API key in settings.');
    const summary = blocks.map((b) => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
    const chapterList = chapters
      .map((c) => {
        const ch = c as StoryNote;
        return `CH_${ch.sequence_index}: ${ch.title}`;
      })
      .join('\n');

    const prompt = `
            ACT AS: The Ekrixi Structural Auditor.
            GOAL: Evaluate spine suitability.
            BLUEPRINT: ${summary}
            SEQUENCE: ${chapterList}
            OUTPUT: JSON ONLY: { "status": "SUITABLE" | "NEEDS_REFACTOR", "critique": "string", "alternatives": [ { "name": "string", "rationale": "string" } ] }
        `;

    const model = ai.getGenerativeModel({ model: GEMINI_MODELS.PRO });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const response = await result.response;
    return JSON.parse(response.text() || '{}');
  },
};
