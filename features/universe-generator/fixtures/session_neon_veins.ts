import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';

const id1 = generateId();
const id2 = generateId();

const map: Record<string, MessageNode> = {};

map[id1] = {
    id: id1,
    role: 'user',
    text: "Let's build a cyberpunk city built on top of the ruins of an eldritch temple.",
    parentId: null,
    childrenIds: [id2],
    selectedChildId: id2,
    createdAt: new Date(Date.now() - 170000000).toISOString()
};

map[id2] = {
    id: id2,
    role: 'model',
    text: "**City: Neo-R'lyeh (Colloquial: 'The Sink')**\n\nThe mega-structure is anchored to the ocean floor, extending miles above sea level. The lower levels (The Dregs) are literally carved into the ancient, non-euclidean stone of the temple ruins.\n\n**The Hook:**\nCorporate AIs have started glitching, speaking in dead tongues. They aren't malfunctioning; they are *interpreting* the signals coming from the abyss below.",
    parentId: id1,
    childrenIds: [],
    selectedChildId: null,
    createdAt: new Date(Date.now() - 169900000).toISOString()
};

// Fix: Updated to match ChatSession interface (rootNodeIds as array and adding selectedRootId)
export const sessionNeonVeins: ChatSession = {
    id: 'fixture-neon-veins',
    title: 'Neon Veins & Old Gods',
    messageMap: map,
    rootNodeIds: [id1],
    selectedRootId: id1,
    currentLeafId: id2,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 4000000).toISOString()
};