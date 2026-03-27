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
import attendanceService, { ProcessScore } from '../services/attendanceService';

interface ProcessScoreModalProps {
  visible: boolean;
  onClose: () => void;
  lopHocPhanId: string;
  lopHocPhanTen: string;
}

const ProcessScoreModal: React.FC<ProcessScoreModalProps> = ({
  visible,
  onClose,
  lopHocPhanId,
  lopHocPhanTen,
}) => {
  const [loading, setLoading] = useState(false);
  const [scoreList, setScoreList] = useState<ProcessScore[]>([]);

  useEffect(() => {
    if (visible && lopHocPhanId) {
      loadScores();
    }
  }, [visible, lopHocPhanId]);

  const loadScores = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getProcessScores(lopHocPhanId);
      setScoreList(data);
    } catch (error) {
      console.error('Error loading process scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10B981';
    if (score >= 6.5) return '#3B82F6';
    if (score >= 5) return '#F59E0B';
    return '#EF4444';
  };

  const calculateAverage = () => {
    if (scoreList.length === 0) return 0;
    const sum = scoreList.reduce((acc, item) => acc + item.DIEM, 0);
    return (sum / scoreList.length).toFixed(2);
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
              <MaterialIcons name="assessment" size={24} color="#3B82F6" />
              <Text style={styles.modalTitle} numberOfLines={2}>
                Điểm quá trình
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
          ) : scoreList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có điểm quá trình</Text>
            </View>
          ) : (
            <ScrollView style={styles.scoreContainer} showsVerticalScrollIndicator={true}>
              {scoreList.map((item, index) => (
                <View key={item.ID} style={styles.scoreCard}>
                  <View style={styles.scoreHeader}>
                    <View style={styles.scoreIconContainer}>
                      <MaterialIcons name="grade" size={24} color={getScoreColor(item.DIEM)} />
                    </View>
                    <View style={styles.scoreInfo}>
                      <Text style={styles.scoreTitle}>{item.DIEM_THANHPHANDIEM_TEN}</Text>
                      <Text style={styles.scoreMeta}>
                        Lần học: {item.LANHOC} • Lần thi: {item.LANTHI}
                      </Text>
                    </View>
                    <View style={[styles.scoreValueContainer, { backgroundColor: getScoreColor(item.DIEM) + '20' }]}>
                      <Text style={[styles.scoreValue, { color: getScoreColor(item.DIEM) }]}>
                        {item.DIEM}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Summary */}
          {!loading && scoreList.length > 0 && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="functions" size={20} color="#3B82F6" />
                <Text style={styles.summaryLabel}>Điểm trung bình:</Text>
                <Text style={styles.summaryValue}>{calculateAverage()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="assignment" size={20} color="#6B7280" />
                <Text style={styles.summaryLabel}>Số thành phần:</Text>
                <Text style={styles.summaryValue}>{scoreList.length}</Text>
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
    maxHeight: '80%',
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
  scoreContainer: {
    padding: 16,
    maxHeight: 400,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  scoreMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  scoreValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: 'bold',
  },
});

export default ProcessScoreModal;
