import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import registrationService, {
  ThoiGianHoc,
  RegistrationResponse,
  KetQuaDangKy,
  LichSuDangKy,
} from '../../services/registrationService';

const RegistrationResults = () => {
  const [loading, setLoading] = useState(true);
  const [thoiGianList, setThoiGianList] = useState<ThoiGianHoc[]>([]);
  const [selectedThoiGian, setSelectedThoiGian] = useState<string>('');
  const [registrationData, setRegistrationData] = useState<RegistrationResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState<'ketqua' | 'lichsu'>('ketqua');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load danh sách thời gian
      const thoiGian = await registrationService.getThoiGianHoc();
      setThoiGianList(thoiGian);
      
      // Load tất cả kết quả (không filter)
      const data = await registrationService.getKetQuaDangKy();
      setRegistrationData(data);
    } catch (error) {
      console.error('Error loading registration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectThoiGian = async (thoiGianId: string) => {
    try {
      setSelectedThoiGian(thoiGianId);
      setShowDropdown(false);
      setLoading(true);
      
      // Nếu chọn "Tất cả", load không filter
      const data = await registrationService.getKetQuaDangKy(
        thoiGianId === '' ? undefined : thoiGianId
      );
      setRegistrationData(data);
    } catch (error) {
      console.error('Error loading filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedLabel = () => {
    if (!selectedThoiGian) return 'Tất cả';
    const selected = thoiGianList.find(t => t.ID === selectedThoiGian);
    return selected ? registrationService.formatThoiGian(selected.THOIGIAN) : 'Tất cả';
  };

  if (loading && !registrationData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dropdown chọn thời gian */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Thời gian:</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowDropdown(true)}
        >
          <Text style={styles.dropdownText}>{getSelectedLabel()}</Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Modal dropdown */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Chọn thời gian</Text>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dropdownList}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedThoiGian === '' && styles.dropdownItemActive,
                ]}
                onPress={() => handleSelectThoiGian('')}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedThoiGian === '' && styles.dropdownItemTextActive,
                  ]}
                >
                  Tất cả
                </Text>
                {selectedThoiGian === '' && (
                  <MaterialIcons name="check" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
              
              {thoiGianList.map((item) => (
                <TouchableOpacity
                  key={item.ID}
                  style={[
                    styles.dropdownItem,
                    selectedThoiGian === item.ID && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleSelectThoiGian(item.ID)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedThoiGian === item.ID && styles.dropdownItemTextActive,
                    ]}
                  >
                    {registrationService.formatThoiGian(item.THOIGIAN)}
                  </Text>
                  {selectedThoiGian === item.ID && (
                    <MaterialIcons name="check" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'ketqua' && styles.tabActive]}
          onPress={() => setActiveSection('ketqua')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'ketqua' && styles.tabTextActive,
            ]}
          >
            Kết quả đăng ký ({registrationData?.rsKetQuaDangKy?.length || 0})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeSection === 'lichsu' && styles.tabActive]}
          onPress={() => setActiveSection('lichsu')}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === 'lichsu' && styles.tabTextActive,
            ]}
          >
            Lịch sử ({registrationData?.rsLichSuDangKy?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : activeSection === 'ketqua' ? (
          <KetQuaSection data={registrationData?.rsKetQuaDangKy || []} />
        ) : (
          <LichSuSection data={registrationData?.rsLichSuDangKy || []} />
        )}
      </ScrollView>
    </View>
  );
};

// Component hiển thị kết quả đăng ký
const KetQuaSection = ({ data }: { data: KetQuaDangKy[] }) => {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có kết quả đăng ký</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {data.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.DAOTAO_HOCPHAN_TEN}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.DAOTAO_HOCPHAN_HOCTRINH} TC</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Mã HP:</Text>
            <Text style={styles.value}>{item.DAOTAO_HOCPHAN_MA}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Lớp HP:</Text>
            <Text style={styles.value}>{item.DANGKY_LOPHOCPHAN_MA}</Text>
          </View>

          {item.THONGTINGIANGVIEN && (
            <View style={styles.cardRow}>
              <Text style={styles.label}>Giảng viên:</Text>
              <Text style={styles.value}>{item.THONGTINGIANGVIEN}</Text>
            </View>
          )}

          <View style={styles.cardRow}>
            <Text style={styles.label}>Kiểu học:</Text>
            <Text style={styles.value}>{item.KIEUHOC_TEN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Thời gian:</Text>
            <Text style={styles.value}>{item.THOIGIAN}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <MaterialIcons name="person" size={14} color="#6B7280" />
              <Text style={styles.footerText}>{item.NGUOITAO_TENDAYDU}</Text>
            </View>
            <View style={styles.footerItem}>
              <MaterialIcons name="access-time" size={14} color="#6B7280" />
              <Text style={styles.footerText}>{item.NGAYTAO_DD_MM_YYYY_HHMMSS}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// Component hiển thị lịch sử đăng ký
const LichSuSection = ({ data }: { data: LichSuDangKy[] }) => {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có lịch sử đăng ký</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {data.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.TENHOCPHAN}</Text>
            <View
              style={[
                styles.statusBadge,
                item.HANHDONG === 'DangKyHocTrucTiep'
                  ? styles.statusSuccess
                  : styles.statusWarning,
              ]}
            >
              <Text style={styles.statusText}>
                {item.HANHDONG === 'DangKyHocTrucTiep' ? 'Đăng ký' : item.HANHDONG}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Mã HP:</Text>
            <Text style={styles.value}>{item.MAHOCPHAN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Lớp HP:</Text>
            <Text style={styles.value}>{item.DSLOPHOCPHAN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Chương trình:</Text>
            <Text style={styles.value}>{item.DAOTAO_CHUONGTRINH_TEN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Lớp quản lý:</Text>
            <Text style={styles.value}>{item.DAOTAO_LOPQUANLY_TEN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Khóa:</Text>
            <Text style={styles.value}>{item.DAOTAO_KHOADAOTAO_TEN}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Người thực hiện:</Text>
            <Text style={styles.value}>{item.NGUOITHUCHIEN_TENDAYDU}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.label}>Tài khoản:</Text>
            <Text style={styles.value}>{item.NGUOITHUCHIEN_TAIKHOAN}</Text>
          </View>

          {item.KETQUA && (
            <View style={styles.cardRow}>
              <Text style={styles.label}>Kết quả:</Text>
              <Text style={styles.value}>{item.KETQUA}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <MaterialIcons name="access-time" size={14} color="#6B7280" />
              <Text style={styles.footerText}>{item.THOIGIANTHUCHIEN}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    width: 110,
  },
  value: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default RegistrationResults;
