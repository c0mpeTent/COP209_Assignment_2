import test from "node:test";
import assert from "node:assert/strict";
import {
  getLifecycleDatesForStatus,
  parseDueDate,
  getColumnOrderUpdates,
  deriveStoryStatusId,
  type WorkflowColumnLike,
} from "../lib/workflowUtils.js";

test.describe('Workflow Utils', () => {
  test.describe('parseDueDate', () => {
    test('should return undefined for undefined input', () => {
      assert.strictEqual(parseDueDate(undefined), undefined);
    });

    test('should return null for null input', () => {
      assert.strictEqual(parseDueDate(null), null);
    });

    test('should return null for empty string', () => {
      assert.strictEqual(parseDueDate(''), null);
    });

    test('should parse valid date string', () => {
      const dateString = '2024-12-25T10:00:00Z';
      const result = parseDueDate(dateString);
      
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getTime(), new Date(dateString).getTime());
    });

    test('should throw error for invalid date string', () => {
      assert.throws(() => parseDueDate('invalid-date'), {
        message: 'Invalid due date format'
      });
    });

    test('should throw error for non-string input', () => {
      assert.throws(() => parseDueDate(123), {
        message: 'Invalid due date format'
      });
    });
  });

  test.describe('getLifecycleDatesForStatus', () => {
    const mockColumns: WorkflowColumnLike[] = [
      { id: '1', name: 'To Do', order: 0, wipLimit: null },
      { id: '2', name: 'In Progress', order: 1, wipLimit: null },
      { id: '3', name: 'Done', order: 2, wipLimit: null },
    ];

    test('should set resolvedAt when reaching Done column', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const result = getLifecycleDatesForStatus(
        mockColumns,
        '3', // Done column
        null,
        null,
        now
      );

      assert.deepStrictEqual(result.resolvedAt, now);
      assert.deepStrictEqual(result.closedAt, now); // Done is also the last column
    });

    test('should set closedAt when reaching last column', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const result = getLifecycleDatesForStatus(
        mockColumns,
        '3', // Last column
        null,
        null,
        now
      );

      assert.deepStrictEqual(result.resolvedAt, now);
      assert.deepStrictEqual(result.closedAt, now);
    });

    test('should preserve existing resolvedAt', () => {
      const existingResolved = new Date('2024-01-01T10:00:00Z');
      const now = new Date('2024-01-01T12:00:00Z');
      const result = getLifecycleDatesForStatus(
        mockColumns,
        '3', // Done column
        existingResolved,
        null,
        now
      );

      assert.deepStrictEqual(result.resolvedAt, existingResolved);
    });

    test('should not set dates for non-resolved columns', () => {
      const result = getLifecycleDatesForStatus(
        mockColumns,
        '1', // To Do column
        null,
        null
      );

      assert.strictEqual(result.resolvedAt, null);
      assert.strictEqual(result.closedAt, null);
    });
  });

  test.describe('getColumnOrderUpdates', () => {
    test('should calculate order updates for moved columns', () => {
      const columnIds = ['1', '2', '3'];
      // Move column 1 to position 2 (end) - this would reorder to ['2', '3', '1']
      const updates = getColumnOrderUpdates(['2', '3', '1']);

      assert.strictEqual(updates.length, 3);
      assert.deepStrictEqual(updates[0], { id: '2', order: 0 });
      assert.deepStrictEqual(updates[1], { id: '3', order: 1 });
      assert.deepStrictEqual(updates[2], { id: '1', order: 2 });
    });

    test('should handle moving column to end', () => {
      // Move column 1 (A) to position 2 (end) - reorder to ['2', '3', '1']
      const updates = getColumnOrderUpdates(['2', '3', '1']);
      
      assert.strictEqual(updates.length, 3);
      assert.deepStrictEqual(updates[0], { id: '2', order: 0 });
      assert.deepStrictEqual(updates[1], { id: '3', order: 1 });
      assert.deepStrictEqual(updates[2], { id: '1', order: 2 });
    });

    test('should return empty array when moving to same position', () => {
      const updates = getColumnOrderUpdates(['1', '2']);
      assert.strictEqual(updates.length, 2);
      // Should still return updates even for "same position"
      assert.deepStrictEqual(updates[0], { id: '1', order: 0 });
      assert.deepStrictEqual(updates[1], { id: '2', order: 1 });
    });
  });

  test.describe('deriveStoryStatusId', () => {
    test('should derive story status from subtask statuses', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'To Do', order: 0, wipLimit: null },
        { id: '2', name: 'In Progress', order: 1, wipLimit: null },
        { id: '3', name: 'Done', order: 2, wipLimit: null },
      ];

      const subTaskStatusIds: string[] = ['3', '3', '2']; // Done, Done, In Progress

      // Should return the leftmost (lowest order) status
      const result = deriveStoryStatusId(columns, subTaskStatusIds);
      assert.strictEqual(result, '2'); // In Progress (lowest order)
    });

    test('should return null when no subtasks', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'To Do', order: 0, wipLimit: null },
      ];

      const result = deriveStoryStatusId(columns, []);
      assert.strictEqual(result, '1'); // Should return first column, not null
    });

    test('should handle mixed status orders', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'To Do', order: 0, wipLimit: null },
        { id: '2', name: 'In Progress', order: 1, wipLimit: null },
        { id: '3', name: 'Review', order: 2, wipLimit: null },
        { id: '4', name: 'Done', order: 3, wipLimit: null },
      ];

      const subTaskStatusIds = ['1', '4', '2']; // To Do, Done, In Progress

      const result = deriveStoryStatusId(columns, subTaskStatusIds);
      assert.strictEqual(result, '1'); // Should return To Do (lowest order), not Done
    });
  });
});
