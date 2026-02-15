// ============================================================
// MCP Server — Extraction Pipeline
// Refactored from ScannerFeature.tsx — uses only v2 types.
// Orchestrates entity detection, matching, and graph assembly.
// ============================================================

import type { NexusObject } from '../../core/types/entities';
import { NexusCategory, NexusType } from '../../core/types/enums';
import {
  createNote,
  createSimpleLink,
  createHierarchicalLink,
  createM2MHub,
} from './graph-assembler';
import { matchEntities, type RegistryMatch } from './entity-matcher';
import { extractDatesFromText, createTimeState, type PartialDate } from './temporal-resolver';
import { BatchStore, type BatchOperation } from './batch-store';
import type { AIClient } from './ai-client';
import { formatContextForAI, stringifyContext } from './context-formatter';

// ============================================================
// Types
// ============================================================

export interface EntitySeed {
  title: string;
  aliases: string[];
  category: NexusCategory;
  gist?: string;
  prose_content?: string;
  temporal?: {
    effective_date?: PartialDate;
    valid_until?: PartialDate;
  };
}

export interface ExtractionResult {
  batch_id: string;
  operations: BatchOperation[];
  matches: RegistryMatch[];
  detected_dates: Array<{ raw_text: string; date: PartialDate; valid_until?: PartialDate }>;
  entity_count: number;
  link_count: number;
}

interface ExtractedEntity {
  title: string;
  category: string;
  gist: string;
  prose_content?: string;
  aliases?: string[];
  temporal?: {
    effective_date?: PartialDate;
    valid_until?: PartialDate;
  };
}

interface ExtractedRelationship {
  source?: string;
  target?: string;
  participants?: { title: string; role_id: string; verb: string }[];
  title?: string;
  parent_title?: string;
  global_verb?: string;
  verb: string;
  verb_inverse?: string;
  is_hierarchical?: boolean;
  temporal?: {
    effective_date?: PartialDate;
    valid_until?: PartialDate;
  };
}

interface AIExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

interface IdentityCluster {
  identity_title: string;
  member_titles: string[];
  category?: string;
  reasoning?: string;
}

interface DetectedDate {
  raw_text: string;
  effective_date: PartialDate;
  valid_until?: PartialDate;
}

// ============================================================
// AI Prompts
// ============================================================

const ENTITY_DETECTION_PROMPT = `You are an entity extraction system for a knowledge graph. Analyze the following text and identify all notable entities (characters, locations, organizations, items, concepts, events).

Identify constituent groups, specialized subgroups, or subdivisions as separate ORGANIZATION entities if they play a distinct role in the context.

For each entity, provide:
- title: The entity's proper name
- category: One of CHARACTER, LOCATION, ORGANIZATION, ITEM, CONCEPT, EVENT, META, STORY, WORLD, STATE
- gist: A one-sentence summary
- prose_content: A detailed paragraph describing the entity and its significance.
- aliases: Any alternative names mentioned
- temporal: If dates/years are mentioned, include { effective_date: { year... }, valid_until?: { year... } }

### SNAPSHOT LAW (Rule 3)
Do NOT create a separate entity for a character's state (e.g., "Bryson (Student)") unless they fundamentally changed. 
- If a person is just attending an event, they are the SAME entity.
- If a person changed internally (broke a leg, became King, died), ONLY then provide a temporal state/snapshot.

Respond with ONLY a valid JSON array of entity objects. No markdown, no explanation.`;

