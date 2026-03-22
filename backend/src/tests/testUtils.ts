import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export const setupTestDb = async () => {
  try {
    // Connect to database for tests
    await prisma.$connect();
    // Clean up test data before each test
    await cleanupTestData();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
};

export const cleanupTestData = async () => {
  // Delete in correct order due to foreign key constraints
  // Handle Task self-referencing relationships first
  await prisma.task.deleteMany({
    where: {
      parentStoryId: { not: null }
    }
  });
  
  // Then delete remaining tasks
  await prisma.task.deleteMany();
  
  // Delete comments before tasks (already done above)
  await prisma.comment.deleteMany();
  
  // Delete columns before boards
  await prisma.column.deleteMany();
  
  // Delete invalid transitions before boards
  await prisma.invalidTransition.deleteMany();
  
  // Delete boards before projects
  await prisma.board.deleteMany();
  
  // Delete project members before projects
  await prisma.projectMember.deleteMany();
  
  // Delete projects
  await prisma.project.deleteMany();
  
  // Delete notifications
  await prisma.notification.deleteMany();
  
  // Delete refresh tokens before users
  await prisma.refreshToken.deleteMany();
  
  // Delete users last
  await prisma.user.deleteMany();
};

export const createTestUser = async (userData: {
  email: string;
  name: string;
  password: string;
}) => {
  const hashedPassword = await import('bcryptjs').then(bcrypt => 
    bcrypt.hash(userData.password, 10)
  );
  
  return prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      avatarUrl: `https://ui-avatars.com/api/?name=${userData.name}&background=random`,
    },
  });
};

export const createTestProject = async (ownerId: string, projectData?: {
  name?: string;
  description?: string;
}) => {
  return prisma.project.create({
    data: {
      name: projectData?.name || 'Test Project',
      description: projectData?.description || 'Test Description',
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: 'GLOBAL_ADMIN',
        },
      },
    },
  });
};

export const createTestBoard = async (projectId: string, boardData?: {
  name?: string;
  leftToRightOnly?: boolean;
}) => {
  return prisma.board.create({
    data: {
      name: boardData?.name || 'Test Board',
      projectId,
      leftToRightOnly: boardData?.leftToRightOnly || false,
      columns: {
        create: [
          { name: 'To Do', order: 0 },
          { name: 'In Progress', order: 1 },
          { name: 'Done', order: 2 },
        ],
      },
    },
  });
};

export const createTestTask = async (boardId: string, columnId: string, reporterId: string, taskData?: {
  title?: string;
  description?: string;
  type?: 'STORY' | 'TASK' | 'BUG';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigneeId?: string;
}) => {
  return prisma.task.create({
    data: {
      title: taskData?.title || 'Test Task',
      description: taskData?.description || 'Test Description',
      type: taskData?.type || 'TASK',
      priority: taskData?.priority || 'MEDIUM',
      boardId,
      statusId: columnId,
      reporterId,
      assigneeId: taskData?.assigneeId,
    },
  });
};

export const generateTestToken = (userId: string) => {
  return import('jsonwebtoken').then(jwt => 
    jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '15m' }
    )
  );
};

export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const closeTestDb = async () => {
  await prisma.$disconnect();
};
