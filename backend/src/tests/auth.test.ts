import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../main.js";
import { 
  setupTestDb, 
  cleanupTestData, 
  createTestUser, 
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

test.describe(' Auth API Tests', () => {
  test('POST /api/auth/register - should register new user', async () => {
    const userData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    assert.strictEqual(response.body.message, 'User registered successfully');
    assert.ok(response.body.user.id);
    assert.strictEqual(response.body.user.email, userData.email);
    assert.ok(!response.body.user.password);
  });

  test('POST /api/auth/login - should login with valid credentials', async () => {
    const userData = {
      email: 'login@example.com',
      name: 'Login User',
      password: 'password123'
    };

    await createTestUser(userData);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    assert.strictEqual(response.body.message, 'Login successful');
    assert.ok(response.body.user.id);
    assert.ok(response.headers['set-cookie']);
  });

  test('POST /api/auth/login - should reject invalid credentials', async () => {
    const userData = {
      email: 'invalid@example.com',
      name: 'Invalid User',
      password: 'password123'
    };

    await createTestUser(userData);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: 'wrongpassword'
      })
      .expect(401);

    assert.strictEqual(response.body.message, 'Invalid credentials');
  });

  test('GET /api/auth/me - should return current user', async () => {
    const user = await createTestUser({
      email: 'profile@example.com',
      name: 'Profile User',
      password: 'password123'
    });

    const token = await generateTestToken(user.id);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    assert.strictEqual(response.body.id, user.id);
    assert.strictEqual(response.body.email, user.email);
  });

  test('GET /api/auth/me - should reject unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    assert.strictEqual(response.body.message, 'Access token required');
  });
});
