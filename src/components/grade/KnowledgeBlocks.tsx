import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, KhoiKienThucResponse } from '../../services/gradeService';

interface KnowledgeBlocksProps {
  khoiData: KhoiKienThucResponse | null;
}

const KnowledgeBlocks: React.FC<KnowledgeBlocksProps> = ({ khoiData }) => {
  const [expandedKhoi, setExpandedKhoi] = useState<Set<string>>(new Set());

  const toggleKhoi = (maKhoi: string) => {
    const newExpanded = new Set(expandedKhoi);
    if (newExpanded.has(maKhoi)) {
      newExpanded.delete(maKhoi);
    } else {
      newExpanded.add(maKhoi);
    }
    setExpandedKhoi(newExpanded);
  };

  if (!khoiData) return null;

  const { rsTongHop, rsChiTiet } = khoiData;

  if (rsTongHop.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="category" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>Không có dữ liệu khối kiến thức</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bảng tổng hợp */}
      <View style={styles.khoiSummaryCard}>
        <Text style={styles.khoiSummaryTitle}>Tổng điểm theo khối</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header */}
            <View style={styles.khoiTableHeader}>
              <View style={[styles.khoiTableCell, styles.khoiTableCellSTT]}>
                <Text style={styles.khoiTableHeaderText}>STT</Text>
              </View>
              <View style={[styles.khoiTableCell, styles.khoiTableCellCode]}>
                <Text style={styles.khoiTableHeaderText}>Mã khối</Text>
              </View>
              <View style={[styles.khoiTableCell, styles.khoiTableCellName]}>
                <Text style={styles.khoiTableHeaderText}>Tên khối</Text>
              </View>
              <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                <Text style={styles.khoiTableHeaderText}>Tổng số tín chỉ</Text>
              </View>
              <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                <Text style={styles.khoiTableHeaderText}>Tổng số TC bắt buộc</Text>
              </View>
              <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                <Text style={styles.khoiTableHeaderText}>Tổng số TC đã tích lũy</Text>
              </View>
            </View>

            {/* Table Body */}
            {rsTongHop.filter(k => k.MAKHOI !== 'TONG' && k.TENKHOI !== 'Tổng').map((khoi, index) => (
              <View key={khoi.MAKHOI} style={styles.khoiTableRow}>
                <View style={[styles.khoiTableCell, styles.khoiTableCellSTT]}>
                  <Text style={styles.khoiTableCellText}>{index + 1}</Text>
                </View>
                <View style={[styles.khoiTableCell, styles.khoiTableCellCode]}>
                  <Text style={styles.khoiTableCellText}>{khoi.MAKHOI}</Text>
                </View>
                <View style={[styles.khoiTableCell, styles.khoiTableCellName]}>
                  <Text style={styles.khoiTableCellText}>{khoi.TENKHOI}</Text>
                </View>
                <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                  <Text style={styles.khoiTableCellText}>{khoi.TONGSOTINCHICUAKHOI}</Text>
                </View>
                <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                  <Text style={styles.khoiTableCellText}>{khoi.SOBATBUOC}</Text>
                </View>
                <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                  <Text style={[styles.khoiTableCellText, { color: '#10B981', fontWeight: '600' }]}>
                    {khoi.SODATICHLUY || 0}
                  </Text>
                </View>
              </View>
            ))}

            {/* Table Footer - Tổng */}
            {(() => {
              const tongFromAPI = rsTongHop.find(k => k.MAKHOI === 'TONG' || k.TENKHOI === 'Tổng');
              const dataRows = rsTongHop.filter(k => k.MAKHOI !== 'TONG' && k.TENKHOI !== 'Tổng');
              
              const tongTC = tongFromAPI?.TONGSOTINCHICUAKHOI || dataRows.reduce((sum, k) => sum + (k.TONGSOTINCHICUAKHOI || 0), 0);
              const tongBB = tongFromAPI?.SOBATBUOC || dataRows.reduce((sum, k) => sum + (k.SOBATBUOC || 0), 0);
              const tongTL = tongFromAPI?.SODATICHLUY || dataRows.reduce((sum, k) => sum + (k.SODATICHLUY || 0), 0);

              return (
                <View style={[styles.khoiTableRow, styles.khoiTableFooter]}>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellSTT]}>
                    <Text style={styles.khoiTableFooterText}></Text>
                  </View>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellCode]}>
                    <Text style={styles.khoiTableFooterText}>Tổng</Text>
                  </View>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellName]}>
                    <Text style={styles.khoiTableFooterText}></Text>
                  </View>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                    <Text style={styles.khoiTableFooterText}>{tongTC}</Text>
                  </View>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                    <Text style={styles.khoiTableFooterText}>{tongBB}</Text>
                  </View>
                  <View style={[styles.khoiTableCell, styles.khoiTableCellNumber]}>
                    <Text style={[styles.khoiTableFooterText, { color: '#10B981' }]}>
                      {tongTL}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </ScrollView>
      </View>

      {/* Chi tiết từng khối */}
      <Text style={styles.khoiDetailTitle}>Chi tiết theo khối</Text>
      
      {rsTongHop.filter(k => k.MAKHOI !== 'TONG' && k.TENKHOI !== 'Tổng').map((khoi) => {
        const isExpanded = expandedKhoi.has(khoi.MAKHOI);
        const khoiCourses = rsChiTiet.filter(item => item.MAKHOI === khoi.MAKHOI);

        return (
          <View key={khoi.MAKHOI} style={styles.khoiCard}>
            <TouchableOpacity
              style={styles.khoiHeader}
              onPress={() => toggleKhoi(khoi.MAKHOI)}
              activeOpacity={0.7}
            >
              <View style={styles.khoiHeaderLeft}>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#3B82F6"
                />
                <View style={styles.khoiInfo}>
                  <Text style={styles.khoiTitle}>{khoi.TENKHOI}</Text>
                  <Text style={styles.khoiSubtitle}>
                    {khoiCourses.length} học phần
                  </Text>
                </View>
              </View>

              <View style={styles.khoiStats}>
                <View style={styles.khoiStatItem}>
                  <Text style={styles.khoiStatLabel}>TC</Text>
                  <Text style={styles.khoiStatValue}>{khoi.TONGSOTINCHICUAKHOI}</Text>
                </View>
                <View style={styles.khoiStatItem}>
                  <Text style={styles.khoiStatLabel}>Đạt</Text>
                  <Text style={[styles.khoiStatValue, { color: '#10B981' }]}>
                    {khoi.SODATICHLUY || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.khoiBody}>
                {khoiCourses.map((course, idx) => (
                  <View key={idx} style={styles.khoiCourseItem}>
                    <View style={styles.khoiCourseHeader}>
                      <Text style={styles.khoiCourseCode}>{course.DAOTAO_HOCPHAN_MA}</Text>
                      {course.KETQUA === 1 && (
                        <View style={styles.khoiCourseBadge}>
                          <Text style={styles.khoiCourseBadgeText}>Đạt</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.khoiCourseName}>{course.DAOTAO_HOCPHAN_TEN}</Text>

                    <View style={styles.khoiCourseDetails}>
                      <View style={styles.khoiCourseDetailItem}>
                        <Text style={styles.khoiCourseDetailLabel}>Tín chỉ:</Text>
                        <Text style={styles.khoiCourseDetailValue}>
                          {course.DAOTAO_HOCPHAN_HOCTRINH}
                        </Text>
                      </View>

                      {course.DIEM && (
                        <>
                          <View style={styles.khoiCourseDetailItem}>
                            <Text style={styles.khoiCourseDetailLabel}>Điểm:</Text>
                            <Text style={styles.khoiCourseDetailValue}>{course.DIEM}</Text>
                          </View>

                          <View style={styles.khoiCourseDetailItem}>
                            <Text style={styles.khoiCourseDetailLabel}>Điểm chữ:</Text>
                            <Text style={[
                              styles.khoiCourseDetailValue,
                              { color: gradeService.getGradeColor(course.DIEMQUYDOI_TEN || '') }
                            ]}>
                              {course.DIEMQUYDOI_TEN || '-'}
                            </Text>
                          </View>
                        </>
                      )}

                      {!course.DIEM && (
                        <View style={styles.khoiCourseDetailItem}>
                          <Text style={[styles.khoiCourseDetailLabel, { color: '#9CA3AF' }]}>
                            Chưa học
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
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
  khoiSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  khoiSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  khoiTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  khoiTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  khoiTableFooter: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  khoiTableCell: {
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  khoiTableCellSTT: {
    width: 50,
    alignItems: 'center',
  },
  khoiTableCellCode: {
    width: 100,
  },
  khoiTableCellName: {
    width: 200,
  },
  khoiTableCellNumber: {
    width: 120,
    alignItems: 'center',
  },
  khoiTableHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  khoiTableCellText: {
    fontSize: 13,
    color: '#1F2937',
  },
  khoiTableFooterText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  khoiDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  khoiCard: {
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
  khoiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  khoiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  khoiInfo: {
    marginLeft: 8,
    flex: 1,
  },
  khoiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  khoiSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  khoiStats: {
    flexDirection: 'row',
    gap: 16,
  },
  khoiStatItem: {
    alignItems: 'center',
  },
  khoiStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  khoiStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginTop: 2,
  },
  khoiBody: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F9FAFB',
  },
  khoiCourseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  khoiCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  khoiCourseCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  khoiCourseBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  khoiCourseBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  khoiCourseName: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  khoiCourseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  khoiCourseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  khoiCourseDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  khoiCourseDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default KnowledgeBlocks;
