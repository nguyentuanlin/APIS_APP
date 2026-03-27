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
import menuService, { MenuItem } from '../services/menuService';

const RegistrationMenuScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      console.log('[RegistrationMenuScreen] Loading menu...');
      
      const allMenus = await menuService.getMenuByUser();
      console.log('[RegistrationMenuScreen] All menus loaded:', allMenus.length);
      
      const registrationMenus = menuService.getRegistrationMenus(allMenus);
      console.log('[RegistrationMenuScreen] Registration menus:', registrationMenus.length);
      
      setMenuItems(registrationMenus);
    } catch (error) {
      console.error('[RegistrationMenuScreen] Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    // Map menu items to screens based on actual API MACHUCNANG
    const menuMapping: { [key: string]: string } = {
      'CSV.DAKY': 'CourseRegistration', // Đăng ký học
      'CSV.NVON': 'WishlistRegistration', // Đăng ký nguyện vọng
      'CSVXEDM': 'WishlistResults', // Xem kết quả đăng ký NV
      'CSV.TCDAKY': 'RegistrationResults', // Tra cứu kết quả đăng ký
      'CSVDKDH': 'OrientationRegistration', // Đăng ký định hướng ĐT
      'CSVDKTMT': 'ExamRegistration', // Đăng ký thi
    };

    const screenName = menuMapping[item.MACHUCNANG];
    if (screenName) {
      // @ts-ignore
      navigation.navigate(screenName);
    } else {
      console.log('[RegistrationMenuScreen] No screen mapping for:', item.MACHUCNANG, item.TENCHUCNANG);
    }
  };

  const getMenuIcon = (machucnang: string): string => {
    const iconMap: { [key: string]: string } = {
      'CSV.DAKY': 'edit-note',
      'CSV.NVON': 'favorite',
      'CSVXEDM': 'visibility',
      'CSV.TCDAKY': 'search',
      'CSVDKDH': 'explore',
      'CSVDKTMT': 'assignment',
    };
    
    return iconMap[machucnang] || 'circle';
  };

  const getMenuColor = (machucnang: string): string => {
    const colorMap: { [key: string]: string } = {
      'CSV.DAKY': '#3B82F6',
      'CSV.NVON': '#EC4899',
      'CSVXEDM': '#8B5CF6',
      'CSV.TCDAKY': '#10B981',
      'CSVDKDH': '#F59E0B',
      'CSVDKTMT': '#EF4444',
    };
    
    return colorMap[machucnang] || '#6B7280';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đăng ký trực tuyến</Text>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải menu...</Text>
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
          <Text style={styles.headerTitle}>Đăng ký trực tuyến</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.ID}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
            >
              <View style={styles.menuIconContainer}>
                <View style={[styles.menuIcon, { backgroundColor: `${getMenuColor(item.MACHUCNANG)}15` }]}>
                  <MaterialIcons name={getMenuIcon(item.MACHUCNANG) as any} size={24} color={getMenuColor(item.MACHUCNANG)} />
                </View>
                {index < menuItems.length - 1 && <View style={styles.connector} />}
              </View>
              
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.TENCHUCNANG}</Text>
                {item.MOTA && (
                  <Text style={styles.menuDescription}>{item.MOTA}</Text>
                )}
              </View>

              <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
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
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  menuIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    position: 'absolute',
    top: 48,
    width: 2,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default RegistrationMenuScreen;
