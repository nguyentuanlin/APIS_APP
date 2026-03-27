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
import attendanceService, { AttendanceRecord } from '../services/attendanceService';

interface AttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  lopHocPhanId: string;
  lopHocPhanTen: string;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  visible,
  onClose,
  lopHocPhanId,
  lopHocPhanTen,
}) => {
  const [loading, setLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (visible && lopHocPhanId) {
      loadAttendance();
    }
  }, [visible, lopHocPhanId]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceRecords(lopHocPhanId);
      setAttendanceList(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Có mặt')) return '#10B981';
    if (status.includes('Vắng mặt có phép')) return '#F59E0B';
    return '#EF4444';
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
              <MaterialIcons name="fact-check" size={24} color="#3B82F6" />
              <Text style={styles.modalTitle} numberOfLines={2}>
                Kết quả điểm danh
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Course Name */}
          <View style={styles.courseNameContainer}>
            <Text style={styles.courseName}>{lopHocPhanTen}</Text>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : attendanceList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có dữ liệu điểm danh</Text>
            </View>
          ) : (
            <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={true}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.sttColumn]}>STT</Text>
                    <Text style={[styles.headerCell, styles.dateColumn]}>Ngày học</Text>
                    <Text style={[styles.headerCell, styles.periodColumn]}>Tiết bắt đầu → Tiết kết thúc</Text>
                    <Text style={[styles.headerCell, styles.statusColumn]}>Trạng thái</Text>
                    <Text style={[styles.headerCell, styles.countColumn]}>Số tiết</Text>
                  </View>

                  {/* Table Body */}
                  {attendanceList.map((item, index) => (
                    <View key={item.ID} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.sttColumn]}>{index + 1}</Text>
                      <Text style={[styles.cell, styles.dateColumn]}>{item.NGAYGHINHAN}</Text>
                      <Text style={[styles.cell, styles.periodColumn]}>
                        {item.TIETBATDAU} → {item.TIETKETTHUC}
                      </Text>
                      <View style={styles.statusColumn}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.KIEUCHUYENCAN_TEN) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(item.KIEUCHUYENCAN_TEN) }]}>
                            {item.KIEUCHUYENCAN_TEN}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.cell, styles.countColumn]}>{item.SOLUONG}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {/* Summary */}
          {!loading && attendanceList.length > 0 && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                <Text style={styles.summaryText}>
                  Có mặt: {attendanceList.filter(item => item.KIEUCHUYENCAN_TEN.includes('Có mặt')).length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.summaryText}>
                  Vắng có phép: {attendanceList.filter(item => item.KIEUCHUYENCAN_TEN.includes('Vắng mặt có phép')).length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="cancel" size={20} color="#EF4444" />
                <Text style={styles.summaryText}>
                  Vắng không phép: {attendanceList.filter(item => !item.KIEUCHUYENCAN_TEN.includes('Có mặt') && !item.KIEUCHUYENCAN_TEN.includes('có phép')).length}
                </Text>
              </View>
            </View>
          )}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  courseNameContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  courseName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
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
    maxHeight: 400,
  },
  table: {
    minWidth: 600,
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
    fontSize: 13,
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
    fontSize: 13,
    color: '#111827',
    textAlign: 'center',
  },
  sttColumn: {
    width: 40,
  },
  dateColumn: {
    width: 90,
  },
  periodColumn: {
    flex: 1,
    minWidth: 100,
  },
  statusColumn: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countColumn: {
    width: 50,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});

export default AttendanceModal;
