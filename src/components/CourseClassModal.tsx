import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { CourseClass } from '../services/courseRegistrationService';
import courseRegistrationService from '../services/courseRegistrationService';

// Interface cho lịch học
interface ClassSchedule {
  IDSINHVIEN: string;
  DANGKY_LOPHOCPHAN_ID: string;
  TENHOCPHAN: string;
  IDHOCPHAN: string;
  DANGKY_LOPHOCPHAN_TEN: string;
  BAIHOC: string | null;
  BUOIHOC: string;
  GIANGVIEN: string;
  GIANGVIEN_ID: string;
  GIOBATDAU: number;
  GIOKETTHUC: number;
  IDPHONGHOC: string;
  MAPHONGHOC: string;
  NGAYBATDAU: string;
  NGAYHOC: string;
  NGAYKETTHUC: string;
  PHONGHOC_TEN: string;
  PHUTBATDAU: number;
  PHUTKETTHUC: number;
  SOTIET: number;
  TENLOPHOCPHAN: string;
  TENPHONGHOC: string;
  THU: string;
  THUHOC: string;
  THUOCTINHLOP_ID: string;
  THUOCTINH_TEN: string;
  TIETBATDAU: number;
  TIETKETTHUC: number;
}

interface CourseClassModalProps {
  visible: boolean;
  onClose: () => void;
  courseClass: CourseClass | null;
  onRegister?: (courseClass: CourseClass) => void;
  isRegistered?: boolean;
}

