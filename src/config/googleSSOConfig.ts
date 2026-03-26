/**
 * Google SSO Configuration
 * 
 * OAuth 2.0 configuration cho Google Sign-In
 */

// Load từ .env
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || '';

export const GOOGLE_SSO_CONFIG = {
  clientId: GOOGLE_CLIENT_ID,
  redirectUri: GOOGLE_REDIRECT_URI,
  
  // Google OAuth endpoints
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  
  // Scopes
  scopes: [
    'openid',
    'profile',
    'email',
  ],
  
  // Response type
  responseType: 'code', // Authorization code flow
};

/**
 * Build Google authorization URL
 */
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_SSO_CONFIG.clientId,
    redirect_uri: GOOGLE_SSO_CONFIG.redirectUri,
    response_type: GOOGLE_SSO_CONFIG.responseType,
    scope: GOOGLE_SSO_CONFIG.scopes.join(' '),
    state: state,
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent screen để lấy refresh token
  });

  return `${GOOGLE_SSO_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Parse JWT token (id_token)
 */
export function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Validate configuration
 */
export function validateGoogleConfig(): boolean {
  if (!GOOGLE_SSO_CONFIG.clientId) {
    console.error('❌ Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env');
    return false;
  }

  if (!GOOGLE_SSO_CONFIG.redirectUri) {
    console.error('❌ Missing EXPO_PUBLIC_GOOGLE_REDIRECT_URI in .env');
    return false;
  }

  console.log('✅ Google SSO config validated');
  return true;
}
