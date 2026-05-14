// Thời khóa biểu / Lịch giảng cá nhân (CCB.TKH)
// Web có grid 7 cột (calendar tuần). Mobile dùng SectionList: section = 1 ngày, item = 1 buổi học.
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
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerScheduleService as svc,
  LichGiangItem,
  HocKyItem,
  DoiLichItem,
} from '../../services/giangVien/lecturerScheduleService';
import LecturerAttendanceModal from '../../components/LecturerAttendanceModal';
import LecturerScheduleChangeModal from '../../components/LecturerScheduleChangeModal';

const VN_THU_LABEL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_THU_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateShort = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

// Map ID lớp HP → màu — để cùng lớp có cùng màu trong tuần
const COLOR_PALETTE = [
  '#1E40AF',
  '#10b981',
  '#f59e0b',
  '#dc2626',
  '#9333ea',
  '#0ea5e9',
  '#ec4899',
  '#14b8a6',
];
const colorForId = (id: string, idx: number) => COLOR_PALETTE[idx % COLOR_PALETTE.length];

const LecturerScheduleScreen = () => {
  const navigation = useNavigation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<LichGiangItem[]>([]);
  const [activeItem, setActiveItem] = useState<LichGiangItem | null>(null);

  // Sidebar phụ: học kỳ + báo cáo + DS lớp đổi lịch
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hocKyList, setHocKyList] = useState<HocKyItem[]>([]);
  const [hocKyId, setHocKyId] = useState('');
  const [doiLichList, setDoiLichList] = useState<DoiLichItem[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [hocKyPickerOpen, setHocKyPickerOpen] = useState(false);

  // Modal điểm danh + đổi lịch
  const [attendanceLich, setAttendanceLich] = useState<LichGiangItem | null>(null);
  const [scheduleChangeLich, setScheduleChangeLich] = useState<LichGiangItem | null>(null);

  const weekRange = useMemo(() => svc.getWeekRange(weekOffset), [weekOffset]);
  const days = useMemo(() => svc.getDaysOfWeek(weekRange.start), [weekRange.start]);

  const load = useCallback(async () => {
    try {
      const data = await svc.getLichGiang(weekRange.startStr, weekRange.endStr);
      setItems(data || []);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được lịch giảng');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekRange.startStr, weekRange.endStr]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Load học kỳ + DS đổi lịch 1 lần (lazy khi mở sidebar lần đầu)
  const loadSidebarData = useCallback(async () => {
    setLoadingSidebar(true);
    try {
      const [hk, dl] = await Promise.all([svc.getHocKy(), svc.getDSDoiLich()]);
      setHocKyList(hk);
      if (hk.length > 0 && !hocKyId) setHocKyId(hk[0].ID);
      setDoiLichList(dl);
    } catch (e: any) {
      console.warn('[Schedule] loadSidebar:', e?.message);
    } finally {
      setLoadingSidebar(false);
    }
  }, [hocKyId]);

  useEffect(() => {
    // Preload (không await) sau khi mount để badge số lượng hiển thị sớm
    loadSidebarData();
  }, []);

  const openSidebar = () => {
    setSidebarOpen(true);
    if (hocKyList.length === 0 || doiLichList.length === 0) loadSidebarData();
  };

  // Group items theo NGAYHOC, sắp xếp theo giờ
  const sections = useMemo(() => {
    const byDay: Record<string, LichGiangItem[]> = {};
    items.forEach((it) => {
      const key = it.NGAYHOC;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(it);
    });
    // Sort items theo giờ
    Object.keys(byDay).forEach((k) => {
      byDay[k].sort((a, b) => {
        const ta = a.GIOBATDAU * 60 + a.PHUTBATDAU;
        const tb = b.GIOBATDAU * 60 + b.PHUTBATDAU;
        return ta - tb;
      });
    });
    // Build sections cho từng ngày trong tuần (kể cả ngày không có buổi học)
    return days.map((d) => {
      const key = fmtDate(d);
      const isToday = key === fmtDate(new Date());
      return {
        date: d,
        dateStr: key,
        thuLabel: VN_THU_LABEL[d.getDay()],
        isToday,
        data: byDay[key] || [],
      };
    });
  }, [items, days]);

  const totalBuoi = items.length;
  const lopHpIds = useMemo(() => {
    const set: string[] = [];
    items.forEach((it) => {
      if (!set.includes(it.IDLOPHOCPHAN)) set.push(it.IDLOPHOCPHAN);
    });
    return set;
  }, [items]);

  const renderItem = ({ item }: { item: LichGiangItem }) => {
    const idx = lopHpIds.indexOf(item.IDLOPHOCPHAN);
    const color = colorForId(item.IDLOPHOCPHAN, idx >= 0 ? idx : 0);
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
          <Text style={styles.headerTitle}>Lịch giảng</Text>
          <Text style={styles.headerSubtitle}>Thời khóa biểu cá nhân</Text>
        </View>
        <TouchableOpacity onPress={openSidebar} style={styles.headerActionBtn} activeOpacity={0.7}>
          <MaterialIcons name="swap-horiz" size={20} color="#FFFFFF" />
          {doiLichList.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{doiLichList.length}</Text>
            </View>
          )}
        </TouchableOpacity>
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
            {fmtDateShort(weekRange.start)} – {fmtDateShort(weekRange.end)} (
            {totalBuoi} buổi)
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

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
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
                load();
              }}
            />
          }
        />
      )}

      {/* Modal sidebar: Học kỳ + Báo cáo + Lớp đổi lịch */}
      <Modal
        visible={sidebarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSidebarOpen(false)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.sidebarSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Tiện ích lịch giảng</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 600 }}>
              {/* Combo Học kỳ */}
              <Text style={styles.sectionLabel}>Học kỳ (cho báo cáo)</Text>
              <TouchableOpacity
                style={styles.hocKyPicker}
                onPress={() => hocKyList.length > 0 && setHocKyPickerOpen(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.hocKyPickerText,
                    !hocKyId && { color: '#94A3B8' },
                  ]}
                  numberOfLines={1}
                >
                  {hocKyList.find((h) => h.ID === hocKyId)?.THOIGIAN || 'Chọn học kỳ'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() =>
                  Alert.alert('Báo cáo', 'Xuất báo cáo Excel sẽ được phát triển sau.')
                }
                activeOpacity={0.85}
              >
                <MaterialIcons name="file-download" size={18} color="#FFFFFF" />
                <Text style={styles.reportBtnText}>Báo cáo</Text>
              </TouchableOpacity>

              {/* List lớp đổi lịch */}
              <View style={styles.dlSectionHeader}>
                <MaterialIcons name="swap-horiz" size={16} color="#FFFFFF" />
                <Text style={styles.dlSectionTitle}>
                  Danh sách lớp đổi lịch ({doiLichList.length})
                </Text>
              </View>

              {loadingSidebar ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator color="#1E3A8A" />
                </View>
              ) : doiLichList.length === 0 ? (
                <View style={styles.dlEmpty}>
                  <Text style={styles.muted}>Chưa có yêu cầu đổi lịch nào.</Text>
                </View>
              ) : (
                doiLichList.map((it) => (
                  <View key={it.ID} style={styles.dlCard}>
                    <Text style={styles.dlLop} numberOfLines={2}>
                      Lớp: {it.LOPHOCPHAN_TEN}
                    </Text>
                    <View style={styles.dlStatusRow}>
                      <Text style={styles.dlStatusLabel}>Trạng thái:</Text>
                      <View style={[styles.dlStatusBadge, statusColor(it.KETQUAXULY)]}>
                        <Text style={[styles.dlStatusText, statusColorText(it.KETQUAXULY)]}>
                          {it.KETQUAXULY || '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        {/* Picker học kỳ nested */}
        <Modal
          transparent
          animationType="fade"
          visible={hocKyPickerOpen}
          onRequestClose={() => setHocKyPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => setHocKyPickerOpen(false)}
          >
            <View style={[styles.sidebarSheet, { maxHeight: '60%' }]}>
              <Text style={styles.detailTitle}>Chọn học kỳ</Text>
              <ScrollView style={{ marginTop: 12, maxHeight: 360 }}>
                {hocKyList.map((h) => (
                  <TouchableOpacity
                    key={h.ID}
                    style={[styles.hkItem, hocKyId === h.ID && styles.hkItemActive]}
                    onPress={() => {
                      setHocKyId(h.ID);
                      setHocKyPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.hkItemText,
                        hocKyId === h.ID && { color: '#1E3A8A', fontWeight: '700' },
                      ]}
                    >
                      {h.THOIGIAN}
                    </Text>
                    {hocKyId === h.ID && (
                      <MaterialIcons name="check" size={20} color="#1E3A8A" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
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
              <Text style={styles.detailTitle}>Chi tiết buổi học</Text>
              <TouchableOpacity onPress={() => setActiveItem(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activeItem && (
              <ScrollView style={{ maxHeight: 480 }}>
                <Text style={styles.detailName}>{activeItem.TENHOCPHAN}</Text>
                <Text style={styles.detailLop}>{activeItem.TENLOPHOCPHAN}</Text>

                <View style={styles.detailSection}>
                  <DetailRow label="Ngày học" value={activeItem.NGAYHOC} />
                  <DetailRow
                    label="Thời gian"
                    value={`${pad2(activeItem.GIOBATDAU)}:${pad2(activeItem.PHUTBATDAU)} - ${pad2(activeItem.GIOKETTHUC)}:${pad2(activeItem.PHUTKETTHUC)}`}
                    valueBold
                  />
                  <DetailRow
                    label="Tiết"
                    value={
                      activeItem.TIETBATDAU != null && activeItem.TIETKETTHUC != null
                        ? `${activeItem.TIETBATDAU} - ${activeItem.TIETKETTHUC}`
                        : '-'
                    }
                  />
                  <DetailRow label="Phòng học" value={activeItem.TENPHONGHOC} valueBold />
                </View>

                {/* Actions */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.detailAction}
                    onPress={() => {
                      const item = activeItem;
                      setActiveItem(null);
                      setAttendanceLich(item);
                    }}
                  >
                    <MaterialIcons name="how-to-reg" size={18} color="#10b981" />
                    <Text style={[styles.detailActionText, { color: '#10b981' }]}>Điểm danh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailAction}
                    onPress={() => {
                      const item = activeItem;
                      setActiveItem(null);
                      setScheduleChangeLich(item);
                    }}
                  >
                    <MaterialIcons name="swap-horiz" size={18} color="#f59e0b" />
                    <Text style={[styles.detailActionText, { color: '#f59e0b' }]}>Đổi lịch</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal điểm danh / DS sinh viên */}
      <LecturerAttendanceModal
        visible={!!attendanceLich}
        lich={attendanceLich}
        onClose={() => setAttendanceLich(null)}
      />

      {/* Modal đổi lịch */}
      <LecturerScheduleChangeModal
        visible={!!scheduleChangeLich}
        lich={scheduleChangeLich}
        onClose={() => {
          setScheduleChangeLich(null);
          // Reload DS đổi lịch để badge cập nhật
          loadSidebarData();
        }}
      />
    </SafeAreaView>
  );
};

// Màu badge theo trạng thái xử lý đổi lịch
const statusColor = (kq: string) => {
  const k = (kq || '').toLowerCase();
  if (k.includes('duyệt') || k.includes('duyet')) return { backgroundColor: '#ECFDF5' };
  if (k.includes('từ chối') || k.includes('huỷ')) return { backgroundColor: '#FEE2E2' };
  if (k.includes('chờ') || k.includes('cho')) return { backgroundColor: '#FFFBEB' };
  return { backgroundColor: '#F1F5F9' };
};
const statusColorText = (kq: string) => {
  const k = (kq || '').toLowerCase();
  if (k.includes('duyệt') || k.includes('duyet')) return { color: '#10b981' };
  if (k.includes('từ chối') || k.includes('huỷ')) return { color: '#DC2626' };
  if (k.includes('chờ') || k.includes('cho')) return { color: '#f59e0b' };
  return { color: '#475569' };
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

  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 4,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  weekNavCenter: { flex: 1, alignItems: 'center' },
  weekNavLabel: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  weekNavRange: { fontSize: 11, color: '#64748B', marginTop: 2 },
  weekNavToday: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
  },

  // Day section header
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayHeaderToday: { backgroundColor: '#EFF6FF' },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeToday: { backgroundColor: '#1E3A8A' },
  dayBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dayBadgeTextToday: { color: '#FFFFFF' },
  dayTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  dayTitleToday: { color: '#1E3A8A' },
  dayCount: { fontSize: 11, color: '#64748B', marginTop: 2 },
  todayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
  },
  todayPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Lich card
  lichCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
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
  lichTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  lichLop: { fontSize: 12, color: '#1E3A8A', marginTop: 2, fontWeight: '600' },
  lichMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  lichMeta: { fontSize: 12, color: '#475569' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13 },

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
  detailName: { fontSize: 18, fontWeight: '700', color: '#1E3A8A' },
  detailLop: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8 },
  detailSection: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
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
  detailActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  detailAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  detailActionText: { fontSize: 12, fontWeight: '700' },

  // Header action button (Lớp đổi lịch)
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },

  // Sidebar modal
  sidebarSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '85%',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 6,
  },
  hocKyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  hocKyPickerText: { flex: 1, color: '#0F172A', fontSize: 14 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  reportBtnText: { color: '#FFFFFF', fontWeight: '700' },

  // List lớp đổi lịch
  dlSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 18,
    marginBottom: 8,
  },
  dlSectionTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  dlEmpty: { paddingVertical: 20, alignItems: 'center' },
  dlCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dlLop: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  dlStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  dlStatusLabel: { fontSize: 13, color: '#64748B' },
  dlStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dlStatusText: { fontSize: 12, fontWeight: '700' },

  // Picker học kỳ nested
  hkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  hkItemActive: { backgroundColor: '#EFF6FF' },
  hkItemText: { fontSize: 14, color: '#475569', flex: 1 },
});

export default LecturerScheduleScreen;
