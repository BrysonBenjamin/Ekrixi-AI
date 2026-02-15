// ============================================================
// Schema v2 Validation Test Script
// ============================================================
// Run with: npx tsx src/core/services/__tests__/test_schema_validation.ts
// ============================================================

import { SchemaValidationService } from '../SchemaValidationService';
import {
  NexusNote,
  NexusLink,
  NexusHierarchicalLink,
  AggregatedHierarchicalLink,
  NexusObject,
  NexusTimeState,
} from '../../types';
import { NexusType, NexusCategory, HierarchyType } from '../../types/enums';

// ============================================================
// Helpers
// ============================================================

const makeNote = (id: string, overrides: Partial<NexusNote> = {}): NexusNote => ({
  id,
  _type: NexusType.SIMPLE_NOTE,
  title: id,
  aliases: [],
  tags: [],
  gist: '',
  prose_content: '',
  category_id: NexusCategory.CONCEPT,
  is_ghost: false,
  internal_weight: 1,
  total_subtree_mass: 0,
  created_at: '',
  last_modified: '',
  link_ids: [],
  ...overrides,
});

const makeLink = (id: string, sourceId: string, targetId: string): NexusLink => ({
  id,
  _type: NexusType.SIMPLE_LINK,
  source_id: sourceId,
  target_id: targetId,
  verb: 'related to',
  verb_inverse: 'related to',
  internal_weight: 1,
  total_subtree_mass: 0,
  created_at: '',
  last_modified: '',
  link_ids: [],
});

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

// ============================================================
// Test 1: time_children range validation — VALID case
// ============================================================
console.log('\n🧪 Test 1: Valid time_children ranges (flat-tree model)');
{
  const parentA = makeNote('A', {
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 1 },
      valid_until: { year: 500 },
      time_children: ['B', 'C'],
    },
  });
  const childB = makeNote('B', {
    time_state: {
      is_historical_snapshot: true,
      parent_identity_id: 'A',
      effective_date: { year: 1 },
      valid_until: { year: 50 },
      time_children: ['C'],
    },
  });
  const childC = makeNote('C', {
    time_state: {
      is_historical_snapshot: true,
      parent_identity_id: 'A',
      effective_date: { year: 1 },
      valid_until: { year: 25 },
    },
  });
  const registry: Record<string, NexusObject> = { A: parentA, B: childB, C: childC };
  const errors = SchemaValidationService.validateRegistry(registry);
  assert(errors.length === 0, 'No errors for valid flat-tree time_children');
}

// ============================================================
// Test 2: time_children range violation — child out of range
// ============================================================
console.log('\n🧪 Test 2: time_child outside parent range');
{
  const parent = makeNote('P', {
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 100 },
      valid_until: { year: 200 },
      time_children: ['X'],
    },
  });
  const outOfRange = makeNote('X', {
    time_state: {
      is_historical_snapshot: true,
      parent_identity_id: 'P',
      effective_date: { year: 300 },
    },
  });
  const registry: Record<string, NexusObject> = { P: parent, X: outOfRange };
  const errors = SchemaValidationService.validateRegistry(registry);
  const rangeError = errors.find((e) => e.rule === 'TIME_CHILD_START_IN_RANGE');
  assert(rangeError !== undefined, 'Detects child effective_date outside parent range');
}

// ============================================================
// Test 3: time_child valid_until exceeds parent
// ============================================================
console.log('\n🧪 Test 3: time_child valid_until exceeds parent range');
{
  const parent = makeNote('P2', {
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 1 },
      valid_until: { year: 100 },
      time_children: ['Y'],
    },
  });
  const child = makeNote('Y', {
    time_state: {
      is_historical_snapshot: true,
      parent_identity_id: 'P2',
      effective_date: { year: 50 },
      valid_until: { year: 200 }, // Exceeds parent's 100
    },
  });
  const registry: Record<string, NexusObject> = { P2: parent, Y: child };
  const errors = SchemaValidationService.validateRegistry(registry);
  const endError = errors.find((e) => e.rule === 'TIME_CHILD_END_IN_RANGE');
  assert(endError !== undefined, 'Detects child valid_until exceeding parent range');
}

// ============================================================
// Test 4: AggregatedHierarchicalLink — valid (not a snapshot)
// ============================================================
console.log('\n🧪 Test 4: AggregatedHierarchicalLink valid (parent identity)');
{
  const aggHier: AggregatedHierarchicalLink = {
    id: 'agg-h-1',
    _type: NexusType.AGGREGATED_HIERARCHICAL_LINK,
    source_id: 's',
    target_id: 't',
    verb: 'governs',
    verb_inverse: 'governed by',
    hierarchy_type: HierarchyType.PARENT_OF,
    is_reified: true,
    title: 'Governance',
    aliases: [],
    tags: [],
    gist: '',
    prose_content: '',
    category_id: NexusCategory.CONCEPT,
    is_ghost: false,
    internal_weight: 1,
    total_subtree_mass: 0,
    created_at: '',
    last_modified: '',
    link_ids: [],
  };
  const registry: Record<string, NexusObject> = { 'agg-h-1': aggHier };
  const errors = SchemaValidationService.validateRegistry(registry);
  const aggError = errors.find((e) => e.rule === 'AGG_HIER_NOT_SNAPSHOT');
  assert(aggError === undefined, 'No error for parent-identity AggregatedHierarchicalLink');
}

