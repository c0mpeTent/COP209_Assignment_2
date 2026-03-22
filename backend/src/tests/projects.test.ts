import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../main.js";
import { 
  setupTestDb, 
  cleanupTestData, 
  createTestUser, 
  createTestProject,
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

test.describe('Project API Tests', () => {
  let testUser: any;
  let authToken: string;

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'project@example.com',
      name: 'Project User',
      password: 'password123'
    });
    authToken = await generateTestToken(testUser.id);
  });

  test('POST /api/projects - should create new project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project for testing'
    };

    const response = await request(app)
      .post('/api/projects')
      .set('Cookie', [`token=${authToken}`])
      .send(projectData)
      .expect(201);

    assert.strictEqual(response.body.message, 'Project created successfully');
    assert.strictEqual(response.body.project.name, projectData.name);
    assert.strictEqual(response.body.project.ownerId, testUser.id);
  });

  test('POST /api/projects - should require authentication', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project for testing'
    };

    const response = await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(401);

    assert.strictEqual(response.body.message, 'Access token required');
  });

  test('GET /api/projects/:projectId - should get project by ID', async () => {
    const project = await createTestProject(testUser.id, {
      name: 'Get Test Project',
      description: 'Project for get test'
    });

    const response = await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.id, project.id);
    assert.strictEqual(response.body.name, project.name);
    assert.ok(response.body.members);
    assert.ok(response.body.boards);
  });

  test('PUT /api/projects/:projectId - should update project', async () => {
    const project = await createTestProject(testUser.id);
    const updateData = {
      name: 'Updated Project Name',
      description: 'Updated description'
    };

    const response = await request(app)
      .put(`/api/projects/${project.id}`)
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Project updated successfully');
    assert.strictEqual(response.body.project.name, updateData.name);
  });

  test('DELETE /api/projects/:projectId - should delete project', async () => {
    const project = await createTestProject(testUser.id);

    const response = await request(app)
      .delete(`/api/projects/${project.id}`)
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Project deleted successfully');
  });

  test('GET /api/projects - should get user projects', async () => {
    await createTestProject(testUser.id, { name: 'Project 1' });
    await createTestProject(testUser.id, { name: 'Project 2' });

    const response = await request(app)
      .get('/api/projects')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.ok(Array.isArray(response.body.projects));
    assert.strictEqual(response.body.projects.length, 2);
  });
});
