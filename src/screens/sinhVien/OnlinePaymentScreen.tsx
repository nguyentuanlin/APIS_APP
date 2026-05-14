import React, { useEffect, useState, useMemo } from 'react';
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
import onlinePaymentService, { PaymentItem } from '../../services/sinhVien/onlinePaymentService';

const formatVnd = (n?: number | string) => {
  const num = Number(n);
  if (!n || isNaN(num)) return '0 ₫';
  return num.toLocaleString('vi-VN') + ' ₫';
};

const OnlinePaymentScreen = () => {
  const navigation = useNavigation();
  const [studentInfo, setStudentInfo] = useState<{
    fullName?: string;
    maso?: string;
    ngaySinh?: string;
    lop?: string;
    nganh?: string;
    khoa?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_student_info');
      if (cached) {
        const parsed = JSON.parse(cached);
        const d = parsed.data;
        setStudentInfo({
          fullName: `${d?.QLSV_NGUOIHOC_HODEM || ''} ${d?.QLSV_NGUOIHOC_TEN || ''}`.trim(),
          maso: d?.QLSV_NGUOIHOC_MASO,
          ngaySinh: d?.QLSV_NGUOIHOC_NGAYSINH,
          lop: d?.DAOTAO_LOPQUANLY_TEN,
          nganh: d?.DAOTAO_CHUONGTRINH_TEN,
          khoa: d?.DAOTAO_KHOADAOTAO_TEN,
        });
      }
    } catch {}
    await loadItems();
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await onlinePaymentService.getPaymentItems();
      setItems(list);
      // Auto-check bắt buộc items
      const init: Record<string, boolean> = {};
      list.forEach((it) => {
        if (it.BATBUOC === 1) init[it.ID] = true;
      });
      setSelected(init);
    } catch (e: any) {
      console.error('[OnlinePayment] load error:', e);
      setError(e?.message || 'Không tải được danh sách khoản thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string, batBuoc?: number) => {
    if (batBuoc === 1) return; // Khóa không cho bỏ check
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSelected = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (selected[it.ID] ? Number(it.SOTIEN || 0) : 0),
        0
      ),
    [items, selected]
  );

  const handlePay = () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (ids.length === 0) {
      Alert.alert('Chưa chọn', 'Vui lòng chọn khoản cần thanh toán');
      return;
    }
    Alert.alert(
      'Thanh toán trực tuyến',
      `Tổng tiền: ${formatVnd(totalSelected)}\n\nThanh toán qua VNPay/QR cần redirect sang cổng thanh toán. Vui lòng dùng web qldt.eaut.edu.vn để hoàn tất giao dịch an toàn.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán trực tuyến</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Student info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên</Text>
            <Text style={styles.infoValue}>{studentInfo.fullName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã SV</Text>
            <Text style={styles.infoValue}>{studentInfo.maso || '-'}</Text>
          </View>
          {studentInfo.ngaySinh ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày sinh</Text>
              <Text style={styles.infoValue}>{studentInfo.ngaySinh}</Text>
            </View>
          ) : null}
          {studentInfo.lop ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lớp</Text>
              <Text style={styles.infoValue}>{studentInfo.lop}</Text>
            </View>
          ) : null}
          {studentInfo.nganh ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngành</Text>
              <Text style={styles.infoValue}>{studentInfo.nganh}</Text>
            </View>
          ) : null}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Payment items */}
        <View style={styles.section}>
          <View style={styles.paymentHeader}>
            <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
            <Text style={styles.totalText}>
              Tổng: <Text style={styles.totalAmount}>{formatVnd(totalSelected)}</Text>
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 24 }} />
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="receipt-long" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không có khoản nào cần thanh toán</Text>
            </View>
          ) : (
            items.map((it, idx) => (
              <TouchableOpacity
                key={it.ID}
                style={[styles.itemRow, selected[it.ID] && styles.itemRowActive]}
                onPress={() => toggle(it.ID, it.BATBUOC)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {selected[it.ID] ? (
                    <MaterialIcons
                      name={it.BATBUOC === 1 ? 'lock' : 'check-box'}
                      size={20}
                      color="#3B82F6"
                    />
                  ) : (
                    <MaterialIcons name="check-box-outline-blank" size={20} color="#9CA3AF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.itemTitle}>
                    {idx + 1}. {it.NOIDUNG}
                  </Text>
                  {it.GHICHU ? <Text style={styles.itemMeta}>{it.GHICHU}</Text> : null}
                </View>
                <Text style={styles.itemAmount}>{formatVnd(it.SOTIEN)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment button */}
        {items.length > 0 && (
          <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
            <MaterialIcons name="payment" size={20} color="#FFFFFF" />
            <Text style={styles.payBtnText}>Thực hiện thanh toán</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={20} color="#1E40AF" />
          <Text style={styles.infoText}>
            Để hoàn tất giao dịch qua VNPay / QR ngân hàng, vui lòng dùng web qldt.eaut.edu.vn.
          </Text>
        </View>
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
  section: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 10 },
  infoRow: { flexDirection: 'row', paddingVertical: 5 },
  infoLabel: { width: 90, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827' },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalText: { fontSize: 13, color: '#6B7280' },
  totalAmount: { color: '#DC2626', fontWeight: '700' },
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
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 13, marginTop: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderRadius: 6,
  },
  itemRowActive: { backgroundColor: '#EFF6FF' },
  checkbox: { width: 24, alignItems: 'center' },
  itemTitle: { fontSize: 13, color: '#111827', fontWeight: '500' },
  itemMeta: { fontSize: 11, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
  itemAmount: { fontSize: 13, color: '#DC2626', fontWeight: '700' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8, fontSize: 14 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
    padding: 12,
    borderRadius: 6,
  },
  infoText: { color: '#1E3A8A', marginLeft: 8, flex: 1, fontSize: 13, lineHeight: 18 },
});

export default OnlinePaymentScreen;