// ============================================================
// Test 5: AggregatedHierarchicalLink — INVALID (is a snapshot)
// ============================================================
console.log('\n🧪 Test 5: AggregatedHierarchicalLink rejected for snapshots');
{
  const aggHierSnapshot: AggregatedHierarchicalLink = {
    id: 'agg-h-bad',
    _type: NexusType.AGGREGATED_HIERARCHICAL_LINK,
    source_id: 's',
    target_id: 't',
    verb: 'governs',
    verb_inverse: 'governed by',
    hierarchy_type: HierarchyType.PARENT_OF,
    is_reified: true,
    title: 'Governance (2150)',
    aliases: [],
    tags: [],
    gist: '',
    prose_content: '',
    category_id: NexusCategory.STATE,
    is_ghost: false,
    internal_weight: 1,
    total_subtree_mass: 0,
    created_at: '',
    last_modified: '',
    link_ids: [],
    time_state: {
      is_historical_snapshot: true,
      parent_identity_id: 'agg-h-1',
      effective_date: { year: 2150 },
    },
  };
  const registry: Record<string, NexusObject> = { 'agg-h-bad': aggHierSnapshot };
  const errors = SchemaValidationService.validateRegistry(registry);
  const aggError = errors.find((e) => e.rule === 'AGG_HIER_NOT_SNAPSHOT');
  assert(aggError !== undefined, 'Error raised when AggregatedHierarchicalLink is a snapshot');
}

// ============================================================
// Test 6: Snapshot without parent_identity_id
// ============================================================
console.log('\n🧪 Test 6: Snapshot must have parent_identity_id');
{
  const orphanSnapshot = makeNote('orphan', {
    time_state: {
      is_historical_snapshot: true,
      effective_date: { year: 2100 },
      // parent_identity_id intentionally missing
    },
  });
  const registry: Record<string, NexusObject> = { orphan: orphanSnapshot };
  const errors = SchemaValidationService.validateRegistry(registry);
  const parentError = errors.find((e) => e.rule === 'SNAPSHOT_HAS_PARENT');
  assert(parentError !== undefined, 'Error raised for snapshot without parent_identity_id');
}

// ============================================================
// Test 7: valid_until before effective_date
// ============================================================
console.log('\n🧪 Test 7: valid_until must be after effective_date');
{
  const reversed = makeNote('rev', {
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 2200 },
      valid_until: { year: 2100 },
    },
  });
  const registry: Record<string, NexusObject> = { rev: reversed };
  const errors = SchemaValidationService.validateRegistry(registry);
  const dateError = errors.find((e) => e.rule === 'VALID_UNTIL_AFTER_START');
  assert(dateError !== undefined, 'Error raised for reversed date range');
}

// ============================================================
// Test 8: Story fields on non-STORY_NOTE
// ============================================================
console.log('\n🧪 Test 8: Story fields should only be on STORY_NOTE');
{
  const badNote = makeNote('bad-story', {
    _type: NexusType.SIMPLE_NOTE,
    story_type: 'SCENE' as any,
    sequence_index: 5,
  });
  const registry: Record<string, NexusObject> = { 'bad-story': badNote };
  const errors = SchemaValidationService.validateRegistry(registry);
  const storyErrors = errors.filter((e) => e.rule === 'STORY_FIELDS_ON_STORY_ONLY');
  assert(storyErrors.length >= 2, 'Warnings raised for story fields on non-STORY_NOTE');
}

// ============================================================
// Test 9: Links with time_state (T2 temporal link)
// ============================================================
console.log('\n🧪 Test 9: Links with time_state are valid (T2)');
{
  const temporalLink: NexusLink = {
    ...makeLink('tl-1', 'a', 'b'),
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 2100 },
      valid_until: { year: 2200 },
    },
  };
  const registry: Record<string, NexusObject> = { 'tl-1': temporalLink };
  const errors = SchemaValidationService.validateRegistry(registry);
  assert(errors.length === 0, 'No errors for a valid temporal link');
}

// ============================================================
// Test 10: Missing time_child in registry
// ============================================================
console.log('\n🧪 Test 10: Missing time_child reference');
{
  const parent = makeNote('parent-missing', {
    time_state: {
      is_historical_snapshot: false,
      effective_date: { year: 1 },
      valid_until: { year: 500 },
      time_children: ['ghost-child'],
    },
  });
  const registry: Record<string, NexusObject> = { 'parent-missing': parent };
  const errors = SchemaValidationService.validateRegistry(registry);
  const missingError = errors.find((e) => e.rule === 'TIME_CHILD_EXISTS');
  assert(missingError !== undefined, 'Error raised for time_child not in registry');
}

// ============================================================
// Summary
// ============================================================
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
