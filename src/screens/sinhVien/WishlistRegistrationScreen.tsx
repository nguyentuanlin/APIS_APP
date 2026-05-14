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
import AsyncStorage from '@react-native-async-storage/async-storage';
import nguyenVongService, {
  KeHoachNguyenVong,
  KieuHocItem,
  NguyenVongItem,
} from '../../services/sinhVien/nguyenVongService';

const COLS = {
  stt: 50,
  ma: 110,
  ten: 220,
  tinChi: 70,
  ketQua: 80,
  danhGia: 110,
  dieuKien: 180,
  khoiKT: 160,
  phanKy: 140,
  action: 120,
};

type DropdownKind = 'kehoach' | 'kieuhoc' | null;

const WishlistRegistrationScreen = () => {
  const navigation = useNavigation();

  const [studentInfo, setStudentInfo] = useState<{
    maso?: string;
    fullName?: string;
    nganh?: string;
  }>({});

  const [loadingKeHoach, setLoadingKeHoach] = useState(true);
  const [keHoachList, setKeHoachList] = useState<KeHoachNguyenVong[]>([]);
  const [selectedKeHoach, setSelectedKeHoach] = useState<KeHoachNguyenVong | null>(null);

  const [kieuHocList, setKieuHocList] = useState<KieuHocItem[]>([]);
  const [selectedKieuHoc, setSelectedKieuHoc] = useState<KieuHocItem | null>(null);

  const [chuaDangKy, setChuaDangKy] = useState<NguyenVongItem[]>([]);
  const [daDangKy, setDaDangKy] = useState<NguyenVongItem[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dropdown, setDropdown] = useState<DropdownKind>(null);
  const [busy, setBusy] = useState(false);

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
          maso: d?.QLSV_NGUOIHOC_MASO,
          fullName: `${d?.QLSV_NGUOIHOC_HODEM || ''} ${d?.QLSV_NGUOIHOC_TEN || ''}`.trim(),
          nganh: d?.DAOTAO_CHUONGTRINH_TEN,
        });
      }
    } catch {}

    await loadKeHoach();
  };

  const loadKeHoach = async () => {
    try {
      setLoadingKeHoach(true);
      const list = await nguyenVongService.getKeHoach();
      setKeHoachList(list);
      if (list.length > 0) {
        setSelectedKeHoach(list[0]);
        loadKieuHoc(list[0].ID);
      }
    } catch (e) {
      console.error('[NguyenVong] loadKeHoach', e);
    } finally {
      setLoadingKeHoach(false);
    }
  };

  const loadKieuHoc = async (keHoachId: string) => {
    try {
      const list = await nguyenVongService.getKieuHoc(keHoachId);
      setKieuHocList(list);
      setSelectedKieuHoc(list[0] || null);
    } catch (e) {
      console.error('[NguyenVong] loadKieuHoc', e);
      setKieuHocList([]);
      setSelectedKieuHoc(null);
    }
  };

  const loadTables = async () => {
    if (!selectedKeHoach) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn kế hoạch trước');
      return;
    }
    try {
      setLoadingTable(true);
      setError(null);
      const params = {
        keHoachId: selectedKeHoach.ID,
        kieuHocId: selectedKieuHoc?.ID || '',
      };
      const [chua, da] = await Promise.all([
        nguyenVongService.getChuaDangKy(params),
        nguyenVongService.getDaDangKy(params),
      ]);
      setChuaDangKy(chua);
      setDaDangKy(da);
    } catch (e: any) {
      console.error('[NguyenVong] loadTables', e);
      setError(e?.message || 'Không tải được danh sách');
    } finally {
      setLoadingTable(false);
    }
  };

  const handleDangKy = (item: NguyenVongItem) => {
    if (!selectedKeHoach) return;
    Alert.alert(
      'Xác nhận đăng ký',
      `Đăng ký nguyện vọng học phần "${item.DAOTAO_HOCPHAN_TEN}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng ký',
          onPress: async () => {
            try {
              setBusy(true);
              const r = await nguyenVongService.dangKy(item, selectedKeHoach.ID);
              if (r.Success) {
                await loadTables();
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

  const handleHuyDangKy = (item: NguyenVongItem) => {
    Alert.alert('Xác nhận hủy', `Hủy đăng ký "${item.DAOTAO_HOCPHAN_TEN}"?`, [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Hủy đăng ký',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const r = await nguyenVongService.huyDangKy(item);
            if (r.Success) {
              await loadTables();
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

  const labelKeHoach = (k: KeHoachNguyenVong | null) =>
    !k ? '-- Chọn kế hoạch --' : k.TENKEHOACH || k.TEN || k.MAKEHOACH || k.ID;

  const dropdownData =
    dropdown === 'kehoach'
      ? keHoachList.map((it) => ({ ID: it.ID, label: labelKeHoach(it) }))
      : dropdown === 'kieuhoc'
      ? kieuHocList.map((it) => ({ ID: it.ID, label: it.TEN }))
      : [];

  const onPickDropdown = (id: string) => {
    if (dropdown === 'kehoach') {
      const found = keHoachList.find((x) => x.ID === id);
      if (found) {
        setSelectedKeHoach(found);
        loadKieuHoc(found.ID);
      }
    } else if (dropdown === 'kieuhoc') {
      const found = kieuHocList.find((x) => x.ID === id);
      if (found) setSelectedKieuHoc(found);
    }
    setDropdown(null);
  };

  const renderTableHeader = (showAction: boolean, actionLabel: string) => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.stt }]}>STT</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.ma }]}>Mã HP</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.ten }]}>Tên học phần</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.tinChi }]}>TC</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.ketQua }]}>Kết quả</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.danhGia }]}>Đánh giá</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.dieuKien }]}>Điều kiện</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.khoiKT }]}>Khối KT</Text>
      <Text style={[styles.cell, styles.headerCell, { width: COLS.phanKy }]}>Phân kỳ</Text>
      {showAction && (
        <Text style={[styles.cell, styles.headerCell, { width: COLS.action }]}>{actionLabel}</Text>
      )}
    </View>
  );

  const renderRow = (
    item: NguyenVongItem,
    idx: number,
    onAction: () => void,
    actionLabel: string,
    actionColor: string
  ) => (
    <View key={`${item.ID}_${idx}`} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.stt }]}>{idx + 1}</Text>
      <Text style={[styles.cell, { width: COLS.ma }]}>{item.DAOTAO_HOCPHAN_MA || '-'}</Text>
      <Text style={[styles.cell, { width: COLS.ten }]} numberOfLines={2}>
        {item.DAOTAO_HOCPHAN_TEN || '-'}
      </Text>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.tinChi }]}>
        {item.HOCTRINHAPDUNGHOCTAP ?? '-'}
      </Text>
      <Text style={[styles.cell, styles.cellCenter, { width: COLS.ketQua }]}>
        {item.DIEM ?? '-'}
      </Text>
      <Text style={[styles.cell, { width: COLS.danhGia }]}>{item.DANHGIA_TEN || '-'}</Text>
      <Text style={[styles.cell, { width: COLS.dieuKien }]} numberOfLines={2}>
        {item.THONGTINQUANHEHOCPHAN || '-'}
      </Text>
      <Text style={[styles.cell, { width: COLS.khoiKT }]} numberOfLines={2}>
        {item.THUOCKHOIKIENTHUC || '-'}
      </Text>
      <Text style={[styles.cell, { width: COLS.phanKy }]}>{item.THOIGIAN || '-'}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký nguyện vọng</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body}>
        {/* Thông tin sinh viên */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin thí sinh</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã số</Text>
            <Text style={styles.infoValue}>{studentInfo.maso || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên</Text>
            <Text style={styles.infoValue}>{studentInfo.fullName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngành học</Text>
            <Text style={styles.infoValue}>{studentInfo.nganh || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kế hoạch</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => keHoachList.length > 0 && setDropdown('kehoach')}
              disabled={loadingKeHoach}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {loadingKeHoach ? 'Đang tải...' : labelKeHoach(selectedKeHoach)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kiểu học</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, kieuHocList.length === 0 && styles.dropdownDisabled]}
              onPress={() => kieuHocList.length > 0 && setDropdown('kieuhoc')}
              disabled={kieuHocList.length === 0}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedKieuHoc ? selectedKieuHoc.TEN : kieuHocList.length ? 'Chọn' : '...'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadTables} disabled={loadingTable}>
            {loadingTable ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="search" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Xem học phần</Text>
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
        <Text style={styles.sectionTitle}>Danh sách các nguyện vọng chưa đăng ký</Text>
        {chuaDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có học phần</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {renderTableHeader(true, 'Đăng ký')}
              {chuaDangKy.map((it, idx) =>
                renderRow(it, idx, () => handleDangKy(it), 'Đăng ký', '#10B981')
              )}
            </View>
          </ScrollView>
        )}

        {/* Đã đăng ký */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Danh sách các nguyện vọng đã đăng ký
        </Text>
        {daDangKy.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa đăng ký nguyện vọng nào</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {renderTableHeader(true, 'Hủy')}
              {daDangKy.map((it, idx) =>
                renderRow(it, idx, () => handleHuyDangKy(it), 'Hủy đăng ký', '#DC2626')
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
              {dropdown === 'kehoach' ? 'Chọn kế hoạch' : 'Chọn kiểu học'}
            </Text>
            <FlatList
              data={dropdownData}
              keyExtractor={(it) => it.ID}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => onPickDropdown(item.ID)}>
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
  section: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 36,
  },
  infoLabel: { width: 90, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827' },
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
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

export default WishlistRegistrationScreen;
