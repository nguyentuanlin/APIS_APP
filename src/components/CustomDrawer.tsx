import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, StudentInfo } from '../services/scheduleService';

interface CustomDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerProps> = ({ visible, onClose, navigation }) => {
  const { user, logout } = useAuth();
  const [expandedSchedule, setExpandedSchedule] = useState(false);
  const [expandedFinance, setExpandedFinance] = useState(false);
  const [expandedLearning, setExpandedLearning] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  
  // Animation cho smooth slide
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Load student info khi drawer mở
  useEffect(() => {
    if (visible && user) {
      loadStudentInfo();
    }
  }, [visible, user]);

  const loadStudentInfo = async () => {
    try {
      const info = await scheduleService.getStudentInfo();
      setStudentInfo(info);
    } catch (error) {
      console.error('[CustomDrawer] Error loading student info:', error);
    }
  };

  const formatStudentName = () => {
    if (!studentInfo) return user?.fullname || user?.username || user?.email || 'Sinh viên';
    return `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`;
  };

  const getStudentRole = () => {
    if (!studentInfo) return 'Sinh viên';
    return `${studentInfo.DAOTAO_LOPQUANLY_TEN} - ${studentInfo.DAOTAO_KHOAQUANLY_TEN}`;
  };

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out trước khi close
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const menuItems = [
    {
      id: 'home',
      title: 'Trang chủ',
      icon: 'home',
      screen: 'Home',
      hasArrow: false,
      expandable: false,
    },
    {
      id: 'news',
      title: 'Tin tức',
      icon: 'newspaper',
      screen: 'News',
      hasArrow: false,
      expandable: false,
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: 'person',
      screen: 'Profile',
      hasArrow: true,
      expandable: false,
    },
    {
      id: 'learning',
      title: 'Góc học tập',
      icon: 'school',
      screen: 'Learning',
      hasArrow: true,
      expandable: true,
    },
    {
      id: 'recruitment',
      title: 'Đăng ký trực tuyến',
      icon: 'how-to-reg',
      screen: 'Recruitment',
      hasArrow: true,
      expandable: false,
    },
    {
      id: 'schedule',
      title: 'Thời khóa biểu',
      icon: 'schedule',
      screen: 'Schedule',
      hasArrow: true,
      expandable: true,
    },
    {
      id: 'finance',
      title: 'Tài chính',
      icon: 'account-balance-wallet',
      screen: 'Finance',
      hasArrow: true,
      expandable: true,
    },
  ];

  const scheduleSubItems = [
    {
      id: 'study',
      title: 'Lịch học',
      icon: 'school',
    },
    {
      id: 'exam',
      title: 'Lịch thi',
      icon: 'assignment',
    },
  ];

  const financeSubItems = [
    {
      id: 'tuition',
      title: 'Học phí',
      icon: 'payments',
    },
    // {
    //   id: 'payment-history',
    //   title: 'Lịch sử thanh toán',
    //   icon: 'receipt',
    // },
    // {
    //   id: 'debt',
    //   title: 'Công nợ',
    //   icon: 'account-balance',
    // },
  ];

  const learningSubItems = [
    {
      id: 'grade-lookup',
      title: 'Tra cứu điểm',
      icon: 'grade',
    },
    {
      id: 'training-score',
      title: 'Điểm rèn luyện',
      icon: 'emoji-events',
    },
    {
      id: 'curriculum',
      title: 'Chương trình học',
      icon: 'menu-book',
    },
    {
      id: 'appeal',
      title: 'Đăng ký xin phúc khảo',
      icon: 'assignment-turned-in',
    },
  ];

  const handleMenuPress = (item: any) => {
    if (item.expandable && item.id === 'schedule') {
      setExpandedSchedule(!expandedSchedule);
    } else if (item.expandable && item.id === 'finance') {
      setExpandedFinance(!expandedFinance);
    } else if (item.expandable && item.id === 'learning') {
      setExpandedLearning(!expandedLearning);
    } else {
      handleClose();
      // Delay navigation một chút để animation hoàn thành
      setTimeout(() => {
        navigation.navigate(item.screen);
      }, 50);
    }
  };

  const handleScheduleSubItemPress = (subItem: any) => {
    handleClose();
    
    setTimeout(() => {
      if (subItem.id === 'study') {
        navigation.navigate('StudySchedule');
      } else if (subItem.id === 'exam') {
        navigation.navigate('ExamSchedule');
      }
    }, 50);
  };

  const handleFinanceSubItemPress = (subItem: any) => {
    handleClose();
    
    setTimeout(() => {
      // Navigate to Finance screen with specific tab/section
      navigation.navigate('Finance', { section: subItem.id });
    }, 50);
  };

