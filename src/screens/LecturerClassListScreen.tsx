// Danh sách người học theo lớp (CCB.NHTL) — port `nguoihoc.html` + `.js`.
// - Filter Thời gian / Học phần
// - 3 nút action: Danh sách / Xác nhận hoàn thành điểm danh / Báo cáo
// - Checkbox đa chọn trên từng card lớp (cho Xác nhận / Báo cáo)
// - Tap card mở DS sinh viên trong lớp
import React, { useEffect, useState } from 'react';
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
  TextInput,
  Linking,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  lecturerClassListService as svc,
  ThoiGianItem,
  HocPhanItem,
  LopHocPhanItem,
  SinhVienItem,
  HanhDongXacNhanItem,
  DiemXacNhanItem,
  MauBaoCaoItem,
} from '../services/lecturerClassListService';

interface PickerProps<T extends { ID: string }> {
  label: string;
  data: T[];
  selectedId: string;
  onChange: (id: string) => void;
  getDisplay: (item: T) => string;
  emptyLabel?: string;
}
function Picker<T extends { ID: string }>({
  label,
  data,
  selectedId,
  onChange,
  getDisplay,
  emptyLabel = 'Tất cả',
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = data.find((d) => d.ID === selectedId);
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerField}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerValue, !selected && styles.pickerPlaceholder]} numberOfLines={1}>
          {selected ? getDisplay(selected) : emptyLabel}
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

