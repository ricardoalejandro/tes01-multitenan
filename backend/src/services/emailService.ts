import nodemailer from 'nodemailer';
import { db } from '../db';
import { systemConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { refreshAccessToken } from './googleOAuth';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean; // true para SSL, false para TLS
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}

interface OAuthConfig {
  provider: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  email: string;
}

/**
 * Desencriptar texto con AES-256
 */
function decrypt(encryptedText: string): string {
  try {
    console.log('🔓 [DECRYPT] Iniciando desencriptación...');
    console.log('🔓 [DECRYPT] Encrypted text length:', encryptedText.length);
    console.log('🔓 [DECRYPT] Encrypted text preview:', encryptedText.substring(0, 50) + '...');
    
    const parts = encryptedText.split(':');
    console.log('🔓 [DECRYPT] Parts count:', parts.length);
    console.log('🔓 [DECRYPT] IV length:', parts[0]?.length || 0);
    console.log('🔓 [DECRYPT] Encrypted part length:', parts[1]?.length || 0);
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('✅ [DECRYPT] Desencriptación exitosa');
    console.log('🔓 [DECRYPT] Decrypted length:', decrypted.length);
    console.log('🔓 [DECRYPT] Decrypted preview:', decrypted.substring(0, 50) + '...');
    
    return decrypted;
  } catch (error) {
    console.error('❌ [DECRYPT] Error al desencriptar:', error);
    console.error('❌ [DECRYPT] Retornando texto sin cambios');
    return encryptedText;
  }
}

/**
 * Obtener configuración OAuth desde la base de datos
 */
async function getOAuthConfig(): Promise<OAuthConfig | null> {
  try {
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'smtp_config'))
      .limit(1);

    if (!config || !config.oauthProvider || !config.oauthAccessToken) {
      return null;
    }

    // Desencriptar tokens
    const accessToken = decrypt(config.oauthAccessToken);
    const refreshToken = config.oauthRefreshToken ? decrypt(config.oauthRefreshToken) : '';

    return {
      provider: config.oauthProvider,
      accessToken,
      refreshToken,
      tokenExpiry: config.oauthTokenExpiry || new Date(),
      email: config.oauthEmail || '',
    };
  } catch (error) {
    console.error('Error al obtener OAuth config:', error);
    return null;
  }
}

/**
 * Obtener configuración SMTP desde la base de datos
 */
export async function getSMTPConfig(): Promise<SMTPConfig | null> {
  try {
    const configs = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'smtp_config'));

    if (configs.length === 0) {
      return null;
    }

    const config = JSON.parse(configs[0].configValue);
    return config;
  } catch (error) {
    console.error('Error al obtener config SMTP:', error);
    return null;
  }
}

/**
 * Guardar configuración SMTP en la base de datos
 */
export async function saveSMTPConfig(config: SMTPConfig, userId: string) {
  try {
    // Encriptar la contraseña antes de guardar (simple base64 para este ejemplo)
    const encryptedConfig = {
      ...config,
      auth: {
        ...config.auth,
        pass: Buffer.from(config.auth.pass).toString('base64'),
      },
    };

    const configValue = JSON.stringify(encryptedConfig);

    // Verificar si ya existe
    const [existing] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'smtp_config'))
      .limit(1);

    if (existing) {
      // Actualizar
      await db
        .update(systemConfig)
        .set({
          configValue,
          isEncrypted: true,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(systemConfig.configKey, 'smtp_config'));
    } else {
      // Insertar
      await db.insert(systemConfig).values({
        configKey: 'smtp_config',
        configValue,
        isEncrypted: true,
        updatedBy: userId,
      });
    }

    return true;
  } catch (error) {
    console.error('Error al guardar config SMTP:', error);
    return false;
  }
}

/**
 * Desencriptar la contraseña SMTP
 */
function decryptPassword(encrypted: string): string {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch (error) {
    return encrypted; // Si falla, asumir que no está encriptada
  }
}

/**
 * Crear transporter de nodemailer (con OAuth o SMTP)
 * IMPORTANTE: Soporta DOS métodos de envío:
 * 1. OAuth Gmail: Usa tokens de Google OAuth (configurado en Admin > Configuración SMTP)
 * 2. SMTP tradicional: Usa host/port/user/pass configurado manualmente
 */
