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

test.describe('Comment Controller Tests', () => {
  let testUser: any;
  let testProject: any;
  let testBoard: any;
  let testTask: any;
  let authToken: string;
  let testColumns: any[];

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'comment@example.com',
      name: 'Comment User',
      password: 'password123'
    });
    testProject = await createTestProject(testUser.id);
    testBoard = await createTestBoard(testProject.id);
    authToken = await generateTestToken(testUser.id);
    
    const boardResponse = await request(app)
      .get(`/api/boards/${testBoard.id}`)
      .set('Cookie', [`token=${authToken}`]);
    testColumns = boardResponse.body.columns;
    
    testTask = await createTestTask(testBoard.id, testColumns[0].id, testUser.id);
  });

  test('POST /api/comments - should create new comment', async () => {
    const commentData = {
      text: 'This is a test comment',
      taskId: testTask.id
    };

    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send(commentData)
      .expect(201);

    assert.strictEqual(response.body.message, 'Comment created successfully');
    assert.strictEqual(response.body.comment.text, commentData.text);
    assert.strictEqual(response.body.comment.taskId, testTask.id);
    assert.strictEqual(response.body.comment.authorId, testUser.id);
    assert.ok(response.body.comment.createdAt);
  });

  test('POST /api/comments - should require authentication', async () => {
    const commentData = {
      text: 'This is a test comment',
      taskId: testTask.id
    };

    const response = await request(app)
      .post('/api/comments')
      .send(commentData)
      .expect(401);

    assert.strictEqual(response.body.message, 'Access token required');
  });

  test('POST /api/comments - should validate required fields', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send({ text: 'Comment without task' })
      .expect(400);

    assert.ok(response.body.message.includes('required'));
  });

  test('GET /api/tasks/:taskId/comments - should get task comments', async () => {
    // Create a comment first
    await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send({
        text: 'Test comment for retrieval',
        taskId: testTask.id
      });

    const response = await request(app)
      .get(`/api/tasks/${testTask.id}/comments`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.ok(Array.isArray(response.body.comments));
    assert.strictEqual(response.body.comments.length, 1);
    assert.strictEqual(response.body.comments[0].text, 'Test comment for retrieval');
    assert.ok(response.body.comments[0].author);
  });

  test('PUT /api/comments/:commentId - should update own comment', async () => {
    // Create a comment first
    const createResponse = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send({
        text: 'Original comment',
        taskId: testTask.id
      });

    const commentId = createResponse.body.comment.id;
    const updateData = {
      text: 'Updated comment text'
    };

    const response = await request(app)
      .put(`/api/comments/${commentId}`)
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Comment updated successfully');
    assert.strictEqual(response.body.comment.text, updateData.text);
  });

  test('PUT /api/comments/:commentId - should reject updating others comment', async () => {
    const otherUser = await createTestUser({
      email: 'other@example.com',
      name: 'Other User',
      password: 'password123'
    });

    // Create comment by other user
    const otherToken = await generateTestToken(otherUser.id);
    const createResponse = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${otherToken}`])
      .send({
        text: 'Other user comment',
        taskId: testTask.id
      });

    const commentId = createResponse.body.comment.id;

    // Try to update with different user
    const response = await request(app)
      .put(`/api/comments/${commentId}`)
      .set('Cookie', [`token=${authToken}`])
      .send({ text: 'Hacked comment' })
      .expect(403);

    assert.strictEqual(response.body.message, 'Not authorized to update this comment');
  });

  test('DELETE /api/comments/:commentId - should delete own comment', async () => {
    // Create a comment first
    const createResponse = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send({
        text: 'Comment to delete',
        taskId: testTask.id
      });

    const commentId = createResponse.body.comment.id;

    const response = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Comment deleted successfully');
  });

  test('DELETE /api/comments/:commentId - should reject deleting others comment', async () => {
    const otherUser = await createTestUser({
      email: 'deleter@example.com',
      name: 'Deleter User',
      password: 'password123'
    });

    // Create comment by other user
    const otherToken = await generateTestToken(otherUser.id);
    const createResponse = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${otherToken}`])
      .send({
        text: 'Other user comment to delete',
        taskId: testTask.id
      });

    const commentId = createResponse.body.comment.id;

    // Try to delete with different user
    const response = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(403);

    assert.strictEqual(response.body.message, 'Not authorized to delete this comment');
  });

  test('should handle comment mentions', async () => {
    const mentionedUser = await createTestUser({
      email: 'mentioned@example.com',
      name: 'Mentioned User',
      password: 'password123'
    });

    const commentWithMention = {
      text: `Hey @${mentionedUser.name}, please check this task!`,
      taskId: testTask.id
    };

    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send(commentWithMention)
      .expect(201);

    assert.strictEqual(response.body.message, 'Comment created successfully');
    // The comment should be created and mentions processed
    assert.ok(response.body.comment.id);
  });

  test('should validate comment text length', async () => {
    const longText = 'a'.repeat(2001); // Assuming max length is 2000

    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', [`token=${authToken}`])
      .send({
        text: longText,
        taskId: testTask.id
      })
      .expect(400);

    assert.ok(response.body.message.includes('too long'));
  });
});
