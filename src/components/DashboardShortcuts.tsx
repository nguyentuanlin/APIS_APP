import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import menuService, { DashboardItem } from '../services/menuService';

interface DashboardShortcutsProps {
  navigation: any;
}

const DashboardShortcuts: React.FC<DashboardShortcutsProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [shortcuts, setShortcuts] = useState<DashboardItem[]>([]);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      setLoading(true);
      const items = await menuService.getDashboardItems();
      setShortcuts(items);
    } catch (error) {
      console.error('[DashboardShortcuts] Error loading shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShortcutPress = (item: DashboardItem) => {
    const screenName = getScreenName(item.CHUCNANG_MA);
    if (screenName) {
      navigation.navigate(screenName);
    } else if (item.CHUCNANG_DUONGDANFILE && item.CHUCNANG_DUONGDANFILE.startsWith('http')) {
      // External link - could open in browser
      console.log('[DashboardShortcuts] External link:', item.CHUCNANG_DUONGDANFILE);
    } else {
      console.log('[DashboardShortcuts] No screen mapping for:', item.CHUCNANG_MA);
    }
  };

  const getScreenName = (machucnang: string): string | null => {
    const screenMap: { [key: string]: string } = {
      'SV.XXN': 'Confirmation',
      'CSV.HP': 'Finance',
      'CSV.LICHH': 'StudySchedule',
      'CSV.DAKY': 'RegistrationMenu',
      'CSV.TNHS': 'ProfileDetail',
      'CSV.DIRL': 'TrainingScore',
    };
    
    return screenMap[machucnang] || null;
  };

  const getShortcutIcon = (machucnang: string): string => {
    const iconMap: { [key: string]: string } = {
      'SV.XXN': 'verified',
      'CSV.THUV': 'local-library',
      'CSV.HP': 'payments',
      'CSV.LICHH': 'schedule',
      'CSV.DAKY': 'edit-note',
      'CSV.TTCO': 'home',
      'CSV.TNHS': 'description',
      'CSV.DIRL': 'emoji-events',
    };
    
    return iconMap[machucnang] || 'apps';
  };

  const getShortcutColor = (index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {shortcuts.map((item, index) => (
          <TouchableOpacity
            key={item.CHUCNANG_ID}
            style={styles.shortcutCard}
            onPress={() => handleShortcutPress(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${getShortcutColor(index)}15` }]}>
              <MaterialIcons
                name={getShortcutIcon(item.CHUCNANG_MA) as any}
                size={32}
                color={getShortcutColor(index)}
              />
            </View>
            <Text style={styles.shortcutTitle} numberOfLines={2}>
              {item.CHUCNANG_TEN}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  shortcutCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default DashboardShortcuts;
