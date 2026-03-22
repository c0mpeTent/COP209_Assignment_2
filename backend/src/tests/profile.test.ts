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

test.describe('Profile Controller Tests', () => {
  let testUser: any;
  let authToken: string;

  test.beforeEach(async () => {
    testUser = await createTestUser({
      email: 'profile@example.com',
      name: 'Profile User',
      password: 'password123'
    });
    authToken = await generateTestToken(testUser.id);
  });

  test('GET /api/profile - should get user profile', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.id, testUser.id);
    assert.strictEqual(response.body.email, testUser.email);
    assert.strictEqual(response.body.name, testUser.name);
    assert.ok(response.body.avatarUrl);
    assert.ok(response.body.createdAt);
    assert.ok(response.body.updatedAt);
  });

  test('GET /api/profile - should require authentication', async () => {
    const response = await request(app)
      .get('/api/profile')
      .expect(401);

    assert.strictEqual(response.body.message, 'Access token required');
  });

  test('PUT /api/profile - should update user profile', async () => {
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com'
    };

    const response = await request(app)
      .put('/api/profile')
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Profile updated successfully');
    assert.strictEqual(response.body.user.name, updateData.name);
    assert.strictEqual(response.body.user.email, updateData.email);
  });

  test('PUT /api/profile - should validate email format', async () => {
    const updateData = {
      email: 'invalid-email-format'
    };

    const response = await request(app)
      .put('/api/profile')
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(400);

    assert.ok(response.body.message.includes('email'));
  });

  test('PUT /api/profile - should reject duplicate email', async () => {
    const otherUser = await createTestUser({
      email: 'other@example.com',
      name: 'Other User',
      password: 'password123'
    });

    const updateData = {
      email: otherUser.email
    };

    const response = await request(app)
      .put('/api/profile')
      .set('Cookie', [`token=${authToken}`])
      .send(updateData)
      .expect(400);

    assert.strictEqual(response.body.message, 'Email already exists');
  });

  test('PUT /api/profile/password - should update password', async () => {
    const passwordData = {
      currentPassword: 'password123',
      newPassword: 'newpassword456'
    };

    const response = await request(app)
      .put('/api/profile/password')
      .set('Cookie', [`token=${authToken}`])
      .send(passwordData)
      .expect(200);

    assert.strictEqual(response.body.message, 'Password updated successfully');

    // Verify new password works
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: passwordData.newPassword
      })
      .expect(200);

    assert.strictEqual(loginResponse.body.message, 'Login successful');
  });

  test('PUT /api/profile/password - should reject incorrect current password', async () => {
    const passwordData = {
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword456'
    };

    const response = await request(app)
      .put('/api/profile/password')
      .set('Cookie', [`token=${authToken}`])
      .send(passwordData)
      .expect(400);

    assert.strictEqual(response.body.message, 'Current password is incorrect');
  });

  test('PUT /api/profile/password - should validate new password strength', async () => {
    const passwordData = {
      currentPassword: 'password123',
      newPassword: '123' // Too short
    };

    const response = await request(app)
      .put('/api/profile/password')
      .set('Cookie', [`token=${authToken}`])
      .send(passwordData)
      .expect(400);

    assert.ok(response.body.message.includes('password'));
  });

  test('POST /api/profile/avatar - should update avatar', async () => {
    // Create a mock file buffer
    const avatarBuffer = Buffer.from('fake-image-data');
    
    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`token=${authToken}`])
      .attach('avatar', avatarBuffer, 'avatar.jpg')
      .expect(200);

    assert.strictEqual(response.body.message, 'Avatar updated successfully');
    assert.ok(response.body.avatarUrl);
    assert.ok(response.body.avatarUrl.includes('avatar-'));
  });

  test('POST /api/profile/avatar - should require authentication', async () => {
    const avatarBuffer = Buffer.from('fake-image-data');
    
    const response = await request(app)
      .post('/api/profile/avatar')
      .attach('avatar', avatarBuffer, 'avatar.jpg')
      .expect(401);

    assert.strictEqual(response.body.message, 'Access token required');
  });

  test('POST /api/profile/avatar - should validate file type', async () => {
    // Create a mock text file (invalid type)
    const textBuffer = Buffer.from('not-an-image');
    
    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`token=${authToken}`])
      .attach('avatar', textBuffer, 'avatar.txt')
      .expect(400);

    assert.ok(response.body.message.includes('file type'));
  });

  test('POST /api/profile/avatar - should validate file size', async () => {
    // Create a large buffer (assuming max size is 5MB)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    
    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`token=${authToken}`])
      .attach('avatar', largeBuffer, 'avatar.jpg')
      .expect(400);

    assert.ok(response.body.message.includes('file size'));
  });

  test('DELETE /api/profile/avatar - should remove avatar', async () => {
    // First set an avatar
    await request(app)
      .post('/api/profile/avatar')
      .set('Cookie', [`token=${authToken}`])
      .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg');

    // Then delete it
    const response = await request(app)
      .delete('/api/profile/avatar')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.strictEqual(response.body.message, 'Avatar removed successfully');
    
    // Check that avatar URL is reset to default
    const profileResponse = await request(app)
      .get('/api/profile')
      .set('Cookie', [`token=${authToken}`]);

    assert.ok(profileResponse.body.avatarUrl.includes('ui-avatars.com'));
  });

  test('GET /api/profile/stats - should get user statistics', async () => {
    const response = await request(app)
      .get('/api/profile/stats')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.ok(typeof response.body.totalTasks === 'number');
    assert.ok(typeof response.body.completedTasks === 'number');
    assert.ok(typeof response.body.totalProjects === 'number');
    assert.ok(typeof response.body.totalComments === 'number');
  });

  test('PUT /api/profile/preferences - should update user preferences', async () => {
    const preferences = {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
        taskAssigned: true,
        taskStatusChanged: false
      },
      language: 'en'
    };

    const response = await request(app)
      .put('/api/profile/preferences')
      .set('Cookie', [`token=${authToken}`])
      .send(preferences)
      .expect(200);

    assert.strictEqual(response.body.message, 'Preferences updated successfully');
    assert.deepStrictEqual(response.body.preferences, preferences);
  });

  test('GET /api/profile/preferences - should get user preferences', async () => {
    // First set preferences
    const preferences = {
      theme: 'light',
      notifications: {
        email: false,
        push: true,
        taskAssigned: true,
        taskStatusChanged: true
      },
      language: 'es'
    };

    await request(app)
      .put('/api/profile/preferences')
      .set('Cookie', [`token=${authToken}`])
      .send(preferences);

    // Then get them
    const response = await request(app)
      .get('/api/profile/preferences')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    assert.deepStrictEqual(response.body.preferences, preferences);
  });
});
