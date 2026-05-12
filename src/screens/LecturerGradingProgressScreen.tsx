// Thống kê tiến độ nhập điểm theo kế hoạch thi — port `nhapdiemlichthi.html` + `.js`.
// Filter cascade: Học kỳ → (Loại điểm, Hình thức thi, Đợt thi, Học phần) + Trạng thái + keyword.
// List card: 1 dòng = 1 DST (Danh sách thi). Tap → modal hiển thị tiến độ chi tiết theo từng
// loại điểm (SL/Tỷ lệ % — load on demand từ LayTTTienDoNhapDiemTheoDST).
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
  lecturerGradingProgressService as svc,
  ThoiGianItem,
  SimpleItem,
  LoaiDiemItem,
  TienDoLichThiItem,
  TienDoKetQua,
} from '../services/lecturerGradingProgressService';

const pad2 = (n: any) => {
  const s = String(n ?? '');
  return s.length < 2 ? '0' + s : s;
};

const formatHocKy = (it: ThoiGianItem) => it.THOIGIAN || it.TEN || it.ID;

interface PickerLike {
  ID: string;
  TEN?: string;
  THOIGIAN?: string;
  MA?: string;
}

function FilterPickerSheet<T extends PickerLike>(props: {
  visible: boolean;
  onClose: () => void;
  data: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  title: string;
  emptyLabel: string;
  getLabel?: (it: T) => string;
}) {
  const { visible, onClose, data, selectedId, onSelect, title, emptyLabel, getLabel } = props;
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (visible) setKeyword('');
  }, [visible]);
  const labelOf = (it: T) => (getLabel ? getLabel(it) : it.TEN || it.THOIGIAN || it.ID);

  const filtered = useMemo(() => {
    const items = [{ ID: '' } as T, ...data];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) => it.ID === '' || labelOf(it).toLowerCase().includes(kw));
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
                  <Text
                    style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                  >
                    {item.ID === '' ? emptyLabel : labelOf(item)}
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

