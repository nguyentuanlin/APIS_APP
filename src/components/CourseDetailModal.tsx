import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import attendanceService, { WeeklySchedule } from '../services/attendanceService';

interface CourseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  lopHocPhanId: string;
  lopHocPhanTen: string;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  visible,
  onClose,
  lopHocPhanId,
  lopHocPhanTen,
}) => {
  const [loading, setLoading] = useState(false);
  const [scheduleList, setScheduleList] = useState<WeeklySchedule[]>([]);

  useEffect(() => {
    if (visible && lopHocPhanId) {
      loadSchedule();
    }
  }, [visible, lopHocPhanId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getWeeklySchedule(lopHocPhanId);
      setScheduleList(data);
    } catch (error) {
      console.error('Error loading weekly schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="event-note" size={24} color="#3B82F6" />
              <Text style={styles.modalTitle} numberOfLines={2}>
                Chi tiết - {lopHocPhanTen}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : scheduleList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có lịch học</Text>
            </View>
          ) : (
            <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={true}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.sttColumn]}>STT</Text>
                    <Text style={[styles.headerCell, styles.sessionColumn]}>Buổi học</Text>
                    <Text style={[styles.headerCell, styles.dateColumn]}>Ngày bắt đầu</Text>
                    <Text style={[styles.headerCell, styles.dateColumn]}>Ngày kết thúc</Text>
                    <Text style={[styles.headerCell, styles.dayColumn]}>Thứ</Text>
                    <Text style={[styles.headerCell, styles.periodCountColumn]}>Số tiết</Text>
                    <Text style={[styles.headerCell, styles.periodColumn]}>Tiết bắt đầu</Text>
                    <Text style={[styles.headerCell, styles.periodColumn]}>Tiết kết thúc</Text>
                    <Text style={[styles.headerCell, styles.roomColumn]}>Phòng học</Text>
                    <Text style={[styles.headerCell, styles.teacherColumn]}>Giảng viên</Text>
                    <Text style={[styles.headerCell, styles.typeColumn]}>Kiểu học</Text>
                  </View>

                  {/* Table Body */}
                  {scheduleList.map((item, index) => (
                    <View key={`${item.DANGKY_LOPHOCPHAN_ID}-${index}`} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.sttColumn]}>{index + 1}</Text>
                      <Text style={[styles.cell, styles.sessionColumn]}>{item.BUOIHOC}</Text>
                      <Text style={[styles.cell, styles.dateColumn]}>{item.NGAYBATDAU}</Text>
                      <Text style={[styles.cell, styles.dateColumn]}>{item.NGAYKETTHUC}</Text>
                      <Text style={[styles.cell, styles.dayColumn]}>{item.THU} - {item.NGAYHOC}</Text>
                      <Text style={[styles.cell, styles.periodCountColumn]}>{item.SOTIET}</Text>
                      <Text style={[styles.cell, styles.periodColumn]}>{item.TIETBATDAU}</Text>
                      <Text style={[styles.cell, styles.periodColumn]}>{item.TIETKETTHUC}</Text>
                      <Text style={[styles.cell, styles.roomColumn]}>{item.PHONGHOC_TEN}</Text>
                      <Text style={[styles.cell, styles.teacherColumn]}>{item.GIANGVIEN}</Text>
                      <Text style={[styles.cell, styles.typeColumn]}>{item.THUOCTINH_TEN}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  tableContainer: {
    maxHeight: 500,
  },
  table: {
    minWidth: 1200,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cell: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  sttColumn: {
    width: 50,
  },
  sessionColumn: {
    width: 80,
  },
  dateColumn: {
    width: 100,
  },
  dayColumn: {
    width: 120,
  },
  periodCountColumn: {
    width: 60,
  },
  periodColumn: {
    width: 80,
  },
  roomColumn: {
    width: 100,
  },
  teacherColumn: {
    width: 150,
  },
  typeColumn: {
    width: 200,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default CourseDetailModal;
