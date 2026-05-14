import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import courseRegistrationService, {
  RegistrationPlan,
  Course,
  CourseClass,
  StudyDay,
  Instructor
} from '../../services/sinhVien/courseRegistrationService';
import RegistrationSummary from '../../components/RegistrationSummary';
import CourseFilterModal from '../../components/CourseFilterModal';

interface FilterOptions {
  studyDays: number[];
  registrationMethod: 'all' | 'registered' | 'available';
  searchText: string;
}

const CourseRegistrationScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registrationPlans, setRegistrationPlans] = useState<RegistrationPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RegistrationPlan | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseClasses, setCourseClasses] = useState<CourseClass[]>([]);
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    studyDays: [],
    registrationMethod: 'all',
    searchText: '',
  });
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [allStudyDays, setAllStudyDays] = useState<StudyDay[]>([]);

  useEffect(() => {
    loadRegistrationPlans();
  }, []);

  const loadRegistrationPlans = async () => {
    try {
      setLoading(true);
      console.log('[CourseRegistrationScreen] Loading registration plans...');
      
      const plans = await courseRegistrationService.getRegistrationPlans();
      console.log('[CourseRegistrationScreen] Plans loaded:', plans.length);
      
      setRegistrationPlans(plans);
      
      // Auto select first active plan
      const activePlan = plans.find(plan => plan.TRANGTHAI === 1);
      if (activePlan) {
        setSelectedPlan(activePlan);
        await loadCourses(activePlan.ID);
      }
    } catch (error) {
      console.error('[CourseRegistrationScreen] Error loading plans:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách kế hoạch đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async (planId: string) => {
    try {
      console.log('[CourseRegistrationScreen] Loading courses for plan:', planId);
      
      const courseList = await courseRegistrationService.getAvailableCourses(planId);
      console.log('[CourseRegistrationScreen] Courses loaded:', courseList.length);
      
      setCourses(courseList);
      setFilteredCourses(courseList);
      
      // Load all instructors and study days for filter options
      await loadFilterOptions(planId, courseList);
    } catch (error) {
      console.error('[CourseRegistrationScreen] Error loading courses:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách học phần');
    }
  };

  const loadFilterOptions = async (planId: string, courseList: Course[]) => {
    try {
      const allStudyDaysSet = new Set<number>();
      
      // Load study days for all courses (bỏ load instructors)
      for (const course of courseList) {
        try {
          const days = await courseRegistrationService.getStudyDays(planId, course.DAOTAO_HOCPHAN_ID);
          days.forEach(day => allStudyDaysSet.add(day.THUHOC));
        } catch (error) {
          console.warn('[CourseRegistrationScreen] Error loading filter options for course:', course.DAOTAO_HOCPHAN_MA);
        }
      }
      
      // Convert sets to arrays and sort
      const uniqueStudyDays = Array.from(allStudyDaysSet)
        .sort((a, b) => a - b)
        .map(day => ({ THUHOC: day }));
      
      setAllStudyDays(uniqueStudyDays);
    } catch (error) {
      console.error('[CourseRegistrationScreen] Error loading filter options:', error);
    }
  };

  const loadCourseDetails = async (course: Course) => {
    if (!selectedPlan) return;
    
    try {
      console.log('[CourseRegistrationScreen] Loading course details:', course.DAOTAO_HOCPHAN_MA);
      
      const [classes, days] = await Promise.all([
        courseRegistrationService.getCourseClasses(selectedPlan.ID, course.DAOTAO_HOCPHAN_ID),
        courseRegistrationService.getStudyDays(selectedPlan.ID, course.DAOTAO_HOCPHAN_ID),
        // Bỏ load giảng viên vì không hiển thị
        // courseRegistrationService.getInstructors(selectedPlan.ID, course.DAOTAO_HOCPHAN_ID)
      ]);
      
      setCourseClasses(classes);
      setStudyDays(days);
      // setInstructors(teachers); // Bỏ set instructors
      setSelectedCourse(course);
      setExpandedCourse(course.ID);
      
      console.log('[CourseRegistrationScreen] Course details loaded:', {
        classes: classes.length,
        days: days.length,
        // teachers: teachers.length // Bỏ log teachers
      });
    } catch (error) {
      console.error('[CourseRegistrationScreen] Error loading course details:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết học phần');
    }
  };

  const handleRegisterCourse = async (courseClass: CourseClass) => {
    if (!selectedPlan || !selectedCourse) return;

    Alert.alert(
      'Xác nhận đăng ký',
      `Bạn có chắc chắn muốn đăng ký lớp "${courseClass.TENLOP}"?\n\nHọc phí: ${courseRegistrationService.formatCurrency(courseClass.PHISAUKHITRUMIEN)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng ký',
          onPress: async () => {
            try {
              const result = await courseRegistrationService.registerCourse(
                selectedPlan.ID,
                selectedCourse.DAOTAO_HOCPHAN_ID,
                courseClass.ID
              );

              if (result.Success) {
                Alert.alert('Thành công', result.Message);
                // Reload courses to update registration status
                await loadCourses(selectedPlan.ID);
              } else {
                Alert.alert('Lỗi', result.Message);
              }
            } catch (error) {
              console.error('[CourseRegistrationScreen] Error registering course:', error);
              Alert.alert('Lỗi', 'Không thể đăng ký học phần');
            }
          }
        }
      ]
    );
  };

  const handleClassPress = (courseClass: CourseClass) => {
    console.log('[CourseRegistrationScreen] Navigating to CourseClassDetail with:', {
      courseClass: courseClass.TENLOP,
      courseClassId: courseClass.ID,
      isRegistered: selectedCourse?.DADANGKY === 1,
      planId: selectedPlan?.ID,
      courseId: selectedCourse?.DAOTAO_HOCPHAN_ID
    });
    
    try {
      // Điều hướng đến screen chi tiết thay vì mở modal
      // @ts-ignore
      navigation.navigate('CourseClassDetail', {
        courseClass,
        isRegistered: selectedCourse?.DADANGKY === 1,
        planId: selectedPlan?.ID,
        courseId: selectedCourse?.DAOTAO_HOCPHAN_ID
      });
      
      console.log('[CourseRegistrationScreen] Navigation successful');
    } catch (error) {
      console.error('[CourseRegistrationScreen] Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể mở chi tiết lớp học');
    }
  };

  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    
    let filtered = [...courses];
    
    // Filter by search text
    if (newFilters.searchText.trim()) {
      const searchLower = newFilters.searchText.toLowerCase().trim();
      filtered = filtered.filter(course => 
        course.DAOTAO_HOCPHAN_MA.toLowerCase().includes(searchLower) ||
        course.DAOTAO_HOCPHAN_TEN.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by registration status
    if (newFilters.registrationMethod !== 'all') {
      filtered = filtered.filter(course => {
        if (newFilters.registrationMethod === 'registered') {
          return course.DADANGKY === 1;
        } else if (newFilters.registrationMethod === 'available') {
          return course.DADANGKY === 0;
        }
        return true;
      });
    }
    
    // TODO: Filter by instructors and study days would require loading course details
    // This would be expensive, so we'll show all courses that match other criteria
    
    setFilteredCourses(filtered);
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchText.trim()) count++;
    if (filters.studyDays.length > 0) count++;
    if (filters.registrationMethod !== 'all') count++;
    return count;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRegistrationPlans();
    setRefreshing(false);
  };

  const renderPlanSelector = () => (
    <View style={styles.planSelector}>
      <Text style={styles.sectionTitle}>Kế hoạch đăng ký</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {registrationPlans.map((plan) => (
          <TouchableOpacity
            key={plan.ID}
            style={[
              styles.planCard,
              selectedPlan?.ID === plan.ID && styles.selectedPlanCard
            ]}
            onPress={() => {
              setSelectedPlan(plan);
              loadCourses(plan.ID);
              setExpandedCourse(null);
            }}
          >
            <Text style={[
              styles.planTitle,
              selectedPlan?.ID === plan.ID && styles.selectedPlanTitle
            ]}>
              {plan.TEN}
            </Text>
            <Text style={[
              styles.planDate,
              selectedPlan?.ID === plan.ID && styles.selectedPlanDate
            ]}>
              {courseRegistrationService.formatDate(plan.NGAYBATDAU)} - {courseRegistrationService.formatDate(plan.NGAYKETTHUC)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCourseItem = (course: Course) => {
    const isExpanded = expandedCourse === course.ID;
    const isRegistered = course.DADANGKY === 1;

    return (
      <View key={course.ID} style={styles.courseCard}>
        <TouchableOpacity
          style={styles.courseHeader}
          onPress={() => {
            if (isExpanded) {
              setExpandedCourse(null);
            } else {
              loadCourseDetails(course);
            }
          }}
        >
          <View style={styles.courseInfo}>
            <View style={styles.courseCodeContainer}>
              <Text style={styles.courseCode}>{course.DAOTAO_HOCPHAN_MA}</Text>
              {isRegistered && (
                <View style={styles.registeredBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.registeredText}>Đã đăng ký</Text>
                </View>
              )}
            </View>
            <Text style={styles.courseName}>{course.DAOTAO_HOCPHAN_TEN}</Text>
            <Text style={styles.courseCredits}>{course.DAOTAO_HOCPHAN_SOTINCHI} tín chỉ</Text>
          </View>
          <MaterialIcons 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={24} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.courseDetails}>
            {/* Study Days */}
            {studyDays.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Thứ học:</Text>
                <Text style={styles.detailText}>
                  {studyDays.map(day => {
                    const dayNames = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
                    return dayNames[day.THUHOC] || `Thứ ${day.THUHOC}`;
                  }).join(', ')}
                </Text>
              </View>
            )}

            {/* Instructors */}
            {/* Bỏ hiển thị giảng viên theo yêu cầu
            {instructors.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Giảng viên:</Text>
                {instructors.map((instructor, index) => (
                  <Text key={instructor.ID} style={styles.detailText}>
                    {instructor.HODEM} {instructor.TEN} ({instructor.MASO})
                  </Text>
                ))}
              </View>
            )}
            */}

            {/* Course Classes */}
            {courseClasses.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Lớp học phần:</Text>
                {courseClasses.map((courseClass) => (
                  <View
                    key={courseClass.ID}
                    style={styles.classCard}
                  >
                    <View style={styles.classHeader}>
                      <Text style={styles.className}>{courseClass.TENLOP}</Text>
                      <Text style={styles.classCode}>{courseClass.MALOP}</Text>
                    </View>
                    
                    <View style={styles.classInfo}>
                      <Text style={styles.classDetail}>
                        Thời gian: {courseRegistrationService.formatDate(courseClass.NGAYBATDAU)} - {courseRegistrationService.formatDate(courseClass.NGAYKETTHUC)}
                      </Text>
                      <Text style={styles.classDetail}>
                        Thứ học: {courseRegistrationService.formatStudyDays(courseClass.THUHOC)}
                      </Text>
                      <Text style={styles.classDetail}>
                        Sĩ số: {courseClass.SOTHUCTEDANGKYHOC}/{courseClass.SOLUONGDUKIENHOC}
                      </Text>
                      <Text style={styles.classDetail}>
                        Học phí: {courseRegistrationService.formatCurrency(courseClass.PHISAUKHITRUMIEN)}
                      </Text>
                    </View>

                    <View style={styles.classActions}>
                      <TouchableOpacity 
                        style={styles.viewDetailButton}
                        onPress={() => handleClassPress(courseClass)}
                      >
                        <MaterialIcons name="visibility" size={16} color="#3B82F6" />
                        <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                      </TouchableOpacity>
                      
                      {!isRegistered && (
                        <TouchableOpacity
                          style={[
                            styles.quickRegisterButton,
                            courseClass.SOTHUCTEDANGKYHOC >= courseClass.SOLUONGDUKIENHOC && styles.disabledButton
                          ]}
                          onPress={() => handleRegisterCourse(courseClass)}
                          disabled={courseClass.SOTHUCTEDANGKYHOC >= courseClass.SOLUONGDUKIENHOC}
                        >
                          <MaterialIcons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.quickRegisterText}>
                            {courseClass.SOTHUCTEDANGKYHOC >= courseClass.SOLUONGDUKIENHOC ? 'Đầy' : 'Đăng ký'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đăng ký học phần</Text>
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
          <Text style={styles.headerTitle}>Đăng ký học phần</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPlanSelector()}

        {selectedPlan && (
          <View style={styles.coursesContainer}>
            <RegistrationSummary courses={filteredCourses} />
            
            {/* Filter Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text style={styles.sectionTitle}>Danh sách học phần</Text>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <MaterialIcons name="filter-list" size={20} color="#3B82F6" />
                  <Text style={styles.filterButtonText}>Bộ lọc</Text>
                  {getActiveFilterCount() > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Active Filters Display */}
              {getActiveFilterCount() > 0 && (
                <View style={styles.activeFilters}>
                  {filters.searchText.trim() && (
                    <View style={styles.filterTag}>
                      <Text style={styles.filterTagText}>"{filters.searchText}"</Text>
                      <TouchableOpacity 
                        onPress={() => applyFilters({ ...filters, searchText: '' })}
                        style={styles.filterTagClose}
                      >
                        <MaterialIcons name="close" size={14} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {filters.registrationMethod !== 'all' && (
                    <View style={styles.filterTag}>
                      <Text style={styles.filterTagText}>
                        {filters.registrationMethod === 'registered' ? 'Đã đăng ký' : 'Chưa đăng ký'}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => applyFilters({ ...filters, registrationMethod: 'all' })}
                        style={styles.filterTagClose}
                      >
                        <MaterialIcons name="close" size={14} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            {filteredCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="school" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  {getActiveFilterCount() > 0 ? 'Không tìm thấy học phần phù hợp' : 'Không có học phần nào'}
                </Text>
                {getActiveFilterCount() > 0 && (
                  <TouchableOpacity 
                    style={styles.clearFiltersButton}
                    onPress={() => applyFilters({
                      studyDays: [],
                      registrationMethod: 'all',
                      searchText: '',
                    })}
                  >
                    <Text style={styles.clearFiltersText}>Xóa bộ lọc</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredCourses.map(renderCourseItem)
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <CourseFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilter={applyFilters}
        availableInstructors={allInstructors}
        availableStudyDays={allStudyDays}
        currentFilters={filters}
      />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  planSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlanCard: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  selectedPlanTitle: {
    color: '#1E40AF',
  },
  planDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedPlanDate: {
    color: '#3B82F6',
  },
  coursesContainer: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  registeredText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseCredits: {
    fontSize: 14,
    color: '#6B7280',
  },
  courseDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  classCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  className: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  classCode: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classInfo: {
    marginBottom: 12,
  },
  classDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
  },
  viewDetailText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  quickRegisterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  quickRegisterText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  filterBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTagText: {
    fontSize: 12,
    color: '#374151',
    marginRight: 4,
  },
  filterTagClose: {
    padding: 2,
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default CourseRegistrationScreen;