  const handleLearningSubItemPress = (subItem: any) => {
    handleClose();
    
    setTimeout(() => {
      if (subItem.id === 'grade-lookup') {
        navigation.navigate('GradeLookup');
      } else {
        // TODO: Navigate to other learning screens when implemented
        console.log('Learning sub-item pressed:', subItem.id);
      }
    }, 50);
  };

  const handleLogout = () => {
    handleClose();
    setTimeout(async () => {
      // Đăng xuất trực tiếp, authService.logout() sẽ xử lý việc clear cache
      logout();
    }, 50);
  };

  return (
    <Modal
      visible={visible}
      animationType="none" // Tắt animation mặc định để dùng custom
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1} 
            onPress={handleClose}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            style={styles.gradient}
          >
            <SafeAreaView style={styles.safeArea}>
              {/* Header với thông tin user */}
              <View style={styles.header}>
                <View style={styles.userInfo}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {formatStudentName().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {formatStudentName()}
                    </Text>
                    <Text style={styles.userRole}>
                      {getStudentRole()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Menu Items */}
              <ScrollView 
                style={styles.menuScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.menuContainer}>
                  {menuItems.map((item) => (
                    <View key={item.id}>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => handleMenuPress(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.menuItemContent}>
                          <MaterialIcons
                            name={item.icon as any}
                            size={24}
                            color="#FFFFFF"
                            style={styles.menuIcon}
                          />
                          <Text style={styles.menuText}>{item.title}</Text>
                        </View>
                        {item.hasArrow && (
                          <MaterialIcons
                            name={
                              item.expandable && item.id === 'schedule' && expandedSchedule
                                ? "keyboard-arrow-up"
                                : item.expandable && item.id === 'finance' && expandedFinance
                                ? "keyboard-arrow-up"
                                : item.expandable && item.id === 'learning' && expandedLearning
                                ? "keyboard-arrow-up"
                                : "chevron-right"
                            }
                            size={20}
                            color="rgba(255, 255, 255, 0.7)"
                          />
                        )}
                      </TouchableOpacity>

                      {/* Expanded Schedule Sub-items */}
                      {item.id === 'schedule' && expandedSchedule && (
                        <View style={styles.subMenuContainer}>
                          {scheduleSubItems.map((subItem, index) => (
                            <TouchableOpacity
                              key={subItem.id}
                              style={styles.subMenuItem}
                              onPress={() => handleScheduleSubItemPress(subItem)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.subMenuContent}>
                                <View style={styles.timelineContainer}>
                                  <View style={styles.timelineDot} />
                                  {index < scheduleSubItems.length - 1 && (
                                    <View style={styles.timelineLine} />
                                  )}
                                </View>
                                
                                <View style={styles.subMenuTextContainer}>
                                  <Text style={styles.subMenuTitle}>{subItem.title}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Expanded Finance Sub-items */}
                      {item.id === 'finance' && expandedFinance && (
                        <View style={styles.subMenuContainer}>
                          {financeSubItems.map((subItem, index) => (
                            <TouchableOpacity
                              key={subItem.id}
                              style={styles.subMenuItem}
                              onPress={() => handleFinanceSubItemPress(subItem)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.subMenuContent}>
                                <View style={styles.timelineContainer}>
                                  <View style={[styles.timelineDot, { backgroundColor: '#F59E0B' }]} />
                                  {index < financeSubItems.length - 1 && (
                                    <View style={[styles.timelineLine, { backgroundColor: 'rgba(245, 158, 11, 0.3)' }]} />
                                  )}
                                </View>
                                
                                <View style={styles.subMenuTextContainer}>
                                  <Text style={styles.subMenuTitle}>{subItem.title}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Expanded Learning Sub-items */}
                      {item.id === 'learning' && expandedLearning && (
                        <View style={styles.subMenuContainer}>
                          {learningSubItems.map((subItem, index) => (
                            <TouchableOpacity
                              key={subItem.id}
                              style={styles.subMenuItem}
                              onPress={() => handleLearningSubItemPress(subItem)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.subMenuContent}>
                                <View style={styles.timelineContainer}>
                                  <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                                  {index < learningSubItems.length - 1 && (
                                    <View style={[styles.timelineLine, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]} />
                                  )}
                                </View>
                                
                                <View style={styles.subMenuTextContainer}>
                                  <Text style={styles.subMenuTitle}>{subItem.title}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Footer với nút đăng xuất */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="logout" size={20} color="#FFFFFF" />
                  <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  menuScrollView: {
    flex: 1,
  },
  menuContainer: {
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  subMenuContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 10,
  },
  subMenuItem: {
    paddingVertical: 12,
    paddingLeft: 20,
  },
  subMenuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    top: 18,
  },
  subMenuTextContainer: {
    flex: 1,
  },
  subMenuTitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
});

export default CustomDrawer;