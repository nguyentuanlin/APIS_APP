/**
 * Microsoft SSO WebView Component
 * 
 * Hiển thị WebView để user đăng nhập Microsoft
 * Detect callback và xử lý tokens
 */

import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { microsoftSSOService, MicrosoftUserInfo } from '../services/microsoftSSOService';
import { validateMicrosoftConfig } from '../config/microsoftSSOConfig';

interface MicrosoftSSOWebViewProps {
  visible: boolean;
  onSuccess: (userInfo: MicrosoftUserInfo) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
}

export const MicrosoftSSOWebView: React.FC<MicrosoftSSOWebViewProps> = ({
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
      const isValid = validateMicrosoftConfig();
      if (!isValid) {
        throw new Error('Invalid Microsoft SSO configuration');
      }

      // Build auth URL - KHÔNG QUA NextAuth
      // Trực tiếp gọi Microsoft OAuth endpoint
      const { url } = await microsoftSSOService.buildAuthUrl();
      
      // URL đã có đầy đủ parameters rồi, không cần thêm
      setAuthUrl(url);

      console.log('🚀 Microsoft SSO initialized');
      console.log('   Auth URL:', url);
    } catch (err: any) {
      console.error('❌ Failed to initialize Microsoft SSO:', err);
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
        const userInfo = await microsoftSSOService.handleCallback(params);
        
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
        
        // Hiển thị error chi tiết hơn
        let errorMessage = 'Đăng nhập thất bại';
        
        if (error === 'OAuthCallback') {
          errorMessage = 'Backend không thể xử lý callback từ Microsoft. Vui lòng kiểm tra:\n' +
            '- Client Secret có đúng không?\n' +
            '- Redirect URI trong Azure Portal có khớp không?\n' +
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
          <Text style={styles.headerTitle}>Đăng nhập Microsoft</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0078D4" />
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
            sharedCookiesEnabled={true} // iOS - share cookies
            thirdPartyCookiesEnabled={true} // Android - allow third-party cookies
            incognito={false} // Không dùng incognito mode
            cacheEnabled={true} // Enable cache
            // Android specific
            mixedContentMode="always" // Allow mixed content
            // iOS specific
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            // Inject JavaScript để set cookies nếu cần
            injectedJavaScriptBeforeContentLoaded={`
              // Enable cookies
              document.cookie = "test=1; path=/; SameSite=None; Secure";
              true;
            `}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#0078D4" />
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
    backgroundColor: '#0078D4',
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
