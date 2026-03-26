import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { scheduleService, ScheduleItem, StudentInfo } from '../services/scheduleService';
import { AttendanceModal } from '../components/AttendanceModal';
import { AttendanceDetail, attendanceService, ClassStudent } from '../services/attendanceService';

const StudyScheduleScreen = () => {
  const navigation = useNavigation();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [initialLoad, setInitialLoad] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Khởi tạo tuần hiện tại (bắt đầu từ thứ 2)
  const initializeCurrentWeek = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Chủ nhật = 0, thứ 2 = 1
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    setCurrentWeekStart(monday);
    
    // Khởi tạo calendar với tháng/năm hiện tại
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  }, []);

  // Preload dữ liệu khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      if (initialLoad) {
        initializeCurrentWeek();
        // Preload dữ liệu ngầm
        scheduleService.preloadScheduleData().catch(console.warn);
        setInitialLoad(false);
      }
    }, [initialLoad, initializeCurrentWeek])
  );

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load thông tin sinh viên và lịch học song song
      const [studentData, scheduleData] = await Promise.all([
        scheduleService.getStudentInfo(),
        scheduleService.getWeeklySchedule(currentWeekStart)
      ]);
      
      setStudentInfo(studentData);
      setSchedules(scheduleData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Xóa cache và load lại dữ liệu mới
      await scheduleService.clearCache();
      await loadData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
    
    // Preload tuần tiếp theo
    const nextWeek = new Date(newDate);
    nextWeek.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    scheduleService.getWeeklySchedule(nextWeek).catch(console.warn);
  }, [currentWeekStart]);

  const navigateToDate = useCallback((selectedDate: Date) => {
    // Tính toán thứ 2 của tuần chứa ngày được chọn
    const dayOfWeek = selectedDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() + mondayOffset);
    setCurrentWeekStart(monday);
    setCalendarVisible(false);
  }, []);

  const formatWeekRange = useMemo(() => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };
    
    return `${formatDate(currentWeekStart)} - ${formatDate(endDate)}`;
  }, [currentWeekStart]);

  const groupSchedulesByDay = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {};
    
    schedules.forEach(schedule => {
      const dateKey = schedule.NGAYHOC;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(schedule);
    });
    
    // Sắp xếp theo thời gian trong ngày
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        const timeA = a.GIOBATDAU * 60 + a.PHUTBATDAU;
        const timeB = b.GIOBATDAU * 60 + b.PHUTBATDAU;
        return timeA - timeB;
      });
    });
    
    return grouped;
  }, [schedules]);

  const getScheduleColor = useCallback((schedule: ScheduleItem) => {
    if (schedule.PHANLOAI === 'LICHTHI') {
      return '#EF4444'; // Đỏ cho lịch thi
    }
    
    // Màu khác nhau cho từng môn học dựa trên tên môn
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green  
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#EF4444', // Red
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6366F1', // Indigo
    ];
    
    // Tạo hash từ tên môn học để đảm bảo cùng môn có cùng màu
    const hash = schedule.TENHOCPHAN.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const renderCalendarModal = () => {
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    // Tạo calendar cho tháng được chọn
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const today = new Date();

    // Hàm chuyển tháng
    const navigateMonth = (direction: 'prev' | 'next') => {
      if (direction === 'next') {
        if (calendarMonth === 11) {
          setCalendarMonth(0);
          setCalendarYear(calendarYear + 1);
        } else {
          setCalendarMonth(calendarMonth + 1);
        }
      } else {
        if (calendarMonth === 0) {
          setCalendarMonth(11);
          setCalendarYear(calendarYear - 1);
        } else {
          setCalendarMonth(calendarMonth - 1);
        }
      }
    };

    const renderCalendarDays = () => {
      const days = [];
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - firstDayWeekday);

      for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const isCurrentMonth = date.getMonth() === calendarMonth;
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === currentWeekStart.toDateString();

        days.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.calendarDay,
              isToday && styles.calendarDayToday,
              isSelected && styles.calendarDaySelected,
              !isCurrentMonth && styles.calendarDayOtherMonth,
            ]}
            onPress={() => navigateToDate(date)}
          >
            <Text style={[
              styles.calendarDayText,
              isToday && styles.calendarDayTodayText,
              isSelected && styles.calendarDaySelectedText,
              !isCurrentMonth && styles.calendarDayOtherMonthText,
            ]}>
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        );
      }
      return days;
    };

    return (
      <Modal
        visible={calendarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarContainer}>
            <LinearGradient
              colors={['#3B82F6', '#1E40AF']}
              style={styles.calendarHeader}
            >
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('prev')}
              >
                <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <Text style={styles.calendarHeaderText}>
                {monthNames[calendarMonth]} {calendarYear}
              </Text>
              
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('next')}
              >
                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.calendarContent}>
              {/* Days of week header */}
              <View style={styles.calendarWeekHeader}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => (
                  <View key={index} style={styles.calendarWeekDay}>
                    <Text style={styles.calendarWeekDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {renderCalendarDays()}
              </View>

              {/* Quick actions */}
              <View style={styles.calendarActions}>
                <TouchableOpacity
                  style={styles.calendarActionButton}
                  onPress={() => {
                    const today = new Date();
                    setCalendarMonth(today.getMonth());
                    setCalendarYear(today.getFullYear());
                    navigateToDate(today);
                  }}
                >
                  <Text style={styles.calendarActionButtonText}>Hôm nay</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.calendarActionButton, styles.calendarCloseButton]}
                  onPress={() => setCalendarVisible(false)}
                >
                  <Text style={styles.calendarCloseButtonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderScheduleList = useMemo(() => {
    if (schedules.length === 0) {
      return (
        <View style={styles.emptyScheduleContainer}>
          <MaterialIcons name="event-available" size={64} color="#D1D5DB" />
          <Text style={styles.emptyScheduleText}>Không có lịch học trong tuần này</Text>
          <Text style={styles.emptyScheduleSubtext}>Hãy tận dụng thời gian nghỉ ngơi!</Text>
        </View>
      );
    }

    // Nhóm lịch theo ngày và sắp xếp
    const sortedDates = Object.keys(groupSchedulesByDay).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

    return (
      <View style={styles.scheduleListContainer}>
        {sortedDates.map((date) => {
          const daySchedules = groupSchedulesByDay[date];
          const [day, month, year] = date.split('/').map(Number);
          const dateObj = new Date(year, month - 1, day);
          const dayName = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][dateObj.getDay()];
          
          return (
            <View key={date} style={styles.daySection}>
              {/* Header ngày */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{dayName}</Text>
                <Text style={styles.dayHeaderDate}>{day}/{month}/{year}</Text>
              </View>
              
              {/* Danh sách lịch học trong ngày */}
              <View style={styles.daySchedules}>
                {daySchedules.map((schedule, index) => (
                  <TouchableOpacity
                    key={schedule.ID}
                    style={[
                      styles.scheduleBlock,
                      { backgroundColor: getScheduleColor(schedule) }
                    ]}
                    onPress={() => {
                      setSelectedSchedule(schedule);
                      setModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.scheduleBlockContent}>
                      {/* Thời gian */}
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeBlockText}>
                          {scheduleService.formatScheduleTime(schedule)}
                        </Text>
                      </View>
                      
                      {/* Thông tin môn học */}
                      <View style={styles.subjectBlock}>
                        <Text style={styles.subjectBlockTitle} numberOfLines={2}>
                          {schedule.TENHOCPHAN}
                        </Text>
                        
                        <View style={styles.subjectBlockInfo}>
                          <View style={styles.infoRow}>
                            <MaterialIcons name="location-on" size={16} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={styles.subjectBlockRoom}>
                              {schedule.TENPHONGHOC}
                            </Text>
                          </View>
                          
                          {schedule.GIANGVIEN && (
                            <View style={styles.infoRow}>
                              <MaterialIcons name="person" size={16} color="rgba(255, 255, 255, 0.8)" />
                              <Text style={styles.subjectBlockTeacher} numberOfLines={1}>
                                {schedule.GIANGVIEN}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      {/* Badge THI */}
                      {schedule.PHANLOAI === 'LICHTHI' && (
                        <View style={styles.examBlockBadge}>
                          <Text style={styles.examBlockBadgeText}>THI</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }, [schedules, groupSchedulesByDay, getScheduleColor]);

  const renderDetailModal = () => {
    if (!selectedSchedule) return null;

    const loadClassStudents = async () => {
      if (classStudents.length > 0) {
        // Đã load rồi, chỉ toggle
        setShowStudentList(!showStudentList);
        return;
      }

      setLoadingStudents(true);
      try {
        const students = await attendanceService.getClassStudents(
          selectedSchedule.IDLOPHOCPHAN,
          selectedSchedule.NGAYHOC
        );
        setClassStudents(students);
        setShowStudentList(true);
      } catch (error: any) {
        Alert.alert('Lỗi', 'Không thể tải danh sách sinh viên');
        console.error('Error loading students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };

    // Convert ScheduleItem to AttendanceDetail
    const attendanceDetail: AttendanceDetail = {
      IDSINHVIEN: selectedSchedule.IDSINHVIEN,
      IDLICHHOC: selectedSchedule.IDLICHHOC,
      TENHOCPHAN: selectedSchedule.TENHOCPHAN,
      TENLOPHOCPHAN: selectedSchedule.TENLOPHOCPHAN,
      NGAYHOC: selectedSchedule.NGAYHOC,
      GIOBATDAU: selectedSchedule.GIOBATDAU,
      PHUTBATDAU: selectedSchedule.PHUTBATDAU,
      GIOKETTHUC: selectedSchedule.GIOKETTHUC,
      PHUTKETTHUC: selectedSchedule.PHUTKETTHUC,
      PHONGHOC_TEN: selectedSchedule.TENPHONGHOC,
      GIANGVIEN: selectedSchedule.GIANGVIEN,
      TIETBATDAU: selectedSchedule.TIETBATDAU,
      TIETKETTHUC: selectedSchedule.TIETKETTHUC,
      SOTIET: selectedSchedule.SOTIET,
      DIEM_DANHSACH_ID: selectedSchedule.IDSINHVIEN, // Có thể cần điều chỉnh
      THONGTINCHUYENCAN: selectedSchedule.THONGTINCHUYENCAN || undefined,
    };

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setShowStudentList(false);
          setClassStudents([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {selectedSchedule.TENHOCPHAN}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedSchedule.DANGKY_LOPHOCPHAN_TEN}
                  </Text>
                  <Text style={styles.modalTime}>
                    {selectedSchedule.THUHOC} - {scheduleService.formatScheduleTime(selectedSchedule)}
                  </Text>
                  {selectedSchedule.THONGTINCHUYENCAN && (
                    <Text style={styles.modalAttendance}>
                      Chuyên cần: {selectedSchedule.THONGTINCHUYENCAN}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setShowStudentList(false);
                    setClassStudents([]);
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.courseInfo}>
                <View style={styles.modalInfoRow}>
                  <MaterialIcons name="person" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Giảng viên: {selectedSchedule.GIANGVIEN || 'Chưa có thông tin'}
                  </Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <MaterialIcons name="location-on" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Phòng học: {selectedSchedule.TENPHONGHOC}
                  </Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <MaterialIcons name="schedule" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Số tiết: {selectedSchedule.SOTIET} (Tiết {selectedSchedule.TIETBATDAU}-{selectedSchedule.TIETKETTHUC})
                  </Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <MaterialIcons name="category" size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Loại: {selectedSchedule.PHANLOAI === 'LICHHOC' ? 'Lịch học' : 'Lịch thi'}
                  </Text>
                </View>
                
                {selectedSchedule.THUOCTINH_TEN && (
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="info" size={20} color="#6B7280" />
                    <Text style={styles.infoText}>
                      Thuộc tính: {selectedSchedule.THUOCTINH_TEN}
                    </Text>
                  </View>
                )}
              </View>

              {/* Nút xem danh sách lớp */}
              <TouchableOpacity
                style={styles.studentListButton}
                onPress={loadClassStudents}
                disabled={loadingStudents}
              >
                <MaterialIcons 
                  name={showStudentList ? "expand-less" : "expand-more"} 
                  size={22} 
                  color="#667eea" 
                />
                <Text style={styles.studentListButtonText}>
                  {loadingStudents ? 'Đang tải...' : `Danh sách lớp ${classStudents.length > 0 ? `(${classStudents.length})` : ''}`}
                </Text>
                {loadingStudents && <ActivityIndicator size="small" color="#667eea" />}
              </TouchableOpacity>

              {/* Danh sách sinh viên */}
              {showStudentList && classStudents.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.studentListScrollContainer}
                >
                  <View style={styles.studentListContainer}>
                    <View style={styles.studentListHeader}>
                      <Text style={[styles.studentListHeaderText, { width: 60 }]}>STT</Text>
                      <Text style={[styles.studentListHeaderText, { width: 120 }]}>Mã số</Text>
                      <Text style={[styles.studentListHeaderText, { width: 180 }]}>Họ đệm</Text>
                      <Text style={[styles.studentListHeaderText, { width: 100 }]}>Tên</Text>
                    </View>
                    {classStudents.map((student, index) => (
                      <View 
                        key={student.ID} 
                        style={[
                          styles.studentListRow,
                          index % 2 === 0 && styles.studentListRowEven
                        ]}
                      >
                        <Text style={[styles.studentListCell, { width: 60 }]}>{index + 1}</Text>
                        <Text style={[styles.studentListCell, styles.studentListCellMSSV, { width: 120 }]}>
                          {student.QLSV_NGUOIHOC_MASO}
                        </Text>
                        <Text style={[styles.studentListCell, { width: 180 }]}>
                          {student.QLSV_NGUOIHOC_HODEM}
                        </Text>
                        <Text style={[styles.studentListCell, { width: 100 }]}>
                          {student.QLSV_NGUOIHOC_TEN}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Nút điểm danh - chỉ hiển thị cho lịch học */}
              {selectedSchedule.PHANLOAI === 'LICHHOC' && (
                <TouchableOpacity
                  style={styles.attendanceButton}
                  onPress={() => {
                    setModalVisible(false);
                    setTimeout(() => {
                      setAttendanceModalVisible(true);
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.attendanceButtonGradient}
                  >
                    <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.attendanceButtonText}>Điểm danh ngay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
            <View style={styles.headerContent}>
              <View style={styles.headerSkeletonTitle} />
              <View style={styles.headerSkeletonSubtitle} />
            </View>
            <View style={[styles.calendarButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
          </View>

          {/* Week navigation skeleton */}
          <View style={styles.weekNavigation}>
            <View style={styles.weekSkeletonText} />
          </View>

          {/* Content skeleton */}
          <View style={styles.scheduleContainer}>
            <View style={styles.skeletonContainer}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonBlock}>
                  <View style={styles.skeletonHeader} />
                  <View style={styles.skeletonContent} />
                  <View style={styles.skeletonContent} />
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Lịch học</Text>
            {studentInfo && (
              <Text style={styles.headerSubtitle}>
                {studentInfo.QLSV_NGUOIHOC_HODEM} {studentInfo.QLSV_NGUOIHOC_TEN}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.calendarButton} 
            onPress={() => setCalendarVisible(true)}
          >
            <MaterialIcons name="event" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            style={styles.weekArrow}
            onPress={() => navigateWeek('prev')}
          >
            <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.weekText}>{formatWeekRange}</Text>
          
          <TouchableOpacity 
            style={styles.weekArrow}
            onPress={() => navigateWeek('next')}
          >
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Schedule Content - Dạng danh sách thay vì grid */}
        <View style={styles.scheduleContainer}>
          <ScrollView 
            style={styles.scheduleScroll} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderScheduleList}
          </ScrollView>
        </View>

        {/* Detail Modal */}
        {renderDetailModal()}

        {/* Calendar Modal */}
        {renderCalendarModal()}

        {/* Attendance Modal */}
        <AttendanceModal
          visible={attendanceModalVisible}
          onClose={() => setAttendanceModalVisible(false)}
          schedule={selectedSchedule ? {
            IDSINHVIEN: selectedSchedule.IDSINHVIEN,
            IDLICHHOC: selectedSchedule.IDLICHHOC,
            TENHOCPHAN: selectedSchedule.TENHOCPHAN,
            TENLOPHOCPHAN: selectedSchedule.TENLOPHOCPHAN,
            NGAYHOC: selectedSchedule.NGAYHOC,
            GIOBATDAU: selectedSchedule.GIOBATDAU,
            PHUTBATDAU: selectedSchedule.PHUTBATDAU,
            GIOKETTHUC: selectedSchedule.GIOKETTHUC,
            PHUTKETTHUC: selectedSchedule.PHUTKETTHUC,
            PHONGHOC_TEN: selectedSchedule.TENPHONGHOC,
            GIANGVIEN: selectedSchedule.GIANGVIEN,
            TIETBATDAU: selectedSchedule.TIETBATDAU,
            TIETKETTHUC: selectedSchedule.TIETKETTHUC,
            SOTIET: selectedSchedule.SOTIET,
            DIEM_DANHSACH_ID: selectedSchedule.IDSINHVIEN,
            THONGTINCHUYENCAN: selectedSchedule.THONGTINCHUYENCAN || undefined,
          } : null}
          onSuccess={() => {
            // Refresh lại dữ liệu sau khi điểm danh thành công
            loadData();
          }}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  weekArrow: {
    padding: 8,
  },
  weekText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 20,
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
  },
  scheduleScroll: {
    flex: 1,
  },
  scheduleListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyScheduleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyScheduleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyScheduleSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  daySection: {
    marginBottom: 32,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dayHeaderDate: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  daySchedules: {
    gap: 16,
  },
  scheduleBlock: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scheduleBlockContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  timeBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  timeBlockText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
  },
  subjectBlock: {
    flex: 1,
  },
  subjectBlockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  subjectBlockInfo: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectBlockRoom: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  subjectBlockTeacher: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    flex: 1,
  },
  examBlockBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examBlockBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  // Calendar Modal Styles
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  calendarHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  calendarContent: {
    padding: 20,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  calendarWeekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 8,
  },
  calendarDayToday: {
    backgroundColor: '#F59E0B',
  },
  calendarDaySelected: {
    backgroundColor: '#3B82F6',
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  calendarDayTodayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarDaySelectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarDayOtherMonthText: {
    color: '#9CA3AF',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarActionButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  calendarCloseButton: {
    backgroundColor: '#6B7280',
  },
  calendarCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Skeleton Loading Styles
  headerSkeletonTitle: {
    width: 120,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    marginBottom: 8,
  },
  headerSkeletonSubtitle: {
    width: 80,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 7,
  },
  weekSkeletonText: {
    width: 100,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  skeletonBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonHeader: {
    width: '60%',
    height: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 9,
    marginBottom: 16,
  },
  skeletonContent: {
    width: '100%',
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3,
  },
  modalTime: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 3,
  },
  modalAttendance: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  closeButton: {
    padding: 5,
  },
  courseInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
    flex: 1,
  },
  attendanceButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  attendanceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  attendanceButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  studentListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e8eaff',
  },
  studentListButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  studentListScrollContainer: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  studentListContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 460, // Tổng width của các cột
  },
  studentListHeader: {
    flexDirection: 'row',
    backgroundColor: '#5b7cfa',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  studentListHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
  },
  studentListRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  studentListRowEven: {
    backgroundColor: '#fafbff',
  },
  studentListCell: {
    fontSize: 14,
    color: '#1a1a1a',
    textAlign: 'left',
  },
  studentListCellMSSV: {
    fontWeight: '600',
    color: '#333',
  },
  studentListCellAbsent: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default StudyScheduleScreen;