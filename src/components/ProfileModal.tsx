import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, StudentInfo } from '../services/scheduleService';
import CustomAlert from './CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SESSION_TOTAL_MS = 24 * 60 * 60 * 1000; // 24h

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [remainingSession, setRemainingSession] = useState<string | null>(null);
  const [remainingPercent, setRemainingPercent] = useState<number>(1);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  // Load student info when modal opens
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
      console.error('[ProfileModal] Error loading student info:', error);
    }
  };

  const formatStudentName = () => {
    if (!studentInfo) return user?.fullname || user?.username || user?.email || 'Sinh viên';
    return `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`;
  };

  useEffect(() => {
    let interval: any = null;

    const updateRemaining = async () => {
      try {
        const raw = await AsyncStorage.getItem('session_expires_at');
        if (!raw) {
          setRemainingSession(null);
          return;
        }
        const expires = new Date(raw);
        if (isNaN(expires.getTime())) {
          setRemainingSession(null);
          return;
        }

        const diffMs = expires.getTime() - Date.now();
        if (diffMs <= 0) {
          setRemainingSession('Phiên đã hết hạn');
          setRemainingPercent(0);
          return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let text = '';
        if (hours > 0) {
          text = `Còn ${hours} giờ ${minutes} phút ${seconds} giây`;
        } else {
          text = `Còn ${minutes} phút ${seconds} giây`;
        }
        setRemainingSession(text);

        const pct = Math.max(0, Math.min(1, diffMs / SESSION_TOTAL_MS));
        setRemainingPercent(pct);
      } catch {
        setRemainingSession(null);
      }
    };

    if (visible) {
      updateRemaining();
      interval = setInterval(updateRemaining, 1000);
    } else {
      setRemainingSession(null);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [visible]);

  const handleLogout = () => {
    // console.log('[ProfileModal] 🎯 handleLogout được gọi');
    // console.log('[ProfileModal] 🌐 Platform:', Platform.OS);
    setConfirmVisible(true);
  };

  const performLogout = async () => {
    try {
      // console.log('='.repeat(60));
      // console.log('[ProfileModal] 🚪 User XÁC NHẬN đăng xuất');
      // console.log('[ProfileModal] 📍 Bước 1: Đóng modal...');
      
      // Đóng modal trước
      onClose();
      // console.log('[ProfileModal] ✅ Modal đã gọi onClose()');
      
      // Đợi một chút để modal đóng hoàn toàn
      // console.log('[ProfileModal] ⏳ Đợi 300ms...');
      await new Promise(resolve => setTimeout(resolve, 300));
      // console.log('[ProfileModal] ✅ Đã đợi xong');
      
      // Thực hiện logout
      // console.log('[ProfileModal] 📍 Bước 2: Gọi logout()...');
      // console.log('[ProfileModal] 🔍 logout function:', typeof logout);
      await logout();
      // console.log('[ProfileModal] ✅ Logout hoàn thành');
      // console.log('='.repeat(60));
    } catch (error) {
      console.error('[ProfileModal] ❌ Logout error:', error);
      console.error('[ProfileModal] ❌ Error stack:', error);
      
      if (Platform.OS === 'web') {
        window.alert('Lỗi: Không thể đăng xuất. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
      }
    }
  };

  if (!user) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={styles.overlayTouchable}
            activeOpacity={1} 
            onPress={onClose}
          />
          
          <View style={styles.modalContainer}>
          {/* Cover Image với Gradient */}
          <View style={styles.coverContainer}>
            {user?.coverImage ? (
              <Image
                source={{ uri: user.coverImage }}
                style={styles.coverImage}
              />
            ) : (
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverGradient}
              />
            )}
            
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Avatar & User Info */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {formatStudentName().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.userName}>{formatStudentName()}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Session time remaining */}
            {remainingSession && (
              <View style={styles.sessionCard}>
                <View style={styles.sessionHeaderRow}>
                  <Text style={styles.sessionLabel}>Thời gian còn lại:</Text>
                  <Text style={styles.sessionValue}>{remainingSession}</Text>
                </View>
                <View style={styles.sessionProgressTrack}>
                  <View
                    style={[
                      styles.sessionProgressFill,
                      { width: `${Math.max(0, Math.min(1, remainingPercent)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.sessionHint}>
                  Phiên sẽ tự động hết hạn để đảm bảo an toàn.
                </Text>
              </View>
            )}

            {/* Info Cards */}
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="email" size={20} color="#3B82F6" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoItem}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="person" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>{user.username}</Text>
                </View>
              </View>

              {user.fullname && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoItem}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons name="badge" size={20} color="#10B981" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Họ và tên</Text>
                      <Text style={styles.infoValue}>{user.fullname}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Vai trò */}
            {user.user_tile && (
              <View style={styles.roleCard}>
                <Text style={styles.sectionTitle}>Vai trò</Text>
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.roleBadge}
                >
                  <MaterialIcons name="verified" size={18} color="#FFFFFF" />
                  <Text style={styles.roleBadgeText}>{user.user_tile}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Quyền hạn */}
            {user.roles && user.roles.length > 0 && (
              <View style={styles.permissionsCard}>
                <Text style={styles.sectionTitle}>Quyền hạn</Text>
                <View style={styles.rolesWrapper}>
                  {user.roles.map((role, index) => (
                    <View key={index} style={styles.roleChip}>
                      <MaterialIcons name="check-circle" size={14} color="#10B981" />
                      <Text style={styles.roleChipText}>{role}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Logout Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => {
                // console.log('[ProfileModal] 🖱️ NÚT ĐĂNG XUẤT ĐƯỢC CLICK!');
                // console.log('[ProfileModal] 🔍 handleLogout function:', typeof handleLogout);
                handleLogout();
              }}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logoutButtonGradient}
              >
                <MaterialIcons name="logout" size={22} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>

      {/* Custom confirm dialog */}
      <CustomAlert
        visible={confirmVisible}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        type="danger"
        onCancel={() => {
          // console.log('[ProfileModal] ❌ User hủy đăng xuất (custom)');
          setConfirmVisible(false);
        }}
        onConfirm={async () => {
          // console.log('[ProfileModal] ✅ User xác nhận đăng xuất (custom)');
          setConfirmVisible(false);
          await performLogout();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    // Giữ một vùng nhỏ phía trên để tap đóng modal, phần còn lại ưu tiên cho nội dung
    flex: 0.25,
  },
  modalContainer: {
    // Tăng tỷ lệ chiều cao modal để ít phải cuộn hơn
    flex: 0.75,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
    width: '100%',
  },
  coverContainer: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  avatarWrapper: {
    marginTop: -50,
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  sessionInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  sessionValue: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  sessionProgressTrack: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: '#3B82F6',
  },
  sessionHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  permissionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rolesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  roleChipText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileModal;
