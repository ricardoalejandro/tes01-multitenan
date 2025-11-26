import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { createClient } from 'redis';
import { authRoutes } from './routes/auth';
import { branchRoutes } from './routes/branches';
import { studentRoutes } from './routes/students';
import { courseRoutes } from './routes/courses';
import { instructorRoutes } from './routes/instructors';
import { groupRoutes } from './routes/groups';
import { enrollmentRoutes } from './routes/enrollments';
import { attendanceRoutes } from './routes/attendance';
import { userRoutes } from './routes/users';
import { roleRoutes } from './routes/roles';
import { systemRoutes } from './routes/system';
import counselingRoutes from './routes/counseling.js';
import googleAuthRoutes from './routes/googleAuth';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Redis client (disabled temporarily for testing)
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: () => false, // Don't retry
  },
});

redisClient.on('error', (err) => console.log('Redis Client Error (ignored)', err));

async function start() {
  // Connect to Redis (disabled temporarily for testing)
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.log('⚠️  Redis connection failed, continuing without cache');
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Multi-Tenant Academic System API',
        description: 'API documentation for the academic management system',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Register authentication decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(branchRoutes, { prefix: '/api/branches' });
  await fastify.register(studentRoutes, { prefix: '/api/students' });
  await fastify.register(courseRoutes, { prefix: '/api/courses' });
  await fastify.register(instructorRoutes, { prefix: '/api/instructors' });
  await fastify.register(groupRoutes, { prefix: '/api/groups' });
  await fastify.register(enrollmentRoutes, { prefix: '/api/enrollments' });
  await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(roleRoutes, { prefix: '/api/roles' });
  await fastify.register(systemRoutes, { prefix: '/api/system' });
  await fastify.register(counselingRoutes, { prefix: '/api/counseling' });
  await fastify.register(googleAuthRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
