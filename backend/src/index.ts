import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createClient } from 'redis';
import { authRoutes } from './routes/auth';
import { branchRoutes } from './routes/branches';
import { studentRoutes } from './routes/students';
import { courseRoutes } from './routes/courses';
import { instructorRoutes } from './routes/instructors';
import { groupRoutes } from './routes/groups';
import { enrollmentRoutes } from './routes/enrollments';
import { attendanceRoutes } from './routes/attendance';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Redis client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function start() {
  // Connect to Redis
  await redisClient.connect();
  console.log('✅ Connected to Redis');

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
