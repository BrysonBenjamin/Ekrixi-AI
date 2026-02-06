import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';

const id1 = generateId(); // User: "Magic System"
const id2 = generateId(); // Bot: "Prism Lands"

// Branch A: User asks about Antagonists
const id3a = generateId();
const id4a = generateId();

// Branch B: User asks about Economy (The "Edit/Regenerate" version)
const id3b = generateId();
const id4b = generateId();

const map: Record<string, MessageNode> = {};

// 1. Root User Message
map[id1] = {
  id: id1,
  role: 'user',
  text: 'I want to design a world where magic is a finite resource that grows in crystalline structures.',
  parentId: null,
  childrenIds: [id2],
  selectedChildId: id2,
  createdAt: new Date(Date.now() - 100000000).toISOString(),
};

// 2. Bot Response
map[id2] = {
  id: id2,
  role: 'model',
  text: "**World Concept: The Prism Lands**\n\nIn this reality, magic does not flow; it grows. Known as 'Aether-Quartz', these crystals sprout from ley lines deep within the crust. \n\n**Core Rules:**\n1. **Extraction:** Mages are effectively miners and geologists.\n2. **Depletion:** Using magic shatters the crystal, turning it into useless dust.\n3. **Economy:** Wars are fought over geologically active fault lines where crystals grow fastest.",
  parentId: id1,
  childrenIds: [id3a, id3b], // Has two children (User branched here)
  selectedChildId: id3b, // Currently viewing Branch B
  createdAt: new Date(Date.now() - 99000000).toISOString(),
};

// --- BRANCH A (The older path) ---
map[id3a] = {
  id: id3a,
  role: 'user',
  text: 'Who are the antagonists?',
  parentId: id2,
  childrenIds: [id4a],
  selectedChildId: id4a,
  createdAt: new Date(Date.now() - 80000000).toISOString(),
};

map[id4a] = {
  id: id4a,
  role: 'model',
  text: '**The Silica Ascendancy**\n\nA religious technocratic order that believes consuming the crystals allows one to become a being of pure light.',
  parentId: id3a,
  childrenIds: [],
  selectedChildId: null,
  createdAt: new Date(Date.now() - 79000000).toISOString(),
};

// --- BRANCH B (The newer/current path) ---
map[id3b] = {
  id: id3b,
  role: 'user',
  text: 'Tell me more about the economy. How do they trade this?',
  parentId: id2,
  childrenIds: [id4b],
  selectedChildId: id4b,
  createdAt: new Date(Date.now() - 60000000).toISOString(),
};

map[id4b] = {
  id: id4b,
  role: 'model',
  text: "**The Shard Standard**\n\nCurrency is literally weight-based magic. \n\n1. **Raw Cuts:** Unrefined geodes used for bulk trade between nations.\n2. **Dust-Scripts:** Paper money backed by a reserve of crystal dust (used by commoners who can't use magic).\n3. **Pure-Lumen:** Flawless gems used exclusively by the elite mages.",
  parentId: id3b,
  childrenIds: [],
  selectedChildId: null,
  createdAt: new Date(Date.now() - 59000000).toISOString(),
};

// Fix: Updated to match ChatSession interface (rootNodeIds as array and adding selectedRootId)
export const sessionCrystalSpire: ChatSession = {
  id: 'fixture-crystal-spire',
  title: 'The Crystal Spire',
  messageMap: map,
  rootNodeIds: [id1],
  selectedRootId: id1,
  currentLeafId: id4b,
  createdAt: new Date(Date.now() - 100000000).toISOString(),
  updatedAt: new Date(Date.now() - 59000000).toISOString(),
};
