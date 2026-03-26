import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, GradeResponse } from '../../services/gradeService';

interface FailedCoursesProps {
  gradeData: GradeResponse | null;
}

const FailedCourses: React.FC<FailedCoursesProps> = ({ gradeData }) => {
  if (!gradeData) return null;

  const failedCourses = gradeData.HOCPHAN_CHUAHOANTHANH || [];

  if (failedCourses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="check-circle" size={64} color="#10B981" />
        <Text style={styles.emptyText}>Không có học phần nợ</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {failedCourses.map((item, index) => (
        <View key={item.ID} style={styles.failedCourseCard}>
          <View style={styles.failedCourseHeader}>
            <Text style={styles.failedCourseSTT}>{index + 1}</Text>
            <View style={styles.failedCourseBadge}>
              <Text style={styles.failedCourseBadgeText}>{item.DANHGIA_TEN}</Text>
            </View>
          </View>

          <View style={styles.failedCourseBody}>
            <View style={styles.failedCourseRow}>
              <Text style={styles.failedCourseCode}>{item.DAOTAO_HOCPHAN_MA}</Text>
            </View>
            
            <Text style={styles.failedCourseName}>{item.DAOTAO_HOCPHAN_TEN}</Text>

            {item.DIEM_DANHSACHHOC_TEN && (
              <View style={styles.failedCourseClassInfo}>
                <MaterialIcons name="class" size={16} color="#6B7280" />
                <Text style={styles.failedCourseClassName}>{item.DIEM_DANHSACHHOC_TEN}</Text>
              </View>
            )}

            <View style={styles.failedCourseDetails}>
              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Số tín chỉ:</Text>
                <Text style={styles.failedCourseDetailValue}>{item.DAOTAO_HOCPHAN_HOCTRINH}</Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Điểm:</Text>
                <Text style={styles.failedCourseDetailValue}>
                  {gradeService.formatGrade(item.DIEM)}
                </Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Điểm chữ:</Text>
                <Text style={[styles.failedCourseDetailValue, { color: '#EF4444' }]}>
                  {item.DIEMQUYDOI_TEN}
                </Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Lần học:</Text>
                <Text style={styles.failedCourseDetailValue}>{item.LANHOC}</Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Lần thi:</Text>
                <Text style={styles.failedCourseDetailValue}>{item.LANTHI}</Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Năm học:</Text>
                <Text style={styles.failedCourseDetailValue}>{item.NAMHOC.replace('_', '-')}</Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Học kỳ:</Text>
                <Text style={styles.failedCourseDetailValue}>{item.HOCKY}</Text>
              </View>

              <View style={styles.failedCourseDetailItem}>
                <Text style={styles.failedCourseDetailLabel}>Kết quả:</Text>
                <Text style={[styles.failedCourseDetailValue, { color: '#EF4444' }]}>
                  {item.DANHGIA_TEN}
                </Text>
              </View>
            </View>

            {item.GHICHU && (
              <View style={styles.failedCourseNote}>
                <MaterialIcons name="info" size={16} color="#6B7280" />
                <Text style={styles.failedCourseNoteText}>{item.GHICHU}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  failedCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  failedCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  failedCourseSTT: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  failedCourseBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  failedCourseBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  failedCourseBody: {
    padding: 16,
  },
  failedCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  failedCourseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  failedCourseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  failedCourseClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  failedCourseClassName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  failedCourseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  failedCourseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  failedCourseDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  failedCourseDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  failedCourseNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  failedCourseNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
});

export default FailedCourses;
