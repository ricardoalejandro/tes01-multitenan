import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth configuration in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Forzar consentimiento para obtener refresh_token
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    console.log('🔄 [OAUTH REFRESH] Iniciando refresh de access token...');
    console.log('🔑 [OAUTH REFRESH] Refresh token length:', refreshToken?.length || 0);
    
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    console.log('📞 [OAUTH REFRESH] Llamando a refreshAccessToken()...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ [OAUTH REFRESH] Token refrescado exitosamente');
    console.log('🔑 [OAUTH REFRESH] Nuevo access token length:', credentials.access_token?.length || 0);
    console.log('📅 [OAUTH REFRESH] Nuevo expiry_date:', credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'N/A');
    
    return credentials;
  } catch (error: any) {
    console.error('❌ [OAUTH REFRESH] Error al refrescar token:', error.message);
    console.error('❌ [OAUTH REFRESH] Error code:', error.code);
    console.error('❌ [OAUTH REFRESH] Error details:', JSON.stringify(error.response?.data || error, null, 2));
    throw error;
  }
}
