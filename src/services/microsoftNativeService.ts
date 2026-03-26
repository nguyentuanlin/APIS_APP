/**
 * Microsoft Native SSO Service
 * Using react-native-app-auth
 * 
 * Tự động exchange tokens, không cần backend
 */

import { authorize, refresh, revoke, AuthorizeResult, RefreshResult } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AZURE_AD_NATIVE_CONFIG } from '../config/microsoftNativeConfig';

interface MicrosoftUser {
  email: string;
  name: string;
  id: string;
  tenantId?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  accessTokenExpirationDate: string;
  scopes: string[];
}

class MicrosoftNativeService {
  private static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'ms_native_access_token',
    REFRESH_TOKEN: 'ms_native_refresh_token',
    ID_TOKEN: 'ms_native_id_token',
    EXPIRATION: 'ms_native_expiration',
    USER_INFO: 'ms_native_user_info',
  };

  /**
   * Login with Microsoft - Opens native browser
   */
  async login(): Promise<MicrosoftUser> {
    try {
      console.log('🚀 Starting Microsoft Native SSO...');
      console.log('   Config:', AZURE_AD_NATIVE_CONFIG);

      // Authorize - mở system browser
      const result: AuthorizeResult = await authorize(AZURE_AD_NATIVE_CONFIG);

      console.log('✅ Authorization successful');
      console.log('   Access Token:', result.accessToken ? 'Present' : 'Missing');
      console.log('   ID Token:', result.idToken ? 'Present' : 'Missing');
      console.log('   Refresh Token:', result.refreshToken ? 'Present' : 'Missing');
      console.log('   Expires:', result.accessTokenExpirationDate);

      // Save tokens
      await this.saveTokens(result);

      // Parse user info from ID token
      const userInfo = this.parseIdToken(result.idToken);

      // Save user info
      await AsyncStorage.setItem(
        MicrosoftNativeService.STORAGE_KEYS.USER_INFO,
        JSON.stringify(userInfo)
      );

      console.log('✅ Login successful');
      console.log('   User:', userInfo.name);
      console.log('   Email:', userInfo.email);

      return userInfo;
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Handle specific errors
      if (error.message?.includes('User cancelled')) {
        throw new Error('Đăng nhập bị hủy');
      } else if (error.message?.includes('Network')) {
        throw new Error('Lỗi kết nối mạng');
      } else {
        throw new Error(error.message || 'Đăng nhập thất bại');
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await AsyncStorage.getItem(
        MicrosoftNativeService.STORAGE_KEYS.REFRESH_TOKEN
      );

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Refreshing access token...');

      const result: RefreshResult = await refresh(AZURE_AD_NATIVE_CONFIG, {
        refreshToken,
      });

      console.log('✅ Token refreshed');

      // Save new tokens
      await this.saveTokens(result);

      return result.accessToken;
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout - revoke tokens
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out...');

      const accessToken = await AsyncStorage.getItem(
        MicrosoftNativeService.STORAGE_KEYS.ACCESS_TOKEN
      );

      // Revoke token if available
      if (accessToken) {
        try {
          await revoke(AZURE_AD_NATIVE_CONFIG, {
            tokenToRevoke: accessToken,
            sendClientId: true,
          });
          console.log('✅ Token revoked');
        } catch (error) {
          console.warn('⚠️ Token revocation failed (may already be invalid)');
        }
      }

      // Clear all stored data
      await Promise.all([
        AsyncStorage.removeItem(MicrosoftNativeService.STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(MicrosoftNativeService.STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(MicrosoftNativeService.STORAGE_KEYS.ID_TOKEN),
        AsyncStorage.removeItem(MicrosoftNativeService.STORAGE_KEYS.EXPIRATION),
        AsyncStorage.removeItem(MicrosoftNativeService.STORAGE_KEYS.USER_INFO),
      ]);

      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * Get access token (auto-refresh if expired)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(
        MicrosoftNativeService.STORAGE_KEYS.ACCESS_TOKEN
      );
      const expiration = await AsyncStorage.getItem(
        MicrosoftNativeService.STORAGE_KEYS.EXPIRATION
      );

      if (!token || !expiration) {
        return null;
      }

      // Check if token expired
      const expirationDate = new Date(expiration);
      const now = new Date();

      if (now >= expirationDate) {
        console.log('⚠️ Access token expired, refreshing...');
        return await this.refreshToken();
      }

      return token;
    } catch (error) {
      console.error('❌ Get access token error:', error);
      return null;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<MicrosoftUser | null> {
    try {
      const userInfoStr = await AsyncStorage.getItem(
        MicrosoftNativeService.STORAGE_KEYS.USER_INFO
      );
      return userInfoStr ? JSON.parse(userInfoStr) : null;
    } catch (error) {
      console.error('❌ Get user info error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(result: AuthorizeResult | RefreshResult): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(
        MicrosoftNativeService.STORAGE_KEYS.ACCESS_TOKEN,
        result.accessToken
      ),
      AsyncStorage.setItem(
        MicrosoftNativeService.STORAGE_KEYS.ID_TOKEN,
        result.idToken
      ),
      AsyncStorage.setItem(
        MicrosoftNativeService.STORAGE_KEYS.EXPIRATION,
        result.accessTokenExpirationDate
      ),
      result.refreshToken
        ? AsyncStorage.setItem(
            MicrosoftNativeService.STORAGE_KEYS.REFRESH_TOKEN,
            result.refreshToken
          )
        : Promise.resolve(),
    ]);
  }

  /**
   * Parse ID token to get user info
   */
  private parseIdToken(idToken: string): MicrosoftUser {
    try {
      // Decode JWT
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);

      return {
        id: payload.oid || payload.sub,
        email: payload.email || payload.preferred_username || payload.upn,
        name: payload.name || payload.given_name || 'User',
        tenantId: payload.tid,
      };
    } catch (error) {
      console.error('❌ Failed to parse ID token:', error);
      throw new Error('Invalid ID token');
    }
  }
}

export const microsoftNativeService = new MicrosoftNativeService();
export type { MicrosoftUser };
