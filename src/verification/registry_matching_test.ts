import { createAIClient } from '../mcp-server/core/ai-client';
import { runExtraction } from '../mcp-server/core/extraction-pipeline';
import { NexusCategory, NexusType } from '../core/types/enums';
import { BatchStore } from '../mcp-server/core/batch-store';

async function runRegistryMatchingTest() {
  process.env.BACKEND_URL = 'https://backendproxy-412518375747.us-central1.run.app';
  const aiClient = createAIClient();

  // 1. Create a fake registry with "Rome"
  const registry: any = {
    'existing-rome-id': {
      id: 'existing-rome-id',
      _type: NexusType.SIMPLE_NOTE,
      title: 'Rome',
      category_id: NexusCategory.ORGANIZATION,
      gist: 'The heart of the ancient world.',
      aliases: ['The Eternal City'],
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
    },
  };

  const text = `
The Roman Republic (509 BC - 27 BC) and Ptolemaic Egypt (305 BC - 30 BC) shared a complex relationship. 
Following the Battle of Actium in 31 BC, the political landscape shifted. 
In 30 BC, Octavian completed the conquest of Egypt, formally annexing it. 
From 30 BC until the fall of the West, Egypt was a province of the Roman Empire.
    `.trim();

  console.log('----------------------------------------------------------------');
  console.log('REGISTRY MATCHING TEST');
  console.log('----------------------------------------------------------------');
  console.log('PRE-EXISTING NODES: "Rome" (existing-rome-id)');
  console.log('----------------------------------------------------------------');
  console.log('Running extraction...');

  const result = await runExtraction({
    text,
    aiClient,
    registry,
  });

  console.log('\n[EXTRACTION RESULT]\n');

  // Check for "Rome" creation (should NOT be created as a new Soul if matched)
  const newRomeSoul = result.operations.find(
    (op) =>
      op.op === 'CREATE' &&
      op.entity &&
      op.entity.title === 'Rome' &&
      op.entity.tags?.includes('identity-soul'),
  );

  // Check for "Egypt" creation (should be created as a new Soul)
  const newEgyptSoul = result.operations.find(
    (op) =>
      op.op === 'CREATE' &&
      op.entity &&
      op.entity.title === 'Egypt' &&
      op.entity.tags?.includes('identity-soul'),
  );

  // Check for snapshots linking to existing Rome
  const romeSnapshots = result.operations.filter(
    (op) => op.op === 'LINK' && op.link && op.link.source_id === 'existing-rome-id',
  );

  console.log('OPERATIONS SUMMARY:');
  result.operations.forEach((op, i) => {
    if (op.op === 'CREATE' && op.entity) {
      console.log(`[${i}] CREATE ${op.entity._type}: "${op.entity.title}"`);
    } else if (op.op === 'EXTEND' && op.target_id) {
      console.log(`[${i}] EXTEND: ${op.target_id}`);
    } else if (op.op === 'LINK' && op.link) {
      console.log(`[${i}] LINK: ${op.link.source_id} -> ${op.link.verb} -> ${op.link.target_id}`);
    }
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`1. Reused Existing Rome:          ${!newRomeSoul ? 'PASS' : 'FAIL'}`);
  console.log(
    `2. Snapshots Linked to Old Rome:  ${romeSnapshots.length > 0 ? 'PASS' : 'FAIL'} (${romeSnapshots.length} found)`,
  );
  console.log(`3. Created New Egypt Soul:       ${newEgyptSoul ? 'PASS' : 'FAIL'}`);
  console.log('----------------------------------------------------------------');
}

runRegistryMatchingTest().catch(console.error);
