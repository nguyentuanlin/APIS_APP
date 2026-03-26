import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  gradeService,
  GradeResponse,
  SemesterGrade,
  GradeItem,
  KhoiKienThucResponse,
  KhoiTongHop,
  KhoiKienThucItem,
} from '../services/gradeService';

const { width } = Dimensions.get('window');

const GradeLookupScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradeData, setGradeData] = useState<GradeResponse | null>(null);
  const [khoiData, setKhoiData] = useState<KhoiKienThucResponse | null>(null);
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [expandedKhoi, setExpandedKhoi] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'bangdiem' | 'hocphanno' | 'khoi'>('bangdiem');

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const data = await gradeService.getGrades();
      setGradeData(data);
      
      // Load khối kiến thức
      const khoiKienThuc = await gradeService.getKhoiKienThuc();
      setKhoiData(khoiKienThuc);
      
      // Mở rộng học kỳ đầu tiên mặc định
      if (data.DANHSACH_HOCKY.length > 0) {
        const firstSemester = data.DANHSACH_HOCKY[0];
        setExpandedSemesters(new Set([`${firstSemester.NAMHOC}-${firstSemester.HOCKY}`]));
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await gradeService.refreshGrades();
      setGradeData(data);
    } catch (error) {
      console.error('Error refreshing grades:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSemester = (namHoc: string, hocKy: number) => {
    const key = `${namHoc}-${hocKy}`;
    const newExpanded = new Set(expandedSemesters);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    setExpandedSemesters(newExpanded);
  };

  const renderStatistics = () => {
    if (!gradeData?.THONGKE) return null;

    const stats = gradeData.THONGKE;

    return (
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <MaterialIcons name="assessment" size={24} color="#3B82F6" />
          <Text style={styles.statsTitle}>TỔNG ĐIỂM</Text>
        </View>
        
        <View style={styles.statsRows}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tổng số tín chỉ</Text>
            <Text style={styles.statValue}>{stats.TONGSO_TINCHI}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tổng số tín chỉ tích lũy</Text>
            <Text style={styles.statValue}>{stats.SOTINCHI_TICHLUY}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Điểm trung bình hệ 10</Text>
            <Text style={[styles.statValue, styles.gradeHighlight]}>
              {gradeService.formatGrade(stats.DIEMTRUNGBINH_HE10)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Điểm trung bình hệ 4</Text>
            <Text style={[styles.statValue, styles.gradeHighlight]}>
              {gradeService.formatGrade(stats.DIEMTRUNGBINH_HE4)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Điểm trung bình tích lũy hệ 10</Text>
            <Text style={[styles.statValue, styles.gradeHighlight]}>
              {gradeService.formatGrade(stats.DIEMTRUNGBINH_TICHLUY_HE10)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Điểm trung bình tích lũy hệ 4</Text>
            <Text style={[styles.statValue, styles.gradeHighlight]}>
              {gradeService.formatGrade(stats.DIEMTRUNGBINH_TICHLUY_HE4)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bangdiem' && styles.activeTab]}
          onPress={() => setActiveTab('bangdiem')}
        >
          <MaterialIcons 
            name="description" 
            size={20} 
            color={activeTab === 'bangdiem' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'bangdiem' && styles.activeTabText]}>
            Bảng điểm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'hocphanno' && styles.activeTab]}
          onPress={() => setActiveTab('hocphanno')}
        >
          <MaterialIcons 
            name="warning" 
            size={20} 
            color={activeTab === 'hocphanno' ? '#F97316' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'hocphanno' && styles.activeTabText]}>
            Học phần nợ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'khoi' && styles.activeTab]}
          onPress={() => setActiveTab('khoi')}
        >
          <MaterialIcons 
            name="category" 
            size={20} 
            color={activeTab === 'khoi' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'khoi' && styles.activeTabText]}>
            Khối kiến thức
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFailedCourses = () => {
    if (!gradeData) return null;

    // Nhóm các môn theo mã học phần để kiểm tra lần học
    const courseMap = new Map<string, GradeItem[]>();
    
    gradeData.DANHSACH_HOCKY.forEach((semester) => {
      semester.DANHSACHDIEM.forEach((item) => {
        if (!courseMap.has(item.MAHOCPHAN)) {
          courseMap.set(item.MAHOCPHAN, []);
        }
        courseMap.get(item.MAHOCPHAN)!.push(item);
      });
    });

    // Lọc các môn nợ: chỉ lấy môn có lần học cuối cùng vẫn chưa đạt
    const failedCourses: GradeItem[] = [];
    
    courseMap.forEach((courses, maHocPhan) => {
      // Sắp xếp theo lần học tăng dần, sau đó theo lần thi tăng dần
      const sortedCourses = courses.sort((a, b) => {
        if (a.LANHOC !== b.LANHOC) {
          return a.LANHOC - b.LANHOC;
        }
        return a.LANTHI - b.LANTHI;
      });
      
      // Lấy lần học cuối cùng (lần học cao nhất)
      const latestAttempt = sortedCourses[sortedCourses.length - 1];
      
      // Debug log
      if (maHocPhan === 'LANC2003') {
        console.log('[FailedCourses] LANC2003 attempts:', sortedCourses.map(c => ({
          LANHOC: c.LANHOC,
          LANTHI: c.LANTHI,
          DIEMCHU: c.DIEMCHU,
          DANHGIA: c.DANHGIA,
        })));
        console.log('[FailedCourses] Latest attempt:', {
          LANHOC: latestAttempt.LANHOC,
          DIEMCHU: latestAttempt.DIEMCHU,
          DANHGIA: latestAttempt.DANHGIA,
        });
      }
      
      // Chỉ thêm vào danh sách nợ nếu lần học mới nhất vẫn chưa đạt
      if (latestAttempt.DANHGIA === 'Không đạt' || latestAttempt.DIEMCHU === 'F') {
        failedCourses.push(latestAttempt);
      }
    });

    if (failedCourses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="check-circle" size={64} color="#10B981" />
          <Text style={styles.emptyText}>Không có học phần nợ</Text>
        </View>
      );
    }

    return (
      <View style={styles.failedCoursesContainer}>
        {failedCourses.map((item, index) => (
          <View key={index} style={styles.failedCourseCard}>
            <View style={styles.failedCourseHeader}>
              <Text style={styles.failedCourseSTT}>{index + 1}</Text>
              <View style={styles.failedCourseBadge}>
                <Text style={styles.failedCourseBadgeText}>Không đạt</Text>
              </View>
            </View>

            <View style={styles.failedCourseBody}>
              <View style={styles.failedCourseRow}>
                <Text style={styles.failedCourseCode}>{item.MAHOCPHAN}</Text>
              </View>
              
              <Text style={styles.failedCourseName}>{item.TENHOCPHAN}</Text>

              <View style={styles.failedCourseDetails}>
                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Số tín chỉ:</Text>
                  <Text style={styles.failedCourseDetailValue}>{item.SOTINCHI}</Text>
                </View>

                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Điểm:</Text>
                  <Text style={styles.failedCourseDetailValue}>
                    {gradeService.formatGrade(item.DIEMHE10)}
                  </Text>
                </View>

                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Điểm chữ:</Text>
                  <Text style={[styles.failedCourseDetailValue, { color: '#EF4444' }]}>
                    {item.DIEMCHU}
                  </Text>
                </View>

                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Lần học:</Text>
                  <Text style={styles.failedCourseDetailValue}>{item.LANHOC}</Text>
                </View>

                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Lần thi:</Text>
                  <Text style={styles.failedCourseDetailValue}>{item.LANTHI}</Text>
                </View>

                <View style={styles.failedCourseDetailItem}>
                  <Text style={styles.failedCourseDetailLabel}>Kết quả:</Text>
                  <Text style={[styles.failedCourseDetailValue, { color: '#EF4444' }]}>
                    {item.DANHGIA}
                  </Text>
                </View>
              </View>

              {item.GHICHU && (
                <View style={styles.failedCourseNote}>
                  <MaterialIcons name="info" size={16} color="#6B7280" />
                  <Text style={styles.failedCourseNoteText}>{item.GHICHU}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const toggleKhoi = (maKhoi: string) => {
    const newExpanded = new Set(expandedKhoi);
    if (newExpanded.has(maKhoi)) {
      newExpanded.delete(maKhoi);
    } else {
      newExpanded.add(maKhoi);
    }
    setExpandedKhoi(newExpanded);
  };

  const renderKhoiKienThuc = () => {
    if (!khoiData) return null;

    const { rsTongHop, rsChiTiet } = khoiData;

    if (rsTongHop.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="category" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Không có dữ liệu khối kiến thức</Text>
        </View>
      );
    }

    return (
      <View style={styles.khoiContainer}>
        {rsTongHop.map((khoi, index) => {
          const isExpanded = expandedKhoi.has(khoi.MAKHOI);
          const khoiCourses = rsChiTiet.filter(item => item.MAKHOI === khoi.MAKHOI);

          return (
            <View key={khoi.MAKHOI} style={styles.khoiCard}>
              <TouchableOpacity
                style={styles.khoiHeader}
                onPress={() => toggleKhoi(khoi.MAKHOI)}
                activeOpacity={0.7}
              >
                <View style={styles.khoiHeaderLeft}>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color="#3B82F6"
                  />
                  <View style={styles.khoiInfo}>
                    <Text style={styles.khoiTitle}>{khoi.TENKHOI}</Text>
                    <Text style={styles.khoiSubtitle}>
                      {khoiCourses.length} học phần
                    </Text>
                  </View>
                </View>

                <View style={styles.khoiStats}>
                  <View style={styles.khoiStatItem}>
                    <Text style={styles.khoiStatLabel}>TC</Text>
                    <Text style={styles.khoiStatValue}>{khoi.TONGSOTINCHI}</Text>
                  </View>
                  <View style={styles.khoiStatItem}>
                    <Text style={styles.khoiStatLabel}>Đạt</Text>
                    <Text style={[styles.khoiStatValue, { color: '#10B981' }]}>
                      {khoi.TONGSOTINCHI_DATICHLUY}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.khoiBody}>
                  {khoiCourses.map((course, idx) => (
                    <View key={idx} style={styles.khoiCourseItem}>
                      <View style={styles.khoiCourseHeader}>
                        <Text style={styles.khoiCourseCode}>{course.DAOTAO_HOCPHAN_MA}</Text>
                        {course.KETQUA === 1 && (
                          <View style={styles.khoiCourseBadge}>
                            <Text style={styles.khoiCourseBadgeText}>Đạt</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.khoiCourseName}>{course.DAOTAO_HOCPHAN_TEN}</Text>

                      <View style={styles.khoiCourseDetails}>
                        <View style={styles.khoiCourseDetailItem}>
                          <Text style={styles.khoiCourseDetailLabel}>Tín chỉ:</Text>
                          <Text style={styles.khoiCourseDetailValue}>
                            {course.DAOTAO_HOCPHAN_HOCTRINH}
                          </Text>
                        </View>

                        {course.DIEM && (
                          <>
                            <View style={styles.khoiCourseDetailItem}>
                              <Text style={styles.khoiCourseDetailLabel}>Điểm:</Text>
                              <Text style={styles.khoiCourseDetailValue}>{course.DIEM}</Text>
                            </View>

                            <View style={styles.khoiCourseDetailItem}>
                              <Text style={styles.khoiCourseDetailLabel}>Điểm chữ:</Text>
                              <Text style={[
                                styles.khoiCourseDetailValue,
                                { color: gradeService.getGradeColor(course.DIEMQUYDOI_TEN || '') }
                              ]}>
                                {course.DIEMQUYDOI_TEN || '-'}
                              </Text>
                            </View>
                          </>
                        )}

                        {!course.DIEM && (
                          <View style={styles.khoiCourseDetailItem}>
                            <Text style={[styles.khoiCourseDetailLabel, { color: '#9CA3AF' }]}>
                              Chưa học
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderGradeItem = (item: GradeItem, index: number) => {
    const gradeColor = gradeService.getGradeColor(item.DIEMCHU);
    const passStatus = gradeService.getPassStatus(item.DANHGIA);

    return (
      <View key={index} style={styles.tableRow}>
        {/* STT */}
        <View style={[styles.tableCell, styles.cellSTT]}>
          <Text style={styles.cellText}>{item.STT}</Text>
        </View>

        {/* Mã học phần */}
        <View style={[styles.tableCell, styles.cellCode]}>
          <Text style={[styles.cellText, styles.codeText]}>{item.MAHOCPHAN}</Text>
        </View>

        {/* Tên học phần */}
        <View style={[styles.tableCell, styles.cellName]}>
          <Text style={styles.cellText} numberOfLines={2}>
            {item.TENHOCPHAN}
          </Text>
        </View>

        {/* Số tín chỉ */}
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.SOTINCHI}</Text>
        </View>

        {/* Lần học */}
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.LANHOC}</Text>
        </View>

        {/* Lần thi */}
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={styles.cellText}>{item.LANTHI}</Text>
        </View>

        {/* Điểm hệ 10 */}
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={[styles.cellText, styles.gradeText]}>
            {gradeService.formatGrade(item.DIEMHE10)}
          </Text>
        </View>

        {/* Điểm hệ 4 */}
        <View style={[styles.tableCell, styles.cellNumber]}>
          <Text style={[styles.cellText, styles.gradeText]}>
            {gradeService.formatGrade(item.DIEMHE4)}
          </Text>
        </View>

        {/* Điểm chữ */}
        <View style={[styles.tableCell, styles.cellGrade]}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeBadgeText}>{item.DIEMCHU}</Text>
          </View>
        </View>

        {/* Đánh giá */}
        <View style={[styles.tableCell, styles.cellStatus]}>
          <Text style={[styles.cellText, { color: passStatus.color }]}>
            {passStatus.text}
          </Text>
        </View>

        {/* Ghi chú */}
        <View style={[styles.tableCell, styles.cellNote]}>
          <Text style={styles.cellText} numberOfLines={1}>
            {item.GHICHU || '-'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSemester = (semester: SemesterGrade, index: number) => {
    const key = `${semester.NAMHOC}-${semester.HOCKY}`;
    const isExpanded = expandedSemesters.has(key);

    return (
      <View key={key} style={styles.semesterCard}>
        <TouchableOpacity
          style={styles.semesterHeader}
          onPress={() => toggleSemester(semester.NAMHOC, semester.HOCKY)}
          activeOpacity={0.7}
        >
          <View style={styles.semesterHeaderLeft}>
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#3B82F6"
            />
            <View style={styles.semesterInfo}>
              <Text style={styles.semesterTitle}>
                Năm học {semester.NAMHOC} - Học kỳ {semester.HOCKY}
              </Text>
              <Text style={styles.semesterSubtitle}>
                {semester.DANHSACHDIEM.length} môn học
              </Text>
            </View>
          </View>

          <View style={styles.semesterGradesContainer}>
            <View style={styles.semesterGradesRow}>
              <Text style={styles.semesterGradeLabel}>ĐTB (10)</Text>
              <Text style={styles.semesterGradeLabel}>ĐTB (4)</Text>
            </View>
            <View style={styles.semesterGradesRow}>
              <Text style={styles.semesterGradeValue}>
                {gradeService.formatGrade(semester.DIEMTRUNGBINH_HE10)}
              </Text>
              <Text style={styles.semesterGradeValue}>
                {gradeService.formatGrade(semester.DIEMTRUNGBINH_HE4)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={styles.tableHeader}>
                  <View style={[styles.tableHeaderCell, styles.cellSTT]}>
                    <Text style={styles.headerText}>STT</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellCode]}>
                    <Text style={styles.headerText}>Mã HP</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellName]}>
                    <Text style={styles.headerText}>Tên học phần</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                    <Text style={styles.headerText}>Tín chỉ</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                    <Text style={styles.headerText}>Lần học</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                    <Text style={styles.headerText}>Lần thi</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                    <Text style={styles.headerText}>Điểm 10</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNumber]}>
                    <Text style={styles.headerText}>Điểm 4</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellGrade]}>
                    <Text style={styles.headerText}>Điểm chữ</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellStatus]}>
                    <Text style={styles.headerText}>Đánh giá</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.cellNote]}>
                    <Text style={styles.headerText}>Ghi chú</Text>
                  </View>
                </View>

                {/* Table Body */}
                {semester.DANHSACHDIEM.map((item, idx) => renderGradeItem(item, idx))}
              </View>
            </ScrollView>
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
            <Text style={styles.headerTitle}>Tra cứu điểm</Text>
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
          <Text style={styles.headerTitle}>Tra cứu điểm</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.backButton}>
            <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderStatistics()}
        {renderTabs()}

        {activeTab === 'bangdiem' && (
          <View style={styles.semestersContainer}>
            <Text style={styles.sectionTitle}>Điểm theo học kỳ</Text>
            {gradeData?.DANHSACH_HOCKY.map((semester, index) =>
              renderSemester(semester, index)
            )}
          </View>
        )}

        {activeTab === 'hocphanno' && renderFailedCourses()}

        {activeTab === 'khoi' && renderKhoiKienThuc()}
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
  statsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statsRows: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    minWidth: 60,
    textAlign: 'right',
  },
  gradeHighlight: {
    color: '#3B82F6',
  },
  semestersContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  semesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  semesterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  semesterInfo: {
    marginLeft: 8,
    flex: 1,
  },
  semesterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  semesterSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  semesterGradesContainer: {
    alignItems: 'flex-end',
  },
  semesterGradesRow: {
    flexDirection: 'row',
    gap: 24,
  },
  semesterGradeItem: {
    alignItems: 'center',
  },
  semesterGradeLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  semesterGradeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginTop: 4,
    minWidth: 50,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cellSTT: {
    width: 50,
    alignItems: 'center',
  },
  cellCode: {
    width: 100,
  },
  cellName: {
    width: 200,
  },
  cellNumber: {
    width: 70,
    alignItems: 'center',
  },
  cellGrade: {
    width: 80,
    alignItems: 'center',
  },
  cellStatus: {
    width: 100,
    alignItems: 'center',
  },
  cellNote: {
    width: 120,
  },
  cellText: {
    fontSize: 13,
    color: '#1F2937',
  },
  codeText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  gradeText: {
    fontWeight: 'bold',
    color: '#059669',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gradesList: {
    padding: 12,
    gap: 12,
  },
  gradeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  failedCoursesContainer: {
    padding: 16,
    gap: 12,
  },
  failedCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  failedCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  failedCourseSTT: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  failedCourseBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  failedCourseBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  failedCourseBody: {
    padding: 16,
  },
  failedCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  failedCourseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  failedCourseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  failedCourseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  failedCourseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  failedCourseDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  failedCourseDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  failedCourseNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  failedCourseNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  khoiContainer: {
    padding: 16,
    gap: 12,
  },
  khoiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  khoiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  khoiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  khoiInfo: {
    marginLeft: 8,
    flex: 1,
  },
  khoiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  khoiSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  khoiStats: {
    flexDirection: 'row',
    gap: 16,
  },
  khoiStatItem: {
    alignItems: 'center',
  },
  khoiStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  khoiStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginTop: 2,
  },
  khoiBody: {
    padding: 16,
    gap: 12,
    backgroundColor: '#F9FAFB',
  },
  khoiCourseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  khoiCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  khoiCourseCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  khoiCourseBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  khoiCourseBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  khoiCourseName: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  khoiCourseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  khoiCourseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  khoiCourseDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  khoiCourseDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default GradeLookupScreen;
