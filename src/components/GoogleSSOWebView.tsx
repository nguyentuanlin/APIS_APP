/**
 * Google SSO WebView Component
 * 
 * Hiển thị WebView để user đăng nhập Google
 * Detect callback và xử lý tokens
 */

import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { googleSSOService, GoogleUserInfo } from '../services/googleSSOService';
import { validateGoogleConfig } from '../config/googleSSOConfig';

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
    } catch (err: any) {
      console.error('❌ Failed to initialize Google SSO:', err);
      setError(err.message);
      onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    
    console.log('📍 Navigation:', url);

    try {
      // Detect callback từ backend
      // Backend redirect về: myapp://auth?access_token=xxx&...
      if (url.includes('myapp://auth') || url.includes('socialapp://redirect')) {
        console.log('✅ Detected callback URL');
        
        // Parse URL parameters
        const urlObj = new URL(url);
        const params: any = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });

        // Handle callback
        const userInfo = await googleSSOService.handleCallback(params);
        
        if (userInfo) {
          onSuccess(userInfo);
        } else {
          throw new Error('Failed to get user info');
        }
      }

      // Detect error từ backend
      if (url.includes('/api/auth/error') || url.includes('error=')) {
        const urlObj = new URL(url);
        const error = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        
        console.error('❌ Backend error:', error);
        console.error('   Description:', errorDescription);
        
        let errorMessage = 'Đăng nhập thất bại';
        
        if (error === 'OAuthCallback') {
          errorMessage = 'Backend không thể xử lý callback từ Google. Vui lòng kiểm tra:\n' +
            '- Client Secret có đúng không?\n' +
            '- Redirect URI trong Google Console có khớp không?\n' +
            '- Backend logs để xem chi tiết lỗi';
        } else if (errorDescription) {
          errorMessage = errorDescription;
        } else if (error) {
          errorMessage = error;
        }
        
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('❌ Navigation error:', err);
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
        {authUrl && !error && (
          <WebView
            source={{ uri: authUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            incognito={false}
            cacheEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            injectedJavaScriptBeforeContentLoaded={`
              document.cookie = "test=1; path=/; SameSite=None; Secure";
              true;
            `}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#DB4437" />
              </View>
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setError('Không thể tải trang đăng nhập');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('HTTP error:', nativeEvent.statusCode);
            }}
            style={styles.webView}
          />
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
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
