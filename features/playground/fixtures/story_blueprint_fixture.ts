
import { 
    NexusObject, 
    NexusType, 
    NexusCategory, 
    StoryType, 
    NarrativeStatus, 
    ContainmentType, 
    DefaultLayout, 
    HierarchyType 
} from '../../../types';
import { generateId } from '../../../utils/ids';

export const getStoryBlueprintBatch = (): NexusObject[] => {
    const timestamp = new Date().toISOString();
    
    const bookId = generateId();
    const ch1Id = generateId();
    const ch2Id = generateId();
    const scene1Id = generateId();
    const scene2Id = generateId();
    const protagonistId = generateId();

    return [
        // 1. Root: The Book
        {
            id: bookId,
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.BOOK,
            title: "The Neon Dirge",
            gist: "An epic space opera about the death of the first AI god.",
            category_id: NexusCategory.STORY,
            status: NarrativeStatus.OUTLINE,
            sequence_index: 1,
            tension_level: 20,
            containment_type: ContainmentType.MANUSCRIPT,
            is_collapsed: false,
            default_layout: DefaultLayout.TREE,
            children_ids: [ch1Id, ch2Id],
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            aliases: ["Project Dirge"],
            tags: ["sci-fi", "main-project"],
            internal_weight: 1.0,
            total_subtree_mass: 150,
            is_ghost: false,
            prose_content: "# The Neon Dirge\n\nThis manuscript follows the collapse of the *Ekrixi Core*."
        } as any,

        // 2. Chapter 1
        {
            id: ch1Id,
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.CHAPTER,
            title: "Chapter 1: Zero Signal",
            gist: "The core goes silent and the silence is deafening.",
            category_id: NexusCategory.STORY,
            status: NarrativeStatus.DRAFT,
            sequence_index: 1,
            tension_level: 40,
            containment_type: ContainmentType.PLOT_ARC,
            is_collapsed: false,
            default_layout: DefaultLayout.TIMELINE,
            children_ids: [scene1Id],
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            aliases: ["Opening"],
            tags: ["act-1"],
            internal_weight: 0.8,
            total_subtree_mass: 40,
            is_ghost: false
        } as any,

        // 3. Scene 1.1
        {
            id: scene1Id,
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.SCENE,
            title: "The Observatory",
            gist: "Elara watches the stars blink out.",
            category_id: NexusCategory.STORY,
            status: NarrativeStatus.POLISHED,
            sequence_index: 1,
            tension_level: 80,
            pov_id: protagonistId,
            containment_type: ContainmentType.FOLDER,
            is_collapsed: false,
            default_layout: DefaultLayout.GRID,
            children_ids: [],
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            aliases: ["Scene 1"],
            tags: ["high-tension"],
            internal_weight: 0.5,
            total_subtree_mass: 0,
            is_ghost: false
        } as any,

        // 4. Chapter 2
        {
            id: ch2Id,
            _type: NexusType.STORY_NOTE,
            story_type: StoryType.CHAPTER,
            title: "Chapter 2: The Dregs",
            gist: "Descent into the lower sectors to find the rogue decker.",
            category_id: NexusCategory.STORY,
            status: NarrativeStatus.VOID,
            sequence_index: 2,
            tension_level: 55,
            containment_type: ContainmentType.PLOT_ARC,
            is_collapsed: false,
            default_layout: DefaultLayout.TIMELINE,
            children_ids: [scene2Id],
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            aliases: [],
            tags: ["act-1"],
            internal_weight: 0.8,
            total_subtree_mass: 20,
            is_ghost: false
        } as any,

        // 5. Protagonist (Character node to show cross-type linking)
        {
            id: protagonistId,
            _type: NexusType.SIMPLE_NOTE,
            title: "Elara Vance",
            gist: "The Last Scribe of the Core.",
            category_id: NexusCategory.CHARACTER,
            is_ghost: false,
            internal_weight: 1.0,
            total_subtree_mass: 0,
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            aliases: ["The Watcher"],
            tags: ["protagonist"],
            prose_content: "Elara doesn't just see the stars; she hears the math behind them."
        } as any,

        // Hierarchical Links
        {
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: bookId,
            target_id: ch1Id,
            verb: "contains",
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any,
        {
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: bookId,
            target_id: ch2Id,
            verb: "contains",
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any,
        {
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: ch1Id,
            target_id: scene1Id,
            verb: "contains",
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any,

        // Semantic POV Link
        {
            id: generateId(),
            _type: NexusType.SEMANTIC_LINK,
            source_id: scene1Id,
            target_id: protagonistId,
            verb: "POV is",
            verb_inverse: "appears in",
            created_at: timestamp,
            last_modified: timestamp,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        } as any
    ];
};
