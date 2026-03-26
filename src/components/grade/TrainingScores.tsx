import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, DiemRenLuyenResponse, DiemRenLuyen } from '../../services/gradeService';

type SectionType = 'ky' | 'nam' | 'toankhoa';

const TrainingScores = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiemRenLuyenResponse | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('ky');

  useEffect(() => {
    loadTrainingScores();
  }, []);

  const loadTrainingScores = async () => {
    try {
      console.log('[TrainingScores] Loading training scores...');
      setLoading(true);
      const result = await gradeService.getDiemRenLuyen();
      console.log('[TrainingScores] Received data:', result);
      setData(result);
    } catch (error) {
      console.error('[TrainingScores] Error loading training scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatThoiGian = (thoigian: string) => {
    // Format: "2024_2025_1" -> "HK1 2024-2025"
    const parts = thoigian.split('_');
    if (parts.length === 3) {
      return `HK${parts[2]} ${parts[0]}-${parts[1]}`;
    }
    return thoigian;
  };

  const getXepLoaiColor = (xepLoai: string) => {
    switch (xepLoai) {
      case 'Xuất sắc':
        return '#F59E0B';
      case 'Tốt':
        return '#10B981';
      case 'Khá':
        return '#3B82F6';
      case 'Trung bình':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const renderScoreCard = (item: DiemRenLuyen, index: number, showKy: boolean = true) => (
    <View key={item.ID} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>{index + 1}</Text>
        </View>
        <View style={[styles.xepLoaiBadge, { backgroundColor: `${getXepLoaiColor(item.XEPLOAI_TEN)}20` }]}>
          <Text style={[styles.xepLoaiText, { color: getXepLoaiColor(item.XEPLOAI_TEN) }]}>
            {item.XEPLOAI_TEN}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {showKy && item.THOIGIAN && (
          <View style={styles.cardRow}>
            <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
            <Text style={styles.cardLabel}>Kỳ:</Text>
            <Text style={styles.cardValue}>{formatThoiGian(item.THOIGIAN)}</Text>
          </View>
        )}

        <View style={styles.cardRow}>
          <MaterialIcons name="badge" size={16} color="#6B7280" />
          <Text style={styles.cardLabel}>Mã số:</Text>
          <Text style={styles.cardValue}>{item.QLSV_NGUOIHOC_MASO}</Text>
        </View>

        <View style={styles.cardRow}>
          <MaterialIcons name="person" size={16} color="#6B7280" />
          <Text style={styles.cardLabel}>Họ tên:</Text>
          <Text style={styles.cardValue}>
            {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <MaterialIcons name="school" size={16} color="#6B7280" />
          <Text style={styles.cardLabel}>Chương trình:</Text>
          <Text style={styles.cardValue}>{item.DAOTAO_TOCHUCCHUONGTRINH_TEN}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Điểm</Text>
            <Text style={styles.scoreValue}>{item.DIEM}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Điểm quy đổi</Text>
            <Text style={styles.scoreValue}>{item.DIEMQUYDOI.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="assessment" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Không có dữ liệu điểm rèn luyện</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'ky' && styles.tabActive]}
          onPress={() => setActiveSection('ky')}
        >
          <Text style={[styles.tabText, activeSection === 'ky' && styles.tabTextActive]}>
            Theo kỳ ({data.rsKy.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSection === 'nam' && styles.tabActive]}
          onPress={() => setActiveSection('nam')}
        >
          <Text style={[styles.tabText, activeSection === 'nam' && styles.tabTextActive]}>
            Theo năm ({data.rsNam.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSection === 'toankhoa' && styles.tabActive]}
          onPress={() => setActiveSection('toankhoa')}
        >
          <Text style={[styles.tabText, activeSection === 'toankhoa' && styles.tabTextActive]}>
            Toàn khóa ({data.rsToanKhoa.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {activeSection === 'ky' && (
            <>
              {data.rsKy.length === 0 ? (
                <View style={styles.emptySection}>
                  <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
                  <Text style={styles.emptySectionText}>Chưa có điểm rèn luyện theo kỳ</Text>
                </View>
              ) : (
                data.rsKy.map((item, index) => renderScoreCard(item, index, true))
              )}
            </>
          )}

          {activeSection === 'nam' && (
            <>
              {data.rsNam.length === 0 ? (
                <View style={styles.emptySection}>
                  <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
                  <Text style={styles.emptySectionText}>Chưa có điểm rèn luyện theo năm</Text>
                </View>
              ) : (
                data.rsNam.map((item, index) => renderScoreCard(item, index, false))
              )}
            </>
          )}

          {activeSection === 'toankhoa' && (
            <>
              {data.rsToanKhoa.length === 0 ? (
                <View style={styles.emptySection}>
                  <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
                  <Text style={styles.emptySectionText}>Chưa có điểm rèn luyện toàn khóa</Text>
                </View>
              ) : (
                data.rsToanKhoa.map((item, index) => renderScoreCard(item, index, false))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  emptySection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  xepLoaiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  xepLoaiText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: {
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 100,
  },
  cardValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  scoreDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
});

export default TrainingScores;
