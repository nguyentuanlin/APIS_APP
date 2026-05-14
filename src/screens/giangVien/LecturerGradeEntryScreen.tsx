// Nhập điểm theo danh sách thi (CBB.NDDST) — port web `nhapdiemdst.html` + `.js`.
// Flow:
//   1. Chọn học kỳ → tải loại điểm, hình thức, đợt thi, môn thi
//   2. Chọn đợt thi + môn thi → "Tìm kiếm" tải danh sách thi (DSThi)
//   3. Tap 1 DSThi → mở modal danh sách sinh viên với ô nhập điểm + nút Lưu
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import {
  lecturerGradeEntryService as svc,
  ComboItem,
  DanhSachThiItem,
  NguoiHocItem,
  HanhDongXacNhanItem,
} from '../../services/giangVien/lecturerGradeEntryService';

const APP_ID_CONG_CAN_BO = 'B0B172E252D24251A5E650D38AC901A2';

// -------- Mini Picker (Modal-based dropdown) --------
interface PickerProps<T extends { ID: string }> {
  label: string;
  data: T[];
  selectedId: string;
  onChange: (id: string, item: T | null) => void;
  getDisplay: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
}
function Picker<T extends { ID: string }>({
  label,
  data,
  selectedId,
  onChange,
  getDisplay,
  placeholder = 'Chọn...',
  disabled,
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = data.find((d) => d.ID === selectedId);
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerField, disabled && styles.pickerDisabled]}
        onPress={() => !disabled && data.length > 0 && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerValue, !selected && styles.pickerPlaceholder]} numberOfLines={1}>
          {selected ? getDisplay(selected) : data.length === 0 ? '(chưa có dữ liệu)' : placeholder}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>{label}</Text>
            <FlatList
              data={data}
              keyExtractor={(item) => item.ID}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item.ID === selectedId && styles.pickerItemActive]}
                  onPress={() => {
                    onChange(item.ID, item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.ID === selectedId && styles.pickerItemTextActive]}>
                    {getDisplay(item)}
                  </Text>
                  {item.ID === selectedId && <MaterialIcons name="check" size={20} color="#1E3A8A" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// -------- Screen --------
const LecturerGradeEntryScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Filter combos
  const [thoiGianList, setThoiGianList] = useState<ComboItem[]>([]);
  const [loaiDiemList, setLoaiDiemList] = useState<ComboItem[]>([]);
  const [hinhThucList, setHinhThucList] = useState<ComboItem[]>([]);
  const [dotThiList, setDotThiList] = useState<ComboItem[]>([]);
  const [monThiList, setMonThiList] = useState<ComboItem[]>([]);

  const [thoiGianId, setThoiGianId] = useState('');
  const [loaiDiemId, setLoaiDiemId] = useState('');
  const [hinhThucId, setHinhThucId] = useState('');
  const [dotThiId, setDotThiId] = useState('');
  const [monThiId, setMonThiId] = useState('');

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingDSThi, setLoadingDSThi] = useState(false);
  const [dsThi, setDsThi] = useState<DanhSachThiItem[]>([]);

  // Modal nhập điểm
  const [activeDsThi, setActiveDsThi] = useState<DanhSachThiItem | null>(null);
  const [nguoiHocList, setNguoiHocList] = useState<NguoiHocItem[]>([]);
  const [diemMap, setDiemMap] = useState<Record<string, string>>({});
  const [loadingNguoiHoc, setLoadingNguoiHoc] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search + multi-select + xác nhận
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hanhDongList, setHanhDongList] = useState<HanhDongXacNhanItem[]>([]);
  const [hanhDongId, setHanhDongId] = useState('');
  const [confirming, setConfirming] = useState(false);

  // ----- Initial: tải học kỳ -----
  useEffect(() => {
    (async () => {
      try {
        const tg = await svc.getThoiGian();
        setThoiGianList(tg);
        if (tg.length > 0) {
          setThoiGianId(tg[0].ID); // selectFirst
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không lấy được học kỳ');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // ----- Khi đổi học kỳ → tải lại 4 combo phụ thuộc -----
  useEffect(() => {
    if (!thoiGianId) return;
    (async () => {
      try {
        const [ld, ht, dt, mt] = await Promise.all([
          svc.getLoaiDiem(thoiGianId),
          svc.getHinhThucThi('', thoiGianId),
          svc.getDotThi('', '', thoiGianId),
          svc.getMonThi('', '', '', thoiGianId),
        ]);
        setLoaiDiemList(ld);
        setHinhThucList(ht);
        setDotThiList(dt);
        setMonThiList(mt);
        // reset selected
        setLoaiDiemId('');
        setHinhThucId('');
        setDotThiId('');
        setMonThiId('');
      } catch (e: any) {
        console.warn('[GradeEntry] reload combos:', e?.message);
      }
    })();
  }, [thoiGianId]);

  // Khi đổi loại điểm hoặc hình thức → reload đợt thi + môn thi
  const reloadDotMon = useCallback(async (newLoaiDiem: string, newHinhThuc: string) => {
    try {
      const [dt, mt] = await Promise.all([
        svc.getDotThi(newHinhThuc, newLoaiDiem, thoiGianId),
        svc.getMonThi('', newHinhThuc, newLoaiDiem, thoiGianId),
      ]);
      setDotThiList(dt);
      setMonThiList(mt);
      setDotThiId('');
      setMonThiId('');
    } catch (e: any) {
      console.warn('[GradeEntry] reloadDotMon:', e?.message);
    }
  }, [thoiGianId]);

  // Khi đổi đợt thi → reload môn thi
  const reloadMon = useCallback(async (newDotThi: string) => {
    try {
      const mt = await svc.getMonThi(newDotThi, hinhThucId, loaiDiemId, thoiGianId);
      setMonThiList(mt);
      setMonThiId('');
    } catch (e: any) {
      console.warn('[GradeEntry] reloadMon:', e?.message);
    }
  }, [hinhThucId, loaiDiemId, thoiGianId]);

  // ----- Tìm kiếm DS thi -----
  const handleSearch = async () => {
    if (!dotThiId && !monThiId) {
      Alert.alert('Thông báo', 'Vui lòng chọn đợt thi hoặc môn thi trước khi tìm.');
      return;
    }
    setLoadingDSThi(true);
    setSelectedIds({});
    try {
      const list = await svc.getDanhSachThi(dotThiId, monThiId);
      setDsThi(list);
      if (list.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy danh sách thi phù hợp.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách thi');
    } finally {
      setLoadingDSThi(false);
    }
  };

  // ----- Filter local theo keyword -----
  const filteredDsThi = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return dsThi;
    return dsThi.filter((it) => {
      const hay = `${it.MADANHSACHTHI || ''} ${it.THONGTINLOPHOCPHAN || ''} ${it.NGAYTHI || ''} ${it.THI_CATHI_TEN || ''} ${it.TKB_PHONGTHI_TEN || ''}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [dsThi, keyword]);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ----- Mở modal xác nhận hoàn thành -----
  const openConfirmModal = async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 danh sách thi.');
      return;
    }
    setConfirmModalOpen(true);
    setHanhDongList([]);
    setHanhDongId('');
    try {
      const list = await svc.getHanhDongXacNhan(ids[0]);
      setHanhDongList(list);
      if (list.length > 0) setHanhDongId(list[0].ID);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách trạng thái');
    }
  };

  const submitConfirm = async () => {
    if (!hanhDongId) {
      Alert.alert('Thông báo', 'Vui lòng chọn trạng thái.');
      return;
    }
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    setConfirming(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await svc.confirmHoanThanh(id, hanhDongId, '');
        ok++;
      } catch (e) {
        fail++;
      }
    }
    setConfirming(false);
    setConfirmModalOpen(false);
    setSelectedIds({});
    Alert.alert(
      'Kết quả',
      `Xác nhận thành công: ${ok}/${ids.length}${fail > 0 ? `\nThất bại: ${fail}` : ''}`,
      [{ text: 'OK', onPress: handleSearch }]
    );
  };

  const handleImport = () => {
    Alert.alert(
      'Nhập điểm qua file',
      'Tính năng import từ Excel sẽ được phát triển sau. Hiện tại vui lòng nhập điểm trực tiếp trên ứng dụng.'
    );
  };

  // ----- Mở modal nhập điểm cho 1 DS thi -----
  const openNhapDiem = async (item: DanhSachThiItem) => {
    setActiveDsThi(item);
    setNguoiHocList([]);
    setDiemMap({});
    setLoadingNguoiHoc(true);
    try {
      const list = await svc.getNguoiHocTheoDST(item.ID);
      setNguoiHocList(list);
      // Initial diemMap từ DIEMBANDAU
      const initial: Record<string, string> = {};
      list.forEach((nh) => {
        initial[nh.ID] = nh.DIEMBANDAU != null ? String(nh.DIEMBANDAU) : '';
      });
      setDiemMap(initial);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách sinh viên');
    } finally {
      setLoadingNguoiHoc(false);
    }
  };

  const closeNhapDiem = () => {
    setActiveDsThi(null);
    setNguoiHocList([]);
    setDiemMap({});
  };

  // ----- Validate điểm: 0-10, parse được số -----
  const validateDiem = (raw: string): { ok: boolean; msg?: string } => {
    if (raw === '' || raw == null) return { ok: true }; // bỏ trống = không thay đổi
    const s = raw.trim().replace(',', '.');
    const n = Number(s);
    if (!isFinite(n)) return { ok: false, msg: `Giá trị "${raw}" không phải số` };
    if (n < 0 || n > 10) return { ok: false, msg: `Điểm "${raw}" phải trong [0..10]` };
    return { ok: true };
  };

  // ----- Lưu các điểm đã thay đổi -----
  const handleSave = async () => {
    // Chỉ lưu những hàng có thay đổi so với giá trị ban đầu
    const changed = nguoiHocList.filter((nh) => {
      const newVal = (diemMap[nh.ID] || '').trim();
      const oldVal = nh.DIEMBANDAU != null ? String(nh.DIEMBANDAU).trim() : '';
      return newVal !== oldVal;
    });

    if (changed.length === 0) {
      Alert.alert('Thông báo', 'Không có thay đổi để lưu.');
      return;
    }

    for (const nh of changed) {
      const v = validateDiem(diemMap[nh.ID] || '');
      if (!v.ok) {
        Alert.alert(
          'Sai định dạng',
          `${nh.QLSV_NGUOIHOC_MASO} - ${nh.QLSV_NGUOIHOC_HODEM} ${nh.QLSV_NGUOIHOC_TEN}: ${v.msg}`
        );
        return;
      }
    }

    Alert.alert(
      'Xác nhận',
      `Lưu ${changed.length} điểm đã thay đổi?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Lưu',
          onPress: async () => {
            setSaving(true);
            let ok = 0;
            let fail = 0;
            for (const nh of changed) {
              try {
                await svc.saveDiem(nh.ID, (diemMap[nh.ID] || '').trim(), APP_ID_CONG_CAN_BO);
                ok++;
              } catch (e: any) {
                console.warn('[GradeEntry] save fail:', nh.ID, e?.message);
                fail++;
              }
            }
            setSaving(false);
            Alert.alert(
              'Kết quả',
              `Đã lưu thành công: ${ok}/${changed.length}${fail > 0 ? `\nThất bại: ${fail}` : ''}`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (activeDsThi) openNhapDiem(activeDsThi); // refresh
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ----- Render row sinh viên -----
  const renderSinhVien = ({ item, index }: { item: NguoiHocItem; index: number }) => {
    const camThi = item.CAMTHI_DUYETDKTHI === '1' || item.CAMTHI_VIPHAMQUYCHE === '1';
    return (
      <View style={styles.svRow}>
        <View style={styles.svRowLeft}>
          <Text style={styles.svIndex}>{index + 1}</Text>
        </View>
        <View style={styles.svRowMid}>
          <Text style={styles.svName} numberOfLines={1}>
            {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
          </Text>
          <Text style={styles.svMeta} numberOfLines={1}>
            {item.QLSV_NGUOIHOC_MASO} · {item.DAOTAO_LOPQUANLY_TEN}
          </Text>
          <Text style={styles.svMeta} numberOfLines={1}>
            SBD: {item.SOBAODANH || '-'} · Lần học/thi: {item.LANHOC}/{item.LANTHI}
          </Text>
          {!!item.TRANGTHAI && <Text style={styles.svStatus}>{item.TRANGTHAI}</Text>}
        </View>
        <View style={styles.svRowRight}>
          {camThi ? (
            <View style={styles.bannedBox}>
              <MaterialIcons name="block" size={14} color="#DC2626" />
              <Text style={styles.bannedText}>Cấm thi</Text>
            </View>
          ) : (
            <TextInput
              style={styles.diemInput}
              value={diemMap[item.ID] ?? ''}
              onChangeText={(v) => setDiemMap((prev) => ({ ...prev, [item.ID]: v }))}
              placeholder="—"
              keyboardType="decimal-pad"
              maxLength={5}
            />
          )}
        </View>
      </View>
    );
  };

  // ----- Render card DS thi -----
  const renderDsThi = ({ item }: { item: DanhSachThiItem }) => {
    const confirmed = item.XACNHANHOANTHANHDIEMTHI === 1;
    const checked = !!selectedIds[item.ID];
    return (
      <TouchableOpacity style={styles.dsCard} onPress={() => openNhapDiem(item)} activeOpacity={0.85}>
        {/* Status strip bên trái */}
        <View style={[styles.dsCardStrip, confirmed && styles.dsCardStripConfirmed]} />

        {/* Checkbox để chọn cho action "Xác nhận hoàn thành" */}
        <TouchableOpacity
          onPress={() => toggleSelect(item.ID)}
          style={styles.dsCardCheckbox}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
            {checked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.dsCardBody}>
          {/* Lớp học phần làm tiêu đề chính */}
          <Text style={styles.dsCardTitle} numberOfLines={1}>
            {item.THONGTINLOPHOCPHAN}
          </Text>

          {/* Mã danh sách thi - subtitle nhỏ hơn, có thể wrap */}
          <Text style={styles.dsCardMa} numberOfLines={2}>
            {item.MADANHSACHTHI}
          </Text>

          {/* Thông tin grid 3 cột: ngày | ca | phòng */}
          <View style={styles.dsCardInfoRow}>
            <View style={styles.dsCardInfoCell}>
              <MaterialIcons name="calendar-today" size={14} color="#1E3A8A" />
              <View>
                <Text style={styles.dsCardInfoLabel}>Ngày thi</Text>
                <Text style={styles.dsCardInfoValue}>{item.NGAYTHI || '-'}</Text>
              </View>
            </View>
            <View style={styles.dsCardInfoCell}>
              <MaterialIcons name="access-time" size={14} color="#1E3A8A" />
              <View>
                <Text style={styles.dsCardInfoLabel}>Ca thi</Text>
                <Text style={styles.dsCardInfoValue}>{item.THI_CATHI_TEN || '-'}</Text>
              </View>
            </View>
            <View style={styles.dsCardInfoCell}>
              <MaterialIcons name="room" size={14} color="#1E3A8A" />
              <View>
                <Text style={styles.dsCardInfoLabel}>Phòng</Text>
                <Text style={styles.dsCardInfoValue} numberOfLines={1}>
                  {item.TKB_PHONGTHI_TEN || '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* Status footer */}
          <View style={styles.dsCardFooter}>
            {confirmed ? (
              <View style={styles.confirmedBadge}>
                <MaterialIcons name="verified" size={14} color="#10b981" />
                <Text style={styles.confirmedText}>Đã xác nhận hoàn thành</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <MaterialIcons name="schedule" size={14} color="#f59e0b" />
                <Text style={styles.pendingText}>Chưa xác nhận</Text>
              </View>
            )}
            <View style={styles.dsCardArrow}>
              <Text style={styles.dsCardArrowText}>Nhập điểm</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#1E3A8A" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const headerSubtitle = useMemo(() => {
    const tg = thoiGianList.find((t) => t.ID === thoiGianId);
    return tg ? tg.THOIGIAN || tg.TEN : 'Chọn học kỳ để bắt đầu';
  }, [thoiGianList, thoiGianId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Nhập điểm theo DS thi</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải bộ lọc...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDsThi}
          keyExtractor={(item) => item.ID}
          renderItem={renderDsThi}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={loadingDSThi} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <Picker
                  label="Học kỳ"
                  data={thoiGianList}
                  selectedId={thoiGianId}
                  onChange={(id) => setThoiGianId(id)}
                  getDisplay={(it) => it.THOIGIAN || it.TEN}
                />
                <Picker
                  label="Loại điểm"
                  data={loaiDiemList}
                  selectedId={loaiDiemId}
                  onChange={(id) => {
                    setLoaiDiemId(id);
                    reloadDotMon(id, hinhThucId);
                  }}
                  getDisplay={(it) => it.TEN}
                />
                <Picker
                  label="Hình thức thi"
                  data={hinhThucList}
                  selectedId={hinhThucId}
                  onChange={(id) => {
                    setHinhThucId(id);
                    reloadDotMon(loaiDiemId, id);
                  }}
                  getDisplay={(it) => it.TEN}
                />
                <Picker
                  label="Đợt thi"
                  data={dotThiList}
                  selectedId={dotThiId}
                  onChange={(id) => {
                    setDotThiId(id);
                    reloadMon(id);
                  }}
                  getDisplay={(it) => it.TEN}
                />
                <Picker
                  label="Môn thi"
                  data={monThiList}
                  selectedId={monThiId}
                  onChange={(id) => setMonThiId(id)}
                  getDisplay={(it) => (it.MA ? `${it.TEN} - ${it.MA}` : it.TEN)}
                />

                <TouchableOpacity
                  style={styles.searchBtn}
                  onPress={handleSearch}
                  disabled={loadingDSThi}
                  activeOpacity={0.85}
                >
                  {loadingDSThi ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="search" size={18} color="#FFFFFF" />
                      <Text style={styles.searchBtnText}>Tìm kiếm</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {dsThi.length > 0 && (
                <>
                  {/* Thanh action: keyword search + confirm + import */}
                  <View style={styles.actionBar}>
                    <View style={styles.keywordWrap}>
                      <MaterialIcons name="search" size={18} color="#94A3B8" />
                      <TextInput
                        style={styles.keywordInput}
                        placeholder="Nhập từ khoá tìm kiếm..."
                        placeholderTextColor="#94A3B8"
                        value={keyword}
                        onChangeText={setKeyword}
                      />
                      {keyword.length > 0 && (
                        <TouchableOpacity onPress={() => setKeyword('')}>
                          <MaterialIcons name="close" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.actionBtnRow}>
                      <TouchableOpacity
                        style={[styles.confirmBtn, selectedCount === 0 && styles.actionBtnDisabled]}
                        onPress={openConfirmModal}
                        activeOpacity={0.85}
                      >
                        <MaterialIcons name="verified" size={16} color="#FFFFFF" />
                        <Text style={styles.confirmBtnText}>
                          Xác nhận hoàn thành{selectedCount > 0 ? ` (${selectedCount})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.importBtn} onPress={handleImport} activeOpacity={0.85}>
                        <MaterialIcons name="cloud-upload" size={16} color="#10b981" />
                        <Text style={styles.importBtnText}>Import</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.sectionLabel}>
                    Danh sách thi ({filteredDsThi.length}
                    {keyword ? `/${dsThi.length}` : ''})
                  </Text>
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingDSThi ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="search-off" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Chưa có danh sách thi. Hãy chọn bộ lọc rồi bấm Tìm kiếm.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modal Xác nhận hoàn thành */}
      <Modal
        visible={confirmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmHeader}>
              <MaterialIcons name="verified" size={18} color="#10b981" />
              <Text style={styles.confirmTitle}>Xác nhận hoàn thành</Text>
              <TouchableOpacity onPress={() => setConfirmModalOpen(false)} style={{ marginLeft: 'auto' }}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.confirmMeta}>
              Áp dụng cho <Text style={{ fontWeight: '700' }}>{selectedCount}</Text> danh sách thi đã chọn.
            </Text>

            <Text style={styles.pickerLabel}>Trạng thái</Text>
            {hanhDongList.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 220 }}>
                {hanhDongList.map((hd) => (
                  <TouchableOpacity
                    key={hd.ID}
                    style={[styles.hdItem, hanhDongId === hd.ID && styles.hdItemActive]}
                    onPress={() => setHanhDongId(hd.ID)}
                  >
                    <MaterialIcons
                      name={hanhDongId === hd.ID ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={20}
                      color={hanhDongId === hd.ID ? '#1E3A8A' : '#94A3B8'}
                    />
                    <Text
                      style={[styles.hdItemText, hanhDongId === hd.ID && styles.hdItemTextActive]}
                    >
                      {hd.TEN}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmModalOpen(false)}
                disabled={confirming}
              >
                <Text style={styles.confirmCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOkBtn, (confirming || !hanhDongId) && styles.actionBtnDisabled]}
                onPress={submitConfirm}
                disabled={confirming || !hanhDongId}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmOkText}>Đồng ý</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal nhập điểm */}
      <Modal
        visible={!!activeDsThi}
        animationType="slide"
        onRequestClose={closeNhapDiem}
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F3F4F6' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeNhapDiem} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeDsThi?.MADANHSACHTHI}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeDsThi?.NGAYTHI} · {activeDsThi?.THI_CATHI_TEN} · {activeDsThi?.TKB_PHONGTHI_TEN}
              </Text>
            </View>
          </View>

          {loadingNguoiHoc ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải danh sách sinh viên...</Text>
            </View>
          ) : (
            <FlatList
              data={nguoiHocList}
              keyExtractor={(item) => item.ID}
              renderItem={renderSinhVien}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Không có sinh viên</Text>
                </View>
              }
            />
          )}

          {nguoiHocList.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Lưu điểm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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

  listContainer: { paddingBottom: 32 },

  filtersBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    margin: 12,
    borderRadius: 12,
    gap: 10,
  },
  pickerWrap: {},
  pickerLabel: { fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: '600' },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  pickerDisabled: { opacity: 0.5 },
  pickerValue: { flex: 1, color: '#0F172A', fontSize: 14 },
  pickerPlaceholder: { color: '#94A3B8' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '70%',
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

  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700' },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action bar dưới filter
  actionBar: {
    marginHorizontal: 12,
    marginBottom: 4,
    gap: 8,
  },
  keywordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keywordInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  actionBtnRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 11,
    borderRadius: 10,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10b981',
    backgroundColor: '#FFFFFF',
  },
  importBtnText: { color: '#10b981', fontWeight: '700', fontSize: 13 },
  actionBtnDisabled: { opacity: 0.5 },

  // Checkbox trong card
  dsCardCheckbox: {
    paddingLeft: 12,
    paddingTop: 14,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },

  // Modal Xác nhận hoàn thành
  confirmSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  confirmMeta: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  hdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  hdItemActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  hdItemText: { fontSize: 14, color: '#475569', flex: 1 },
  hdItemTextActive: { color: '#1E3A8A', fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  confirmCancelText: { color: '#475569', fontWeight: '700' },
  confirmOkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  confirmOkText: { color: '#FFFFFF', fontWeight: '700' },

  dsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dsCardStrip: { width: 4, backgroundColor: '#f59e0b' },
  dsCardStripConfirmed: { backgroundColor: '#10b981' },
  dsCardBody: { flex: 1, padding: 14 },

  dsCardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  dsCardMa: { fontSize: 12, color: '#1E3A8A', marginTop: 3, fontWeight: '600' },

  dsCardInfoRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dsCardInfoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dsCardInfoLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  dsCardInfoValue: { fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 1 },

  dsCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  confirmedText: { fontSize: 11, color: '#10b981', fontWeight: '700' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  dsCardArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dsCardArrowText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Modal nhập điểm
  modalHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  svRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  svRowLeft: { width: 28, alignItems: 'center' },
  svIndex: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  svRowMid: { flex: 1, paddingHorizontal: 8 },
  svRowRight: { width: 80, alignItems: 'flex-end' },
  svName: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
  svMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  svStatus: { fontSize: 11, color: '#DC2626', marginTop: 2, fontWeight: '600' },
  diemInput: {
    width: 70,
    height: 40,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  bannedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannedText: { fontSize: 11, color: '#DC2626', fontWeight: '700' },

  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default LecturerGradeEntryScreen;
