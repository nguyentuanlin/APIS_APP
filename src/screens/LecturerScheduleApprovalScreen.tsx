// Khoa xác nhận đổi lịch — port `lichgiangkhoa.html` + `.js`.
// Mobile redesign: filter dạng card, list yêu cầu là cards (mỗi yêu cầu 1 card với checkbox + chi tiết),
// bulk duyệt qua bottom sheet chọn trạng thái.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerScheduleApprovalService as svc,
  HocKyItem,
  HocPhanItem,
  NguoiGuiItem,
  TrangThaiItem,
  YeuCauDoiLichItem,
  ChiTietDoiLichItem,
} from '../services/lecturerScheduleApprovalService';

interface PickerData {
  ID: string;
  TEN?: string;
  HODEM?: string;
  TAIKHOAN?: string;
  MASO?: string;
  THOIGIAN?: string;
  MA?: string;
}

const formatHocKy = (it: HocKyItem) => it.THOIGIAN || it.TEN || it.ID;
const formatHocPhan = (it: HocPhanItem) => (it.MA ? `${it.TEN} (${it.MA})` : it.TEN);
const formatNguoiGui = (it: NguoiGuiItem) => {
  const name = `${it.HODEM || ''} ${it.TEN || ''}`.trim();
  if (it.MASO) return `${name} (${it.MASO})`;
  if (it.TAIKHOAN) return `${name} - ${it.TAIKHOAN}`;
  return name || it.ID;
};

