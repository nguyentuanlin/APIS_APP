import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import appealService, { ThoiGianItem, PhucKhaoItem } from '../services/appealService';

const AppealScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [thoiGianList, setThoiGianList] = useState<ThoiGianItem[]>([]);
  const [selectedThoiGian, setSelectedThoiGian] = useState<string | null>(null);
  const [phucKhaoList, setPhucKhaoList] = useState<PhucKhaoItem[]>([]);
  const [loadingPhucKhao, setLoadingPhucKhao] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadThoiGian();
  }, []);

  const loadThoiGian = async () => {
    try {
      setLoading(true);
      const data = await appealService.getThoiGianList();
      // Filter out duplicate periods - only keep main periods (without comma)
      const filteredData = data.filter(item => !item.THOIGIAN.includes(','));
      setThoiGianList(filteredData);
      
      // Auto select first item
      if (filteredData.length > 0) {
        setSelectedThoiGian(filteredData[0].ID);
        loadPhucKhao(filteredData[0].ID);
      }
    } catch (error) {
      console.error('Error loading thoi gian:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhucKhao = async (thoiGianId: string | null) => {
    try {
      setLoadingPhucKhao(true);
      const data = await appealService.getPhucKhaoList(thoiGianId);
      setPhucKhaoList(data);
    } catch (error) {
      console.error('Error loading phuc khao:', error);
    } finally {
      setLoadingPhucKhao(false);
    }
  };

  const handleThoiGianChange = (value: string) => {
    setSelectedThoiGian(value);
    setShowDropdown(false);
    loadPhucKhao(value);
  };

  const getSelectedThoiGianLabel = () => {
    const selected = thoiGianList.find(item => item.ID === selectedThoiGian);
    return selected ? selected.THOIGIAN.replace(/_/g, ' - ') : 'Chọn học kỳ';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đăng ký xin phúc khảo</Text>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng ký xin phúc khảo</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Chọn học kỳ</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownButtonText}>{getSelectedThoiGianLabel()}</Text>
            <MaterialIcons
              name={showDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownContainer}>
              <ScrollView 
                style={styles.dropdownList} 
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                {thoiGianList.map((item) => (
                  <TouchableOpacity
                    key={item.ID}
                    style={[
                      styles.dropdownItem,
                      selectedThoiGian === item.ID && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleThoiGianChange(item.ID)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedThoiGian === item.ID && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {item.THOIGIAN.replace(/_/g, ' - ')}
                    </Text>
                    {selectedThoiGian === item.ID && (
                      <MaterialIcons name="check" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <MaterialIcons name="info" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.infoText}>
            Danh sách các môn học có thể đăng ký phúc khảo. Chọn học kỳ để xem chi tiết.
          </Text>
        </View>

        {/* Phuc Khao List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Danh sách phúc khảo ({phucKhaoList.length})
          </Text>

          {loadingPhucKhao ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : phucKhaoList.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có dữ liệu phúc khảo</Text>
              <Text style={styles.emptySubtext}>
                Chọn học kỳ khác hoặc chưa có môn nào cần phúc khảo
              </Text>
            </View>
          ) : (
            phucKhaoList.map((item) => (
              <View key={item.ID} style={styles.phucKhaoCard}>
                <View style={styles.phucKhaoHeader}>
                  <View style={styles.phucKhaoIcon}>
                    <MaterialIcons name="assignment" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.phucKhaoInfo}>
                    <Text style={styles.phucKhaoTitle}>{item.DAOTAO_HOCPHAN_TEN}</Text>
                    <Text style={styles.phucKhaoMeta}>Mã: {item.DAOTAO_HOCPHAN_MA}</Text>
                  </View>
                </View>

                <View style={styles.phucKhaoDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Điểm:</Text>
                    <Text style={styles.detailValue}>{item.DIEM}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                    <Text style={[styles.detailValue, styles.statusText]}>
                      {item.TRANGTHAI}
                    </Text>
                  </View>
                  {item.NGAYGUI && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngày gửi:</Text>
                      <Text style={styles.detailValue}>{item.NGAYGUI}</Text>
                    </View>
                  )}
                  {item.NOIDUNG && (
                    <View style={styles.detailRowVertical}>
                      <Text style={styles.detailLabel}>Nội dung:</Text>
                      <Text style={styles.detailContent}>{item.NOIDUNG}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="edit" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Đăng ký phúc khảo</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Lưu ý</Text>
          <View style={styles.instructionItem}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
            <Text style={styles.instructionText}>
              Kiểm tra kỹ điểm số trước khi đăng ký phúc khảo
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
            <Text style={styles.instructionText}>
              Thời gian xử lý phúc khảo từ 7-10 ngày làm việc
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
            <Text style={styles.instructionText}>
              Kết quả sẽ được thông báo qua email
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  gradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 300,
    overflow: 'hidden',
  },
  dropdownList: {
    flexGrow: 0,
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
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  phucKhaoCard: {
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
  phucKhaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  phucKhaoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phucKhaoInfo: {
    flex: 1,
  },
  phucKhaoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  phucKhaoMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  phucKhaoDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailRowVertical: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  statusText: {
    color: '#10B981',
  },
  detailContent: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
});

export default AppealScreen;
