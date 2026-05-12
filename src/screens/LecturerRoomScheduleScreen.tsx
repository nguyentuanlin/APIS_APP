// TKB - Phòng học - Đăng ký mượn phòng (CCB.TKHNPH)
// Port `lichgiangphonghoc.html` + `.js`. Toolbar 4 nút:
//  - Danh sách: refresh lịch phòng cho tuần đang xem
//  - Đăng ký sử dụng phòng: form đăng ký + nút kiểm tra trùng + gửi
//  - Duyệt đăng ký: list đăng ký theo ngày + chọn tình trạng + lưu duyệt
//  - Kết quả cá nhân: list đăng ký do mình tạo
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput,
  FlatList,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerRoomScheduleService as svc,
  PhongHocItem,
  LichPhongItem,
  DangKyPhongItem,
  TrangThaiDuyetItem,
  pickField,
} from '../services/lecturerRoomScheduleService';
import { lecturerScheduleService as schedSvc } from '../services/lecturerScheduleService';

const VN_THU_LABEL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_THU_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad2 = (n: number | string) => {
  const s = String(n ?? '');
  return s.length < 2 ? '0' + s : s;
};
const fmtDate = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateShort = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

const COLOR_PALETTE = ['#1E40AF', '#10b981', '#f59e0b', '#dc2626', '#9333ea', '#0ea5e9'];

