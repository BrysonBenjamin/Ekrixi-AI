
// Fix: Import StudioBlock from types
import { StudioBlock } from '../../story-studio/types';
import { generateId } from '../../../utils/ids';
import { NexusCategory } from '../../../types';

// Renamed from getSeedStoryBlueprint to getSeedStoryManifesto to fix import errors in PlaygroundFeature.tsx and ManifestoForge.tsx
export const getSeedStoryManifesto = (): StudioBlock[] => {
    return [
        {
            id: generateId(),
            type: 'THESIS',
            data: { text: "In a world where memories are traded as currency, a disgraced archivist discovers a memory that could crash the global economy." }
        },
        {
            id: generateId(),
            type: 'LITERARY_APPROACH',
            data: { archetype: 'SAVE_CAT', rationale: "We need clear pacing beats to manage the complex world-building of the memory economy." }
        },
        {
            id: generateId(),
            type: 'LATENT_UNIT',
            data: { 
                title: "The Mnemosyne Vault", 
                category: NexusCategory.LOCATION, 
                gist: "Central bank for high-tier state secrets and emotional trauma.",
                draftPrompt: "A high-security facility carved from a glacier."
            }
        },
        {
            id: generateId(),
            type: 'DELTA',
            data: { 
                start: "Protagonist is broke, desperate, and cynical.", 
                end: "Protagonist realizes some memories are worth more than any price." 
            }
        },
        {
            id: generateId(),
            type: 'ORACLE_PROMPT',
            data: { text: "Ensure the 'Save the Cat' beats focus on the internal guilt of the archivist." }
        }
    ];
};