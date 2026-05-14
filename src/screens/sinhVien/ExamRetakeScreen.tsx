import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import examRetakeService, {
  ChuongTrinhThiLai,
  KeHoachThiLai,
  HocPhanThiLai,
} from '../../services/sinhVien/examRetakeService';

const COLS = {
  stt: 50,
  ma: 100,
  ten: 200,
  loaiDiem: 110,
  tinChi: 60,
  diem: 70,
  danhGia: 110,
  thoiGian: 100,
  phi: 100,
  daNop: 100,
  action: 110,
};

type DropdownKind = 'chuongTrinh' | 'keHoach' | null;

const formatVnd = (n?: number) =>
  n == null || isNaN(Number(n)) ? '0' : Number(n).toLocaleString('vi-VN');

const ExamRetakeScreen = () => {
  const navigation = useNavigation();

  const [chuongTrinhList, setChuongTrinhList] = useState<ChuongTrinhThiLai[]>([]);
  const [selectedCT, setSelectedCT] = useState<ChuongTrinhThiLai | null>(null);
  const [keHoachList, setKeHoachList] = useState<KeHoachThiLai[]>([]);
  const [selectedKH, setSelectedKH] = useState<KeHoachThiLai | null>(null);

  const [chuaDangKy, setChuaDangKy] = useState<HocPhanThiLai[]>([]);
  const [daDangKy, setDaDangKy] = useState<HocPhanThiLai[]>([]);

  const [loadingCT, setLoadingCT] = useState(true);
  const [loadingKH, setLoadingKH] = useState(false);
  const [loadingHP, setLoadingHP] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dropdown, setDropdown] = useState<DropdownKind>(null);

  useEffect(() => {
    loadChuongTrinh();
  }, []);

  const loadChuongTrinh = async () => {
    try {
      setLoadingCT(true);
      const list = await examRetakeService.getChuongTrinh();
      setChuongTrinhList(list);
      if (list.length > 0) {
        setSelectedCT(list[0]);
        loadKeHoach(list[0].DAOTAO_TOCHUCCHUONGTRINH_ID || list[0].ID);
      }
    } catch (e) {
      console.error('[ThiLai] loadChuongTrinh', e);
    } finally {
      setLoadingCT(false);
    }
  };

  const loadKeHoach = async (ctId: string) => {
    try {
      setLoadingKH(true);
      const list = await examRetakeService.getKeHoach(ctId);
      setKeHoachList(list);
      setSelectedKH(list[0] || null);
    } catch (e) {
      console.error('[ThiLai] loadKeHoach', e);
      setKeHoachList([]);
      setSelectedKH(null);
    } finally {
      setLoadingKH(false);
    }
  };

  const loadHocPhan = async () => {
    if (!selectedCT) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn chương trình trước');
      return;
    }
    try {
      setLoadingHP(true);
      setError(null);
      const { chuaDangKy, daDangKy } = await examRetakeService.getHocPhanList({
        chuongTrinhId: selectedCT.DAOTAO_TOCHUCCHUONGTRINH_ID || selectedCT.ID,
        keHoachId: selectedKH?.ID || '',
      });
      setChuaDangKy(chuaDangKy);
      setDaDangKy(daDangKy);
    } catch (e: any) {
      console.error('[ThiLai] loadHocPhan', e);
      setError(e?.message || 'Không tải được danh sách học phần');
    } finally {
      setLoadingHP(false);
    }
  };

  const handleDangKy = (item: HocPhanThiLai) => {
    Alert.alert(
      'Xác nhận đăng ký',
      `Đăng ký thi lại "${item.DAOTAO_HOCPHAN_TEN}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng ký',
          onPress: async () => {
            try {
              setBusy(true);
              const r = await examRetakeService.dangKy(item);
              if (r.Success) {
                await loadHocPhan();
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
      ]
    );
  };

  const handleHuyDangKy = (item: HocPhanThiLai) => {
    Alert.alert('Xác nhận hủy', `Hủy đăng ký "${item.DAOTAO_HOCPHAN_TEN}"?`, [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Hủy đăng ký',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const r = await examRetakeService.huyDangKy(item);
            if (r.Success) {
              await loadHocPhan();
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
    ]);
  };

  const labelCT = (c: ChuongTrinhThiLai | null) =>
    c
      ? c.DAOTAO_CHUONGTRINH_TEN || c.DAOTAO_CHUONGTRINH_MA || c.ID
      : '-- Chọn chương trình --';

  const labelKH = (k: KeHoachThiLai | null) =>
    !k ? '-- Không có kế hoạch --' : k.TENKEHOACH || k.MAKEHOACH || k.TEN || k.ID;

  const dropdownData =
    dropdown === 'chuongTrinh'
      ? chuongTrinhList.map((c) => ({ ID: c.ID, label: labelCT(c) }))
      : dropdown === 'keHoach'
      ? keHoachList.map((k) => ({ ID: k.ID, label: labelKH(k) }))
      : [];

  const handlePick = (id: string) => {
    if (dropdown === 'chuongTrinh') {
      const found = chuongTrinhList.find((c) => c.ID === id);
      if (found) {
        setSelectedCT(found);
        loadKeHoach(found.DAOTAO_TOCHUCCHUONGTRINH_ID || found.ID);
      }
    } else if (dropdown === 'keHoach') {
      const found = keHoachList.find((k) => k.ID === id);
      if (found) setSelectedKH(found);
    }
    setDropdown(null);
  };

  const renderRow = (
    item: HocPhanThiLai,
    idx: number,
    showFee: boolean,
    actionLabel: string,
    actionColor: string,
    onAction: () => void
  ) => (
    <View key={`${item.ID}_${idx}`} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.stt }]}>{idx + 1}</Text>
      <Text style={[styles.cell, { width: COLS.ma }]}>{item.DAOTAO_HOCPHAN_MA || '-'}</Text>
      <Text style={[styles.cell, { width: COLS.ten }]} numberOfLines={2}>
        {item.DAOTAO_HOCPHAN_TEN || '-'}
      </Text>
      <Text style={[styles.cell, { width: COLS.loaiDiem }]}>
        {item.DIEM_THANHPHANDIEM_TEN || '-'}
      </Text>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.tinChi }]}>
        {item.HOCTRINH ?? '-'}
      </Text>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.diem }]}>
        {item.DIEM ?? '-'}
      </Text>
      <Text style={[styles.cell, { width: COLS.danhGia }]}>{item.DANHGIA_TEN || '-'}</Text>
      <Text style={[styles.cell, { width: COLS.thoiGian }]}>{item.THOIGIAN || '-'}</Text>
      {showFee && (
        <>
          <Text style={[styles.cell, styles.cellCenter, { width: COLS.phi }]}>
            {formatVnd(item.SOTIEN)}
          </Text>
          <Text style={[styles.cell, styles.cellCenter, { width: COLS.daNop }]}>
            {formatVnd(item.SOTIENDANOP)}
          </Text>
        </>
      )}
      <View style={[styles.cell, styles.cellCenter, { width: COLS.action }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: actionColor }]}
          onPress={onAction}
          disabled={busy}
        >
          <Text style={[styles.actionBtnText, { color: actionColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = (showFee: boolean) => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.stt }]}>STT</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.ma }]}>Mã HP</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.ten }]}>Tên HP</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.loaiDiem }]}>Loại điểm</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.tinChi }]}>TC</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.diem }]}>Điểm</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.danhGia }]}>Đánh giá</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.thoiGian }]}>Thời gian</Text>
      {showFee && (
        <>
          <Text style={[styles.cell, styles.headerCell, { width: COLS.phi }]}>Phí phải nộp</Text>
          <Text style={[styles.cell, styles.headerCell, { width: COLS.daNop }]}>Đã nộp</Text>
        </>
      )}
      <Text style={[styles.cell, styles.headerCell, { width: COLS.action }]}>Thao tác</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký thi lại</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Filters */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Chương trình</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => chuongTrinhList.length > 0 && setDropdown('chuongTrinh')}
              disabled={loadingCT}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {loadingCT ? 'Đang tải...' : labelCT(selectedCT)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Kế hoạch</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, keHoachList.length === 0 && styles.dropdownDisabled]}
              onPress={() => keHoachList.length > 0 && setDropdown('keHoach')}
              disabled={keHoachList.length === 0}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {loadingKH ? 'Đang tải...' : labelKH(selectedKH)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={loadHocPhan} disabled={loadingHP}>
            {loadingHP ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="search" size={18} color="#FFFFFF" />
                <Text style={styles.searchBtnText}>Xem</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Chưa đăng ký */}
        <Text style={styles.sectionTitle}>Danh sách học phần đủ điều kiện đăng ký</Text>
        {chuaDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Không có học phần đủ điều kiện</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {renderHeader(false)}
              {chuaDangKy.map((it, idx) =>
                renderRow(it, idx, false, 'Đăng ký', '#10B981', () => handleDangKy(it))
              )}
            </View>
          </ScrollView>
        )}

        {/* Đã đăng ký */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Danh sách học phần đã đăng ký
        </Text>
        {daDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa đăng ký học phần nào</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {renderHeader(true)}
              {daDangKy.map((it, idx) =>
                renderRow(it, idx, true, 'Hủy', '#DC2626', () => handleHuyDangKy(it))
              )}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      <Modal
        visible={dropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdown(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {dropdown === 'chuongTrinh' ? 'Chọn chương trình' : 'Chọn kế hoạch'}
            </Text>
            <FlatList
              data={dropdownData}
              keyExtractor={(it) => it.ID}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handlePick(item.ID)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#9CA3AF', paddingVertical: 16 }}>
                  Không có dữ liệu
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  filterCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  filterLabel: { width: 90, fontSize: 13, color: '#4B5563', fontWeight: '600' },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { flex: 1, fontSize: 13, color: '#111827' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
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
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 4 },
  modalItemText: { fontSize: 14, color: '#111827' },
  modalSeparator: { height: 1, backgroundColor: '#E5E7EB' },
});

export default ExamRetakeScreen;
