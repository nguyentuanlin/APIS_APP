// Nhập điểm giảng viên (CCB.NhapDiem) — port web `nhapdiem.html` + `nhapdiem.js`.
// Phiên bản đầu: filter → list bảng điểm → tap card → modal danh sách SV với input
// điểm cho từng cột LEAF. Skip: công bố, xác nhận, vi phạm, tính lại, import, thống kê.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerGradeSubmissionService as svc,
  ComboItem,
  BangDiemItem,
  CongThucCotItem,
  NguoiHocItem,
} from '../services/lecturerGradeSubmissionService';

// -------- Picker --------
interface PickerProps<T extends { ID: string }> {
  label: string;
  data: T[];
  selectedId: string;
  onChange: (id: string) => void;
  getDisplay: (item: T) => string;
  placeholder?: string;
}
function Picker<T extends { ID: string }>({
  label,
  data,
  selectedId,
  onChange,
  getDisplay,
  placeholder = 'Chọn...',
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
          {selected ? getDisplay(selected) : data.length === 0 ? '(chưa có dữ liệu)' : placeholder}
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
              data={data}
              keyExtractor={(item) => item.ID}
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
                    {getDisplay(item)}
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

const SORT_OPTIONS = [
  { ID: 'ABC', TEN: 'Xếp theo ABC' },
  { ID: 'LOPQUANLY', TEN: 'Xếp theo lớp' },
  { ID: 'MASO', TEN: 'Xếp theo mã SV' },
];

const LecturerGradeSubmissionScreen = () => {
  const navigation = useNavigation();

  // Filters
  const [loaiDanhSachList, setLoaiDanhSachList] = useState<ComboItem[]>([]);
  const [thoiGianList, setThoiGianList] = useState<ComboItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<ComboItem[]>([]);
  const [loaiDanhSachId, setLoaiDanhSachId] = useState('');
  const [thoiGianId, setThoiGianId] = useState('');
  const [hocPhanId, setHocPhanId] = useState('');
  const [keyword, setKeyword] = useState('');

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMain, setLoadingMain] = useState(false);
  const [bangDiemList, setBangDiemList] = useState<BangDiemItem[]>([]);

  // Modal nhập điểm
  const [activeBang, setActiveBang] = useState<BangDiemItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [leafCots, setLeafCots] = useState<CongThucCotItem[]>([]);
  const [nguoiHocList, setNguoiHocList] = useState<NguoiHocItem[]>([]);
  // diemMap: key = `${nguoiHocId}_${macot}` → giá trị input hiện tại
  const [diemMap, setDiemMap] = useState<Record<string, string>>({});
  const [originalMap, setOriginalMap] = useState<Record<string, string>>({});
  // chiXemMap: key = `${nguoiHocId}_${macot}` → 1 = readonly
  const [chiXemMap, setChiXemMap] = useState<Record<string, number>>({});
  const [sortType, setSortType] = useState('ABC');
  const [saving, setSaving] = useState(false);

  // ----- Init: Loại DS -----
  useEffect(() => {
    (async () => {
      try {
        const ld = await svc.getLoaiDanhSach();
        setLoaiDanhSachList(ld);
        if (ld.length > 0) setLoaiDanhSachId(ld[0].ID);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được Loại danh sách');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // Cascade Loại DS → Thời gian
  useEffect(() => {
    if (!loaiDanhSachId) return;
    (async () => {
      try {
        const tg = await svc.getThoiGian(loaiDanhSachId);
        setThoiGianList(tg);
        if (tg.length > 0) setThoiGianId(tg[0].ID);
        else setThoiGianId('');
      } catch (e: any) {
        console.warn('[NhapDiem] getThoiGian:', e?.message);
      }
    })();
  }, [loaiDanhSachId]);

  // Cascade Thời gian → Học phần
  useEffect(() => {
    if (!loaiDanhSachId || !thoiGianId) {
      setHocPhanList([]);
      return;
    }
    (async () => {
      try {
        const hp = await svc.getHocPhan(loaiDanhSachId, thoiGianId);
        setHocPhanList(hp);
        setHocPhanId('');
      } catch (e: any) {
        console.warn('[NhapDiem] getHocPhan:', e?.message);
      }
    })();
  }, [loaiDanhSachId, thoiGianId]);

  // ----- Tìm bảng điểm -----
  const handleSearch = useCallback(async () => {
    setLoadingMain(true);
    try {
      const list = await svc.getDSBangDiem({
        loaiDanhSachId,
        thoiGianId,
        hocPhanId,
        keyword,
      });
      setBangDiemList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách bảng điểm');
    } finally {
      setLoadingMain(false);
    }
  }, [loaiDanhSachId, thoiGianId, hocPhanId, keyword]);

  // ----- Mở bảng điểm: load công thức + SV + điểm -----
  const openBangDiem = async (bang: BangDiemItem) => {
    setActiveBang(bang);
    setLeafCots([]);
    setNguoiHocList([]);
    setDiemMap({});
    setOriginalMap({});
    setChiXemMap({});
    setLoadingDetail(true);
    try {
      // 1. Lấy công thức + sinh viên song song
      const [congthuc, nguoiHoc] = await Promise.all([
        svc.getCongThuc(bang.ID),
        svc.getNguoiHoc(bang.ID, sortType),
      ]);

      const leaves = svc.getLeafColumns(congthuc.rsDSCotThongTinDiem);
      setLeafCots(leaves);
      setNguoiHocList(nguoiHoc);

      // 2. Với mỗi cột LEAF, lấy điểm tất cả SV
      const initial: Record<string, string> = {};
      const chiXem: Record<string, number> = {};
      const hocPhanIdResolved = bang.DAOTAO_HOCPHAN_ID || hocPhanId;
      await Promise.all(
        leaves.map(async (cot) => {
          try {
            const data = await svc.getDiemTheoCot(bang.ID, hocPhanIdResolved, cot.MACOT);
            data.forEach((it) => {
              const key = `${it.QLSV_NGUOIHOC_ID}_${cot.MACOT}`;
              initial[key] = it.GIATRICOTDULIEU != null ? String(it.GIATRICOTDULIEU) : '';
              if (it.CHIXEM === 1) chiXem[key] = 1;
            });
          } catch (e: any) {
            console.warn(`[NhapDiem] getDiem ${cot.MACOT}:`, e?.message);
          }
        })
      );
      setDiemMap(initial);
      setOriginalMap({ ...initial });
      setChiXemMap(chiXem);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu bảng điểm');
      setActiveBang(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Khi đổi cách sắp xếp → reload SV
  useEffect(() => {
    if (!activeBang) return;
    (async () => {
      try {
        const list = await svc.getNguoiHoc(activeBang.ID, sortType);
        setNguoiHocList(list);
      } catch (e: any) {
        console.warn('[NhapDiem] re-sort:', e?.message);
      }
    })();
  }, [sortType]);

  const closeModal = () => {
    setActiveBang(null);
    setLeafCots([]);
    setNguoiHocList([]);
    setDiemMap({});
    setOriginalMap({});
    setChiXemMap({});
  };

  // ----- Lưu tất cả điểm đã đổi -----
  const handleSave = async () => {
    if (!activeBang) return;
    // Tìm các cell có thay đổi
    const changedKeys = Object.keys(diemMap).filter((key) => {
      const newVal = (diemMap[key] || '').trim();
      const oldVal = (originalMap[key] || '').trim();
      if (chiXemMap[key] === 1) return false; // readonly
      return newVal !== oldVal;
    });

    if (changedKeys.length === 0) {
      Alert.alert('Thông báo', 'Không có thay đổi để lưu.');
      return;
    }

    // Validate
    for (const key of changedKeys) {
      const raw = (diemMap[key] || '').trim();
      if (raw === '') continue;
      const s = raw.replace(',', '.');
      const n = Number(s);
      if (!isFinite(n)) {
        Alert.alert('Sai định dạng', `Giá trị "${raw}" không phải số`);
        return;
      }
    }

    Alert.alert('Xác nhận', `Lưu ${changedKeys.length} điểm đã thay đổi?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Lưu',
        onPress: async () => {
          setSaving(true);
          let ok = 0;
          let fail = 0;
          for (const key of changedKeys) {
            const lastUnderscore = key.lastIndexOf('_');
            const nguoiHocId = key.substring(0, lastUnderscore);
            const macot = key.substring(lastUnderscore + 1);
            const nh = nguoiHocList.find((n) => n.QLSV_NGUOIHOC_ID === nguoiHocId);
            if (!nh) {
              fail++;
              continue;
            }
            try {
              await svc.saveDiem({
                nguoiHocItem: nh,
                macot,
                diem: diemMap[key] || '',
                thoiGianId,
              });
              ok++;
            } catch (e: any) {
              console.warn('[NhapDiem] saveDiem fail:', key, e?.message);
              fail++;
            }
          }
          setSaving(false);
          setOriginalMap({ ...diemMap });
          Alert.alert(
            'Kết quả',
            `Đã lưu: ${ok}/${changedKeys.length}${fail > 0 ? `\nThất bại: ${fail}` : ''}`
          );
        },
      },
    ]);
  };

  // ----- Render card bảng điểm -----
  const renderBangDiem = ({ item, index }: { item: BangDiemItem; index: number }) => (
    <TouchableOpacity style={styles.bdCard} onPress={() => openBangDiem(item)} activeOpacity={0.85}>
      <View style={styles.bdHeader}>
        <Text style={styles.bdIndex}>#{index + 1}</Text>
        <View style={styles.bdLoaiBadge}>
          <Text style={styles.bdLoaiText}>{item.LOAIDANHSACH_TEN}</Text>
        </View>
        <Text style={styles.bdProgress}>
          {item.SOLUONG} <Text style={styles.bdProgressPct}>({item.TYLENHAPDIEM || 0}%)</Text>
        </Text>
      </View>
      <Text style={styles.bdTitle} numberOfLines={2}>
        {item.DAOTAO_HOCPHAN_TEN}
      </Text>
      <Text style={styles.bdSubtitle} numberOfLines={1}>
        {item.MA} · {item.DAOTAO_HOCPHAN_MA}
      </Text>
      <View style={styles.bdMetaRow}>
        <MaterialIcons name="calendar-today" size={12} color="#64748B" />
        <Text style={styles.bdMeta}>{item.DAOTAO_THOIGIANDAOTAO || '-'}</Text>
        {!!item.DAOTAO_KHOADAOTAO_MA && (
          <>
            <MaterialIcons name="school" size={12} color="#64748B" style={{ marginLeft: 8 }} />
            <Text style={styles.bdMeta}>{item.DAOTAO_KHOADAOTAO_MA}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  // ----- Render SV trong modal nhập điểm -----
  const renderSinhVien = ({ item, index }: { item: NguoiHocItem; index: number }) => {
    const hodem = item.QLSV_NGUOIHOC_HODEM || item.HODEMNGUOIHOC || '';
    const ten = item.QLSV_NGUOIHOC_TEN || item.TENNGUOIHOC || '';
    return (
      <View style={styles.svCard}>
        <View style={styles.svHeader}>
          <View style={styles.svAvatar}>
            <Text style={styles.svAvatarText}>{(ten || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.svName} numberOfLines={1}>
              {index + 1}. {hodem} {ten}
            </Text>
            <Text style={styles.svMeta} numberOfLines={1}>
              {item.QLSV_NGUOIHOC_MASO}
              {item.DAOTAO_LOPQUANLY_TEN ? ` · ${item.DAOTAO_LOPQUANLY_TEN}` : ''}
            </Text>
          </View>
        </View>

        {/* Các cột điểm thành phần */}
        <View style={styles.svDiemGrid}>
          {leafCots.map((cot) => {
            const key = `${item.QLSV_NGUOIHOC_ID}_${cot.MACOT}`;
            const readonly = chiXemMap[key] === 1;
            return (
              <View key={cot.MACOT} style={styles.diemCell}>
                <Text style={styles.diemCellLabel} numberOfLines={2}>
                  {cot.TENCOT}
                </Text>
                {readonly ? (
                  <Text style={styles.diemCellReadonly}>{diemMap[key] || '-'}</Text>
                ) : (
                  <TextInput
                    style={styles.diemCellInput}
                    value={diemMap[key] ?? ''}
                    onChangeText={(v) => setDiemMap((prev) => ({ ...prev, [key]: v }))}
                    placeholder="—"
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                )}
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
          <Text style={styles.headerTitle}>Nhập điểm giảng viên</Text>
          <Text style={styles.headerSubtitle}>Quản lý điểm thành phần</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={bangDiemList}
          keyExtractor={(item) => item.ID}
          renderItem={renderBangDiem}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <Picker
                  label="Loại danh sách"
                  data={loaiDanhSachList}
                  selectedId={loaiDanhSachId}
                  onChange={setLoaiDanhSachId}
                  getDisplay={(it) => it.TEN}
                />
                <Picker
                  label="Học kỳ"
                  data={thoiGianList}
                  selectedId={thoiGianId}
                  onChange={setThoiGianId}
                  getDisplay={(it) => it.DAOTAO_THOIGIANDAOTAO || it.TEN}
                />
                <Picker
                  label="Học phần"
                  data={hocPhanList}
                  selectedId={hocPhanId}
                  onChange={setHocPhanId}
                  getDisplay={(it) => it.TEN}
                />
                <View style={styles.keywordWrap}>
                  <MaterialIcons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.keywordInput}
                    placeholder="Nhập mã số hoặc tên..."
                    placeholderTextColor="#94A3B8"
                    value={keyword}
                    onChangeText={setKeyword}
                    onSubmitEditing={handleSearch}
                  />
                  {keyword.length > 0 && (
                    <TouchableOpacity onPress={() => setKeyword('')}>
                      <MaterialIcons name="close" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
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
              {bangDiemList.length > 0 && (
                <Text style={styles.sectionLabel}>Danh sách bảng điểm ({bangDiemList.length})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingMain ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="grading" size={48} color="#94a3b8" />
                <Text style={styles.muted}>Chọn bộ lọc rồi bấm Tìm kiếm.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modal nhập điểm */}
      <Modal
        visible={!!activeBang}
        animationType="slide"
        onRequestClose={closeModal}
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F3F4F6' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeBang?.DAOTAO_HOCPHAN_TEN}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeBang?.MA} · {nguoiHocList.length} SV · {leafCots.length} cột điểm
              </Text>
            </View>
          </View>

          {/* Sort picker */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Sắp xếp:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.ID}
                  style={[styles.sortChip, sortType === opt.ID && styles.sortChipActive]}
                  onPress={() => setSortType(opt.ID)}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      sortType === opt.ID && styles.sortChipTextActive,
                    ]}
                  >
                    {opt.TEN}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingDetail ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải bảng điểm...</Text>
            </View>
          ) : (
            <FlatList
              data={nguoiHocList}
              keyExtractor={(item) => item.QLSV_NGUOIHOC_ID}
              renderItem={renderSinhVien}
              contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Không có sinh viên</Text>
                </View>
              }
            />
          )}

          {nguoiHocList.length > 0 && leafCots.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Lưu điểm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
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

  filtersBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    margin: 12,
    borderRadius: 12,
    gap: 10,
  },
  keywordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  keywordInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
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

  // Card bảng điểm
  bdCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  bdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bdIndex: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  bdLoaiBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bdLoaiText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },
  bdProgress: { marginLeft: 'auto', fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  bdProgressPct: { color: '#94A3B8', fontWeight: '600' },
  bdTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  bdSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  bdMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  bdMeta: { fontSize: 11, color: '#475569' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Modal nhập điểm
  modalHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sortLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  sortChipActive: { backgroundColor: '#1E3A8A' },
  sortChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  sortChipTextActive: { color: '#FFFFFF' },

  // Card SV trong modal
  svCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  svHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  svAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svAvatarText: { color: '#FFFFFF', fontWeight: '700' },
  svName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  svMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  svDiemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  diemCell: { width: '48%', alignItems: 'center' },
  diemCellLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  diemCellInput: {
    width: '100%',
    height: 36,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  diemCellReadonly: {
    width: '100%',
    height: 36,
    lineHeight: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },

  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default LecturerGradeSubmissionScreen;
