import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView, 
  Image,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import CustomDrawer from '../components/CustomDrawer';
import { scheduleService, ScheduleItem, StudentInfo } from '../services/scheduleService';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(true);

  // Function để lấy lời chào theo thời gian Việt Nam
  const getGreetingByTime = () => {
    const now = new Date();
    // Lấy giờ hiện tại của thiết bị (đã là giờ Việt Nam)
    const hour = now.getHours();

    if (hour >= 5 && hour < 12) {
      return 'Chào buổi sáng';
    } else if (hour >= 12 && hour < 18) {
      return 'Chào buổi chiều';
    } else {
      return 'Chào buổi tối';
    }
  };

  useEffect(() => {
    loadTodaySchedule();
  }, []);

  const loadTodaySchedule = async () => {
    try {
      setLoadingSchedule(true);
      setLoadingStudentInfo(true);
      
      // Load thông tin sinh viên ngay lập tức (không delay)
      const [schedules, student] = await Promise.all([
        scheduleService.getTodaySchedule(),
        scheduleService.getStudentInfo()
      ]);
      
      // Lọc lịch hôm nay
      const today = new Date();
      const todayString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      const todayClasses = schedules.filter(schedule => schedule.NGAYHOC === todayString);
      
      setTodaySchedules(todayClasses);
      setStudentInfo(student);
    } catch (error) {
      console.error('Error loading today schedule:', error);
    } finally {
      setLoadingSchedule(false);
      setLoadingStudentInfo(false);
    }
  };

  // Function để tạo thông báo chào mừng dựa trên lịch học/thi
  const getWelcomeMessage = () => {
    if (!studentInfo || todaySchedules.length === 0) {
      return 'Hãy kiểm tra thông tin học tập của bạn hôm nay';
    }

    const examSchedules = todaySchedules.filter(schedule => schedule.PHANLOAI === 'LICHTHI');
    const studySchedules = todaySchedules.filter(schedule => schedule.PHANLOAI === 'LICHHOC');
    
    const examCount = examSchedules.length;
    const studyCount = studySchedules.length;

    if (examCount > 0 && studyCount > 0) {
      return `Hôm nay bạn có ${studyCount} lịch học và ${examCount} lịch thi. Chúc bạn học hành chăm chỉ và thi điểm cao nha!`;
    } else if (examCount > 0) {
      return `Hôm nay bạn có ${examCount} lịch thi. Chúc bạn thi tốt!`;
    } else if (studyCount > 0) {
      return `Hôm nay bạn có ${studyCount} lịch học. Chúc bạn học tốt!`;
    } else {
      return 'Hôm nay bạn không có lịch học hay lịch thi. Hãy tận dụng thời gian để ôn tập!';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTodaySchedule();
    setIsRefreshing(false);
  };

  // Quick access features for students
  const quickFeatures = [
    {
      id: 'schedule',
      title: 'Thời khóa biểu',
      subtitle: 'Xem lịch học hôm nay',
      icon: 'schedule',
      color: '#3B82F6',
      screen: 'StudySchedule',
    },
    {
      id: 'exam',
      title: 'Lịch thi',
      subtitle: 'Xem lịch thi các môn',
      icon: 'assignment',
      color: '#EF4444',
      screen: 'ExamSchedule',
    },
    {
      id: 'learning',
      title: 'Góc học tập',
      subtitle: 'Khóa học trực tuyến',
      icon: 'school',
      color: '#10B981',
      screen: 'Learning',
    },
    {
      id: 'finance',
      title: 'Tài chính',
      subtitle: 'Học phí & thanh toán',
      icon: 'account-balance-wallet',
      color: '#F59E0B',
      screen: 'Finance',
    },
  ];

  // Student stats/info cards - cập nhật với thông tin thực
  const getStudentStats = () => {
    if (!studentInfo) {
      return [
        {
          title: 'Điểm trung bình',
          value: '8.5',
          subtitle: 'GPA học kỳ',
          icon: 'star',
          color: '#10B981',
        },
        {
          title: 'Tín chỉ',
          value: '120',
          subtitle: 'Đã hoàn thành',
          icon: 'library-books',
          color: '#3B82F6',
        },
        {
          title: 'Môn học',
          value: '6',
          subtitle: 'Học kỳ này',
          icon: 'subject',
          color: '#8B5CF6',
        },
        {
          title: 'Thông báo',
          value: '3',
          subtitle: 'Chưa đọc',
          icon: 'notifications',
          color: '#F59E0B',
        },
      ];
    }

    return [
      {
        title: 'Mã sinh viên',
        value: studentInfo.QLSV_NGUOIHOC_MASO,
        subtitle: 'Student ID',
        icon: 'badge',
        color: '#3B82F6',
      },
      {
        title: 'Lớp học',
        value: studentInfo.DAOTAO_LOPQUANLY_MA,
        subtitle: studentInfo.DAOTAO_LOPQUANLY_TEN,
        icon: 'school',
        color: '#10B981',
      },
      {
        title: 'Khóa',
        value: studentInfo.DAOTAO_KHOADAOTAO_MA,
        subtitle: studentInfo.DAOTAO_KHOADAOTAO_TEN,
        icon: 'timeline',
        color: '#8B5CF6',
      },
      {
        title: 'Trạng thái',
        value: studentInfo.QLSV_TRANGTHAINGUOIHOC_MA === 'NORMAL' ? 'Bình thường' : studentInfo.QLSV_TRANGTHAINGUOIHOC_MA,
        subtitle: studentInfo.QLSV_TRANGTHAINGUOIHOC_TEN,
        icon: 'info',
        color: '#10B981',
      },
    ];
  };

  const renderTodaySchedule = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch học hôm nay</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('StudySchedule' as never)}
          >
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {loadingSchedule ? (
          <View style={styles.scheduleLoadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.scheduleLoadingText}>Đang tải lịch học...</Text>
          </View>
        ) : todaySchedules.length === 0 ? (
          <View style={styles.noScheduleCard}>
            <MaterialIcons name="event-available" size={48} color="#D1D5DB" />
            <Text style={styles.noScheduleTitle}>Không có lịch học hôm nay</Text>
            <Text style={styles.noScheduleSubtitle}>Hãy tận dụng thời gian để ôn tập!</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scheduleScrollContent}
          >
            {todaySchedules.slice(0, 3).map((schedule) => (
              <TouchableOpacity 
                key={schedule.ID} 
                style={styles.scheduleCard}
                onPress={() => navigation.navigate('StudySchedule' as never)}
              >
                <View style={[
                  styles.scheduleTypeBar,
                  { backgroundColor: schedule.PHANLOAI === 'LICHTHI' ? '#EF4444' : '#3B82F6' }
                ]} />
                
                <View style={styles.scheduleCardContent}>
                  <Text style={styles.scheduleSubject} numberOfLines={2}>
                    {schedule.TENHOCPHAN}
                  </Text>
                  
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleInfoRow}>
                      <MaterialIcons name="access-time" size={16} color="#6B7280" />
                      <Text style={styles.scheduleInfoText}>
                        {scheduleService.formatScheduleTime(schedule)}
                      </Text>
                    </View>
                    
                    <View style={styles.scheduleInfoRow}>
                      <MaterialIcons name="location-on" size={16} color="#6B7280" />
                      <Text style={styles.scheduleInfoText}>
                        {schedule.TENPHONGHOC}
                      </Text>
                    </View>
                    
                    {schedule.GIANGVIEN && (
                      <View style={styles.scheduleInfoRow}>
                        <MaterialIcons name="person" size={16} color="#6B7280" />
                        <Text style={styles.scheduleInfoText} numberOfLines={1}>
                          {schedule.GIANGVIEN}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {schedule.PHANLOAI === 'LICHTHI' && (
                    <View style={styles.examBadge}>
                      <Text style={styles.examBadgeText}>THI</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            {todaySchedules.length > 3 && (
              <TouchableOpacity 
                style={styles.moreScheduleCard}
                onPress={() => navigation.navigate('StudySchedule' as never)}
              >
                <MaterialIcons name="more-horiz" size={32} color="#6B7280" />
                <Text style={styles.moreScheduleText}>
                  +{todaySchedules.length - 3} môn khác
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header với Cover Image */}
      <View style={styles.headerContainer}>
        {/* Cover Image/Gradient Background */}
        {user?.coverImage ? (
          <Image
            source={{ uri: user.coverImage }}
            style={styles.coverImage}
            blurRadius={1}
          />
        ) : (
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          />
        )}
        
        {/* Overlay để text dễ đọc */}
        <View style={styles.headerOverlay} />
        
        {/* Header Content */}
        <View style={styles.headerContent}>
          {/* Menu button */}
          <TouchableOpacity
            onPress={() => setShowDrawer(true)}
            style={styles.menuButton}
          >
            <MaterialIcons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreetingByTime()},</Text>
            {loadingStudentInfo ? (
              <View style={styles.loadingNameContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingNameText}>Đang tải...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.userName}>
                  {studentInfo 
                    ? `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`
                    : 'Sinh viên'
                  }
                </Text>
                <Text style={styles.userRole}>
                  {studentInfo 
                    ? `${studentInfo.QLSV_NGUOIHOC_MASO} - ${studentInfo.DAOTAO_LOPQUANLY_TEN}`
                    : 'Cổng thông tin sinh viên'
                  }
                </Text>
              </>
            )}
          </View>
          
          <View style={styles.avatarWrapperHeader}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} activeOpacity={0.9}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {studentInfo 
                      ? studentInfo.QLSV_NGUOIHOC_TEN.charAt(0)
                      : user?.fullname?.charAt(0) || 'S'
                    }
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Right Action Buttons */}
        <View style={styles.topActionsContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('News' as never)}
            style={styles.topActionButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.topActionButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="settings" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['#F8FAFC', '#E2E8F0']}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <MaterialIcons name="school" size={32} color="#3B82F6" />
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>
                  {studentInfo ? 'Chào mừng trở lại!' : 'Chào mừng trở lại!'}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  {getWelcomeMessage()}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Student Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin học tập</Text>
          <View style={styles.statsGrid}>
            {getStudentStats().map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                  <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Today's Schedule */}
        {renderTodaySchedule()}

        {/* Quick Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính năng chính</Text>
          <View style={styles.featuresGrid}>
            {quickFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => navigation.navigate(feature.screen as never)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[`${feature.color}15`, `${feature.color}08`]}
                  style={styles.featureGradient}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                    <MaterialIcons name={feature.icon as any} size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer - Quick Actions */}
      <View style={styles.footerContainer}>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('StudySchedule' as never)}
          >
            <View style={styles.quickActionIconContainer}>
              <MaterialIcons name="schedule" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Lịch học</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ExamSchedule' as never)}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: '#EF4444' }]}>
              <MaterialIcons name="assignment" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Lịch thi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Learning' as never)}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: '#10B981' }]}>
              <MaterialIcons name="school" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Học tập</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Drawer */}
      <CustomDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  topActionsContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  topActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coverImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapperHeader: {
    position: 'relative',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loadingNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  loadingNameText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  quickActionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  contentContainer: {
    paddingBottom: 100, // Để tránh bị che bởi footer
  },
  welcomeCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32, // Safe area cho iPhone
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 4,
    fontWeight: '600',
  },
  // Today Schedule Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  scheduleLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  scheduleLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noScheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noScheduleSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scheduleScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  scheduleTypeBar: {
    height: 4,
    width: '100%',
  },
  scheduleCardContent: {
    padding: 16,
    position: 'relative',
  },
  scheduleSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 20,
  },
  scheduleInfo: {
    gap: 8,
  },
  scheduleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleInfoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  examBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  examBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  moreScheduleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    width: 120,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  moreScheduleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;