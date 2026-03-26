/**
 * Microsoft Native Login Screen Example
 * 
 * Sử dụng Native SDK (react-native-app-auth)
 * Không cần backend endpoint
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MicrosoftNativeLogin } from '../components/MicrosoftNativeLogin';
import { microsoftNativeService, MicrosoftUser } from '../services/microsoftNativeService';

export const MicrosoftNativeLoginScreen = () => {
  const [user, setUser] = useState<MicrosoftUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await microsoftNativeService.isAuthenticated();
      
      if (isAuth) {
        const userInfo = await microsoftNativeService.getUserInfo();
        const token = await microsoftNativeService.getAccessToken();
        
        setUser(userInfo);
        setAccessToken(token);
      }
    } catch (error) {
      console.error('Check auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (userInfo: MicrosoftUser) => {
    console.log('✅ Login successful:', userInfo);
    
    setUser(userInfo);
    
    // Get access token
    const token = await microsoftNativeService.getAccessToken();
    setAccessToken(token);
    
    Alert.alert(
      'Đăng nhập thành công!',
      `Chào mừng ${userInfo.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleLoginError = (error: Error) => {
    console.error('❌ Login error:', error);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await microsoftNativeService.logout();
              setUser(null);
              setAccessToken(null);
              Alert.alert('Thành công', 'Đã đăng xuất');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message);
            }
          },
        },
      ]
    );
  };

  const handleRefreshToken = async () => {
    try {
      const newToken = await microsoftNativeService.refreshToken();
      setAccessToken(newToken);
      Alert.alert('Thành công', 'Token đã được làm mới');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleCallAPI = async () => {
    try {
      const token = await microsoftNativeService.getAccessToken();
      
      if (!token) {
        Alert.alert('Lỗi', 'Không có access token');
        return;
      }

      // Example: Call Microsoft Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      Alert.alert(
        'Microsoft Graph API',
        JSON.stringify(data, null, 2),
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Microsoft Native SSO</Text>
      <Text style={styles.subtitle}>Using react-native-app-auth</Text>

      {!user ? (
        <View style={styles.loginContainer}>
          <MicrosoftNativeLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>✨ Ưu điểm:</Text>
            <Text style={styles.infoText}>• Mở system browser (Safari/Chrome)</Text>
            <Text style={styles.infoText}>• Không cần backend endpoint</Text>
            <Text style={styles.infoText}>• Tự động exchange tokens</Text>
            <Text style={styles.infoText}>• Native UX, secure</Text>
            <Text style={styles.infoText}>• Auto token refresh</Text>
          </View>
        </View>
      ) : (
        <View style={styles.userContainer}>
          <View style={styles.userCard}>
            <Text style={styles.welcomeText}>Xin chào!</Text>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.id && <Text style={styles.userId}>ID: {user.id}</Text>}
          </View>

          {accessToken && (
            <View style={styles.tokenCard}>
              <Text style={styles.tokenTitle}>Access Token:</Text>
              <Text style={styles.tokenText} numberOfLines={3}>
                {accessToken}
              </Text>
            </View>
          )}

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionButton} onPress={handleRefreshToken}>
              <Text style={styles.actionButtonText}>🔄 Refresh Token</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCallAPI}>
              <Text style={styles.actionButtonText}>📊 Call Graph API</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
                🚪 Đăng xuất
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  loginContainer: {
    width: '100%',
    alignItems: 'center',
  },
  infoBox: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  userContainer: {
    width: '100%',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  tokenCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#0078D4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
  },
  logoutButtonText: {
    color: '#fff',
  },
});
