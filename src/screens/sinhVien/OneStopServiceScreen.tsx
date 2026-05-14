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
import oneStopService, {
  OneStopStats,
  OneStopRequest,
} from '../../services/sinhVien/oneStopService';

const formatVnd = (n?: number | string) => {
  const num = Number(n);
  if (!n || isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

const OneStopServiceScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OneStopStats>({});
  const [list, setList] = useState<OneStopRequest[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, l] = await Promise.all([
        oneStopService.getStats().catch(() => ({})),
        oneStopService.getYeuCauList().catch(() => []),
      ]);
      setStats(s);
      setList(l);
    } catch (e: any) {
      console.error('[OneStop] load error:', e);
      setError(e?.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleTaoMoi = () => {
    Alert.alert(
      'Tạo yêu cầu mới',
      'Tính năng tạo yêu cầu một cửa cần upload file kèm theo. Vui lòng dùng web qldt.eaut.edu.vn để tạo yêu cầu.',
      [{ text: 'OK' }]
    );
  };

  const renderStatCard = (
    label: string,
    value: number | undefined,
    color: string,
    bgColor: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.statBadge, { backgroundColor: color }]}>
        <Text style={styles.statValue}>{value ?? 0}</Text>
      </View>
    </View>
  );

  const renderRequestCard = (item: OneStopRequest, idx: number) => (
    <View key={`${item.ID}_${idx}`} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestMa}>
            {item.MAYEUCAU || `YC-${idx + 1}`}
          </Text>
          <Text style={styles.requestTitle}>{item.YEUCAU_TEN || '-'}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText} numberOfLines={1}>
            {item.TINHTRANGXULY_THOIGIAN || 'Chưa xử lý'}
          </Text>
        </View>
      </View>
      <View style={styles.requestRow}>
        <MaterialIcons name="schedule" size={16} color="#6B7280" />
        <Text style={styles.requestMeta}>
          Tạo: {item.NGAYTAO_DD_MM_YYYY_HHMMSS || '-'}
        </Text>
      </View>
      {item.THOIGIANHOANTHANHDUKIEN ? (
        <View style={styles.requestRow}>
          <MaterialIcons name="event-available" size={16} color="#6B7280" />
          <Text style={styles.requestMeta}>
            Hoàn thành dự kiến: {item.THOIGIANHOANTHANHDUKIEN}
          </Text>
        </View>
      ) : null}
      {item.SOTIEN ? (
        <View style={styles.requestRow}>
          <MaterialIcons name="payments" size={16} color="#F59E0B" />
          <Text style={[styles.requestMeta, { color: '#F59E0B', fontWeight: '700' }]}>
            Số tiền: {formatVnd(item.SOTIEN)} đ
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hệ thống một cửa</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Welcome banner */}
        <View style={styles.welcomeCard}>
          <MaterialIcons name="how-to-vote" size={32} color="#1E40AF" />
          <Text style={styles.welcomeTitle}>HỆ THỐNG MỘT CỬA</Text>
          <Text style={styles.welcomeSub}>
            Quản lý yêu cầu thủ tục hành chính của bạn
          </Text>
          <TouchableOpacity style={styles.createBtn} onPress={handleTaoMoi}>
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Yêu cầu đã gửi',
              stats.TONGSOYEUCAUDAGUI,
              '#DC2626',
              '#FEF2F2'
            )}
            {renderStatCard(
              'Đã được xử lý',
              stats.TONGSOYEUCAUDADUOCXULY,
              '#10B981',
              '#ECFDF5'
            )}
            {renderStatCard(
              'Đang xử lý',
              stats.TONGSOYEUCAUDANGXULY,
              '#3B82F6',
              '#EFF6FF'
            )}
            {renderStatCard(
              'Cần bổ sung',
              stats.TONGSOYEUCAUCANHOANTHIEN,
              '#1E40AF',
              '#DBEAFE'
            )}
          </View>
        )}

        {/* Request list */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Danh sách yêu cầu</Text>
        {!loading && list.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="inbox" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có yêu cầu nào</Text>
          </View>
        ) : (
          list.map(renderRequestCard)
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
  body: { flex: 1, padding: 12 },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 8,
    marginBottom: 4,
  },
  welcomeSub: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    padding: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  statBadge: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  emptyBox: { backgroundColor: '#FFFFFF', padding: 32, alignItems: 'center', borderRadius: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestMa: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  requestTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 130,
  },
  statusText: { fontSize: 11, color: '#92400E', fontWeight: '700' },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  requestMeta: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
});

export default OneStopServiceScreen;
