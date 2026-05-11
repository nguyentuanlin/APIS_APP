import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import studyOrientationService, {
  DinhHuongChung,
  DinhHuongDaDangKy,
} from '../services/studyOrientationService';

const StudyOrientationScreen = () => {
  const navigation = useNavigation();
  const [chuongTrinhName, setChuongTrinhName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chuaDangKy, setChuaDangKy] = useState<DinhHuongChung[]>([]);
  const [daDangKy, setDaDangKy] = useState<DinhHuongDaDangKy[]>([]);

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
      const { chuaDangKy: cdk, daDangKy: ddk } =
        await studyOrientationService.getDinhHuong();
      setChuaDangKy(cdk);
      setDaDangKy(ddk);
    } catch (e: any) {
      console.error('[StudyOrientation] load error:', e);
      setError(e?.message || 'Không tải được danh sách định hướng');
      setChuaDangKy([]);
      setDaDangKy([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDangKy = (item: DinhHuongChung) => {
    Alert.alert('Xác nhận đăng ký', `Đăng ký định hướng "${item.TEN}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng ký',
        onPress: async () => {
          try {
            setBusy(true);
            const r = await studyOrientationService.dangKy(item);
            if (r.Success) {
              await loadData();
            } else {
              Alert.alert('Đăng ký thất bại', r.Message || 'Không đăng ký được');
            }
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không đăng ký được');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleHuyDangKy = (item: DinhHuongDaDangKy) => {
    Alert.alert(
      'Xác nhận hủy',
      `Hủy đăng ký định hướng "${item.DAOTAO_CT_DINHHUONG_TEN}"?`,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Hủy đăng ký',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              const r = await studyOrientationService.huyDangKy(item.ID);
              if (r.Success) {
                await loadData();
              } else {
                Alert.alert('Hủy thất bại', r.Message || 'Không hủy được');
              }
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không hủy được');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký định hướng học tập</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <View style={[styles.dropdownTrigger, styles.dropdownReadonly]}>
          <Text style={styles.dropdownText} numberOfLines={1}>
            {chuongTrinhName || 'Đang tải...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={loadData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.searchBtnText}>Xem định hướng</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Danh sách định hướng của chương trình</Text>
        {chuaDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có định hướng nào</Text>
          </View>
        ) : (
          chuaDangKy.map((item, idx) => (
            <View key={`${item.ID}_${idx}`} style={styles.card}>
              <Text style={styles.cardTitle}>
                {idx + 1}. {item.TEN}
              </Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Thời gian mở</Text>
                <Text style={styles.cardValue}>
                  {item.NGAYBATDAU || '-'} → {item.NGAYKETTHUC || '-'}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Chế độ ĐK</Text>
                <Text style={styles.cardValue}>
                  {item.CHEDODANGKYDINHHUONG_TEN || '-'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dangKyBtn}
                onPress={() => handleDangKy(item)}
                disabled={busy}
              >
                <MaterialIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.dangKyBtnText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Danh sách định hướng của bạn
        </Text>
        {daDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Bạn chưa đăng ký định hướng nào</Text>
          </View>
        ) : (
          daDangKy.map((item, idx) => (
            <View key={`${item.ID}_${idx}`} style={styles.card}>
              <Text style={styles.cardTitle}>
                {idx + 1}. {item.DAOTAO_CT_DINHHUONG_TEN}
              </Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Ngày đăng ký</Text>
                <Text style={styles.cardValue}>{item.NGAYTAO_DD_MM_YYYY || '-'}</Text>
              </View>
              <TouchableOpacity
                style={styles.huyBtn}
                onPress={() => handleHuyDangKy(item)}
                disabled={busy}
              >
                <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                <Text style={styles.huyBtnText}>Hủy đăng ký</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
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
  dropdownTrigger: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  dropdownReadonly: { backgroundColor: '#F3F4F6' },
  dropdownText: { fontSize: 13, color: '#111827' },
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 10 },
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
  emptyBox: { backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center', borderRadius: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardRow: { flexDirection: 'row', paddingVertical: 4 },
  cardLabel: { width: 110, fontSize: 13, color: '#6B7280' },
  cardValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  dangKyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  dangKyBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  huyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  huyBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
});

export default StudyOrientationScreen;
