import { MCPScannerClient } from '../core/services/MCPScannerClient';
import { NexusCategory } from '../core/types/enums';

async function runTemporalTest() {
  const client = new MCPScannerClient();

  console.log('Connecting to MCP Scanner...');
  try {
    await client.connect();
  } catch (e) {
    console.error('Connection failed.');
    return;
  }

  const text = `
    The Roman Republic (509 BC - 27 BC) and Ptolemaic Egypt (305 BC - 30 BC) shared a complex relationship. 
    From 51 BC to 31 BC, they operated as powerful allies and trading partners. 
    However, following the Battle of Actium in 31 BC, the political landscape shifted. 
    In 30 BC, Octavian completed the conquest of Egypt, formally annexing it. 
    From 30 BC until the fall of the West, Egypt was a province of the Roman Empire.
    `;

  console.log('----------------------------------------------------------------');
  console.log('TEMPORAL EXTRACTION TEST');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:');
  console.log(text.trim());
  console.log('----------------------------------------------------------------');

  try {
    console.log('Running extraction...');
    const result = await client.scanText(text);

    console.log('\n[EXTRACTION RESULT]\n');
    console.log(`Entities Detected: ${result.entity_count}`);
    console.log(`Links Extracted: ${result.link_count}`);

    console.log('\nOPERATIONS SUMMARY:');
    result.operations.forEach((op, i) => {
      const ent = (op.entity || op.link) as any;
      const time = ent?.time_state
        ? ` [${ent.time_state.effective_date.year} to ${ent.time_state.valid_until?.year || '...'}]`
        : ' [Timeless]';

      if (op.op === 'CREATE') {
        console.log(`[${i}] CREATE ${ent.category_id}: "${ent.title}"${time}`);
      } else if (op.op === 'LINK' || op.op === 'LINK_EXISTING') {
        const src = ent.source_id || 'unknown';
        const tgt = ent.target_id || 'unknown';
        const verb = ent.verb || 'relates to';
        const type = ent.hierarchy_type ? 'HIERARCHICAL' : 'BINARY';
        console.log(`[${i}] LINK (${type}): ${src} -> ${verb} -> ${tgt}${time}`);
      }
    });

    // Validation
    const hasTimeEntities = result.operations.some(
      (op) => op.op === 'CREATE' && (op.entity as any).time_state,
    );
    const hasTimeLinks = result.operations.some(
      (op) => (op.op === 'LINK' || op.op === 'LINK_EXISTING') && (op.link as any).time_state,
    );
    const hasHierarchical = result.operations.some(
      (op) =>
        (op.op === 'LINK' || op.op === 'LINK_EXISTING') &&
        (op.link as any)._type === 'HIERARCHICAL_LINK',
    );

    console.log('\n----------------------------------------------------------------');
    console.log(`1. Time States Found on Entities:   ${hasTimeEntities ? 'PASS' : 'FAIL'}`);
    console.log(`2. Time States Found on Links:      ${hasTimeLinks ? 'PASS' : 'FAIL'}`);
    console.log(`3. Hierarchical Linkage Detected:   ${hasHierarchical ? 'PASS' : 'FAIL'}`);
    console.log('----------------------------------------------------------------');
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runTemporalTest();
