// Nhập điểm theo phách (CCB.NDP) — port web `tuibai.html` + `tuibai.js`.
// Khác NDDST ở 2 điểm:
//   - List chính là Đợt phách (gộp nhiều túi bài thi)
//   - Trong modal phải chọn 1 Túi trước → mới hiện danh sách phách ẩn danh
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
import {
  lecturerGradeEntryService as svc,
  ComboItem,
  DotPhachItem,
  TuiBaiItem,
  PhachItem,
  HanhDongXacNhanItem,
  CHUCNANG_ID_NDP,
} from '../services/lecturerGradeEntryService';

const APP_ID_CONG_CAN_BO = 'B0B172E252D24251A5E650D38AC901A2';

// -------- Mini Picker --------
interface PickerProps<T extends { ID: string }> {
  label: string;
  data: T[];
  selectedId: string;
  onChange: (id: string) => void;
  getDisplay: (item: T) => string;
  placeholder?: string;
}
function Picker<T extends { ID: string }>({
  label,
  data,
  selectedId,
  onChange,
  getDisplay,
  placeholder = 'Chọn...',
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = data.find((d) => d.ID === selectedId);
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerField}
        onPress={() => data.length > 0 && setOpen(true)}
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
                    onChange(item.ID);
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

const LecturerGradeEntryByPhachScreen = () => {
  const navigation = useNavigation();

  // Filter combos (giống NDDST)
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
  const [loadingMain, setLoadingMain] = useState(false);
  const [dotPhachList, setDotPhachList] = useState<DotPhachItem[]>([]);

  // Modal nhập phách
  const [activeDotPhach, setActiveDotPhach] = useState<DotPhachItem | null>(null);
  const [tuiList, setTuiList] = useState<TuiBaiItem[]>([]);
  const [tuiId, setTuiId] = useState('');
  const [phachList, setPhachList] = useState<PhachItem[]>([]);
  const [diemMap, setDiemMap] = useState<Record<string, string>>({});
  const [loadingTui, setLoadingTui] = useState(false);
  const [loadingPhach, setLoadingPhach] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search + multi-select + confirm
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hanhDongList, setHanhDongList] = useState<HanhDongXacNhanItem[]>([]);
  const [hanhDongId, setHanhDongId] = useState('');
  const [confirming, setConfirming] = useState(false);

  // ----- Initial -----
  useEffect(() => {
    (async () => {
      try {
        const tg = await svc.getThoiGian();
        setThoiGianList(tg);
        if (tg.length > 0) setThoiGianId(tg[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không lấy được học kỳ');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

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
        setLoaiDiemId('');
        setHinhThucId('');
        setDotThiId('');
        setMonThiId('');
      } catch (e: any) {
        console.warn('[GradeEntryPhach] reload combos:', e?.message);
      }
    })();
  }, [thoiGianId]);

  const reloadDotMon = useCallback(
    async (newLoaiDiem: string, newHinhThuc: string) => {
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
        console.warn('[GradeEntryPhach] reloadDotMon:', e?.message);
      }
    },
    [thoiGianId]
  );

  const reloadMon = useCallback(
    async (newDotThi: string) => {
      try {
        const mt = await svc.getMonThi(newDotThi, hinhThucId, loaiDiemId, thoiGianId);
        setMonThiList(mt);
        setMonThiId('');
      } catch (e: any) {
        console.warn('[GradeEntryPhach] reloadMon:', e?.message);
      }
    },
    [hinhThucId, loaiDiemId, thoiGianId]
  );

  // ----- Tìm kiếm Đợt phách -----
  const handleSearch = async () => {
    if (!dotThiId && !monThiId) {
      Alert.alert('Thông báo', 'Vui lòng chọn đợt thi hoặc môn thi trước khi tìm.');
      return;
    }
    setLoadingMain(true);
    setSelectedIds({});
    try {
      const list = await svc.getDotPhach(dotThiId, monThiId);
      setDotPhachList(list);
      if (list.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy đợt phách phù hợp.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được đợt phách');
    } finally {
      setLoadingMain(false);
    }
  };

  const filteredDotPhach = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return dotPhachList;
    return dotPhachList.filter((it) => (it.TEN || '').toLowerCase().includes(kw));
  }, [dotPhachList, keyword]);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const toggleSelect = (id: string) => setSelectedIds((p) => ({ ...p, [id]: !p[id] }));

  // ----- Mở modal nhập phách: load Túi trước -----
  const openNhapPhach = async (item: DotPhachItem) => {
    setActiveDotPhach(item);
    setTuiList([]);
    setTuiId('');
    setPhachList([]);
    setDiemMap({});
    setLoadingTui(true);
    try {
      const list = await svc.getTuiTheoDotPhach(item.ID);
      setTuiList(list);
      if (list.length > 0) {
        setTuiId(list[0].ID); // selectFirst
        // load phách của túi đầu tiên
        await loadPhach(list[0].ID);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách túi');
    } finally {
      setLoadingTui(false);
    }
  };

  const loadPhach = async (selectedTuiId: string) => {
    if (!selectedTuiId) {
      setPhachList([]);
      return;
    }
    setLoadingPhach(true);
    try {
      const list = await svc.getPhachTheoTui(selectedTuiId);
      setPhachList(list);
      const initial: Record<string, string> = {};
      list.forEach((p) => {
        initial[p.ID] = p.DIEMBANDAU != null ? String(p.DIEMBANDAU) : '';
      });
      setDiemMap(initial);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách phách');
    } finally {
      setLoadingPhach(false);
    }
  };

  const onChangeTui = async (newTuiId: string) => {
    setTuiId(newTuiId);
    await loadPhach(newTuiId);
  };

  const closeNhapPhach = () => {
    setActiveDotPhach(null);
    setTuiList([]);
    setPhachList([]);
    setDiemMap({});
    setTuiId('');
  };

  const validateDiem = (raw: string) => {
    if (raw === '' || raw == null) return { ok: true };
    const s = raw.trim().replace(',', '.');
    const n = Number(s);
    if (!isFinite(n)) return { ok: false, msg: `"${raw}" không phải số` };
    if (n < 0 || n > 10) return { ok: false, msg: `"${raw}" phải trong [0..10]` };
    return { ok: true };
  };

  const handleSave = async () => {
    const changed = phachList.filter((p) => {
      const newVal = (diemMap[p.ID] || '').trim();
      const oldVal = p.DIEMBANDAU != null ? String(p.DIEMBANDAU).trim() : '';
      return newVal !== oldVal;
    });
    if (changed.length === 0) {
      Alert.alert('Thông báo', 'Không có thay đổi để lưu.');
      return;
    }
    for (const p of changed) {
      const v = validateDiem(diemMap[p.ID] || '');
      if (!v.ok) {
        Alert.alert('Sai định dạng', `Số phách ${p.SOPHACH}: ${v.msg}`);
        return;
      }
    }

    Alert.alert('Xác nhận', `Lưu ${changed.length} điểm phách đã thay đổi?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Lưu',
        onPress: async () => {
          setSaving(true);
          let ok = 0;
          let fail = 0;
          for (const p of changed) {
            try {
              await svc.saveDiemPhach(
                p.ID,
                String(p.SOPHACH || ''),
                (diemMap[p.ID] || '').trim(),
                APP_ID_CONG_CAN_BO
              );
              ok++;
            } catch (e) {
              fail++;
            }
          }
          setSaving(false);
          Alert.alert(
            'Kết quả',
            `Đã lưu thành công: ${ok}/${changed.length}${fail > 0 ? `\nThất bại: ${fail}` : ''}`,
            [{ text: 'OK', onPress: () => tuiId && loadPhach(tuiId) }]
          );
        },
      },
    ]);
  };

  // ----- Xác nhận hoàn thành -----
  const openConfirmModal = async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 đợt phách.');
      return;
    }
    setConfirmModalOpen(true);
    setHanhDongList([]);
    setHanhDongId('');
    try {
      const list = await svc.getHanhDongXacNhan(ids[0], CHUCNANG_ID_NDP);
      setHanhDongList(list);
      if (list.length > 0) setHanhDongId(list[0].ID);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được trạng thái');
    }
  };

  const submitConfirm = async () => {
    if (!hanhDongId) return;
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    setConfirming(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await svc.confirmHoanThanh(id, hanhDongId, '', CHUCNANG_ID_NDP);
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
      'Tính năng import từ Excel sẽ được phát triển sau.'
    );
  };

  // ----- Render row phách -----
  const renderPhach = ({ item, index }: { item: PhachItem; index: number }) => (
    <View style={styles.phachRow}>
      <Text style={styles.phachIndex}>{index + 1}</Text>
      <View style={styles.phachMid}>
        <Text style={styles.phachSo}>Phách {item.SOPHACH}</Text>
        {!!item.THONGTINXULY && <Text style={styles.phachViPham}>{item.THONGTINXULY}</Text>}
      </View>
      <TextInput
        style={styles.diemInput}
        value={diemMap[item.ID] ?? ''}
        onChangeText={(v) => setDiemMap((prev) => ({ ...prev, [item.ID]: v }))}
        placeholder="—"
        keyboardType="decimal-pad"
        maxLength={5}
      />
    </View>
  );

  // ----- Render card Đợt phách -----
  const renderDotPhach = ({ item }: { item: DotPhachItem }) => {
    const confirmed = item.XACNHANHOANTHANHDIEMTHI === 1;
    const checked = !!selectedIds[item.ID];
    return (
      <TouchableOpacity style={styles.dpCard} onPress={() => openNhapPhach(item)} activeOpacity={0.85}>
        <View style={[styles.dpStrip, confirmed && styles.dpStripConfirmed]} />

        <TouchableOpacity
          onPress={() => toggleSelect(item.ID)}
          style={styles.dpCheckbox}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
            {checked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.dpBody}>
          <Text style={styles.dpTitle} numberOfLines={2}>
            {item.TEN}
          </Text>
          <View style={styles.dpFooter}>
            {confirmed ? (
              <View style={styles.confirmedBadge}>
                <MaterialIcons name="verified" size={14} color="#10b981" />
                <Text style={styles.confirmedText}>Đã xác nhận</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <MaterialIcons name="schedule" size={14} color="#f59e0b" />
                <Text style={styles.pendingText}>Chưa xác nhận</Text>
              </View>
            )}
            <View style={styles.dpArrow}>
              <Text style={styles.dpArrowText}>Nhập điểm</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Nhập điểm theo phách</Text>
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
          data={filteredDotPhach}
          keyExtractor={(item) => item.ID}
          renderItem={renderDotPhach}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <Picker
                  label="Học kỳ"
                  data={thoiGianList}
                  selectedId={thoiGianId}
                  onChange={setThoiGianId}
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
                  onChange={setMonThiId}
                  getDisplay={(it) => (it.MA ? `${it.TEN} - ${it.MA}` : it.TEN)}
                />

                <TouchableOpacity
                  style={styles.searchBtn}
                  onPress={handleSearch}
                  disabled={loadingMain}
                  activeOpacity={0.85}
                >
                  {loadingMain ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="search" size={18} color="#FFFFFF" />
                      <Text style={styles.searchBtnText}>Tìm kiếm</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {dotPhachList.length > 0 && (
                <>
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
                          Xác nhận{selectedCount > 0 ? ` (${selectedCount})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.importBtn} onPress={handleImport} activeOpacity={0.85}>
                        <MaterialIcons name="cloud-upload" size={16} color="#10b981" />
                        <Text style={styles.importBtnText}>Import</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.sectionLabel}>
                    Đợt phách ({filteredDotPhach.length}
                    {keyword ? `/${dotPhachList.length}` : ''})
                  </Text>
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingMain ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="search-off" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Chưa có đợt phách. Hãy chọn bộ lọc rồi bấm Tìm kiếm.</Text>
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
              Áp dụng cho <Text style={{ fontWeight: '700' }}>{selectedCount}</Text> đợt phách đã chọn.
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
                    <Text style={[styles.hdItemText, hanhDongId === hd.ID && styles.hdItemTextActive]}>
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

      {/* Modal nhập phách */}
      <Modal
        visible={!!activeDotPhach}
        animationType="slide"
        onRequestClose={closeNhapPhach}
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F3F4F6' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeNhapPhach} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeDotPhach?.TEN}
              </Text>
              <Text style={styles.headerSubtitle}>Đánh túi bài thi của đợt phách</Text>
            </View>
          </View>

          <View style={styles.tuiPickerWrap}>
            <Picker
              label="Chọn túi"
              data={tuiList}
              selectedId={tuiId}
              onChange={onChangeTui}
              getDisplay={(it) => it.TEN}
            />
          </View>

          {loadingTui || loadingPhach ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>
                {loadingTui ? 'Đang tải danh sách túi...' : 'Đang tải danh sách phách...'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={phachList}
              keyExtractor={(item) => item.ID}
              renderItem={renderPhach}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>
                    {tuiList.length === 0
                      ? 'Đợt phách này chưa có túi nào'
                      : 'Túi này chưa có phách'}
                  </Text>
                </View>
              }
            />
          )}

          {phachList.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.actionBtnDisabled]}
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

  actionBar: { marginHorizontal: 12, marginBottom: 4, gap: 8 },
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

  // Card Đợt phách
  dpCard: {
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
  dpStrip: { width: 4, backgroundColor: '#f59e0b' },
  dpStripConfirmed: { backgroundColor: '#10b981' },
  dpCheckbox: { paddingLeft: 12, paddingTop: 14 },
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
  checkboxBoxChecked: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  dpBody: { flex: 1, padding: 14 },
  dpTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  dpFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
  dpArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dpArrowText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Modal Xác nhận
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

  // Modal nhập phách
  modalHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tuiPickerWrap: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  phachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  phachIndex: { width: 32, fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  phachMid: { flex: 1 },
  phachSo: { fontSize: 15, color: '#0F172A', fontWeight: '700' },
  phachViPham: { fontSize: 12, color: '#DC2626', marginTop: 2, fontWeight: '600' },
  diemInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },

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
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default LecturerGradeEntryByPhachScreen;
