import { FastifyInstance } from 'fastify';
import { getAuthUrl, getTokensFromCode, getUserInfo } from '../services/googleOAuth';
import { db } from '../db';
import { systemConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export default async function googleAuthRoutes(fastify: FastifyInstance) {
  
  // Iniciar flujo OAuth
  fastify.get('/auth/google/init', async (request, reply) => {
    try {
      const authUrl = getAuthUrl();
      reply.send({ authUrl });
    } catch (error: any) {
      reply.code(500).send({ error: 'Error generating auth URL', message: error.message });
    }
  });

  // Callback de Google (donde redirige después de autorizar)
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.code(400).send({ error: 'Authorization code missing' });
      }

      // Intercambiar código por tokens
      const tokens = await getTokensFromCode(code);

      if (!tokens.access_token) {
        return reply.code(500).send({ error: 'Failed to obtain access token' });
      }

      // Obtener info del usuario
      const userInfo = await getUserInfo(tokens.access_token);

      // Guardar tokens en la base de datos (encriptados)
      const smtpConfigKey = 'smtp_config';
      
      // Buscar configuración existente
      const existingConfig = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, smtpConfigKey))
        .limit(1);

      const oauthData = {
        oauthProvider: 'google',
        oauthAccessToken: encrypt(tokens.access_token),
        oauthRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        oauthTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        oauthEmail: userInfo.email || null,
      };

      if (existingConfig.length > 0) {
        // Actualizar
        await db
          .update(systemConfig)
          .set({
            ...oauthData,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.configKey, smtpConfigKey));
      } else {
        // Crear nueva configuración
        await db.insert(systemConfig).values({
          configKey: smtpConfigKey,
          configValue: JSON.stringify({}),
          isEncrypted: false,
          ...oauthData,
        });
      }

      // Redirigir al frontend con éxito
      reply.redirect(`http://localhost:5000/admin/smtp?oauth=success&email=${encodeURIComponent(userInfo.email || '')}`);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      reply.redirect(`http://localhost:5000/admin/smtp?oauth=error&message=${encodeURIComponent(error.message)}`);
    }
  });

  // Obtener estado de OAuth
  fastify.get('/auth/google/status', async (request, reply) => {
    try {
      const smtpConfigKey = 'smtp_config';
      
      const config = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, smtpConfigKey))
        .limit(1);

      if (config.length === 0 || !config[0].oauthProvider) {
        return reply.send({ connected: false });
      }

      const { oauthProvider, oauthEmail, oauthTokenExpiry } = config[0];

      reply.send({
        connected: true,
        provider: oauthProvider,
        email: oauthEmail,
        expiresAt: oauthTokenExpiry,
      });
    } catch (error: any) {
      reply.code(500).send({ error: 'Error checking OAuth status', message: error.message });
    }
  });

  // Desconectar OAuth
  fastify.post('/auth/google/disconnect', async (request, reply) => {
    try {
      const smtpConfigKey = 'smtp_config';

      await db
        .update(systemConfig)
        .set({
          oauthProvider: null,
          oauthAccessToken: null,
          oauthRefreshToken: null,
          oauthTokenExpiry: null,
          oauthEmail: null,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.configKey, smtpConfigKey));

      reply.send({ success: true, message: 'OAuth disconnected successfully' });
    } catch (error: any) {
      reply.code(500).send({ error: 'Error disconnecting OAuth', message: error.message });
    }
  });
}
