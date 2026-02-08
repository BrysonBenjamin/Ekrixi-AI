export interface MessageNode {
  id: string;
  role: 'user' | 'model';
  text: string;

  // Tree Pointers
  parentId: string | null;
  childrenIds: string[];
  selectedChildId: string | null; // Remembers which branch was last active

  createdAt: string;
  senderId: string; // Required for security rules
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  universeId?: string; // Optional for backward compatibility
  title: string;

  // Graph Data
  messageMap: Record<string, MessageNode>;
  rootNodeIds: string[]; // Support multiple starting points for branching roots
  selectedRootId: string | null;
  currentLeafId: string | null;

  createdAt: string;
  updatedAt: string;
}
