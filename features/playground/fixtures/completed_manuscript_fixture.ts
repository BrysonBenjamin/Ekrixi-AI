import { NexusObject, NexusType, NexusCategory, StoryType, NarrativeStatus, ContainmentType, DefaultLayout, HierarchyType } from '../../../types';
import { generateId } from '../../../utils/ids';
import { StudioBlock } from '../../story-studio/StoryStudioFeature';

export const getCompletedManuscriptBatch = (): NexusObject[] => {
    const timestamp = new Date().toISOString();
    const batch: NexusObject[] = [];

    const bookId = generateId();
    const ch1Id = generateId();
    const ch2Id = generateId();
    const sc1Id = generateId();
    const sc2Id = generateId();

    const manifesto: StudioBlock[] = [
        { id: generateId(), type: 'THESIS', data: { text: "Survival depends on understanding the language of a dying planet." } },
        { id: generateId(), type: 'LITERARY_APPROACH', data: { archetype: 'SAVE_CAT', rationale: "High engagement required for scientific mystery." } }
    ];

    batch.push({
        id: bookId,
        _type: NexusType.STORY_NOTE,
        story_type: StoryType.BOOK,
        title: "Resonance of Gaia",
        gist: "The final mission to save the sector's bio-core.",
        status: NarrativeStatus.POLISHED,
        category_id: NexusCategory.STORY,
        containment_type: ContainmentType.MANUSCRIPT,
        is_collapsed: false,
        default_layout: DefaultLayout.TREE,
        children_ids: [ch1Id, ch2Id],
        manifesto_data: manifesto,
        created_at: timestamp,
        last_modified: timestamp,
        link_ids: [],
        internal_weight: 1.0,
        total_subtree_mass: 120,
        is_ghost: false,
        prose_content: "# Resonance of Gaia\n\nFull polished draft complete."
    } as any);

    batch.push({
        id: ch1Id,
        _type: NexusType.STORY_NOTE,
        story_type: StoryType.CHAPTER,
        title: "Chapter 1: The Spore Winds",
        gist: "Elara detects a anomaly in the aether-currents.",
        status: NarrativeStatus.POLISHED,
        sequence_index: 1,
        tension_level: 30,
        category_id: NexusCategory.STORY,
        children_ids: [sc1Id],
        created_at: timestamp,
        last_modified: timestamp,
        link_ids: []
    } as any);

    batch.push({
        id: sc1Id,
        _type: NexusType.STORY_NOTE,
        story_type: StoryType.SCENE,
        title: "Observation Deck",
        gist: "Watching the nebula tide through the cracked glass of the cockpit.",
        status: NarrativeStatus.POLISHED,
        sequence_index: 1,
        tension_level: 45,
        prose_content: "The spore winds howled against the reinforced hull of the *Stardust*. Elara leaned closer to the console, watching the bioluminescent patterns pulse with an irregular heartbeat. It wasn't math. It was a plea.",
        category_id: NexusCategory.STORY,
        created_at: timestamp,
        last_modified: timestamp,
        link_ids: []
    } as any);

    // Links
    const addLink = (s: string, t: string) => {
        batch.push({
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: s,
            target_id: t,
            verb: 'contains',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: []
        } as any);
    };

    addLink(bookId, ch1Id);
    addLink(ch1Id, sc1Id);

    return batch;
};