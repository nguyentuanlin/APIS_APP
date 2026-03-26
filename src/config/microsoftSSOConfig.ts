/**
 * Microsoft Azure AD SSO Configuration
 * 
 * Sử dụng HTTPS redirect URI với backend server
 * Flow: App → Microsoft → Backend → App
 */

import Constants from 'expo-constants';

// Debug: Log tất cả env variables
console.log('📋 Debug Constants:');
console.log('   expoConfig.extra:', Constants.expoConfig?.extra);
console.log('   manifest.extra:', Constants.manifest?.extra);
console.log('   process.env keys:', Object.keys(process.env).filter(k => k.includes('AZURE')));

export interface MicrosoftSSOConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  clientSecret?: string;
  scopes: string[];
  authorizeEndpoint: string;
  tokenEndpoint: string;
  logoutEndpoint: string;
}

// Đọc từ nhiều nguồn: process.env, Constants.expoConfig.extra, hoặc hardcode
const getEnvValue = (key: string, fallback: string = ''): string => {
  // Try process.env first (for Expo)
  if (process.env[key]) {
    return process.env[key] as string;
  }
  
  // Try Constants.expoConfig.extra
  const extra = Constants.expoConfig?.extra || {};
  if (extra[key]) {
    return extra[key];
  }
  
  // Try Constants.manifest.extra (legacy)
  const manifest = Constants.manifest?.extra || {};
  if (manifest[key]) {
    return manifest[key];
  }
  
  return fallback;
};

export const MICROSOFT_SSO_CONFIG: MicrosoftSSOConfig = {
  // Thông tin từ Azure Portal
  clientId: getEnvValue('EXPO_PUBLIC_AZURE_AD_CLIENT_ID', '0f263b0c-86ad-46c8-a583-0381ec2c8be3'),
  tenantId: getEnvValue('EXPO_PUBLIC_AZURE_AD_TENANT_ID', '67f466ec-d460-4f90-9465-f88465e460ef'),
  redirectUri: getEnvValue('EXPO_PUBLIC_AZURE_AD_REDIRECT_URI', 'https://cagent.cmcu.edu.vn/api/auth/mobile/azure-ad'),
  
  // Client secret (không nên expose trong mobile app, chỉ dùng cho backend)
  // clientSecret: env.AZURE_AD_CLIENT_SECRET,
  
  // Scopes - quyền truy cập
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access', // Để lấy refresh token
  ],
  
  // OAuth 2.0 Endpoints
  get authorizeEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
  },
  
  get tokenEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  },
  
  get logoutEndpoint() {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/logout`;
  },
};

/**
 * Validate Microsoft SSO configuration
 */
export const validateMicrosoftConfig = (): boolean => {
  const { clientId, tenantId, redirectUri } = MICROSOFT_SSO_CONFIG;
  
  console.log('🔍 Validating Microsoft SSO Config...');
  console.log('   Client ID:', clientId || '❌ MISSING');
  console.log('   Tenant ID:', tenantId || '❌ MISSING');
  console.log('   Redirect URI:', redirectUri || '❌ MISSING');
  
  if (!clientId) {
    console.error('❌ Missing EXPO_PUBLIC_AZURE_AD_CLIENT_ID');
    return false;
  }
  
  if (!tenantId) {
    console.error('❌ Missing EXPO_PUBLIC_AZURE_AD_TENANT_ID');
    return false;
  }
  
  if (!redirectUri) {
    console.error('❌ Missing EXPO_PUBLIC_AZURE_AD_REDIRECT_URI');
    return false;
  }
  
  console.log('✅ Microsoft SSO Config validated');
  
  return true;
};

/**
 * Build Microsoft OAuth authorization URL
 */
export const buildMicrosoftAuthUrl = (state: string, codeChallenge?: string): string => {
  const params = new URLSearchParams({
    client_id: MICROSOFT_SSO_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: MICROSOFT_SSO_CONFIG.redirectUri,
    scope: MICROSOFT_SSO_CONFIG.scopes.join(' '),
    state: state,
    response_mode: 'query',
    prompt: 'select_account', // Cho phép user chọn account
  });
  
  // Thêm PKCE nếu có
  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }
  
  return `${MICROSOFT_SSO_CONFIG.authorizeEndpoint}?${params.toString()}`;
};

/**
 * Parse tokens from JWT
 */
export const parseJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};
