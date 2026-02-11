import {
  NexusObject,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
  ContainerNote,
  SimpleNote,
} from '../../../types';
import { generateId } from '../../../utils/ids';

export const getGaiaPrimeExpandedBatch = (): NexusObject[] => {
  const timestamp = new Date().toISOString();
  const batch: NexusObject[] = [];

  const createNode = (data: Partial<NexusObject>): string => {
    const node = {
      ...data,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      internal_weight: 1.0,
      total_subtree_mass: 0,
      is_ghost: false,
    } as NexusObject;
    batch.push(node);
    return node.id;
  };

  const createLink = (sourceId: string, targetId: string, type: NexusType, verb: string) => {
    const link = {
      id: generateId(),
      _type: type,
      source_id: sourceId,
      target_id: targetId,
      verb,
      verb_inverse: 'part of',
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      internal_weight: 1.0,
      total_subtree_mass: 0,
      hierarchy_type: type === NexusType.HIERARCHICAL_LINK ? HierarchyType.PARENT_OF : undefined,
    } as NexusObject;
    batch.push(link);
  };

  // 1. Root: GAIA PRIME
  const gaiaId = createNode({
    id: 'gaia-prime-expanded',
    _type: NexusType.CONTAINER_NOTE,
    title: 'GAIA PRIME',
    gist: 'The living super-organism at the heart of the sector.',
    prose_content:
      '# Gaia Prime\nGaia is a planetary-scale biological entity. The atmosphere is maintained by the rhythmic respiration of the Great Spore Forests.',
    category_id: NexusCategory.LOCATION,
    containment_type: ContainmentType.REGION,
    is_collapsed: false,
    default_layout: DefaultLayout.TREE,
    children_ids: [] as string[],
    aliases: ['The Mother', 'System 01'],
    tags: ['primordial', 'biological'],
  });

  // 2. Regions
  const regions = [
    {
      title: 'Aetheria',
      gist: 'Floating continent of eternal winds.',
      cat: NexusCategory.LOCATION,
    },
    {
      title: 'Abyssa Trenches',
      gist: 'Deep-sea bioluminescent civilizations.',
      cat: NexusCategory.LOCATION,
    },
    {
      title: 'Obsidian Maw',
      gist: "Geothermal canyons where Gaia's blood (magma) is exposed.",
      cat: NexusCategory.LOCATION,
    },
    {
      title: 'Cloud-Garden Ichor',
      gist: 'Aerial botanical clusters that filter toxin-rain.',
      cat: NexusCategory.LOCATION,
    },
  ];

  regions.forEach((r) => {
    const id = createNode({
      id: generateId(),
      _type: NexusType.CONTAINER_NOTE,
      title: r.title,
      gist: r.gist,
      category_id: r.cat,
      containment_type: ContainmentType.REGION,
      is_collapsed: false,
      default_layout: DefaultLayout.GRID,
      children_ids: [] as string[],
      aliases: [],
      tags: [],
    });
    createLink(gaiaId, id, NexusType.HIERARCHICAL_LINK, 'contains');
    const gaia = batch.find((n) => n.id === gaiaId);
    if (gaia && 'children_ids' in gaia) {
      (gaia as ContainerNote).children_ids.push(id);
    }
  });

  // 3. Factions & Characters
  const councilId = createNode({
    id: generateId(),
    _type: NexusType.CONTAINER_NOTE,
    title: 'Solar Council',
    gist: 'Technocratic rulers of Aetheria.',
    category_id: NexusCategory.ORGANIZATION,
    containment_type: ContainmentType.FACTION,
    is_collapsed: false,
    default_layout: DefaultLayout.TREE,
    children_ids: [] as string[],
    aliases: ['The Architects'],
    tags: ['authority'],
  });

  const aetheria = batch.find((n) => 'title' in n && (n as SimpleNote).title === 'Aetheria');
  if (aetheria) {
    createLink(aetheria.id, councilId, NexusType.HIERARCHICAL_LINK, 'governs');
    if ('children_ids' in aetheria) {
      (aetheria as ContainerNote).children_ids.push(councilId);
    }
  }

  createNode({
    id: generateId(),
    _type: NexusType.SIMPLE_NOTE,
    title: 'Elara Vance',
    gist: 'A renegade pilot with Gaia-synchronized intuition.',
    category_id: NexusCategory.CHARACTER,
    aliases: ['The Whisperer'],
    tags: ['pilot'],
    prose_content:
      "Elara was the first to realize that Gaia's tectonic shifts were actually long-wave communications.",
  });

  return batch;
};
