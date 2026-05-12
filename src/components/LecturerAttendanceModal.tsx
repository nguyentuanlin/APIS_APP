// Modal điểm danh thủ công của giảng viên cho 1 buổi học.
// Dùng cả cho action "Điểm danh" và "DS sinh viên" (cùng 1 UI, chỉ là sửa được).
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
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  lecturerScheduleService as svc,
  LichGiangItem,
  KieuChuyenCanItem,
  SinhVienLichItem,
} from '../services/lecturerScheduleService';

interface Props {
  visible: boolean;
  lich: LichGiangItem | null;
  onClose: () => void;
}

// Map trạng thái mặc định: empty = Có mặt (không lưu gì)
// Khi user chọn KieuChuyenCan_Id nào đó thì lưu kiểu đó

// Tìm ID của kiểu "Có mặt" trong list để default cho mọi SV chưa có record
const findCoMatId = (kieu: KieuChuyenCanItem[]): string => {
  const found = kieu.find((k) => {
    const ten = (k.TEN || '').toLowerCase();
    const ma = (k.MA || '').toUpperCase();
    return (
      ten.includes('có mặt') ||
      ten === 'comat' ||
      ma === 'COMAT' ||
      ma === 'CM' ||
      ma === 'CO_MAT'
    );
  });
  return found?.ID || '';
};

