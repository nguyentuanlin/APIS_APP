import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { examService, ExamScheduleItem, SemesterInfo } from '../services/examService';

const ExamScheduleScreen: React.FC = () => {
  const navigation = useNavigation();
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [personalExams, setPersonalExams] = useState<ExamScheduleItem[]>([]);
  const [generalExams, setGeneralExams] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examFilter, setExamFilter] = useState<'all' | 'upcoming' | 'passed'>('all');
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadExamSchedule();
    }
  }, [selectedSemester]);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const semesterList = await examService.getSemesters();
      setSemesters(semesterList);
      
      // Tự động chọn học kỳ hiện tại
      const currentSemester = examService.getCurrentSemester(semesterList);
      if (currentSemester) {
        setSelectedSemester(currentSemester.ID);
      }
    } catch (error) {
      console.error('Error loading semesters:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  };

  const loadExamSchedule = async () => {
    try {
      setLoading(true);
      const examData = await examService.getExamSchedule(selectedSemester);
      
      // Sắp xếp theo ngày
      const sortedPersonal = examService.sortExamsByDate(examData.rsLichThiCaNhan);
      const sortedGeneral = examService.sortExamsByDate(examData.rsKeHoachThiChung);
      
      setPersonalExams(sortedPersonal);
      setGeneralExams(sortedGeneral);
    } catch (error) {
      console.error('Error loading exam schedule:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch thi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExamSchedule();
    setRefreshing(false);
  };

  // Filter exams based on selected filter
  const filterExams = (exams: ExamScheduleItem[]) => {
    if (examFilter === 'all') return exams;
    
    return exams.filter(exam => {
      const isPassed = examService.isExamPassed(exam);
      if (examFilter === 'passed') return isPassed;
      if (examFilter === 'upcoming') return !isPassed;
      return true;
    });
  };

  const filteredPersonalExams = filterExams(personalExams);
  const filteredGeneralExams = filterExams(generalExams);

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Bộ lọc:</Text>
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            examFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setExamFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              examFilter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            examFilter === 'upcoming' && styles.filterButtonActive,
          ]}
          onPress={() => setExamFilter('upcoming')}
        >
          <Text
            style={[
              styles.filterButtonText,
              examFilter === 'upcoming' && styles.filterButtonTextActive,
            ]}
          >
            Chưa thi
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            examFilter === 'passed' && styles.filterButtonActive,
          ]}
          onPress={() => setExamFilter('passed')}
        >
          <Text
            style={[
              styles.filterButtonText,
              examFilter === 'passed' && styles.filterButtonTextActive,
            ]}
          >
            Đã thi
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExamCard = (exam: ExamScheduleItem, isPersonal: boolean = false) => {
    const isUpcoming = examService.isExamUpcoming(exam);
    const isPassed = examService.isExamPassed(exam);
    
    return (
      <View
        key={exam.IDLICHHOC || `${exam.MAHOCPHAN}-${exam.NGAYHOC}`}
        style={[
          styles.examCard,
          isUpcoming && styles.upcomingExam,
          isPassed && styles.passedExam,
        ]}
      >
        <View style={styles.examHeader}>
          <Text style={styles.subjectName}>{exam.TENHOCPHAN}</Text>
          <Text style={styles.subjectCode}>{exam.MAHOCPHAN}</Text>
        </View>
        
        <View style={styles.examDetails}>
          <View style={styles.examRow}>
            <Text style={styles.label}>Ngày thi:</Text>
            <Text style={styles.value}>{examService.formatExamDate(exam.NGAYHOC)}</Text>
          </View>
          
          <View style={styles.examRow}>
            <Text style={styles.label}>Thời gian:</Text>
            <Text style={styles.value}>
              {examService.formatExamTime(exam)} ({exam.CATHI})
            </Text>
          </View>
          
          <View style={styles.examRow}>
            <Text style={styles.label}>Hình thức:</Text>
            <Text style={styles.value}>{exam.DANGKY_LOPHOCPHAN_TEN}</Text>
          </View>
          
          {isPersonal && exam.PHONGHOC_MA && (
            <View style={styles.examRow}>
              <Text style={styles.label}>Phòng thi:</Text>
              <Text style={[styles.value, styles.roomText]}>{exam.PHONGHOC_MA}</Text>
            </View>
          )}
          
          {isPersonal && exam.SOBAODANH && (
            <View style={styles.examRow}>
              <Text style={styles.label}>Số báo danh:</Text>
              <Text style={[styles.value, styles.seatNumber]}>{exam.SOBAODANH}</Text>
            </View>
          )}
        </View>
        
        {isUpcoming && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingText}>Sắp thi</Text>
          </View>
        )}
        
        {isPassed && (
          <View style={styles.passedBadge}>
            <Text style={styles.passedText}>Đã thi</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSemesterPicker = () => {
    const selectedSemesterInfo = semesters.find(s => s.ID === selectedSemester);
    
    return (
      <>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Chọn học kỳ:</Text>
          <TouchableOpacity
            style={styles.customPicker}
            onPress={() => setShowSemesterModal(true)}
          >
            <Text style={styles.pickerText}>
              {selectedSemesterInfo 
                ? examService.formatSemesterName(selectedSemesterInfo)
                : '-- Chọn học kỳ --'
              }
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Custom Semester Modal */}
        <Modal
          visible={showSemesterModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSemesterModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSemesterModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn học kỳ</Text>
                <TouchableOpacity
                  onPress={() => setShowSemesterModal(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.semesterList}>
                {semesters.map((semester) => {
                  const isSelected = semester.ID === selectedSemester;
                  return (
                    <TouchableOpacity
                      key={semester.ID}
                      style={[
                        styles.semesterItem,
                        isSelected && styles.semesterItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedSemester(semester.ID);
                        setShowSemesterModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.semesterItemText,
                          isSelected && styles.semesterItemTextSelected,
                        ]}
                      >
                        {examService.formatSemesterName(semester)}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch thi</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải lịch thi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch thi</Text>
        <View style={styles.headerRight} />
      </View>

      {renderSemesterPicker()}
      
      {selectedSemester && renderFilterButtons()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedSemester ? (
          <>
            {/* Lịch thi cá nhân */}
            {filteredPersonalExams.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Lịch thi cá nhân ({filteredPersonalExams.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Đã được xếp phòng thi
                </Text>
                {filteredPersonalExams.map((exam) => renderExamCard(exam, true))}
              </View>
            )}
            
            {/* Kế hoạch thi chung */}
            {filteredGeneralExams.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Kế hoạch thi chung ({filteredGeneralExams.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Chưa được xếp phòng thi
                </Text>
                {filteredGeneralExams.map((exam) => renderExamCard(exam, false))}
              </View>
            )}
            
            {filteredPersonalExams.length === 0 && filteredGeneralExams.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {examFilter === 'all' 
                    ? 'Không có lịch thi nào trong học kỳ này'
                    : examFilter === 'upcoming'
                    ? 'Không có lịch thi nào sắp diễn ra'
                    : 'Không có lịch thi nào đã diễn ra'
                  }
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Vui lòng chọn học kỳ để xem lịch thi
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40, // To balance the back button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  pickerContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  customPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 50,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  semesterList: {
    maxHeight: 400,
  },
  semesterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  semesterItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  semesterItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  semesterItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e1e5e9',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  examCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  upcomingExam: {
    borderLeftWidth: 6,
    borderLeftColor: '#FF9500',
    backgroundColor: '#fffbf5',
  },
  passedExam: {
    opacity: 0.8,
    borderLeftWidth: 6,
    borderLeftColor: '#8E8E93',
    backgroundColor: '#f8f8f8',
  },
  examHeader: {
    marginBottom: 16,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 24,
  },
  subjectCode: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  examDetails: {
    gap: 12,
  },
  examRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  roomText: {
    color: '#007AFF',
    fontWeight: 'bold',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seatNumber: {
    color: '#FF3B30',
    fontWeight: 'bold',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#FF9500',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#8E8E93',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  passedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ExamScheduleScreen;