async function createTransporter() {
  console.log('📧 [EMAIL SERVICE] Iniciando creación de transporter...');
  
  // OPCIÓN 1: Intentar primero con OAuth de Gmail
  const oauthConfig = await getOAuthConfig();
  
  if (oauthConfig && oauthConfig.refreshToken) {
    console.log('✅ [OAUTH] Configuración OAuth encontrada');
    console.log('   Provider:', oauthConfig.provider);
    console.log('   Email:', oauthConfig.email);
    console.log('   Token Expiry:', oauthConfig.tokenExpiry);
    
    // Verificar si el token está expirado y refrescarlo si es necesario
    const now = new Date();
    const isExpired = oauthConfig.tokenExpiry < now;
    
    let accessToken = oauthConfig.accessToken;
    
    if (isExpired) {
      console.log('⚠️ [OAUTH] Access token expirado, refrescando...');
      try {
        const newCredentials = await refreshAccessToken(oauthConfig.refreshToken);
        
        if (newCredentials.access_token) {
          // IMPORTANTE: Guardar el token DESENCRIPTADO para usarlo en el transporter
          const decryptedAccessToken = newCredentials.access_token;
          accessToken = decryptedAccessToken;
          
          console.log('✅ [OAUTH] Access token refrescado exitosamente');
          console.log('🔑 [OAUTH] Nuevo access token length (desencriptado):', accessToken.length);
          
          // Encriptar y actualizar en base de datos
          const crypto = await import('crypto');
          const ENCRYPTION_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
          let encrypted = cipher.update(accessToken, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          const encryptedToken = iv.toString('hex') + ':' + encrypted;
          
          console.log('🔒 [OAUTH] Token encriptado length:', encryptedToken.length);
          
          const newExpiry = new Date(Date.now() + 3600 * 1000); // 1 hora
          
          await db
            .update(systemConfig)
            .set({
              oauthAccessToken: encryptedToken,
              oauthTokenExpiry: newExpiry,
            })
            .where(eq(systemConfig.configKey, 'smtp_config'));
          
          console.log('✅ [OAUTH] Token actualizado en BD');
          console.log('🔓 [OAUTH] Access token para transporter (desencriptado):', accessToken.length);
        }
      } catch (refreshError) {
        console.error('❌ [OAUTH] Error al refrescar token:', refreshError);
        throw new Error('No se pudo refrescar el token de OAuth. Por favor reconecta tu cuenta de Google.');
      }
    } else {
      console.log('✅ [OAUTH] Access token vigente');
      console.log('🔑 [OAUTH] Access token length actual (desencriptado):', accessToken.length);
    }
    
    console.log('   Has Access Token:', !!accessToken);
    console.log('   Has Refresh Token:', !!oauthConfig.refreshToken);
    console.log('   Has CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('   Has CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);
    
    // IMPORTANTE: nodemailer puede manejar el refresh automáticamente si le damos refreshToken
    // No necesitamos pasar accessToken si tenemos refreshToken válido
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: oauthConfig.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: oauthConfig.refreshToken,
        // accessToken: accessToken, // Comentado: dejar que nodemailer lo maneje
      },
    } as any);

    console.log('📧 [OAUTH] Transporter OAuth Gmail creado exitosamente');
    
    return { 
      transporter, 
      from: { 
        name: 'Sistema Escolástica', 
        address: oauthConfig.email 
      },
      method: 'OAuth Gmail'
    };
  }

  // OPCIÓN 2: Si no hay OAuth, usar SMTP tradicional
  console.log('⚙️ [SMTP] OAuth no disponible, intentando SMTP tradicional...');
  const config = await getSMTPConfig();

  if (!config) {
    console.error('❌ [EMAIL SERVICE] No hay configuración disponible');
    throw new Error('No hay configuración de email disponible. Por favor configura SMTP o conecta con Google en Admin > Configuración SMTP.');
  }

  console.log('✅ [SMTP] Configuración SMTP encontrada');
  console.log('   Host:', config.host);
  console.log('   Port:', config.port);
  console.log('   Secure:', config.secure);
  console.log('   User:', config.auth.user);
  console.log('   From Name:', config.from.name);
  console.log('   From Address:', config.from.address);

  // Desencriptar password
  const decryptedPass = decryptPassword(config.auth.pass);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: decryptedPass,
    },
  });

  console.log('📧 [SMTP] Transporter SMTP creado exitosamente');

  return { 
    transporter, 
    from: config.from,
    method: 'SMTP'
  };
}

/**
 * Probar conexión SMTP
 */
export async function testSMTPConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { transporter } = await createTransporter();
    await transporter.verify();
    return { success: true, message: 'Conexión exitosa al servidor SMTP' };
  } catch (error: any) {
    console.error('Error en test SMTP:', error);
    return { 
      success: false, 
      message: `Error de conexión: ${error.message}` 
    };
  }
}

/**
 * Enviar email de reseteo de contraseña
 */
export async function sendPasswordResetEmail(
  to: string,
  username: string,
  resetToken: string,
  frontendUrl: string = 'http://localhost:5000'
) {
  try {
    console.log('📧 [SEND EMAIL] Iniciando envío de email de reseteo');
    console.log('   Destinatario:', to);
    console.log('   Usuario:', username);
    console.log('   Frontend URL:', frontendUrl);
    
    const { transporter, from } = await createTransporter();
    
    console.log('✅ [SEND EMAIL] Transporter creado, preparando mensaje...');

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: {
        name: from.name,
        address: from.address,
      },
      to,
      subject: 'Restablecer contraseña - Sistema Escolástica',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4f46e5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4f46e5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 14px;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Sistema Escolástica</h1>
            </div>
            <div class="content">
              <h2>Restablecer Contraseña</h2>
              <p>Hola <strong>${username}</strong>,</p>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
              <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              </p>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${resetLink}
              </p>
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez.
              </div>
              <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>&copy; ${new Date().getFullYear()} Sistema Escolástica. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Restablecer Contraseña - Sistema Escolástica
        
        Hola ${username},
        
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
        
        Usa el siguiente enlace para crear una nueva contraseña (válido por 1 hora):
        ${resetLink}
        
        Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
        
        ---
        Sistema Escolástica
      `,
    };

    console.log('📤 [SEND EMAIL] Enviando email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ [SEND EMAIL] Email enviado exitosamente');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    return true;
  } catch (error: any) {
    console.error('❌ [SEND EMAIL] Error al enviar email:', error);
    console.error('   Error Code:', error.code);
    console.error('   Error Command:', error.command);
    console.error('   Error Response:', error.response);
    console.error('   Error ResponseCode:', error.responseCode);
    throw error;
  }
}

/**
 * Generar token aleatorio seguro
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
