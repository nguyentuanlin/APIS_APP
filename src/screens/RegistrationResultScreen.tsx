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
import registrationResultService, { KeHoachDangKy, LopHocPhan } from '../services/registrationResultService';
import appealService, { ThoiGianItem } from '../services/appealService';
import AttendanceModal from '../components/AttendanceModal';
import ProcessScoreModal from '../components/ProcessScoreModal';
import CourseDetailModal from '../components/CourseDetailModal';

const RegistrationResultScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [thoiGianList, setThoiGianList] = useState<ThoiGianItem[]>([]);
  const [selectedThoiGian, setSelectedThoiGian] = useState<string | null>(null);
  const [keHoachList, setKeHoachList] = useState<KeHoachDangKy[]>([]);
  const [selectedKeHoach, setSelectedKeHoach] = useState<string | null>(null);
  const [lopHocPhanList, setLopHocPhanList] = useState<LopHocPhan[]>([]);
  const [loadingKeHoach, setLoadingKeHoach] = useState(false);
  const [loadingLopHocPhan, setLoadingLopHocPhan] = useState(false);
  const [showThoiGianDropdown, setShowThoiGianDropdown] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showProcessScoreModal, setShowProcessScoreModal] = useState(false);
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedLopHocPhan, setSelectedLopHocPhan] = useState<{ id: string; ten: string } | null>(null);

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
        loadKeHoach(filteredData[0].ID);
      }
    } catch (error) {
      console.error('Error loading thoi gian:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKeHoach = async (thoiGianId: string) => {
    try {
      setLoadingKeHoach(true);
      const data = await registrationResultService.getKeHoachDangKyList(thoiGianId);
      setKeHoachList(data);
      
      // Auto select first item
      if (data.length > 0) {
        setSelectedKeHoach(data[0].ID);
        loadLopHocPhan(thoiGianId, data[0].ID);
      } else {
        setSelectedKeHoach(null);
        setLopHocPhanList([]);
      }
    } catch (error) {
      console.error('Error loading ke hoach:', error);
    } finally {
      setLoadingKeHoach(false);
    }
  };

  const loadLopHocPhan = async (thoiGianId: string, keHoachId: string) => {
    try {
      setLoadingLopHocPhan(true);
      const data = await registrationResultService.getKetQuaDangKy(thoiGianId, keHoachId);
      setLopHocPhanList(data);
    } catch (error) {
      console.error('Error loading lop hoc phan:', error);
    } finally {
      setLoadingLopHocPhan(false);
    }
  };

  const handleThoiGianChange = (value: string) => {
    setSelectedThoiGian(value);
    setShowThoiGianDropdown(false);
    loadKeHoach(value);
  };

  const getSelectedThoiGianLabel = () => {
    const selected = thoiGianList.find(item => item.ID === selectedThoiGian);
    return selected ? selected.THOIGIAN.replace(/_/g, ' - ') : 'Chọn học kỳ';
  };

  const getTotalCredits = () => {
    if (lopHocPhanList.length === 0) return 0;
    return lopHocPhanList[0]?.SOTINCHIDADANGKY || 0;
  };

  const getMaxCredits = () => {
    const keHoach = keHoachList.find(item => item.ID === selectedKeHoach);
    return keHoach?.SOTINCHITOIDA || 0;
  };

  const handleViewAttendance = (lopHocPhanId: string, lopHocPhanTen: string) => {
    setSelectedLopHocPhan({ id: lopHocPhanId, ten: lopHocPhanTen });
    setShowAttendanceModal(true);
  };

  const handleViewProcessScore = (lopHocPhanId: string, lopHocPhanTen: string) => {
    setSelectedLopHocPhan({ id: lopHocPhanId, ten: lopHocPhanTen });
    setShowProcessScoreModal(true);
  };

  const handleViewCourseDetail = (lopHocPhanId: string, lopHocPhanTen: string) => {
    setSelectedLopHocPhan({ id: lopHocPhanId, ten: lopHocPhanTen });
    setShowCourseDetailModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tra cứu kết quả đăng ký</Text>
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
          <Text style={styles.headerTitle}>Tra cứu kết quả đăng ký</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Chọn học kỳ</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowThoiGianDropdown(!showThoiGianDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownButtonText}>{getSelectedThoiGianLabel()}</Text>
            <MaterialIcons
              name={showThoiGianDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showThoiGianDropdown && (
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

        {/* Summary Card */}
        {selectedKeHoach && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="school" size={24} color="#3B82F6" />
              <Text style={styles.summaryTitle}>Tổng quan đăng ký</Text>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Số tín chỉ đã đăng ký:</Text>
                <Text style={styles.summaryValue}>{getTotalCredits()}/{getMaxCredits()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Số môn học:</Text>
                <Text style={styles.summaryValue}>{lopHocPhanList.length}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Course List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Danh sách môn học ({lopHocPhanList.length})
          </Text>

          {loadingLopHocPhan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : lopHocPhanList.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có môn học nào</Text>
              <Text style={styles.emptySubtext}>
                Bạn chưa đăng ký môn học nào trong kỳ này
              </Text>
            </View>
          ) : (
            lopHocPhanList.map((item, index) => (
              <View key={item.ID} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <View style={styles.courseNumber}>
                    <Text style={styles.courseNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle}>{item.DAOTAO_HOCPHAN_TEN}</Text>
                    <Text style={styles.courseMeta}>
                      {item.DAOTAO_HOCPHAN_MA} • {item.DANGKY_LOPHOCPHAN_MA}
                    </Text>
                  </View>
                </View>

                <View style={styles.courseDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="person" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{item.GIANGVIEN}</Text>
                  </View>
                  
                  {item.THUHOC && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>Thứ {item.THUHOC}</Text>
                    </View>
                  )}

                  {item.THUHOC_TIETHOC && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{item.THUHOC_TIETHOC}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <MaterialIcons name="date-range" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {item.NGAYBATDAU} - {item.NGAYKETTHUC}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="class" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{item.THUOCTINHLOP_TEN}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialIcons name="people" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {item.SOTHUCTEDANGKYHOC}/{item.SOLUONGDUKIENHOC} sinh viên
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewAttendance(item.DANGKY_LOPHOCPHAN_ID, item.DAOTAO_HOCPHAN_TEN)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="fact-check" size={18} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Điểm danh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewProcessScore(item.DANGKY_LOPHOCPHAN_ID, item.DAOTAO_HOCPHAN_TEN)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="assessment" size={18} color="#10B981" />
                    <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Điểm quá trình</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => handleViewCourseDetail(item.DANGKY_LOPHOCPHAN_ID, item.DAOTAO_HOCPHAN_TEN)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="visibility" size={18} color="#F59E0B" />
                  <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Xem chi tiết</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Attendance Modal */}
      {selectedLopHocPhan && (
        <>
          <AttendanceModal
            visible={showAttendanceModal}
            onClose={() => setShowAttendanceModal(false)}
            lopHocPhanId={selectedLopHocPhan.id}
            lopHocPhanTen={selectedLopHocPhan.ten}
          />
          <ProcessScoreModal
            visible={showProcessScoreModal}
            onClose={() => setShowProcessScoreModal(false)}
            lopHocPhanId={selectedLopHocPhan.id}
            lopHocPhanTen={selectedLopHocPhan.ten}
          />
          <CourseDetailModal
            visible={showCourseDetailModal}
            onClose={() => setShowCourseDetailModal(false)}
            lopHocPhanId={selectedLopHocPhan.id}
            lopHocPhanTen={selectedLopHocPhan.ten}
          />
        </>
      )}
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
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
  courseCard: {
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
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  courseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
});

export default RegistrationResultScreen;
