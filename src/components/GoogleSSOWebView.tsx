/**
 * Google SSO WebView Component
 * 
 * Hiển thị WebView để user đăng nhập Google
 * Detect callback và xử lý tokens
 */

import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { googleSSOService, GoogleUserInfo } from '../services/googleSSOService';
import { validateGoogleConfig } from '../config/googleSSOConfig';

WebBrowser.maybeCompleteAuthSession();

interface GoogleSSOWebViewProps {
  visible: boolean;
  onSuccess: (userInfo: GoogleUserInfo) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
}

export const GoogleSSOWebView: React.FC<GoogleSSOWebViewProps> = ({
  visible,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [authUrl, setAuthUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      initializeAuth();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleCallbackUrl(url);
    });
    return () => subscription.remove();
  }, [visible]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate config
      const isValid = validateGoogleConfig();
      if (!isValid) {
        throw new Error('Invalid Google SSO configuration');
      }

      // Build auth URL
      const { url } = await googleSSOService.buildAuthUrl();
      setAuthUrl(url);

      console.log('🚀 Google SSO initialized');
      console.log('   Auth URL:', url);

      // IMPORTANT: Google blocks OAuth inside WebView (disallowed_useragent)
      // Use system browser auth session instead.
      await startAuthSession(url);
    } catch (err: any) {
      console.error('❌ Failed to initialize Google SSO:', err);
      setError(err.message);
      onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startAuthSession = async (url: string) => {
    // Backend is expected to finally redirect to the app scheme (deep link)
    // Keep it explicit so it works in dev-client and standalone builds.
    const returnUrl = Linking.createURL('auth', { scheme: 'myapp' });

    const result = await WebBrowser.openAuthSessionAsync(url, returnUrl, {
      preferEphemeralSession: false,
    });

    if (result.type === 'success' && result.url) {
      await handleCallbackUrl(result.url);
      return;
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      handleClose();
      return;
    }
  };

  const handleCallbackUrl = async (url: string) => {
    if (!url) return;
    console.log('📍 Auth callback:', url);

    try {
      // Detect callback từ backend
      // Backend redirect về: myapp://auth?access_token=xxx&...
      if (url.includes('myapp://auth') || url.includes('socialapp://redirect')) {
        console.log('✅ Detected callback URL');

        const urlObj = new URL(url);
        const params: any = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });

        const userInfo = await googleSSOService.handleCallback(params);
        if (userInfo) {
          onSuccess(userInfo);
          return;
        }

        throw new Error('Failed to get user info');
      }

      // Detect error từ backend / provider
      if (url.includes('/api/auth/error') || url.includes('error=')) {
        const urlObj = new URL(url);
        const errCode = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');

        console.error('❌ Auth error:', errCode);
        console.error('   Description:', errorDescription);

        let errorMessage = 'Đăng nhập thất bại';

        if (errCode === 'OAuthCallback') {
          errorMessage =
            'Backend không thể xử lý callback từ Google. Vui lòng kiểm tra:\n' +
            '- Client Secret có đúng không?\n' +
            '- Redirect URI trong Google Console có khớp không?\n' +
            '- Backend logs để xem chi tiết lỗi';
        } else if (errCode === 'disallowed_useragent') {
          errorMessage =
            'Google đã chặn đăng nhập trong WebView. Ứng dụng đã chuyển sang đăng nhập bằng trình duyệt hệ thống.';
        } else if (errorDescription) {
          errorMessage = errorDescription;
        } else if (errCode) {
          errorMessage = errCode;
        }

        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('❌ Callback handling error:', err);
      setError(err.message);
      onError(err);
    }
  };

  const handleClose = () => {
    setAuthUrl('');
    setError(null);
    onCancel();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đăng nhập Google</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DB4437" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Lỗi</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initializeAuth}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView */}
        {authUrl && !error && !isLoading && (
          <View style={styles.browserHint}>
            <Text style={styles.browserHintText}>
              Đang mở trình duyệt để đăng nhập Google...
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => startAuthSession(authUrl)}>
              <Text style={styles.retryButtonText}>Mở lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#DB4437',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browserHint: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  browserHintText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
