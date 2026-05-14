// Khối lượng cá nhân — port `khoiluongcanhan.html` + `.js`.
// Mobile: header info cán bộ + dropdown bảng tính + 2 nút (Xem / Xem toàn bộ).
// List dạng card: Lớp + Bậc hệ + Học kỳ + Đơn vị + Phân loại + Vai trò + Số tiết + Giờ chuẩn
// + Tình trạng. Tap card → modal chi tiết (header + bảng dữ liệu theo LOAI + cột công thức).
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
  lecturerWorkloadService as svc,
  BangTinhItem,
  ThongTinCanBoItem,
  KhoiLuongRow,
  ThanhPhanCongThucItem,
} from '../../services/giangVien/lecturerWorkloadService';

// Map LOAI → cấu hình cột chi tiết (port từ web `viewForm_KhoiLuongCaNhan`)
type DetailCol = { label: string; key?: string; render?: (r: any) => string };
const DETAIL_CONFIG: Record<string, { headers: DetailCol[] }> = {
  KLGD_DULIEU_LICHGIANG: {
    headers: [
      { label: 'Ngày học', key: 'NGAY' },
      { label: 'Tiết BĐ', key: 'TIETBATDAU' },
      { label: 'Tiết KT', key: 'TIETKETTHUC' },
      { label: 'Số tiết', key: 'SOLUONG' },
      { label: 'Số SV', key: 'QUYMO' },
      {
        label: 'Học phần',
        render: (r) =>
          `${r.DAOTAO_HOCPHAN_TEN || ''}${r.DAOTAO_HOCPHAN_MA ? ' - ' + r.DAOTAO_HOCPHAN_MA : ''}`,
      },
      { label: 'Lớp HP', key: 'DAOTAO_LOPHOCPHAN_TEN' },
      { label: 'Giờ chuẩn', key: 'GIOCHUAN' },
    ],
  },
  KLGD_DULIEU_LAMSAN: {
    headers: [
      { label: 'Ngày đi', key: 'NGAY' },
      { label: 'Số ngày', key: 'SOLUONG' },
      { label: 'Số SV', key: 'QUYMO' },
      { label: 'Số tín chỉ', key: 'SOTINCHIHOCPHAN' },
      {
        label: 'Học phần',
        render: (r) =>
          `${r.DAOTAO_HOCPHAN_TEN || ''}${r.DAOTAO_HOCPHAN_MA ? ' - ' + r.DAOTAO_HOCPHAN_MA : ''}`,
      },
      { label: 'Lớp HP', key: 'DAOTAO_LOPHOCPHAN_TEN' },
      { label: 'Giờ chuẩn', key: 'GIOCHUAN' },
    ],
  },
  KLGD_DULIEU_DOANKHOALUAN: {
    headers: [
      { label: 'Số SV', key: 'QUYMO' },
      { label: 'Số tín chỉ', key: 'SOTINCHIHOCPHAN' },
      {
        label: 'Học phần',
        render: (r) =>
          `${r.DAOTAO_HOCPHAN_TEN || ''}${r.DAOTAO_HOCPHAN_MA ? ' - ' + r.DAOTAO_HOCPHAN_MA : ''}`,
      },
      { label: 'Lớp HP', key: 'DAOTAO_LOPHOCPHAN_TEN' },
      { label: 'Giờ chuẩn', key: 'GIOCHUAN' },
    ],
  },
  KLGD_DULIEU_HOIDONG: {
    headers: [{ label: 'Giờ chuẩn', key: 'GIOCHUAN' }],
  },
};

const fmtNum = (n: any) => {
  if (n == null || n === '') return '';
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
};