// Picker chung có search
function FilterPickerSheet<T extends PickerData>(props: {
  visible: boolean;
  onClose: () => void;
  data: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  title: string;
  emptyLabel: string;
  getLabel: (item: T) => string;
}) {
  const { visible, onClose, data, selectedId, onSelect, title, emptyLabel, getLabel } = props;
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (visible) setKeyword('');
  }, [visible]);

  const filtered = useMemo(() => {
    const items = [{ ID: '' } as T, ...data];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) => it.ID === '' || getLabel(it).toLowerCase().includes(kw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, keyword]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.pickerSheet}>
          <Text style={styles.pickerSheetTitle}>{title}</Text>
          <View style={styles.pickerSearchWrap}>
            <MaterialIcons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Tìm kiếm..."
              placeholderTextColor="#94A3B8"
              value={keyword}
              onChangeText={setKeyword}
            />
            {!!keyword && (
              <TouchableOpacity onPress={() => setKeyword('')}>
                <MaterialIcons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item.ID}_${idx}_fp`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.ID === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, active && styles.pickerItemActive]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>
                    {item.ID === '' ? emptyLabel : getLabel(item)}
                  </Text>
                  {active && <MaterialIcons name="check" size={20} color="#1E3A8A" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={styles.muted}>Không tìm thấy</Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const LecturerScheduleApprovalScreen = () => {
  const navigation = useNavigation();

  // Filters
  const [hocKyList, setHocKyList] = useState<HocKyItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<HocPhanItem[]>([]);
  const [nguoiGuiList, setNguoiGuiList] = useState<NguoiGuiItem[]>([]);
  const [trangThaiDuyetList, setTrangThaiDuyetList] = useState<TrangThaiItem[]>([]);
  const [ketQuaXuLyList, setKetQuaXuLyList] = useState<TrangThaiItem[]>([]);

  const [hocKyId, setHocKyId] = useState('');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [hocPhanId, setHocPhanId] = useState('');
  const [nguoiGuiId, setNguoiGuiId] = useState('');
  const [trangThaiDuyetId, setTrangThaiDuyetId] = useState('');
  const [ketQuaXuLyId, setKetQuaXuLyId] = useState('');

  // Pickers
  const [pickerOpen, setPickerOpen] = useState<
    null | 'hocKy' | 'hocPhan' | 'nguoiGui' | 'trangThaiDuyet' | 'ketQuaXuLy'
  >(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [items, setItems] = useState<YeuCauDoiLichItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk duyet sheet
  const [duyetSheetOpen, setDuyetSheetOpen] = useState(false);
  const [duyetNoiDung, setDuyetNoiDung] = useState('');
  const [submittingDuyet, setSubmittingDuyet] = useState(false);

  // Detail modal
  const [chiTiet, setChiTiet] = useState<ChiTietDoiLichItem | null>(null);
  const [loadingChiTiet, setLoadingChiTiet] = useState(false);

  // Init: load học kỳ + trạng thái + kết quả xử lý + list (đầu tiên)
  useEffect(() => {
    (async () => {
      try {
        const [hk, ttd, kqxl] = await Promise.all([
          svc.getHocKy(),
          svc.getTrangThaiDuyet(),
          svc.getKetQuaXuLy(),
        ]);
        setHocKyList(hk);
        setTrangThaiDuyetList(ttd);
        setKetQuaXuLyList(kqxl);
        if (hk.length > 0 && !hocKyId) {
          // Mặc định lấy học kỳ đầu tiên (mới nhất)
          setHocKyId(hk[0].ID);
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu khởi tạo');
      } finally {
        setLoadingInit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi đổi học kỳ → reload học phần + người gửi
  useEffect(() => {
    if (!hocKyId) return;
    (async () => {
      setLoadingFilters(true);
      try {
        const [hp, ng] = await Promise.all([
          svc.getHocPhan(hocKyId),
          svc.getNguoiGui(hocKyId),
        ]);
        setHocPhanList(hp);
        setNguoiGuiList(ng);
        // Reset lựa chọn cũ vì list khác
        setHocPhanId('');
        setNguoiGuiId('');
      } catch (e: any) {
        console.warn('[Approval] reload filters:', e?.message);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [hocKyId]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setSelectedIds(new Set());
    try {
      const res = await svc.getList({
        hocKyId,
        tuNgay,
        denNgay,
        hocPhanId,
        nguoiGuiId,
        trangThaiDuyetId,
        ketQuaXuLyId,
        pageIndex: 1,
        pageSize: 200,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [hocKyId, tuNgay, denNgay, hocPhanId, nguoiGuiId, trangThaiDuyetId, ketQuaXuLyId]);

  // Auto load lần đầu sau khi có hocKyId
  useEffect(() => {
    if (hocKyId && !loadingInit) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hocKyId, loadingInit]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((it) => it.ID)));
    }
  };

  const openDuyetSheet = () => {
    if (selectedIds.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn đối tượng');
      return;
    }
    if (trangThaiDuyetList.length === 0) {
      Alert.alert('Lỗi', 'Chưa có danh sách trạng thái duyệt');
      return;
    }
    setDuyetNoiDung('');
    setDuyetSheetOpen(true);
  };

  const submitDuyet = async (tinhTrangId: string) => {
    if (selectedIds.size === 0) return;
    setSubmittingDuyet(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await svc.duyet({ sanPhamId: id, tinhTrangId, noiDung: duyetNoiDung });
        ok++;
      } catch {
        failed++;
      }
    }
    setSubmittingDuyet(false);
    setDuyetSheetOpen(false);
    Alert.alert(
      'Kết quả',
      `Duyệt thành công: ${ok}/${ids.length}` + (failed ? `\nThất bại: ${failed}` : ''),
      [{ text: 'OK', onPress: loadList }]
    );
  };

  const openChiTiet = async (id: string) => {
    setChiTiet({}); // mở modal trống trước
    setLoadingChiTiet(true);
    try {
      const ct = await svc.getChiTiet(id);
      setChiTiet(ct || {});
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không lấy được chi tiết');
      setChiTiet(null);
    } finally {
      setLoadingChiTiet(false);
    }
  };

  const selHocKy = hocKyList.find((it) => it.ID === hocKyId);
  const selHocPhan = hocPhanList.find((it) => it.ID === hocPhanId);
  const selNguoiGui = nguoiGuiList.find((it) => it.ID === nguoiGuiId);
  const selTrangThaiDuyet = trangThaiDuyetList.find((it) => it.ID === trangThaiDuyetId);
  const selKetQuaXuLy = ketQuaXuLyList.find((it) => it.ID === ketQuaXuLyId);

  const renderItem = ({ item, index }: { item: YeuCauDoiLichItem; index: number }) => {
    const checked = selectedIds.has(item.ID);
    return (
      <View style={[styles.card, checked && styles.cardChecked]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.checkboxBox}
            onPress={() => toggleSelect(item.ID)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={checked ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={checked ? '#1E3A8A' : '#94A3B8'}
            />
            <Text style={styles.cardIndex}>#{index + 1}</Text>
          </TouchableOpacity>
          <Text style={styles.cardTime}>{item.NGAYTAO_DD_MM_YYYY || ''}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.DAOTAO_HOCPHAN_TEN || '(Không có HP)'}
        </Text>
        <Text style={styles.cardLop} numberOfLines={1}>
          {item.LOPHOCPHAN_TEN}
        </Text>

        <View style={styles.cardRow}>
          <MaterialIcons name="person" size={13} color="#64748B" />
          <Text style={styles.cardMeta} numberOfLines={1}>
            Gửi: {item.NGUOIYEUCAU_TENDAYDU || item.NGUOIYEUCAU_TAIKHOAN || '-'}
          </Text>
        </View>

        {!!item.TINHTRANGDUYET_TEN && (
          <View style={styles.cardRow}>
            <MaterialIcons name="verified" size={13} color="#10b981" />
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.TINHTRANGDUYET_TEN}
              {item.THOIGIANDUYET ? ` · ${item.THOIGIANDUYET}` : ''}
              {item.NGUOIDUYET_TAIKHOAN ? ` · ${item.NGUOIDUYET_TAIKHOAN}` : ''}
            </Text>
          </View>
        )}

        {!!item.KETQUAXULY && (
          <View style={styles.cardRow}>
            <MaterialIcons name="assignment-turned-in" size={13} color="#f59e0b" />
            <Text style={styles.cardMeta} numberOfLines={2}>
              Xử lý: {item.KETQUAXULY}
              {item.THOIGIANXULY ? ` · ${item.THOIGIANXULY}` : ''}
              {item.NGUOIXULY_TAIKHOAN ? ` · ${item.NGUOIXULY_TAIKHOAN}` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.detailBtn} onPress={() => openChiTiet(item.ID)}>
          <MaterialIcons name="visibility" size={14} color="#1E3A8A" />
          <Text style={styles.detailBtnText}>Xem chi tiết</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Khoa xác nhận đổi lịch</Text>
          <Text style={styles.headerSubtitle}>Duyệt yêu cầu đổi lịch giảng</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.ID}_${i}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadList();
              }}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Filter box */}
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Học kỳ</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setPickerOpen('hocKy')}
                >
                  <Text style={styles.pickerFieldText} numberOfLines={1}>
                    {selHocKy ? formatHocKy(selHocKy) : 'Chọn học kỳ'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <Text style={styles.filterLabel}>Thời gian gửi yêu cầu</Text>
                <View style={styles.dateRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={tuNgay}
                    onChangeText={setTuNgay}
                    placeholder="Từ ngày (dd/mm/yyyy)"
                    placeholderTextColor="#94A3B8"
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={denNgay}
                    onChangeText={setDenNgay}
                    placeholder="Đến ngày (dd/mm/yyyy)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <Text style={styles.filterLabel}>Học phần</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setPickerOpen('hocPhan')}
                  disabled={loadingFilters}
                >
                  <Text
                    style={[
                      styles.pickerFieldText,
                      !selHocPhan && styles.pickerFieldPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selHocPhan ? formatHocPhan(selHocPhan) : 'Chọn học phần'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <Text style={styles.filterLabel}>Người gửi</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setPickerOpen('nguoiGui')}
                  disabled={loadingFilters}
                >
                  <Text
                    style={[
                      styles.pickerFieldText,
                      !selNguoiGui && styles.pickerFieldPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selNguoiGui ? formatNguoiGui(selNguoiGui) : 'Chọn người gửi'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <Text style={styles.filterLabel}>Trạng thái - Khoa duyệt</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setPickerOpen('trangThaiDuyet')}
                >
                  <Text
                    style={[
                      styles.pickerFieldText,
                      !selTrangThaiDuyet && styles.pickerFieldPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selTrangThaiDuyet?.TEN || 'Tất cả trạng thái duyệt'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <Text style={styles.filterLabel}>Trạng thái - Đào tạo xử lý</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setPickerOpen('ketQuaXuLy')}
                >
                  <Text
                    style={[
                      styles.pickerFieldText,
                      !selKetQuaXuLy && styles.pickerFieldPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selKetQuaXuLy?.TEN || 'Tất cả kết quả xử lý'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnPrimary]}
                    onPress={loadList}
                    disabled={loadingList}
                    activeOpacity={0.85}
                  >
                    {loadingList ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="search" size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Xem</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.btnSuccess,
                      selectedIds.size === 0 && styles.btnDisabled,
                    ]}
                    onPress={openDuyetSheet}
                    disabled={selectedIds.size === 0}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Duyệt ({selectedIds.size})</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Select all + count */}
              {items.length > 0 && (
                <View style={styles.selectAllRow}>
                  <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                    <MaterialIcons
                      name={
                        selectedIds.size === items.length
                          ? 'check-box'
                          : 'check-box-outline-blank'
                      }
                      size={20}
                      color="#1E3A8A"
                    />
                    <Text style={styles.selectAllText}>
                      Chọn tất cả ({selectedIds.size}/{items.length}) — Tổng {total}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingList ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="inbox" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Không có yêu cầu phù hợp.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Pickers */}
      <FilterPickerSheet
        visible={pickerOpen === 'hocKy'}
        onClose={() => setPickerOpen(null)}
        data={hocKyList}
        selectedId={hocKyId}
        title="Chọn học kỳ"
        emptyLabel="(Không chọn)"
        getLabel={(it) => formatHocKy(it)}
        onSelect={(item) => {
          setHocKyId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'hocPhan'}
        onClose={() => setPickerOpen(null)}
        data={hocPhanList}
        selectedId={hocPhanId}
        title="Chọn học phần"
        emptyLabel="Tất cả học phần"
        getLabel={(it) => formatHocPhan(it as HocPhanItem)}
        onSelect={(item) => {
          setHocPhanId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'nguoiGui'}
        onClose={() => setPickerOpen(null)}
        data={nguoiGuiList}
        selectedId={nguoiGuiId}
        title="Chọn người gửi"
        emptyLabel="Tất cả người gửi"
        getLabel={(it) => formatNguoiGui(it as NguoiGuiItem)}
        onSelect={(item) => {
          setNguoiGuiId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'trangThaiDuyet'}
        onClose={() => setPickerOpen(null)}
        data={trangThaiDuyetList}
        selectedId={trangThaiDuyetId}
        title="Trạng thái khoa duyệt"
        emptyLabel="Tất cả trạng thái duyệt"
        getLabel={(it) => it.TEN || it.ID}
        onSelect={(item) => {
          setTrangThaiDuyetId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'ketQuaXuLy'}
        onClose={() => setPickerOpen(null)}
        data={ketQuaXuLyList}
        selectedId={ketQuaXuLyId}
        title="Kết quả xử lý"
        emptyLabel="Tất cả kết quả xử lý"
        getLabel={(it) => it.TEN || it.ID}
        onSelect={(item) => {
          setKetQuaXuLyId(item.ID);
          setPickerOpen(null);
        }}
      />

      {/* Duyệt sheet: chọn trạng thái + nhập ghi chú */}
      <Modal
        visible={duyetSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDuyetSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Duyệt {selectedIds.size} yêu cầu</Text>
                <Text style={styles.sheetSubtitle}>Chọn trạng thái duyệt và (tùy chọn) ghi chú</Text>
              </View>
              <TouchableOpacity onPress={() => setDuyetSheetOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={duyetNoiDung}
              onChangeText={setDuyetNoiDung}
              multiline
              placeholder="Ghi chú thêm..."
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Trạng thái duyệt</Text>
            {submittingDuyet ? (
              <View style={[styles.centerBox, { paddingVertical: 24 }]}>
                <ActivityIndicator color="#1E3A8A" />
                <Text style={styles.muted}>Đang duyệt...</Text>
              </View>
            ) : (
              <View style={{ marginTop: 6 }}>
                {trangThaiDuyetList.map((tt, idx) => {
                  const palette = ['#10B981', '#dc2626', '#f59e0b', '#0ea5e9', '#9333ea'];
                  const bg = palette[idx % palette.length];
                  return (
                    <TouchableOpacity
                      key={tt.ID}
                      style={[styles.tinhTrangBtn, { backgroundColor: bg }]}
                      onPress={() => submitDuyet(tt.ID)}
                    >
                      <Text style={styles.tinhTrangBtnText}>{tt.TEN || tt.ID}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnCancel, { marginTop: 8 }]}
              onPress={() => setDuyetSheetOpen(false)}
              disabled={submittingDuyet}
            >
              <Text style={styles.sheetBtnCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chi tiết yêu cầu */}
      <Modal
        visible={!!chiTiet}
        transparent
        animationType="slide"
        onRequestClose={() => setChiTiet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chi tiết yêu cầu đổi lịch</Text>
              <TouchableOpacity onPress={() => setChiTiet(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {loadingChiTiet ? (
              <View style={[styles.centerBox, { paddingVertical: 30 }]}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : chiTiet ? (
              <ScrollView style={{ maxHeight: 480 }}>
                <Row label="Học phần" value={chiTiet.DAOTAO_HOCPHAN_TEN || chiTiet.HOCPHAN_TEN} />
                <Row label="Lớp HP" value={chiTiet.LOPHOCPHAN_TEN} />
                <Row label="Nội dung" value={chiTiet.NOIDUNG} />
                <Row label="Người gửi" value={chiTiet.NGUOIYEUCAU_TENDAYDU} />
                <Row label="Thời gian gửi" value={chiTiet.NGAYTAO_DD_MM_YYYY_HHMMSS || chiTiet.NGAYTAO_DD_MM_YYYY} />
                <Row label="Ngày học cũ" value={chiTiet.NGAYHOC} />
                <Row label="Ngày học mới" value={chiTiet.NGAYHOC_THAYDOI} />
                <Row
                  label="Tiết cũ"
                  value={
                    chiTiet.TIETBATDAU != null
                      ? `${chiTiet.TIETBATDAU}-${chiTiet.TIETKETTHUC}`
                      : undefined
                  }
                />
                <Row
                  label="Tiết mới"
                  value={
                    chiTiet.TIETBATDAU_THAYDOI != null
                      ? `${chiTiet.TIETBATDAU_THAYDOI}-${chiTiet.TIETKETTHUC_THAYDOI}`
                      : undefined
                  }
                />
                <Row label="Phòng cũ" value={chiTiet.PHONGHOC_TEN} />
                <Row label="Phòng mới" value={chiTiet.PHONGHOC_THAYDOI_TEN} />
                <Row label="Trạng thái duyệt" value={chiTiet.TINHTRANGDUYET_TEN} />
                <Row label="Thời gian duyệt" value={chiTiet.THOIGIANDUYET} />
                <Row label="Người duyệt" value={chiTiet.NGUOIDUYET_TENDAYDU || chiTiet.NGUOIDUYET_TAIKHOAN} />
                <Row label="Kết quả xử lý" value={chiTiet.KETQUAXULY} />
                <Row label="Nội dung xử lý" value={chiTiet.NOIDUNGXULY} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value == null || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{String(value)}</Text>
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

  filterBox: { backgroundColor: '#FFFFFF', margin: 12, padding: 12, borderRadius: 12, gap: 6 },
  filterLabel: { fontSize: 12, color: '#475569', fontWeight: '700', marginTop: 6 },
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
  pickerFieldText: { flex: 1, color: '#0F172A', fontSize: 13 },
  pickerFieldPlaceholder: { color: '#94A3B8', fontStyle: 'italic' },

  dateRow: { flexDirection: 'row', gap: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 13,
  },

  btnRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  btnPrimary: { backgroundColor: '#1E3A8A' },
  btnSuccess: { backgroundColor: '#10B981' },
  btnDisabled: { backgroundColor: '#CBD5E1' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  selectAllRow: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Card 1 yêu cầu
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardChecked: { borderColor: '#1E3A8A', backgroundColor: '#F0F7FF' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkboxBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIndex: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  cardTime: { fontSize: 11, color: '#64748B' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  cardLop: { fontSize: 12, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardMeta: { fontSize: 12, color: '#475569', flex: 1 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailBtnText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  // Modal / picker
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
  pickerSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
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
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  sheetSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },

  sheetBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnCancel: { backgroundColor: '#F1F5F9' },
  sheetBtnCancelText: { color: '#475569', fontWeight: '700' },

  tinhTrangBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  tinhTrangBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },

  detailRow: { flexDirection: 'row', paddingVertical: 6 },
  detailRowLabel: { width: 110, fontSize: 13, color: '#64748B', fontWeight: '600' },
  detailRowValue: { flex: 1, fontSize: 13, color: '#0F172A' },
});

export default LecturerScheduleApprovalScreen;
