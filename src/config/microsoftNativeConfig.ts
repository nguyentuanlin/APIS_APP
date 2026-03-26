/**
 * Microsoft Azure AD Native SDK Configuration
 * Using react-native-app-auth
 * 
 * Không cần backend endpoint - tự động exchange tokens
 */

import { Platform } from 'react-native';

export interface AzureADConfig {
  issuer: string;
  clientId: string;
  redirectUrl: string;
  scopes: string[];
  additionalParameters?: Record<string, string>;
  serviceConfiguration?: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    revocationEndpoint?: string;
  };
}

const TENANT_ID = '67f466ec-d460-4f90-9465-f88465e460ef';
const CLIENT_ID = '0f263b0c-86ad-46c8-a583-0381ec2c8be3';

// Redirect URL format khác nhau cho iOS và Android
const getRedirectUrl = (): string => {
  if (Platform.OS === 'ios') {
    // iOS: msauth.{bundle-id}://auth
    return 'msauth.com.tlu.studentportal://auth';
  } else {
    // Android: {package-name}://oauth/redirect
    return 'com.tlu.studentportal://oauth/redirect';
  }
};

export const AZURE_AD_NATIVE_CONFIG: AzureADConfig = {
  // Issuer - Azure AD tenant
  issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  
  // Client ID từ Azure Portal
  clientId: CLIENT_ID,
  
  // Redirect URL - platform specific
  redirectUrl: getRedirectUrl(),
  
  // Scopes - quyền truy cập
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access', // Để lấy refresh token
    'User.Read', // Microsoft Graph API
  ],
  
  // Additional parameters
  additionalParameters: {
    prompt: 'select_account', // Cho phép chọn account
  },
  
  // Service configuration (optional - tự động detect từ issuer)
  serviceConfiguration: {
    authorizationEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    revocationEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout`,
  },
};

/**
 * Validate configuration
 */
export const validateNativeConfig = (): boolean => {
  const { clientId, redirectUrl, scopes } = AZURE_AD_NATIVE_CONFIG;
  
  console.log('🔍 Validating Native SDK Config...');
  console.log('   Platform:', Platform.OS);
  console.log('   Client ID:', clientId);
  console.log('   Redirect URL:', redirectUrl);
  console.log('   Scopes:', scopes.join(', '));
  
  if (!clientId) {
    console.error('❌ Missing Client ID');
    return false;
  }
  
  if (!redirectUrl) {
    console.error('❌ Missing Redirect URL');
    return false;
  }
  
  console.log('✅ Native SDK Config validated');
  return true;
};

/**
 * Get platform-specific bundle/package identifier
 */
export const getBundleIdentifier = (): string => {
  if (Platform.OS === 'ios') {
    return 'com.tlu.studentportal';
  } else {
    return 'com.tlu.studentportal';
  }
};
