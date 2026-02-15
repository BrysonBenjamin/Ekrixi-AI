import { MCPScannerClient } from '../core/services/MCPScannerClient';
import { GraphOperations } from '../core/services/GraphOperations';
import { TimeDimensionService } from '../core/services/TimeDimensionService';
import { NexusType, NexusCategory, HierarchyType } from '../core/types/enums';
import {
  NexusObject,
  NexusNote,
  NexusLink,
  NexusHierarchicalLink,
  AggregatedSimpleLink,
} from '../core/types/entities';
import * as ContextFormatter from '../mcp-server/core/context-formatter';

// Define the Mock Registry
const registry: Record<string, NexusObject> = {};

// Helper to add to registry
const add = (obj: NexusObject) => {
  registry[obj.id] = obj;
};

// 1. Rome (The West)
const rome: NexusNote = {
  id: 'rome',
  _type: NexusType.SIMPLE_NOTE,
  title: 'Roman Empire',
  category_id: NexusCategory.STATE, // Using STATE for geopolitical entity
  gist: 'The post-Republican period of ancient Rome.',
  aliases: ['Rome', 'Senatus Populusque Romanus'],
  tags: ['empire', 'ancient', 'europe'],
  link_ids: [], // Updated later
  children_ids: [],
  internal_weight: 1,
  total_subtree_mass: 0,
  is_ghost: false,
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  time_state: {
    is_historical_snapshot: false,
    effective_date: { year: -27 }, // 27 BC
    valid_until: { year: 476 }, // 476 AD
  },
};
add(rome);

// 2. Han (The East)
const han: NexusNote = {
  id: 'han',
  _type: NexusType.SIMPLE_NOTE,
  title: 'Han Dynasty',
  category_id: NexusCategory.STATE,
  gist: ' The second imperial dynasty of China.',
  aliases: ['Han Empire', 'Eastern Han'],
  tags: ['dynasty', 'ancient', 'china'],
  link_ids: [], // Updated later
  children_ids: [],
  internal_weight: 1,
  total_subtree_mass: 0,
  is_ghost: false,
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  time_state: {
    is_historical_snapshot: false,
    effective_date: { year: -202 }, // 202 BC
    valid_until: { year: 220 }, // 220 AD
  },
};
add(han);

// 3. Silk Road (The M2M Hub connecting them)
// We treat this as an Aggregated Simple Link (M2M) or a Concept that acts as a Hub
const silkRoad: AggregatedSimpleLink = {
  id: 'silk_road',
  _type: NexusType.AGGREGATED_SIMPLE_LINK,
  is_reified: true,
  title: 'Silk Road Trade',
  category_id: NexusCategory.CONCEPT,
  gist: 'A network of trade routes connecting the East and West.',
  aliases: ['Silk Route'],
  tags: ['trade', 'commerce'],
  link_ids: [],
  children_ids: [],
  internal_weight: 1,
  total_subtree_mass: 0,
  is_ghost: false,
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  verb: 'traded via',
  verb_inverse: 'facilitated trade for',
  global_verb: 'traded',
  participants: [
    { node_id: 'rome', role_id: 'CONSUMER', verb: 'imported goods via' },
    { node_id: 'han', role_id: 'PRODUCER', verb: 'exported silk via' },
  ],
  // Link fields required by type
  source_id: 'rome' as never,
  target_id: 'han' as never,
};
add(silkRoad);

// Bi-directional linkage
rome.link_ids.push('silk_road');
han.link_ids.push('silk_road');

// 4. Parthian Empire (The Middleman/Obstacle)
const parthia: NexusNote = {
  id: 'parthia',
  _type: NexusType.SIMPLE_NOTE,
  title: 'Parthian Empire',
  category_id: NexusCategory.STATE,
  gist: 'A major Iranian political and cultural power.',
  aliases: ['Parthia'], // "The Middleman"
  tags: ['empire', 'middle_east'],
  link_ids: [],
  children_ids: [],
  internal_weight: 1,
  total_subtree_mass: 0,
  is_ghost: false,
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  time_state: {
    is_historical_snapshot: false,
    effective_date: { year: -247 },
    valid_until: { year: 224 },
  },
};
add(parthia);

async function runTest() {
  const client = new MCPScannerClient();

  // Connect the real client (imports real modules)
  console.log('Connecting real client...');
  await client.connect();

  // Overriding detectEntities to bypass the AI requirement for this local test,
  // while keeping the rest of the resolveAgenticContext logic REAL.
  (client as any).detectEntities = async (text: string) => {
    const entities = [];
    if (text.toLowerCase().includes('roman')) {
      entities.push({
        title: 'Roman Empire',
        category_id: NexusCategory.STATE,
        gist: 'The Roman Empire description.',
      });
    }
    if (text.toLowerCase().includes('han')) {
      entities.push({
        title: 'Han Dynasty',
        category_id: NexusCategory.STATE,
        gist: 'The Han Dynasty description.',
      });
    }
    return { entities, count: entities.length };
  };

  const query =
    'What was the trade relationship between the Roman Empire and the Han Dynasty in 100 AD?';

  console.log('----------------------------------------------------------------');
  console.log('AGENTIC CONTEXT RESOLUTION TEST');
  console.log('----------------------------------------------------------------');
  console.log(`QUERY: "${query}"`);
  console.log('----------------------------------------------------------------');

  try {
    const result = await client.resolveAgenticContext(query, registry);

    console.log('\n[CONTEXT PACKET GENERATED]\n');
    console.log(JSON.stringify(result, null, 2));

    // Verification Logic
    const hasTemporalAnchor = result.temporal_anchor?.includes('100');
    const hasRome = result.entities.some((e) => e.title === 'Roman Empire');
    const hasHan = result.entities.some((e) => e.title === 'Han Dynasty');
    const hasTradeRole = result.graph_facts.some(
      (f) => f.includes('CONSUMER') || f.includes('PRODUCER'),
    );

    console.log('\n----------------------------------------------------------------');
    console.log('VERIFICATION RESULTS');
    console.log('----------------------------------------------------------------');
    console.log(`1. Temporal Anchor Identified (100 AD): ${hasTemporalAnchor ? 'PASS' : 'FAIL'}`);
    console.log(`2. Entity 'Roman Empire' Found:         ${hasRome ? 'PASS' : 'FAIL'}`);
    console.log(`3. Entity 'Han Dynasty' Found:          ${hasHan ? 'PASS' : 'FAIL'}`);
    console.log(`4. Trade Roles Resolved (Hub Context):  ${hasTradeRole ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runTest();
