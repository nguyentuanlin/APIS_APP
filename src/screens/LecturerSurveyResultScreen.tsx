// Ket qua khao sat ca nhan — port `ketquakhaosat.html` + `.js`.
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
  TextInput,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerSurveyResultService as svc,
  KeHoachKhaoSatItem,
  PhieuKhaoSatItem,
  ThongTinChungItem,
  DapAnDanhMucItem,
  CauHoiItem,
  CauHoiMoItem,
  CauHoiMoKetQuaItem,
} from '../services/lecturerSurveyResultService';

interface PickerLike {
  ID: string;
  TEN?: string;
}

function FilterPickerSheet<T extends PickerLike>(props: {
  visible: boolean;
  onClose: () => void;
  data: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  title: string;
  emptyLabel: string;
}) {
  const { visible, onClose, data, selectedId, onSelect, title, emptyLabel } = props;
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (visible) setKeyword('');
  }, [visible]);

  const filtered = useMemo(() => {
    const items = [{ ID: '' } as T, ...data];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) => it.ID === '' || (it.TEN || '').toLowerCase().includes(kw));
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
                    {item.ID === '' ? emptyLabel : item.TEN}
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

const COLOR_TAGS = ['#F59E0B', '#EF4444', '#1E40AF', '#2563EB', '#10B981'];

