import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../main.js";
import {
  deriveStoryStatusId,
  type WorkflowColumnLike,
} from "../lib/workflowUtils.js";
import { 
  setupTestDb, 
  cleanupTestData, 
  createTestUser, 
  createTestProject,
  createTestBoard,
  createTestTask,
  generateTestToken,
  closeTestDb 
} from "./testUtils.js";

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await cleanupTestData();
  await closeTestDb();
});

test.describe('Workflow Route Tests', () => {
  let testUser: any;
  let testProject: any;
  let testBoard: any;
  let authToken: string;
  let testColumns: any[];

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'workflow@example.com',
      name: 'Workflow User',
      password: 'password123'
    });
    testProject = await createTestProject(testUser.id);
    testBoard = await createTestBoard(testProject.id);
    authToken = await generateTestToken(testUser.id);
    
    // Get columns for testing
    const boardResponse = await request(app)
      .get(`/api/boards/${testBoard.id}`)
      .set('Cookie', [`token=${authToken}`]);
    testColumns = boardResponse.body.columns;
  });

  test('POST /api/tasks - should create new task', async () => {
    const taskData = {
      title: 'Test Task',
      description: 'Test task description',
      type: 'TASK',
      priority: 'HIGH',
      boardId: testBoard.id,
      statusId: testColumns[0].id,
      dueDate: '2024-12-31T23:59:59Z'
    };

    const response = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`token=${authToken}`])
      .send(taskData)
      .expect(201);

    assert.strictEqual(response.body.message, 'Task created successfully');
    assert.strictEqual(response.body.task.title, taskData.title);
    assert.strictEqual(response.body.task.type, taskData.type);
    assert.strictEqual(response.body.task.priority, taskData.priority);
    assert.strictEqual(response.body.task.reporterId, testUser.id);
  });

  test('PUT /api/tasks/:taskId - should update task', async () => {
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
    const updateData = {
      title: 'Updated Task Title',
      description: 'Updated description',
      priority: 'CRITICAL'
    };

    const response = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Task updated successfully');
    assert.strictEqual(response.body.task.title, updateData.title);
    assert.strictEqual(response.body.task.priority, updateData.priority);
  });

  test('PATCH /api/tasks/:taskId/status - should update task status', async () => {
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
    const statusUpdate = {
      statusId: testColumns[1].id // Move to next column
    };

    const response = await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set('Cookie', [`token=${authToken}`])
      .send(statusUpdate)
      .expect(200);

    assert.strictEqual(response.body.message, 'Task status updated successfully');
    assert.strictEqual(response.body.task.statusId, statusUpdate.statusId);
  });

  test('PATCH /api/tasks/:taskId/assignee - should update task assignee', async () => {
    const assignee = await createTestUser({
      email: 'assignee@example.com',
      name: 'Assignee User',
      password: 'password123'
    });
    
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
    const assigneeUpdate = {
      assigneeId: assignee.id
    };

    const response = await request(app)
      .patch(`/api/tasks/${task.id}/assignee`)
      .set('Cookie', [`token=${authToken}`])
      .send(assigneeUpdate)
      .expect(200);

    assert.strictEqual(response.body.message, 'Task assignee updated successfully');
    assert.strictEqual(response.body.task.assigneeId, assignee.id);
  });

  test('DELETE /api/tasks/:taskId - should delete task', async () => {
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);

    const response = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Task deleted successfully');
  });

  test('GET /api/tasks/:taskId - should get task with details', async () => {
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);

    const response = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.id, task.id);
    assert.strictEqual(response.body.title, task.title);
    assert.ok(response.body.boardId);
    assert.ok(response.body.statusId);
    assert.ok(response.body.reporterId);
  });

  test('POST /api/tasks/:taskId/subtasks - should create subtask', async () => {
    const parentTask = await createTestTask(testBoard.id, testColumns[0].id, testUser.id, {
      type: 'STORY'
    });
    
    const subtaskData = {
      title: 'Subtask Title',
      description: 'Subtask description',
      type: 'TASK',
      priority: 'MEDIUM',
      statusId: testColumns[0].id
    };

    const response = await request(app)
      .post(`/api/tasks/${parentTask.id}/subtasks`)
      .set('Cookie', [`token=${authToken}`])
      .send(subtaskData)
      .expect(201);

    assert.strictEqual(response.body.message, 'Subtask created successfully');
    assert.strictEqual(response.body.subtask.parentStoryId, parentTask.id);
    assert.strictEqual(response.body.subtask.title, subtaskData.title);
  });
});