const CourseClassModal: React.FC<CourseClassModalProps> = ({
  visible,
  onClose,
  courseClass,
  onRegister,
  isRegistered = false,
}) => {
  const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  if (!courseClass) return null;

  const loadClassSchedule = async () => {
    if (schedule.length > 0) {
      setShowSchedule(!showSchedule);
      return;
    }

    try {
      setLoadingSchedule(true);
      const scheduleData = await courseRegistrationService.getClassSchedule(courseClass.ID);
      setSchedule(scheduleData);
      setShowSchedule(true);
    } catch (error) {
      console.error('[CourseClassModal] Error loading schedule:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch học');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister(courseClass);
    }
  };

  const isFull = courseClass.SOTHUCTEDANGKYHOC >= courseClass.SOLUONGDUKIENHOC;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết lớp học phần</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Class Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin lớp</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên lớp:</Text>
                <Text style={styles.infoValue}>{courseClass.TENLOP}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã lớp:</Text>
                <Text style={styles.infoValue}>{courseClass.MALOP}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Loại lớp:</Text>
                <Text style={styles.infoValue}>{courseClass.THUOCTINHLOP_TEN}</Text>
              </View>
            </View>
          </View>

          {/* Schedule Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thời gian học</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày bắt đầu:</Text>
                <Text style={styles.infoValue}>
                  {courseRegistrationService.formatDate(courseClass.NGAYBATDAU)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày kết thúc:</Text>
                <Text style={styles.infoValue}>
                  {courseRegistrationService.formatDate(courseClass.NGAYKETTHUC)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thứ học:</Text>
                <Text style={styles.infoValue}>
                  {courseRegistrationService.formatStudyDays(courseClass.THUHOC)}
                </Text>
              </View>
            </View>
          </View>

          {/* Instructor Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giảng viên</Text>
            <View style={styles.infoCard}>
              <Text style={styles.instructorText}>{courseClass.GIANGVIEN}</Text>
            </View>
          </View>

          {/* Enrollment Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin đăng ký</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sĩ số:</Text>
                <Text style={[
                  styles.infoValue,
                  isFull && styles.fullEnrollment
                ]}>
                  {courseClass.SOTHUCTEDANGKYHOC}/{courseClass.SOLUONGDUKIENHOC}
                  {isFull && ' (Đã đầy)'}
                </Text>
              </View>
              <View style={styles.enrollmentBar}>
                <View 
                  style={[
                    styles.enrollmentProgress,
                    { 
                      width: `${Math.min((courseClass.SOTHUCTEDANGKYHOC / courseClass.SOLUONGDUKIENHOC) * 100, 100)}%`,
                      backgroundColor: isFull ? '#EF4444' : '#10B981'
                    }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* Fee Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Học phí</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Học phí gốc:</Text>
                <Text style={styles.infoValue}>
                  {courseRegistrationService.formatCurrency(courseClass.PHIPHAINOP)}
                </Text>
              </View>
              {courseClass.PHIDUOCMIEN > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Được miễn:</Text>
                  <Text style={[styles.infoValue, styles.discountText]}>
                    -{courseRegistrationService.formatCurrency(courseClass.PHIDUOCMIEN)}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.totalLabel}>Phải nộp:</Text>
                <Text style={styles.totalValue}>
                  {courseRegistrationService.formatCurrency(courseClass.PHISAUKHITRUMIEN)}
                </Text>
              </View>
            </View>
          </View>
          {/* Schedule Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lịch học chi tiết</Text>
              <TouchableOpacity 
                style={styles.scheduleButton}
                onPress={loadClassSchedule}
                disabled={loadingSchedule}
              >
                {loadingSchedule ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <MaterialIcons 
                      name={showSchedule ? "expand-less" : "expand-more"} 
                      size={20} 
                      color="#3B82F6" 
                    />
                    <Text style={styles.scheduleButtonText}>
                      {showSchedule ? 'Ẩn lịch' : 'Xem lịch'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {showSchedule && schedule.length > 0 && (
              <View style={styles.scheduleContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.scheduleTable}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, styles.sttColumn]}>STT</Text>
                      <Text style={[styles.tableHeaderCell, styles.sessionColumn]}>Buổi học</Text>
                      <Text style={[styles.tableHeaderCell, styles.dateColumn]}>Ngày</Text>
                      <Text style={[styles.tableHeaderCell, styles.timeColumn]}>Giờ học</Text>
                      <Text style={[styles.tableHeaderCell, styles.roomColumn]}>Phòng</Text>
                      <Text style={[styles.tableHeaderCell, styles.instructorColumn]}>Giảng viên</Text>
                    </View>

                    {/* Table Rows */}
                    {schedule.map((item, index) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.sttColumn]}>{index + 1}</Text>
                        <Text style={[styles.tableCell, styles.sessionColumn]}>{item.BUOIHOC}</Text>
                        <Text style={[styles.tableCell, styles.dateColumn]}>
                          {courseRegistrationService.formatDate(item.NGAYHOC)}
                        </Text>
                        <Text style={[styles.tableCell, styles.timeColumn]}>
                          {item.GIOBATDAU}:{item.PHUTBATDAU.toString().padStart(2, '0')} - {item.GIOKETTHUC}:{item.PHUTKETTHUC.toString().padStart(2, '0')}
                        </Text>
                        <Text style={[styles.tableCell, styles.roomColumn]}>{item.TENPHONGHOC}</Text>
                        <Text style={[styles.tableCell, styles.instructorColumn]}>{item.GIANGVIEN}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isRegistered ? (
            <View style={styles.registeredContainer}>
              <MaterialIcons name="check-circle" size={24} color="#10B981" />
              <Text style={styles.registeredText}>Đã đăng ký lớp này</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.registerButton,
                isFull && styles.disabledButton
              ]}
              onPress={handleRegister}
              disabled={isFull}
            >
              <MaterialIcons 
                name={isFull ? "block" : "add"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.registerButtonText}>
                {isFull ? 'Lớp đã đầy' : 'Đăng ký lớp này'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  fullEnrollment: {
    color: '#EF4444',
  },
  instructorText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  enrollmentBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  enrollmentProgress: {
    height: '100%',
    borderRadius: 4,
  },
  discountText: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    flex: 2,
    textAlign: 'right',
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  registeredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  registeredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  scheduleButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  scheduleContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
  },
  scheduleTable: {
    minWidth: 800,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  sttColumn: {
    width: 40,
  },
  sessionColumn: {
    width: 60,
  },
  dateColumn: {
    width: 80,
  },
  timeColumn: {
    width: 100,
  },
  roomColumn: {
    width: 80,
  },
  instructorColumn: {
    width: 120,
  },
});

export default CourseClassModal;