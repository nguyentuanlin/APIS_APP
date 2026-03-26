/**
 * Microsoft SSO Login Example
 * 
 * Ví dụ sử dụng Microsoft SSO trong LoginScreen
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MicrosoftSSOWebView } from '../components/MicrosoftSSOWebView';
import { microsoftSSOService, MicrosoftUserInfo } from '../services/microsoftSSOService';

export const MicrosoftSSOLoginExample = () => {
  const [showMicrosoftSSO, setShowMicrosoftSSO] = useState(false);
  const [userInfo, setUserInfo] = useState<MicrosoftUserInfo | null>(null);

  const handleMicrosoftLogin = () => {
    setShowMicrosoftSSO(true);
  };

  const handleSSOSuccess = async (msUserInfo: MicrosoftUserInfo) => {
    console.log('✅ Microsoft SSO Success:', msUserInfo);
    
    setShowMicrosoftSSO(false);
    setUserInfo(msUserInfo);

    // TODO: Gửi token lên backend của bạn để tạo session
    try {
      const accessToken = await microsoftSSOService.getAccessToken();
      
      // Call API backend của bạn
      const response = await fetch('https://iu.cmcu.edu.vn/cmsapi/api/auth/microsoft-sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          email: msUserInfo.email,
          name: msUserInfo.name,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Thành công', `Chào mừng ${msUserInfo.name}!`);
        // Navigate to home screen
      }
    } catch (error: any) {
      console.error('Backend error:', error);
      Alert.alert('Lỗi', 'Không thể kết nối với server');
    }
  };

  const handleSSOError = (error: Error) => {
    console.error('❌ Microsoft SSO Error:', error);
    setShowMicrosoftSSO(false);
    Alert.alert('Lỗi đăng nhập', error.message);
  };

  const handleSSOCancel = () => {
    console.log('⚠️ User cancelled Microsoft SSO');
    setShowMicrosoftSSO(false);
  };

  const handleLogout = async () => {
    await microsoftSSOService.logout();
    setUserInfo(null);
    Alert.alert('Đăng xuất', 'Đã đăng xuất thành công');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microsoft SSO Login</Text>

      {!userInfo ? (
        <>
          <TouchableOpacity style={styles.microsoftButton} onPress={handleMicrosoftLogin}>
            <Text style={styles.microsoftButtonText}>🔐 Đăng nhập Microsoft</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Sử dụng tài khoản Microsoft của trường để đăng nhập
          </Text>
        </>
      ) : (
        <View style={styles.userInfoContainer}>
          <Text style={styles.welcomeText}>Xin chào!</Text>
          <Text style={styles.userName}>{userInfo.name}</Text>
          <Text style={styles.userEmail}>{userInfo.email}</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Microsoft SSO WebView Modal */}
      <MicrosoftSSOWebView
        visible={showMicrosoftSSO}
        onSuccess={handleSSOSuccess}
        onError={handleSSOError}
        onCancel={handleSSOCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
  },
  microsoftButton: {
    backgroundColor: '#0078D4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 250,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  microsoftButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
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
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