const LecturerGradingProgressScreen = () => {
  const navigation = useNavigation();

  // Filter lists
  const [hocKyList, setHocKyList] = useState<ThoiGianItem[]>([]);
  const [loaiDiemList, setLoaiDiemList] = useState<LoaiDiemItem[]>([]);
  const [hinhThucList, setHinhThucList] = useState<SimpleItem[]>([]);
  const [dotThiList, setDotThiList] = useState<SimpleItem[]>([]);
  const [monThiList, setMonThiList] = useState<SimpleItem[]>([]);
  const [trangThaiList, setTrangThaiList] = useState<SimpleItem[]>([]);

  // Filter values
  const [hocKyId, setHocKyId] = useState('');
  const [loaiDiemId, setLoaiDiemId] = useState('');
  const [hinhThucId, setHinhThucId] = useState('');
  const [dotThiId, setDotThiId] = useState('');
  const [hocPhanId, setHocPhanId] = useState('');
  const [trangThaiMa, setTrangThaiMa] = useState(''); // MA, không phải ID
  const [tuKhoa, setTuKhoa] = useState('');

  const [pickerOpen, setPickerOpen] = useState<
    null | 'hocKy' | 'loaiDiem' | 'hinhThuc' | 'dotThi' | 'monThi' | 'trangThai'
  >(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<TienDoLichThiItem[]>([]);

  // Modal chi tiết tiến độ
  const [activeRow, setActiveRow] = useState<TienDoLichThiItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [chiTietCols, setChiTietCols] = useState<LoaiDiemItem[]>([]);
  // map[loaiDiemId] = { SOSV, TYLE }
  const [chiTietValues, setChiTietValues] = useState<Record<string, TienDoKetQua>>({});

  // Init: học kỳ + trạng thái lọc
  useEffect(() => {
    (async () => {
      try {
        const [hk, tt] = await Promise.all([svc.getThoiGian(), svc.getTrangThaiLoc()]);
        setHocKyList(hk);
        setTrangThaiList(tt);
        if (hk.length > 0) setHocKyId(hk[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu khởi tạo');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // Khi đổi học kỳ → reload Loại điểm + Hình thức + Đợt thi + Học phần
  useEffect(() => {
    if (!hocKyId) return;
    (async () => {
      try {
        const [ld, ht, dt, mt] = await Promise.all([
          svc.getLoaiDiem(hocKyId),
          svc.getHinhThucThi(hocKyId, ''),
          svc.getDotThi(hocKyId, '', ''),
          svc.getMonThi({ thoiGianId: hocKyId, loaiDiemId: '', hinhThucId: '', dotThiId: '' }),
        ]);
        setLoaiDiemList(ld);
        setHinhThucList(ht);
        setDotThiList(dt);
        setMonThiList(mt);
        setLoaiDiemId('');
        setHinhThucId('');
        setDotThiId('');
        setHocPhanId('');
      } catch (e: any) {
        console.warn('[Progress] reload by hocKy:', e?.message);
      }
    })();
  }, [hocKyId]);

  // Khi đổi loại điểm → reload đợt + hình thức + học phần
  useEffect(() => {
    if (!hocKyId) return;
    (async () => {
      try {
        const [ht, dt, mt] = await Promise.all([
          svc.getHinhThucThi(hocKyId, loaiDiemId),
          svc.getDotThi(hocKyId, loaiDiemId, hinhThucId),
          svc.getMonThi({
            thoiGianId: hocKyId,
            loaiDiemId,
            hinhThucId,
            dotThiId,
          }),
        ]);
        setHinhThucList(ht);
        setDotThiList(dt);
        setMonThiList(mt);
      } catch (e: any) {
        console.warn('[Progress] reload by loaiDiem:', e?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaiDiemId]);

  // Khi đổi hình thức → reload đợt + môn
  useEffect(() => {
    if (!hocKyId) return;
    (async () => {
      try {
        const [dt, mt] = await Promise.all([
          svc.getDotThi(hocKyId, loaiDiemId, hinhThucId),
          svc.getMonThi({ thoiGianId: hocKyId, loaiDiemId, hinhThucId, dotThiId }),
        ]);
        setDotThiList(dt);
        setMonThiList(mt);
      } catch (e: any) {
        console.warn('[Progress] reload by hinhThuc:', e?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hinhThucId]);

  // Khi đổi đợt thi → reload học phần
  useEffect(() => {
    if (!hocKyId) return;
    (async () => {
      try {
        const mt = await svc.getMonThi({
          thoiGianId: hocKyId,
          loaiDiemId,
          hinhThucId,
          dotThiId,
        });
        setMonThiList(mt);
      } catch (e: any) {
        console.warn('[Progress] reload by dotThi:', e?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotThiId]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await svc.getList({
        tuKhoa,
        trangThaiLocMa: trangThaiMa,
        dotThiId,
        hocPhanId,
      });
      setItems(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách thống kê');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [tuKhoa, trangThaiMa, dotThiId, hocPhanId]);

  // Auto load lần đầu sau khi có hocKy
  useEffect(() => {
    if (hocKyId && !loadingInit) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hocKyId, loadingInit]);

  // Mở chi tiết tiến độ 1 dòng → load tên cột + load song song các ô kết quả
  const openChiTiet = async (row: TienDoLichThiItem) => {
    setActiveRow(row);
    setChiTietCols([]);
    setChiTietValues({});
    setLoadingDetail(true);
    try {
      const cols = await svc.getTenCotChiTiet(row.IDDOTTHI || '', row.IDMONTHI || '');
      setChiTietCols(cols);
      // Tải song song giá trị cho từng loại điểm
      const tasks = cols.map((col) =>
        svc
          .getTienDoChiTiet({
            ngayThi: row.NGAYTHI || '',
            caThiId: row.IDCATHI || '',
            dotThiId: row.IDDOTTHI || '',
            monThiId: row.IDMONTHI || '',
            congThuc: row.CONGTHUC || '',
            loaiDiemId: col.ID,
            dstId: row.ID,
          })
          .then((res) => {
            const v = (res || []).find((r) => r.SOSV !== 'x' && r.TYLE !== 'x');
            return { id: col.ID, value: v || {} };
          })
          .catch(() => ({ id: col.ID, value: {} as TienDoKetQua }))
      );
      const results = await Promise.all(tasks);
      const map: Record<string, TienDoKetQua> = {};
      results.forEach((r) => {
        map[r.id] = r.value;
      });
      setChiTietValues(map);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không lấy được chi tiết');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selHocKy = hocKyList.find((it) => it.ID === hocKyId);
  const selLoaiDiem = loaiDiemList.find((it) => it.ID === loaiDiemId);
  const selHinhThuc = hinhThucList.find((it) => it.ID === hinhThucId);
  const selDotThi = dotThiList.find((it) => it.ID === dotThiId);
  const selMonThi = monThiList.find((it) => it.ID === hocPhanId);
  const selTrangThai = trangThaiList.find((it) => it.MA === trangThaiMa);

  const renderItem = ({ item, index }: { item: TienDoLichThiItem; index: number }) => {
    const tyLe = Number(item.TYLEHOANTHANHTKHP) || 0;
    const tyLeColor = tyLe >= 80 ? '#10B981' : tyLe >= 50 ? '#f59e0b' : '#dc2626';
    const caThi = `${item.THI_CATHI_TEN || ''} (${pad2(item.GIOBATDAU)}h${pad2(item.PHUTBATDAU)} → ${pad2(item.GIOKETTHUC)}h${pad2(item.PHUTKETTHUC)})`;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openChiTiet(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIndex}>#{index + 1}</Text>
          <View style={[styles.tyLeBadge, { backgroundColor: tyLeColor }]}>
            <Text style={styles.tyLeText}>TKHP {tyLe}%</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.DAOTAO_HOCPHAN_TEN}
        </Text>
        {!!item.DAOTAO_HOCPHAN_MA && (
          <Text style={styles.cardLop} numberOfLines={1}>
            {item.DAOTAO_HOCPHAN_MA}
          </Text>
        )}
        <View style={styles.metaGrid}>
          <Meta label="Ngày thi" value={item.NGAYTHI} />
          <Meta label="Ca thi" value={caThi} />
          <Meta label="Hình thức" value={item.HINHTHUCTHI_TEN} />
          <Meta label="Số TC" value={item.DAOTAO_HOCPHAN_SOTIN} />
          <Meta label="Số SV" value={item.SOSV} />
          <Meta label="Đợt thi" value={item.DOTTHI_TEN} />
          <Meta label="Công thức" value={item.DSCONGTHUCDIEM} />
          <Meta label="Khoa chuyên môn" value={item.DONVIPHUTRACHHOCPHAN_TEN} />
        </View>
        <View style={styles.detailLink}>
          <MaterialIcons name="analytics" size={14} color="#1E3A8A" />
          <Text style={styles.detailLinkText}>Xem tiến độ theo loại điểm</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Thống kê tiến độ nhập điểm</Text>
          <Text style={styles.headerSubtitle}>Theo kế hoạch thi</Text>
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

              <Text style={styles.filterLabel}>Loại điểm</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('loaiDiem')}
              >
                <Text
                  style={[
                    styles.pickerFieldText,
                    !selLoaiDiem && styles.pickerFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selLoaiDiem?.TEN || 'Tất cả loại điểm'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Hình thức thi</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('hinhThuc')}
              >
                <Text
                  style={[
                    styles.pickerFieldText,
                    !selHinhThuc && styles.pickerFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selHinhThuc?.TEN || 'Tất cả hình thức thi'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Đợt thi</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('dotThi')}
              >
                <Text
                  style={[
                    styles.pickerFieldText,
                    !selDotThi && styles.pickerFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selDotThi?.TEN || 'Tất cả đợt thi'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Học phần</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('monThi')}
              >
                <Text
                  style={[
                    styles.pickerFieldText,
                    !selMonThi && styles.pickerFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selMonThi?.TEN || 'Tất cả học phần'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Trạng thái xác nhận điểm</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('trangThai')}
              >
                <Text
                  style={[
                    styles.pickerFieldText,
                    !selTrangThai && styles.pickerFieldPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selTrangThai?.TEN || 'Tất cả trạng thái'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Từ khóa</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  value={tuKhoa}
                  onChangeText={setTuKhoa}
                  placeholder="Nhập từ khóa tìm kiếm"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="search"
                  onSubmitEditing={loadList}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.btnPrimary, { marginTop: 12 }]}
                onPress={loadList}
                disabled={loadingList}
                activeOpacity={0.85}
              >
                {loadingList ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Tìm kiếm</Text>
                  </>
                )}
              </TouchableOpacity>

              {items.length > 0 && (
                <Text style={styles.summaryText}>{items.length} kế hoạch thi</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingList ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="analytics" size={48} color="#94a3b8" />
                <Text style={styles.muted}>
                  Không có dữ liệu thống kê. Hãy điều chỉnh bộ lọc và bấm "Tìm kiếm".
                </Text>
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
        getLabel={(it) => formatHocKy(it as ThoiGianItem)}
        onSelect={(item) => {
          setHocKyId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'loaiDiem'}
        onClose={() => setPickerOpen(null)}
        data={loaiDiemList}
        selectedId={loaiDiemId}
        title="Chọn loại điểm"
        emptyLabel="Tất cả loại điểm"
        onSelect={(item) => {
          setLoaiDiemId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'hinhThuc'}
        onClose={() => setPickerOpen(null)}
        data={hinhThucList}
        selectedId={hinhThucId}
        title="Chọn hình thức thi"
        emptyLabel="Tất cả hình thức thi"
        onSelect={(item) => {
          setHinhThucId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'dotThi'}
        onClose={() => setPickerOpen(null)}
        data={dotThiList}
        selectedId={dotThiId}
        title="Chọn đợt thi"
        emptyLabel="Tất cả đợt thi"
        onSelect={(item) => {
          setDotThiId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'monThi'}
        onClose={() => setPickerOpen(null)}
        data={monThiList}
        selectedId={hocPhanId}
        title="Chọn học phần"
        emptyLabel="Tất cả học phần"
        onSelect={(item) => {
          setHocPhanId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'trangThai'}
        onClose={() => setPickerOpen(null)}
        data={trangThaiList.map((it) => ({ ...it, ID: it.MA || '' }))}
        selectedId={trangThaiMa}
        title="Trạng thái xác nhận điểm"
        emptyLabel="Tất cả trạng thái"
        onSelect={(item) => {
          // item.ID = MA (đã map ở trên)
          setTrangThaiMa(item.ID);
          setPickerOpen(null);
        }}
      />

      {/* Modal chi tiết tiến độ theo loại điểm */}
      <Modal
        visible={!!activeRow}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveRow(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {activeRow?.DAOTAO_HOCPHAN_TEN || 'Chi tiết tiến độ'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {activeRow?.NGAYTHI ? `${activeRow.NGAYTHI} · ` : ''}
                  {activeRow?.THI_CATHI_TEN || ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveRow(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={[styles.centerBox, { paddingVertical: 30 }]}>
                <ActivityIndicator color="#1E3A8A" />
                <Text style={styles.muted}>Đang tải chi tiết...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 520 }}>
                {chiTietCols.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Không có loại điểm nào trong đợt thi.</Text>
                  </View>
                ) : (
                  chiTietCols.map((col) => {
                    const v = chiTietValues[col.ID] || {};
                    const sl = v.SOSV;
                    const tyLe = v.TYLE;
                    return (
                      <View key={col.ID} style={styles.chiTietCard}>
                        <Text style={styles.chiTietColName} numberOfLines={2}>
                          {col.TEN}
                        </Text>
                        <View style={styles.chiTietRow}>
                          <View style={styles.chiTietBox}>
                            <Text style={styles.chiTietLabel}>Số SV đã nhập</Text>
                            <Text style={styles.chiTietValue}>{sl ?? '-'}</Text>
                          </View>
                          <View style={styles.chiTietBox}>
                            <Text style={styles.chiTietLabel}>Tỷ lệ</Text>
                            <Text
                              style={[
                                styles.chiTietValue,
                                { color: '#10b981' },
                              ]}
                            >
                              {tyLe != null ? `${tyLe}%` : '-'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Meta = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value == null || value === '') return null;
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {String(value)}
      </Text>
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
  searchRow: { flexDirection: 'row', gap: 8 },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 13,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  btnPrimary: { backgroundColor: '#1E3A8A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  summaryText: {
    marginTop: 10,
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '700',
    textAlign: 'right',
  },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIndex: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  tyLeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tyLeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  cardLop: { fontSize: 12, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  metaItem: { width: '47%' },
  metaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  metaValue: { fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 1 },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLinkText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  // Modal picker
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

  // Sheet chi tiết
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

  chiTietCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  chiTietColName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  chiTietRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chiTietBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chiTietLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  chiTietValue: { fontSize: 18, color: '#1E3A8A', fontWeight: '700', marginTop: 4 },
});

export default LecturerGradingProgressScreen;
