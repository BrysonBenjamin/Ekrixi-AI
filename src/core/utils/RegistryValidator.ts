import { NexusObject, NexusNote, NexusCategory } from '../types';
import { getParentIdentityId, getTimeState } from './nexus-accessors';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class RegistryValidator {
  /**
   * Validates if a category change is allowed.
   */
  static validateCategoryChange(object: NexusObject, newCategory: NexusCategory): ValidationResult {
    const ts = getTimeState(object);
    const isSnapshot = ts?.is_historical_snapshot;
    const catId = 'category_id' in object ? (object as any).category_id : null;

    // 1. Snapshot Immutability: Once a STATE, always a STATE (as a snapshot)
    if (isSnapshot && catId === NexusCategory.STATE) {
      if (newCategory !== NexusCategory.STATE) {
        return {
          isValid: false,
          error: 'Historical snapshots are immutable and must remain in the STATE category.',
        };
      }
    }

    // 2. Root-to-State Lock: Cannot manually convert a root identity to a STATE category
    if (!isSnapshot && newCategory === NexusCategory.STATE) {
      return {
        isValid: false,
        error:
          'Cannot manually convert a Root Identity to a STATE. Snapshots must be created via the Temporal protocol.',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates if a containment change is allowed (Circular Check).
   */
  static validateContainment(
    parentId: string,
    childId: string,
    registry: Record<string, NexusObject>,
  ): ValidationResult {
    if (parentId === childId) {
      return { isValid: false, error: 'A node cannot contain itself.' };
    }

    // Check if parent is a descendant of the child (Circular Loop)
    const isDescendant = (currentId: string, targetId: string): boolean => {
      const node = registry[currentId] as NexusNote;
      if (!node || !node.children_ids) return false;
      if (node.children_ids.includes(targetId)) return true;
      return node.children_ids.some((cid) => isDescendant(cid, targetId));
    };

    if (isDescendant(childId, parentId)) {
      return {
        isValid: false,
        error: 'Circular containment detected: The target child already contains this parent.',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates if link endpoints are valid.
   */
  static validateLinkEndpoints(
    sourceId: string,
    targetId: string,
    objectId: string,
  ): ValidationResult {
    if (sourceId === targetId) {
      return {
        isValid: false,
        error: 'Link Orthodoxy Error: Origin and Terminal nodes cannot be the same.',
      };
    }
    if (sourceId === objectId || targetId === objectId) {
      // This is usually for reified links checking themselves
    }
    return { isValid: true };
  }

  /**
   * Checks if an object is fully locked (Snapshot data).
   */
  static isDataLocked(object: NexusObject): boolean {
    const ts = getTimeState(object);
    return !!ts?.is_historical_snapshot;
  }

  /**
   * Validates that a new temporal range doesn't overlap existing snapshots.
   */
  static validateRangeContinuity(
    objectId: string,
    baseId: string,
    newStart: { year: number; month?: number; day?: number },
    newEnd: { year: number; month?: number; day?: number } | undefined,
    registry: Record<string, NexusObject>,
  ): ValidationResult {
    const isNote = (obj: NexusObject): obj is NexusNote => 'time_state' in obj;

    const snapshots = Object.values(registry).filter(
      (obj) => isNote(obj) && obj.time_state?.parent_identity_id === baseId && obj.id !== objectId,
    ) as NexusNote[];

    for (const snap of snapshots) {
      const ts = snap.time_state!;
      const start = ts.effective_date;
      const end = ts.valid_until;

      // Overlap if (NewStart < End) AND (NewEnd > Start)
      const isStartBeforeExistingEnd = !end || this.compareDates(newStart, end) < 0;
      const isEndAfterExistingStart = !newEnd || this.compareDates(newEnd, start) > 0;

      if (isStartBeforeExistingEnd && isEndAfterExistingStart) {
        return {
          isValid: false,
          error: `Temporal Overlap: This range conflicts with an existing snapshot (${start.year}).`,
        };
      }
    }

    return { isValid: true };
  }

  private static compareDates(
    a: { year: number; month?: number; day?: number },
    b: { year: number; month?: number; day?: number },
  ): number {
    const ay = a.year,
      am = a.month ?? 1,
      ad = a.day ?? 1;
    const by = b.year,
      bm = b.month ?? 1,
      bd = b.day ?? 1;
    if (ay !== by) return ay - by;
    if (am !== bm) return am - bm;
    return ad - bd;
  }

  /**
   * Infers the temporal hierarchy for all snapshots belonging to a base identity.
   * Updates 'time_children' lists based on range containment.
   */
  static inferTemporalHierarchy(
    registry: Record<string, NexusObject>,
    baseId: string,
  ): Record<string, NexusObject> {
    const updatedRegistry = { ...registry };
    const snapshots = Object.values(updatedRegistry).filter(
      (obj) => 'time_state' in obj && obj.time_state?.parent_identity_id === baseId,
    ) as NexusNote[];

    if (snapshots.length === 0) return updatedRegistry;

    // Reset all time_children in the registry for these snapshots
    snapshots.forEach((s) => {
      if (s.time_state) {
        s.time_state.time_children = [];
      }
    });

    // Also reset base node children
    const baseNode = updatedRegistry[baseId] as NexusNote;
    if (baseNode && baseNode.time_state) {
      baseNode.time_state.time_children = [];
    }

    const getSpanSize = (s: NexusNote): number => {
      const ts = s.time_state!;
      if (!ts.effective_date) return 0;
      const start = ts.effective_date.year;
      const end = ts.valid_until?.year ?? 9999; // Assume future infinity if not set
      return end - start;
    };

    const isDateWithin = (
      d: { year: number; month?: number; day?: number } | undefined,
      start: { year: number; month?: number; day?: number },
      end: { year: number; month?: number; day?: number } | undefined,
    ): boolean => {
      if (!d) return false;
      const afterStart = this.compareDates(d, start) >= 0;
      const beforeEnd = !end || this.compareDates(d, end) <= 0;
      return afterStart && beforeEnd;
    };

    // For each snapshot A, find its temporal parent B
    snapshots.forEach((A) => {
      const tsA = A.time_state!;
      if (!tsA.effective_date && !tsA.valid_until) return; // Cannot be a child if no range

      let bestParentId: string | null = null;
      let smallestParentSize = Infinity;

      snapshots.forEach((B) => {
        if (A.id === B.id) return;
        const tsB = B.time_state!;
        const startB = tsB.effective_date;
        const endB = tsB.valid_until;

        // Requirement: B is larger than A
        const sizeA = getSpanSize(A);
        const sizeB = getSpanSize(B);
        if (sizeB <= sizeA) return;

        // Requirement: A's beginning OR ending is within B
        const startInB = isDateWithin(tsA.effective_date, startB, endB);
        const endInB = isDateWithin(tsA.valid_until, startB, endB);

        if (startInB || endInB) {
          // This is a candidate. We want the "tightest" (smallest) parent.
          if (sizeB < smallestParentSize) {
            smallestParentSize = sizeB;
            bestParentId = B.id;
          }
        }
      });

      // If found a parent, add A to B's children.
      // If no snapshot parent found, A is a direct child of the Base Node.
      if (bestParentId) {
        const parent = updatedRegistry[bestParentId] as NexusNote;
        if (parent.time_state) {
          if (!parent.time_state.time_children) parent.time_state.time_children = [];
          parent.time_state.time_children.push(A.id);
        }
      } else if (baseNode && baseNode.time_state) {
        if (!baseNode.time_state.time_children) baseNode.time_state.time_children = [];
        baseNode.time_state.time_children.push(A.id);
      }
    });

    return updatedRegistry;
  }
}
