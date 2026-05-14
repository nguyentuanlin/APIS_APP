// Lịch giảng đường - theo dõi bận rỗi GIẢNG VIÊN (CCB.TKHNPHGV)
// Port `lichgiangnhieuphonghocgiangvien.html` + `.js`. Cấu trúc tương tự màn theo dõi
// bận rỗi phòng học nhưng thay phòng = cán bộ, tòa nhà = khoa/đơn vị.
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
  lecturerBusyTrackingService as svc,
  DonViItem,
  CanBoItem,
} from '../../services/giangVien/lecturerBusyTrackingService';
import {
  lecturerScheduleService as schedSvc,
  LichGiangItem,
} from '../../services/giangVien/lecturerScheduleService';

const VN_THU_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad2 = (n: number | string) => {
  const s = String(n ?? '');
  return s.length < 2 ? '0' + s : s;
};
const fmtDate = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateShort = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

const SESSIONS = [
  { key: 'SANG', label: 'Sáng', min: 1, max: 6 },
  { key: 'CHIEU', label: 'Chiều', min: 7, max: 10 },
  { key: 'TOI', label: 'Tối', min: 11, max: 15 },
];

interface CanBoScheduleEntry {
  canBo: CanBoItem;
  schedules: LichGiangItem[];
}

const tietOf = (s: LichGiangItem): { start: number; end: number } | null => {
  const start = Number(s.TIETBATDAU);
  const end = Number(s.TIETKETTHUC);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
};

const buildGrid = (
  schedules: LichGiangItem[],
  weekDays: Date[]
): LichGiangItem[][][] => {
  const grid: LichGiangItem[][][] = weekDays.map(() => SESSIONS.map(() => []));
  schedules.forEach((s) => {
    const dayIdx = weekDays.findIndex((d) => fmtDate(d) === s.NGAYHOC);
    if (dayIdx < 0) return;
    const tiet = tietOf(s);
    if (!tiet) return;
    SESSIONS.forEach((sess, sessIdx) => {
      if (tiet.start <= sess.max && tiet.end >= sess.min) {
        grid[dayIdx][sessIdx].push(s);
      }
    });
  });
  return grid;
};

const efficiencyOf = (grid: LichGiangItem[][][]): number => {
  let used = 0;
  let total = 0;
  grid.forEach((day) =>
    day.forEach((slot) => {
      total++;
      if (slot.length > 0) used++;
    })
  );
  return total === 0 ? 0 : Math.round((used * 100) / total);
};

const effColor = (eff: number) => {
  if (eff >= 60) return { bg: '#10B981', label: 'Cao' };
  if (eff >= 30) return { bg: '#f59e0b', label: 'TB' };
  return { bg: '#64748B', label: 'Thấp' };
};

// Picker đơn (đơn vị / cán bộ đơn) — có search bar
function FilterPickerSheet<
  T extends { ID: string; TEN?: string; DISPLAY?: string; MA?: string }
>(props: {
  visible: boolean;
  onClose: () => void;
  data: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  title: string;
  emptyLabel: string;
  // Custom render label (cán bộ dùng DISPLAY)
  getLabel?: (it: T) => string;
}) {
  const { visible, onClose, data, selectedId, onSelect, title, emptyLabel, getLabel } = props;
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (visible) setKeyword('');
  }, [visible]);
  const labelOf = (it: T) => (getLabel ? getLabel(it) : it.DISPLAY || it.TEN || '');
  const filtered = useMemo(() => {
    const items = [{ ID: '', TEN: emptyLabel } as T, ...data];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (it) =>
        it.ID === '' ||
        labelOf(it).toLowerCase().includes(kw) ||
        (it.MA || '').toLowerCase().includes(kw)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, keyword, emptyLabel]);

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

