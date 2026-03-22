import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../main.js';
import { PrismaClient } from '@prisma/client';
import type { Project } from '@prisma/client';

const prisma = new PrismaClient();

describe('Project API Tests', () => {
  const testUsers = {
    admin: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpassword123'
    },
    member: {
      name: 'Member User',
      email: 'member@example.com',
      password: 'memberpassword123'
    }
  };

  const testProject = {
    name: 'Test Project',
    description: 'This is a test project for API testing'
  };

  let authCookies = {
    admin: '',
    member: ''
  };

  let createdProject: Project | null = null;

  before(async () => {
    console.log('Setting up project test environment...');
    
    // Create test users
    await createTestUsers();
    
    // Login both users to get auth cookies
    await loginTestUsers();
    
    console.log(' Project test environment ready');
  });

  after(async () => {
    console.log(' Cleaning up project test environment...');
    
    // Disconnect Prisma (database reset will happen in auth tests)
    await prisma.$disconnect();
    console.log('Cleanup completed');
  });

  async function createTestUsers() {
    console.log(' Creating test users...');
    
    // Create admin user
    await request(app)
      .post('/api/auth/register')
      .send(testUsers.admin);
    
    // Create member user
    await request(app)
      .post('/api/auth/register')
      .send(testUsers.member);
    
    console.log(' Test users created');
  }

  async function loginTestUsers() {
    console.log(' Logging in test users...');
    
    // Login admin user
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: testUsers.admin.password
      });
    
    const adminCookies = Array.isArray(adminResponse.headers['set-cookie']) 
      ? adminResponse.headers['set-cookie'] 
      : [adminResponse.headers['set-cookie']];
    authCookies.admin = adminCookies.join('; ');

    // Login member user
    const memberResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.member.email,
        password: testUsers.member.password
      });
    
    const memberCookies = Array.isArray(memberResponse.headers['set-cookie']) 
      ? memberResponse.headers['set-cookie'] 
      : [memberResponse.headers['set-cookie']];
    authCookies.member = memberCookies.join('; ');
    
    console.log(' Test users logged in');
  }

  describe('POST /api/project/create', () => {
    test('should successfully create a project with authenticated user', async () => {
      const response = await request(app)
        .post('/api/project/create')
        .set('Cookie', authCookies.admin)
        .send({
          name: testProject.name,
          description: testProject.description
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.message, 'Project created successfully');
      assert.ok(response.body.project);
      assert.strictEqual(response.body.project.name, testProject.name);
      assert.strictEqual(response.body.project.description, testProject.description);
      assert.ok(response.body.project.id);
      
      // Store created project for later tests
      createdProject = response.body.project;
    });

    test('should not create project without authentication', async () => {
      const response = await request(app)
        .post('/api/project/create')
        .send({
          name: 'Unauthorized Project',
          description: 'This should fail'
        });

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.message, 'Invalid token');
    });

    test('should not create project with missing name', async () => {
      const response = await request(app)
        .post('/api/project/create')
        .set('Cookie', authCookies.admin)
        .send({
          description: 'Project without name'
        });

      assert.strictEqual(response.status, 500);
      assert.strictEqual(response.body.message, 'Internal Server Error');
    });
  });

  describe('GET /api/project/get', () => {
    test('should get projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/project/get')
        .set('Cookie', authCookies.admin);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Projects fetched successfully');
      assert.ok(Array.isArray(response.body.projects));
      assert.ok(response.body.projects.length > 0);
      
      // Check that our created project is in the list
      const foundProject = response.body.projects.find((p: any) => p.id === createdProject?.id);
      assert.ok(foundProject);
      assert.strictEqual(foundProject.name, testProject.name);
    });

    test('should not get projects without authentication', async () => {
      const response = await request(app)
        .get('/api/project/get');

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.message, 'Invalid token');
    });

    test('member user should not see admin\'s projects initially', async () => {
      const response = await request(app)
        .get('/api/project/get')
        .set('Cookie', authCookies.member);

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body.projects));
      assert.strictEqual(response.body.projects.length, 0);
    });
  });

  describe('GET /api/project/get-project/:projectId', () => {
    test('should get project details for project member', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .get(`/api/project/get-project/${createdProject.id}`)
        .set('Cookie', authCookies.admin);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Project fetched successfully');
      assert.ok(response.body.project);
      assert.strictEqual(response.body.project.id, createdProject?.id);
      assert.strictEqual(response.body.project.name, testProject.name);
      assert.ok(response.body.viewerRole);
      assert.strictEqual(response.body.viewerRole, 'GLOBAL_ADMIN');
      assert.ok(Array.isArray(response.body.project.members));
      assert.ok(Array.isArray(response.body.project.boards));
    });

    test('should not get project details for non-member', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .get(`/api/project/get-project/${createdProject.id}`)
        .set('Cookie', authCookies.member);

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.message, 'You are not a member of this project');
    });

    test('should not get non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/project/get-project/${fakeId}`)
        .set('Cookie', authCookies.admin);

      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.message, 'Project not found');
    });
  });

  describe('POST /api/project/add-member', () => {
    test('should add member to project as admin', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .post('/api/project/add-member')
        .set('Cookie', authCookies.admin)
        .send({
          projectId: createdProject.id,
          memberEmail: testUsers.member.email
        });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Member added successfully');
      assert.ok(response.body.projectMember);
      assert.ok(response.body.user);
      assert.strictEqual(response.body.user.email, testUsers.member.email);
      assert.strictEqual(response.body.projectMember.role, 'PROJECT_MEMBER');
    });
  });

  describe('Member access verification', () => {
    test('member should now be able to see the project', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .get('/api/project/get')
        .set('Cookie', authCookies.member);

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body.projects));
      assert.strictEqual(response.body.projects.length, 1);
      
      const project = response.body.projects[0];
      assert.strictEqual(project.id, createdProject?.id);
      assert.strictEqual(project.name, testProject.name);
    });

    test('member should be able to access project details', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .get(`/api/project/get-project/${createdProject.id}`)
        .set('Cookie', authCookies.member);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Project fetched successfully');
      assert.strictEqual(response.body.viewerRole, 'PROJECT_MEMBER');
      
      // Check that both admin and member are in the members list
      const members = response.body.project.members;
      assert.strictEqual(members.length, 2);
      assert.ok(members.some((m: any) => m.user.email === testUsers.admin.email));
      assert.ok(members.some((m: any) => m.user.email === testUsers.member.email));
    });
  });

  describe('PATCH /api/project/update/:projectId', () => {
    test('should update project as admin', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const updatedData = {
        name: 'Updated Test Project',
        description: 'This project has been updated'
      };

      const response = await request(app)
        .patch(`/api/project/update/${createdProject.id}`)
        .set('Cookie', authCookies.admin)
        .send(updatedData);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Project updated successfully');
      assert.ok(response.body.project);
      assert.strictEqual(response.body.project.name, updatedData.name);
      assert.strictEqual(response.body.project.description, updatedData.description);
    });
  });

  describe('DELETE /api/project/delete/:projectId', () => {
    test('should delete project as admin', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .delete(`/api/project/delete/${createdProject.id}`)
        .set('Cookie', authCookies.admin);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.message, 'Project deleted successfully');
    });
  });
});
