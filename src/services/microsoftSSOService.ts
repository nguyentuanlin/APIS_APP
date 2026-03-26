/**
 * Microsoft SSO Service
 * 
 * Handle Microsoft authentication flow với WebView
 * Sử dụng HTTPS redirect URI thông qua backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MICROSOFT_SSO_CONFIG, buildMicrosoftAuthUrl, parseJWT } from '../config/microsoftSSOConfig';

interface MicrosoftTokens {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface MicrosoftUserInfo {
  email: string;
  name: string;
  preferred_username?: string;
  oid?: string; // Object ID
  tid?: string; // Tenant ID
}

class MicrosoftSSOService {
  private static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'ms_access_token',
    REFRESH_TOKEN: 'ms_refresh_token',
    ID_TOKEN: 'ms_id_token',
    USER_INFO: 'ms_user_info',
    EXPIRES_AT: 'ms_expires_at',
  };

  /**
   * Generate random string for state/code_verifier
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
    await AsyncStorage.setItem('ms_oauth_state', state);
    
    const url = buildMicrosoftAuthUrl(state);
    
    return { url, state };
  }

  /**
   * Verify state parameter
   */
  async verifyState(receivedState: string): Promise<boolean> {
    const savedState = await AsyncStorage.getItem('ms_oauth_state');
    
    if (savedState !== receivedState) {
      console.error('❌ State mismatch! Possible CSRF attack');
      return false;
    }
    
    // Clear state sau khi verify
    await AsyncStorage.removeItem('ms_oauth_state');
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
  }): Promise<MicrosoftUserInfo | null> {
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
      const msUserInfo: MicrosoftUserInfo = {
        email: userInfo.email || userInfo.preferred_username,
        name: userInfo.name,
        preferred_username: userInfo.preferred_username,
        oid: userInfo.oid,
        tid: userInfo.tid,
      };

      await AsyncStorage.setItem(
        MicrosoftSSOService.STORAGE_KEYS.USER_INFO,
        JSON.stringify(msUserInfo)
      );

      console.log('✅ Microsoft SSO login successful');
      console.log('   User:', msUserInfo.name);
      console.log('   Email:', msUserInfo.email);

      return msUserInfo;
    } catch (error: any) {
      console.error('❌ Microsoft SSO callback error:', error.message);
      throw error;
    }
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(tokens: MicrosoftTokens): Promise<void> {
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    await Promise.all([
      AsyncStorage.setItem(MicrosoftSSOService.STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token),
      AsyncStorage.setItem(MicrosoftSSOService.STORAGE_KEYS.ID_TOKEN, tokens.id_token),
      AsyncStorage.setItem(MicrosoftSSOService.STORAGE_KEYS.EXPIRES_AT, expiresAt.toString()),
      tokens.refresh_token
        ? AsyncStorage.setItem(MicrosoftSSOService.STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        : Promise.resolve(),
    ]);
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem(MicrosoftSSOService.STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = await AsyncStorage.getItem(MicrosoftSSOService.STORAGE_KEYS.EXPIRES_AT);

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
  async getUserInfo(): Promise<MicrosoftUserInfo | null> {
    const userInfoStr = await AsyncStorage.getItem(MicrosoftSSOService.STORAGE_KEYS.USER_INFO);
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
      AsyncStorage.removeItem(MicrosoftSSOService.STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(MicrosoftSSOService.STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(MicrosoftSSOService.STORAGE_KEYS.ID_TOKEN),
      AsyncStorage.removeItem(MicrosoftSSOService.STORAGE_KEYS.USER_INFO),
      AsyncStorage.removeItem(MicrosoftSSOService.STORAGE_KEYS.EXPIRES_AT),
      AsyncStorage.removeItem('ms_oauth_state'),
    ]);

    console.log('✅ Microsoft SSO logout successful');
  }
}

export const microsoftSSOService = new MicrosoftSSOService();
export type { MicrosoftUserInfo, MicrosoftTokens };
