import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import {
  gradeService,
  GradeResponse,
  KhoiKienThucResponse,
} from '../services/gradeService';

// Import components
import GradeStatistics from '../components/grade/GradeStatistics';
import GradeTabs, { TabKey } from '../components/grade/GradeTabs';
import GradeTable from '../components/grade/GradeTable';
import FailedCourses from '../components/grade/FailedCourses';
import KnowledgeBlocks from '../components/grade/KnowledgeBlocks';
import RegistrationResults from '../components/grade/RegistrationResults';
import DecisionsList from '../components/grade/DecisionsList';
import CertificatesList from '../components/grade/CertificatesList';
import AcademicWarnings from '../components/grade/AcademicWarnings';
import TrainingScores from '../components/grade/TrainingScores';

const GradeLookupScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradeData, setGradeData] = useState<GradeResponse | null>(null);
  const [khoiData, setKhoiData] = useState<KhoiKienThucResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('bangdiem');

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
      
      // Refresh khối kiến thức
      const khoiKienThuc = await gradeService.getKhoiKienThuc();
      setKhoiData(khoiKienThuc);
    } catch (error) {
      console.error('Error refreshing grades:', error);
    } finally {
      setRefreshing(false);
    }
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
        <GradeStatistics gradeData={gradeData} />
        <GradeTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'bangdiem' && <GradeTable gradeData={gradeData} />}
        {activeTab === 'hocphanno' && <FailedCourses gradeData={gradeData} />}
        {activeTab === 'khoi' && <KnowledgeBlocks khoiData={khoiData} />}
        {activeTab === 'dangky' && <RegistrationResults />}
        {activeTab === 'quyetdinh' && <DecisionsList />}
        {activeTab === 'vanbang' && <CertificatesList />}
        {activeTab === 'canhbao' && <AcademicWarnings />}
        {activeTab === 'renluyen' && <TrainingScores />}
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
});

export default GradeLookupScreen;
