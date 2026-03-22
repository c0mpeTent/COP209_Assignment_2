import test from "node:test";
import assert from "node:assert/strict";
import {
  getLifecycleDatesForStatus,
  parseDueDate,
  type WorkflowColumnLike,
} from "../lib/workflowUtils.js";

const columns: WorkflowColumnLike[] = [
  { id: "todo", name: "To Do", order: 0, wipLimit: 10 },
  { id: "progress", name: "In Progress", order: 1, wipLimit: 10 },
  { id: "done", name: "Done", order: 2, wipLimit: 10 },
  { id: "released", name: "Released", order: 3, wipLimit: 10 },
];

test("parseDueDate returns a Date for valid ISO input and null for cleared input", () => {
  const parsedDate = parseDueDate("2026-03-15T00:00:00.000Z");
  assert.ok(parsedDate instanceof Date);
  assert.equal(parseDueDate(null), null);
  assert.equal(parseDueDate(undefined), undefined);
});

test("parseDueDate throws on invalid values", () => {
  assert.throws(() => parseDueDate("not-a-date"));
  assert.throws(() => parseDueDate(42));
});

test("task lifecycle uses Done for resolvedAt and the last column for closedAt", () => {
  const timestamp = new Date("2026-03-15T10:00:00.000Z");

  const resolvedDates = getLifecycleDatesForStatus(
    columns,
    "done",
    null,
    null,
    timestamp
  );
  assert.equal(resolvedDates.resolvedAt?.toISOString(), timestamp.toISOString());
  assert.equal(resolvedDates.closedAt, null);

  const closedDates = getLifecycleDatesForStatus(
    columns,
    "released",
    resolvedDates.resolvedAt,
    null,
    timestamp
  );
  assert.equal(closedDates.resolvedAt?.toISOString(), timestamp.toISOString());
  assert.equal(closedDates.closedAt?.toISOString(), timestamp.toISOString());
});

test("task lifecycle honors a configured resolved column when one is set", () => {
  const timestamp = new Date("2026-03-15T10:00:00.000Z");

  const reviewResolvedDates = getLifecycleDatesForStatus(
    columns,
    "progress",
    null,
    null,
    timestamp
  );

  assert.equal(reviewResolvedDates.resolvedAt?.toISOString(), timestamp.toISOString());
  assert.equal(reviewResolvedDates.closedAt, null);
});

test("task lifecycle does not set resolvedAt before the configured resolved column", () => {
  const timestamp = new Date("2026-03-15T10:00:00.000Z");

  const lifecycleDates = getLifecycleDatesForStatus(
    columns,
    "todo",
    null,
    null,
    timestamp
  );

  assert.equal(lifecycleDates.resolvedAt, null);
  assert.equal(lifecycleDates.closedAt, null);
});