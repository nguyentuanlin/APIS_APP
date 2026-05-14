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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, StudentInfo } from '../services/sinhVien/scheduleService';

interface CustomDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerProps> = ({ visible, onClose, navigation }) => {
  const { user, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animation cho smooth slide
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const isLecturer = user?.userPortal === 'lecturer';

  // Load student info và menu khi drawer mở
  useEffect(() => {
    if (visible && user) {
      if (!isLecturer) loadStudentInfo();
      loadMenu();
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

  const loadMenu = async () => {
    try {
      setLoading(true);

      if (isLecturer) {
        if (!user?.activeRoleId) {
          setMenuItems([]);
          return;
        }
        const { lecturerService } = await import('../services/giangVien/lecturerService');
        const allMenus = await lecturerService.getMenuByRole(user.activeRoleId);
        const parentMenus = lecturerService.getParentMenus(allMenus);
        const menuStructure = parentMenus.map((parent) => {
          const children = lecturerService.getChildMenus(allMenus, parent.ID);
          return { ...parent, children: children.length > 0 ? children : null };
        });
        setMenuItems(menuStructure);
        return;
      }

      const menuService = (await import('../services/chung/menuService')).default;
      const allMenus = await menuService.getMenuByUser();
      const parentMenus = menuService.getParentMenus(allMenus);
      const menuStructure = parentMenus.map((parent) => {
        const children = menuService.getChildMenus(allMenus, parent.ID);
        return { ...parent, children: children.length > 0 ? children : null };
      });
      setMenuItems(menuStructure);
    } catch (error) {
      console.error('[CustomDrawer] Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bắt cả UUID thuần và format JWT sub <UUID>;<session>;<timestamp>
  const looksLikeUuid = (s: string) => /^[0-9A-Fa-f]{32}(;.*)?$/.test(s.trim());

  const formatStudentName = () => {
    if (isLecturer) {
      const fn = (user?.fullname || '').trim();
      if (fn && !looksLikeUuid(fn)) return fn;
      const un = (user?.username || '').trim();
      if (un && !looksLikeUuid(un) && !un.includes('@')) return un;
      const em = (user?.email || '').trim();
      if (em) return em.split('@')[0];
      return 'Giảng viên';
    }
    if (!studentInfo) return user?.fullname || user?.username || user?.email || 'Sinh viên';
    return `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`;
  };

  const getStudentRole = () => {
    if (isLecturer) return user?.activeRoleName || 'Cổng cán bộ';
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

  // Parse FontAwesome class from TENANH (vd "fal fa-angle-double-right" -> "angle-double-right")
  const parseFaIcon = (tenanh?: string): string | null => {
    if (!tenanh) return null;
    const match = tenanh.match(/fa-([a-z0-9-]+)/i);
    return match ? match[1] : null;
  };

  // Map FA name -> MaterialIcons name. Icon nào ở đây = FA Pro/không render được trong free,
  // dùng MaterialIcons thay thế.
  const faToMaterialFallback: Record<string, string> = {
    // Edit / Đăng ký
    'pen-square': 'edit-note',
    'user-edit': 'edit-note',
    'pencil-alt': 'edit',
    'users-class': 'how-to-reg',
    'chalkboard-teacher': 'cast-for-education',
    // Money / Tài chính
    'coins': 'account-balance-wallet',
    'money-bill-wave': 'payments',
    'money-check-alt': 'payments',
    'sack-dollar': 'account-balance-wallet',
    'hand-holding-usd': 'payments',
    'file-invoice-dollar': 'receipt-long',
    'piggy-bank': 'savings',
    // Học tập
    'book-reader': 'menu-book',
    'graduation-cap': 'school',
    'user-graduate': 'school',
    // Khác
    'angle-double-right': 'chevron-right',
    'door-open': 'meeting-room',
    'door-closed': 'meeting-room',
    'tasks': 'checklist',
    'clipboard-list': 'assignment',
    'concierge-bell': 'support-agent',
  };

  // Check icon có tồn tại trong FontAwesome5 Free font không (glyphMap chứa cả Pro)
  const faGlyphMap: Record<string, any> = (FontAwesome5 as any).glyphMap || {};
  const faHas = (name: string) =>
    Object.prototype.hasOwnProperty.call(faGlyphMap, name) &&
    !Object.prototype.hasOwnProperty.call(faToMaterialFallback, name);

  // Render menu icon - prefer FontAwesome5 from API, fallback to MaterialIcons
  const renderMenuIcon = (machucnang: string, tenanh?: string, size = 24) => {
    const faName = parseFaIcon(tenanh);
    if (faName && faHas(faName)) {
      return (
        <FontAwesome5
          name={faName as any}
          size={size - 2}
          color="#FFFFFF"
          style={styles.menuIcon}
          solid={false}
        />
      );
    }
    const fallbackMi = faName ? faToMaterialFallback[faName] : null;
    const miName = fallbackMi || getIconName(machucnang, tenanh || '');
    return (
      <MaterialIcons
        name={miName as any}
        size={size}
        color="#FFFFFF"
        style={styles.menuIcon}
      />
    );
  };

  // Map icon names from API
  const getIconName = (machucnang: string, tenanh: string): string => {
    // Map based on MACHUCNANG from API
    const iconMap: { [key: string]: string } = {
      // Menu chính
      'CSV.DASH': 'dashboard',
      'CSV.TTUC': 'article',
      'CSV.PROF': 'person',
      'CSV.GOHT': 'school',
      'CSV.DKH': 'how-to-reg',
      'CSV.TKB': 'event',
      'CSV.TAICHINH': 'account-balance-wallet',
      
      // Profile submenu
      'CSV.TNHS': 'description',
      'CSV.XHS': 'folder-open',
      'SV.XXN': 'verified',
      
      // Góc học tập submenu
      'CSV.TCD': 'grade',
      'CSV.DIRL': 'emoji-events',
      'CSV.CTHO': 'menu-book',
      'CSV.DKPC': 'assignment-turned-in',
      
      // Đăng ký trực tuyến submenu
      'CSV.DAKY': 'edit-note',
      'CSV.NVON': 'favorite',
      'CSVXEDM': 'visibility',
      'CSV.TCDAKY': 'search',
      'CSVDKDH': 'explore',
      'CSVDKTMT': 'assignment',
      
      // Thời khóa biểu submenu
      'CSV.LICHH': 'schedule',
      'CSV.LICHT': 'assignment',
      
      // Tài chính submenu
      'CSV.HP': 'payments',
      'CSV.TTHP': 'payment',

      // Hệ thống một cửa
      'SV.GYC': 'support-agent',
      'CSV.HTMC': 'support-agent',

      // Văn bản
      'CSV.VB': 'folder',
      'CSV.vb': 'folder',
      'CSVVB': 'folder',
      'CSV.vbqd': 'description',

      // Góc học tập - bổ sung
      'CSV.HXTN': 'workspace-premium',
      'DKCND': 'verified',

      // ===== Cổng cán bộ =====
      'CCB.LICHGIANG': 'event-note',
      'CCB.TKH': 'event',
      'CCB.TKHDM': 'event-available',
      'CCB.TKHDMSV': 'groups',
      'CCB.TKHDMPH': 'meeting-room',
      'CCB.TKHNPH': 'meeting-room',
      'CCB.TKHNPHGV': 'co-present',
      'CCB.NHTL': 'people',
      'CCB.KXN': 'fact-check',
      'CCB.DTDL': 'swap-horiz',
      'CCB.KLCN': 'work',
      'CBB.KLCB': 'work',
      'CCB.QLD': 'grade',
      'CCB.NhapDiem': 'edit-note',
      'CBB.NDDST': 'list-alt',
      'CCB.NDP': 'inventory',
      'CCB.NDPK': 'rate-review',
      'CCB.CKT': 'edit',
      'CCB.IBD': 'school',
      'CCB.KXPK': 'visibility',
      'CCB.TK': 'bar-chart',
      'CCB.ND.KHT': 'analytics',
      'CCB.ND.LHP': 'analytics',
      'CCB.ND.HP': 'analytics',
      'CCB.PDN': 'show-chart',
      'CCB.KS': 'rate-review',
      'CCB.TTUC': 'newspaper',
      'CCB.VB': 'folder',
      'CCB.vbqd': 'description',
      'CCB.XT': 'assignment-ind',
      'CCB.LCT': 'event-seat',
    };

    return iconMap[machucnang] || 'circle';
  };

  // Map screen names from API
  const getScreenName = (machucnang: string, duongdanhienthi: string): string | null => {
    const screenMap: { [key: string]: string } = {
      'CSV.DASH': 'Home',
      'CSV.TTUC': 'News',
      'CSV.PROF': 'Profile',
      'CSV.LICHH': 'StudySchedule',
      'CSV.LICHT': 'ExamSchedule',
      'CSV.TAICHINH': 'Finance',
      'CSV.TCD': 'GradeLookup',
      'CSV.HP': 'Finance',
      'CSV.TNHS': 'ProfileDetail',
      'CSV.XHS': 'ViewProfile',
      'SV.XXN': 'Confirmation',
      'CSV.DIRL': 'TrainingScore',
      'CSV.CTHO': 'Curriculum',
      'CSV.DKPC': 'Appeal',
      'CSV.TCDAKY': 'RegistrationResult',
      'CSV.DAKY': 'CourseRegistration', // Thêm mapping cho đăng ký học
      'CSV.DKH': 'RegistrationMenu', // Menu đăng ký trực tuyến
      'DKCND': 'GradeRecognition', // Đăng ký công nhận điểm
      'CSV.HXTN': 'GraduationApplication', // Xét tốt nghiệp
      'CSV.NVON': 'WishlistRegistration', // Đăng ký nguyện vọng
      'CSVDKDH': 'StudyOrientation', // Đăng ký định hướng học tập
      'CSVDKTMT': 'ExamRetake', // Đăng ký thi lại
      'SV.GYC': 'OneStopService', // Hệ thống một cửa
      'CSV.TTHP': 'OnlinePayment', // Thanh toán trực tuyến (học phí)
      'CSV.vbqd': 'Document', // Văn bản, quy định, biểu mẫu

      // ===== Cổng cán bộ — chỉ những chức năng đã có screen =====
      'CCB.TTUC': 'News', // Tin tức (dùng chung với cổng SV)
      'CBB.NDDST': 'LecturerGradeEntry', // Nhập điểm theo DS thi (lưu ý prefix CBB, không phải CCB)
      'CCB.NDP': 'LecturerGradeEntryByPhach', // Nhập điểm theo phách
      'CCB.IBD': 'LecturerStudentInfo', // Xem thông tin học tập, chương trình học sinh viên
      'CCB.KXPK': 'LecturerPhucKhao', // Khoa xem Phúc Khảo
      'CCB.NhapDiem': 'LecturerGradeSubmission', // Nhập điểm giảng viên
      'CCB.TKH': 'LecturerSchedule', // Thời khóa biểu / Lịch giảng cá nhân
      'CCB.TKHDM': 'LecturerScheduleAdmin', // Thời khóa biểu - Quản lý (admin)
      'CCB.TKHDMSV': 'LecturerStudentSchedule', // Thời khóa biểu - Sinh viên
      'CCB.TKHDMPH': 'LecturerRoomSchedule', // Thời khóa biểu - Phòng học - Đăng ký mượn phòng
      'CCB.TKHNPH': 'LecturerMultiRoomSchedule', // Lịch giảng đường - theo dõi bận rỗi phòng học
      'CCB.TKHNPHGV': 'LecturerBusyTracking', // Lịch giảng đường - theo dõi bận rỗi giảng viên
      'CCB.KXN': 'LecturerScheduleApproval', // Khoa xác nhận đổi lịch
      'CCB.DTDL': 'LecturerScheduleProcessing', // Đào tạo xử lý đổi lịch
      'CCB.KLCN': 'LecturerWorkload', // Khối lượng cá nhân (mã chuẩn)
      'CBB.KLCB': 'LecturerWorkload', // Khối lượng cá nhân (mã backend đang trả — typo prefix CBB)
      'CCB.LCT': 'LecturerExamGrading', // Xem lịch chấm thi
      'CCB.ND.KHT': 'LecturerGradingProgress', // Thống kê tiến độ nhập điểm theo kế hoạch thi
      'CCB.ND.LHP': 'LecturerGradingProgressByClass', // Thống kê tiến độ nhập điểm theo lớp học phần
      'CCB.ND.HP': 'LecturerGradingProgressBySubject', // Thống kê tiến độ nhập điểm theo học phần
      'CCB.KS': 'LecturerSurveyResult', // Kết quả khảo sát cá nhân
      'CCB.PDN': 'LecturerScoreDistribution', // Thống kê theo phổ điểm - Ngành
      'CCB.VB': 'Document', // Văn bản, quy định, biểu mẫu (parent menu)
      'CCB.vbqd': 'Document', // Văn bản, quy định, biểu mẫu (submenu)
      'CCB.VBQD': 'Document', // (fallback nếu backend trả uppercase)
      'CCB.LICHGIANG': 'LecturerSchedule', // Card cha "Lịch giảng" trên home — shortcut sang TKB
      'CCB.NHTL': 'LecturerClassList', // Danh sách người học theo lớp
    };

    return screenMap[machucnang] || null;
  };

  const handleMenuPress = (item: any) => {
    if (item.children && item.children.length > 0) {
      setExpandedMenus(prev => ({
        ...prev,
        [item.ID]: !prev[item.ID],
      }));
    } else {
      const screenName = getScreenName(item.MACHUCNANG, item.DUONGDANHIENTHI);
      if (!screenName) {
        console.log('[CustomDrawer] No mapping for menu:', item.MACHUCNANG, '-', item.TENCHUCNANG);
        return;
      }
      handleClose();
      setTimeout(() => navigation.navigate(screenName), 50);
    }
  };

  const handleSubMenuPress = (subItem: any) => {
    const screenName = getScreenName(subItem.MACHUCNANG, subItem.DUONGDANHIENTHI);
    if (!screenName) {
      console.log('[CustomDrawer] No mapping for submenu:', subItem.MACHUCNANG, '-', subItem.TENCHUCNANG);
      return;
    }
    handleClose();
    setTimeout(() => navigation.navigate(screenName), 50);
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
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Đang tải menu...</Text>
                  </View>
                ) : (
                  <View style={styles.menuContainer}>
                    {menuItems.map((item) => (
                      <View key={item.ID}>
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => handleMenuPress(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.menuItemContent}>
                            {renderMenuIcon(item.MACHUCNANG, item.TENANH, 24)}
                            <Text style={styles.menuText}>{item.TENCHUCNANG}</Text>
                          </View>
                          {item.children && item.children.length > 0 && (
                            <MaterialIcons
                              name={expandedMenus[item.ID] ? "keyboard-arrow-up" : "chevron-right"}
                              size={20}
                              color="rgba(255, 255, 255, 0.7)"
                            />
                          )}
                        </TouchableOpacity>

                        {/* Expanded Sub-items */}
                        {item.children && item.children.length > 0 && expandedMenus[item.ID] && (
                          <View style={styles.subMenuContainer}>
                            {item.children.map((subItem: any, index: number) => (
                              <TouchableOpacity
                                key={subItem.ID}
                                style={styles.subMenuItem}
                                onPress={() => handleSubMenuPress(subItem)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.subMenuContent}>
                                  <View style={styles.timelineContainer}>
                                    <View style={styles.timelineDot} />
                                    {index < item.children.length - 1 && (
                                      <View style={styles.timelineLine} />
                                    )}
                                  </View>
                                  
                                  <View style={styles.subMenuTextContainer}>
                                    <Text style={styles.subMenuTitle}>{subItem.TENCHUCNANG}</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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