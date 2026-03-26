  import 'react-native-gesture-handler';
  import React, { useEffect } from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { AuthProvider, useAuth } from './src/contexts/AuthContext';
  // Import final crypto implementation
  import { FinalCrypto } from './src/utils/finalCrypto';
  import { scheduleService } from './src/services/scheduleService';
  import LoginScreen from './src/screens/LoginScreen';
  import HomeScreen from './src/screens/HomeScreen';
  
  import SettingsScreen from './src/screens/SettingsScreen';
  import NewsScreen from './src/screens/NewsScreen';
  import ProfileScreen from './src/screens/ProfileScreen';
  import RecruitmentScreen from './src/screens/RecruitmentScreen';
  import StudyScheduleScreen from './src/screens/StudyScheduleScreen';
  import ExamScheduleScreen from './src/screens/ExamScheduleScreen';
  import FinanceScreen from './src/screens/FinanceScreen';
  import GradeLookupScreen from './src/screens/GradeLookupScreen';
  import { ActivityIndicator, View, StyleSheet } from 'react-native';
  const Stack = createNativeStackNavigator();

  function Navigation() {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Preload dữ liệu khi user đã đăng nhập
    useEffect(() => {
      if (isAuthenticated && user) {
        // Preload schedule data ngầm để cải thiện performance
        scheduleService.preloadScheduleData().catch(console.warn);
      }
    }, [isAuthenticated, user]);

    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ animationTypeForReplace: 'pop' }}
              />
              <Stack.Screen name="News" component={NewsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Recruitment" component={RecruitmentScreen} />
              <Stack.Screen name="StudySchedule" component={StudyScheduleScreen} />
              <Stack.Screen name="ExamSchedule" component={ExamScheduleScreen} />
              <Stack.Screen name="Finance" component={FinanceScreen} />
              <Stack.Screen name="GradeLookup" component={GradeLookupScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ animationTypeForReplace: 'push' }}
              />
            </>
          )}
        </Stack.Navigator>
        
        {/* Loading overlay khi đang xử lý auth */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
      </NavigationContainer>
    );
  }

  export default function App() {
    // Test crypto functionality
    React.useEffect(() => {
      // console.log('🔐 Testing Final Crypto Implementation...');
      
      try {
        const message = 'Hello World';
        // console.log('Original message:', message);
        
        // Test hash functions
        // console.log('=== Hash Functions ===');
        // console.log('MD5:', FinalCrypto.md5(message));
        // console.log('SHA256:', FinalCrypto.sha256(message));
        // console.log('SHA512:', FinalCrypto.sha512(message));
        
        // Test HMAC
        // console.log('=== HMAC ===');
        const signature = FinalCrypto.hmacSHA256(message, 'secret-key');
        // console.log('HMAC-SHA256:', signature);
        
        // Test encoding
        // console.log('=== Encoding ===');
        const encoded = FinalCrypto.base64Encode(message);
        const decoded = FinalCrypto.base64Decode(encoded);
        // console.log('Base64 encoded:', encoded);
        // console.log('Base64 decoded:', decoded);
        // console.log('Encoding test passed:', decoded === message);
        
        // Test random generation
        // console.log('=== Random Generation ===');
        // console.log('Random hex (16 bytes):', FinalCrypto.generateRandomHex(16));
        // console.log('Random string (20 chars):', FinalCrypto.generateRandomString(20));
        // console.log('UUID:', FinalCrypto.generateUUID());
        
        // Test password hashing
        // console.log('=== Password Hashing ===');
        const password = 'mySecurePassword123';
        const { hash, salt } = FinalCrypto.hashPassword(password);
        const isValid = FinalCrypto.verifyPassword(password, hash, salt);
        const isInvalid = FinalCrypto.verifyPassword('wrongPassword', hash, salt);
        // console.log('Password hash:', hash);
        // console.log('Salt:', salt);
        // console.log('Valid password verification:', isValid);
        // console.log('Invalid password verification:', isInvalid);
        
        // Test simple encryption
        // console.log('=== Simple Encryption ===');
        const encrypted = FinalCrypto.simpleEncrypt(message, 'encryption-key');
        const decrypted = FinalCrypto.simpleDecrypt(encrypted, 'encryption-key');
        // console.log('Encrypted:', encrypted);
        // console.log('Decrypted:', decrypted);
        // console.log('Encryption test passed:', decrypted === message);
        
        // Test JWT-like tokens
        // console.log('=== JWT-like Tokens ===');
        const payload = { userId: 123, username: 'john_doe', role: 'user' };
        const token = FinalCrypto.createToken(payload, 'jwt-secret', 3600);
        const verification = FinalCrypto.verifyToken(token, 'jwt-secret');
        // console.log('Token:', token);
        // console.log('Token verification:', verification);
        
        // Test API signature
        // console.log('=== API Signature ===');
        const apiData = JSON.stringify({ action: 'getUserData', userId: 123 });
        const apiSignature = FinalCrypto.generateApiSignature(apiData, 'api-secret');
        // console.log('API data:', apiData);
        // console.log('API signature:', apiSignature);
        
        // console.log('✅ All crypto tests passed successfully!');
        // console.log('🎉 FinalCrypto is ready to use in your app!');
        
      } catch (error) {
        console.error('❌ Error testing crypto:', error);
      }
    }, []);

    return (
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );
  }

  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
  });
