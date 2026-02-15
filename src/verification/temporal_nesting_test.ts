import { createAIClient } from '../mcp-server/core/ai-client';
import { runExtraction } from '../mcp-server/core/extraction-pipeline';
import { NexusType, NexusCategory, HierarchyType } from '../core/types/enums';

async function runTemporalNestingTest() {
  process.env.BACKEND_URL = 'https://backendproxy-412518375747.us-central1.run.app';
  const aiClient = createAIClient();

  const text = `
Bryson Benjamin's academic journey was meticulously documented. 
He attended Benjamin Elementary from 2010 to 2016, a period of foundational growth. 
This was followed by his years at Crestview Middle School between 2016 and 2019. 
Finally, he entered North High School in 2019, where he remained until 2023. 

A highlight of his high school experience was Spirit Week in October 2021. 
Within that week, Monday Mismatch Day (Oct 18, 2021), Wednesday Workout Day (Oct 20, 2021), and Friday Formal Day (Oct 22, 2021) were particularly memorable.
    `.trim();

  console.log('----------------------------------------------------------------');
  console.log('TEMPORAL NESTING TEST: SCHOOL LIFE & EVENT HIERARCHY');
  console.log('----------------------------------------------------------------');
  console.log('TEXT BLOCK:\n' + text);
  console.log('----------------------------------------------------------------');
  console.log('Running extraction...');

  const result = await runExtraction({
    text,
    aiClient,
  });

  console.log('\n[EXTRACTION RESULT]\n');

  // 1. Verify Entity Creation
  const findEntity = (title: string) => {
    const op = result.operations.find((op) => {
      if (op.op === 'CREATE' && (op.entity as any)?.title?.includes(title)) return true;
      if (
        (op.op === 'LINK' || op.op === 'LINK_EXISTING') &&
        (op.link as any)?.is_reified &&
        (op.link as any)?.title?.includes(title)
      )
        return true;
      return false;
    });
    return op?.op === 'CREATE' ? op.entity : (op?.link as any);
  };

  const brysonNode = findEntity('Bryson Benjamin');
  const elementaryNode = findEntity('Elementary');
  const middleNode = findEntity('Middle');
  const highNode = findEntity('High School');
  const spiritWeekNode = findEntity('Spirit Week');

  // Special Days
  const mismatchNode = findEntity('Mismatch');
  const workoutNode = findEntity('Workout');
  const formalNode = findEntity('Formal');

  console.log('ENTITIES FOUND:');
  [
    brysonNode,
    elementaryNode,
    middleNode,
    highNode,
    spiritWeekNode,
    mismatchNode,
    workoutNode,
    formalNode,
  ].forEach((node) => {
    if (node) {
      const n = node as any;
      const t = n.time_state;
      const start = t?.effective_date
        ? `${t.effective_date.year}-${t.effective_date.month || 1}-${t.effective_date.day || 1}`
        : 'N/A';
      const end = t?.valid_until
        ? `${t.valid_until.year}-${t.valid_until.month || 12}-${t.valid_until.day || 31}`
        : 'N/A';
      console.log(`- ${n.title} (${n.category_id}) | Range: ${start} to ${end}`);
    } else {
      console.log(`- MISSING ENTITY detected in find logic.`);
    }
  });

  // 2. Verify Hierarchical Links
  const checkLink = (src: any, tgt: any, mustBeHierarchical: boolean) => {
    if (!src || !tgt) return false;
    const links = result.operations.filter((op) => op.op === 'LINK' || op.op === 'LINK_EXISTING');
    const link = (
      links.find((op) => {
        const l = op.link as any;
        return (
          (l.source_id === src.id && l.target_id === tgt.id) ||
          (l.source_id === src.id && l.id === tgt.id)
        ); // Handle reified targets
      }) as any
    )?.link;

    if (!link) {
      console.log(`[CheckLink] No link found: ${src.title} -> ${tgt.title}`);
      return false;
    }

    const isHier =
      link._type === NexusType.HIERARCHICAL_LINK ||
      link._type === NexusType.AGGREGATED_HIERARCHICAL_LINK;
    if (isHier !== mustBeHierarchical) {
      console.log(
        `[CheckLink] Type Mismatch: ${src.title} -> ${tgt.title} (Expected Hier: ${mustBeHierarchical}, Found Hier: ${isHier}, Type: ${link._type})`,
      );
    }
    return isHier === mustBeHierarchical;
  };

  // Bryson -> School is usually a standard link ('attended'), but High School -> Spirit Week is hierarchical.
  const linkPersonElem = checkLink(brysonNode, elementaryNode, false);
  const linkPersonMiddle = checkLink(brysonNode, middleNode, false);
  const linkPersonHigh = checkLink(brysonNode, highNode, false);

  // REALITY VS EXPERIENCE LAW:
  // Event (Spirit Week) must be parented to Objective Reality (High School), NOT the Person.
  const linkHighWeek = checkLink(highNode, spiritWeekNode, true);
  const linkPersonWeekHier = checkLink(brysonNode, spiritWeekNode, true); // Should be false
  const linkPersonWeekBinary = checkLink(brysonNode, spiritWeekNode, false); // Should be true

  const linkWeekMonday = checkLink(spiritWeekNode, mismatchNode, true);
  const linkWeekWed = checkLink(spiritWeekNode, workoutNode, true);
  const linkWeekFri = checkLink(spiritWeekNode, formalNode, true);

  console.log('\nGUIDELINE VALIDATION:');
  console.log(`- Bryson -> Elementary (Binary):  ${linkPersonElem ? 'PASS' : 'FAIL'}`);
  console.log(`- Bryson -> High School (Binary): ${linkPersonHigh ? 'PASS' : 'FAIL'}`);
  console.log(`- High School -> Spirit Week (Hier): ${linkHighWeek ? 'PASS' : 'FAIL'}`);
  console.log(
    `- Bryson -> Spirit Week (Hier):    ${!linkPersonWeekHier ? 'PASS (Rule 1: Person cannot parent Event)' : 'FAIL (Solipsism Detected)'}`,
  );
  console.log(`- Bryson -> Spirit Week (Binary):  ${linkPersonWeekBinary ? 'PASS' : 'FAIL'}`);
  console.log(`- Week   -> Monday (Hier):      ${linkWeekMonday ? 'PASS' : 'FAIL'}`);

  console.log('\nOPERATIONS SUMMARY:');
  result.operations.forEach((op, i) => {
    if (op.link) {
      const l = op.link as any;
      if (l.participants) {
        const pList = l.participants.map((p: any) => p.node_id?.slice(0, 8)).join(', ');
        console.log(`[${i}] LINK (Hub): "${l.title}" | Participants: [${pList}]`);
      } else if (l.is_hierarchical || l._type === NexusType.HIERARCHICAL_LINK) {
        console.log(
          `[${i}] LINK (Hier): ${l.source_id?.slice(0, 8)} -> ${l.verb} -> ${l.target_id?.slice(0, 8)}`,
        );
      } else {
        console.log(
          `[${i}] LINK (Binary): ${l.source_id?.slice(0, 8)} -> ${l.verb} -> ${l.target_id?.slice(0, 8)}`,
        );
      }
    } else {
      console.log(`[${i}] ${op.op} ${op.entity?._type || 'NODE'}: "${(op.entity as any)?.title}"`);
    }
  });

  console.log('\n----------------------------------------------------------------');
  const allPassed = linkPersonElem && linkPersonHigh && linkHighWeek && linkWeekMonday;
  console.log(`FINAL RESULT: ${allPassed ? 'SUCCESS' : 'PARTIAL'}`);
  console.log('----------------------------------------------------------------');
}

runTemporalNestingTest().catch(console.error);
