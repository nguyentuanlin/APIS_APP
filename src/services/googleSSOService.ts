/**
 * Google SSO Service
 * 
 * Handle Google authentication flow với WebView
 * Sử dụng HTTPS redirect URI thông qua backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildGoogleAuthUrl, parseJWT } from '../config/googleSSOConfig';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub?: string; // Google user ID
  email_verified?: boolean;
}

class GoogleSSOService {
  private static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'google_access_token',
    REFRESH_TOKEN: 'google_refresh_token',
    ID_TOKEN: 'google_id_token',
    USER_INFO: 'google_user_info',
    EXPIRES_AT: 'google_expires_at',
  };

  /**
   * Generate random string for state
   */
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Build authorization URL
   */
  async buildAuthUrl(): Promise<{ url: string; state: string }> {
    const state = this.generateRandomString(32);
    
    // Lưu state để verify sau
    await AsyncStorage.setItem('google_oauth_state', state);
    
    const url = buildGoogleAuthUrl(state);
    
    return { url, state };
  }

  /**
   * Verify state parameter
   */
  async verifyState(receivedState: string): Promise<boolean> {
    const savedState = await AsyncStorage.getItem('google_oauth_state');
    
    if (savedState !== receivedState) {
      console.error('❌ State mismatch! Possible CSRF attack');
      return false;
    }
    
    // Clear state sau khi verify
    await AsyncStorage.removeItem('google_oauth_state');
    return true;
  }

  /**
   * Handle callback từ backend
   * Backend sẽ gửi về: myapp://auth?token=xxx&refresh_token=yyy&id_token=zzz
   */
  async handleCallback(params: {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: string;
    error?: string;
    error_description?: string;
  }): Promise<GoogleUserInfo | null> {
    try {
      // Check for errors
      if (params.error) {
        throw new Error(params.error_description || params.error);
      }

      // Validate tokens
      if (!params.access_token || !params.id_token) {
        throw new Error('Missing tokens in callback');
      }

      // Parse user info from id_token
      const userInfo = parseJWT(params.id_token);
      if (!userInfo) {
        throw new Error('Failed to parse user info from id_token');
      }

      // Save tokens
      await this.saveTokens({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
        id_token: params.id_token,
        expires_in: parseInt(params.expires_in || '3600'),
        token_type: 'Bearer',
      });

      // Save user info
      const googleUserInfo: GoogleUserInfo = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.sub,
        email_verified: userInfo.email_verified,
      };

      await AsyncStorage.setItem(
        GoogleSSOService.STORAGE_KEYS.USER_INFO,
        JSON.stringify(googleUserInfo)
      );

      console.log('✅ Google SSO login successful');
      console.log('   User:', googleUserInfo.name);
      console.log('   Email:', googleUserInfo.email);

      return googleUserInfo;
    } catch (error: any) {
      console.error('❌ Google SSO callback error:', error.message);
      throw error;
    }
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(tokens: GoogleTokens): Promise<void> {
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    await Promise.all([
      AsyncStorage.setItem(GoogleSSOService.STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token),
      AsyncStorage.setItem(GoogleSSOService.STORAGE_KEYS.ID_TOKEN, tokens.id_token),
      AsyncStorage.setItem(GoogleSSOService.STORAGE_KEYS.EXPIRES_AT, expiresAt.toString()),
      tokens.refresh_token
        ? AsyncStorage.setItem(GoogleSSOService.STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        : Promise.resolve(),
    ]);
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem(GoogleSSOService.STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = await AsyncStorage.getItem(GoogleSSOService.STORAGE_KEYS.EXPIRES_AT);

    // Check if token expired
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      console.log('⚠️ Access token expired, need to refresh');
      return null;
    }

    return token;
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<GoogleUserInfo | null> {
    const userInfoStr = await AsyncStorage.getItem(GoogleSSOService.STORAGE_KEYS.USER_INFO);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Logout - clear all tokens
   */
  async logout(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(GoogleSSOService.STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(GoogleSSOService.STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(GoogleSSOService.STORAGE_KEYS.ID_TOKEN),
      AsyncStorage.removeItem(GoogleSSOService.STORAGE_KEYS.USER_INFO),
      AsyncStorage.removeItem(GoogleSSOService.STORAGE_KEYS.EXPIRES_AT),
      AsyncStorage.removeItem('google_oauth_state'),
    ]);

    console.log('✅ Google SSO logout successful');
  }
}

export const googleSSOService = new GoogleSSOService();
export type { GoogleUserInfo, GoogleTokens };
