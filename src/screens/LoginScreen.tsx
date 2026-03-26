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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// WebView approach (working with Expo Go)
import { MicrosoftSSOWebView } from '../components/MicrosoftSSOWebView';
import { microsoftSSOService, MicrosoftUserInfo } from '../services/microsoftSSOService';
import { GoogleSSOWebView } from '../components/GoogleSSOWebView';
import { googleSSOService, GoogleUserInfo } from '../services/googleSSOService';

// Native SDK approach (requires rebuild)
// import { microsoftNativeService, MicrosoftUser } from '../services/microsoftNativeService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberAccount, setRememberAccount] = useState(false);
  const [showMicrosoftSSO, setShowMicrosoftSSO] = useState(false); // WebView
  const [showGoogleSSO, setShowGoogleSSO] = useState(false); // WebView
  const { login, isLoading: isLoginLoading } = useAuth();
  const navigation = useNavigation();
  const isLoading = isLoginLoading;

  // Load mã sinh viên/email đã lưu (nếu có) khi mở màn
  useEffect(() => {
    const loadRememberedAccount = async () => {
      try {
        const stored = await AsyncStorage.getItem('remembered_account');
        if (stored) {
          setEmail(stored);
          setRememberAccount(true);
        }
      } catch {
        // ignore
      }
    };
    loadRememberedAccount();
  }, []);

  const handleLogin = async () => {
    // console.log('[LoginScreen] 🔘 Nút đăng nhập được nhấn');
    // console.log('[LoginScreen] 📧 Email:', email);
    // console.log('[LoginScreen] 🔑 Password:', password ? '***' : 'empty');
    
    // Clear previous error
    setErrorMessage('');
    
    if (!email || !password) {
      console.warn('[LoginScreen] ⚠️ Mã sinh viên/email hoặc password trống');
      setErrorMessage('Vui lòng nhập đầy đủ mã sinh viên/email và mật khẩu');
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã sinh viên/email và mật khẩu');
      return;
    }

    try {
      // console.log('[LoginScreen] 📝 Gọi login từ AuthContext...');
      await login(email, password);
      // Lưu hoặc xoá mã sinh viên/email tuỳ theo lựa chọn
      try {
        if (rememberAccount) {
          await AsyncStorage.setItem('remembered_account', email);
        } else {
          await AsyncStorage.removeItem('remembered_account');
        }
      } catch {}
      // console.log('[LoginScreen] ✅ Login thành công! Navigation sẽ tự động xử lý.');
      // Navigation sẽ được xử lý tự động bởi App.tsx
    } catch (error: any) {
      console.error('[LoginScreen] ❌ Login thất bại:', error.message);
      setErrorMessage(error.message || 'Đăng nhập thất bại');
      Alert.alert('Đăng nhập thất bại', error.message);
    }
  };

  // Handle Microsoft SSO - WebView (works with Expo Go)
  const handleMicrosoftLogin = () => {
    console.log('[LoginScreen] 🔐 Microsoft SSO button clicked');
    setShowMicrosoftSSO(true);
  };

  const handleMicrosoftSSOSuccess = async (userInfo: MicrosoftUserInfo) => {
    console.log('[LoginScreen] ✅ Microsoft SSO Success:', userInfo);
    
    setShowMicrosoftSSO(false);

    try {
      // Lấy access token
      const accessToken = await microsoftSSOService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('Không thể lấy access token');
      }

      // TODO: Gửi token lên backend để tạo session
      // Tạm thời hiển thị thông báo thành công
      Alert.alert(
        'Đăng nhập thành công',
        `Chào mừng ${userInfo.name}!\n\nEmail: ${userInfo.email}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Navigate to home screen hoặc call backend API
              console.log('[LoginScreen] User info:', userInfo);
              console.log('[LoginScreen] Access token:', accessToken);
            },
          },
        ]
      );

      // TODO: Uncomment khi backend ready
      /*
      const response = await fetch('https://iu.cmcu.edu.vn/cmsapi/api/auth/microsoft-sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          email: userInfo.email,
          name: userInfo.name,
          oid: userInfo.oid,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Login thành công, navigate to home
        // Navigation sẽ được xử lý tự động bởi AuthContext
      } else {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }
      */
    } catch (error: any) {
      console.error('[LoginScreen] ❌ Microsoft SSO backend error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kết nối với server');
    }
  };

  const handleMicrosoftSSOError = (error: Error) => {
    console.error('[LoginScreen] ❌ Microsoft SSO Error:', error);
    setShowMicrosoftSSO(false);
    Alert.alert('Lỗi đăng nhập Microsoft', error.message);
  };

  const handleMicrosoftSSOCancel = () => {
    console.log('[LoginScreen] ⚠️ User cancelled Microsoft SSO');
    setShowMicrosoftSSO(false);
  };

  // Handle Google SSO - WebView (works with Expo Go)
  const handleGoogleLogin = () => {
    console.log('[LoginScreen] 🔐 Google SSO button clicked');
    setShowGoogleSSO(true);
  };

  const handleGoogleSSOSuccess = async (userInfo: GoogleUserInfo) => {
    console.log('[LoginScreen] ✅ Google SSO Success:', userInfo);
    
    setShowGoogleSSO(false);

    try {
      // Lấy access token
      const accessToken = await googleSSOService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('Không thể lấy access token');
      }

      // TODO: Gửi token lên backend để tạo session
      // Tạm thời hiển thị thông báo thành công
      Alert.alert(
        'Đăng nhập thành công',
        `Chào mừng ${userInfo.name}!\n\nEmail: ${userInfo.email}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Navigate to home screen hoặc call backend API
              console.log('[LoginScreen] User info:', userInfo);
              console.log('[LoginScreen] Access token:', accessToken);
            },
          },
        ]
      );

      // TODO: Uncomment khi backend ready
      /*
      const response = await fetch('https://iu.cmcu.edu.vn/cmsapi/api/auth/google-sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          email: userInfo.email,
          name: userInfo.name,
          sub: userInfo.sub,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Login thành công, navigate to home
        // Navigation sẽ được xử lý tự động bởi AuthContext
      } else {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }
      */
    } catch (error: any) {
      console.error('[LoginScreen] ❌ Google SSO backend error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kết nối với server');
    }
  };

  const handleGoogleSSOError = (error: Error) => {
    console.error('[LoginScreen] ❌ Google SSO Error:', error);
    setShowGoogleSSO(false);
    Alert.alert('Lỗi đăng nhập Google', error.message);
  };

  const handleGoogleSSOCancel = () => {
    console.log('[LoginScreen] ⚠️ User cancelled Google SSO');
    setShowGoogleSSO(false);
  };

  return (
    <View style={styles.container}>
      {/* Decorative gradient background */}
      <LinearGradient
        colors={['#0f172a', '#0ea5e9', '#4f46e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.heroGlowTop} />
      <View pointerEvents="none" style={styles.heroGlowBottom} />
      <View pointerEvents="none" style={styles.heroRing} />
      <View pointerEvents="none" style={styles.heroCardShadow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo và Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#38bdf8', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <MaterialCommunityIcons name="school" size={34} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>Cổng Thông Tin</Text>
              </View>
              <View style={styles.brandBadgeSecondary}>
                <MaterialIcons name="school" size={14} color="#10B981" />
                <Text style={styles.brandBadgeSecondaryText}>Sinh Viên</Text>
              </View>
            </View>
            <Text style={styles.title}>Trường Đại Học</Text>
            <Text style={styles.subtitle}>Hệ thống quản lý thông tin sinh viên và học tập</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#10B981" />
                <Text style={styles.metricText}>Bảo mật cao</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="book-open-variant" size={16} color="#F59E0B" />
                <Text style={styles.metricText}>Học tập</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="account-group" size={16} color="#2563EB" />
                <Text style={styles.metricText}>Sinh viên</Text>
              </View>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
              style={styles.cardBorder}
            />
            <Text style={styles.formTitle}>Đăng nhập</Text>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mã sinh viên / Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mã sinh viên hoặc email"
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
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
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
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember account + Forgot Password */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberToggle}
                onPress={() => setRememberAccount(!rememberAccount)}
                disabled={isLoading}
              >
                <View
                  style={[
                    styles.rememberCheckbox,
                    rememberAccount && styles.rememberCheckboxActive,
                  ]}
                >
                  {rememberAccount && (
                    <MaterialIcons name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.rememberLabel}>Ghi nhớ tài khoản</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#2563EB', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtonsContainer}>
              {/* Google Login Button */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <View style={styles.socialButtonContent}>
                  <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </View>
              </TouchableOpacity>

              {/* Microsoft Login Button */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleMicrosoftLogin}
                disabled={isLoading}
              >
                <View style={styles.socialButtonContent}>
                  <MaterialCommunityIcons name="microsoft" size={20} color="#0078D4" />
                  <Text style={styles.socialButtonText}>Microsoft</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Bạn chưa có tài khoản?{' '}
              <Text style={styles.footerLink}>Liên hệ phòng đào tạo</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Microsoft SSO WebView Modal */}
      <MicrosoftSSOWebView
        visible={showMicrosoftSSO}
        onSuccess={handleMicrosoftSSOSuccess}
        onError={handleMicrosoftSSOError}
        onCancel={handleMicrosoftSSOCancel}
      />

      {/* Google SSO WebView Modal */}
      <GoogleSSOWebView
        visible={showGoogleSSO}
        onSuccess={handleGoogleSSOSuccess}
        onError={handleGoogleSSOError}
        onCancel={handleGoogleSSOCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
    alignItems: 'center',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#38bdf8',
    opacity: 0.25,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#6366f1',
    opacity: 0.25,
  },
  heroRing: {
    position: 'absolute',
    top: 80,
    right: 10,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroCardShadow: {
    position: 'absolute',
    top: 180,
    alignSelf: 'center',
    width: '80%',
    height: 60,
    backgroundColor: '#000',
    opacity: 0.15,
    borderRadius: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
    maxWidth: 430,
  },
  logoContainer: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logoGradient: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  brandBadgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#E0E7FF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  brandBadgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  brandBadgeSecondaryText: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 36,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metricText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 26,
    padding: 24,
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 10,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 22,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rememberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rememberCheckboxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  rememberLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  socialButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  footerLink: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
