import { MCPScannerClient } from '../core/services/MCPScannerClient';
import { NexusCategory } from '../core/types/enums';

async function runExtractionTest() {
  const client = new MCPScannerClient();

  console.log('Connecting to MCP Scanner (Real Modules + Proxy AI)...');
  try {
    await client.connect();
  } catch (e) {
    console.error('Connection failed. Make sure BACKEND_URL is set correctly.');
    return;
  }

  const text = `
    In the early 2nd century AD, the Roman Empire reached its territorial peak under the rule of Emperor Trajan. 
    To the east, the Parthian Empire remained a powerful rival, particularly in the borderlands of Armenia and Mesopotamia. 
    Further still, the Kushan Empire flourished as a center of trade and culture, facilitating the flow of goods 
    along the Silk Road between the Roman West and the Han Dynasty in the East. 
    `;

  console.log('----------------------------------------------------------------');
  console.log('EXTRACTION TEST');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:');
  console.log(text.trim());
  console.log('----------------------------------------------------------------');

  try {
    console.log('Running extraction (sending to AI proxy)...');
    const result = await client.scanText(text);

    console.log('\n[EXTRACTION RESULT]\n');
    console.log(`Batch ID: ${result.batch_id}`);
    console.log(`Entities Detected: ${result.entity_count}`);
    console.log(`Links Extracted: ${result.link_count}`);

    console.log('\nOPERATIONS SUMMARY:');
    result.operations.forEach((op, i) => {
      if (op.op === 'CREATE' && op.entity) {
        const ent = op.entity as any;
        const category = ent.category_id || ent.category || 'UNKNOWN';
        console.log(`[${i}] CREATE ${category}: "${ent.title}"`);
        console.log(`    - Gist: ${ent.gist}`);
        console.log(`    - Prose: ${ent.prose_content || '(empty)'}`);
      } else if (op.op === 'LINK' && op.link) {
        const lk = op.link as any;
        const src = lk.source_id || 'unknown';
        const tgt = lk.target_id || 'unknown';
        const verb = lk.verb || lk.global_verb || 'relates to';
        console.log(`[${i}] LINK: ${src} -> ${verb} -> ${tgt}`);
      } else {
        console.log(`[${i}] ${op.op} (No entity/link details)`);
      }
    });

    // Validation
    const hasMultiple = result.entity_count > 1;
    const hasProse = result.operations.some(
      (op) => op.op === 'CREATE' && (op.entity as any)?.prose_content?.length > 20,
    );

    console.log('\n----------------------------------------------------------------');
    console.log(`VERIFICATION: Multiple entities created?   ${hasMultiple ? 'PASS' : 'FAIL'}`);
    console.log(`VERIFICATION: Prose content populated?     ${hasProse ? 'PASS' : 'FAIL'}`);
    console.log('----------------------------------------------------------------');
  } catch (error) {
    console.error('Extraction Failed:', error);
  }
}

runExtractionTest();
