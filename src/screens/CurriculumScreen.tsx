import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import curriculumService, { ChuongTrinhItem, KhoiBatBuocItem, HocPhanItem } from '../services/curriculumService';

const CurriculumScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [chuongTrinh, setChuongTrinh] = useState<ChuongTrinhItem | null>(null);
  const [khoiList, setKhoiList] = useState<KhoiBatBuocItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<HocPhanItem[]>([]);
  const [expandedKhoi, setExpandedKhoi] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load chương trình
      const chuongTrinhData = await curriculumService.getChuongTrinhList();
      if (chuongTrinhData.length > 0) {
        const ct = chuongTrinhData[0];
        setChuongTrinh(ct);
        
        // Load khối bắt buộc và học phần
        const [khoiData, hocPhanData] = await Promise.all([
          curriculumService.getKhoiBatBuocList(ct.DAOTAO_TOCHUCCHUONGTRINH_ID),
          curriculumService.getHocPhanList(ct.DAOTAO_TOCHUCCHUONGTRINH_ID),
        ]);
        
        setKhoiList(khoiData);
        setHocPhanList(hocPhanData);
      }
    } catch (error) {
      console.error('Error loading curriculum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleKhoi = (khoiId: string) => {
    setExpandedKhoi(prev => ({
      ...prev,
      [khoiId]: !prev[khoiId],
    }));
  };

  const getHocPhanByKhoi = (khoiId: string): HocPhanItem[] => {
    const filtered = hocPhanList.filter(hp => hp.DAOTAO_KHOIBATBUOC_ID === khoiId);
    console.log(`[CurriculumScreen] Khoi ${khoiId}: ${filtered.length} hoc phan`);
    return filtered;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chương trình học</Text>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chương trình học</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Program Info Card */}
        {chuongTrinh && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="school" size={32} color="#3B82F6" />
              <View style={styles.infoHeaderText}>
                <Text style={styles.infoTitle}>{chuongTrinh.DAOTAO_TOCHUCCHUONGTRINH_TEN}</Text>
                <Text style={styles.infoSubtitle}>
                  Mã: {chuongTrinh.DAOTAO_TOCHUCCHUONGTRINH_MA}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lớp:</Text>
              <Text style={styles.infoValue}>{chuongTrinh.DAOTAO_LOPQUANLY_TEN}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng số tín chỉ:</Text>
              <Text style={styles.infoValue}>{chuongTrinh.TONGSOTINCHIQUYDINH}</Text>
            </View>
          </View>
        )}

        {/* Khoi Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cấu trúc chương trình ({khoiList.length} khối)</Text>
          
          <View style={styles.khoiSummaryContainer}>
            {khoiList.map((khoi) => (
              <View key={khoi.ID} style={styles.khoiSummaryCard}>
                <View style={styles.khoiSummaryBadge}>
                  <Text style={styles.khoiSummaryBadgeText}>{khoi.KYHIEU}</Text>
                </View>
                <Text style={styles.khoiSummaryTitle} numberOfLines={2}>{khoi.TEN}</Text>
                <View style={styles.khoiSummaryStats}>
                  <Text style={styles.khoiSummaryStatText}>{khoi.TONGSOHOCPHAN} HP</Text>
                  <Text style={styles.khoiSummaryStatDivider}>•</Text>
                  <Text style={styles.khoiSummaryStatText}>{khoi.TONGSOTINCHI} TC</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* All Hoc Phan List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách học phần ({hocPhanList.length})</Text>
          
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 50 }]}>STT</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Mã HP</Text>
                  <Text style={[styles.tableHeaderText, { width: 250 }]}>Tên học phần</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Loại PB</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Số tiết</Text>
                </View>

                {/* Table Rows */}
                {hocPhanList.map((hp, index) => (
                  <View key={hp.ID} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: 50 }]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, { width: 100 }]}>{hp.DAOTAO_HOCPHAN_MA}</Text>
                    <Text style={[styles.tableCell, { width: 250 }]} numberOfLines={2}>
                      {hp.DAOTAO_HOCPHAN_TEN}
                    </Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{hp.LOAIPHANBO_MA || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{hp.SOTIET || 0}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
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
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  khoiSummaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  khoiSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  khoiSummaryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  khoiSummaryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  khoiSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    minHeight: 36,
  },
  khoiSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  khoiSummaryStatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  khoiSummaryStatDivider: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  khoiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  khoiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  khoiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  khoiBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  khoiBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  khoiInfo: {
    flex: 1,
  },
  khoiTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  khoiMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  hocPhanList: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 12,
    color: '#111827',
    paddingHorizontal: 4,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});

export default CurriculumScreen;