const M2M_DISCOVERY_PROMPT = `You are a knowledge graph extraction system. Identify complex multi-party interactions (3+ entities).

SCHEMA for each Interaction Object:
- title: Name of the interaction/event (e.g. "Battle of Gettysburg")
- global_verb: General nature of interaction (e.g. "CONFLICT", "ASSEMBLY")
- parent_title?: The broader CONTAINER (LOCATION or ORGANIZATION) this event belongs to. (Rule 1)
- participants: Array of objects { title, role_id, verb }
  - title: Entity title from the list below
  - role_id: Specific role (e.g. "combatant", "witness")
  - verb: Specific action (e.g. "fought", "signed")

RULES:
1. ONLY use entity titles from the provided ENTITIES list. 
2. HUB TITLES: If the interaction/event corresponds to an entity in the list, you MUST use that entity's title EXACTLY (e.g. use "Spirit Week", not "Spirit Week Participation").
3. CONTAINER LAW (Rule 1): Events (like battles, meetings, weeks) must belong to objective reality. They are always parented to a LOCATION or ORGANIZATION, never a PERSON.
4. If 3 or more entities participate in the same activity, group them in ONE Hub.
5. List each participant as a SEPARATE object. Do NOT group names in 'title'.

Respond with ONLY a JSON array.`;

const BINARY_EXTRACTION_PROMPT = `You are a knowledge graph extraction system. Identify binary relationships.

SCHEMA for each Relationship Object:
- source: Title of starting entity
- target: Title of ending entity
- verb: Relationship label (forward)
- verb_inverse: Relationship label (reverse)
- is_hierarchical: boolean (true if source is PARENT of target)

RULES:
1. ONLY use entity titles from the provided ENTITIES list.
2. HIERARCHY: Set source: Broader (Parent) and target: Specific (Child). 
3. ACTOR LAW (Rule 2): Characters are independent. They connect to events via LINKS, not by containment. 
   - Correct: Bryson (source) -> attended (verb) -> Spirit Week (target). 
   - Incorrect: 'is_hierarchical: true' between a person and an event.
4. PERSPECTIVE LAW (Rule 4): Subjective thoughts and feelings (e.g., "found it cringe", "felt happy") belong on the LINK (verb/prose), not on the event itself.

Respond with ONLY a JSON array.`;

const IDENTITY_CONSOLIDATION_PROMPT = `You are a knowledge graph consolidation system. 
Identify entities from the provided list that are actually different time-bound states, aliases, or facets of the SAME underlying identity.

STRICT RULES:
1. Do NOT consolidate different organizations (e.g., Benjamin Elementary and North High School are DIFFERENT entities).
2. SEGMENTS/TIME STATES: Consolidate sub-events into their parent events if they are time-bound slices of the SAME occurrence (e.g., "Monday Mismatch Day" is a segment of "Spirit Week").
3. Do NOT consolidate distinct occurrences (e.g., "Battle of the Marne" and "Battle of the Somme" are distinct).
4. ONLY consolidate people/places if they are functionally the SAME identity at different times (e.g., "The Boy" and "The Man").

For each identified cluster:
- identity_title: The name of the shared identity (the broader/soul name)
- member_titles: Entities that are segments/aliases/states of this identity.

Respond with ONLY a JSON array.`;

// ============================================================
// Pipeline Functions
// ============================================================

/**
 * Run entity detection on raw text using the AI client.
 */
export async function detectEntities(text: string, aiClient: AIClient): Promise<EntitySeed[]> {
  const responseText = await aiClient.generateText({
    prompt: `${ENTITY_DETECTION_PROMPT}\n\n---\nTEXT:\n${text}`,
  });

  try {
    const cleaned = responseText
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    const entities = JSON.parse(cleaned) as ExtractedEntity[];
    const uniqueSeeds = new Map<string, EntitySeed>();

    for (const e of entities) {
      const title = e.title.trim();
      if (!uniqueSeeds.has(title)) {
        // Sanitize temporal info
        if (e.temporal) {
          if (typeof e.temporal.effective_date?.year === 'string') {
            const val = e.temporal.effective_date.year as string;
            let year = parseInt(val.match(/-?\d+/)?.[0] || '0', 10);
            if (val.toUpperCase().includes('BC')) year = -Math.abs(year);
            e.temporal.effective_date.year = year;
          }
          if (typeof e.temporal.valid_until?.year === 'string') {
            const val = e.temporal.valid_until.year as string;
            let year = parseInt(val.match(/-?\d+/)?.[0] || '0', 10);
            if (val.toUpperCase().includes('BC')) year = -Math.abs(year);
            e.temporal.valid_until.year = year;
          }
        }

        uniqueSeeds.set(title, {
          title,
          aliases: e.aliases ?? [],
          category: mapCategory(e.category),
          gist: e.gist,
          prose_content: e.prose_content,
          temporal: e.temporal,
        });
      }
    }
    return Array.from(uniqueSeeds.values());
  } catch {
    throw new Error(`Failed to parse entity detection response: ${responseText.slice(0, 200)}`);
  }
}