const LecturerClassListScreen = () => {
  const navigation = useNavigation();

  const [thoiGianList, setThoiGianList] = useState<ThoiGianItem[]>([]);
  const [hocPhanList, setHocPhanList] = useState<HocPhanItem[]>([]);
  const [thoiGianId, setThoiGianId] = useState('');
  const [hocPhanId, setHocPhanId] = useState('');

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMain, setLoadingMain] = useState(false);
  const [lopList, setLopList] = useState<LopHocPhanItem[]>([]);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal DS sinh viên
  const [activeLop, setActiveLop] = useState<LopHocPhanItem | null>(null);
  const [svList, setSvList] = useState<SinhVienItem[]>([]);
  const [loadingSv, setLoadingSv] = useState(false);

  // Modal Xác nhận
  const [xacNhanOpen, setXacNhanOpen] = useState(false);
  const [hanhDongList, setHanhDongList] = useState<HanhDongXacNhanItem[]>([]);
  const [hanhDongId, setHanhDongId] = useState('');
  const [thongTin, setThongTin] = useState('');
  const [xacNhanHistory, setXacNhanHistory] = useState<DiemXacNhanItem[]>([]);
  const [loadingXacNhan, setLoadingXacNhan] = useState(false);
  const [submittingXacNhan, setSubmittingXacNhan] = useState(false);

  // Modal Báo cáo
  const [baoCaoOpen, setBaoCaoOpen] = useState(false);
  const [mauList, setMauList] = useState<MauBaoCaoItem[]>([]);
  const [loadingMau, setLoadingMau] = useState(false);
  const [generatingMa, setGeneratingMa] = useState<string | null>(null);

  // Init: load thời gian + học phần song song
  useEffect(() => {
    (async () => {
      try {
        const [tg, hp] = await Promise.all([svc.getThoiGian(), svc.getHocPhan()]);
        setThoiGianList(tg);
        setHocPhanList(hp);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được bộ lọc');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const handleSearch = async () => {
    setLoadingMain(true);
    setSelectedIds(new Set());
    try {
      const list = await svc.getLopHocPhan(thoiGianId, hocPhanId);
      setLopList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách lớp');
    } finally {
      setLoadingMain(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === lopList.length && lopList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lopList.map((l) => l.ID)));
    }
  };

  const openDetail = async (lop: LopHocPhanItem) => {
    setActiveLop(lop);
    setSvList([]);
    setLoadingSv(true);
    try {
      const list = await svc.getSinhVienLop(lop.IDLOPHOCPHAN || lop.ID);
      setSvList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách sinh viên');
    } finally {
      setLoadingSv(false);
    }
  };

  // ===== Xác nhận hoàn thành điểm danh =====
  const openXacNhan = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 lớp học phần.');
      return;
    }
    setXacNhanOpen(true);
    setHanhDongId('');
    setThongTin('');
    setHanhDongList([]);
    setXacNhanHistory([]);
    setLoadingXacNhan(true);
    try {
      const firstId = Array.from(selectedIds)[0];
      const [actions, history] = await Promise.all([
        svc.getHanhDongXacNhan(firstId),
        svc.getDanhSachXacNhan(firstId),
      ]);
      setHanhDongList(actions);
      setXacNhanHistory(history);
      if (actions.length === 1) setHanhDongId(actions[0].ID);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được thông tin xác nhận');
    } finally {
      setLoadingXacNhan(false);
    }
  };

  const submitXacNhan = async () => {
    if (!hanhDongId) {
      Alert.alert('Thông báo', 'Vui lòng chọn hành động xác nhận.');
      return;
    }
    setSubmittingXacNhan(true);
    const ids = Array.from(selectedIds);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await svc.themXacNhan({ lopHocPhanId: id, hanhDongId, thongTin });
        success++;
      } catch (e) {
        failed++;
      }
    }
    setSubmittingXacNhan(false);
    Alert.alert(
      'Kết quả',
      `Xác nhận thành công: ${success}/${ids.length}` + (failed ? `\nThất bại: ${failed}` : ''),
      [{ text: 'OK', onPress: () => setXacNhanOpen(false) }]
    );
  };

  // ===== Báo cáo =====
  const openBaoCao = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 lớp học phần.');
      return;
    }
    setBaoCaoOpen(true);
    setMauList([]);
    setLoadingMau(true);
    try {
      const list = await svc.getDSMauBaoCao();
      setMauList(list);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách mẫu báo cáo');
    } finally {
      setLoadingMau(false);
    }
  };

  const runBaoCao = async (mau: MauBaoCaoItem) => {
    setGeneratingMa(mau.MAUIMPORT_MA);
    try {
      const url = await svc.createBaoCao({
        maMau: mau.MAUIMPORT_MA,
        duongDan: mau.MAUIMPORT_DUONGDAN,
        saveFile: mau.XEMFILE,
        lopHocPhanIds: Array.from(selectedIds),
        thoiGianId,
        hocPhanId,
      });
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Lỗi', 'Không mở được URL báo cáo:\n' + url);
        return;
      }
      await Linking.openURL(url);
      setBaoCaoOpen(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Tạo báo cáo thất bại');
    } finally {
      setGeneratingMa(null);
    }
  };

  const renderLop = ({ item, index }: { item: LopHocPhanItem; index: number }) => {
    const isSelected = selectedIds.has(item.ID);
    return (
      <View style={[styles.lopCard, isSelected && styles.lopCardSelected]}>
        <View style={styles.lopHeader}>
          <TouchableOpacity
            style={styles.checkboxBox}
            onPress={() => toggleSelect(item.ID)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.lopIndex}>#{index + 1}</Text>
          </TouchableOpacity>
          <View style={styles.lopCountBadge}>
            <MaterialIcons name="people" size={12} color="#10b981" />
            <Text style={styles.lopCountText}>{item.SOLUONG || 0} SV</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.85}>
          <Text style={styles.lopMa}>{item.MALOP}</Text>
          <Text style={styles.lopTen} numberOfLines={2}>
            {item.TENLOP}
          </Text>
          {(item.NGAYBATDAU || item.NGAYKETTHUC) && (
            <View style={styles.lopMetaRow}>
              <MaterialIcons name="date-range" size={13} color="#64748B" />
              <Text style={styles.lopMeta}>
                {item.NGAYBATDAU || '-'} → {item.NGAYKETTHUC || '-'}
              </Text>
            </View>
          )}
          <View style={styles.lopAction}>
            <MaterialIcons name="visibility" size={14} color="#1E3A8A" />
            <Text style={styles.lopActionText}>Xem danh sách</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSv = ({ item, index }: { item: SinhVienItem; index: number }) => (
    <View style={styles.svRow}>
      <Text style={styles.svIndex}>{index + 1}</Text>
      <View style={styles.svAvatar}>
        <Text style={styles.svAvatarText}>
          {(item.QLSV_NGUOIHOC_TEN || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.svName} numberOfLines={1}>
          {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
        </Text>
        <Text style={styles.svMeta} numberOfLines={1}>
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>DS người học theo lớp</Text>
          <Text style={styles.headerSubtitle}>Lớp học phần đang giảng dạy</Text>
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.muted}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={lopList}
          keyExtractor={(item) => item.ID}
          renderItem={renderLop}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={handleSearch} />}
          ListHeaderComponent={
            <View>
              <View style={styles.filtersBox}>
                <Picker
                  label="Thời gian"
                  data={thoiGianList}
                  selectedId={thoiGianId}
                  onChange={setThoiGianId}
                  getDisplay={(it) => it.THOIGIAN}
                  emptyLabel="Tất cả học kỳ"
                />
                <Picker
                  label="Học phần"
                  data={hocPhanList}
                  selectedId={hocPhanId}
                  onChange={setHocPhanId}
                  getDisplay={(it) => (it.MA ? `${it.TEN} (${it.MA})` : it.TEN)}
                  emptyLabel="Tất cả học phần"
                />
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnSearch]}
                    onPress={handleSearch}
                    disabled={loadingMain}
                    activeOpacity={0.85}
                  >
                    {loadingMain ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="search" size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Danh sách</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnConfirm]}
                    onPress={openXacNhan}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="task-alt" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Xác nhận</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnReport]}
                    onPress={openBaoCao}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="description" size={16} color="#1E3A8A" />
                    <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>Báo cáo</Text>
                  </TouchableOpacity>
                </View>
                {lopList.length > 0 && (
                  <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedIds.size === lopList.length && styles.checkboxChecked,
                      ]}
                    >
                      {selectedIds.size === lopList.length && (
                        <MaterialIcons name="check" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.selectAllText}>
                      Chọn tất cả ({selectedIds.size}/{lopList.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {lopList.length > 0 && (
                <Text style={styles.sectionLabel}>Danh sách lớp ({lopList.length})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadingMain ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="class" size={48} color="#94a3b8" />
                <Text style={styles.muted}>
                  Chọn bộ lọc rồi bấm Danh sách để xem các lớp đang giảng dạy.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modal DS sinh viên */}
      <Modal
        visible={!!activeLop}
        animationType="slide"
        onRequestClose={() => setActiveLop(null)}
        presentationStyle="fullScreen"
      >
        <View style={styles.container}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setActiveLop(null)} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeLop?.TENLOP}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeLop?.MALOP} · {svList.length} sinh viên
              </Text>
            </View>
          </View>

          {loadingSv ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải danh sách...</Text>
            </View>
          ) : (
            <FlatList
              data={svList}
              keyExtractor={(item) => item.QLSV_NGUOIHOC_ID}
              renderItem={renderSv}
              contentContainerStyle={{ paddingBottom: 20 }}
              ItemSeparatorComponent={() => <View style={styles.svDivider} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>Chưa có sinh viên</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Modal Xác nhận hoàn thành điểm danh */}
      <Modal
        visible={xacNhanOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setXacNhanOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Xác nhận hoàn thành điểm danh</Text>
              <TouchableOpacity onPress={() => setXacNhanOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingXacNhan ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 480 }}>
                <Text style={styles.sheetMeta}>Đã chọn {selectedIds.size} lớp học phần</Text>

                <Text style={styles.sheetLabel}>Hành động xác nhận</Text>
                <View style={styles.chipRow}>
                  {hanhDongList.map((hd) => {
                    const active = hd.ID === hanhDongId;
                    return (
                      <TouchableOpacity
                        key={hd.ID}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setHanhDongId(hd.ID)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {hd.TEN}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {hanhDongList.length === 0 && (
                    <Text style={styles.muted}>Không có hành động khả dụng</Text>
                  )}
                </View>

                <Text style={styles.sheetLabel}>Nội dung (tùy chọn)</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  value={thongTin}
                  onChangeText={setThongTin}
                  placeholder="Nhập mô tả/ghi chú..."
                  placeholderTextColor="#94A3B8"
                />

                {xacNhanHistory.length > 0 && (
                  <>
                    <Text style={styles.sheetLabel}>Lịch sử xác nhận</Text>
                    {xacNhanHistory.map((h, idx) => (
                      <View key={idx} style={styles.historyRow}>
                        <Text style={styles.historyTen}>{h.TEN}</Text>
                        <Text style={styles.historyMeta}>
                          {h.NGUOIXACNHAN_TENDAYDU || '-'} · {h.NGAYTAO_DD_MM_YYYY || '-'}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnCancel]}
                onPress={() => setXacNhanOpen(false)}
                disabled={submittingXacNhan}
              >
                <Text style={styles.sheetBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                onPress={submitXacNhan}
                disabled={submittingXacNhan || loadingXacNhan}
              >
                {submittingXacNhan ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sheetBtnPrimaryText}>Đồng ý xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Báo cáo */}
      <Modal
        visible={baoCaoOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBaoCaoOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Báo cáo</Text>
              <TouchableOpacity onPress={() => setBaoCaoOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetMeta}>Đã chọn {selectedIds.size} lớp học phần</Text>

            {loadingMau ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#1E3A8A" />
              </View>
            ) : (
              <FlatList
                data={mauList}
                keyExtractor={(item) => item.MAUIMPORT_MA}
                style={{ maxHeight: 460 }}
                ItemSeparatorComponent={() => <View style={styles.svDivider} />}
                renderItem={({ item, index }) => {
                  const loading = generatingMa === item.MAUIMPORT_MA;
                  return (
                    <TouchableOpacity
                      style={styles.mauRow}
                      onPress={() => runBaoCao(item)}
                      disabled={!!generatingMa}
                    >
                      <View style={styles.mauIcon}>
                        <MaterialIcons name="description" size={18} color="#1E3A8A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mauName} numberOfLines={2}>
                          {index + 1}. {item.MAUIMPORT_TENFILEMAU}
                        </Text>
                        <Text style={styles.mauCode}>{item.MAUIMPORT_MA}</Text>
                      </View>
                      {loading ? (
                        <ActivityIndicator color="#1E3A8A" size="small" />
                      ) : (
                        <MaterialIcons name="download" size={18} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.muted}>Không có mẫu báo cáo</Text>
                  </View>
                }
              />
            )}
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
  detailHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
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

  btnRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
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
  btnSearch: { backgroundColor: '#1E3A8A' },
  btnConfirm: { backgroundColor: '#10B981' },
  btnReport: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1E3A8A' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  selectAllText: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card lớp
  lopCard: {
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
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  lopCardSelected: { borderColor: '#1E3A8A', backgroundColor: '#F0F7FF' },
  lopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkboxBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  lopIndex: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  lopCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lopCountText: { fontSize: 11, color: '#10b981', fontWeight: '700' },
  lopMa: { fontSize: 13, color: '#1E3A8A', fontWeight: '700', marginTop: 6 },
  lopTen: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginTop: 2 },
  lopMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  lopMeta: { fontSize: 12, color: '#475569' },
  lopAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lopActionText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, textAlign: 'center', fontSize: 13, paddingHorizontal: 24 },

  // SV row
  svRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  svDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 60 },
  svIndex: { width: 24, textAlign: 'center', color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  svAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svAvatarText: { color: '#FFFFFF', fontWeight: '700' },
  svName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  svMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  svCode: { color: '#1E3A8A', fontWeight: '700' },
  svStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    maxWidth: 100,
  },
  svStatusText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  sheetMeta: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  textArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#0F172A',
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  historyRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyTen: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  historyMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
  sheetBtnPrimary: { backgroundColor: '#10B981' },
  sheetBtnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },

  // Report mau row
  mauRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  mauIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mauName: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  mauCode: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});

export default LecturerClassListScreen;
