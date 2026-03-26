import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, GradeResponse } from '../../services/gradeService';

interface GradeStatisticsProps {
  gradeData: GradeResponse | null;
}

const GradeStatistics: React.FC<GradeStatisticsProps> = ({ gradeData }) => {
  if (!gradeData?.THONGKE) return null;

  const stats = gradeData.THONGKE;

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <MaterialIcons name="assessment" size={24} color="#3B82F6" />
        <Text style={styles.statsTitle}>TỔNG ĐIỂM</Text>
      </View>
      
      <View style={styles.statsRows}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tổng số tín chỉ</Text>
          <Text style={styles.statValue}>{stats.TONGSO_TINCHI}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tổng số tín chỉ tích lũy</Text>
          <Text style={styles.statValue}>{stats.SOTINCHI_TICHLUY}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Điểm trung bình hệ 10</Text>
          <Text style={[styles.statValue, styles.gradeHighlight]}>
            {gradeService.formatGrade(stats.DIEMTRUNGBINH_HE10)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Điểm trung bình hệ 4</Text>
          <Text style={[styles.statValue, styles.gradeHighlight]}>
            {gradeService.formatGrade(stats.DIEMTRUNGBINH_HE4)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Điểm trung bình tích lũy hệ 10</Text>
          <Text style={[styles.statValue, styles.gradeHighlight]}>
            {gradeService.formatGrade(stats.DIEMTRUNGBINH_TICHLUY_HE10)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Điểm trung bình tích lũy hệ 4</Text>
          <Text style={[styles.statValue, styles.gradeHighlight]}>
            {gradeService.formatGrade(stats.DIEMTRUNGBINH_TICHLUY_HE4)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statsRows: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    minWidth: 60,
    textAlign: 'right',
  },
  gradeHighlight: {
    color: '#3B82F6',
  },
});

export default GradeStatistics;
