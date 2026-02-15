import { useState, useCallback } from 'react';
import { NexusObject } from '../../../types';
import { RefineryOperation } from '../../../core/services/MCPScannerClient';

export interface HistoryEntry {
  items: NexusObject[]; // The state *before* the action (for undo) or *after* (for redo)
  undoOps: RefineryOperation[]; // Ops to send to MCP to undo this step
  redoOps: RefineryOperation[]; // Ops to send to MCP to redo this step
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

/**
 * useRefineryHistory
 *
 * Manages the undo/redo stack for the Refinery.
 * Tracks both full local state snapshots (for instant UI rollback)
 * and MCP operations (for syncing the rollback to the backend).
 */
export const useRefineryHistory = () => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  /**
   * Records a new state transition.
   * @param prevItems The local state BEFORE the change.
   * @param undoOps Operations to revert the change in MCP.
   * @param redoOps Operations to apply the change in MCP.
   */
  const pushState = useCallback(
    (prevItems: NexusObject[], undoOps: RefineryOperation[], redoOps: RefineryOperation[]) => {
      setHistory((curr) => ({
        past: [...curr.past, { items: prevItems, undoOps, redoOps }],
        future: [],
      }));
    },
    [],
  );

  /**
   * Undoes the last action.
   * @param currentItems The current local state (to be saved for redo).
   * @returns Object containing the new items to set, and ops to sync to MCP.
   */
  const undo = useCallback(
    (currentItems: NexusObject[]) => {
      if (history.past.length === 0) return null;

      // Pop the last action
      const newPast = [...history.past];
      const entry = newPast.pop()!;

      // The entry contains the state BEFORE the action.
      // We are moving from 'currentItems' -> 'entry.items'.

      // We push 'currentItems' to future so we can Redo later.
      // To Redo (go back to currentItems), we need the original 'redoOps'.
      // To Undo again (go back from currentItems to entry.items), we need 'undoOps'.
      // Wait: `future` entry should represent the state we just left (currentItems).
      // So when we "Redo", we restore `currentItems`.
      const newFutureEntry: HistoryEntry = {
        items: currentItems,
        undoOps: entry.undoOps, // If we redo, the ops to undo that redo are same as original undo ops
        redoOps: entry.redoOps, // If we redo, we use original redo ops
      };

      setHistory({
        past: newPast,
        future: [newFutureEntry, ...history.future],
      });

      return {
        items: entry.items,
        ops: entry.undoOps,
      };
    },
    [history.past, history.future],
  );

  /**
   * Redoes the last undone action.
   * @param currentItems The current local state (to be saved for undo).
   * @returns Object containing the new items to set, and ops to sync to MCP.
   */
  const redo = useCallback(
    (currentItems: NexusObject[]) => {
      if (history.future.length === 0) return null;

      const newFuture = [...history.future];
      const entry = newFuture.shift()!;

      // The entry contains the state we want to restore (state AFTER the original action).
      // We are moving from 'currentItems' -> 'entry.items'.

      // We push 'currentItems' to past.
      // This represents the state BEFORE the redo.
      const newPastEntry: HistoryEntry = {
        items: currentItems,
        undoOps: entry.undoOps,
        redoOps: entry.redoOps,
      };

      setHistory({
        past: [...history.past, newPastEntry],
        future: newFuture,
      });

      return {
        items: entry.items,
        ops: entry.redoOps,
      };
    },
    [history.past, history.future],
  );

  return {
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
  };
};