/**
 * Run the full extraction pipeline:
 * 1. Detect entities (or use provided anchors)
 * 2. Match against existing registry
 * 3. Extract relationships via AI
 * 4. Enforce Reality vs Experience guidelines
 * 5. Assemble into v2 NexusObjects
 * 6. Store as a batch
 */
export async function runExtraction(opts: {
  text: string;
  aiClient: AIClient;
  anchors?: EntitySeed[];
  registry?: Record<string, NexusObject>;
}): Promise<ExtractionResult> {
  const { text, aiClient, anchors, registry } = opts;

  // Step 1: Detect entities or use provided anchors
  const seedsRaw = anchors ?? (await detectEntities(text, aiClient));
  // Final dedupe guard in runExtraction
  const seedMap = new Map<string, EntitySeed>();
  for (const s of seedsRaw) seedMap.set(s.title, s);
  const seeds = Array.from(seedMap.values());
  console.log(`[Pipeline] Seeds after final dedupe: ${seeds.length}`);

  // Step 2: Consolidate identities
  const clusters = await consolidateIdentities(seeds, aiClient);
  console.log(`[Consolidator] Clusters detected: ${clusters.length}`);
  clusters.forEach((c) =>
    console.log(`  - Identity "${c.identity_title}" for: ${c.member_titles.join(', ')}`),
  );

  // Step 3: Match against existing registry (seeds + potential identities)
  const identityTitles = Array.from(new Set(clusters.map((c) => c.identity_title)));
  const allTitlesToMatch = [...seeds.map((s) => s.title), ...identityTitles];
  console.log(
    `[Matcher] Total titles to match: ${allTitlesToMatch.length} (Seeds: ${seeds.length}, Identities: ${identityTitles.length})`,
  );
  const matches = registry ? matchEntities(allTitlesToMatch, registry) : [];
  const matchedTitles = new Set(matches.map((m: RegistryMatch) => m.extracted_title));

  // Step 3: Extract relationships via AI
  const rawExtraction = await extractRelationships(text, seeds, aiClient);

  // DEBUG: Log raw extraction for verification
  console.log(
    `\n[AI Pass 1] M2M Result:`,
    JSON.stringify(
      rawExtraction.relationships.filter((r) => !!r.participants),
      null,
      2,
    ),
  );
  console.log(
    `[AI Pass 2] Binary Result:`,
    JSON.stringify(
      rawExtraction.relationships.filter((r) => !r.participants),
      null,
      2,
    ),
  );

  const extraction = validateAndSanitizeExtraction(rawExtraction, seeds);
  console.log(`[Pipeline] Extracted ${extraction.relationships.length} relationships.`);

  // Step 4: Assemble operations
  const operations: BatchOperation[] = [];
  const titleToId = new Map<string, string>();
  const identityToId = new Map<string, string>();
  const detectedDates = extractDatesFromText(text);

  // Step 4.1: Handle Identity Clusters first
  for (const cluster of clusters) {
    const match = matches.find((m: RegistryMatch) => m.extracted_title === cluster.identity_title);
    if (match) {
      identityToId.set(cluster.identity_title, match.existing_id);
      console.log(
        `[Consolidator] Linked identity "${cluster.identity_title}" to existing: ${match.existing_id}`,
      );
    } else {
      // Create a new "Soul" node for the identity
      // Rule 3: Identity Souls carry the base attributes.
      const firstMemberTitle = cluster.member_titles[0];
      const firstMemberSeed = seeds.find((s) => s.title === firstMemberTitle);

      const identityNote = createNote({
        title: cluster.identity_title,
        category: firstMemberSeed?.category || mapCategory(cluster.category || 'ORGANIZATION'),
        gist: `Shared identity for ${cluster.member_titles.join(', ')}.`,
        tags: ['identity-soul'],
      });
      identityToId.set(cluster.identity_title, identityNote.id);
      operations.push({ op: 'CREATE', entity: identityNote });
      console.log(
        `[Consolidator] Created "Soul" identity: "${cluster.identity_title}" (ID: ${identityNote.id})`,
      );
    }
  }

  // Create notes for unmatched entities
  for (const seed of seeds) {
    const match = matches.find((m: RegistryMatch) => m.extracted_title === seed.title);
    const localSoulId = identityToId.get(seed.title);

    if (match || localSoulId) {
      // Entity already exists or was just created as a Soul — create EXTEND operation
      const targetId = match?.existing_id || localSoulId!;
      titleToId.set(seed.title, targetId);
      const ext = extraction.entities.find(
        (e: ExtractedEntity) => e.title.toLowerCase() === seed.title.toLowerCase(),
      );
      operations.push({
        op: 'EXTEND',
        target_id: targetId,
        extensions: {
          append_prose: ext?.gist || seed.gist,
          add_aliases: seed.aliases.length > 0 ? seed.aliases : undefined,
        },
      });
    } else {
      // New entity — create CREATE operation
      const ext = extraction.entities.find(
        (e: ExtractedEntity) => e.title.toLowerCase() === seed.title.toLowerCase(),
      );

      // Find parent identity if clustered
      const cluster = clusters.find((c) => c.member_titles.includes(seed.title));
      const parentId = cluster ? identityToId.get(cluster.identity_title) : undefined;

      const timeState =
        ext?.temporal?.effective_date || seed.temporal?.effective_date
          ? createTimeState(
              (ext?.temporal?.effective_date || seed.temporal?.effective_date)!,
              ext?.temporal?.valid_until || seed.temporal?.valid_until,
              parentId,
              true, // Clustered members are snapshots
            )
          : undefined;

      if (timeState) {
        console.log(
          `[Pipeline] TimeState for "${seed.title}": ${timeState.effective_date.year} to ${timeState.valid_until?.year || '...'}`,
        );
      }

      const note = createNote({
        title: seed.title,
        category: seed.category,
        gist: seed.gist ?? ext?.gist ?? '',
        prose_content: seed.prose_content ?? ext?.prose_content ?? '',
        aliases: seed.aliases,
        time_state: timeState,
      });
      titleToId.set(seed.title, note.id);
      operations.push({ op: 'CREATE', entity: note });

      // CRITICAL: Also create a hierarchical link from Soul to Snapshot if clustered
      if (parentId) {
        const soulLink = createHierarchicalLink(
          parentId,
          note.id,
          'has_snapshot',
          'snapshot_of',
          timeState,
        );
        if (soulLink) {
          operations.push({ op: 'LINK', link: soulLink as unknown as NexusObject });
        }
      }
    }
  }

  // Create links from extracted relationships
  let linkCount = 0;
  for (const rel of extraction.relationships) {
    let timeState = rel.temporal?.effective_date
      ? createTimeState(rel.temporal.effective_date, rel.temporal.valid_until)
      : undefined;

    // Fallback: If it's a hub and we have a seed with temporal info, use it.
    if (!timeState && rel.title) {
      const seed = seeds.find((s) => s.title === rel.title);
      if (seed?.temporal?.effective_date) {
        timeState = createTimeState(seed.temporal.effective_date, seed.temporal.valid_until);
        console.log(`[Pipeline] Applied temporal data from seed to hub: "${rel.title}"`);
      }
    }

    if (rel.participants && rel.participants.length >= 2) {
      // M2M Hub handling
      const resolvedParticipants = rel.participants
        .map((p) => ({
          node_id: titleToId.get(p.title),
          role_id: p.role_id,
          verb: p.verb,
        }))
        .filter((p) => !!p.node_id) as { node_id: string; role_id: string; verb: string }[];

      if (resolvedParticipants.length < 2) continue;

      const hub = createM2MHub({
        title: rel.title || 'Event',
        global_verb: rel.global_verb || rel.verb || 'EVENT',
        participants: resolvedParticipants,
        time_state: timeState,
      });

      // SEED-TO-HUB PROMOTION:
      // If we already created a CREATE operation for a note with this title,
      // we should replace it or reuse the ID to avoid duplicates.
      const existingSeedId = titleToId.get(rel.title || '');
      if (existingSeedId) {
        // If it's in operations as a CREATE node, remove it.
        const idx = operations.findIndex(
          (op) => op.op === 'CREATE' && op.entity?.id === existingSeedId,
        );
        if (idx !== -1) {
          operations.splice(idx, 1);
          console.log(`[Pipeline] Promoted seed "${rel.title}" to M2M Hub.`);
        }
        // Reuse the same ID for the hub to maintain link integrity
        hub.id = existingSeedId;
      }

      titleToId.set(rel.title || hub.id, hub.id);

      // Rule 1: Handle parent_title if extracted for this M2M Hub
      if (rel.parent_title) {
        const parentId = titleToId.get(rel.parent_title);
        if (parentId) {
          const hLink = createHierarchicalLink(parentId, hub.id, 'hosts', 'hosted by');
          if (hLink) operations.push({ op: 'LINK', link: hLink as unknown as NexusObject });
          console.log(
            `[Pipeline] Parent detected for Hub: "${rel.title}" -> "${rel.parent_title}"`,
          );
        }
      }

      const existingOp = operations.find((op) => op.op === 'LINK' && op.link?.id === hub.id);
      if (!existingOp) {
        operations.push({ op: 'LINK', link: hub as unknown as NexusObject });
        linkCount++;
      }
    } else {
      // Binary relationship handling
      const sourceId = titleToId.get(rel.source!);
      const targetId = titleToId.get(rel.target!);
      if (!sourceId || !targetId) continue;

      const isExistingSource = matchedTitles.has(rel.source!);
      const isExistingTarget = matchedTitles.has(rel.target!);

      if (rel.is_hierarchical) {
        const link = createHierarchicalLink(
          sourceId,
          targetId,
          rel.verb,
          rel.verb_inverse,
          timeState,
        );
        const opType = isExistingSource || isExistingTarget ? 'LINK_EXISTING' : 'LINK';
        operations.push({ op: opType, link: link as unknown as NexusObject });
      } else {
        const link = createSimpleLink({
          source_id: sourceId,
          target_id: targetId,
          verb: rel.verb,
          verb_inverse: rel.verb_inverse,
          time_state: timeState,
        });
        const opType = isExistingSource || isExistingTarget ? 'LINK_EXISTING' : 'LINK';
        operations.push({ op: opType, link: link as unknown as NexusObject });
      }
    }
    linkCount++;
  }

  const batchName = `Extraction: ${text.slice(0, 50).trim()}...`;
  const batchId = BatchStore.create(batchName, operations, 'MCP');

  return {
    batch_id: batchId,
    operations,
    matches,
    detected_dates: detectedDates.map((d: DetectedDate) => ({
      raw_text: d.raw_text,
      date: d.effective_date,
      valid_until: d.valid_until,
    })),
    entity_count: seeds.length,
    link_count: linkCount,
  };
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Enforces Reality vs Experience guidelines at the code level.
 */
function validateAndSanitizeExtraction(
  extraction: AIExtractionResult,
  seeds: EntitySeed[],
): AIExtractionResult {
  const personTitles = new Set(
    seeds.filter((s) => s.category === NexusCategory.CHARACTER).map((s) => s.title),
  );

  extraction.relationships = extraction.relationships.map((rel) => {
    // Rule 1: The Container Law
    if (rel.is_hierarchical && rel.source && personTitles.has(rel.source)) {
      const targetSeed = seeds.find((s) => s.title === rel.target);
      if (
        targetSeed?.category === NexusCategory.EVENT ||
        targetSeed?.category === NexusCategory.LOCATION ||
        targetSeed?.category === NexusCategory.ORGANIZATION
      ) {
        console.warn(
          `[Pipeline] Solipsism Detected: "${rel.source}" cannot parent "${rel.target}". Downgrading to Binary.`,
        );
        return {
          ...rel,
          is_hierarchical: false,
          verb: rel.verb || 'associated with',
        };
      }
    }
    return rel;
  });

  return extraction;
}

async function extractRelationships(
  text: string,
  entities: EntitySeed[],
  aiClient: AIClient,
): Promise<AIExtractionResult> {
  const contextItems = formatContextForAI(entities);
  const entityList = stringifyContext(contextItems);

  console.log(`[Pipeline] Pass 1: Discovering complex M2M interactions...`);
  const m2mResponse = await aiClient.generateText({
    prompt: `${M2M_DISCOVERY_PROMPT}\n\nENTITIES:\n${entityList}\n\n---\nSOURCE TEXT:\n${text}`,
  });

  console.log(`[Pipeline] Pass 2: Extracting binary and hierarchical links...`);
  const binaryResponse = await aiClient.generateText({
    prompt: `${BINARY_EXTRACTION_PROMPT}\n\nENTITIES:\n${entityList}\n\n---\nSOURCE TEXT:\n${text}`,
  });

  const relationships: ExtractedRelationship[] = [];

  try {
    const m2mCleaned = m2mResponse
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    const m2mRels = JSON.parse(m2mCleaned) as ExtractedRelationship[];
    relationships.push(...m2mRels);
  } catch (err) {
    console.warn(`[Pipeline] M2M Parse Error: ${err}`);
  }

  try {
    const binaryCleaned = binaryResponse
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    const binaryRels = JSON.parse(binaryCleaned) as ExtractedRelationship[];
    relationships.push(...binaryRels);
  } catch (err) {
    console.warn(`[Pipeline] Binary Parse Error: ${err}`);
  }

  return {
    entities: entities.map((e: EntitySeed) => ({
      title: e.title,
      category: e.category,
      gist: e.gist ?? '',
      prose_content: e.prose_content,
      aliases: e.aliases,
      temporal: e.temporal,
    })),
    relationships,
  };
}

function mapCategory(raw: string): NexusCategory {
  const map: Record<string, NexusCategory> = {
    CHARACTER: NexusCategory.CHARACTER,
    LOCATION: NexusCategory.LOCATION,
    ORGANIZATION: NexusCategory.ORGANIZATION,
    ITEM: NexusCategory.ITEM,
    CONCEPT: NexusCategory.CONCEPT,
    EVENT: NexusCategory.EVENT,
    META: NexusCategory.META,
    STORY: NexusCategory.STORY,
    WORLD: NexusCategory.WORLD,
    STATE: NexusCategory.STATE,
  };
  return map[raw.toUpperCase()] || NexusCategory.CONCEPT;
}

async function consolidateIdentities(
  seeds: EntitySeed[],
  aiClient: AIClient,
): Promise<IdentityCluster[]> {
  if (seeds.length < 2) return [];

  const entityList = seeds.map((s) => `- ${s.title} (${s.category})`).join('\n');
  const responseText = await aiClient.generateText({
    prompt: `${IDENTITY_CONSOLIDATION_PROMPT}\n\nENTITIES:\n${entityList}`,
  });

  try {
    const cleaned = responseText
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    return JSON.parse(cleaned) as IdentityCluster[];
  } catch {
    return [];
  }
}