const LecturerAttendanceModal: React.FC<Props> = ({ visible, lich, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [kieuList, setKieuList] = useState<KieuChuyenCanItem[]>([]);
  const [svList, setSvList] = useState<SinhVienLichItem[]>([]);
  // selectedMap: SV ID → KIEUCHUYENCAN_ID (luôn là ID, không null nữa)
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({});
  const [originalMap, setOriginalMap] = useState<Record<string, string>>({});
  // soLuongMap: SV ID → số tiết vắng/có mặt (web cho phép nhập)
  const [soLuongMap, setSoLuongMap] = useState<Record<string, number>>({});
  const [originalSoLuongMap, setOriginalSoLuongMap] = useState<Record<string, number>>({});
  const [coMatId, setCoMatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Số tiết của buổi học (default cho vắng)
  const tongTiet = lich
    ? Math.max(1, Number(lich.TIETKETTHUC || 1) - Number(lich.TIETBATDAU || 1) + 1)
    : 1;

  useEffect(() => {
    if (!visible || !lich) {
      // Reset khi đóng modal
      if (!visible) {
        setKieuList([]);
        setSvList([]);
        setSelectedMap({});
        setOriginalMap({});
        setSoLuongMap({});
        setOriginalSoLuongMap({});
        setCoMatId('');
        setKeyword('');
        setLoading(true);
      }
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [kieuRes, svRes] = await Promise.allSettled([
          svc.getKieuChuyenCan(lich.IDLOPHOCPHAN),
          svc.getSinhVienLich(lich.IDLOPHOCPHAN, lich.NGAYHOC, lich.GIOBATDAU, lich.PHUTBATDAU),
        ]);

        const kieu = kieuRes.status === 'fulfilled' ? kieuRes.value : [];
        const sv = svRes.status === 'fulfilled' ? svRes.value : [];
        setKieuList(kieu);
        setSvList(sv);

        if (kieuRes.status === 'rejected') {
          console.warn('[Attendance] getKieuChuyenCan fail:', (kieuRes.reason as any)?.message);
        }
        if (svRes.status === 'rejected') throw svRes.reason;

        // Tìm ID "Có mặt" để default cho mọi SV chưa điểm danh
        const cmId = findCoMatId(kieu);
        setCoMatId(cmId);

        // Load kết quả điểm danh đã ghi
        let kq: any[] = [];
        try {
          kq = await svc.getKetQuaChuyenCan(
            lich.IDLOPHOCPHAN,
            lich.NGAYHOC,
            lich.GIOBATDAU,
            lich.PHUTBATDAU
          );
        } catch (e: any) {
          console.warn('[Attendance] getKetQuaChuyenCan fail:', e?.message);
        }

        // Default: mọi SV = "Có mặt" với số tiết = tổng tiết
        const map: Record<string, string> = {};
        const sl: Record<string, number> = {};
        sv.forEach((s) => {
          map[s.QLSV_NGUOIHOC_ID] = cmId;
          sl[s.QLSV_NGUOIHOC_ID] = tongTiet;
        });
        // Override theo dữ liệu thật từ server (loose check vì có thể GIATRI là string)
        kq.forEach((r: any) => {
          if (r.GIATRI == 1) {
            map[r.QLSV_NGUOIHOC_ID] = r.KIEUCHUYENCAN_ID;
            sl[r.QLSV_NGUOIHOC_ID] = Number(r.SOLUONG) || 0;
          }
        });
        setSelectedMap(map);
        setOriginalMap({ ...map });
        setSoLuongMap(sl);
        setOriginalSoLuongMap({ ...sl });
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu điểm danh', [
          { text: 'OK', onPress: onClose },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, lich?.ID]);

  const filteredSv = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return svList;
    return svList.filter(
      (s) =>
        (s.QLSV_NGUOIHOC_MASO || '').toLowerCase().includes(kw) ||
        `${s.QLSV_NGUOIHOC_HODEM} ${s.QLSV_NGUOIHOC_TEN}`.toLowerCase().includes(kw)
    );
  }, [svList, keyword]);

  const stats = useMemo(() => {
    let coMat = 0;
    let vang = 0;
    Object.values(selectedMap).forEach((v) => {
      if (v === coMatId) coMat++;
      else if (v) vang++;
    });
    return { coMat, vang, total: svList.length };
  }, [selectedMap, svList.length, coMatId]);

  // Tìm tên của kiểu chuyên cần để check màu chip
  const isCoMatKieu = (id: string) => id === coMatId;

  // Lưu các thay đổi
  const handleSave = async () => {
    if (!lich) return;
    const changed = svList.filter((s) => {
      const newKieu = selectedMap[s.QLSV_NGUOIHOC_ID];
      const oldKieu = originalMap[s.QLSV_NGUOIHOC_ID];
      const newSL = soLuongMap[s.QLSV_NGUOIHOC_ID] || 0;
      const oldSL = originalSoLuongMap[s.QLSV_NGUOIHOC_ID] || 0;
      return newKieu !== oldKieu || newSL !== oldSL;
    });

    if (changed.length === 0) {
      Alert.alert('Thông báo', 'Không có thay đổi để lưu.');
      return;
    }

    Alert.alert('Xác nhận', `Lưu điểm danh cho ${changed.length} sinh viên?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Lưu',
        onPress: async () => {
          setSaving(true);
          let ok = 0;
          let fail = 0;
          for (const sv of changed) {
            const newKieu = selectedMap[sv.QLSV_NGUOIHOC_ID];
            const oldKieu = originalMap[sv.QLSV_NGUOIHOC_ID];
            const newSL = soLuongMap[sv.QLSV_NGUOIHOC_ID] || 0;
            try {
              if (oldKieu && oldKieu !== newKieu) {
                await svc.deleteDiemDanh({
                  sv,
                  kieuChuyenCanId: oldKieu,
                  ngayHoc: lich.NGAYHOC,
                  gioBatDau: lich.GIOBATDAU,
                  phutBatDau: lich.PHUTBATDAU,
                });
              }
              if (newKieu) {
                await svc.saveDiemDanh({
                  sv,
                  kieuChuyenCanId: newKieu,
                  ngayHoc: lich.NGAYHOC,
                  gioBatDau: lich.GIOBATDAU,
                  phutBatDau: lich.PHUTBATDAU,
                  soLuong: newSL,
                });
              }
              ok++;
            } catch (e) {
              fail++;
            }
          }
          setSaving(false);
          setOriginalMap({ ...selectedMap });
          setOriginalSoLuongMap({ ...soLuongMap });
          Alert.alert(
            'Kết quả',
            `Đã lưu: ${ok}/${changed.length}${fail > 0 ? `\nThất bại: ${fail}` : ''}`
          );
        },
      },
    ]);
  };

  // Render 1 SV
  const renderSv = ({ item, index }: { item: SinhVienLichItem; index: number }) => {
    const selectedKieuId = selectedMap[item.QLSV_NGUOIHOC_ID];
    const currentSoLuong = soLuongMap[item.QLSV_NGUOIHOC_ID] ?? 0;
    const isVangChon = !!selectedKieuId && !isCoMatKieu(selectedKieuId);
    return (
      <View style={styles.svCard}>
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
            <Text style={styles.svMeta}>
              {item.QLSV_NGUOIHOC_MASO}
              {item.SOBUOIVANG ? ` · Đã vắng ${item.SOBUOIVANG}` : ''}
            </Text>
          </View>
        </View>

        {/* Chips trạng thái — chỉ render từ API, không duplicate */}
        <View style={styles.chipRow}>
          {kieuList.map((k) => {
            const active = selectedKieuId === k.ID;
            const isCoMat = isCoMatKieu(k.ID);
            return (
              <TouchableOpacity
                key={k.ID}
                style={[
                  styles.chip,
                  active && (isCoMat ? styles.chipPresent : styles.chipAbsent),
                ]}
                onPress={() => {
                  setSelectedMap((prev) => ({ ...prev, [item.QLSV_NGUOIHOC_ID]: k.ID }));
                  // Auto fill số tiết: Có mặt = tổng tiết, Vắng = tổng tiết (mặc định)
                  setSoLuongMap((prev) => ({
                    ...prev,
                    [item.QLSV_NGUOIHOC_ID]: tongTiet,
                  }));
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {isCoMat ? '✓ ' : ''}
                  {k.TEN}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ô số tiết khi chọn kiểu vắng */}
        {isVangChon && (
          <View style={styles.soTietRow}>
            <MaterialIcons name="schedule" size={14} color="#DC2626" />
            <Text style={styles.soTietLabel}>Số tiết vắng:</Text>
            <TextInput
              style={styles.soTietInput}
              value={String(currentSoLuong)}
              onChangeText={(v) => {
                const n = Number(v.replace(/[^0-9]/g, ''));
                setSoLuongMap((prev) => ({ ...prev, [item.QLSV_NGUOIHOC_ID]: n }));
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.soTietLabel}>/ {tongTiet} tiết</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Điểm danh: {lich?.TENHOCPHAN}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {lich?.NGAYHOC} · Tiết {lich?.TIETBATDAU}-{lich?.TIETKETTHUC} · {lich?.TENPHONGHOC}
            </Text>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Sĩ số</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCellDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Có mặt</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.coMat}</Text>
          </View>
          <View style={styles.statCellDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Vắng</Text>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.vang}</Text>
          </View>
        </View>

        {/* Search SV */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm SV theo mã hoặc tên..."
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <MaterialIcons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.muted}>Đang tải...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSv}
            keyExtractor={(item) => item.QLSV_NGUOIHOC_ID}
            renderItem={renderSv}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Không có sinh viên</Text>
              </View>
            }
          />
        )}

        {!loading && svList.length > 0 && (
          <View style={styles.footer}>
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
                  <Text style={styles.saveBtnText}>Lưu điểm danh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  headerSubtitle: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statCell: { flex: 1, alignItems: 'center' },
  statCellDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  statLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 18, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },

  // SV card
  svCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  svRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10b981',
  },
  chipAbsent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  chipTextActive: { fontWeight: '700' },

  soTietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  soTietLabel: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  soTietInput: {
    width: 50,
    height: 32,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
  },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', padding: 30 },
  muted: { color: '#64748B', marginTop: 10, fontSize: 13 },

  footer: {
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

export default LecturerAttendanceModal;
