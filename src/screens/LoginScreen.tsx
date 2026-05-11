import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MicrosoftSSOWebView } from '../components/MicrosoftSSOWebView';
import { microsoftSSOService, MicrosoftUserInfo } from '../services/microsoftSSOService';
import { GoogleSSOWebView } from '../components/GoogleSSOWebView';
import { googleSSOService, GoogleUserInfo } from '../services/googleSSOService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMicrosoftSSO, setShowMicrosoftSSO] = useState(false);
  const [showGoogleSSO, setShowGoogleSSO] = useState(false);
  const { login, loginWithSSO, isLoading: isLoginLoading } = useAuth();
  const navigation = useNavigation();
  const isLoading = isLoginLoading;

  useEffect(() => {
    const loadRememberedAccount = async () => {
      try {
        const stored = await AsyncStorage.getItem('remembered_account');
        if (stored) setEmail(stored);
      } catch {
        // ignore
      }
    };
    loadRememberedAccount();
  }, []);

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    try {
      await login(email, password);
      try {
        await AsyncStorage.setItem('remembered_account', email);
      } catch {}
    } catch (error: any) {
      const rawMessage = String(error?.message || 'Đăng nhập thất bại');
      const shouldMaskAsWrongCredentials =
        rawMessage.includes('Không thể kết nối tới máy chủ') ||
        rawMessage.includes('Network Error');

      const uiMessage = shouldMaskAsWrongCredentials
        ? 'Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.'
        : rawMessage;

      setErrorMessage(uiMessage);
      Alert.alert('Đăng nhập thất bại', uiMessage);
    }
  };

  const handleMicrosoftLogin = () => setShowMicrosoftSSO(true);

  const handleMicrosoftSSOSuccess = async (userInfo: MicrosoftUserInfo) => {
    setShowMicrosoftSSO(false);
    try {
      await loginWithSSO({
        email: userInfo.email,
        name: userInfo.name,
        provider: 'microsoft',
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo phiên SSO');
    }
  };

  const handleMicrosoftSSOError = (error: Error) => {
    setShowMicrosoftSSO(false);
    Alert.alert('Lỗi đăng nhập Microsoft', error.message);
  };

  const handleMicrosoftSSOCancel = () => setShowMicrosoftSSO(false);

  const handleGoogleLogin = () => setShowGoogleSSO(true);

  const handleGoogleSSOSuccess = async (userInfo: GoogleUserInfo) => {
    setShowGoogleSSO(false);
    try {
      await loginWithSSO({
        email: userInfo.email,
        name: userInfo.name,
        provider: 'google',
        portalUrl: userInfo.portalUrl,
        tokenJWT: userInfo.tokenJWT,
      });
      // AuthContext setUser → App.tsx tự navigate sang HomeStack qua isAuthenticated
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo phiên SSO');
    }
  };

  const handleGoogleSSOError = (error: Error) => {
    setShowGoogleSSO(false);
    Alert.alert('Lỗi đăng nhập Google', error.message);
  };

  const handleGoogleSSOCancel = () => setShowGoogleSSO(false);

  return (
    <ImageBackground
      source={require('../../assets/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>ĐĂNG NHẬP</Text>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <MaterialIcons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập tài khoản hoặc email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.linkRow}>
              <TouchableOpacity>
                <Text style={styles.linkText}>Quên mật khẩu</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpLink}>
                <MaterialIcons name="help-outline" size={14} color="#6B7280" />
                <Text style={styles.linkTextMuted}>Trợ giúp!</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc đăng nhập</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.ssoButton, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="google" size={18} color="#FFFFFF" />
              <Text style={styles.ssoButtonText}>Sign in using Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ssoButton, styles.microsoftButton]}
              onPress={handleMicrosoftLogin}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="microsoft" size={18} color="#FFFFFF" />
              <Text style={styles.ssoButtonText}>Sign in using Microsoft</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MicrosoftSSOWebView
        visible={showMicrosoftSSO}
        onSuccess={handleMicrosoftSSOSuccess}
        onError={handleMicrosoftSSOError}
        onCancel={handleMicrosoftSSOCancel}
      />

      <GoogleSSOWebView
        visible={showGoogleSSO}
        onSuccess={handleGoogleSSOSuccess}
        onError={handleGoogleSSOError}
        onCancel={handleGoogleSSOCancel}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 80, 0.35)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  formCard: {
    backgroundColor: 'rgba(225, 232, 248, 0.92)',
    borderRadius: 18,
    padding: 28,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#DC2626',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
  },
  eyeIcon: {
    padding: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 18,
  },
  linkText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkTextMuted: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  ssoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 10,
    marginBottom: 10,
  },
  googleButton: {
    backgroundColor: '#E04A33',
  },
  microsoftButton: {
    backgroundColor: '#0078D4',
  },
  ssoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;
