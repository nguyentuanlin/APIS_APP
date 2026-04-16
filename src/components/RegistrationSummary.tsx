import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { Course } from '../services/courseRegistrationService';

interface RegistrationSummaryProps {
  courses: Course[];
}

const RegistrationSummary: React.FC<RegistrationSummaryProps> = ({ courses }) => {
  const registeredCourses = courses.filter(course => course.DADANGKY === 1);
  const totalCredits = registeredCourses.reduce((sum, course) => sum + course.DAOTAO_HOCPHAN_SOTINCHI, 0);
  const availableCourses = courses.filter(course => course.DADANGKY === 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tổng quan đăng ký</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <MaterialIcons name="check-circle" size={24} color="#10B981" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{registeredCourses.length}</Text>
            <Text style={styles.statLabel}>Đã đăng ký</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <MaterialIcons name="school" size={24} color="#3B82F6" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{totalCredits}</Text>
            <Text style={styles.statLabel}>Tín chỉ</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <MaterialIcons name="pending" size={24} color="#F59E0B" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{availableCourses.length}</Text>
            <Text style={styles.statLabel}>Có thể đăng ký</Text>
          </View>
        </View>
      </View>

      {registeredCourses.length > 0 && (
        <View style={styles.registeredSection}>
          <Text style={styles.sectionTitle}>Học phần đã đăng ký</Text>
          {registeredCourses.map((course) => (
            <View key={course.ID} style={styles.registeredItem}>
              <View style={styles.courseIcon}>
                <MaterialIcons name="check" size={16} color="#10B981" />
              </View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{course.DAOTAO_HOCPHAN_TEN}</Text>
                <Text style={styles.courseCode}>
                  {course.DAOTAO_HOCPHAN_MA} • {course.DAOTAO_HOCPHAN_SOTINCHI} tín chỉ
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  statIcon: {
    marginRight: 8,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  registeredSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  registeredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  courseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  courseCode: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default RegistrationSummary;