import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { Instructor, StudyDay } from '../services/sinhVien/courseRegistrationService';

interface FilterOptions {
  studyDays: number[];
  registrationMethod: 'all' | 'registered' | 'available';
  searchText: string;
}

interface CourseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilter: (filters: FilterOptions) => void;
  availableInstructors: Instructor[]; // Giữ lại để tương thích, nhưng không sử dụng
  availableStudyDays: StudyDay[];
  currentFilters: FilterOptions;
}

const CourseFilterModal: React.FC<CourseFilterModalProps> = ({
  visible,
  onClose,
  onApplyFilter,
  availableInstructors,
  availableStudyDays,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, visible]);

  const handleInstructorToggle = (instructorId: string) => {
    // Bỏ function này vì không dùng giảng viên nữa
    // setFilters(prev => ({
    //   ...prev,
    //   instructors: prev.instructors.includes(instructorId)
    //     ? prev.instructors.filter(id => id !== instructorId)
    //     : [...prev.instructors, instructorId]
    // }));
  };

  const handleStudyDayToggle = (day: number) => {
    setFilters(prev => ({
      ...prev,
      studyDays: prev.studyDays.includes(day)
        ? prev.studyDays.filter(d => d !== day)
        : [...prev.studyDays, day]
    }));
  };

  const handleApply = () => {
    onApplyFilter(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      studyDays: [],
      registrationMethod: 'all',
      searchText: '',
    };
    setFilters(resetFilters);
  };

  const getDayName = (day: number): string => {
    const dayNames = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    return dayNames[day] || `Thứ ${day}`;
  };

  const getShortDayName = (day: number): string => {
    const shortNames = ['', '', '2', '3', '4', '5', '6', '7', 'CN'];
    return shortNames[day] || day.toString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bộ lọc tìm kiếm</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <MaterialIcons name="refresh" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tìm kiếm</Text>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm học phần..."
                value={filters.searchText}
                onChangeText={(text) => setFilters(prev => ({ ...prev, searchText: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Instructors Filter - Bỏ phần này */}
          {/* 
          {availableInstructors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Giảng viên</Text>
              {availableInstructors.map((instructor) => (
                <TouchableOpacity
                  key={instructor.ID}
                  style={styles.checkboxItem}
                  onPress={() => handleInstructorToggle(instructor.ID)}
                >
                  <View style={styles.checkbox}>
                    {filters.instructors.includes(instructor.ID) && (
                      <MaterialIcons name="check" size={16} color="#3B82F6" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    {instructor.MASO} - {instructor.HODEM} {instructor.TEN}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          */}

          {/* Study Days Filter */}
          {availableStudyDays.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thứ học</Text>
              <View style={styles.dayGrid}>
                {availableStudyDays.map((studyDay) => (
                  <TouchableOpacity
                    key={studyDay.THUHOC}
                    style={[
                      styles.dayButton,
                      filters.studyDays.includes(studyDay.THUHOC) && styles.dayButtonSelected
                    ]}
                    onPress={() => handleStudyDayToggle(studyDay.THUHOC)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      filters.studyDays.includes(studyDay.THUHOC) && styles.dayButtonTextSelected
                    ]}>
                      {getShortDayName(studyDay.THUHOC)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Registration Method Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phương án đăng ký</Text>
            
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => setFilters(prev => ({ ...prev, registrationMethod: 'all' }))}
            >
              <View style={styles.radio}>
                {filters.registrationMethod === 'all' && (
                  <View style={styles.radioSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>Tất cả</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => setFilters(prev => ({ ...prev, registrationMethod: 'available' }))}
            >
              <View style={styles.radio}>
                {filters.registrationMethod === 'available' && (
                  <View style={styles.radioSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>Chưa đăng ký</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => setFilters(prev => ({ ...prev, registrationMethod: 'registered' }))}
            >
              <View style={styles.radio}>
                {filters.registrationMethod === 'registered' && (
                  <View style={styles.radioSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>Đã đăng ký</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <MaterialIcons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default CourseFilterModal;