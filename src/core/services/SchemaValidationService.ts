// ============================================================
// Ekrixi Schema v2 — Validation Service
// ============================================================
//
// Runtime validators for schema invariants that TypeScript
// cannot enforce at the type level.
// ============================================================

import { NexusObject, NexusNote, NexusTimeState, AggregatedHierarchicalLink } from '../types';
import { NexusType } from '../types/enums';

export interface ValidationError {
  nodeId: string;
  rule: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export class SchemaValidationService {
  // ============================================================
  // Public: Full registry validation
  // ============================================================

  static validateRegistry(registry: Record<string, NexusObject>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const obj of Object.values(registry)) {
      errors.push(...this.validateObject(obj, registry));
    }

    return errors;
  }

  static validateObject(
    obj: NexusObject,
    registry: Record<string, NexusObject>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Common validations
    errors.push(...this.validateTimeState(obj));
    errors.push(...this.validateTimeChildren(obj, registry));
    errors.push(...this.validateAggregatedHierarchical(obj));
    errors.push(...this.validateStoryNoteFields(obj));

    return errors;
  }

  // ============================================================
  // Rule: time_children range validation
  // ============================================================

  /**
   * Validates that all time_children of a node have ranges that
   * fall within the parent's [effective_date, valid_until] range.
   *
   * Flat-tree model: parent sees ALL descendants in range as children.
   */
  static validateTimeChildren(
    obj: NexusObject,
    registry: Record<string, NexusObject>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const ts = (obj as NexusNote).time_state;
    if (!ts?.time_children?.length) return errors;

    const parentStart = this.dateToNum(ts.effective_date);
    const parentEnd = ts.valid_until ? this.dateToNum(ts.valid_until) : Infinity;

    for (const childId of ts.time_children) {
      const child = registry[childId];
      if (!child) {
        errors.push({
          nodeId: obj.id,
          rule: 'TIME_CHILD_EXISTS',
          message: `time_child "${childId}" does not exist in registry`,
          severity: 'ERROR',
        });
        continue;
      }

      const childTs = (child as NexusNote).time_state;
      if (!childTs) {
        errors.push({
          nodeId: obj.id,
          rule: 'TIME_CHILD_HAS_STATE',
          message: `time_child "${childId}" has no time_state`,
          severity: 'ERROR',
        });
        continue;
      }

      const childStart = this.dateToNum(childTs.effective_date);
      const childEnd = childTs.valid_until ? this.dateToNum(childTs.valid_until) : childStart;

      // Rule 1: Child's effective_date must be within parent's range
      if (childStart < parentStart || childStart > parentEnd) {
        errors.push({
          nodeId: obj.id,
          rule: 'TIME_CHILD_START_IN_RANGE',
          message: `time_child "${childId}" effective_date (${this.fmtDate(childTs.effective_date)}) is outside parent range [${this.fmtDate(ts.effective_date)}, ${ts.valid_until ? this.fmtDate(ts.valid_until) : '∞'}]`,
          severity: 'ERROR',
        });
      }

      // Rule 2: If child has valid_until, it must be within parent's range
      if (childTs.valid_until && childEnd > parentEnd) {
        errors.push({
          nodeId: obj.id,
          rule: 'TIME_CHILD_END_IN_RANGE',
          message: `time_child "${childId}" valid_until (${this.fmtDate(childTs.valid_until)}) exceeds parent range ending at ${ts.valid_until ? this.fmtDate(ts.valid_until) : '∞'}`,
          severity: 'ERROR',
        });
      }

      // Rule 3: All children must reference the root parent
      if (!childTs.parent_identity_id) {
        errors.push({
          nodeId: childId,
          rule: 'TIME_CHILD_HAS_PARENT_REF',
          message: `time_child of "${obj.id}" has no parent_identity_id`,
          severity: 'WARNING',
        });
      }
    }

    return errors;
  }

  // ============================================================
  // Rule: AggregatedHierarchicalLink parent-only validation
  // ============================================================

  /**
   * Only the parent side of a temporal relationship may be an
   * AggregatedHierarchicalLink. Time-state children must use
   * AGGREGATED_SIMPLE_LINK or SIMPLE_LINK instead.
   */
  static validateAggregatedHierarchical(obj: NexusObject): ValidationError[] {
    const errors: ValidationError[] = [];

    if (obj._type !== NexusType.AGGREGATED_HIERARCHICAL_LINK) return errors;

    const ts = (obj as AggregatedHierarchicalLink).time_state;
    if (ts?.is_historical_snapshot === true) {
      errors.push({
        nodeId: obj.id,
        rule: 'AGG_HIER_NOT_SNAPSHOT',
        message: `AGGREGATED_HIERARCHICAL_LINK "${obj.id}" is a time-state child (is_historical_snapshot=true). Time-state children must use AGGREGATED_SIMPLE_LINK or SIMPLE_LINK.`,
        severity: 'ERROR',
      });
    }

    return errors;
  }

  // ============================================================
  // Rule: NexusTimeState internal consistency
  // ============================================================

  static validateTimeState(obj: NexusObject): ValidationError[] {
    const errors: ValidationError[] = [];
    const ts = (obj as NexusNote).time_state;
    if (!ts) return errors;

    // Snapshots must have parent_identity_id
    if (ts.is_historical_snapshot && !ts.parent_identity_id) {
      errors.push({
        nodeId: obj.id,
        rule: 'SNAPSHOT_HAS_PARENT',
        message: 'Historical snapshot must have parent_identity_id',
        severity: 'ERROR',
      });
    }

    // valid_until must be >= effective_date
    if (ts.valid_until) {
      const start = this.dateToNum(ts.effective_date);
      const end = this.dateToNum(ts.valid_until);
      if (end < start) {
        errors.push({
          nodeId: obj.id,
          rule: 'VALID_UNTIL_AFTER_START',
          message: `valid_until (${this.fmtDate(ts.valid_until)}) is before effective_date (${this.fmtDate(ts.effective_date)})`,
          severity: 'ERROR',
        });
      }
    }

    return errors;
  }

  // ============================================================
  // Rule: StoryNote field validation
  // ============================================================

  /**
   * Story-specific fields should only be set when _type === STORY_NOTE.
   */
  static validateStoryNoteFields(obj: NexusObject): ValidationError[] {
    const errors: ValidationError[] = [];
    const note = obj as NexusNote;

    if (obj._type !== NexusType.STORY_NOTE) {
      const storyFields = [
        'story_type',
        'sequence_index',
        'tension_level',
        'status',
        'pov_id',
        'manifesto_data',
        'block_ids',
      ];
      for (const field of storyFields) {
        if ((obj as unknown as Record<string, unknown>)[field] !== undefined) {
          errors.push({
            nodeId: obj.id,
            rule: 'STORY_FIELDS_ON_STORY_ONLY',
            message: `Field "${field}" is set but _type is "${obj._type}" (should be STORY_NOTE)`,
            severity: 'WARNING',
          });
        }
      }
    }

    return errors;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private static dateToNum(d: { year: number; month?: number; day?: number }): number {
    return d.year * 10000 + (d.month || 0) * 100 + (d.day || 0);
  }

  private static fmtDate(d: { year: number; month?: number; day?: number }): string {
    return [d.year, d.month, d.day].filter((v) => v !== undefined).join('-');
  }
}