// Picker phòng học có thanh tìm kiếm — dùng chung cho toolbar / form đăng ký / duyệt
const PhongHocPickerSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  data: PhongHocItem[];
  selectedId: string;
  onSelect: (item: PhongHocItem) => void;
  showAllOption?: boolean;
  title?: string;
}> = ({ visible, onClose, data, selectedId, onSelect, showAllOption, title }) => {
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (visible) setKeyword('');
  }, [visible]);

  const filtered = useMemo(() => {
    const items = showAllOption
      ? [{ ID: '', TEN: 'Tất cả phòng học' } as PhongHocItem, ...data]
      : data;
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) => {
      // Luôn giữ option "Tất cả phòng học"
      if (it.ID === '' && showAllOption) return true;
      const ten = (it.TEN || '').toLowerCase();
      const ma = (it.MA || '').toLowerCase();
      return ten.includes(kw) || ma.includes(kw);
    });
  }, [data, keyword, showAllOption]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        {/* TouchableWithoutFeedback wrapper để tap vào sheet không đóng modal */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.pickerSheet}>
          <Text style={styles.pickerSheetTitle}>{title || 'Chọn phòng học'}</Text>
          <View style={styles.pickerSearchWrap}>
            <MaterialIcons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Tìm theo mã / tên phòng..."
              placeholderTextColor="#94A3B8"
              value={keyword}
              onChangeText={setKeyword}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialIcons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item.ID}_${idx}_p`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.ID === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, active && styles.pickerItemActive]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>
                    {item.TEN}
                  </Text>
                  {active && <MaterialIcons name="check" size={20} color="#1E3A8A" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={styles.muted}>Không tìm thấy phòng phù hợp</Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const LecturerRoomScheduleScreen = () => {
  const navigation = useNavigation();
  const [weekOffset, setWeekOffset] = useState(0);

  const [phongList, setPhongList] = useState<PhongHocItem[]>([]);
  const [phongId, setPhongId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingLich, setLoadingLich] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<LichPhongItem[]>([]);
  const [activeItem, setActiveItem] = useState<LichPhongItem | null>(null);

  // Modal Đăng ký
  const [dkOpen, setDkOpen] = useState(false);
  const [dkPhongId, setDkPhongId] = useState('');
  const [dkNgay, setDkNgay] = useState(fmtDate(new Date()));
  const [dkGioBD, setDkGioBD] = useState('');
  const [dkPhutBD, setDkPhutBD] = useState('');
  const [dkGioKT, setDkGioKT] = useState('');
  const [dkPhutKT, setDkPhutKT] = useState('');
  const [dkMucDich, setDkMucDich] = useState('');
  const [dkSubmitting, setDkSubmitting] = useState(false);
  const [dkChecking, setDkChecking] = useState(false);
  const [dkPhongPickerOpen, setDkPhongPickerOpen] = useState(false);

  // Modal Kết quả cá nhân
  const [kqOpen, setKqOpen] = useState(false);
  const [kqList, setKqList] = useState<DangKyPhongItem[]>([]);
  const [loadingKq, setLoadingKq] = useState(false);

  // Modal Duyệt
  const [duyetOpen, setDuyetOpen] = useState(false);
  const [duyetList, setDuyetList] = useState<DangKyPhongItem[]>([]);
  const [duyetNgay, setDuyetNgay] = useState(fmtDate(new Date()));
  const [loadingDuyet, setLoadingDuyet] = useState(false);
  // Phòng cho màn duyệt — rỗng = tất cả phòng
  const [duyetPhongId, setDuyetPhongId] = useState('');
  const [duyetPhongPickerOpen, setDuyetPhongPickerOpen] = useState(false);
  // DS ngày có đăng ký trong tháng đang xem (cho calendar strip)
  const [duyetNgayCoDangKy, setDuyetNgayCoDangKy] = useState<string[]>([]);
  // DS trạng thái xác nhận khả dụng (ID động từ backend)
  const [trangThaiList, setTrangThaiList] = useState<TrangThaiDuyetItem[]>([]);
  // Multi-select các bản ghi cần duyệt
  const [duyetSelectedIds, setDuyetSelectedIds] = useState<Set<string>>(new Set());
  // Bottom sheet chọn TrangThai để duyệt hàng loạt
  const [trangThaiPickerOpen, setTrangThaiPickerOpen] = useState(false);
  const [duyetNoiDung, setDuyetNoiDung] = useState('');
  const [submittingDuyet, setSubmittingDuyet] = useState(false);

  const weekRange = useMemo(() => schedSvc.getWeekRange(weekOffset), [weekOffset]);
  const days = useMemo(() => schedSvc.getDaysOfWeek(weekRange.start), [weekRange.start]);
  const selectedPhong = useMemo(
    () => phongList.find((p) => p.ID === phongId),
    [phongList, phongId]
  );

  // Init: load DS phòng
  useEffect(() => {
    (async () => {
      try {
        const list = await svc.getPhongHocList();
        setPhongList(list);
        if (list.length > 0) setPhongId(list[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được danh sách phòng học');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // Load lịch khi đã có phòng + tuần thay đổi
  const loadLich = useCallback(async () => {
    if (!phongId) return;
    try {
      const data = await svc.getLichPhong(phongId, weekRange.startStr, weekRange.endStr);
      setItems(data || []);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được lịch phòng');
      setItems([]);
    } finally {
      setLoadingLich(false);
      setRefreshing(false);
    }
  }, [phongId, weekRange.startStr, weekRange.endStr]);

  useEffect(() => {
    if (phongId) {
      setLoadingLich(true);
      loadLich();
    }
  }, [loadLich, phongId]);

  const sections = useMemo(() => {
    const byDay: Record<string, LichPhongItem[]> = {};
    items.forEach((it) => {
      const key = it.NGAYHOC;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(it);
    });
    Object.keys(byDay).forEach((k) => {
      byDay[k].sort(
        (a, b) =>
          (a.GIOBATDAU as number) * 60 +
          (a.PHUTBATDAU as number) -
          ((b.GIOBATDAU as number) * 60 + (b.PHUTBATDAU as number))
      );
    });
    return days.map((d) => {
      const key = fmtDate(d);
      const isToday = key === fmtDate(new Date());
      return {
        date: d,
        thuLabel: VN_THU_LABEL[d.getDay()],
        isToday,
        data: byDay[key] || [],
      };
    });
  }, [items, days]);

  // === Đăng ký ===
  const openDangKy = () => {
    if (!phongId) {
      Alert.alert('Thông báo', 'Chưa có phòng học.');
      return;
    }
    setDkPhongId(phongId);
    setDkNgay(fmtDate(new Date()));
    setDkGioBD('');
    setDkPhutBD('');
    setDkGioKT('');
    setDkPhutKT('');
    setDkMucDich('');
    setDkOpen(true);
  };

  const validateDangKy = (): boolean => {
    if (!dkPhongId) {
      Alert.alert('Thông báo', 'Chọn phòng học.');
      return false;
    }
    if (!dkNgay.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      Alert.alert('Thông báo', 'Ngày sử dụng phải dạng dd/mm/yyyy.');
      return false;
    }
    if (!dkGioBD || !dkPhutBD || !dkGioKT || !dkPhutKT) {
      Alert.alert('Thông báo', 'Nhập đầy đủ giờ bắt đầu / kết thúc.');
      return false;
    }
    return true;
  };

  const doKiemTra = async () => {
    if (!validateDangKy()) return;
    setDkChecking(true);
    try {
      await svc.kiemTraTrungLich({
        phongHocId: dkPhongId,
        ngaySuDung: dkNgay,
        gioBatDau: dkGioBD,
        phutBatDau: dkPhutBD,
        gioKetThuc: dkGioKT,
        phutKetThuc: dkPhutKT,
        mucDich: dkMucDich,
      });
      Alert.alert('Kết quả', 'Dữ liệu kiểm tra hợp lệ — không trùng lịch.');
    } catch (e: any) {
      Alert.alert('Trùng lịch / Lỗi', e?.message || 'Có lịch trùng');
    } finally {
      setDkChecking(false);
    }
  };

  const doDangKy = async () => {
    if (!validateDangKy()) return;
    setDkSubmitting(true);
    try {
      const res = await svc.dangKyPhong({
        phongHocId: dkPhongId,
        ngaySuDung: dkNgay,
        gioBatDau: dkGioBD,
        phutBatDau: dkPhutBD,
        gioKetThuc: dkGioKT,
        phutKetThuc: dkPhutKT,
        mucDich: dkMucDich,
      });
      Alert.alert(
        'Thành công',
        res.Id ? `Gửi yêu cầu thành công (ID: ${res.Id})` : 'Gửi yêu cầu thành công',
        [
          {
            text: 'OK',
            onPress: () => {
              setDkOpen(false);
              loadLich();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Đăng ký thất bại');
    } finally {
      setDkSubmitting(false);
    }
  };

  // === Kết quả cá nhân ===
  const openKetQua = async () => {
    setKqOpen(true);
    setKqList([]);
    setLoadingKq(true);
    try {
      const list = await svc.getKetQuaCaNhan();
      setKqList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được kết quả');
    } finally {
      setLoadingKq(false);
    }
  };

  // === Duyệt đăng ký ===
  // Helper: lấy ID bản ghi (sản phẩm) từ row đăng ký
  const getSanPhamId = (row: DangKyPhongItem): string =>
    pickField(
      row,
      'TKB_DANGKY_PHONG_THOIGIAN_ID',
      'TKB_DK_PHONG_THOIGIAN_ID',
      'TKB_DANGKY_PHONG_ID',
      'TKB_DK_PHONG_ID',
      'TKB_DK_P_TG_ID',
      'TKB_DANGKY_PHONG_TG_ID',
      'ID'
    );

  const openDuyet = async () => {
    const today = fmtDate(new Date());
    setDuyetOpen(true);
    setDuyetNgay(today);
    setDuyetPhongId('');
    setDuyetSelectedIds(new Set());
    setDuyetNoiDung('');
    // Load song song: trạng thái xác nhận + ngày có đăng ký + đăng ký theo ngày hôm nay
    try {
      const [tt, ngayCo] = await Promise.all([
        trangThaiList.length === 0 ? svc.getTrangThaiDuyet() : Promise.resolve(trangThaiList),
        svc.getNgayCoDangKy({ ngayThamChieu: today }),
      ]);
      if (tt && tt.length > 0) setTrangThaiList(tt);
      setDuyetNgayCoDangKy(ngayCo);
    } catch (e: any) {
      console.warn('[Duyet] init load:', e?.message);
    }
    await loadDuyetList(today, '');
  };

  const loadDuyetList = async (ngay: string, phong: string) => {
    setLoadingDuyet(true);
    setDuyetSelectedIds(new Set());
    try {
      const list = await svc.getDangKyList({
        ngaySuDung: ngay,
        phongHocId: phong || undefined,
      });
      setDuyetList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách đăng ký');
    } finally {
      setLoadingDuyet(false);
    }
  };

  // Reload "ngày có đăng ký" khi đổi phòng (chuỗi rỗng → tất cả)
  const reloadNgayCoDangKy = async (phong: string) => {
    try {
      const list = await svc.getNgayCoDangKy({
        ngayThamChieu: duyetNgay,
        phongHocId: phong || undefined,
      });
      setDuyetNgayCoDangKy(list);
    } catch (e: any) {
      console.warn('[Duyet] reload ngay:', e?.message);
    }
  };

  const toggleDuyetSelect = (row: DangKyPhongItem) => {
    const id = getSanPhamId(row);
    if (!id) return;
    setDuyetSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDuyetSelectAll = () => {
    if (duyetSelectedIds.size === duyetList.length && duyetList.length > 0) {
      setDuyetSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      duyetList.forEach((r) => {
        const id = getSanPhamId(r);
        if (id) next.add(id);
      });
      setDuyetSelectedIds(next);
    }
  };

  // Bulk duyệt: chọn 1 trạng thái → loop save_DuyetDangKy
  const submitBulkDuyet = async (trangThaiId: string) => {
    if (duyetSelectedIds.size === 0) {
      Alert.alert('Thông báo', 'Chưa chọn bản ghi nào');
      return;
    }
    setSubmittingDuyet(true);
    const ids = Array.from(duyetSelectedIds);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await svc.duyetDangKy({ sanPhamId: id, tinhTrangId: trangThaiId, noiDung: duyetNoiDung });
        ok++;
      } catch (e) {
        failed++;
      }
    }
    setSubmittingDuyet(false);
    setTrangThaiPickerOpen(false);
    Alert.alert(
      'Kết quả',
      `Duyệt thành công: ${ok}/${ids.length}` + (failed ? `\nThất bại: ${failed}` : ''),
      [{ text: 'OK', onPress: () => loadDuyetList(duyetNgay, duyetPhongId) }]
    );
  };

  const renderLichItem = ({ item, index }: { item: LichPhongItem; index: number }) => {
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const time = `${pad2(item.GIOBATDAU)}:${pad2(item.PHUTBATDAU)} - ${pad2(item.GIOKETTHUC)}:${pad2(item.PHUTKETTHUC)}`;
    const tiet =
      item.TIETBATDAU != null && item.TIETKETTHUC != null
        ? `Tiết ${item.TIETBATDAU}-${item.TIETKETTHUC}`
        : '';
    const title = item.TENHOCPHAN || item.MUCDICHSUDUNG || '(Không tên)';
    const sub = item.TENLOPHOCPHAN || item.NGUOIDANGKY_TENDAYDU || '';
    return (
      <TouchableOpacity
        style={styles.lichCard}
        onPress={() => setActiveItem(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.lichStrip, { backgroundColor: color }]} />
        <View style={styles.lichBody}>
          <Text style={styles.lichTitle} numberOfLines={2}>
            {title}
          </Text>
          {!!sub && (
            <Text style={styles.lichLop} numberOfLines={1}>
              {sub}
            </Text>
          )}
          <View style={styles.lichMetaRow}>
            <MaterialIcons name="access-time" size={13} color="#64748B" />
            <Text style={styles.lichMeta}>
              {time}
              {tiet ? ` · ${tiet}` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={[styles.dayHeader, section.isToday && styles.dayHeaderToday]}>
      <View style={[styles.dayBadge, section.isToday && styles.dayBadgeToday]}>
        <Text style={[styles.dayBadgeText, section.isToday && styles.dayBadgeTextToday]}>
          {VN_THU_SHORT[section.date.getDay()]}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dayTitle, section.isToday && styles.dayTitleToday]}>
          {section.thuLabel}, {fmtDateShort(section.date)}
        </Text>
        <Text style={styles.dayCount}>
          {section.data.length === 0 ? 'Không có buổi' : `${section.data.length} buổi`}
        </Text>
      </View>
      {section.isToday && (
        <View style={styles.todayPill}>
          <Text style={styles.todayPillText}>HÔM NAY</Text>
        </View>
      )}
    </View>
  );

  const renderKqRow = (item: DangKyPhongItem, index: number) => {
    const phong = pickField(item, 'PHONGDANGKY', 'TKB_PHONG_TEN', 'TENPHONGHOC');
    const ngay = pickField(item, 'NGAYSUDUNG', 'NGAYSUDUNG_HIENTHI');
    const gioBD = pickField(item, 'GIOPHUTBATDAU');
    const gioKT = pickField(item, 'GIOPHUTKETTHUC');
    const gioBdRaw = `${pad2(pickField(item, 'GIOBATDAU') || '0')}:${pad2(pickField(item, 'PHUTBATDAU') || '0')}`;
    const gioKtRaw = `${pad2(pickField(item, 'GIOKETTHUC') || '0')}:${pad2(pickField(item, 'PHUTKETTHUC') || '0')}`;
    const mucDich = pickField(item, 'MUCDICHSUDUNG', 'MUCDICH', 'MOTA', 'GHICHU');
    const trangThai = pickField(
      item,
      'TINHTRANG_DUYET_TEN',
      'TINHTRANGDUYET_TEN',
      'TRANGTHAIDUYET_TEN',
      'TINHTRANG_TEN',
      'TRANGTHAI_TEN',
      'KETQUAXULY'
    );
    return (
      <View key={index} style={styles.kqRow}>
        <Text style={styles.kqIndex}>{index + 1}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.kqPhong}>{phong || '(Phòng không xác định)'}</Text>
          <Text style={styles.kqMeta}>
            {ngay} · {gioBD || gioBdRaw} - {gioKT || gioKtRaw}
          </Text>
          {!!mucDich && (
            <Text style={styles.kqMucDich} numberOfLines={2}>
              {mucDich}
            </Text>
          )}
        </View>
        {!!trangThai && (
          <View style={styles.kqStatus}>
            <Text style={styles.kqStatusText}>{trangThai}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Lịch phòng học</Text>
          <Text style={styles.headerSubtitle}>Đăng ký mượn phòng</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải danh sách phòng...</Text>
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarLabel}>Phòng học</Text>
            <TouchableOpacity
              style={styles.phongPicker}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.phongPickerText} numberOfLines={1}>
                {selectedPhong?.TEN || 'Chọn phòng học'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>
            <View style={styles.btnGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSearch]}
                onPress={() => {
                  setLoadingLich(true);
                  loadLich();
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="search" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Danh sách</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnRegister]}
                onPress={openDangKy}
                activeOpacity={0.85}
              >
                <MaterialIcons name="edit" size={14} color="#1E3A8A" />
                <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>Đăng ký</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnApprove]}
                onPress={openDuyet}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check-circle" size={14} color="#10B981" />
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnMine]}
                onPress={openKetQua}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person" size={14} color="#1E3A8A" />
                <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>Của tôi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Week navigation */}
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset((w) => w - 1)}>
              <MaterialIcons name="chevron-left" size={24} color="#1E3A8A" />
            </TouchableOpacity>
            <View style={styles.weekNavCenter}>
              <Text style={styles.weekNavLabel}>
                {weekOffset === 0
                  ? 'Tuần này'
                  : weekOffset === -1
                  ? 'Tuần trước'
                  : weekOffset === 1
                  ? 'Tuần sau'
                  : weekOffset > 0
                  ? `+${weekOffset} tuần`
                  : `${weekOffset} tuần`}
              </Text>
              <Text style={styles.weekNavRange}>
                {fmtDateShort(weekRange.start)} – {fmtDateShort(weekRange.end)} ({items.length} buổi)
              </Text>
            </View>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset((w) => w + 1)}>
              <MaterialIcons name="chevron-right" size={24} color="#1E3A8A" />
            </TouchableOpacity>
            {weekOffset !== 0 && (
              <TouchableOpacity style={styles.weekNavToday} onPress={() => setWeekOffset(0)}>
                <MaterialIcons name="today" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {loadingLich ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải lịch...</Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item, i) => item.ID || `${i}`}
              renderItem={renderLichItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled
              contentContainerStyle={{ paddingBottom: 32 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadLich();
                  }}
                />
              }
            />
          )}
        </>
      )}

      {/* Picker phòng (toolbar) */}
      <PhongHocPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        data={phongList}
        selectedId={phongId}
        onSelect={(item) => {
          setPhongId(item.ID);
          setPickerOpen(false);
        }}
      />

      {/* Modal chi tiết buổi học */}
      <Modal
        visible={!!activeItem}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveItem(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {activeItem?.TENHOCPHAN || activeItem?.MUCDICHSUDUNG || 'Chi tiết'}
              </Text>
              <TouchableOpacity onPress={() => setActiveItem(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {!!activeItem && (
              <View style={{ paddingHorizontal: 4 }}>
                <Row label="Lớp HP" value={activeItem.TENLOPHOCPHAN} />
                <Row label="Phòng" value={activeItem.TENPHONGHOC} />
                <Row label="Ngày" value={activeItem.NGAYHOC} />
                <Row
                  label="Thời gian"
                  value={`${pad2(activeItem.GIOBATDAU)}:${pad2(activeItem.PHUTBATDAU)} - ${pad2(
                    activeItem.GIOKETTHUC
                  )}:${pad2(activeItem.PHUTKETTHUC)}`}
                />
                {activeItem.TIETBATDAU != null && activeItem.TIETKETTHUC != null && (
                  <Row
                    label="Tiết"
                    value={`${activeItem.TIETBATDAU} - ${activeItem.TIETKETTHUC}`}
                  />
                )}
                <Row label="Mục đích" value={activeItem.MUCDICHSUDUNG} />
                <Row label="Người ĐK" value={activeItem.NGUOIDANGKY_TENDAYDU} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Đăng ký sử dụng phòng */}
      <Modal
        visible={dkOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDkOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Đăng ký sử dụng phòng</Text>
              <TouchableOpacity onPress={() => setDkOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={styles.formLabel}>Phòng học</Text>
              <TouchableOpacity
                style={styles.phongPicker}
                onPress={() => setDkPhongPickerOpen(true)}
              >
                <Text style={styles.phongPickerText} numberOfLines={1}>
                  {phongList.find((p) => p.ID === dkPhongId)?.TEN || 'Chọn phòng'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.formLabel}>Ngày sử dụng</Text>
              <TextInput
                style={styles.formInput}
                value={dkNgay}
                onChangeText={setDkNgay}
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Giờ BĐ</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[styles.formInput, styles.timeInput]}
                      value={dkGioBD}
                      onChangeText={setDkGioBD}
                      placeholder="HH"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeColon}>:</Text>
                    <TextInput
                      style={[styles.formInput, styles.timeInput]}
                      value={dkPhutBD}
                      onChangeText={setDkPhutBD}
                      placeholder="mm"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Giờ KT</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[styles.formInput, styles.timeInput]}
                      value={dkGioKT}
                      onChangeText={setDkGioKT}
                      placeholder="HH"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeColon}>:</Text>
                    <TextInput
                      style={[styles.formInput, styles.timeInput]}
                      value={dkPhutKT}
                      onChangeText={setDkPhutKT}
                      placeholder="mm"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.formLabel}>Mục đích sử dụng</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={dkMucDich}
                onChangeText={setDkMucDich}
                multiline
                placeholder="Mô tả mục đích..."
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.btnCheckTrung]}
                onPress={doKiemTra}
                disabled={dkChecking || dkSubmitting}
              >
                {dkChecking ? (
                  <ActivityIndicator color="#1E3A8A" size="small" />
                ) : (
                  <Text style={styles.sheetBtnCheckText}>Kiểm tra trùng</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.btnDangKySubmit]}
                onPress={doDangKy}
                disabled={dkChecking || dkSubmitting}
              >
                {dkSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sheetBtnPrimaryText}>Gửi yêu cầu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Picker phòng cho form đăng ký */}
      <PhongHocPickerSheet
        visible={dkPhongPickerOpen}
        onClose={() => setDkPhongPickerOpen(false)}
        data={phongList}
        selectedId={dkPhongId}
        onSelect={(item) => {
          setDkPhongId(item.ID);
          setDkPhongPickerOpen(false);
        }}
      />

      {/* Modal Kết quả cá nhân */}
      <Modal
        visible={kqOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setKqOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Đăng ký của tôi</Text>
              <TouchableOpacity onPress={() => setKqOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {loadingKq ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 500 }}>
                {kqList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Chưa có đăng ký nào</Text>
                  </View>
                ) : (
                  kqList.map((it, idx) => renderKqRow(it, idx))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Duyệt đăng ký */}
      <Modal
        visible={duyetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDuyetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { maxHeight: '95%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Duyệt đăng ký</Text>
              <TouchableOpacity onPress={() => setDuyetOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Phòng học picker */}
            <Text style={styles.formLabel}>Phòng học</Text>
            <TouchableOpacity
              style={styles.phongPicker}
              onPress={() => setDuyetPhongPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.phongPickerText} numberOfLines={1}>
                {phongList.find((p) => p.ID === duyetPhongId)?.TEN || 'Tất cả phòng học'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            {/* Ngày đang chọn */}
            <Text style={[styles.formLabel, { marginTop: 12 }]}>
              Ngày: <Text style={{ color: '#1E3A8A' }}>{duyetNgay}</Text>
            </Text>

            {/* Strip ngày có đăng ký (như calendar) */}
            {duyetNgayCoDangKy.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
                {duyetNgayCoDangKy.map((ngay) => {
                  const active = ngay === duyetNgay;
                  return (
                    <TouchableOpacity
                      key={ngay}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => {
                        setDuyetNgay(ngay);
                        loadDuyetList(ngay, duyetPhongId);
                      }}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {ngay.substring(0, 5)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.formMeta}>Không có ngày nào có đăng ký</Text>
            )}

            {/* Select all + count */}
            {duyetList.length > 0 && (
              <View style={styles.selectAllRow}>
                <TouchableOpacity style={styles.selectAllBtn} onPress={toggleDuyetSelectAll}>
                  <View
                    style={[
                      styles.checkbox,
                      duyetSelectedIds.size === duyetList.length && styles.checkboxChecked,
                    ]}
                  >
                    {duyetSelectedIds.size === duyetList.length && (
                      <MaterialIcons name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.selectAllText}>
                    Chọn tất cả ({duyetSelectedIds.size}/{duyetList.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {loadingDuyet ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360, marginTop: 6 }}>
                {duyetList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Không có đăng ký cho ngày này</Text>
                  </View>
                ) : (
                  duyetList.map((it, idx) => {
                    const id = getSanPhamId(it);
                    const checked = id && duyetSelectedIds.has(id);
                    return (
                      <TouchableOpacity
                        key={`${id}_${idx}`}
                        style={[styles.duyetRow, checked && styles.duyetRowChecked]}
                        onPress={() => toggleDuyetSelect(it)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <MaterialIcons name="check" size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1 }}>{renderKqRow(it, idx)}</View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Footer: Duyệt button */}
            {duyetList.length > 0 && (
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.btnDangKySubmit]}
                  disabled={duyetSelectedIds.size === 0}
                  onPress={() => {
                    if (trangThaiList.length === 0) {
                      Alert.alert('Lỗi', 'Chưa tải được danh sách trạng thái xác nhận.');
                      return;
                    }
                    setTrangThaiPickerOpen(true);
                  }}
                >
                  <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={[styles.sheetBtnPrimaryText, { marginLeft: 6 }]}>
                    Duyệt {duyetSelectedIds.size} đã chọn
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Picker phòng cho màn duyệt */}
      <PhongHocPickerSheet
        visible={duyetPhongPickerOpen}
        onClose={() => setDuyetPhongPickerOpen(false)}
        data={phongList}
        selectedId={duyetPhongId}
        showAllOption
        onSelect={(item) => {
          setDuyetPhongId(item.ID);
          setDuyetPhongPickerOpen(false);
          reloadNgayCoDangKy(item.ID);
          loadDuyetList(duyetNgay, item.ID);
        }}
      />

      {/* Modal chọn trạng thái duyệt (bulk) */}
      <Modal
        visible={trangThaiPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTrangThaiPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerSheet, { paddingHorizontal: 16, paddingBottom: 16 }]}>
            <Text style={styles.pickerSheetTitle}>
              Chọn trạng thái duyệt ({duyetSelectedIds.size} bản ghi)
            </Text>
            <Text style={[styles.formLabel, { marginTop: 10 }]}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={duyetNoiDung}
              onChangeText={setDuyetNoiDung}
              multiline
              placeholder="Ghi chú thêm..."
              placeholderTextColor="#94A3B8"
            />
            <Text style={[styles.formLabel, { marginTop: 12 }]}>Tình trạng</Text>
            {submittingDuyet ? (
              <View style={[styles.centerBox, { paddingVertical: 30 }]}>
                <ActivityIndicator color="#1E3A8A" />
                <Text style={styles.muted}>Đang duyệt...</Text>
              </View>
            ) : (
              <View style={{ marginTop: 6 }}>
                {trangThaiList.map((tt, idx) => {
                  const palette = ['#10B981', '#dc2626', '#f59e0b', '#0ea5e9', '#9333ea'];
                  const bg = palette[idx % palette.length];
                  return (
                    <TouchableOpacity
                      key={tt.ID}
                      style={[styles.tinhTrangBtn, { backgroundColor: bg }]}
                      onPress={() => submitBulkDuyet(tt.ID)}
                    >
                      <Text style={styles.tinhTrangBtnText}>{tt.TEN || tt.ID}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <TouchableOpacity
              style={[styles.sheetBtn, styles.btnCheckTrung, { marginTop: 12 }]}
              onPress={() => setTrangThaiPickerOpen(false)}
              disabled={submittingDuyet}
            >
              <Text style={styles.sheetBtnCheckText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value?: string | number }) => {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },

  toolbar: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  toolbarLabel: { fontSize: 12, color: '#475569', fontWeight: '700' },
  phongPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  phongPickerText: { flex: 1, color: '#0F172A', fontSize: 14 },

  btnGrid: { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  btnSearch: { backgroundColor: '#1E3A8A' },
  btnRegister: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  btnApprove: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#10B981' },
  btnMine: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    gap: 4,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
  },
  weekNavCenter: { flex: 1, alignItems: 'center' },
  weekNavLabel: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  weekNavRange: { fontSize: 11, color: '#64748B', marginTop: 2 },
  weekNavToday: {
    backgroundColor: '#10B981',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Day section
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    gap: 12,
  },
  dayHeaderToday: { backgroundColor: '#EFF6FF' },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  dayBadgeToday: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  dayBadgeText: { color: '#475569', fontWeight: '700', fontSize: 11 },
  dayBadgeTextToday: { color: '#FFFFFF' },
  dayTitle: { fontSize: 13, color: '#334155', fontWeight: '700' },
  dayTitleToday: { color: '#1E3A8A' },
  dayCount: { fontSize: 11, color: '#64748B', marginTop: 2 },
  todayPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Lich card
  lichCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  lichStrip: { width: 5 },
  lichBody: { flex: 1, padding: 12 },
  lichTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  lichLop: { fontSize: 12, color: '#1E3A8A', marginTop: 2, fontWeight: '600' },
  lichMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lichMeta: { fontSize: 12, color: '#64748B' },

  // Modal backdrop / picker
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '75%',
    paddingVertical: 8,
  },
  pickerSheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  pickerItemActive: { backgroundColor: '#EFF6FF' },
  pickerItemText: { fontSize: 14, color: '#0F172A', flex: 1 },
  pickerItemTextActive: { color: '#1E3A8A', fontWeight: '700' },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginRight: 12 },

  formLabel: { fontSize: 12, color: '#475569', fontWeight: '700', marginTop: 10, marginBottom: 6 },
  formMeta: { fontSize: 11, color: '#64748B', marginBottom: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 14,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: { flex: 1, textAlign: 'center' },
  timeColon: { fontSize: 18, fontWeight: '700', color: '#475569' },

  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCheckTrung: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  btnDangKySubmit: { backgroundColor: '#1E3A8A' },
  sheetBtnCheckText: { color: '#1E3A8A', fontWeight: '700' },
  sheetBtnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },

  // Chip
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipActiveReject: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  // Calendar strip cho Duyệt
  dayStrip: { marginTop: 8, marginBottom: 4, flexGrow: 0 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fdba74',
    marginRight: 6,
  },
  dayChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  dayChipText: { fontSize: 12, color: '#c2410c', fontWeight: '700' },
  dayChipTextActive: { color: '#FFFFFF' },

  // Select all + checkbox cho Duyệt
  selectAllRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },

  // Row trong list Duyệt (có checkbox bên trái)
  duyetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  duyetRowChecked: { backgroundColor: '#F0F7FF' },

  // Nút trạng thái duyệt (bulk)
  tinhTrangBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  tinhTrangBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },

  // KQ / Duyệt row
  kqRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kqIndex: { width: 22, textAlign: 'center', color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  kqPhong: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  kqMeta: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  kqMucDich: { fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' },
  kqStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    maxWidth: 100,
    alignSelf: 'flex-start',
  },
  kqStatusText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },

  detailRow: { flexDirection: 'row', paddingVertical: 6 },
  detailRowLabel: { width: 90, fontSize: 13, color: '#64748B', fontWeight: '600' },
  detailRowValue: { flex: 1, fontSize: 13, color: '#0F172A' },
});

export default LecturerRoomScheduleScreen;
