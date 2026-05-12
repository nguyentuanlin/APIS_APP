// Modal "Yêu cầu đổi lịch" — port web modal_doilich trong lichgiang.html.
// Cho phép GV gửi yêu cầu đổi: ngày học, tiết, phòng học. Đổi GV tạm bỏ qua.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  lecturerScheduleService as svc,
  LichGiangItem,
  PhongHocItem,
} from '../services/lecturerScheduleService';

interface Props {
  visible: boolean;
  lich: LichGiangItem | null;
  onClose: () => void;
}

const LecturerScheduleChangeModal: React.FC<Props> = ({ visible, lich, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Thông tin hiện tại
  const [tenLop, setTenLop] = useState('');
  const [ngayHocCu, setNgayHocCu] = useState('');
  const [tietBatDauCu, setTietBatDauCu] = useState('');
  const [tietKetThucCu, setTietKetThucCu] = useState('');
  const [phongHocCu, setPhongHocCu] = useState('');

  // Form đổi sang
  const [noiDung, setNoiDung] = useState('');
  const [ngayHocMoi, setNgayHocMoi] = useState('');
  const [tietBatDauMoi, setTietBatDauMoi] = useState('');
  const [tietKetThucMoi, setTietKetThucMoi] = useState('');
  const [phongList, setPhongList] = useState<PhongHocItem[]>([]);
  const [phongMoiId, setPhongMoiId] = useState('');
  const [phongPickerOpen, setPhongPickerOpen] = useState(false);

  // Load form khi mở
  useEffect(() => {
    if (!visible || !lich) return;
    (async () => {
      setLoading(true);
      try {
        const data = await svc.getKhoiTaoDoiLich(lich);
        const tt = data.rsThongTinChung[0];
        if (tt) {
          setTenLop(tt.LOPHOCPHAN_TEN || lich.TENLOPHOCPHAN || '');
          setNgayHocCu(tt.NGAYHOC || lich.NGAYHOC || '');
          setNgayHocMoi(tt.NGAYHOC_THAYDOI || tt.NGAYHOC || '');
          setTietBatDauCu(String(tt.TIETBATDAU || lich.TIETBATDAU || ''));
          setTietBatDauMoi(String(tt.TIETBATDAU_THAYDOI || tt.TIETBATDAU || ''));
          setTietKetThucCu(String(tt.TIETKETTHUC || lich.TIETKETTHUC || ''));
          setTietKetThucMoi(String(tt.TIETKETTHUC_THAYDOI || tt.TIETKETTHUC || ''));
          setPhongHocCu(tt.PHONGHOC_TEN || lich.TENPHONGHOC || '');
          setPhongMoiId(tt.IDPHONGHOC_THAYDOI || lich.IDPHONGHOC || '');
          setNoiDung(tt.NOIDUNG || '');
        }
        setPhongList(data.rsDanhMucPhong);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được thông tin đổi lịch');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, lich?.ID]);

  const handleSubmit = async () => {
    if (!lich) return;
    if (!noiDung.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung xin đổi lịch.');
      return;
    }
    if (!ngayHocMoi.trim() || !tietBatDauMoi.trim() || !tietKetThucMoi.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ ngày học và tiết.');
      return;
    }

    Alert.alert('Xác nhận', 'Gửi yêu cầu đổi lịch?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Gửi',
        onPress: async () => {
          setSubmitting(true);
          try {
            await svc.guiYeuCauDoiLich({
              lich,
              noiDung,
              ngayHocMoi,
              tietBatDauMoi,
              tietKetThucMoi,
              phongHocMoiId: phongMoiId,
            });
            Alert.alert('Thành công', 'Đã gửi yêu cầu đổi lịch.', [
              { text: 'OK', onPress: onClose },
            ]);
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Gửi yêu cầu thất bại');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const selectedPhong = phongList.find((p) => p.ID === phongMoiId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Yêu cầu đổi lịch</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {tenLop || lich?.TENLOPHOCPHAN}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.muted}>Đang tải form...</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
            {/* Nội dung */}
            <Text style={styles.label}>Nội dung xin đổi lịch *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={noiDung}
              onChangeText={setNoiDung}
              placeholder="Lý do xin đổi lịch..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            {/* Lớp HP - readonly */}
            <Text style={styles.label}>Lớp học phần</Text>
            <TextInput
              style={[styles.input, styles.readonly]}
              value={tenLop}
              editable={false}
            />

            {/* Thời gian */}
            <Text style={styles.sectionTitle}>Thời gian</Text>

            <View style={styles.changeRow}>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Ngày học (cũ)</Text>
                <TextInput style={[styles.input, styles.readonly]} value={ngayHocCu} editable={false} />
              </View>
              <View style={styles.arrowCol}>
                <MaterialIcons name="arrow-forward" size={20} color="#1E3A8A" />
                <Text style={styles.arrowText}>Đổi</Text>
              </View>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Ngày học (mới)</Text>
                <TextInput
                  style={styles.input}
                  value={ngayHocMoi}
                  onChangeText={setNgayHocMoi}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.changeRow}>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Tiết BĐ (cũ)</Text>
                <TextInput style={[styles.input, styles.readonly]} value={tietBatDauCu} editable={false} />
              </View>
              <View style={styles.arrowCol}>
                <MaterialIcons name="arrow-forward" size={18} color="#94A3B8" />
              </View>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Tiết BĐ (mới)</Text>
                <TextInput
                  style={styles.input}
                  value={tietBatDauMoi}
                  onChangeText={setTietBatDauMoi}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.changeRow}>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Tiết KT (cũ)</Text>
                <TextInput style={[styles.input, styles.readonly]} value={tietKetThucCu} editable={false} />
              </View>
              <View style={styles.arrowCol}>
                <MaterialIcons name="arrow-forward" size={18} color="#94A3B8" />
              </View>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Tiết KT (mới)</Text>
                <TextInput
                  style={styles.input}
                  value={tietKetThucMoi}
                  onChangeText={setTietKetThucMoi}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Phòng học */}
            <Text style={styles.sectionTitle}>Phòng học</Text>

            <View style={styles.changeRow}>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Phòng (cũ)</Text>
                <TextInput style={[styles.input, styles.readonly]} value={phongHocCu} editable={false} />
              </View>
              <View style={styles.arrowCol}>
                <MaterialIcons name="arrow-forward" size={20} color="#1E3A8A" />
                <Text style={styles.arrowText}>Đổi</Text>
              </View>
              <View style={styles.changeCol}>
                <Text style={styles.label}>Phòng (mới)</Text>
                <TouchableOpacity
                  style={[styles.input, styles.pickerInput]}
                  onPress={() => phongList.length > 0 && setPhongPickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.pickerInputText, !selectedPhong && { color: '#94A3B8' }]}
                    numberOfLines={1}
                  >
                    {selectedPhong?.TEN || phongHocCu || 'Chọn phòng'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        {!loading && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Picker phòng */}
        <Modal
          transparent
          animationType="fade"
          visible={phongPickerOpen}
          onRequestClose={() => setPhongPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setPhongPickerOpen(false)}
          >
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>Chọn phòng học</Text>
              <FlatList
                data={phongList}
                keyExtractor={(item) => item.ID}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, item.ID === phongMoiId && styles.pickerItemActive]}
                    onPress={() => {
                      setPhongMoiId(item.ID);
                      setPhongPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        item.ID === phongMoiId && { color: '#1E3A8A', fontWeight: '700' },
                      ]}
                    >
                      {item.TEN}
                    </Text>
                    {item.ID === phongMoiId && (
                      <MaterialIcons name="check" size={20} color="#1E3A8A" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
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
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },

  label: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 16,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  readonly: { backgroundColor: '#F1F5F9', color: '#475569' },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingRight: 6,
    height: 42,
  },
  pickerInputText: { flex: 1, fontSize: 14, color: '#0F172A' },

  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 4,
  },
  changeCol: { flex: 1 },
  arrowCol: {
    width: 50,
    alignItems: 'center',
    paddingBottom: 10,
  },
  arrowText: { fontSize: 10, color: '#1E3A8A', fontWeight: '700' },

  centerBox: { alignItems: 'center', justifyContent: 'center', flex: 1 },
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Picker phòng
  pickerBackdrop: {
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
  pickerTitle: {
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
});

export default LecturerScheduleChangeModal;
