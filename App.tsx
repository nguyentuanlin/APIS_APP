  import 'react-native-gesture-handler';
  import React, { useEffect } from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { AuthProvider, useAuth } from './src/contexts/AuthContext';
  // Import final crypto implementation
  import { FinalCrypto } from './src/utils/finalCrypto';
  import { scheduleService } from './src/services/sinhVien/scheduleService';
  import { fcmService } from './src/services/chung/fcmService';
  import LoginScreen from './src/screens/chung/LoginScreen';
  import HomeScreen from './src/screens/sinhVien/HomeScreen';
  import LecturerHomeScreen from './src/screens/giangVien/LecturerHomeScreen';
  import LecturerGradeEntryScreen from './src/screens/giangVien/LecturerGradeEntryScreen';
  import LecturerGradeEntryByPhachScreen from './src/screens/giangVien/LecturerGradeEntryByPhachScreen';
  import LecturerStudentInfoScreen from './src/screens/giangVien/LecturerStudentInfoScreen';
  import LecturerPhucKhaoScreen from './src/screens/giangVien/LecturerPhucKhaoScreen';
  import LecturerGradeSubmissionScreen from './src/screens/giangVien/LecturerGradeSubmissionScreen';
  import LecturerScheduleScreen from './src/screens/giangVien/LecturerScheduleScreen';
  import LecturerScheduleAdminScreen from './src/screens/giangVien/LecturerScheduleAdminScreen';
  import LecturerStudentScheduleScreen from './src/screens/giangVien/LecturerStudentScheduleScreen';
  import LecturerRoomScheduleScreen from './src/screens/giangVien/LecturerRoomScheduleScreen';
  import LecturerMultiRoomScheduleScreen from './src/screens/giangVien/LecturerMultiRoomScheduleScreen';
  import LecturerBusyTrackingScreen from './src/screens/giangVien/LecturerBusyTrackingScreen';
  import LecturerScheduleApprovalScreen from './src/screens/giangVien/LecturerScheduleApprovalScreen';
  import LecturerScheduleProcessingScreen from './src/screens/giangVien/LecturerScheduleProcessingScreen';
  import LecturerWorkloadScreen from './src/screens/giangVien/LecturerWorkloadScreen';
  import LecturerExamGradingScreen from './src/screens/giangVien/LecturerExamGradingScreen';
  import LecturerGradingProgressScreen from './src/screens/giangVien/LecturerGradingProgressScreen';
  import LecturerGradingProgressByClassScreen from './src/screens/giangVien/LecturerGradingProgressByClassScreen';
  import LecturerGradingProgressBySubjectScreen from './src/screens/giangVien/LecturerGradingProgressBySubjectScreen';
  import LecturerSurveyResultScreen from './src/screens/giangVien/LecturerSurveyResultScreen';
  import LecturerScoreDistributionScreen from './src/screens/giangVien/LecturerScoreDistributionScreen';
  import LecturerClassListScreen from './src/screens/giangVien/LecturerClassListScreen';
  import NewsScreen from './src/screens/chung/NewsScreen';
  import ProfileScreen from './src/screens/sinhVien/ProfileScreen';
  import RecruitmentScreen from './src/screens/sinhVien/RecruitmentScreen';
  import StudyScheduleScreen from './src/screens/sinhVien/StudyScheduleScreen';
  import ExamScheduleScreen from './src/screens/sinhVien/ExamScheduleScreen';
  import FinanceScreen from './src/screens/sinhVien/FinanceScreen';
  import GradeLookupScreen from './src/screens/sinhVien/GradeLookupScreen';
  import RegistrationMenuScreen from './src/screens/sinhVien/RegistrationMenuScreen';
  import ProfileDetailScreen from './src/screens/sinhVien/ProfileDetailScreen';
  import ViewProfileScreen from './src/screens/sinhVien/ViewProfileScreen';
  import ConfirmationScreen from './src/screens/sinhVien/ConfirmationScreen';
  import TrainingScoreScreen from './src/screens/sinhVien/TrainingScoreScreen';
  import TrainingScoreDetailScreen from './src/screens/sinhVien/TrainingScoreDetailScreen';
  import CurriculumScreen from './src/screens/sinhVien/CurriculumScreen';
  import AppealScreen from './src/screens/sinhVien/AppealScreen';
  import RegistrationResultScreen from './src/screens/sinhVien/RegistrationResultScreen';
  import CourseRegistrationScreen from './src/screens/sinhVien/CourseRegistrationScreen';
  import CourseClassDetailScreen from './src/screens/sinhVien/CourseClassDetailScreen';
  import GradeRecognitionScreen from './src/screens/sinhVien/GradeRecognitionScreen';
  import GraduationApplicationScreen from './src/screens/sinhVien/GraduationApplicationScreen';
  import WishlistRegistrationScreen from './src/screens/sinhVien/WishlistRegistrationScreen';
  import StudyOrientationScreen from './src/screens/sinhVien/StudyOrientationScreen';
  import ExamRetakeScreen from './src/screens/sinhVien/ExamRetakeScreen';
  import OneStopServiceScreen from './src/screens/sinhVien/OneStopServiceScreen';
  import OnlinePaymentScreen from './src/screens/sinhVien/OnlinePaymentScreen';
  import DocumentScreen from './src/screens/chung/DocumentScreen';
  import { ActivityIndicator, View, StyleSheet } from 'react-native';
  const Stack = createNativeStackNavigator();

  function Navigation() {
    const { isAuthenticated, isLoading, user } = useAuth();

    const isLecturer = user?.userPortal === 'lecturer';

    // Preload dữ liệu khi user đã đăng nhập (chỉ áp dụng cho cổng sinh viên)
    useEffect(() => {
      if (isAuthenticated && user && !isLecturer) {
        // Preload schedule data ngầm để cải thiện performance
        scheduleService.preloadScheduleData().catch(console.warn);
        // Đăng ký nhận push notification (FCM) sau khi đã đăng nhập
        fcmService.init(user).catch(err => console.warn('[FCM] init failed:', err));
      }
    }, [isAuthenticated, user, isLecturer]);

    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            isLecturer ? (
              <>
                <Stack.Screen
                  name="LecturerHome"
                  component={LecturerHomeScreen}
                  options={{ animationTypeForReplace: 'pop' }}
                />
                <Stack.Screen name="News" component={NewsScreen} />
                <Stack.Screen name="LecturerGradeEntry" component={LecturerGradeEntryScreen} />
                <Stack.Screen name="LecturerGradeEntryByPhach" component={LecturerGradeEntryByPhachScreen} />
                <Stack.Screen name="LecturerStudentInfo" component={LecturerStudentInfoScreen} />
                <Stack.Screen name="LecturerPhucKhao" component={LecturerPhucKhaoScreen} />
                <Stack.Screen name="LecturerGradeSubmission" component={LecturerGradeSubmissionScreen} />
                <Stack.Screen name="LecturerSchedule" component={LecturerScheduleScreen} />
                <Stack.Screen name="LecturerScheduleAdmin" component={LecturerScheduleAdminScreen} />
                <Stack.Screen name="LecturerStudentSchedule" component={LecturerStudentScheduleScreen} />
                <Stack.Screen name="LecturerRoomSchedule" component={LecturerRoomScheduleScreen} />
                <Stack.Screen name="LecturerMultiRoomSchedule" component={LecturerMultiRoomScheduleScreen} />
                <Stack.Screen name="LecturerBusyTracking" component={LecturerBusyTrackingScreen} />
                <Stack.Screen name="LecturerScheduleApproval" component={LecturerScheduleApprovalScreen} />
                <Stack.Screen name="LecturerScheduleProcessing" component={LecturerScheduleProcessingScreen} />
                <Stack.Screen name="LecturerWorkload" component={LecturerWorkloadScreen} />
                <Stack.Screen name="LecturerExamGrading" component={LecturerExamGradingScreen} />
                <Stack.Screen name="LecturerGradingProgress" component={LecturerGradingProgressScreen} />
                <Stack.Screen name="LecturerGradingProgressByClass" component={LecturerGradingProgressByClassScreen} />
                <Stack.Screen name="LecturerGradingProgressBySubject" component={LecturerGradingProgressBySubjectScreen} />
                <Stack.Screen name="LecturerSurveyResult" component={LecturerSurveyResultScreen} />
                <Stack.Screen name="LecturerScoreDistribution" component={LecturerScoreDistributionScreen} />
                <Stack.Screen name="LecturerClassList" component={LecturerClassListScreen} />
                <Stack.Screen name="Document" component={DocumentScreen} />
              </>
            ) : (
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
              <Stack.Screen name="RegistrationMenu" component={RegistrationMenuScreen} />
              <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
              <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
              <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
              <Stack.Screen name="TrainingScore" component={TrainingScoreScreen} />
              <Stack.Screen name="TrainingScoreDetail" component={TrainingScoreDetailScreen} />
              <Stack.Screen name="Curriculum" component={CurriculumScreen} />
              <Stack.Screen name="Appeal" component={AppealScreen} />
              <Stack.Screen name="RegistrationResult" component={RegistrationResultScreen} />
              <Stack.Screen name="CourseRegistration" component={CourseRegistrationScreen} />
              <Stack.Screen name="CourseClassDetail" component={CourseClassDetailScreen} />
              <Stack.Screen name="GradeRecognition" component={GradeRecognitionScreen} />
              <Stack.Screen name="GraduationApplication" component={GraduationApplicationScreen} />
              <Stack.Screen name="WishlistRegistration" component={WishlistRegistrationScreen} />
              <Stack.Screen name="StudyOrientation" component={StudyOrientationScreen} />
              <Stack.Screen name="ExamRetake" component={ExamRetakeScreen} />
              <Stack.Screen name="OneStopService" component={OneStopServiceScreen} />
              <Stack.Screen name="OnlinePayment" component={OnlinePaymentScreen} />
              <Stack.Screen name="Document" component={DocumentScreen} />
            </>
            )
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
