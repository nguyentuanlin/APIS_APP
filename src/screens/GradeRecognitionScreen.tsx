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
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import gradeRecognitionService, {
  KeHoachCongNhan,
  CongNhanDiemItem,
  DanhMucItem,
  ChungChiItem,
  CapDoItem,
  DauDiemItem,
  BangDiemEntry,
} from '../services/gradeRecognitionService';

type TabId = 'bangdiem' | 'chungchi';

const COLS = {
  stt: 50,
  ma: 110,
  ten: 220,
  tinChi: 80,
  ketQua: 140,
  ketQuaMoi: 140,
  thongTin: 160,
  action: 130,
};

const DD_COLS = {
  stt: 50,
  ten: 200,
  thang: 140,
  ketQua: 100,
  ghiChu: 160,
};

const ALL_KE_HOACH: KeHoachCongNhan = {
  ID: '',
  TENKEHOACH: '-- Không tìm thấy dữ liệu --',
};

type DropdownItem = { ID: string; label: string };

const GradeRecognitionScreen = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<TabId>('bangdiem');
  const [chuongTrinhName, setChuongTrinhName] = useState<string>('');
  const [chuongTrinhId, setChuongTrinhId] = useState<string>('');

  // BangDiem modal state
  const [bangDiemModalOpen, setBangDiemModalOpen] = useState(false);
  const [bangDiemHocPhan, setBangDiemHocPhan] = useState<CongNhanDiemItem | null>(null);
  const [bangDiemEntries, setBangDiemEntries] = useState<BangDiemEntry[]>([]);
  const [bangDiemLoading, setBangDiemLoading] = useState(false);
  const [bangDiemSaving, setBangDiemSaving] = useState(false);
  const [newRowTen, setNewRowTen] = useState('');
  const [newRowTinChi, setNewRowTinChi] = useState('');
  const [newRowDiem, setNewRowDiem] = useState('');

  // Tab 1 state
  const [loadingKeHoach, setLoadingKeHoach] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [keHoachList, setKeHoachList] = useState<KeHoachCongNhan[]>([]);
  const [selectedKeHoach, setSelectedKeHoach] = useState<KeHoachCongNhan>(ALL_KE_HOACH);
  const [items, setItems] = useState<CongNhanDiemItem[]>([]);
  const [tab1Error, setTab1Error] = useState<string | null>(null);
  const [showKHDropdown, setShowKHDropdown] = useState(false);

  // Tab 2 state
  const [loaiList, setLoaiList] = useState<DanhMucItem[]>([]);
  const [selectedLoai, setSelectedLoai] = useState<DanhMucItem | null>(null);
  const [tenList, setTenList] = useState<ChungChiItem[]>([]);
  const [selectedTen, setSelectedTen] = useState<ChungChiItem | null>(null);
  const [capDoList, setCapDoList] = useState<CapDoItem[]>([]);
  const [selectedCapDo, setSelectedCapDo] = useState<CapDoItem | null>(null);
  const [dauDiemList, setDauDiemList] = useState<DauDiemItem[]>([]);
  const [tab2Error, setTab2Error] = useState<string | null>(null);
  const [tab2Loading, setTab2Loading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    'loai' | 'ten' | 'capdo' | null
  >(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_student_info');
      if (cached) {
        const parsed = JSON.parse(cached);
        const tenCT = parsed.data?.DAOTAO_CHUONGTRINH_TEN;
        if (tenCT) setChuongTrinhName(tenCT);
        const idCT = parsed.data?.DAOTAO_TOCHUCCHUONGTRINH_ID;
        if (idCT) setChuongTrinhId(idCT);
      }
    } catch {}

    await Promise.all([loadKeHoach(), loadItems('')]);

    // Lazy load loại chứng chỉ
    gradeRecognitionService
      .getLoaiChungChi()
      .then(setLoaiList)
      .catch((e) => console.warn('[GradeRecognition] loaiCC error', e));
  };

  const loadKeHoach = async () => {
    try {
      setLoadingKeHoach(true);
      const list = await gradeRecognitionService.getKeHoachCongNhan();
      setKeHoachList(list);
    } catch (e) {
      console.error('[GradeRecognition] loadKeHoach error:', e);
    } finally {
      setLoadingKeHoach(false);
    }
  };

  const loadItems = async (keHoachId: string) => {
    try {
      setLoadingItems(true);
      setTab1Error(null);
      const list = await gradeRecognitionService.getCongNhanDiem(keHoachId);
      setItems(list);
    } catch (e: any) {
      console.error('[GradeRecognition] loadItems error:', e);
      setTab1Error(e?.message || 'Không tải được danh sách học phần');
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const onSelectLoai = async (item: DanhMucItem) => {
    setActiveDropdown(null);
    setSelectedLoai(item);
    setSelectedTen(null);
    setSelectedCapDo(null);
    setTenList([]);
    setCapDoList([]);
    setDauDiemList([]);
    try {
      setTab2Loading(true);
      const list = await gradeRecognitionService.getTenChungChi(item.ID);
      setTenList(list);
    } catch (e: any) {
      setTab2Error(e?.message || 'Không tải được tên chứng chỉ');
    } finally {
      setTab2Loading(false);
    }
  };

  const onSelectTen = async (item: ChungChiItem) => {
    setActiveDropdown(null);
    setSelectedTen(item);
    setSelectedCapDo(null);
    setCapDoList([]);
    setDauDiemList([]);
    if (!selectedLoai) return;
    try {
      setTab2Loading(true);
      const list = await gradeRecognitionService.getCapDo(selectedLoai.ID, item.ID);
      setCapDoList(list);
    } catch (e: any) {
      setTab2Error(e?.message || 'Không tải được cấp độ');
    } finally {
      setTab2Loading(false);
    }
  };

  const onSelectCapDo = async (item: CapDoItem) => {
    setActiveDropdown(null);
    setSelectedCapDo(item);
    setDauDiemList([]);
    try {
      setTab2Loading(true);
      const list = await gradeRecognitionService.getDauDiem(item.ID);
      setDauDiemList(list);
    } catch (e: any) {
      setTab2Error(e?.message || 'Không tải được đầu điểm');
    } finally {
      setTab2Loading(false);
    }
  };

  const openBangDiemModal = (hocPhan: CongNhanDiemItem) => {
    setBangDiemHocPhan(hocPhan);
    setBangDiemModalOpen(true);
    setNewRowTen('');
    setNewRowTinChi('');
    setNewRowDiem('');
    loadBangDiemEntries(hocPhan);
  };

  const loadBangDiemEntries = async (hocPhan: CongNhanDiemItem) => {
    try {
      setBangDiemLoading(true);
      const list = await gradeRecognitionService.getBangDiemList({
        chuongTrinhId,
        keHoachId: selectedKeHoach.ID,
        hocPhanId: hocPhan.DAOTAO_HOCPHAN_ID || hocPhan.ID,
      });
      setBangDiemEntries(list);
    } catch (e) {
      console.warn('[BangDiem] load error:', e);
      setBangDiemEntries([]);
    } finally {
      setBangDiemLoading(false);
    }
  };

  const handleAddBangDiemRow = async () => {
    if (!bangDiemHocPhan) return;
    if (!newRowTen.trim() || !newRowTinChi.trim() || !newRowDiem.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đủ Tên học phần, Số tín chỉ và Điểm');
      return;
    }
    try {
      setBangDiemSaving(true);
      const result = await gradeRecognitionService.themBangDiemEntry({
        chuongTrinhId,
        keHoachId: selectedKeHoach.ID,
        hocPhanId: bangDiemHocPhan.DAOTAO_HOCPHAN_ID || bangDiemHocPhan.ID,
        tenHocPhan: newRowTen.trim(),
        soTinChi: newRowTinChi.trim(),
        diem: newRowDiem.trim(),
      });
      if (result.Success) {
        setNewRowTen('');
        setNewRowTinChi('');
        setNewRowDiem('');
        await loadBangDiemEntries(bangDiemHocPhan);
      } else {
        Alert.alert('Lưu thất bại', result.Message || 'Không lưu được dòng mới');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không lưu được');
    } finally {
      setBangDiemSaving(false);
    }
  };

  const handleDeleteBangDiemRow = (entry: BangDiemEntry) => {
    Alert.alert('Xác nhận xóa', `Xóa dòng "${entry.TENHOCPHAN}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await gradeRecognitionService.xoaBangDiemEntry(entry.ID);
            if (result.Success && bangDiemHocPhan) {
              await loadBangDiemEntries(bangDiemHocPhan);
            } else {
              Alert.alert('Xóa thất bại', result.Message || 'Không xóa được');
            }
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không xóa được');
          }
        },
      },
    ]);
  };

  const handleSelectKeHoach = (kh: KeHoachCongNhan) => {
    setSelectedKeHoach(kh);
    setShowKHDropdown(false);
    loadItems(kh.ID);
  };

  const formatKeHoachLabel = (kh: KeHoachCongNhan) => {
    if (!kh.ID) return '-- Không tìm thấy dữ liệu --';
    const ma = kh.MAKEHOACH ? `${kh.MAKEHOACH} - ` : '';
    return `${ma}${kh.TENKEHOACH || kh.TEN || ''}`;
  };

  const keHoachOptions: KeHoachCongNhan[] =
    keHoachList.length === 0 ? [ALL_KE_HOACH] : [ALL_KE_HOACH, ...keHoachList];

  const renderTableTab1 = () => {
    if (loadingItems) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải học phần...</Text>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <MaterialIcons name="inbox" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Không có học phần nào</Text>
        </View>
      );
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.stt }]}>STT</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.ma }]}>Mã HP</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.ten }]}>Tên học phần</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.tinChi }]}>TC</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.ketQua }]}>Đã tích lũy</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.ketQuaMoi }]}>Công nhận mới</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.thongTin }]}>Thông tin</Text>
            <Text style={[styles.cell, styles.headerCell, { width: COLS.action }]}>Đăng ký</Text>
          </View>
          <ScrollView>
            {items.map((item, idx) => (
              <View
                key={`${item.ID}_${idx}`}
                style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
              >
                <Text style={[styles.cell, styles.cellCenter, { width: COLS.stt }]}>{idx + 1}</Text>
                <Text style={[styles.cell, { width: COLS.ma }]}>{item.DAOTAO_HOCPHAN_MA || '-'}</Text>
                <Text style={[styles.cell, { width: COLS.ten }]} numberOfLines={2}>
                  {item.DAOTAO_HOCPHAN_TEN || '-'}
                </Text>
                <Text style={[styles.cell, styles.cellCenter, { width: COLS.tinChi }]}>
                  {item.HOCTRINHAPDUNGHOCTAP ?? '-'}
                </Text>
                <Text style={[styles.cell, styles.cellCenter, { width: COLS.ketQua }]}>
                  {item.KETQUA ?? '-'}
                </Text>
                <Text style={[styles.cell, styles.cellCenter, { width: COLS.ketQuaMoi }]}>
                  {item.KETQUAMOI ?? '-'}
                </Text>
                <Text style={[styles.cell, { width: COLS.thongTin }]} numberOfLines={2}>
                  {item.TINHTRANGCONGNHAN_TEN || '-'}
                </Text>
                <View style={[styles.cell, styles.cellCenter, { width: COLS.action }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openBangDiemModal(item)}
                  >
                    <Text style={styles.actionBtnText}>Từ bảng điểm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    );
  };

  const renderTab1 = () => (
    <>
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Kế hoạch</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => !loadingKeHoach && setShowKHDropdown(true)}
            disabled={loadingKeHoach}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {loadingKeHoach ? 'Đang tải...' : formatKeHoachLabel(selectedKeHoach)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Chương trình</Text>
          <View style={[styles.dropdownTrigger, styles.dropdownReadonly]}>
            <Text style={styles.dropdownText} numberOfLines={1}>
              {chuongTrinhName || 'Đang tải...'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        {tab1Error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{tab1Error}</Text>
          </View>
        ) : null}
        {renderTableTab1()}
      </View>
    </>
  );

  const renderTab2 = () => (
    <ScrollView style={styles.body} contentContainerStyle={styles.tab2Content}>
      {/* Filter dropdowns */}
      <Text style={styles.sectionTitle}>Thông tin chứng chỉ</Text>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Loại CC</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => loaiList.length > 0 && setActiveDropdown('loai')}
        >
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedLoai ? selectedLoai.TEN : 'Chọn phân loại chứng chỉ'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Tên CC</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, !tenList.length && styles.dropdownDisabled]}
          onPress={() => tenList.length > 0 && setActiveDropdown('ten')}
          disabled={!tenList.length}
        >
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedTen ? selectedTen.TEN : tenList.length ? 'Chọn tên chứng chỉ' : '...'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Cấp độ</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, !capDoList.length && styles.dropdownDisabled]}
          onPress={() => capDoList.length > 0 && setActiveDropdown('capdo')}
          disabled={!capDoList.length}
        >
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedCapDo ? selectedCapDo.TEN : capDoList.length ? 'Chọn cấp độ' : '...'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {tab2Loading && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      )}

      {tab2Error ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>{tab2Error}</Text>
        </View>
      ) : null}

      {/* Bảng đầu điểm */}
      <Text style={styles.sectionTitle}>Danh sách các đầu điểm phải nhập</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, { width: DD_COLS.stt }]}>STT</Text>
            <Text style={[styles.cell, styles.headerCell, { width: DD_COLS.ten }]}>Tên đầu điểm</Text>
            <Text style={[styles.cell, styles.headerCell, { width: DD_COLS.thang }]}>Thang điểm</Text>
            <Text style={[styles.cell, styles.headerCell, { width: DD_COLS.ketQua }]}>Kết quả</Text>
            <Text style={[styles.cell, styles.headerCell, { width: DD_COLS.ghiChu }]}>Ghi chú</Text>
          </View>
          {dauDiemList.length === 0 ? (
            <View style={[styles.row, { paddingVertical: 16 }]}>
              <Text style={[styles.cell, { width: DD_COLS.stt + DD_COLS.ten + DD_COLS.thang + DD_COLS.ketQua + DD_COLS.ghiChu, textAlign: 'center', color: '#9CA3AF' }]}>
                Chưa có dữ liệu
              </Text>
            </View>
          ) : (
            dauDiemList.map((dd, idx) => (
              <View key={`${dd.ID}_${idx}`} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
                <Text style={[styles.cell, styles.cellCenter, { width: DD_COLS.stt }]}>{idx + 1}</Text>
                <Text style={[styles.cell, { width: DD_COLS.ten }]} numberOfLines={2}>
                  {dd.DIEM_THANHPHANDIEM_TEN}
                </Text>
                <Text style={[styles.cell, { width: DD_COLS.thang }]}>{dd.THANGDIEM_TEN || '-'}</Text>
                <Text style={[styles.cell, styles.cellCenter, { width: DD_COLS.ketQua }]}>-</Text>
                <Text style={[styles.cell, { width: DD_COLS.ghiChu }]} numberOfLines={2}>
                  {dd.GHICHU || '-'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.infoBox}>
        <MaterialIcons name="info-outline" size={20} color="#1E40AF" />
        <Text style={styles.infoText}>
          Tab này chỉ xem thông tin. Để đăng ký công nhận điểm từ chứng chỉ (nhập kết quả, upload minh chứng), vui lòng dùng web {' '}
          <Text style={{ fontWeight: '700' }}>qldt.eaut.edu.vn</Text>.
        </Text>
      </View>
    </ScrollView>
  );

  const dropdownData =
    activeDropdown === 'loai'
      ? loaiList.map<DropdownItem>((it) => ({ ID: it.ID, label: it.TEN }))
      : activeDropdown === 'ten'
      ? tenList.map<DropdownItem>((it) => ({ ID: it.ID, label: it.TEN }))
      : activeDropdown === 'capdo'
      ? capDoList.map<DropdownItem>((it) => ({ ID: it.ID, label: it.TEN }))
      : [];

  const handleDropdownSelect = (item: DropdownItem) => {
    if (activeDropdown === 'loai') {
      const found = loaiList.find((x) => x.ID === item.ID);
      if (found) onSelectLoai(found);
    } else if (activeDropdown === 'ten') {
      const found = tenList.find((x) => x.ID === item.ID);
      if (found) onSelectTen(found);
    } else if (activeDropdown === 'capdo') {
      const found = capDoList.find((x) => x.ID === item.ID);
      if (found) onSelectCapDo(found);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký công nhận điểm</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'bangdiem' && styles.tabBtnActive]}
          onPress={() => setTab('bangdiem')}
        >
          <Text style={[styles.tabText, tab === 'bangdiem' && styles.tabTextActive]}>
            Từ bảng điểm
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'chungchi' && styles.tabBtnActive]}
          onPress={() => setTab('chungchi')}
        >
          <Text style={[styles.tabText, tab === 'chungchi' && styles.tabTextActive]}>
            Từ chứng chỉ
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'bangdiem' ? renderTab1() : renderTab2()}

      {/* Modal: Kế hoạch dropdown */}
      <Modal
        visible={showKHDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKHDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowKHDropdown(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn kế hoạch công nhận</Text>
            <FlatList
              data={keHoachOptions}
              keyExtractor={(it, idx) => it.ID || `all_${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectKeHoach(item)}>
                  <Text style={styles.modalItemText}>{formatKeHoachLabel(item)}</Text>
                  {selectedKeHoach.ID === item.ID && (
                    <MaterialIcons name="check" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Đăng ký công nhận từ bảng điểm */}
      <Modal
        visible={bangDiemModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBangDiemModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.bangDiemSheet}>
            <View style={styles.bangDiemHeader}>
              <Text style={styles.bangDiemTitle}>Đăng ký công nhận từ bảng điểm</Text>
              <TouchableOpacity onPress={() => setBangDiemModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.bangDiemBody}>
              <Text style={styles.bangDiemDesc}>
                Chọn danh sách các học phần sử dụng để công nhận điểm cho học phần{' '}
                <Text style={styles.bangDiemHocPhanName}>
                  {bangDiemHocPhan?.DAOTAO_HOCPHAN_TEN || ''}
                </Text>
              </Text>

              {/* Existing entries */}
              <Text style={styles.sectionTitle}>Học phần đã thêm</Text>
              {bangDiemLoading ? (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 12 }} />
              ) : bangDiemEntries.length === 0 ? (
                <Text style={styles.emptyInline}>Chưa có học phần nào</Text>
              ) : (
                bangDiemEntries.map((e, idx) => (
                  <View key={e.ID} style={styles.entryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryName}>
                        {idx + 1}. {e.TENHOCPHAN}
                      </Text>
                      <Text style={styles.entryMeta}>
                        Tín chỉ: {e.SOTINCHI} · Điểm: {e.DIEM}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteBangDiemRow(e)}
                      style={styles.entryDeleteBtn}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Add new row */}
              <Text style={styles.sectionTitle}>Thêm dòng mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên học phần"
                placeholderTextColor="#9CA3AF"
                value={newRowTen}
                onChangeText={setNewRowTen}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Số tín chỉ"
                  placeholderTextColor="#9CA3AF"
                  value={newRowTinChi}
                  onChangeText={setNewRowTinChi}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Điểm"
                  placeholderTextColor="#9CA3AF"
                  value={newRowDiem}
                  onChangeText={setNewRowDiem}
                  keyboardType="decimal-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.addRowBtn}
                onPress={handleAddBangDiemRow}
                disabled={bangDiemSaving}
              >
                {bangDiemSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addRowBtnText}>Thêm dòng</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Note */}
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#1E40AF" />
                <Text style={styles.infoText}>
                  Để upload minh chứng (file bảng điểm gốc) và xác nhận đồng ý quy đổi,
                  vui lòng dùng web qldt.eaut.edu.vn.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.bangDiemFooter}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setBangDiemModalOpen(false)}
              >
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Tab 2 dropdowns */}
      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {activeDropdown === 'loai'
                ? 'Chọn phân loại chứng chỉ'
                : activeDropdown === 'ten'
                ? 'Chọn tên chứng chỉ'
                : 'Chọn cấp độ'}
            </Text>
            <FlatList
              data={dropdownData}
              keyExtractor={(it) => it.ID}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleDropdownSelect(item)}>
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

  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#F97316' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#F97316' },

  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  filterLabel: { fontSize: 13, color: '#4B5563', marginRight: 10, fontWeight: '600', width: 90 },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  dropdownReadonly: { backgroundColor: '#F3F4F6' },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { flex: 1, fontSize: 13, color: '#111827' },

  body: { flex: 1, padding: 12 },
  tab2Content: { padding: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginTop: 8, marginBottom: 8 },

  inlineLoading: { alignItems: 'center', paddingVertical: 8 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, color: '#6B7280', fontSize: 14, textAlign: 'center' },

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

  row: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center' },
  rowAlt: { backgroundColor: '#F9FAFB' },
  headerRow: { backgroundColor: '#EFF6FF', borderBottomColor: '#BFDBFE' },
  cell: { paddingHorizontal: 10, paddingVertical: 12, fontSize: 13, color: '#111827' },
  cellCenter: { textAlign: 'center' },
  headerCell: { fontWeight: '700', color: '#1E40AF', fontSize: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#3B82F6', borderRadius: 6 },
  actionBtnText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4 },
  modalItemText: { flex: 1, fontSize: 14, color: '#111827' },
  modalSeparator: { height: 1, backgroundColor: '#E5E7EB' },

  // BangDiem modal
  bangDiemSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    marginTop: 'auto',
  },
  bangDiemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bangDiemTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  bangDiemBody: { padding: 16, paddingBottom: 24 },
  bangDiemDesc: { fontSize: 13, color: '#4B5563', marginBottom: 16, lineHeight: 18 },
  bangDiemHocPhanName: { fontWeight: '700', color: '#1E40AF' },
  emptyInline: {
    paddingVertical: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  entryName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  entryMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  entryDeleteBtn: { padding: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
  },
  inputRow: { flexDirection: 'row' },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  addRowBtnText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },
  bangDiemFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeBtn: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontWeight: '700' },
});

export default GradeRecognitionScreen;
