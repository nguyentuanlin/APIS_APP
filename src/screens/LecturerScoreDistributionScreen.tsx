// Thong ke theo pho diem - nganh — port `phodiem.html` + `.js`.
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
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerScoreDistributionService as svc,
  NganhItem,
  ThoiGianItem,
  ThangDiemItem,
  HocPhanItem,
  BangDiemResponse,
} from '../services/lecturerScoreDistributionService';

interface PickerLike {
  ID: string;
  TEN?: string;
  THOIGIAN?: string;
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
  }, [data, keyword]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.pickerSheet} activeOpacity={1} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearchWrap}>
            <MaterialIcons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Tim kiem..."
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
            keyExtractor={(item, idx) => `${item.ID}_${idx}`}
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
                <Text style={styles.muted}>Khong tim thay</Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const LecturerScoreDistributionScreen = () => {
  const navigation = useNavigation();
  const [nganhList, setNganhList] = useState<NganhItem[]>([]);
  const [thoiGianList, setThoiGianList] = useState<ThoiGianItem[]>([]);
  const [thangDiemList, setThangDiemList] = useState<ThangDiemItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<HocPhanItem[]>([]);

  const [nganhId, setNganhId] = useState('');
  const [thoiGianId, setThoiGianId] = useState('');
  const [thangDiemId, setThangDiemId] = useState('');

  const [pickerOpen, setPickerOpen] = useState<null | 'nganh' | 'thoiGian' | 'thangDiem'>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingHocPhan, setLoadingHocPhan] = useState(false);
  const [loadingBangDiem, setLoadingBangDiem] = useState(false);
  const [loadingThongKe, setLoadingThongKe] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [focusedId, setFocusedId] = useState('');
  const [bangDiem, setBangDiem] = useState<BangDiemResponse | null>(null);
  const [chartUrl, setChartUrl] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const [nganh, tg, thang] = await Promise.all([
          svc.getNganh(),
          svc.getThoiGian(),
          svc.getThangDiem(),
        ]);
        setNganhList(nganh);
        setThoiGianList(tg);
        setThangDiemList(thang);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong tai duoc du lieu khoi tao');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const loadHocPhan = useCallback(async () => {
    if (!nganhId || !thoiGianId) {
      Alert.alert('Thong bao', 'Vui long chon nganh va thoi gian.');
      return;
    }
    setLoadingHocPhan(true);
    try {
      const list = await svc.getHocPhan({ nganhId, thoiGianId });
      setHocPhanList(list);
      setSelectedIds({});
      setFocusedId('');
      setBangDiem(null);
      setChartUrl('');
    } catch (e: any) {
      Alert.alert('Loi', e?.message || 'Khong tai duoc danh sach hoc phan');
    } finally {
      setLoadingHocPhan(false);
    }
  }, [nganhId, thoiGianId]);

  const loadBangDiem = useCallback(
    async (hocPhanId: string, tenHienThi: string) => {
      if (!hocPhanId) return;
      if (!thangDiemId) {
        Alert.alert('Thong bao', 'Vui long chon thang diem.');
        return;
      }
      setLoadingBangDiem(true);
      try {
        const data = await svc.getBangDiem({
          thoiGianId,
          hocPhanId,
          thangDiemId,
          nganhId,
        });
        setBangDiem(data || null);
        try {
          const img = await svc.createReportImage({
            thoiGianId,
            hocPhanId,
            thangDiemId,
            nganhId,
            tenHienThi,
          });
          setChartUrl(img || '');
        } catch (e: any) {
          setChartUrl('');
        }
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong tai duoc bang diem');
      } finally {
        setLoadingBangDiem(false);
      }
    },
    [thoiGianId, thangDiemId, nganhId]
  );

  const onToggleHocPhan = (item: HocPhanItem) => {
    setSelectedIds((prev) => ({ ...prev, [item.ID]: !prev[item.ID] }));
    setFocusedId(item.ID);
    loadBangDiem(item.ID, `${item.MA || ''} - ${item.TEN || ''}`.trim());
  };

  const onThongKe = async () => {
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (ids.length === 0) {
      Alert.alert('Thong bao', 'Vui long chon it nhat 1 hoc phan.');
      return;
    }
    if (!thangDiemId) {
      Alert.alert('Thong bao', 'Vui long chon thang diem.');
      return;
    }
    setLoadingThongKe(true);
    try {
      for (const id of ids) {
        await svc.tinhPhoDiem({
          thoiGianId,
          hocPhanId: id,
          thangDiemId,
          nganhId,
        });
      }
      Alert.alert('Thong bao', 'Da thong ke xong.');
    } catch (e: any) {
      Alert.alert('Loi', e?.message || 'Thong ke that bai');
    } finally {
      setLoadingThongKe(false);
    }
  };

  const selNganh = nganhList.find((it) => it.ID === nganhId);
  const selThoiGian = thoiGianList.find((it) => it.ID === thoiGianId);
  const selThangDiem = thangDiemList.find((it) => it.ID === thangDiemId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Thong ke theo pho diem - nganh</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Dang tai...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.filterBox}>
            <Text style={styles.filterLabel}>Nganh</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => setPickerOpen('nganh')}>
              <Text style={[styles.pickerFieldText, !selNganh && styles.pickerFieldPlaceholder]}>
                {selNganh?.TEN || 'Chon nganh'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Thoi gian</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => setPickerOpen('thoiGian')}>
              <Text style={[styles.pickerFieldText, !selThoiGian && styles.pickerFieldPlaceholder]}>
                {selThoiGian?.THOIGIAN || 'Chon thoi gian'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Thang diem</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => setPickerOpen('thangDiem')}>
              <Text style={[styles.pickerFieldText, !selThangDiem && styles.pickerFieldPlaceholder]}>
                {selThangDiem?.TEN || selThangDiem?.MA || 'Chon thang diem'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnPrimary]}
                onPress={loadHocPhan}
                disabled={loadingHocPhan}
              >
                {loadingHocPhan ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Tim kiem</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSuccess]}
                onPress={onThongKe}
                disabled={loadingThongKe}
              >
                {loadingThongKe ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="bar-chart" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Thong ke</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ten hoc phan</Text>
            {hocPhanList.length === 0 ? (
              <Text style={styles.muted}>Chua co danh sach hoc phan.</Text>
            ) : (
              <FlatList
                data={hocPhanList}
                keyExtractor={(item) => item.ID}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const active = !!selectedIds[item.ID];
                  return (
                    <TouchableOpacity style={styles.listItem} onPress={() => onToggleHocPhan(item)}>
                      <View style={[styles.checkbox, active && styles.checkboxActive]}>
                        {active && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.listText}>
                        {item.MA || ''} - {item.TEN || ''} (TC {item.HOCTRINH || ''})
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pho diem</Text>
            {loadingBangDiem ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#1E3A8A" />
                <Text style={styles.muted}>Dang tai bang diem...</Text>
              </View>
            ) : !bangDiem ? (
              <Text style={styles.muted}>Chon hoc phan de xem pho diem.</Text>
            ) : (
              <ScrollView horizontal style={styles.tableWrap}>
                <View>
                  <View style={styles.tableRowHeader}>
                    <Text style={[styles.tableCell, styles.tableCellHeader, { width: 120 }]}>Pho diem</Text>
                    {bangDiem.rsThanhPhanDiem.map((tp) => (
                      <Text
                        key={tp.DIEM_THANHPHANDIEM_ID}
                        style={[styles.tableCell, styles.tableCellHeader]}
                      >
                        {tp.DIEM_THANHPHANDIEM_TEN}
                      </Text>
                    ))}
                  </View>
                  {bangDiem.rsPhoDiem.map((pd) => (
                    <View key={`${pd.MUCCANDUOI}_${pd.MUCCANTREN}`} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 120 }]}>
                        {pd.MUCCANDUOI} - {pd.MUCCANTREN}
                      </Text>
                      {bangDiem.rsThanhPhanDiem.map((tp) => {
                        const hit = bangDiem.rsKeQuaTheoPhoDiem.find(
                          (kq) =>
                            kq.MUCCANDUOI == pd.MUCCANDUOI &&
                            kq.MUCCANTREN == pd.MUCCANTREN &&
                            kq.DIEM_THANHPHANDIEM_ID == tp.DIEM_THANHPHANDIEM_ID
                        );
                        return (
                          <Text key={`${pd.MUCCANDUOI}_${tp.DIEM_THANHPHANDIEM_ID}`} style={styles.tableCell}>
                            {hit?.SOLUONG ?? ''}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bieu do pho diem</Text>
            {chartUrl ? (
              <Image source={{ uri: chartUrl }} style={styles.chartImg} resizeMode="contain" />
            ) : (
              <Text style={styles.muted}>Chua co bieu do.</Text>
            )}
          </View>
        </ScrollView>
      )}

      <FilterPickerSheet
        visible={pickerOpen === 'nganh'}
        onClose={() => setPickerOpen(null)}
        data={nganhList}
        selectedId={nganhId}
        title="Chon nganh"
        emptyLabel="(Khong chon)"
        onSelect={(item) => {
          setNganhId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'thoiGian'}
        onClose={() => setPickerOpen(null)}
        data={thoiGianList}
        selectedId={thoiGianId}
        title="Chon thoi gian"
        emptyLabel="(Khong chon)"
        getLabel={(it) => it.THOIGIAN || it.TEN || it.ID}
        onSelect={(item) => {
          setThoiGianId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'thangDiem'}
        onClose={() => setPickerOpen(null)}
        data={thangDiemList}
        selectedId={thangDiemId}
        title="Chon thang diem"
        emptyLabel="(Khong chon)"
        getLabel={(it) => it.TEN || it.MA || it.ID}
        onSelect={(item) => {
          setThangDiemId(item.ID || item.MA || '');
          setPickerOpen(null);
        }}
      />
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

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    flex: 1,
  },
  btnPrimary: { backgroundColor: '#1E3A8A' },
  btnSuccess: { backgroundColor: '#16A34A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  section: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  listText: { fontSize: 12, color: '#0F172A', flex: 1 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },

  tableWrap: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  tableCell: { padding: 8, minWidth: 90, textAlign: 'center', fontSize: 12, color: '#0F172A' },
  tableCellHeader: { fontWeight: '700', color: '#0F172A' },

  chartImg: { width: '100%', height: 220, backgroundColor: '#F8FAFC', borderRadius: 8 },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  muted: { color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 12 },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '75%',
    paddingVertical: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
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
});

export default LecturerScoreDistributionScreen;
