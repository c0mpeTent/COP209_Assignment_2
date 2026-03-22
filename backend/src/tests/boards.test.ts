import test from "node:test";
import assert from "node:assert/strict";
import {
  getColumnOrderUpdates,
  type WorkflowColumnLike,
} from "../lib/workflowUtils.js";

const getResolvedColumn = (
  columns: WorkflowColumnLike[],
  resolvedColumnId?: string | null
) => {
  const orderedColumns = columns.sort((a, b) => a.order - b.order);
  const configuredColumn =
    resolvedColumnId
      ? orderedColumns.find((column) => column.id === resolvedColumnId) ?? null
      : null;

  if (configuredColumn) {
    return configuredColumn;
  }

  return (
    orderedColumns.find((column) => column.name.trim().toLowerCase() === "done") ??
    orderedColumns[orderedColumns.length - 1] ??
    null
  );
};


const columns: WorkflowColumnLike[] = [
  { id: "todo", name: "To Do", order: 0, wipLimit: 10 },
  { id: "progress", name: "In Progress", order: 1, wipLimit: 10 },
  { id: "review", name: "Review", order: 2, wipLimit: 10 },
  { id: "done", name: "Done", order: 3, wipLimit: 10 },
  { id: "deployed", name: "Deployed", order: 4, wipLimit: 10 },
];

test("column reorder updates preserve the new order indexes", () => {
  assert.deepEqual(getColumnOrderUpdates(["review", "todo", "done"]), [
    { id: "review", order: 0 },
    { id: "todo", order: 1 },
    { id: "done", order: 2 },
  ]);
});

test("resolved column prefers the explicit Done column over the last column", () => {
  const resolvedColumn = getResolvedColumn(columns);
  assert.equal(resolvedColumn?.id, "done");
});

test("resolved column prefers the configured column over Done when provided", () => {
  const resolvedColumn = getResolvedColumn(columns, "review");
  assert.equal(resolvedColumn?.id, "review");
});

test("resolved column falls back to the last column when Done does not exist", () => {
  const fallbackColumn = getResolvedColumn(
    columns.filter((column) => column.id !== "done")
  );
  assert.equal(fallbackColumn?.id, "deployed");
});

test("resolved column ignores an invalid configured id and falls back safely", () => {
  const fallbackColumn = getResolvedColumn(columns, "missing-column");
  assert.equal(fallbackColumn?.id, "done");
});