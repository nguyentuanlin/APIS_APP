import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import graduationService, { KeHoachXetTN } from '../services/graduationService';

const COLS = {
  stt: 50,
  dot: 200,
  loai: 140,
  xacNhan: 160,
  chungChi: 160,
  tuXet: 100,
  phanHoi: 180,
};

const GraduationApplicationScreen = () => {
  const navigation = useNavigation();
  const [chuongTrinhName, setChuongTrinhName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<KeHoachXetTN[]>([]);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_student_info');
      if (cached) {
        const parsed = JSON.parse(cached);
        const ten = parsed.data?.DAOTAO_CHUONGTRINH_TEN;
        if (ten) setChuongTrinhName(ten);
      }
    } catch {}
    await loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await graduationService.getKeHoachXetTN();
      setList(data);
    } catch (e: any) {
      console.error('[Graduation] load error:', e);
      setError(e?.message || 'Không tải được danh sách');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xét tốt nghiệp</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Chương trình</Text>
        <View style={[styles.dropdownTrigger, styles.dropdownReadonly]}>
          <Text style={styles.dropdownText} numberOfLines={1}>
            {chuongTrinhName || 'Đang tải...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={loadData} disabled={loading}>
          <MaterialIcons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.searchBtnText}>Tìm kiếm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Kết quả</Text>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="school" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              Hiện tại chưa có đợt xét - hoãn xét tốt nghiệp nào
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.stt }]}>STT</Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.dot }]}>
                  Đợt xét duyệt
                </Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.loai }]}>Loại xét</Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.xacNhan }]}>
                  Xác nhận theo KH
                </Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.chungChi }]}>
                  Chứng chỉ đã có
                </Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.tuXet }]}>Tự xét</Text>
                <Text style={[styles.cell, styles.headerCell, { width: COLS.phanHoi }]}>
                  Phản hồi NT
                </Text>
              </View>
              <ScrollView>
                {list.map((item, idx) => (
                  <View
                    key={`${item.ID}_${idx}`}
                    style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
                  >
                    <Text style={[styles.cell, styles.cellCenter, { width: COLS.stt }]}>
                      {idx + 1}
                    </Text>
                    <Text style={[styles.cell, { width: COLS.dot }]} numberOfLines={2}>
                      {item.TEN || '-'}
                    </Text>
                    <Text style={[styles.cell, { width: COLS.loai }]}>
                      {item.PHANLOAI_TEN || '-'}
                    </Text>
                    <Text style={[styles.cell, { width: COLS.xacNhan }]}>
                      {item.TINHTRANGDANGKY || 'Chưa xác nhận'}
                    </Text>
                    <Text style={[styles.cell, { width: COLS.chungChi }]}>-</Text>
                    <Text style={[styles.cell, styles.cellCenter, { width: COLS.tuXet }]}>-</Text>
                    <Text style={[styles.cell, { width: COLS.phanHoi }]}>-</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        )}

        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={20} color="#1E40AF" />
          <Text style={styles.infoText}>
            Các thao tác xác nhận, khai minh chứng chứng chỉ và xét tốt nghiệp cần dùng web
            qldt.eaut.edu.vn (yêu cầu upload file minh chứng).
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  gradient: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterLabel: { fontSize: 13, color: '#4B5563', marginRight: 6, fontWeight: '600' },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  dropdownReadonly: { backgroundColor: '#F3F4F6' },
  dropdownText: { flex: 1, fontSize: 13, color: '#111827' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  body: { flex: 1, padding: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 8 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  errorText: { color: '#991B1B', marginLeft: 8, flex: 1, fontSize: 13 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
    padding: 12,
    marginTop: 16,
    borderRadius: 6,
  },
  infoText: { color: '#1E3A8A', marginLeft: 8, flex: 1, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  rowAlt: { backgroundColor: '#F9FAFB' },
  headerRow: { backgroundColor: '#EFF6FF', borderBottomColor: '#BFDBFE' },
  cell: { paddingHorizontal: 10, paddingVertical: 12, fontSize: 13, color: '#111827' },
  cellCenter: { textAlign: 'center' },
  headerCell: { fontWeight: '700', color: '#1E40AF', fontSize: 12 },
});

export default GraduationApplicationScreen;