const LecturerWorkloadScreen = () => {
  const navigation = useNavigation();

  // Header thông tin cán bộ
  const [canBo, setCanBo] = useState<ThongTinCanBoItem | null>(null);

  // Bảng tính
  const [bangTinhList, setBangTinhList] = useState<BangTinhItem[]>([]);
  const [bangTinhId, setBangTinhId] = useState('');
  const [bangTinhPickerOpen, setBangTinhPickerOpen] = useState(false);

  // Dữ liệu
  const [items, setItems] = useState<KhoiLuongRow[]>([]);
  const [activeRow, setActiveRow] = useState<KhoiLuongRow | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailCols, setDetailCols] = useState<ThanhPhanCongThucItem[]>([]);
  // values["rowId|tukhoaId"] = giá trị từ khóa
  const [detailValues, setDetailValues] = useState<Record<string, string>>({});

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Init: load bảng tính + thông tin cán bộ
  useEffect(() => {
    (async () => {
      try {
        const res = await svc.getBangTinh();
        setBangTinhList(res.rs);
        if (res.rsThongTin.length > 0) setCanBo(res.rsThongTin[0]);
        if (res.rs.length > 0) setBangTinhId(res.rs[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu khởi tạo');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const loadList = useCallback(
    async (mode: 'me' | 'all') => {
      if (!bangTinhId) {
        Alert.alert('Thông báo', 'Vui lòng chọn bảng tính.');
        return;
      }
      setLoadingList(true);
      try {
        const list =
          mode === 'me'
            ? await svc.getDuLieuKL(bangTinhId)
            : await svc.getDuLieuKLToanBo(bangTinhId);
        setItems(list);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu khối lượng');
      } finally {
        setLoadingList(false);
        setRefreshing(false);
      }
    },
    [bangTinhId]
  );

  // Tự load khi đổi bảng tính
  useEffect(() => {
    if (bangTinhId) loadList('me');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bangTinhId]);

  // Tổng giờ chuẩn của list hiện tại
  const sumGioChuan = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.SOGIOCHUAN) || 0), 0);
  }, [items]);

  // Mở chi tiết 1 row
  const openDetail = async (row: KhoiLuongRow) => {
    setActiveRow(row);
    setDetailRows([]);
    setDetailCols([]);
    setDetailValues({});
    setLoadingDetail(true);
    try {
      const res = await svc.getChiTietKL({
        keHoachChiTietId: row.KLGD_KEHOACHCHITIET_ID || '',
        loai: row.LOAI || '',
        id: row.ID,
      });
      setDetailRows(res.rs);
      setDetailCols(res.rsThanhPhanCongThuc);
      // Tải song song tất cả ô giá trị cột mở rộng
      const tasks: Promise<{ key: string; value: string }>[] = [];
      res.rs.forEach((r) => {
        res.rsThanhPhanCongThuc.forEach((col) => {
          tasks.push(
            svc
              .getGiaTriTuKhoa({ duLieuLoaiId: r.ID, tuKhoa: col.TUKHOA })
              .then((value) => ({ key: `${r.ID}|${col.ID}`, value }))
              .catch(() => ({ key: `${r.ID}|${col.ID}`, value: '' }))
          );
        });
      });
      const results = await Promise.all(tasks);
      const map: Record<string, string> = {};
      results.forEach(({ key, value }) => {
        map[key] = value;
      });
      setDetailValues(map);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không lấy được chi tiết');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selBangTinh = bangTinhList.find((b) => b.ID === bangTinhId);

  const renderItem = ({ item, index }: { item: KhoiLuongRow; index: number }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIndex}>#{index + 1}</Text>
        {!!item.TINHTRANGXACNHAN_TEN && (
          <View style={styles.tinhTrangBadge}>
            <Text style={styles.tinhTrangText}>{item.TINHTRANGXACNHAN_TEN}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.TENLOP || '(Chưa rõ lớp)'}
      </Text>
      <View style={styles.metaGrid}>
        <Meta label="Bậc hệ" value={item.DAOTAO_HEDAOTAO_TEN} />
        <Meta label="Học kỳ" value={item.THOIGIAN} />
        <Meta label="Đơn vị" value={item.DONVI_PHUTRACH_HOCPHAN_TEN} />
        <Meta label="Phân loại" value={item.PHANLOAI_TEN} />
        <Meta label="Vai trò" value={item.VAITRO_TEN} />
        <Meta label="Quy mô" value={item.QUYMO} />
        <Meta label="Số lượng" value={item.SOLUONG} />
        <Meta label="Tổng phân bổ" value={item.TONGPHANBO} />
      </View>
      <View style={styles.gioChuanRow}>
        <MaterialIcons name="schedule" size={14} color="#1E3A8A" />
        <Text style={styles.gioChuanLabel}>Giờ chuẩn quy đổi</Text>
        <Text style={styles.gioChuanValue}>{fmtNum(item.SOGIOCHUAN)}</Text>
      </View>
      {!!item.GHICHU && (
        <Text style={styles.cardGhiChu} numberOfLines={2}>
          {item.GHICHU}
        </Text>
      )}
      <View style={styles.detailLink}>
        <MaterialIcons name="visibility" size={14} color="#1E3A8A" />
        <Text style={styles.detailLinkText}>Xem chi tiết</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Khối lượng cá nhân</Text>
          <Text style={styles.headerSubtitle}>Bảng tính khối lượng giảng dạy</Text>
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
                loadList('me');
              }}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Info cán bộ */}
              {!!canBo && (
                <View style={styles.canBoBox}>
                  <View style={styles.canBoAvatar}>
                    <Text style={styles.canBoAvatarText}>
                      {(canBo.TEN || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.canBoName}>
                      {canBo.HODEM} {canBo.TEN}
                    </Text>
                    <Text style={styles.canBoMeta}>
                      Mã: {canBo.MASO || '-'}
                      {canBo.DAOTAO_COCAUTOCHUC_TEN ? ` · ${canBo.DAOTAO_COCAUTOCHUC_TEN}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bảng tính picker + 2 nút */}
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Bảng tính</Text>
                <TouchableOpacity
                  style={styles.pickerField}
                  onPress={() => setBangTinhPickerOpen(true)}
                >
                  <Text style={styles.pickerFieldText} numberOfLines={1}>
                    {selBangTinh?.TEN ||
                      (bangTinhList.length === 0
                        ? '— Không có bảng tính nào —'
                        : 'Chọn bảng tính')}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
                </TouchableOpacity>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnPrimary]}
                    onPress={() => loadList('me')}
                    disabled={loadingList || !bangTinhId}
                    activeOpacity={0.85}
                  >
                    {loadingList ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="search" size={14} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Xem</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnOutline]}
                    onPress={() => loadList('all')}
                    disabled={loadingList || !bangTinhId}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="table-chart" size={14} color="#1E3A8A" />
                    <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>
                      Xem toàn bộ
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tổng giờ chuẩn */}
              {items.length > 0 && (
                <View style={styles.summaryBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryLabel}>Danh sách khối lượng</Text>
                    <Text style={styles.summaryCount}>{items.length} mục</Text>
                  </View>
                  <View style={styles.summaryGio}>
                    <Text style={styles.summaryGioLabel}>Tổng giờ chuẩn</Text>
                    <Text style={styles.summaryGioValue}>{fmtNum(sumGioChuan)}</Text>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingList ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="assessment" size={48} color="#94a3b8" />
                <Text style={styles.muted}>
                  {bangTinhList.length === 0
                    ? 'Chưa có bảng tính khối lượng. Liên hệ đào tạo để được cấp.'
                    : 'Không có dữ liệu khối lượng. Bấm "Xem" để tải.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Picker bảng tính */}
      <Modal
        visible={bangTinhPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBangTinhPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBangTinhPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Chọn bảng tính</Text>
            <FlatList
              data={bangTinhList}
              keyExtractor={(item, idx) => `${item.ID}_${idx}_bt`}
              renderItem={({ item }) => {
                const active = item.ID === bangTinhId;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => {
                      setBangTinhId(item.ID);
                      setBangTinhPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                    >
                      {item.TEN}
                    </Text>
                    {active && <MaterialIcons name="check" size={20} color="#1E3A8A" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={styles.muted}>Không có bảng tính</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal chi tiết */}
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
                  {activeRow?.GHICHU || activeRow?.TENLOP || 'Chi tiết khối lượng'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {activeRow?.LOAI ? activeRow.LOAI.replace(/^KLGD_DULIEU_/, '') : ''}
                  {activeRow?.SOGIOCHUAN != null ? ` · Giờ chuẩn: ${fmtNum(activeRow.SOGIOCHUAN)}` : ''}
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
                {detailRows.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Không có dữ liệu chi tiết</Text>
                  </View>
                ) : (
                  detailRows.map((r, idx) => {
                    const cfg = DETAIL_CONFIG[activeRow?.LOAI || ''] || DETAIL_CONFIG.KLGD_DULIEU_HOIDONG;
                    return (
                      <View key={r.ID || idx} style={styles.detailCard}>
                        <Text style={styles.detailIndex}>#{idx + 1}</Text>
                        {cfg.headers.map((h, hi) => {
                          const value = h.render ? h.render(r) : r[h.key || ''];
                          if (value == null || value === '') return null;
                          return (
                            <View key={hi} style={styles.detailRow}>
                              <Text style={styles.detailLabel}>{h.label}</Text>
                              <Text style={styles.detailValue}>{String(value)}</Text>
                            </View>
                          );
                        })}
                        {/* Cột công thức mở rộng */}
                        {detailCols.map((col) => {
                          const v = detailValues[`${r.ID}|${col.ID}`];
                          if (!v) return null;
                          return (
                            <View key={col.ID} style={styles.detailRow}>
                              <Text style={styles.detailLabel}>{col.TENTUKHOA || col.TUKHOA}</Text>
                              <Text style={styles.detailValue}>{v}</Text>
                            </View>
                          );
                        })}
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
      <Text style={styles.metaValue} numberOfLines={1}>
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

  canBoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  canBoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canBoAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  canBoName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  canBoMeta: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },

  filterBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  filterLabel: { fontSize: 12, color: '#475569', fontWeight: '700' },
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

  btnRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
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
  btnOutline: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  summaryLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  summaryCount: { fontSize: 16, color: '#0F172A', fontWeight: '700', marginTop: 2 },
  summaryGio: { alignItems: 'flex-end' },
  summaryGioLabel: { fontSize: 11, color: '#64748B' },
  summaryGioValue: { fontSize: 18, color: '#10B981', fontWeight: '700', marginTop: 2 },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Card khối lượng
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
  tinhTrangBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    maxWidth: 200,
  },
  tinhTrangText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 6 },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  metaItem: { width: '47%' },
  metaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  metaValue: { fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 1 },

  gioChuanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gioChuanLabel: { flex: 1, fontSize: 12, color: '#1E3A8A', fontWeight: '600' },
  gioChuanValue: { fontSize: 16, color: '#10B981', fontWeight: '700' },

  cardGhiChu: { fontSize: 11, color: '#64748B', fontStyle: 'italic', marginTop: 6 },

  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
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

  // Detail sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  sheetSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },

  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  detailIndex: { fontSize: 11, color: '#1E3A8A', fontWeight: '700', marginBottom: 4 },
  detailRow: { flexDirection: 'row', paddingVertical: 3 },
  detailLabel: { width: 100, fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 12, color: '#0F172A' },
});

export default LecturerWorkloadScreen;
