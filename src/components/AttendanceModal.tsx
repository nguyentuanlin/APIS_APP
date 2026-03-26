import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { attendanceService, AttendanceDetail } from '../services/attendanceService';

interface AttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  schedule: AttendanceDetail | null;
  onSuccess?: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  visible,
  onClose,
  schedule,
  onSuccess,
}) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleCheckIn = async () => {
    if (!schedule) return;

    if (!keyword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập từ khóa điểm danh');
      return;
    }

    // Kiểm tra thời gian
    const checkTime = attendanceService.canCheckIn(schedule);
    if (!checkTime.canCheckIn) {
      Alert.alert('Thông báo', checkTime.message);
      return;
    }

    setLoading(true);
    try {
      const { date, hour, minute } = attendanceService.getCurrentDateTime();
      
      await attendanceService.selfCheckIn({
        scheduleId: schedule.IDSINHVIEN,
        attendanceListId: schedule.DIEM_DANHSACH_ID || '',
        date,
        hour,
        minute,
        keyword: keyword.trim(),
        classId: schedule.IDLICHHOC,
      });

      Alert.alert('Thành công', 'Điểm danh thành công! 🎉', [
        {
          text: 'OK',
          onPress: () => {
            setKeyword('');
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Điểm danh thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setKeyword('');
    onClose();
  };

  if (!schedule) return null;

  const timeRange = attendanceService.formatScheduleTime(schedule);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header với Gradient */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="event-available" size={28} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Điểm danh</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            {/* Subject Card - Compact */}
            <View style={styles.subjectCard}>
              <Text style={styles.subjectName} numberOfLines={2}>
                {schedule.TENHOCPHAN}
              </Text>
              <View style={styles.timeRow}>
                <MaterialIcons name="access-time" size={16} color="#667eea" />
                <Text style={styles.timeText}>{timeRange}</Text>
                <View style={styles.periodBadge}>
                  <Text style={styles.periodText}>
                    Tiết {schedule.TIETBATDAU}-{schedule.TIETKETTHUC}
                  </Text>
                </View>
              </View>
            </View>

            {/* Keyword Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                <MaterialIcons name="vpn-key" size={16} color="#667eea" /> Từ khóa điểm danh
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={keyword}
                  onChangeText={setKeyword}
                  placeholder="Nhập từ khóa..."
                  placeholderTextColor="#999"
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleCheckIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={22} color="#fff" />
                    <Text style={styles.submitButtonText}>Xác nhận điểm danh</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subjectCard: {
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8eaff',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    flex: 1,
  },
  periodBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e8eaff',
    backgroundColor: '#fff',
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
