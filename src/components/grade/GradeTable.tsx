import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, GradeResponse, SemesterGrade, GradeItem } from '../../services/gradeService';

interface GradeTableProps {
  gradeData: GradeResponse | null;
}

const GradeTable: React.FC<GradeTableProps> = ({ gradeData }) => {
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());

  const toggleSemester = (namHoc: string, hocKy: number) => {
    const key = `${namHoc}-${hocKy}`;
    const newExpanded = new Set(expandedSemesters);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    setExpandedSemesters(newExpanded);
  };

  const renderGradeItem = (item: GradeItem, index: number) => {
    const gradeColor = gradeService.getGradeColor(item.DIEMCHU);
    const passStatus = gradeService.getPassStatus(item.DANHGIA);

    return (
      <View key={index} style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellSTT]}>
          <Text style={styles.cellText}>{item.STT}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCode]}>
          <Text style={[styles.cellText, styles.codeText]}>{item.MAHOCPHAN}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.cellText} numberOfLines={2}>{item.TENHOCPHAN}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.SOTINCHI}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.LANHOC}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.LANTHI}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={[styles.cellText, styles.gradeText]}>
            {gradeService.formatGrade(item.DIEMHE10)}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={[styles.cellText, styles.gradeText]}>
            {gradeService.formatGrade(item.DIEMHE4)}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellGrade]}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeBadgeText}>{item.DIEMCHU}</Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.cellText, { color: passStatus.color }]}>
            {passStatus.text}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.cellNote]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.GHICHU || '-'}</Text>
        </View>
      </View>
    );
  };

  const renderSemester = (semester: SemesterGrade, index: number) => {
    const key = `${semester.NAMHOC}-${semester.HOCKY}`;
    const isExpanded = expandedSemesters.has(key);

    return (
      <View key={key} style={styles.semesterCard}>
        <TouchableOpacity
          style={styles.semesterHeader}
          onPress={() => toggleSemester(semester.NAMHOC, semester.HOCKY)}
          activeOpacity={0.7}
        >
          <View style={styles.semesterHeaderLeft}>
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#3B82F6"
            />
            <View style={styles.semesterInfo}>
              <Text style={styles.semesterTitle}>
                Năm học {semester.NAMHOC} - Học kỳ {semester.HOCKY}
              </Text>
              <Text style={styles.semesterSubtitle}>
                {semester.DANHSACHDIEM.length} môn học
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <>
            {/* Thống kê học kỳ */}
            <View style={styles.semesterStatsContainer}>
              <View style={styles.semesterStatsGrid}>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Tổng tín chỉ</Text>
                  <Text style={styles.semesterStatValue}>{semester.TONGSO_TINCHI}</Text>
                </View>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Tổng số tín chỉ tích lũy</Text>
                  <Text style={styles.semesterStatValue}>{semester.SOTINCHI_TICHLUY}</Text>
                </View>
              </View>

              <View style={styles.semesterStatsGrid}>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Điểm trung bình hệ 10</Text>
                  <Text style={[styles.semesterStatValue, styles.gradeHighlight]}>
                    {gradeService.formatGrade(semester.DIEMTRUNGBINH_HE10)}
                  </Text>
                </View>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Điểm trung bình hệ 4</Text>
                  <Text style={[styles.semesterStatValue, styles.gradeHighlight]}>
                    {gradeService.formatGrade(semester.DIEMTRUNGBINH_HE4)}
                  </Text>
                </View>
              </View>

              <View style={styles.semesterStatsGrid}>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Điểm trung bình tích lũy hệ 10</Text>
                  <Text style={[styles.semesterStatValue, styles.gradeHighlight]}>
                    {gradeService.formatGrade(semester.DIEMTRUNGBINH_TICHLUY_HE10)}
                  </Text>
                </View>
                <View style={styles.semesterStatItem}>
                  <Text style={styles.semesterStatLabel}>Điểm trung bình tích lũy hệ 4</Text>
                  <Text style={[styles.semesterStatValue, styles.gradeHighlight]}>
                    {gradeService.formatGrade(semester.DIEMTRUNGBINH_TICHLUY_HE4)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.tableHeader}>
                    <View style={[styles.tableHeaderCell, styles.cellSTT]}>
                      <Text style={styles.headerText}>STT</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellCode]}>
                      <Text style={styles.headerText}>Mã HP</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellName]}>
                      <Text style={styles.headerText}>Tên học phần</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                      <Text style={styles.headerText}>Tín chỉ</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                      <Text style={styles.headerText}>Lần học</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                      <Text style={styles.headerText}>Lần thi</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                      <Text style={styles.headerText}>Điểm 10</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                      <Text style={styles.headerText}>Điểm 4</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellGrade]}>
                      <Text style={styles.headerText}>Điểm chữ</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellStatus]}>
                      <Text style={styles.headerText}>Đánh giá</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.cellNote]}>
                      <Text style={styles.headerText}>Ghi chú</Text>
                    </View>
                  </View>

                  {semester.DANHSACHDIEM.map((item, idx) => renderGradeItem(item, idx))}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </View>
    );
  };

  if (!gradeData) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Điểm theo học kỳ</Text>
      {gradeData.DANHSACH_HOCKY.map((semester, index) => renderSemester(semester, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  semesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  semesterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  semesterInfo: {
    marginLeft: 8,
    flex: 1,
  },
  semesterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  semesterSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  semesterStatsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  semesterStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  semesterStatItem: {
    flex: 1,
    paddingHorizontal: 8,
  },
  semesterStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  semesterStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  gradeHighlight: {
    color: '#3B82F6',
  },
  tableContainer: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cellSTT: {
    width: 50,
    alignItems: 'center',
  },
  cellCode: {
    width: 100,
  },
  cellName: {
    width: 200,
  },
  cellNumber: {
    width: 70,
    alignItems: 'center',
  },
  cellGrade: {
    width: 80,
    alignItems: 'center',
  },
  cellStatus: {
    width: 100,
    alignItems: 'center',
  },
  cellNote: {
    width: 120,
  },
  cellText: {
    fontSize: 13,
    color: '#1F2937',
  },
  codeText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  gradeText: {
    fontWeight: 'bold',
    color: '#059669',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default GradeTable;
