// Xem lịch chấm thi — port `lichchamthi.html` + `.js`.
// 2 tab: Túi bài (thi viết) / Thi VĐ-TH. Mỗi card có checkbox để chọn → nút "Xác nhận"
// mở modal chip Đã chấm / Chưa chấm → bulk save_XacNhan.
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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerExamGradingService as svc,
  TuiBaiItem,
  ThiVDTHItem,
} from '../services/lecturerExamGradingService';

type TabKey = 'tui' | 'dst';

// TINHTRANGCHAM có thể là 1/0/"1"/"0"/true/false → truthy = đã chấm
const isDaCham = (v: any) => v === 1 || v === '1' || v === true;

const LecturerExamGradingScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>('tui');

  const [tuiBai, setTuiBai] = useState<TuiBaiItem[]>([]);
  const [thiVDTH, setThiVDTH] = useState<ThiVDTHItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Multi-select theo tab — 2 set riêng
  const [selectedTui, setSelectedTui] = useState<Set<string>>(new Set());
  const [selectedDST, setSelectedDST] = useState<Set<string>>(new Set());

  const [xacNhanOpen, setXacNhanOpen] = useState(false);
  const [submittingXacNhan, setSubmittingXacNhan] = useState(false);

  const load = useCallback(async () => {
    try {
      const { tuiBai: tb, thiVDTH: dst } = await svc.getList();
      // Sort túi bài theo tên (như web)
      tb.sort((a, b) =>
        String(a.THI_TUIBAI_TEN || '').localeCompare(String(b.THI_TUIBAI_TEN || ''))
      );
      setTuiBai(tb);
      setThiVDTH(dst);
      setSelectedTui(new Set());
      setSelectedDST(new Set());
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được lịch chấm thi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentList: (TuiBaiItem | ThiVDTHItem)[] =
    activeTab === 'tui' ? tuiBai : thiVDTH;
  const currentSelected = activeTab === 'tui' ? selectedTui : selectedDST;
  const setCurrentSelected = activeTab === 'tui' ? setSelectedTui : setSelectedDST;

  const toggleSelect = (id: string) => {
    setCurrentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (currentSelected.size === currentList.length && currentList.length > 0) {
      setCurrentSelected(new Set());
    } else {
      setCurrentSelected(new Set(currentList.map((it) => it.ID)));
    }
  };

  const openXacNhan = () => {
    if (currentSelected.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn đối tượng');
      return;
    }
    setXacNhanOpen(true);
  };

  const submitXacNhan = async (tinhTrang: 0 | 1) => {
    const ids = Array.from(currentSelected);
    setSubmittingXacNhan(true);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await svc.xacNhan({ id, tinhTrang });
        ok++;
      } catch {
        failed++;
      }
    }
    setSubmittingXacNhan(false);
    setXacNhanOpen(false);
    Alert.alert(
      'Kết quả',
      `Cập nhật thành công: ${ok}/${ids.length}` + (failed ? `\nThất bại: ${failed}` : ''),
      [{ text: 'OK', onPress: load }]
    );
  };

  const renderTuiBai = ({ item, index }: { item: TuiBaiItem; index: number }) => {
    const checked = selectedTui.has(item.ID);
    const daCham = isDaCham(item.TINHTRANGCHAM);
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
          <View style={[styles.statusBadge, daCham ? styles.statusDone : styles.statusPending]}>
            <Text style={styles.statusText}>{daCham ? 'Đã chấm' : 'Chưa chấm'}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          Túi bài: {item.THI_TUIBAI_TEN || '-'}
        </Text>
        {!!item.DAOTAO_HOCPHAN_TEN && (
          <Text style={styles.cardLop} numberOfLines={1}>
            {item.DAOTAO_HOCPHAN_MA ? `${item.DAOTAO_HOCPHAN_MA} · ` : ''}
            {item.DAOTAO_HOCPHAN_TEN}
          </Text>
        )}

        <Meta label="Cán bộ chấm" value={item.CANBOCHAMTHI_HOTEN} />
        <Meta label="Số bài" value={item.SOBAI} />
        <Meta label="Đợt thi" value={item.TENDOTTHI} />
        <Meta label="Ngày nhận bài" value={item.NGAYNHANBAI} />
        <Meta label="Ngày bắt đầu chấm" value={item.NGAYBATDAUCHAM} />
        <Meta label="Ngày hoàn thành" value={item.NGAYHOANTHANHCHAM} />
        {!!item.GHICHU && (
          <Text style={styles.cardGhiChu} numberOfLines={3}>
            Ghi chú: {item.GHICHU}
          </Text>
        )}
      </View>
    );
  };

  const renderThiVDTH = ({ item, index }: { item: ThiVDTHItem; index: number }) => {
    const checked = selectedDST.has(item.ID);
    const daCham = isDaCham(item.TINHTRANGCHAM);
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
          <View style={[styles.statusBadge, daCham ? styles.statusDone : styles.statusPending]}>
            <Text style={styles.statusText}>{daCham ? 'Đã chấm' : 'Chưa chấm'}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          DST: {item.DANHSACHTHI_TEN || '-'}
        </Text>
        {!!item.DAOTAO_HOCPHAN_TEN && (
          <Text style={styles.cardLop} numberOfLines={1}>
            {item.DAOTAO_HOCPHAN_MA ? `${item.DAOTAO_HOCPHAN_MA} · ` : ''}
            {item.DAOTAO_HOCPHAN_TEN}
          </Text>
        )}

        <Meta label="Cán bộ chấm" value={item.CANBOCHAMTHI_HOTEN} />
        <Meta label="Số bài" value={item.SOBAI} />
        <Meta label="Ca thi" value={item.CATHI_TEN} />
        <Meta label="Phòng thi" value={item.PHONGTHI_TEN} />
        <Meta label="Đợt thi" value={item.TENDOTTHI} />
        <Meta label="Ngày nhận bài" value={item.NGAYNHANBAI} />
        <Meta label="Ngày bắt đầu chấm" value={item.NGAYBATDAUCHAM} />
        <Meta label="Ngày hoàn thành" value={item.NGAYHOANTHANHCHAM} />
        {!!item.GHICHU && (
          <Text style={styles.cardGhiChu} numberOfLines={3}>
            Ghi chú: {item.GHICHU}
          </Text>
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
          <Text style={styles.headerTitle}>Xem lịch chấm thi</Text>
          <Text style={styles.headerSubtitle}>Xác nhận tình trạng chấm thi</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load();
          }}
          style={styles.backBtn}
        >
          <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tui' && styles.tabActive]}
          onPress={() => setActiveTab('tui')}
        >
          <MaterialIcons
            name="folder"
            size={16}
            color={activeTab === 'tui' ? '#FFFFFF' : '#1E3A8A'}
          />
          <Text style={[styles.tabText, activeTab === 'tui' && styles.tabTextActive]}>
            Túi bài ({tuiBai.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dst' && styles.tabActive]}
          onPress={() => setActiveTab('dst')}
        >
          <MaterialIcons
            name="record-voice-over"
            size={16}
            color={activeTab === 'dst' ? '#FFFFFF' : '#1E3A8A'}
          />
          <Text style={[styles.tabText, activeTab === 'dst' && styles.tabTextActive]}>
            VĐ / TH ({thiVDTH.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList as any[]}
          keyExtractor={(item: any, i) => `${item.ID}_${i}`}
          renderItem={
            activeTab === 'tui' ? (renderTuiBai as any) : (renderThiVDTH as any)
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            currentList.length > 0 ? (
              <View style={styles.toolbar}>
                <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                  <MaterialIcons
                    name={
                      currentSelected.size === currentList.length
                        ? 'check-box'
                        : 'check-box-outline-blank'
                    }
                    size={20}
                    color="#1E3A8A"
                  />
                  <Text style={styles.selectAllText}>
                    Tất cả ({currentSelected.size}/{currentList.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.xacNhanBtn,
                    currentSelected.size === 0 && styles.xacNhanBtnDisabled,
                  ]}
                  onPress={openXacNhan}
                  disabled={currentSelected.size === 0}
                >
                  <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.xacNhanBtnText}>
                    Xác nhận ({currentSelected.size})
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="grading" size={48} color="#94a3b8" />
              <Text style={styles.muted}>
                {activeTab === 'tui'
                  ? 'Không có túi bài nào.'
                  : 'Không có danh sách thi VĐ/TH nào.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal xác nhận tình trạng chấm */}
      <Modal
        visible={xacNhanOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setXacNhanOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  Xác nhận tình trạng ({currentSelected.size})
                </Text>
                <Text style={styles.sheetSubtitle}>Chọn tình trạng chấm thi</Text>
              </View>
              <TouchableOpacity onPress={() => setXacNhanOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {submittingXacNhan ? (
              <View style={[styles.centerBox, { paddingVertical: 30 }]}>
                <ActivityIndicator color="#1E3A8A" />
                <Text style={styles.muted}>Đang cập nhật...</Text>
              </View>
            ) : (
              <View style={{ marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.tinhTrangBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => submitXacNhan(1)}
                >
                  <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.tinhTrangBtnText}>Đã chấm xong</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tinhTrangBtn, { backgroundColor: '#dc2626' }]}
                  onPress={() => submitXacNhan(0)}
                >
                  <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                  <Text style={styles.tinhTrangBtnText}>Chưa chấm</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnCancel, { marginTop: 10 }]}
              onPress={() => setXacNhanOpen(false)}
              disabled={submittingXacNhan}
            >
              <Text style={styles.sheetBtnCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Meta = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value == null || value === '') return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{String(value)}</Text>
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

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  tabActive: { backgroundColor: '#1E3A8A' },
  tabText: { color: '#1E3A8A', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#FFFFFF' },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  xacNhanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  xacNhanBtnDisabled: { backgroundColor: '#CBD5E1' },
  xacNhanBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

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
  cardIndex: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDone: { backgroundColor: '#ECFDF5' },
  statusPending: { backgroundColor: '#FEF2F2' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 6 },
  cardLop: { fontSize: 12, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  cardGhiChu: { fontSize: 11, color: '#64748B', fontStyle: 'italic', marginTop: 8 },

  metaRow: { flexDirection: 'row', paddingVertical: 3 },
  metaLabel: { width: 130, fontSize: 12, color: '#64748B', fontWeight: '600' },
  metaValue: { flex: 1, fontSize: 12, color: '#0F172A' },

  // Sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    maxHeight: '60%',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  tinhTrangBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
});

export default LecturerExamGradingScreen;
