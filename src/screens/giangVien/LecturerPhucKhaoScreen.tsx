// Khoa xem Phúc Khảo (CCB.KXPK) — port web `phuckhao.html` + `phuckhao.js`.
// Read-only: chọn Học kỳ + Học phần → list các kết quả thi & trạng thái phúc khảo.
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerPhucKhaoService as svc,
  ThoiGianItem,
  HocPhanItem,
  PhucKhaoItem,
} from '../../services/giangVien/lecturerPhucKhaoService';

interface PickerProps<T extends { ID: string }> {
  label: string;
  data: T[];
  selectedId: string;
  onChange: (id: string) => void;
  getDisplay: (item: T) => string;
  placeholder?: string;
  emptyLabel?: string;
}
function Picker<T extends { ID: string }>({
  label,
  data,
  selectedId,
  onChange,
  getDisplay,
  placeholder = 'Chọn...',
  emptyLabel,
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
          {selected
            ? getDisplay(selected)
            : data.length === 0
            ? '(chưa có dữ liệu)'
            : emptyLabel || placeholder}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>{label}</Text>
            <FlatList
              data={
                emptyLabel
                  ? ([{ ID: '', TEN: emptyLabel } as any, ...data] as T[])
                  : data
              }
              keyExtractor={(item, idx) => `${item.ID}_${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item.ID === selectedId && styles.pickerItemActive]}
                  onPress={() => {
                    onChange(item.ID);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      item.ID === selectedId && styles.pickerItemTextActive,
                    ]}
                  >
                    {item.ID === '' && emptyLabel ? emptyLabel : getDisplay(item)}
                  </Text>
                  {item.ID === selectedId && (
                    <MaterialIcons name="check" size={20} color="#1E3A8A" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const LecturerPhucKhaoScreen = () => {
  const navigation = useNavigation();
  const [thoiGianList, setThoiGianList] = useState<ThoiGianItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<HocPhanItem[]>([]);
  const [thoiGianId, setThoiGianId] = useState('');
  const [hocPhanId, setHocPhanId] = useState('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMain, setLoadingMain] = useState(false);
  const [list, setList] = useState<PhucKhaoItem[]>([]);
  const [activeDetail, setActiveDetail] = useState<PhucKhaoItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tg = await svc.getThoiGian();
        setThoiGianList(tg);
        if (tg.length > 0) setThoiGianId(tg[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được học kỳ');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!thoiGianId) {
      setHocPhanList([]);
      return;
    }
    (async () => {
      try {
        const hp = await svc.getHocPhan(thoiGianId);
        setHocPhanList(hp);
        setHocPhanId('');
      } catch (e: any) {
        console.warn('[PhucKhao] getHocPhan:', e?.message);
      }
    })();
  }, [thoiGianId]);

  const handleSearch = useCallback(async () => {
    setLoadingMain(true);
    try {
      const data = await svc.getDSPhucKhao(thoiGianId, hocPhanId);
      setList(data);
      if (data.length === 0) {
        Alert.alert('Thông báo', 'Không có dữ liệu phúc khảo.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách phúc khảo');
    } finally {
      setLoadingMain(false);
    }
  }, [thoiGianId, hocPhanId]);

  // Auto search khi đổi filter
  useEffect(() => {
    if (!thoiGianId) return;
    handleSearch();
  }, [thoiGianId, hocPhanId, handleSearch]);

  const getStatusBadge = (item: PhucKhaoItem) => {
    if (item.KETQUAPHUCKHAO != null && String(item.KETQUAPHUCKHAO).trim() !== '') {
      return { text: 'Đã có KQ phúc khảo', color: '#10b981', bg: '#ECFDF5' };
    }
    if (item.NGAYDANGKYPHUCKHAO) {
      return { text: 'Đã đăng ký', color: '#f59e0b', bg: '#FFFBEB' };
    }
    return { text: 'Chưa đăng ký', color: '#64748B', bg: '#F1F5F9' };
  };

  const renderItem = ({ item, index }: { item: PhucKhaoItem; index: number }) => {
    const badge = getStatusBadge(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setActiveDetail(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardIndex}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
            </Text>
            <Text style={styles.cardMeta}>
              <Text style={styles.cardCode}>{item.QLSV_NGUOIHOC_MASO}</Text>
              {item.SOBAODANH ? ` · SBD ${item.SOBAODANH}` : ''}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]} numberOfLines={1}>
              {badge.text}
            </Text>
          </View>
        </View>

        <Text style={styles.cardHocPhan} numberOfLines={2}>
          {item.DAOTAO_HOCPHAN_TEN}
          {item.DAOTAO_HOCPHAN_MA ? ` (${item.DAOTAO_HOCPHAN_MA})` : ''}
        </Text>

        <View style={styles.cardInfoRow}>
          <View style={styles.cardInfoCell}>
            <MaterialIcons name="calendar-today" size={12} color="#64748B" />
            <Text style={styles.cardInfoText}>{item.NGAYTHI || '-'}</Text>
          </View>
          <View style={styles.cardInfoCell}>
            <MaterialIcons name="access-time" size={12} color="#64748B" />
            <Text style={styles.cardInfoText}>{item.CATHI_TEN || '-'}</Text>
          </View>
          <View style={styles.cardInfoCell}>
            <MaterialIcons name="room" size={12} color="#64748B" />
            <Text style={styles.cardInfoText} numberOfLines={1}>
              {item.PHONGTHI_TEN || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.cardScoreRow}>
          <View style={styles.cardScoreCell}>
            <Text style={styles.cardScoreLabel}>Điểm ban đầu</Text>
            <Text style={styles.cardScoreValue}>{item.DIEM != null ? String(item.DIEM) : '-'}</Text>
          </View>
          <View style={styles.cardScoreCell}>
            <Text style={styles.cardScoreLabel}>KQ phúc khảo</Text>
            <Text style={[styles.cardScoreValue, { color: '#10b981' }]}>
              {item.KETQUAPHUCKHAO != null && String(item.KETQUAPHUCKHAO).trim() !== ''
                ? String(item.KETQUAPHUCKHAO)
                : '-'}
            </Text>
          </View>
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
          <Text style={styles.headerTitle}>Khoa xem Phúc Khảo</Text>
          <Text style={styles.headerSubtitle}>Tra cứu kết quả phúc khảo</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.ID}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <Picker
                  label="Học kỳ"
                  data={thoiGianList}
                  selectedId={thoiGianId}
                  onChange={setThoiGianId}
                  getDisplay={(it) => it.THOIGIAN}
                />
                <Picker
                  label="Học phần"
                  data={hocPhanList}
                  selectedId={hocPhanId}
                  onChange={setHocPhanId}
                  getDisplay={(it) => it.TEN}
                  emptyLabel="Tất cả học phần"
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
              {list.length > 0 && (
                <Text style={styles.sectionLabel}>Theo danh sách thi ({list.length})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingMain ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="quiz" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Chưa có dữ liệu. Hãy chọn bộ lọc.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modal chi tiết */}
      <Modal
        visible={!!activeDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDetail(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Chi tiết phúc khảo</Text>
              <TouchableOpacity onPress={() => setActiveDetail(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activeDetail && (
              <View>
                <Text style={styles.detailName}>
                  {activeDetail.QLSV_NGUOIHOC_HODEM} {activeDetail.QLSV_NGUOIHOC_TEN}
                </Text>
                <Text style={styles.detailMeta}>
                  {activeDetail.QLSV_NGUOIHOC_MASO}
                  {activeDetail.SOBAODANH ? ` · SBD ${activeDetail.SOBAODANH}` : ''}
                </Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Kết quả thi ban đầu</Text>
                  <DetailRow label="Học phần" value={activeDetail.DAOTAO_HOCPHAN_TEN} />
                  <DetailRow label="Loại điểm" value={activeDetail.DIEM_THANHPHANDIEM_TEN} />
                  <DetailRow label="Hình thức thi" value={activeDetail.HINHTHUCTHI_TEN} />
                  <DetailRow label="Ngày thi" value={activeDetail.NGAYTHI} />
                  <DetailRow label="Ca thi" value={activeDetail.CATHI_TEN} />
                  <DetailRow label="Phòng thi" value={activeDetail.PHONGTHI_TEN} />
                  <DetailRow
                    label="Điểm"
                    value={activeDetail.DIEM != null ? String(activeDetail.DIEM) : '-'}
                    valueBold
                  />
                  <DetailRow label="Ngày công bố" value={activeDetail.NGAYXACNHANHOANTHANHDIEMTHI} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Đăng ký phúc khảo</Text>
                  <DetailRow label="Ngày đăng ký" value={activeDetail.NGAYDANGKYPHUCKHAO || 'Chưa đăng ký'} />
                  <DetailRow label="Hết hạn đăng ký" value={activeDetail.NGAYHETHANDANGKYPHUCKHAO} />
                  <DetailRow
                    label="Phí phúc khảo"
                    value={
                      activeDetail.PHIPHUCKHAO != null ? String(activeDetail.PHIPHUCKHAO) : '-'
                    }
                  />
                  <DetailRow label="Tình trạng nộp phí" value={activeDetail.TINHTRANGNOPPHI} />
                  <DetailRow label="Kết quả duyệt" value={activeDetail.TINHTRANG_TEN} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Kết quả sau phúc khảo</Text>
                  <DetailRow
                    label="Điểm phúc khảo"
                    value={
                      activeDetail.KETQUAPHUCKHAO != null
                        ? String(activeDetail.KETQUAPHUCKHAO)
                        : '-'
                    }
                    valueBold
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({
  label,
  value,
  valueBold,
}: {
  label: string;
  value?: string | number | null;
  valueBold?: boolean;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text
      style={[styles.detailRowValue, valueBold && { fontWeight: '700', color: '#1E3A8A' }]}
      numberOfLines={2}
    >
      {value != null && String(value).trim() !== '' ? String(value) : '-'}
    </Text>
  </View>
);

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

  // Card item
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    minWidth: 20,
    textAlign: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardCode: { color: '#1E3A8A', fontWeight: '700' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  cardHocPhan: { fontSize: 13, color: '#0F172A', marginTop: 8, fontWeight: '600' },
  cardInfoRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cardInfoCell: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  cardInfoText: { fontSize: 11, color: '#64748B', flex: 1 },

  cardScoreRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardScoreCell: { flex: 1, alignItems: 'center' },
  cardScoreLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },
  cardScoreValue: { fontSize: 16, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Detail modal
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  detailName: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  detailMeta: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8 },
  detailSection: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  detailRowLabel: { fontSize: 13, color: '#64748B', flex: 1 },
  detailRowValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.3,
  },
});

export default LecturerPhucKhaoScreen;
