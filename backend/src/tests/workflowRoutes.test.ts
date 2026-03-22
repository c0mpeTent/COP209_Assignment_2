import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveStoryStatusId,
  type WorkflowColumnLike,
} from "../lib/workflowUtils.js";

const columns: WorkflowColumnLike[] = [
  { id: "todo", name: "To Do", order: 0, wipLimit: 1 },
  { id: "progress", name: "In Progress", order: 1, wipLimit: 2 },
  { id: "review", name: "Review", order: 2, wipLimit: 2 },
  { id: "done", name: "Done", order: 3, wipLimit: 3 },
];

test("story status is derived from the leftmost child task status", () => {
  assert.equal(deriveStoryStatusId(columns, ["review", "done", "progress"]), "progress");
  assert.equal(deriveStoryStatusId(columns, []), "todo");
});