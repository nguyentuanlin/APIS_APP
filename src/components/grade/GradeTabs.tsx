import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type TabKey = 'bangdiem' | 'hocphanno' | 'khoi' | 'dangky' | 'quyetdinh' | 'vanbang' | 'canhbao' | 'renluyen';

interface GradeTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const GradeTabs: React.FC<GradeTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: 'bangdiem' as TabKey, icon: 'description', label: 'Bảng điểm', color: '#3B82F6' },
    { key: 'hocphanno' as TabKey, icon: 'warning', label: 'Học phần nợ', color: '#F97316' },
    { key: 'khoi' as TabKey, icon: 'category', label: 'Khối kiến thức', color: '#8B5CF6' },
    { key: 'dangky' as TabKey, icon: 'assignment', label: 'Kết quả ĐK', color: '#10B981' },
    { key: 'quyetdinh' as TabKey, icon: 'gavel', label: 'Quyết định', color: '#F59E0B' },
    { key: 'vanbang' as TabKey, icon: 'school', label: 'VB - Chứng chỉ', color: '#EC4899' },
    { key: 'canhbao' as TabKey, icon: 'report-problem', label: 'Cảnh báo HV', color: '#EF4444' },
    { key: 'renluyen' as TabKey, icon: 'emoji-events', label: 'Điểm rèn luyện', color: '#14B8A6' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollContainer}
      contentContainerStyle={styles.tabContainer}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && styles.activeTab,
              { borderBottomColor: isActive ? tab.color : 'transparent' }
            ]}
            onPress={() => onTabChange(tab.key)}
          >
            <View style={[
              styles.tabIconContainer,
              isActive && { backgroundColor: `${tab.color}15` }
            ]}>
              <MaterialIcons 
                name={tab.icon as any}
                size={22} 
                color={isActive ? tab.color : '#9CA3AF'} 
              />
            </View>
            <Text style={[
              styles.tabText,
              isActive && styles.activeTabText,
              isActive && { color: tab.color }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabScrollContainer: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  activeTabText: {
    fontWeight: '700',
  },
});

export default GradeTabs;
export type { TabKey };
