import { createAIClient } from '../mcp-server/core/ai-client';
import { runExtraction } from '../mcp-server/core/extraction-pipeline';
import { NexusType, NexusCategory, HierarchyType } from '../core/types/enums';
import type { Registry } from '../core/types/entities';
import { createM2MHub } from '../mcp-server/core/graph-assembler';

async function runComplexM2MTest() {
  process.env.BACKEND_URL = 'https://backendproxy-412518375747.us-central1.run.app';
  const aiClient = createAIClient();

  // 1. Pre-seeded Registry (Civil War Theme)
  const usaId = 'usa-soul';
  const csaId = 'csa-soul';
  const potomacId = 'potomac-army';
  const anvId = 'northern-va-army';

  const registry: Registry = {
    [usaId]: {
      id: usaId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'United States of America',
      category_id: NexusCategory.ORGANIZATION,
      link_ids: ['link-usa-potomac'],
      aliases: [],
      tags: [],
      gist: 'The United States.',
      prose_content: 'Union forces.',
      internal_weight: 1,
      total_subtree_mass: 0,
      children_ids: [],
    } as any,
    [potomacId]: {
      id: potomacId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Army of the Potomac',
      category_id: NexusCategory.ORGANIZATION,
      link_ids: ['link-usa-potomac'],
      aliases: [],
      tags: [],
      gist: 'Main Union army.',
      prose_content: 'Led by various generals.',
      internal_weight: 1,
      total_subtree_mass: 0,
      children_ids: [],
    } as any,
    'link-usa-potomac': {
      id: 'link-usa-potomac',
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: usaId,
      target_id: potomacId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      link_ids: [],
    } as any,
    [csaId]: {
      id: csaId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Confederate States of America',
      category_id: NexusCategory.ORGANIZATION,
      link_ids: ['link-csa-anv'],
      aliases: [],
      tags: [],
      gist: 'The Confederacy.',
      prose_content: 'Confederate forces.',
      internal_weight: 1,
      total_subtree_mass: 0,
      children_ids: [],
    } as any,
    [anvId]: {
      id: anvId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Army of Northern Virginia',
      category_id: NexusCategory.ORGANIZATION,
      link_ids: ['link-csa-anv'],
      aliases: [],
      tags: [],
      gist: 'Main Confederate army.',
      prose_content: 'Led by Robert E. Lee.',
      internal_weight: 1,
      total_subtree_mass: 0,
      children_ids: [],
    } as any,
    'link-csa-anv': {
      id: 'link-csa-anv',
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: csaId,
      target_id: anvId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      link_ids: [],
    } as any,
  };

  const text = `
The Army of the Potomac commanded its elite units, the 20th Maine, the 1st Minnesota, and the Irish Brigade, to defend the ridge against the oncoming storm. 
The Army of Northern Virginia deployed the 26th North Carolina and the 1st Texas to lead the assault. 

In the climactic Battle of Gettysburg, these five regiments—the 20th Maine, the 1st Minnesota, the Irish Brigade, the 26th North Carolina, and the 1st Texas—engaged in a bloody struggle that determined the fate of the nation.
    `.trim();

  console.log('----------------------------------------------------------------');
  console.log('COMPLEX CIVIL WAR M2M TEST: NESTED REGIMENTS & BATTLE HUB');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:\n' + text);
  console.log('----------------------------------------------------------------');
  console.log('Running extraction with pre-seeded registry...');

  const result = await runExtraction({
    text,
    aiClient,
    registry,
  });

  console.log('\n[EXTRACTION RESULT]\n');

  const m2mOps = result.operations.filter(
    (op) => op.op === 'LINK' && (op.link as any).participants,
  );
  const gettysburgHub = m2mOps.find((op) => (op.link as any).title?.includes('Gettysburg'))
    ?.link as any;

  // Check for hierarchical links: Army (source) -> Regiment (target)
  const maineNode = result.operations.find(
    (op) => op.op === 'CREATE' && op.entity?.title?.includes('20th Maine'),
  )?.entity;
  const minnesotaNode = result.operations.find(
    (op) => op.op === 'CREATE' && op.entity?.title?.includes('1st Minnesota'),
  )?.entity;
  const irishNode = result.operations.find(
    (op) => op.op === 'CREATE' && op.entity?.title?.includes('Irish Brigade'),
  )?.entity;
  const carolinaNode = result.operations.find(
    (op) => op.op === 'CREATE' && op.entity?.title?.includes('26th North Carolina'),
  )?.entity;
  const texasNode = result.operations.find(
    (op) => op.op === 'CREATE' && op.entity?.title?.includes('1st Texas'),
  )?.entity;

  const potomacLinkCount = result.operations.filter(
    (op) =>
      (op.op === 'LINK' || op.op === 'LINK_EXISTING') &&
      'source_id' in op.link &&
      op.link.source_id === potomacId &&
      (op.link.target_id === maineNode?.id ||
        op.link.target_id === minnesotaNode?.id ||
        op.link.target_id === irishNode?.id),
  ).length;

  const anvLinkCount = result.operations.filter(
    (op) =>
      (op.op === 'LINK' || op.op === 'LINK_EXISTING') &&
      'source_id' in op.link &&
      op.link.source_id === anvId &&
      (op.link.target_id === carolinaNode?.id || op.link.target_id === texasNode?.id),
  ).length;

  if (gettysburgHub) {
    console.log(`BATTLE HUB FOUND: "${gettysburgHub.title}"`);
    console.log(`Total Participants: ${gettysburgHub.participants.length}`);
    gettysburgHub.participants.forEach((p: any) => {
      const node = result.operations.find((op) => op.op === 'CREATE' && op.entity?.id === p.node_id)
        ?.entity || { title: p.node_id };
      console.log(`  - Participant: ${node.title} | Role: ${p.role_id} | Verb: ${p.verb}`);
    });
  }

  console.log('\nOPERATIONS SUMMARY:');
  result.operations.forEach((op, i) => {
    if (op.op === 'CREATE' && op.entity) {
      console.log(`[${i}] CREATE ${op.entity._type}: "${(op.entity as any).title}"`);
    } else if (op.op === 'LINK' || op.op === 'LINK_EXISTING') {
      const l = op.link as any;
      if (l.participants) {
        console.log(`[${i}] ${op.op} (M2M): ${l.title} [${l.participants.length} participants]`);
      } else {
        console.log(
          `[${i}] ${op.op} (Binary/Hier): ${(l.source_id || '').slice(0, 8)} -> ${l.verb} -> ${(l.target_id || '').slice(0, 8)}`,
        );
      }
    }
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`1. Battle Hub Created (Gettysburg): ${gettysburgHub ? 'PASS' : 'FAIL'}`);
  console.log(
    `2. 5+ Participants in Hub:        ${gettysburgHub?.participants.length >= 5 ? 'PASS' : 'FAIL'} (${gettysburgHub?.participants.length || 0})`,
  );
  console.log(
    `3. Potomac Army Hierarchy Links:    ${potomacLinkCount >= 2 ? 'PASS' : 'FAIL'} (${potomacLinkCount})`,
  );
  console.log(
    `4. ANV Army Hierarchy Links:        ${anvLinkCount >= 1 ? 'PASS' : 'FAIL'} (${anvLinkCount})`,
  );

  // Manual code-level check: Can createM2MHub handle 3+?
  const manualHub = createM2MHub({
    title: 'Manual Test Hub',
    global_verb: 'TEST',
    participants: [
      { node_id: '1', role_id: 'A' },
      { node_id: '2', role_id: 'B' },
      { node_id: '3', role_id: 'C' },
    ],
  });
  console.log(
    `5. Code-level 3+ Participant Hub: ${manualHub.participants.length === 3 ? 'PASS' : 'FAIL'} (${manualHub.participants.length})`,
  );
  console.log('----------------------------------------------------------------');
}

runComplexM2MTest().catch(console.error);
