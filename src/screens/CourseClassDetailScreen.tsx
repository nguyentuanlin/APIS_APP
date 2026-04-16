import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from 'react-native';
import courseRegistrationService, { CourseClass } from '../services/courseRegistrationService';

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

const CourseClassDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseClass, isRegistered, planId, courseId } = route.params as { 
    courseClass: CourseClass; 
    isRegistered: boolean;
    planId: string;
    courseId: string;
  };

  const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    loadClassSchedule();
  }, []);

  const loadClassSchedule = async () => {
    try {
      setLoadingSchedule(true);
      console.log('[CourseClassDetailScreen] Loading schedule for class ID:', courseClass.ID);
      
      const scheduleData = await courseRegistrationService.getClassSchedule(courseClass.ID);
      console.log('[CourseClassDetailScreen] Schedule data received:', scheduleData.length, 'items');
      
      setSchedule(scheduleData);
    } catch (error) {
      console.error('[CourseClassDetailScreen] Error loading schedule:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch học');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleRegister = () => {
    Alert.alert(
      'Xác nhận đăng ký',
      `Bạn có chắc chắn muốn đăng ký lớp "${courseClass.TENLOP}"?\n\nHọc phí: ${courseRegistrationService.formatCurrency(courseClass.PHISAUKHITRUMIEN)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng ký',
          onPress: async () => {
            try {
              const result = await courseRegistrationService.registerCourse(
                planId,
                courseId,
                courseClass.ID
              );

              if (result.Success) {
                Alert.alert('Thành công', result.Message, [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Lỗi', result.Message);
              }
            } catch (error) {
              console.error('[CourseClassDetailScreen] Error registering course:', error);
              Alert.alert('Lỗi', 'Không thể đăng ký học phần');
            }
          }
        }
      ]
    );
  };

  const isFull = courseClass.SOTHUCTEDANGKYHOC >= courseClass.SOLUONGDUKIENHOC;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết lớp học phần</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

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

        {/* Schedule Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch học chi tiết</Text>
          {loadingSchedule ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Đang tải lịch học...</Text>
            </View>
          ) : schedule.length > 0 ? (
            <View style={styles.scheduleContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.scheduleTable}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.sttColumn]}>STT</Text>
                    <Text style={[styles.tableHeaderCell, styles.sessionColumn]}>Buổi học</Text>
                    <Text style={[styles.tableHeaderCell, styles.dateColumn]}>Ngày bắt đầu</Text>
                    <Text style={[styles.tableHeaderCell, styles.dateColumn]}>Ngày kết thúc</Text>
                    <Text style={[styles.tableHeaderCell, styles.dayColumn]}>Thứ</Text>
                    <Text style={[styles.tableHeaderCell, styles.periodColumn]}>Số tiết</Text>
                    <Text style={[styles.tableHeaderCell, styles.periodColumn]}>Tiết bắt đầu</Text>
                    <Text style={[styles.tableHeaderCell, styles.periodColumn]}>Tiết kết thúc</Text>
                    <Text style={[styles.tableHeaderCell, styles.timeColumn]}>Giờ, phút bắt đầu</Text>
                    <Text style={[styles.tableHeaderCell, styles.timeColumn]}>Giờ, phút kết thúc</Text>
                    <Text style={[styles.tableHeaderCell, styles.roomColumn]}>Phòng học</Text>
                    <Text style={[styles.tableHeaderCell, styles.instructorColumn]}>Giảng viên</Text>
                    <Text style={[styles.tableHeaderCell, styles.typeColumn]}>Kiểu học</Text>
                  </View>

                  {/* Table Rows */}
                  {schedule.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.sttColumn]}>{index + 1}</Text>
                      <Text style={[styles.tableCell, styles.sessionColumn]}>{item.BUOIHOC}</Text>
                      <Text style={[styles.tableCell, styles.dateColumn]}>
                        {courseRegistrationService.formatDate(item.NGAYBATDAU)}
                      </Text>
                      <Text style={[styles.tableCell, styles.dateColumn]}>
                        {courseRegistrationService.formatDate(item.NGAYKETTHUC)}
                      </Text>
                      <Text style={[styles.tableCell, styles.dayColumn]}>
                        {item.THU} - {courseRegistrationService.formatDate(item.NGAYHOC)}
                      </Text>
                      <Text style={[styles.tableCell, styles.periodColumn]}>{item.SOTIET}</Text>
                      <Text style={[styles.tableCell, styles.periodColumn]}>{item.TIETBATDAU}</Text>
                      <Text style={[styles.tableCell, styles.periodColumn]}>{item.TIETKETTHUC}</Text>
                      <Text style={[styles.tableCell, styles.timeColumn]}>
                        {item.GIOBATDAU}:{item.PHUTBATDAU.toString().padStart(2, '0')}
                      </Text>
                      <Text style={[styles.tableCell, styles.timeColumn]}>
                        {item.GIOKETTHUC}:{item.PHUTKETTHUC.toString().padStart(2, '0')}
                      </Text>
                      <Text style={[styles.tableCell, styles.roomColumn]}>{item.TENPHONGHOC}</Text>
                      <Text style={[styles.tableCell, styles.instructorColumn]}>{item.GIANGVIEN}</Text>
                      <Text style={[styles.tableCell, styles.typeColumn]}>{item.THUOCTINH_TEN}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không có lịch học</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  gradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scheduleContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleTable: {
    minWidth: 1050, // Tổng width các cột: 35+60+85+85+110+50+50+50+70+70+90+110+130 = ~995, thêm padding
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 8,
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
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  sttColumn: {
    width: 35,
  },
  sessionColumn: {
    width: 60,
  },
  dateColumn: {
    width: 85,
  },
  dayColumn: {
    width: 110,
  },
  periodColumn: {
    width: 50,
  },
  timeColumn: {
    width: 70,
  },
  roomColumn: {
    width: 90,
  },
  instructorColumn: {
    width: 110,
  },
  typeColumn: {
    width: 130,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
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
});

export default CourseClassDetailScreen;