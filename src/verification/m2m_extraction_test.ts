import { createAIClient } from '../mcp-server/core/ai-client';
import { runExtraction } from '../mcp-server/core/extraction-pipeline';
import { BatchStore } from '../mcp-server/core/batch-store';

async function runM2MTest() {
  process.env.BACKEND_URL = 'https://backendproxy-412518375747.us-central1.run.app';
  const aiClient = createAIClient();

  const text = `
The First Punic War (264 BC - 241 BC) was a massive conflict between the Roman Republic and the Carthaginian Empire. 
Rome sought control over Sicily, while Carthage fought to maintain its maritime hegemony. 
Hamilcar Barca emerged as a legendary Carthaginian general during the later stages of the conflict, leading successful guerrilla campaigns in Sicily.
    `.trim();

  console.log('----------------------------------------------------------------');
  console.log('M2M EXTRACTION TEST: THE FIRST PUNIC WAR');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:\n' + text);
  console.log('----------------------------------------------------------------');
  console.log('Running extraction...');

  const result = await runExtraction({
    text,
    aiClient,
  });

  console.log('\n[EXTRACTION RESULT]\n');

  // Filter for M2M hub operation
  const m2mOp = result.operations.find((op) => op.op === 'LINK' && (op.link as any).participants);
  const hub = m2mOp?.link as any;

  if (hub) {
    console.log(`M2M HUB FOUND: "${hub.title}" (${hub.global_verb})`);
    console.log(`Participants: ${hub.participants.length}`);
    hub.participants.forEach((p: any) => {
      console.log(`  - Node ID: ${p.node_id.slice(0, 8)} | Role: ${p.role_id} | Verb: ${p.verb}`);
    });

    if (hub.time_state) {
      console.log(
        `Time Range: ${hub.time_state.effective_date.year} to ${hub.time_state.valid_until?.year || '...'}`,
      );
    }
  } else {
    console.log('FAIL: No M2M Hub detected in operations.');
  }

  console.log('\nOPERATIONS SUMMARY:');
  result.operations.forEach((op, i) => {
    if (op.op === 'CREATE' && op.entity) {
      console.log(`[${i}] CREATE ${op.entity._type}: "${op.entity.title}"`);
    } else if (op.op === 'LINK' && op.link) {
      const l = op.link as any;
      if (l.participants) {
        console.log(`[${i}] LINK (M2M): ${l.title} [${l.participants.length} participants]`);
      } else {
        console.log(
          `[${i}] LINK (Binary): ${l.source_id.slice(0, 8)} -> ${l.verb} -> ${l.target_id.slice(0, 8)}`,
        );
      }
    }
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`1. M2M Hub Created:               ${hub ? 'PASS' : 'FAIL'}`);
  console.log(
    `2. >2 Participants Found:         ${hub?.participants.length >= 3 ? 'PASS' : 'FAIL'} (${hub?.participants.length || 0})`,
  );
  console.log(`3. Temporal Data Applied to Hub:  ${hub?.time_state ? 'PASS' : 'FAIL'}`);
  console.log('----------------------------------------------------------------');
}

runM2MTest().catch(console.error);
