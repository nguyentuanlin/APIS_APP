// Thời khóa biểu - Sinh viên (CCB.TKHDMSV) — port `thoikhoabieusinhvien/script/lichgiang.js`.
// Khác bản admin xem cán bộ: search bằng mã sinh viên (encrypted POST), lịch lấy từ
// SV_ThongTin_MH/LayDSLichCaNhan (encrypted, host sinhvienapi).
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerScheduleService as svc,
  LichGiangItem,
  SinhVienSearchItem,
} from '../services/lecturerScheduleService';

const VN_THU_LABEL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_THU_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateShort = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

const COLOR_PALETTE = ['#1E40AF', '#10b981', '#f59e0b', '#dc2626', '#9333ea', '#0ea5e9'];

const LecturerStudentScheduleScreen = () => {
  const navigation = useNavigation();
  const [weekOffset, setWeekOffset] = useState(0);

  // Sinh viên
  const [tuKhoa, setTuKhoa] = useState('');
  const [svList, setSvList] = useState<SinhVienSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSv, setSelectedSv] = useState<SinhVienSearchItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Lịch học
  const [loadingLich, setLoadingLich] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<LichGiangItem[]>([]);
  const [activeItem, setActiveItem] = useState<LichGiangItem | null>(null);

  const weekRange = useMemo(() => svc.getWeekRange(weekOffset), [weekOffset]);
  const days = useMemo(() => svc.getDaysOfWeek(weekRange.start), [weekRange.start]);

  const loadLich = useCallback(async () => {
    if (!selectedSv) return;
    try {
      const data = await svc.getLichSinhVien(
        selectedSv.ID,
        weekRange.startStr,
        weekRange.endStr
      );
      setItems(data || []);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được lịch học');
      setItems([]);
    } finally {
      setLoadingLich(false);
      setRefreshing(false);
    }
  }, [selectedSv, weekRange.startStr, weekRange.endStr]);

  useEffect(() => {
    if (selectedSv) {
      setLoadingLich(true);
      loadLich();
    }
  }, [loadLich, selectedSv]);

  // Search sinh viên — nếu kết quả 1 phần tử thì tự chọn luôn (như web)
  const doSearch = async () => {
    if (!tuKhoa.trim()) {
      Alert.alert('Thông báo', 'Nhập mã sinh viên trước khi tìm.');
      return;
    }
    setSearching(true);
    try {
      const list = await svc.searchSinhVien(tuKhoa.trim());
      setSvList(list);
      if (list.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy sinh viên phù hợp.');
      } else if (list.length === 1) {
        setSelectedSv(list[0]);
      } else {
        setPickerOpen(true);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Tìm kiếm thất bại');
    } finally {
      setSearching(false);
    }
  };

  const sections = useMemo(() => {
    const byDay: Record<string, LichGiangItem[]> = {};
    items.forEach((it) => {
      const key = it.NGAYHOC;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(it);
    });
    Object.keys(byDay).forEach((k) => {
      byDay[k].sort(
        (a, b) => a.GIOBATDAU * 60 + a.PHUTBATDAU - (b.GIOBATDAU * 60 + b.PHUTBATDAU)
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

  const totalBuoi = items.length;

  const renderItem = ({ item, index }: { item: LichGiangItem; index: number }) => {
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const time = `${pad2(item.GIOBATDAU)}:${pad2(item.PHUTBATDAU)} - ${pad2(item.GIOKETTHUC)}:${pad2(item.PHUTKETTHUC)}`;
    const tiet =
      item.TIETBATDAU != null && item.TIETKETTHUC != null
        ? `Tiết ${item.TIETBATDAU}-${item.TIETKETTHUC}`
        : '';
    return (
      <TouchableOpacity
        style={styles.lichCard}
        onPress={() => setActiveItem(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.lichStrip, { backgroundColor: color }]} />
        <View style={styles.lichBody}>
          <Text style={styles.lichTitle} numberOfLines={2}>
            {item.TENHOCPHAN || '(Không tên)'}
          </Text>
          <Text style={styles.lichLop} numberOfLines={1}>
            {item.TENLOPHOCPHAN}
          </Text>
          <View style={styles.lichMetaRow}>
            <MaterialIcons name="access-time" size={13} color="#64748B" />
            <Text style={styles.lichMeta}>
              {time}
              {tiet ? ` · ${tiet}` : ''}
            </Text>
          </View>
          {!!item.TENPHONGHOC && (
            <View style={styles.lichMetaRow}>
              <MaterialIcons name="room" size={13} color="#64748B" />
              <Text style={styles.lichMeta}>{item.TENPHONGHOC}</Text>
            </View>
          )}
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
          {section.data.length === 0 ? 'Không có buổi học' : `${section.data.length} buổi`}
        </Text>
      </View>
      {section.isToday && (
        <View style={styles.todayPill}>
          <Text style={styles.todayPillText}>HÔM NAY</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>TKB - Sinh viên</Text>
          <Text style={styles.headerSubtitle}>Tra cứu lịch học theo mã sinh viên</Text>
        </View>
      </View>

      {/* Tìm sinh viên */}
      <View style={styles.searchBox}>
        <Text style={styles.searchLabel}>Mã sinh viên</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập mã / họ tên sinh viên..."
            placeholderTextColor="#94A3B8"
            value={tuKhoa}
            onChangeText={setTuKhoa}
            returnKeyType="search"
            onSubmitEditing={doSearch}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={doSearch}
            disabled={searching}
            activeOpacity={0.85}
          >
            {searching ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <MaterialIcons name="search" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        {selectedSv ? (
          <TouchableOpacity
            style={styles.selectedCard}
            onPress={() => svList.length > 1 && setPickerOpen(true)}
            activeOpacity={svList.length > 1 ? 0.7 : 1}
          >
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {(selectedSv.TEN || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selectedSv.HODEM} {selectedSv.TEN}
              </Text>
              <Text style={styles.selectedMeta} numberOfLines={1}>
                {selectedSv.MASO}
                {selectedSv.DAOTAO_LOPQUANLY_TEN ? ` · ${selectedSv.DAOTAO_LOPQUANLY_TEN}` : ''}
              </Text>
            </View>
            {svList.length > 1 && (
              <MaterialIcons name="swap-vert" size={20} color="#1E3A8A" />
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.searchHint}>
            Chưa chọn sinh viên. Nhập mã hoặc họ tên rồi bấm tìm.
          </Text>
        )}
      </View>

      {selectedSv && (
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
              {fmtDateShort(weekRange.start)} – {fmtDateShort(weekRange.end)} ({totalBuoi} buổi)
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
      )}

      {!selectedSv ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="person-search" size={56} color="#94a3b8" />
          <Text style={styles.muted}>Chọn sinh viên để xem thời khóa biểu</Text>
        </View>
      ) : loadingLich ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải lịch học...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => item.ID || `${i}`}
          renderItem={renderItem}
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

      {/* Modal chọn sinh viên */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Chọn sinh viên ({svList.length})</Text>
            <FlatList
              data={svList}
              keyExtractor={(item, idx) => `${item.ID}_${idx}`}
              renderItem={({ item }) => {
                const active = selectedSv?.ID === item.ID;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedSv(item);
                      setPickerOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerName, active && styles.pickerNameActive]}>
                        {item.HODEM} {item.TEN}
                      </Text>
                      <Text style={styles.pickerMeta}>
                        {item.MASO}
                        {item.DAOTAO_LOPQUANLY_TEN ? ` · ${item.DAOTAO_LOPQUANLY_TEN}` : ''}
                      </Text>
                    </View>
                    {active && <MaterialIcons name="check" size={20} color="#1E3A8A" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal chi tiết buổi học */}
      <Modal
        visible={!!activeItem}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveItem(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle} numberOfLines={2}>
                {activeItem?.TENHOCPHAN}
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
                  <Row label="Tiết" value={`${activeItem.TIETBATDAU} - ${activeItem.TIETKETTHUC}`} />
                )}
              </View>
            )}
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

  searchBox: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchLabel: { fontSize: 12, color: '#475569', fontWeight: '700' },
  searchHint: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 14,
  },
  searchBtn: {
    width: 44,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  selectedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: { color: '#FFFFFF', fontWeight: '700' },
  selectedName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  selectedMeta: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 1 },

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

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemActive: { backgroundColor: '#EFF6FF' },
  pickerName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  pickerNameActive: { color: '#1E3A8A', fontWeight: '700' },
  pickerMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },

  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  detailTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginRight: 12 },
  detailRow: { flexDirection: 'row', paddingVertical: 6 },
  detailRowLabel: { width: 90, fontSize: 13, color: '#64748B', fontWeight: '600' },
  detailRowValue: { flex: 1, fontSize: 13, color: '#0F172A' },
});

export default LecturerStudentScheduleScreen;
