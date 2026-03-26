/**
 * Microsoft Native Login Component
 * Using react-native-app-auth
 * 
 * Mở system browser, tự động exchange tokens
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { microsoftNativeService, MicrosoftUser } from '../services/microsoftNativeService';
import { validateNativeConfig } from '../config/microsoftNativeConfig';

interface MicrosoftNativeLoginProps {
  onSuccess: (user: MicrosoftUser) => void;
  onError?: (error: Error) => void;
}

export const MicrosoftNativeLogin: React.FC<MicrosoftNativeLoginProps> = ({
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);

      // Validate config
      const isValid = validateNativeConfig();
      if (!isValid) {
        throw new Error('Invalid configuration');
      }

      console.log('🔐 Starting Microsoft Native Login...');

      // Login - mở system browser
      const user = await microsoftNativeService.login();

      console.log('✅ Login successful:', user);

      // Callback
      onSuccess(user);
    } catch (error: any) {
      console.error('❌ Login error:', error);

      // Show error alert
      Alert.alert(
        'Lỗi đăng nhập',
        error.message || 'Không thể đăng nhập với Microsoft',
        [{ text: 'OK' }]
      );

      // Callback
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={handleLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.buttonText}>Đang đăng nhập...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.buttonText}>Đăng nhập Microsoft</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0078D4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
