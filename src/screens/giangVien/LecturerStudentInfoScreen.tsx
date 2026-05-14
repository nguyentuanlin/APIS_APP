// Xem thông tin học tập, chương trình học sinh viên (CCB.IBD)
// Port web `inbangdiem.html` + `inbangdiem.js`. Đã giản lược các nút phụ
// (lịch học, tài chính, học vụ, quyết định, rèn luyện, đăng ký...) — phiên bản
// đầu chỉ giữ: search SV → list → tap → modal bảng điểm.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
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
  lecturerStudentInfoService as svc,
  ComboItem,
  SinhVienItem,
  DiemKetThucItem,
} from '../../services/giangVien/lecturerStudentInfoService';

// -------- Mini Picker --------
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
  placeholder = 'Tất cả',
  emptyLabel = 'Tất cả',
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = data.find((d) => d.ID === selectedId);
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerField} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text
          style={[styles.pickerValue, !selected && styles.pickerPlaceholder]}
          numberOfLines={1}
        >
          {selected ? getDisplay(selected) : placeholder}
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
              data={[{ ID: '', TEN: emptyLabel } as any, ...data] as T[]}
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
                    {item.ID === '' ? emptyLabel : getDisplay(item)}
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

const LecturerStudentInfoScreen = () => {
  const navigation = useNavigation();

  // Filters
  const [khoaList, setKhoaList] = useState<ComboItem[]>([]);
  const [heList, setHeList] = useState<ComboItem[]>([]);
  const [khoaDtList, setKhoaDtList] = useState<ComboItem[]>([]);
  const [chuongTrinhList, setChuongTrinhList] = useState<ComboItem[]>([]);
  const [lopList, setLopList] = useState<ComboItem[]>([]);

  const [khoaId, setKhoaId] = useState('');
  const [heId, setHeId] = useState('');
  const [khoaDtId, setKhoaDtId] = useState('');
  const [chuongTrinhId, setChuongTrinhId] = useState('');
  const [lopId, setLopId] = useState('');
  const [keyword, setKeyword] = useState('');

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMain, setLoadingMain] = useState(false);
  const [svList, setSvList] = useState<SinhVienItem[]>([]);

  // Trạng thái SV (multi-check, mặc định check hết)
  const [trangThaiList, setTrangThaiList] = useState<ComboItem[]>([]);
  const [trangThaiChecked, setTrangThaiChecked] = useState<Record<string, boolean>>({});
  const [statusExpanded, setStatusExpanded] = useState(false);

  // Modal chi tiết
  const [activeSv, setActiveSv] = useState<SinhVienItem | null>(null);
  const [diemList, setDiemList] = useState<DiemKetThucItem[]>([]);
  const [loadingDiem, setLoadingDiem] = useState(false);

  // ----- Init: Khoa quản lý + Trạng thái SV -----
  useEffect(() => {
    (async () => {
      try {
        const [k, tt] = await Promise.all([svc.getKhoaQuanLy(), svc.getTrangThaiSinhVien()]);
        setKhoaList(k);
        if (k.length > 0) setKhoaId(k[0].ID);

        setTrangThaiList(tt);
        // Mặc định check tất cả (giống web)
        const initial: Record<string, boolean> = {};
        tt.forEach((it) => (initial[it.ID] = true));
        setTrangThaiChecked(initial);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không lấy được dữ liệu khởi tạo');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const checkedTrangThaiCount = useMemo(
    () => Object.values(trangThaiChecked).filter(Boolean).length,
    [trangThaiChecked]
  );
  const allTrangThaiChecked =
    trangThaiList.length > 0 && checkedTrangThaiCount === trangThaiList.length;

  const toggleAllTrangThai = () => {
    const next: Record<string, boolean> = {};
    const newVal = !allTrangThaiChecked;
    trangThaiList.forEach((it) => (next[it.ID] = newVal));
    setTrangThaiChecked(next);
  };
  const toggleOneTrangThai = (id: string) => {
    setTrangThaiChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Cascade Khoa → Hệ
  useEffect(() => {
    if (!khoaId) {
      setHeList([]);
      return;
    }
    (async () => {
      try {
        const h = await svc.getHeDaoTao(khoaId);
        setHeList(h);
        setHeId('');
        setKhoaDtId('');
        setChuongTrinhId('');
        setLopId('');
        setKhoaDtList([]);
        setChuongTrinhList([]);
        setLopList([]);
      } catch (e: any) {
        console.warn('[StudentInfo] getHe:', e?.message);
      }
    })();
  }, [khoaId]);

  // Cascade Hệ → Khóa
  useEffect(() => {
    if (!khoaId) return;
    (async () => {
      try {
        const kd = await svc.getKhoaDaoTao(khoaId, heId);
        setKhoaDtList(kd);
        setKhoaDtId('');
        setChuongTrinhId('');
        setLopId('');
        setChuongTrinhList([]);
        setLopList([]);
      } catch (e: any) {
        console.warn('[StudentInfo] getKhoaDt:', e?.message);
      }
    })();
  }, [khoaId, heId]);

  // Cascade Khóa → Chương trình
  useEffect(() => {
    if (!khoaId) return;
    (async () => {
      try {
        const ct = await svc.getChuongTrinhDaoTao(khoaId, heId, khoaDtId);
        setChuongTrinhList(ct);
        setChuongTrinhId('');
        setLopId('');
        setLopList([]);
      } catch (e: any) {
        console.warn('[StudentInfo] getChuongTrinh:', e?.message);
      }
    })();
  }, [khoaId, heId, khoaDtId]);

  // Cascade Chương trình → Lớp
  useEffect(() => {
    if (!khoaId) return;
    (async () => {
      try {
        const l = await svc.getLopQuanLy(khoaId, heId, khoaDtId, chuongTrinhId);
        setLopList(l);
        setLopId('');
      } catch (e: any) {
        console.warn('[StudentInfo] getLop:', e?.message);
      }
    })();
  }, [khoaId, heId, khoaDtId, chuongTrinhId]);

  // ----- Tìm kiếm SV -----
  const handleSearch = async () => {
    setLoadingMain(true);
    try {
      const checkedIds = Object.keys(trangThaiChecked)
        .filter((id) => trangThaiChecked[id])
        .join(',');
      const list = await svc.getDanhSachSinhVien({
        keyword,
        khoaQuanLyId: khoaId,
        heDaoTaoId: heId,
        khoaDaoTaoId: khoaDtId,
        chuongTrinhId: chuongTrinhId,
        lopQuanLyId: lopId,
        trangThaiNguoiHocIds: checkedIds,
      });
      setSvList(list);
      if (list.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy sinh viên phù hợp.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách sinh viên');
    } finally {
      setLoadingMain(false);
    }
  };

  // ----- Mở modal bảng điểm -----
  const openDetail = async (sv: SinhVienItem) => {
    setActiveSv(sv);
    setDiemList([]);
    setLoadingDiem(true);
    try {
      const list = await svc.getDiemKetThuc(sv.QLSV_NGUOIHOC_ID);
      setDiemList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được bảng điểm');
    } finally {
      setLoadingDiem(false);
    }
  };

  const closeDetail = () => {
    setActiveSv(null);
    setDiemList([]);
  };

  // ----- Card SV -----
  const renderSv = ({ item }: { item: SinhVienItem }) => (
    <TouchableOpacity style={styles.svCard} onPress={() => openDetail(item)} activeOpacity={0.85}>
      <View style={styles.svCardTop}>
        <View style={styles.svAvatar}>
          <Text style={styles.svAvatarText}>
            {(item.QLSV_NGUOIHOC_TEN || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.svName} numberOfLines={1}>
            {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
          </Text>
          <Text style={styles.svMeta}>
            <Text style={styles.svCode}>{item.QLSV_NGUOIHOC_MASO}</Text>
            {item.DAOTAO_LOPQUANLY_TEN ? ` · ${item.DAOTAO_LOPQUANLY_TEN}` : ''}
          </Text>
          {!!item.QLSV_NGUOIHOC_NGAYSINH && (
            <Text style={styles.svMeta}>Ngày sinh: {item.QLSV_NGUOIHOC_NGAYSINH}</Text>
          )}
        </View>
        {!!item.QLSV_TRANGTHAINGUOIHOC_TEN && (
          <View style={styles.svStatusBadge}>
            <Text style={styles.svStatusText} numberOfLines={1}>
              {item.QLSV_TRANGTHAINGUOIHOC_TEN}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.svCardStats}>
        <View style={styles.svStatCell}>
          <Text style={styles.svStatLabel}>GPA Hệ 4</Text>
          <Text style={styles.svStatValue}>{item.DTBTICHLUYHE4TOANKHOA || '-'}</Text>
        </View>
        <View style={styles.svStatDivider} />
        <View style={styles.svStatCell}>
          <Text style={styles.svStatLabel}>GPA Hệ 10</Text>
          <Text style={styles.svStatValue}>{item.DTBTICHLUYHE10TOANKHOA || '-'}</Text>
        </View>
        <View style={styles.svStatDivider} />
        <View style={styles.svStatCell}>
          <Text style={styles.svStatLabel}>Số TC tích lũy</Text>
          <Text style={styles.svStatValue}>{item.SOTCTICHLUYTOANKHOA || '-'}</Text>
        </View>
      </View>

      {(item.DAOTAO_CHUONGTRINH_TEN || item.DAOTAO_HEDAOTAO_TEN) && (
        <View style={styles.svCardFooter}>
          <MaterialIcons name="school" size={14} color="#64748B" />
          <Text style={styles.svFooterText} numberOfLines={1}>
            {[item.DAOTAO_CHUONGTRINH_TEN, item.DAOTAO_HEDAOTAO_TEN].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ----- Row điểm kết thúc -----
  const renderDiem = ({ item, index }: { item: DiemKetThucItem; index: number }) => {
    const d10 = item.DIEM10 != null ? String(item.DIEM10) : '';
    const d4 = item.DIEM4 != null ? String(item.DIEM4) : '';
    const passed = d4 !== '' && Number(d4) >= 1;
    return (
      <View style={styles.diemRow}>
        <Text style={styles.diemIndex}>{index + 1}</Text>
        <View style={styles.diemMid}>
          <Text style={styles.diemTen} numberOfLines={2}>
            {item.DAOTAO_HOCPHAN_TEN}
          </Text>
          <Text style={styles.diemMaMeta}>
            {item.DAOTAO_HOCPHAN_MA} · {item.SOTC} TC
            {item.DAOTAO_THOIGIANDAOTAO ? ` · ${item.DAOTAO_THOIGIANDAOTAO}` : ''}
          </Text>
        </View>
        <View style={styles.diemRight}>
          <Text style={[styles.diemValue, !passed && d4 !== '' && styles.diemFail]}>
            {d10 || '-'}
          </Text>
          <Text style={styles.diemSub}>
            {d4 || '-'} · {item.DIEMCHU || '-'}
          </Text>
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
          <Text style={styles.headerTitle}>Thông tin học tập SV</Text>
          <Text style={styles.headerSubtitle}>Tra cứu thông tin & bảng điểm</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải bộ lọc...</Text>
        </View>
      ) : (
        <FlatList
          data={svList}
          keyExtractor={(item) => item.ID}
          renderItem={renderSv}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <View style={styles.keywordWrap}>
                  <MaterialIcons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.keywordInput}
                    placeholder="Mã số, họ tên, ngày sinh..."
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

                <Picker
                  label="Khoa quản lý"
                  data={khoaList}
                  selectedId={khoaId}
                  onChange={setKhoaId}
                  getDisplay={(it) => it.TEN || (it as any).TENKHOA || ''}
                  emptyLabel="Tất cả khoa"
                />
                <Picker
                  label="Hệ đào tạo"
                  data={heList}
                  selectedId={heId}
                  onChange={setHeId}
                  getDisplay={(it) => (it as any).TENHEDAOTAO || it.TEN || ''}
                  emptyLabel="Tất cả hệ ĐT"
                />
                <Picker
                  label="Khóa đào tạo"
                  data={khoaDtList}
                  selectedId={khoaDtId}
                  onChange={setKhoaDtId}
                  getDisplay={(it) => (it as any).TENKHOA || it.TEN || ''}
                  emptyLabel="Tất cả khóa"
                />
                <Picker
                  label="Chương trình ĐT"
                  data={chuongTrinhList}
                  selectedId={chuongTrinhId}
                  onChange={setChuongTrinhId}
                  getDisplay={(it) => (it as any).TENCHUONGTRINH || it.TEN || ''}
                  emptyLabel="Tất cả chương trình"
                />
                <Picker
                  label="Lớp quản lý"
                  data={lopList}
                  selectedId={lopId}
                  onChange={setLopId}
                  getDisplay={(it) => it.TEN || ''}
                  emptyLabel="Tất cả lớp"
                />

                {/* Trạng thái SV - collapse */}
                {trangThaiList.length > 0 && (
                  <View>
                    <TouchableOpacity
                      style={styles.statusToggle}
                      onPress={() => setStatusExpanded((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="person-pin" size={16} color="#1E3A8A" />
                      <Text style={styles.statusToggleText}>
                        Trạng thái SV ({checkedTrangThaiCount}/{trangThaiList.length})
                      </Text>
                      <MaterialIcons
                        name={statusExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                    {statusExpanded && (
                      <View style={styles.statusBox}>
                        <TouchableOpacity
                          style={styles.statusItem}
                          onPress={toggleAllTrangThai}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[styles.checkboxBox, allTrangThaiChecked && styles.checkboxBoxChecked]}
                          >
                            {allTrangThaiChecked && (
                              <MaterialIcons name="check" size={14} color="#FFFFFF" />
                            )}
                          </View>
                          <Text style={[styles.statusItemText, { fontWeight: '700' }]}>Tất cả</Text>
                        </TouchableOpacity>
                        {trangThaiList.map((tt) => {
                          const checked = !!trangThaiChecked[tt.ID];
                          return (
                            <TouchableOpacity
                              key={tt.ID}
                              style={styles.statusItem}
                              onPress={() => toggleOneTrangThai(tt.ID)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
                                {checked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                              </View>
                              <Text style={styles.statusItemText}>{tt.TEN}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

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

              {svList.length > 0 && (
                <Text style={styles.sectionLabel}>Sinh viên ({svList.length})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingMain ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="person-search" size={48} color="#94a3b8" />
                <Text style={styles.muted}>
                  Chọn bộ lọc + bấm Tìm kiếm để xem danh sách sinh viên.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modal chi tiết bảng điểm */}
      <Modal
        visible={!!activeSv}
        animationType="slide"
        onRequestClose={closeDetail}
        presentationStyle="fullScreen"
      >
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetail} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeSv?.QLSV_NGUOIHOC_HODEM} {activeSv?.QLSV_NGUOIHOC_TEN}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeSv?.QLSV_NGUOIHOC_MASO} · {activeSv?.DAOTAO_LOPQUANLY_TEN}
              </Text>
            </View>
          </View>

          {/* Stats overview */}
          {activeSv && (
            <View style={styles.svDetailStats}>
              <View style={styles.svStatCell}>
                <Text style={styles.svStatLabel}>GPA Hệ 4</Text>
                <Text style={styles.svStatValue}>{activeSv.DTBTICHLUYHE4TOANKHOA || '-'}</Text>
              </View>
              <View style={styles.svStatDivider} />
              <View style={styles.svStatCell}>
                <Text style={styles.svStatLabel}>GPA Hệ 10</Text>
                <Text style={styles.svStatValue}>{activeSv.DTBTICHLUYHE10TOANKHOA || '-'}</Text>
              </View>
              <View style={styles.svStatDivider} />
              <View style={styles.svStatCell}>
                <Text style={styles.svStatLabel}>Số TC TL</Text>
                <Text style={styles.svStatValue}>{activeSv.SOTCTICHLUYTOANKHOA || '-'}</Text>
              </View>
            </View>
          )}

          <Text style={styles.detailSectionLabel}>Bảng điểm kết thúc ({diemList.length})</Text>

          {loadingDiem ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải bảng điểm...</Text>
            </View>
          ) : (
            <FlatList
              data={diemList}
              keyExtractor={(item) => item.ID}
              renderItem={renderDiem}
              contentContainerStyle={{ paddingBottom: 32 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Chưa có dữ liệu điểm kết thúc</Text>
                </View>
              }
            />
          )}
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

  // Trạng thái SV
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statusToggleText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  statusBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    width: '50%',
  },
  statusItemText: { fontSize: 13, color: '#0F172A', flex: 1 },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
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

  // Card SV
  svCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  svCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  svAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  svName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  svMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  svCode: { color: '#1E3A8A', fontWeight: '700' },
  svStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    maxWidth: 110,
  },
  svStatusText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },
  svCardStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  svStatCell: { flex: 1, alignItems: 'center' },
  svStatLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  svStatValue: { fontSize: 16, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },
  svStatDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  svCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  svFooterText: { flex: 1, fontSize: 12, color: '#475569' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // Detail modal
  modalHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  svDetailStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#F3F4F6',
  },

  // Diem row
  diemRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    gap: 12,
  },
  diemIndex: { width: 24, fontSize: 12, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  diemMid: { flex: 1 },
  diemTen: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
  diemMaMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  diemRight: { alignItems: 'flex-end', minWidth: 60 },
  diemValue: { fontSize: 18, color: '#1E3A8A', fontWeight: '700' },
  diemFail: { color: '#DC2626' },
  diemSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
});

export default LecturerStudentInfoScreen;
