import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../main.js';

describe('Workflow API Tests', () => {
  const timestamp = Date.now();
  const testUsers = {
    admin: {
      name: 'Workflow Admin',
      email: `workflowadmin${timestamp}@example.com`,
      password: 'adminpassword123'
    },
    member: {
      name: 'Workflow Member',
      email: `workflowmember${timestamp}@example.com`,
      password: 'memberpassword123'
    }
  };

  let authCookies = {
    admin: '',
    member: ''
  };

  let createdProject: any = null;
  let createdWorkflow: any = null;
  let createdColumns: any[] = [];
  let createdTask: any = null;

  before(async () => {
    console.log('🔄 Setting up workflow test environment...');
    
    try {
      // Create test users
      await createTestUsers();
      
      // Login both users to get auth cookies
      await loginTestUsers();
      
      // Create project for workflow testing
      await createTestProject();
      
      // Create workflow
      await createTestWorkflow();
      
      // Create columns for workflow
      await createTestColumns();
      
      console.log('✅ Workflow test environment ready');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  });

  async function createTestUsers() {
    console.log('👥 Creating workflow test users...');
    
    // Create admin user
    await request(app)
      .post('/api/auth/register')
      .send(testUsers.admin);
    
    // Create member user
    await request(app)
      .post('/api/auth/register')
      .send(testUsers.member);
    
    console.log('✅ Workflow test users created');
  }

  async function loginTestUsers() {
    console.log('🔐 Logging in workflow test users...');
    
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
    
    console.log('✅ Workflow test users logged in');
  }

  async function createTestProject() {
    console.log('📁 Creating test project...');
    
    const projectResponse = await request(app)
      .post('/api/project/create')
      .set('Cookie', authCookies.admin)
      .send({
        name: 'Workflow Test Project',
        description: 'Project for testing workflow functionality'
      });

    assert.strictEqual(projectResponse.status, 201);
    createdProject = projectResponse.body.project;
    
    // Add member to project
    await request(app)
      .post('/api/project/add-member')
      .set('Cookie', authCookies.admin)
      .send({
        projectId: createdProject.id,
        memberEmail: testUsers.member.email
      });
    
    console.log('✅ Test project created');
  }

  async function createTestWorkflow() {
    if (!createdProject) {
      throw new Error('Project not created');
    }
    
    console.log('📋 Creating test workflow...');
    console.log('Using project ID:', createdProject.id);
    console.log('Using admin cookie:', authCookies.admin ? 'present' : 'missing');
    
    const workflowResponse = await request(app)
      .post('/api/project/add-workflow')
      .set('Cookie', authCookies.admin)
      .send({
        name: 'Test Workflow',
        projectId: createdProject.id
      });

    console.log('Workflow creation response status:', workflowResponse.status);
    console.log('Workflow creation response body:', workflowResponse.body);

    if (workflowResponse.status !== 201) {
      console.error('Workflow creation failed with status:', workflowResponse.status);
      console.error('Response body:', workflowResponse.body);
      throw new Error(`Workflow creation failed: ${workflowResponse.status} - ${JSON.stringify(workflowResponse.body)}`);
    }

    createdWorkflow = workflowResponse.body;
    
    console.log('✅ Test workflow created');
  }

  async function createTestColumns() {
    if (!createdWorkflow) {
      throw new Error('Workflow not created');
    }
    
    console.log('📊 Creating test columns...');
    
    // Create To Do column
    const todoResponse = await request(app)
      .post(`/api/project/add-column/${createdWorkflow.id}`)
      .set('Cookie', authCookies.admin)
      .send({
        title: 'To Do',
        wipLimit: 5
      });

    assert.strictEqual(todoResponse.status, 200);
    console.log('Todo column response:', todoResponse.body);
    createdColumns.push(todoResponse.body); // Direct column object

    // Create In Progress column
    const inProgressResponse = await request(app)
      .post(`/api/project/add-column/${createdWorkflow.id}`)
      .set('Cookie', authCookies.admin)
      .send({
        title: 'In Progress',
        wipLimit: 3
      });

    assert.strictEqual(inProgressResponse.status, 200);
    console.log('In Progress column response:', inProgressResponse.body);
    createdColumns.push(inProgressResponse.body); // Direct column object
    
    console.log('✅ Test columns created');
  }

  describe('Basic Workflow Tests', () => {
    test('should create workflow successfully', async () => {
      if (!createdProject) {
        throw new Error('Project not created');
      }
      
      const response = await request(app)
        .post('/api/project/add-workflow')
        .set('Cookie', authCookies.admin)
        .send({
          name: 'Additional Test Workflow',
          projectId: createdProject.id
        });

      assert.strictEqual(response.status, 201);
      assert.ok(response.body);
      assert.strictEqual(response.body.name, 'Additional Test Workflow');
    });

    test('should create task successfully', async () => {
      if (!createdWorkflow || createdColumns.length === 0) {
        throw new Error('Workflow or columns not created');
      }
      
      console.log('Creating task with workflow:', createdWorkflow.id);
      console.log('Available columns:', createdColumns.map(col => ({ id: col.id, title: col.title })));
      
      const response = await request(app)
        .post('/api/project/add-task')
        .set('Cookie', authCookies.admin)
        .send({
          workflowId: createdWorkflow.id,
          title: 'Test Task',
          description: 'This is a test task',
          type: 'TASK',
          priority: 'MEDIUM',
          status: createdColumns[0].id, // To Do column
          dueDate: '2024-12-31',
          parentStoryId: null
        });

      console.log('Task creation response:', response.status, response.body);
      assert.strictEqual(response.status, 201);
      assert.ok(response.body); // Task is returned directly
      assert.strictEqual(response.body.title, 'Test Task');
      assert.strictEqual(response.body.type, 'TASK');
      createdTask = response.body;
    });
  });
});
