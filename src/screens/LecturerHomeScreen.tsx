import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { lecturerService, LecturerMenuItem } from '../services/lecturerService';
import CustomDrawer from '../components/CustomDrawer';
import NotificationModal from '../components/NotificationModal';
import { fcmService } from '../services/fcmService';

const ICON_BY_CODE: Record<string, { lib: 'mi' | 'mci'; name: string; color: string }> = {
  'CCB.LICHGIANG': { lib: 'mi', name: 'event-note', color: '#1f5fb2' },
  'CCB.QLD': { lib: 'mi', name: 'grade', color: '#e85d04' },
  'CCB.TK': { lib: 'mi', name: 'bar-chart', color: '#9333ea' },
  'CCB.TTUC': { lib: 'mi', name: 'newspaper', color: '#0ea5e9' },
  'CCB.VB': { lib: 'mi', name: 'description', color: '#64748b' },
  'CCB.XT': { lib: 'mci', name: 'clipboard-check', color: '#10b981' },
};

const fallbackIcon = { lib: 'mi' as const, name: 'apps', color: '#475569' };

const renderIcon = (code: string) => {
  const cfg = ICON_BY_CODE[code] || fallbackIcon;
  if (cfg.lib === 'mci') {
    return <MaterialCommunityIcons name={cfg.name as any} size={28} color="#FFFFFF" />;
  }
  return <MaterialIcons name={cfg.name as any} size={28} color="#FFFFFF" />;
};

const iconColor = (code: string) => (ICON_BY_CODE[code] || fallbackIcon).color;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

// Bắt cả UUID thuần và format JWT sub <UUID>;<session>;<timestamp>
const looksLikeUuid = (s: string) => /^[0-9A-Fa-f]{32}(;.*)?$/.test(s.trim());

const getDisplayName = (user: { fullname?: string; username?: string; email?: string } | null) => {
  if (!user) return 'Giảng viên';
  const fn = (user.fullname || '').trim();
  if (fn && !looksLikeUuid(fn)) return fn;
  const un = (user.username || '').trim();
  if (un && !looksLikeUuid(un) && !un.includes('@')) return un;
  const em = (user.email || '').trim();
  if (em) return em.split('@')[0];
  return 'Giảng viên';
};

const LecturerHomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [items, setItems] = useState<LecturerMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [unreadNoti, setUnreadNoti] = useState(0);

  useEffect(() => {
    const unsub = fcmService.subscribe((_inbox, unread) => setUnreadNoti(unread));
    return unsub;
  }, []);

  const load = useCallback(async () => {
    if (!user?.activeRoleId) {
      setError('Không tìm thấy vai trò cán bộ.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const list = await lecturerService.getMenuByRole(user.activeRoleId);
      setItems(list);
    } catch (err: any) {
      setError(err?.message || 'Không lấy được danh sách chức năng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.activeRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Mapping mã chức năng cán bộ → tên screen đã có trong stack. Bổ sung dần khi
  // implement thêm screen GV — những mã chưa có sẽ hiện alert "đang phát triển".
  const SCREEN_BY_CODE: Record<string, string> = {
    'CCB.TTUC': 'News',
    // Card cha "Quản lý điểm" → shortcut sang "Nhập điểm theo DS thi" (item con phổ biến nhất).
    // Khi có thêm screen QLD khác, đổi thành màn list submenu.
    'CCB.QLD': 'LecturerGradeEntry',
    // Card cha "Lịch giảng" → màn Thời khóa biểu cá nhân
    'CCB.LICHGIANG': 'LecturerSchedule',
  };

  const handleItemPress = (item: LecturerMenuItem) => {
    const screenName = SCREEN_BY_CODE[item.MACHUCNANG];
    if (screenName) {
      navigation.navigate(screenName as never);
      return;
    }
    Alert.alert(
      item.TENCHUCNANG,
      `Mã: ${item.MACHUCNANG}\n\nChức năng đang được phát triển.`
    );
  };

  const parentMenus = lecturerService.getParentMenus(items);
  const displayName = getDisplayName(user as any);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#1E40AF', '#1E3A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverGradient}
        />
        <View style={styles.headerOverlay} />

        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setShowDrawer(true)} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.userRole}>{user?.activeRoleName || 'Cổng cán bộ'}</Text>
          </View>

          <View style={styles.avatarWrapperHeader}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.topActionsContainer}>
          <TouchableOpacity
            onPress={() => setShowNotiModal(true)}
            style={styles.topActionButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
            {unreadNoti > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadNoti > 99 ? '99+' : unreadNoti}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.welcomeGradient}>
            <View style={styles.welcomeContent}>
              <MaterialIcons name="cast-for-education" size={32} color="#1E3A8A" />
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Chào mừng quay lại!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Truy cập nhanh các chức năng giảng dạy của bạn.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chức năng</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.muted}>Đang tải menu...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={22} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : parentMenus.length === 0 ? (
            <View style={styles.center}>
              <MaterialIcons name="inbox" size={48} color="#94a3b8" />
              <Text style={styles.muted}>Chưa có chức năng nào</Text>
            </View>
          ) : (
            <View style={styles.featuresGrid}>
              {parentMenus.map((item) => (
                <TouchableOpacity
                  key={item.ID}
                  style={styles.featureCard}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[`${iconColor(item.MACHUCNANG)}15`, `${iconColor(item.MACHUCNANG)}08`]}
                    style={styles.featureGradient}
                  >
                    <View style={[styles.featureIcon, { backgroundColor: iconColor(item.MACHUCNANG) }]}>
                      {renderIcon(item.MACHUCNANG)}
                    </View>
                    <Text style={styles.featureTitle} numberOfLines={2}>
                      {item.TENCHUCNANG}
                    </Text>
                    <Text style={styles.featureSubtitle} numberOfLines={1}>
                      {item.MACHUCNANG}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CustomDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        navigation={navigation}
      />

      <NotificationModal visible={showNotiModal} onClose={() => setShowNotiModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  headerContainer: { height: 200, position: 'relative', overflow: 'hidden' },
  coverGradient: { position: 'absolute', width: '100%', height: '100%' },
  headerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1 },
  greeting: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userRole: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatarWrapperHeader: { position: 'relative' },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },

  topActionsContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  topActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 32 },

  welcomeCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeGradient: { padding: 20 },
  welcomeContent: { flexDirection: 'row', alignItems: 'center' },
  welcomeText: { marginLeft: 16, flex: 1 },
  welcomeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  welcomeSubtitle: { fontSize: 13, color: '#4B5563', marginTop: 4 },

  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  featureGradient: { padding: 16, alignItems: 'center' },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minHeight: 36,
  },
  featureSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  muted: { marginTop: 12, color: '#64748B', fontSize: 13 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 16, alignItems: 'center' },
  errorText: { color: '#DC2626', marginTop: 6, textAlign: 'center', fontSize: 13 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});

export default LecturerHomeScreen;