test.describe('Workflow Business Logic', () => {
  test.describe('deriveStoryStatusId', () => {
    test('should derive story status from subtask statuses', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'To Do', order: 0, wipLimit: null },
        { id: '2', name: 'In Progress', order: 1, wipLimit: null },
        { id: '3', name: 'Done', order: 2, wipLimit: null },
      ];

      const subTaskStatusIds = ['3', '3', '2']; // Done, Done, In Progress

      const result = deriveStoryStatusId(columns, subTaskStatusIds);
      assert.strictEqual(result, '3'); // Should return the most advanced status
    });

    test('should return null when no subtasks exist', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'To Do', order: 0, wipLimit: null },
      ];

      const result = deriveStoryStatusId(columns, []);
      assert.strictEqual(result, null);
    });

    test('should handle complex workflow with multiple columns', () => {
      const columns: WorkflowColumnLike[] = [
        { id: '1', name: 'Backlog', order: 0, wipLimit: null },
        { id: '2', name: 'To Do', order: 1, wipLimit: null },
        { id: '3', name: 'In Progress', order: 2, wipLimit: null },
        { id: '4', name: 'Review', order: 3, wipLimit: null },
        { id: '5', name: 'Testing', order: 4, wipLimit: null },
        { id: '6', name: 'Done', order: 5, wipLimit: null },
      ];

      const subTaskStatusIds = ['2', '5', '3', '6']; // To Do, Testing, In Progress, Done

      const result = deriveStoryStatusId(columns, subTaskStatusIds);
      assert.strictEqual(result, '6'); // Should return Done (highest order)
    });
  });
});

test.describe('Task History and Audit Trail', () => {
  let testUser: any;
  let testProject: any;
  let testBoard: any;
  let authToken: string;
  let testColumns: any[];

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'history@example.com',
      name: 'History User',
      password: 'password123'
    });
    testProject = await createTestProject(testUser.id);
    testBoard = await createTestBoard(testProject.id);
    authToken = await generateTestToken(testUser.id);
    
    const boardResponse = await request(app)
      .get(`/api/boards/${testBoard.id}`)
      .set('Cookie', [`token=${authToken}`]);
    testColumns = boardResponse.body.columns;
  });

  test('should track status change history', async () => {
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
    
    // Update status
    await request(app)
      .patch(`/api/tasks/${task.id}/status`)
      .set('Cookie', [`token=${authToken}`])
      .send({ statusId: testColumns[1].id });

    // Get task with history
    const response = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Cookie', [`token=${authToken}`]);

    assert.ok(response.body.history);
    assert.ok(Array.isArray(response.body.history));
    assert.ok(response.body.history.length > 0);
    
    const statusChange = response.body.history.find((h: any) => h.event === 'STATUS_CHANGE');
    assert.ok(statusChange);
    assert.strictEqual(statusChange.oldValue, testColumns[0].id);
    assert.strictEqual(statusChange.newValue, testColumns[1].id);
  });

  test('should track assignee change history', async () => {
    const assignee = await createTestUser({
      email: 'taskassignee@example.com',
      name: 'Task Assignee',
      password: 'password123'
    });
    
    const task = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
    
    // Update assignee
    await request(app)
      .patch(`/api/tasks/${task.id}/assignee`)
      .set('Cookie', [`token=${authToken}`])
      .send({ assigneeId: assignee.id });

    // Get task with history
    const response = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Cookie', [`token=${authToken}`]);

    const assigneeChange = response.body.history.find((h: any) => h.event === 'ASSIGNEE_CHANGE');
    assert.ok(assigneeChange);
    assert.strictEqual(assigneeChange.newValue, assignee.id);
  });
});