const LecturerSurveyResultScreen = () => {
  const navigation = useNavigation();
  const [keHoachList, setKeHoachList] = useState<KeHoachKhaoSatItem[]>([]);
  const [phieuList, setPhieuList] = useState<PhieuKhaoSatItem[]>([]);
  const [keHoachId, setKeHoachId] = useState('');
  const [phieuId, setPhieuId] = useState('');
  const [pickerOpen, setPickerOpen] = useState<null | 'keHoach' | 'phieu'>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [thongTin, setThongTin] = useState<ThongTinChungItem | null>(null);
  const [dapAnList, setDapAnList] = useState<DapAnDanhMucItem[]>([]);
  const [cauHoiList, setCauHoiList] = useState<CauHoiItem[]>([]);
  const [cauHoiMoList, setCauHoiMoList] = useState<CauHoiMoItem[]>([]);
  const [cauHoiMoKetQua, setCauHoiMoKetQua] = useState<CauHoiMoKetQuaItem[]>([]);

  const [soPhieuMap, setSoPhieuMap] = useState<Record<string, number>>({});
  const [phanTramMap, setPhanTramMap] = useState<Record<string, number>>({});
  const [avgMap, setAvgMap] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const kh = await svc.getKeHoach();
        setKeHoachList(kh);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong tai duoc du lieu khoi tao');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!keHoachId) {
      setPhieuList([]);
      setPhieuId('');
      return;
    }
    (async () => {
      try {
        const ph = await svc.getPhieu(keHoachId);
        setPhieuList(ph);
        setPhieuId('');
      } catch (e: any) {
        console.warn('[Survey] getPhieu:', e?.message);
      }
    })();
  }, [keHoachId]);

  const loadKetQua = useCallback(async () => {
    if (!keHoachId || !phieuId) {
      Alert.alert('Thong bao', 'Vui long chon ke hoach va phieu khao sat.');
      return;
    }
    setLoadingResult(true);
    try {
      const data = await svc.getKetQua({ keHoachId, phieuId });
      const thongTinChung = data?.rsThongTinChung?.[0] || null;
      const dapAn = data?.rsDanhMucDapAn || [];
      const cauHoi = data?.rsCauHoi_1DapAn || [];
      const cauHoiMo = data?.rsCauHoi_Mo || [];
      const cauHoiMoKq = data?.rsCauHoi_Mo_KetQua || [];

      setThongTin(thongTinChung);
      setDapAnList(dapAn);
      setCauHoiList(cauHoi);
      setCauHoiMoList(cauHoiMo);
      setCauHoiMoKetQua(cauHoiMoKq);

      const soPhieu: Record<string, number> = {};
      const phanTram: Record<string, number> = {};

      const tasks: Promise<void>[] = [];
      cauHoi.forEach((q) => {
        dapAn.forEach((a) => {
          const key = `${q.ID}_${a.ID}`;
          tasks.push(
            svc
              .getSoPhieu({
                keHoachId: q.KS_KEHOACHKHAOSAT_ID || keHoachId,
                phieuId: q.KS_PHIEUKHAOSAT_ID || phieuId,
                cauHoiId: q.ID,
                maDapAn: a.MADAPAN || '',
              })
              .then((res) => {
                const v = res?.[0]?.SOLUONG;
                soPhieu[key] = Number(v || 0);
              })
          );
          tasks.push(
            svc
              .getPhanTram({
                keHoachId: q.KS_KEHOACHKHAOSAT_ID || keHoachId,
                phieuId: q.KS_PHIEUKHAOSAT_ID || phieuId,
                cauHoiId: q.ID,
                maDapAn: a.MADAPAN || '',
              })
              .then((res) => {
                const v = res?.[0]?.PHANTRAM;
                phanTram[key] = Number(v || 0);
              })
          );
        });
      });

      await Promise.all(tasks);
      setSoPhieuMap(soPhieu);
      setPhanTramMap(phanTram);

      const avg: Record<string, number> = {};
      cauHoi.forEach((q) => {
        let tong = 0;
        let soLuong = 0;
        dapAn.forEach((a) => {
          const key = `${q.ID}_${a.ID}`;
          const sl = soPhieu[key] || 0;
          soLuong += sl;
          tong += sl * Number(a.TRONGSODIEM || 0);
        });
        avg[q.ID] = soLuong ? Math.round((tong / soLuong) * 100) / 100 : 0;
      });
      setAvgMap(avg);
    } catch (e: any) {
      Alert.alert('Loi', e?.message || 'Khong tai duoc ket qua');
    } finally {
      setLoadingResult(false);
      setRefreshing(false);
    }
  }, [keHoachId, phieuId]);

  const selKeHoach = keHoachList.find((it) => it.ID === keHoachId);
  const selPhieu = phieuList.find((it) => it.ID === phieuId);

  const openEndedByQuestion = useMemo(() => {
    const map: Record<string, CauHoiMoKetQuaItem[]> = {};
    cauHoiMoKetQua.forEach((it) => {
      const id = it.KS_CAUHOI_ID || '';
      if (!map[id]) map[id] = [];
      map[id].push(it);
    });
    return map;
  }, [cauHoiMoKetQua]);

  const renderQuestion = ({ item, index }: { item: CauHoiItem; index: number }) => {
    return (
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionIndex}>#{index + 1}</Text>
          <Text style={styles.questionAvg}>Diem: {avgMap[item.ID] || 0}</Text>
        </View>
        <Text style={styles.questionTitle}>{item.TENCAUHOI}</Text>
        <View style={styles.answerGrid}>
          {dapAnList.map((a, idx) => {
            const key = `${item.ID}_${a.ID}`;
            const sl = soPhieuMap[key] || 0;
            const tl = phanTramMap[key] || 0;
            return (
              <View key={a.ID} style={styles.answerRow}>
                <View style={[styles.answerBadge, { backgroundColor: COLOR_TAGS[idx % COLOR_TAGS.length] }]}>
                  <Text style={styles.answerBadgeText}>{a.TRONGSODIEM}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.answerLabel}>{a.TENDAPAN}</Text>
                  <Text style={styles.answerValue}>So phieu: {sl} · Ty le: {tl}%</Text>
                </View>
              </View>
            );
          })}
        </View>
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
          <Text style={styles.headerTitle}>Ket qua khao sat ca nhan</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Dang tai...</Text>
        </View>
      ) : (
        <FlatList
          data={cauHoiList}
          keyExtractor={(item, i) => `${item.ID}_${i}`}
          renderItem={renderQuestion}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadKetQua();
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.filterBox}>
              <Text style={styles.filterLabel}>Ke hoach khao sat</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('keHoach')}
              >
                <Text style={[styles.pickerFieldText, !selKeHoach && styles.pickerFieldPlaceholder]}>
                  {selKeHoach?.TEN || 'Chon ke hoach khao sat'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Phieu khao sat</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setPickerOpen('phieu')}
              >
                <Text style={[styles.pickerFieldText, !selPhieu && styles.pickerFieldPlaceholder]}>
                  {selPhieu?.TEN || 'Chon phieu khao sat'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.btnPrimary, { marginTop: 12 }]}
                onPress={loadKetQua}
                disabled={loadingResult}
                activeOpacity={0.85}
              >
                {loadingResult ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Tim kiem</Text>
                  </>
                )}
              </TouchableOpacity>

              {thongTin && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLine}>
                    Hoc phan: {thongTin.KS_CSDL_HOCPHAN_TEN || ''} {thongTin.KS_CSDL_HOCPHAN_MA ? `- ${thongTin.KS_CSDL_HOCPHAN_MA}` : ''}
                  </Text>
                  <Text style={styles.infoLine}>Giao vien: {thongTin.KS_DOITUONGDUOCKHAOSAT_TEN || ''}</Text>
                  <Text style={styles.infoLine}>Khoa sinh vien: {thongTin.AAA || ''}</Text>
                  <Text style={styles.infoLine}>Hinh thuc: {thongTin.AAAA || ''}</Text>
                  <Text style={styles.infoLine}>Thoi gian: {thongTin.TUNGAY || ''} - {thongTin.DENNGAY || ''}</Text>
                  <Text style={styles.infoLine}>So luong khao sat: {thongTin.AAA || ''}</Text>
                </View>
              )}

              {dapAnList.length > 0 && (
                <View style={styles.legendBox}>
                  <Text style={styles.legendTitle}>Muc do danh gia</Text>
                  {dapAnList.map((a, idx) => (
                    <View key={a.ID} style={styles.legendRow}>
                      <View style={[styles.legendBadge, { backgroundColor: COLOR_TAGS[idx % COLOR_TAGS.length] }]}>
                        <Text style={styles.legendBadgeText}>{a.TRONGSODIEM}</Text>
                      </View>
                      <Text style={styles.legendText}>{a.TENDAPAN}</Text>
                    </View>
                  ))}
                </View>
              )}

              {cauHoiMoList.length > 0 && (
                <View style={styles.openEndedBox}>
                  <Text style={styles.openEndedTitle}>Ket qua khao sat cau hoi mo</Text>
                  {cauHoiMoList.map((q, idx) => (
                    <View key={q.ID} style={styles.openEndedItem}>
                      <Text style={styles.openEndedQuestion}>Cau {idx + 1}: {q.TENCAUHOI}</Text>
                      {(openEndedByQuestion[q.ID] || []).map((ans, i) => (
                        <Text key={`${q.ID}_${i}`} style={styles.openEndedAnswer}>{ans.DAPAN}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingResult ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="rate-review" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Chua co du lieu. Hay chon ke hoach va phieu.</Text>
              </View>
            ) : null
          }
        />
      )}

      <FilterPickerSheet
        visible={pickerOpen === 'keHoach'}
        onClose={() => setPickerOpen(null)}
        data={keHoachList}
        selectedId={keHoachId}
        title="Chon ke hoach"
        emptyLabel="(Khong chon)"
        onSelect={(item) => {
          setKeHoachId(item.ID);
          setPickerOpen(null);
        }}
      />
      <FilterPickerSheet
        visible={pickerOpen === 'phieu'}
        onClose={() => setPickerOpen(null)}
        data={phieuList}
        selectedId={phieuId}
        title="Chon phieu"
        emptyLabel="(Khong chon)"
        onSelect={(item) => {
          setPhieuId(item.ID);
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
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  infoBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 8, gap: 4 },
  infoLine: { fontSize: 12, color: '#0F172A' },

  legendBox: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC' },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#1E3A8A', marginBottom: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  legendBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  legendText: { fontSize: 12, color: '#0F172A' },

  questionCard: {
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
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionIndex: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  questionAvg: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },
  questionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 6 },
  answerGrid: { marginTop: 8, gap: 8 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  answerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  answerLabel: { fontSize: 12, color: '#0F172A', fontWeight: '600' },
  answerValue: { fontSize: 11, color: '#64748B' },

  openEndedBox: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC' },
  openEndedTitle: { fontSize: 12, fontWeight: '700', color: '#1E3A8A', marginBottom: 6 },
  openEndedItem: { marginBottom: 10 },
  openEndedQuestion: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  openEndedAnswer: { fontSize: 12, color: '#334155', marginTop: 4 },

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
});

export default LecturerSurveyResultScreen;