// Multi-select cán bộ
const MultiCanBoPickerSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  data: CanBoItem[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}> = ({ visible, onClose, data, selectedIds, onConfirm }) => {
  const [keyword, setKeyword] = useState('');
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));
  useEffect(() => {
    if (visible) {
      setKeyword('');
      setDraft(new Set(selectedIds));
    }
  }, [visible, selectedIds]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return data;
    return data.filter(
      (it) =>
        (it.DISPLAY || '').toLowerCase().includes(kw) ||
        (it.MASO || '').toLowerCase().includes(kw)
    );
  }, [data, keyword]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    const allVisibleIds = filtered.map((p) => p.ID);
    const allChecked = allVisibleIds.every((id) => draft.has(id));
    setDraft((prev) => {
      const next = new Set(prev);
      if (allChecked) allVisibleIds.forEach((id) => next.delete(id));
      else allVisibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { maxHeight: '85%' }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Chọn nhiều giảng viên</Text>
              <Text style={styles.sheetSubtitle}>Đã chọn {draft.size} GV</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchWrap}>
            <MaterialIcons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Tìm theo mã / tên giảng viên..."
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

          <TouchableOpacity style={styles.multiSelectAllRow} onPress={toggleAllVisible}>
            <MaterialIcons
              name={
                filtered.length > 0 && filtered.every((p) => draft.has(p.ID))
                  ? 'check-box'
                  : 'check-box-outline-blank'
              }
              size={20}
              color="#1E3A8A"
            />
            <Text style={styles.multiSelectAllText}>
              Chọn tất cả ({filtered.length}) GV hiển thị
            </Text>
          </TouchableOpacity>

          <FlatList
            style={{ maxHeight: 380 }}
            data={filtered}
            keyExtractor={(item, idx) => `${item.ID}_${idx}_m`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const checked = draft.has(item.ID);
              return (
                <TouchableOpacity
                  style={[styles.multiItem, checked && styles.multiItemChecked]}
                  onPress={() => toggle(item.ID)}
                >
                  <MaterialIcons
                    name={checked ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={checked ? '#1E3A8A' : '#94A3B8'}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.multiItemText} numberOfLines={1}>
                      {item.HODEM} {item.TEN}
                    </Text>
                    <Text style={styles.multiItemMeta} numberOfLines={1}>
                      {item.MASO}
                      {item.DAOTAO_COCAUTOCHUC_TEN ? ` · ${item.DAOTAO_COCAUTOCHUC_TEN}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={styles.muted}>Không tìm thấy giảng viên</Text>
              </View>
            }
          />

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnCancel]}
              onPress={() => setDraft(new Set())}
            >
              <Text style={styles.sheetBtnCancelText}>Bỏ chọn tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}
              onPress={() => {
                onConfirm(Array.from(draft));
                onClose();
              }}
            >
              <Text style={styles.sheetBtnPrimaryText}>Xong ({draft.size})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const LecturerBusyTrackingScreen = () => {
  const navigation = useNavigation();
  const [weekOffset, setWeekOffset] = useState(0);

  const [donViList, setDonViList] = useState<DonViItem[]>([]);
  const [donViId, setDonViId] = useState('');
  const [donViPickerOpen, setDonViPickerOpen] = useState(false);

  const [canBoList, setCanBoList] = useState<CanBoItem[]>([]);
  const [canBoListAll, setCanBoListAll] = useState<CanBoItem[]>([]);
  const [singleCanBoId, setSingleCanBoId] = useState('');
  const [canBoPickerOpen, setCanBoPickerOpen] = useState(false);

  const [multiCanBoIds, setMultiCanBoIds] = useState<string[]>([]);
  const [multiPickerOpen, setMultiPickerOpen] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingCanBo, setLoadingCanBo] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canBoSchedules, setCanBoSchedules] = useState<CanBoScheduleEntry[]>([]);

  const [activeMode, setActiveMode] = useState<'single' | 'multi' | 'all' | null>(null);

  const [slotDetail, setSlotDetail] = useState<{
    canBo: CanBoItem;
    day: Date;
    session: (typeof SESSIONS)[number];
    events: LichGiangItem[];
  } | null>(null);

  const weekRange = useMemo(() => schedSvc.getWeekRange(weekOffset), [weekOffset]);
  const days = useMemo(() => schedSvc.getDaysOfWeek(weekRange.start), [weekRange.start]);

  // Init: load đơn vị + cán bộ
  useEffect(() => {
    (async () => {
      try {
        const [dvs, cbs] = await Promise.all([svc.getDonViList(), svc.getCanBoList()]);
        setDonViList(dvs);
        setCanBoList(cbs);
        setCanBoListAll(cbs);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu khởi tạo');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const onChangeDonVi = async (id: string) => {
    setDonViId(id);
    setSingleCanBoId('');
    setMultiCanBoIds([]);
    setLoadingCanBo(true);
    try {
      const cbs = await svc.getCanBoList({ donViId: id });
      setCanBoList(cbs);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được giảng viên');
    } finally {
      setLoadingCanBo(false);
    }
  };

  const resolveCanBos = useCallback(
    (mode: 'single' | 'multi' | 'all'): CanBoItem[] => {
      if (mode === 'all') return canBoListAll;
      if (mode === 'multi') {
        if (multiCanBoIds.length === 0) return [];
        const set = new Set(multiCanBoIds);
        return canBoList.filter((p) => set.has(p.ID));
      }
      if (singleCanBoId) return canBoList.filter((p) => p.ID === singleCanBoId);
      return canBoList;
    },
    [canBoList, canBoListAll, singleCanBoId, multiCanBoIds]
  );

  const loadSchedules = useCallback(
    async (mode: 'single' | 'multi' | 'all') => {
      const cbs = resolveCanBos(mode);
      if (cbs.length === 0) {
        if (mode === 'multi') Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 giảng viên');
        else if (mode === 'single')
          Alert.alert('Thông báo', 'Vui lòng chọn khoa/đơn vị hoặc giảng viên trước.');
        else Alert.alert('Thông báo', 'Không có giảng viên nào để hiển thị.');
        setCanBoSchedules([]);
        setLoadingData(false);
        setRefreshing(false);
        return;
      }
      setActiveMode(mode);
      setLoadingData(true);
      const limited = cbs.slice(0, 20);
      try {
        const results = await Promise.all(
          limited.map(async (canBo) => {
            try {
              const sch = await schedSvc.getLichGiang(
                weekRange.startStr,
                weekRange.endStr,
                canBo.ID
              );
              return { canBo, schedules: sch || [] } as CanBoScheduleEntry;
            } catch {
              return { canBo, schedules: [] } as CanBoScheduleEntry;
            }
          })
        );
        setCanBoSchedules(results);
      } finally {
        setLoadingData(false);
        setRefreshing(false);
      }
    },
    [resolveCanBos, weekRange.startStr, weekRange.endStr]
  );

  useEffect(() => {
    if (canBoSchedules.length > 0 && activeMode) loadSchedules(activeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRange.startStr]);

  const onXemLich = () => loadSchedules('single');
  const onXemNhieu = () => loadSchedules('multi');
  const onXemTatCa = () => {
    setDonViId('');
    setSingleCanBoId('');
    setMultiCanBoIds([]);
    setCanBoList(canBoListAll);
    loadSchedules('all');
  };

  const renderCanBoCard = ({ item }: { item: CanBoScheduleEntry }) => {
    const { canBo, schedules } = item;
    const grid = buildGrid(schedules, days);
    const eff = efficiencyOf(grid);
    const c = effColor(eff);
    return (
      <View style={styles.cbCard}>
        <View style={styles.cbHeader}>
          <View style={styles.cbAvatar}>
            <Text style={styles.cbAvatarText}>
              {(canBo.TEN || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cbName} numberOfLines={1}>
              {canBo.HODEM} {canBo.TEN}
            </Text>
            <Text style={styles.cbMeta} numberOfLines={1}>
              {canBo.MASO}
              {canBo.DAOTAO_COCAUTOCHUC_TEN ? ` · ${canBo.DAOTAO_COCAUTOCHUC_TEN}` : ''}
            </Text>
          </View>
          <View style={[styles.effBox, { backgroundColor: c.bg }]}>
            <Text style={styles.effPercent}>{eff}%</Text>
            <Text style={styles.effLabel}>{c.label}</Text>
          </View>
        </View>

        <Text style={styles.cbCount}>{schedules.length} buổi dạy trong tuần</Text>

        {/* Mini grid */}
        <View style={styles.gridHeader}>
          <View style={styles.gridSessionLabel} />
          {days.map((d, i) => {
            const isToday = fmtDate(d) === fmtDate(new Date());
            return (
              <View key={i} style={styles.gridDayHeader}>
                <Text style={[styles.gridDayThu, isToday && styles.gridDayThuToday]}>
                  {VN_THU_SHORT[d.getDay()]}
                </Text>
                <Text style={[styles.gridDayDate, isToday && styles.gridDayThuToday]}>
                  {pad2(d.getDate())}
                </Text>
              </View>
            );
          })}
        </View>

        {SESSIONS.map((sess, sessIdx) => (
          <View key={sess.key} style={styles.gridRow}>
            <View style={styles.gridSessionLabel}>
              <Text style={styles.gridSessionText}>{sess.label}</Text>
              <Text style={styles.gridSessionTime}>T{sess.min}-{sess.max}</Text>
            </View>
            {days.map((d, dayIdx) => {
              const events = grid[dayIdx][sessIdx];
              const has = events.length > 0;
              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={[styles.gridCell, has && styles.gridCellHas]}
                  onPress={() =>
                    has && setSlotDetail({ canBo, day: d, session: sess, events })
                  }
                  disabled={!has}
                  activeOpacity={has ? 0.7 : 1}
                >
                  {has && <Text style={styles.gridCellCount}>{events.length}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
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
          <Text style={styles.headerTitle}>Lịch giảng đường</Text>
          <Text style={styles.headerSubtitle}>Theo dõi bận rỗi giảng viên</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <>
          <View style={styles.filterBox}>
            <Text style={styles.filterLabel}>Khoa/Đơn vị</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => setDonViPickerOpen(true)}>
              <Text style={styles.pickerFieldText} numberOfLines={1}>
                {donViList.find((t) => t.ID === donViId)?.TEN || 'Tất cả khoa/đơn vị'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Giảng viên</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setCanBoPickerOpen(true)}
              disabled={loadingCanBo}
            >
              <Text style={styles.pickerFieldText} numberOfLines={1}>
                {loadingCanBo
                  ? 'Đang tải...'
                  : canBoList.find((p) => p.ID === singleCanBoId)?.DISPLAY ||
                    `Tất cả GV (${canBoList.length})`}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Chọn nhiều giảng viên</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setMultiPickerOpen(true)}
            >
              <Text
                style={[
                  styles.pickerFieldText,
                  multiCanBoIds.length === 0 && styles.pickerFieldPlaceholder,
                ]}
                numberOfLines={1}
              >
                {multiCanBoIds.length === 0
                  ? 'Chọn nhiều giảng viên...'
                  : `Đã chọn ${multiCanBoIds.length} GV`}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>
            {multiCanBoIds.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {multiCanBoIds.map((id) => {
                  const cb =
                    canBoList.find((p) => p.ID === id) || canBoListAll.find((p) => p.ID === id);
                  if (!cb) return null;
                  return (
                    <View key={id} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {cb.HODEM} {cb.TEN}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setMultiCanBoIds((prev) => prev.filter((x) => x !== id))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnPrimary]}
                onPress={onXemLich}
                disabled={loadingData}
                activeOpacity={0.85}
              >
                <MaterialIcons name="search" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Xem lịch GV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnInfo]}
                onPress={onXemNhieu}
                disabled={loadingData}
                activeOpacity={0.85}
              >
                <MaterialIcons name="layers" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Xem nhiều GV</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.actionBtnFull, styles.btnOutline]}
              onPress={onXemTatCa}
              disabled={loadingData}
              activeOpacity={0.85}
            >
              <MaterialIcons name="view-list" size={14} color="#1E3A8A" />
              <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>
                Xem tất cả lịch giảng
              </Text>
            </TouchableOpacity>
            {loadingData && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <ActivityIndicator color="#1E3A8A" size="small" />
                <Text style={styles.muted}>Đang tải...</Text>
              </View>
            )}
          </View>

          {canBoSchedules.length > 0 && (
            <View style={styles.weekNav}>
              <TouchableOpacity
                style={styles.weekNavBtn}
                onPress={() => setWeekOffset((w) => w - 1)}
              >
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
                  {fmtDateShort(weekRange.start)} – {fmtDateShort(weekRange.end)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.weekNavBtn}
                onPress={() => setWeekOffset((w) => w + 1)}
              >
                <MaterialIcons name="chevron-right" size={24} color="#1E3A8A" />
              </TouchableOpacity>
              {weekOffset !== 0 && (
                <TouchableOpacity style={styles.weekNavToday} onPress={() => setWeekOffset(0)}>
                  <MaterialIcons name="today" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {loadingData ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải lịch các giảng viên...</Text>
            </View>
          ) : (
            <FlatList
              data={canBoSchedules}
              keyExtractor={(item, i) => `${item.canBo.ID}_${i}`}
              renderItem={renderCanBoCard}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    if (activeMode) loadSchedules(activeMode);
                  }}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <MaterialIcons name="people" size={48} color="#94a3b8" />
                  <Text style={styles.muted}>
                    Chọn bộ lọc rồi bấm "Xem lịch GV" để xem bận rỗi giảng viên.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Picker đơn vị */}
      <FilterPickerSheet
        visible={donViPickerOpen}
        onClose={() => setDonViPickerOpen(false)}
        data={donViList}
        selectedId={donViId}
        title="Chọn khoa/đơn vị"
        emptyLabel="Tất cả khoa/đơn vị"
        onSelect={(item) => {
          setDonViPickerOpen(false);
          onChangeDonVi(item.ID);
        }}
      />

      {/* Picker cán bộ đơn */}
      <FilterPickerSheet
        visible={canBoPickerOpen}
        onClose={() => setCanBoPickerOpen(false)}
        data={canBoList}
        selectedId={singleCanBoId}
        title="Chọn giảng viên"
        emptyLabel={`Tất cả GV (${canBoList.length})`}
        getLabel={(it: CanBoItem) => it.DISPLAY || `${it.HODEM} ${it.TEN}`}
        onSelect={(item) => {
          setSingleCanBoId(item.ID);
          setCanBoPickerOpen(false);
        }}
      />

      {/* Multi-select cán bộ */}
      <MultiCanBoPickerSheet
        visible={multiPickerOpen}
        onClose={() => setMultiPickerOpen(false)}
        data={canBoList}
        selectedIds={multiCanBoIds}
        onConfirm={(ids) => setMultiCanBoIds(ids)}
      />

      {/* Modal chi tiết slot */}
      <Modal
        visible={!!slotDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotDetail(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {slotDetail?.canBo.HODEM} {slotDetail?.canBo.TEN}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {slotDetail
                    ? `${slotDetail.session.label} · ${VN_THU_SHORT[slotDetail.day.getDay()]} ${fmtDateShort(slotDetail.day)}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSlotDetail(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              {slotDetail?.events.map((ev, idx) => (
                <View key={idx} style={styles.eventCard}>
                  <View style={[styles.eventStrip, { backgroundColor: '#1E40AF' }]} />
                  <View style={{ flex: 1, padding: 10 }}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {ev.TENHOCPHAN || '(Không tên)'}
                    </Text>
                    {!!ev.TENLOPHOCPHAN && (
                      <Text style={styles.eventLop}>{ev.TENLOPHOCPHAN}</Text>
                    )}
                    <View style={styles.eventRow}>
                      <MaterialIcons name="access-time" size={13} color="#64748B" />
                      <Text style={styles.eventMeta}>
                        {pad2(ev.GIOBATDAU)}:{pad2(ev.PHUTBATDAU)} -{' '}
                        {pad2(ev.GIOKETTHUC)}:{pad2(ev.PHUTKETTHUC)}
                        {ev.TIETBATDAU != null && ev.TIETKETTHUC != null
                          ? ` · Tiết ${ev.TIETBATDAU}-${ev.TIETKETTHUC}`
                          : ''}
                      </Text>
                    </View>
                    {!!ev.TENPHONGHOC && (
                      <View style={styles.eventRow}>
                        <MaterialIcons name="room" size={13} color="#64748B" />
                        <Text style={styles.eventMeta}>{ev.TENPHONGHOC}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
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

  chipScroll: { marginTop: 6, flexGrow: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    maxWidth: 200,
  },
  chipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  btnPrimary: { backgroundColor: '#1E3A8A' },
  btnInfo: { backgroundColor: '#0ea5e9' },
  btnOutline: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

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

  // Card cán bộ
  cbCard: {
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
  cbHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cbAvatarText: { color: '#FFFFFF', fontWeight: '700' },
  cbName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cbMeta: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  cbCount: { fontSize: 11, color: '#64748B', marginTop: 6, marginBottom: 8 },
  effBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  effPercent: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  effLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '600', marginTop: 1 },

  gridHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  gridSessionLabel: { width: 50, paddingVertical: 4, justifyContent: 'center' },
  gridSessionText: { fontSize: 11, fontWeight: '700', color: '#1E3A8A' },
  gridSessionTime: { fontSize: 9, color: '#94A3B8' },
  gridDayHeader: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  gridDayThu: { fontSize: 10, fontWeight: '700', color: '#475569' },
  gridDayThuToday: { color: '#1E3A8A' },
  gridDayDate: { fontSize: 10, color: '#94A3B8' },
  gridRow: { flexDirection: 'row', paddingVertical: 2 },
  gridCell: {
    flex: 1,
    marginHorizontal: 1,
    height: 28,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellHas: { backgroundColor: '#1E40AF' },
  gridCellCount: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

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

  multiSelectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  multiSelectAllText: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  multiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  multiItemChecked: { backgroundColor: '#EFF6FF' },
  multiItemText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  multiItemMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },

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
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  sheetSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 10,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnCancel: { backgroundColor: '#F1F5F9' },
  sheetBtnCancelText: { color: '#475569', fontWeight: '700' },
  sheetBtnPrimary: { backgroundColor: '#1E3A8A' },
  sheetBtnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  eventStrip: { width: 4 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  eventLop: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventMeta: { fontSize: 11, color: '#64748B', flex: 1 },
});

export default LecturerBusyTrackingScreen;
