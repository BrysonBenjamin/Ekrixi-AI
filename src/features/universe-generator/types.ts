export interface MessageNode {
  id: string;
  senderId: string;
  role: 'user' | 'model';
  text: string;

  // Tree Pointers
  parentId: string | null;
  childrenIds: string[];
  selectedChildId: string | null; // Remembers which branch was last active

  createdAt: string;

  isStreaming?: boolean;
  isError?: boolean;
}

export interface CanvasDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isMain?: boolean;
}

export interface ChatSession {
  id: string;
  senderId: string;
  universeId?: string; // Optional for backward compatibility
  title: string;

  // Graph Data
  messageMap: Record<string, MessageNode>;
  rootNodeIds: string[]; // Support multiple starting points for branching roots
  selectedRootId: string | null;
  currentLeafId: string | null;

  // Canvas Data
  canvases?: CanvasDocument[];
  activeCanvasId?: string | null;

  createdAt: string;
  updatedAt: string;
}
