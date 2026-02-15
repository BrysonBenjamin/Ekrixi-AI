import { MCPScannerClient } from '../core/services/MCPScannerClient';
import { createAIClient } from '../mcp-server/core/ai-client';
import { BatchStore } from '../mcp-server/core/batch-store';

async function runPurityTest() {
  console.log('Connecting to MCP Scanner...');

  const aiClient = createAIClient();
  const scanner = new MCPScannerClient();
  await scanner.connect({
    ai: aiClient,
    extractionPipeline: await import('../mcp-server/core/extraction-pipeline'),
    batchStore: { BatchStore },
  });

  const text = `
Julius Caesar was born in 100 BC into a world of shifting power. 
As a young boy (100 BC - 80 BC), he was defined by a quiet but intense curiosity and a refusal to bow to the expectations of his peers, showing a resilient spirit even in his early studies. 
By the time he reached his rising years (80 BC - 60 BC), this resilience had transformed into a relentless, burning ambition. He was charismatic and silver-tongued, capable of holding a room with nothing but the weight of his convictions, though many noted a cold calculation behind his eyes. 
Finally, in his years as Dictator (49 BC - 44 BC), the charm had hardened into an absolute, unyielding authority. He was viewed as a man of singular purpose, whose shadow fell long across all who knew him, possessed of a strategic brilliance that bordered on the divine, yet increasingly isolated by his own greatness.
    `.trim();

  console.log('----------------------------------------------------------------');
  console.log('PURITY TEST: CAESAR CHARACTER EVOLUTION');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:');
  console.log(text);
  console.log('----------------------------------------------------------------');
  console.log('Running extraction...');

  const result = await scanner.scanText(text);

  console.log('\n[EXTRACTION RESULT]\n');
  console.log(`Entities Detected: ${result.entity_count}`);
  console.log(`Links Extracted: ${result.link_count}`);

  console.log('\nOPERATIONS SUMMARY:');
  result.operations.forEach((op, i) => {
    if (op.op === 'CREATE' && op.entity && 'title' in op.entity) {
      const time = op.entity.time_state
        ? `[${op.entity.time_state.effective_date.year} to ${op.entity.time_state.valid_until?.year || '...'}]`
        : '[Timeless]';
      console.log(`[${i}] CREATE ${op.entity._type}: "${op.entity.title}" ${time}`);
    } else if (op.op === 'LINK' && op.link) {
      console.log(`[${i}] LINK: ${op.link.source_id} -> ${op.link.verb} -> ${op.link.target_id}`);
    }
  });

  // Verification Logic
  const entities = result.operations
    .filter((op) => op.op === 'CREATE')
    .map((op) => (op.entity as any).title);

  const noiseEntities = entities.filter((t) =>
    ['Ambition', 'Curiosity', 'Resilience', 'Authority', 'Brilliance'].includes(t),
  );

  const hasCaesarParent = entities.some(
    (t) => t.toLowerCase() === 'julius caesar' || t.toLowerCase() === 'caesar',
  );

  console.log('\n----------------------------------------------------------------');
  console.log(
    `1. Focus Score (Caesar vs Noise):  ${noiseEntities.length === 0 ? 'PASS' : 'FAIL'} (${noiseEntities.length} noise items)`,
  );
  console.log(`2. Identity Promotion Found:      ${hasCaesarParent ? 'PASS' : 'FAIL'}`);
  console.log('----------------------------------------------------------------');
}

runPurityTest().catch(console.error);
