import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../main.js";
import { 
  setupTestDb, 
  cleanupTestData, 
  createTestUser, 
  createTestProject,
  createTestBoard,
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

test.describe('Critical Board API Tests', () => {
  let testUser: any;
  let testProject: any;
  let authToken: string;

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'board@example.com',
      name: 'Board User',
      password: 'password123'
    });
    testProject = await createTestProject(testUser.id);
    authToken = await generateTestToken(testUser.id);
  });

  test('POST /api/projects/:projectId/boards - should create new board', async () => {
    const boardData = {
      name: 'Test Board',
      leftToRightOnly: false,
      resolvedColumnId: null
    };

    const response = await request(app)
      .post(`/api/projects/${testProject.id}/boards`)
      .set('Cookie', [`token=${authToken}`])
      .send(boardData)
      .expect(201);

    assert.strictEqual(response.body.message, 'Board created successfully');
    assert.strictEqual(response.body.board.name, boardData.name);
    assert.strictEqual(response.body.board.projectId, testProject.id);
    assert.ok(response.body.board.columns);
  });

  test('GET /api/boards/:boardId - should get board with columns and tasks', async () => {
    const board = await createTestBoard(testProject.id);

    const response = await request(app)
      .get(`/api/boards/${board.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.id, board.id);
    assert.strictEqual(response.body.name, board.name);
    assert.ok(response.body.columns);
    assert.ok(Array.isArray(response.body.columns));
    assert.strictEqual(response.body.columns.length, 3); // Default columns
  });

  test('PUT /api/boards/:boardId - should update board', async () => {
    const board = await createTestBoard(testProject.id);
    const updateData = {
      name: 'Updated Board Name',
      leftToRightOnly: true
    };

    const response = await request(app)
      .put(`/api/boards/${board.id}`)
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Board updated successfully');
    assert.strictEqual(response.body.board.name, updateData.name);
    assert.strictEqual(response.body.board.leftToRightOnly, updateData.leftToRightOnly);
  });

  test('DELETE /api/boards/:boardId - should delete board', async () => {
    const board = await createTestBoard(testProject.id);

    const response = await request(app)
      .delete(`/api/boards/${board.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Board deleted successfully');
  });

  test('POST /api/boards/:boardId/columns - should add column to board', async () => {
    const board = await createTestBoard(testProject.id);
    const columnData = {
      name: 'New Column',
      order: 3,
      wipLimit: 5
    };

    const response = await request(app)
      .post(`/api/boards/${board.id}/columns`)
      .set('Cookie', [`token=${authToken}`])
      .send(columnData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Column added successfully');
    assert.strictEqual(response.body.column.name, columnData.name);
    assert.strictEqual(response.body.column.order, columnData.order);
    assert.strictEqual(response.body.column.wipLimit, columnData.wipLimit);
  });

  test('PUT /api/boards/:boardId/columns/:columnId - should update column', async () => {
    const board = await createTestBoard(testProject.id);
    const columns = await request(app)
      .get(`/api/boards/${board.id}`)
      .set('Cookie', [`token=${authToken}`]);
    
    const firstColumn = columns.body.columns[0];
    const updateData = {
      name: 'Updated Column',
      wipLimit: 3
    };

    const response = await request(app)
      .put(`/api/boards/${board.id}/columns/${firstColumn.id}`)
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Column updated successfully');
    assert.strictEqual(response.body.column.name, updateData.name);
    assert.strictEqual(response.body.column.wipLimit, updateData.wipLimit);
  });

  test('DELETE /api/boards/:boardId/columns/:columnId - should delete column', async () => {
    const board = await createTestBoard(testProject.id);
    const columns = await request(app)
      .get(`/api/boards/${board.id}`)
      .set('Cookie', [`token=${authToken}`]);
    
    const firstColumn = columns.body.columns[0];

    const response = await request(app)
      .delete(`/api/boards/${board.id}/columns/${firstColumn.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Column deleted successfully');
  });
});
