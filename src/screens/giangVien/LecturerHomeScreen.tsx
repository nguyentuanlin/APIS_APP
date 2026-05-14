import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { lecturerService, LecturerMenuItem } from '../../services/giangVien/lecturerService';
import { lecturerScheduleService, LichGiangItem } from '../../services/giangVien/lecturerScheduleService';
import CustomDrawer from '../../components/CustomDrawer';
import NotificationModal from '../../components/NotificationModal';
import { fcmService } from '../../services/chung/fcmService';

const ICON_BY_CODE: Record<string, { lib: 'mi' | 'mci'; name: string; color: string }> = {
  'CCB.LICHGIANG': { lib: 'mi', name: 'event-note', color: '#3B82F6' },
  'CCB.QLD': { lib: 'mi', name: 'grade', color: '#F59E0B' },
  'CCB.TK': { lib: 'mi', name: 'bar-chart', color: '#9333EA' },
  'CCB.TTUC': { lib: 'mi', name: 'newspaper', color: '#0EA5E9' },
  'CCB.VB': { lib: 'mi', name: 'description', color: '#64748B' },
  'CCB.XT': { lib: 'mci', name: 'clipboard-check', color: '#10B981' },
};

const fallbackIcon = { lib: 'mi' as const, name: 'apps', color: '#475569' };

const renderIcon = (code: string, size = 26) => {
  const cfg = ICON_BY_CODE[code] || fallbackIcon;
  if (cfg.lib === 'mci') {
    return <MaterialCommunityIcons name={cfg.name as any} size={size} color="#FFFFFF" />;
  }
  return <MaterialIcons name={cfg.name as any} size={size} color="#FFFFFF" />;
};

const iconColor = (code: string) => (ICON_BY_CODE[code] || fallbackIcon).color;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const VN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

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

// Shortcut nhanh — 4 chức năng dùng thường xuyên
const QUICK_ACTIONS = [
  { code: 'CCB.LICHGIANG', label: 'Lịch giảng', icon: 'event-note', color: '#3B82F6', screen: 'LecturerSchedule' },
  { code: 'CCB.NHTL', label: 'DS lớp', icon: 'people', color: '#10B981', screen: 'LecturerClassList' },
  { code: 'CCB.NhapDiem', label: 'Nhập điểm', icon: 'edit-note', color: '#F59E0B', screen: 'LecturerGradeSubmission' },
  { code: 'CCB.VB', label: 'Văn bản', icon: 'folder', color: '#0EA5E9', screen: 'Document' },
];

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

  // Lịch giảng hôm nay
  const [todayLich, setTodayLich] = useState<LichGiangItem[]>([]);
  const [loadingLich, setLoadingLich] = useState(true);

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

  // Load lịch giảng hôm nay (cùng ngày bắt đầu = ngày kết thúc)
  const loadTodayLich = useCallback(async () => {
    try {
      const d = new Date();
      const todayStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      const list = await lecturerScheduleService.getLichGiang(todayStr, todayStr);
      // Filter chính xác theo ngày hôm nay + sort theo giờ
      const filtered = (list || [])
        .filter((it) => it.NGAYHOC === todayStr)
        .sort(
          (a, b) =>
            a.GIOBATDAU * 60 + a.PHUTBATDAU - (b.GIOBATDAU * 60 + b.PHUTBATDAU)
        );
      setTodayLich(filtered);
    } catch (e) {
      // Silently fail — không hiện lỗi vì đây là thông tin phụ
      setTodayLich([]);
    } finally {
      setLoadingLich(false);
    }
  }, []);

  useEffect(() => {
    loadTodayLich();
  }, [loadTodayLich]);

  const onRefresh = () => {
    setRefreshing(true);
    setLoadingLich(true);
    load();
    loadTodayLich();
  };

  const SCREEN_BY_CODE: Record<string, string> = {
    'CCB.TTUC': 'News',
    'CCB.QLD': 'LecturerGradeEntry',
    'CCB.LICHGIANG': 'LecturerSchedule',
  };

  const handleItemPress = (item: LecturerMenuItem) => {
    const screenName = SCREEN_BY_CODE[item.MACHUCNANG];
    if (screenName) {
      navigation.navigate(screenName as never);
      return;
    }
    Alert.alert(item.TENCHUCNANG, `Mã: ${item.MACHUCNANG}\n\nChức năng đang được phát triển.`);
  };

  const parentMenus = lecturerService.getParentMenus(items);
  const displayName = getDisplayName(user as any);

  const dateInfo = useMemo(() => {
    const d = new Date();
    return {
      thu: VN_THU[d.getDay()],
      ngay: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
      ngayShort: `${pad2(d.getDate())}`,
      thang: `Tháng ${pad2(d.getMonth() + 1)}`,
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1E40AF', '#1E3A8A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setShowDrawer(true)} style={styles.iconBtn}>
            <MaterialIcons name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.dateBadge}>
            <MaterialIcons name="event" size={14} color="#FFFFFF" />
            <Text style={styles.dateBadgeText}>{dateInfo.thu}, {dateInfo.ngay}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowNotiModal(true)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
            {unreadNoti > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadNoti > 99 ? '99+' : unreadNoti}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* User info */}
        <View style={styles.userBlock}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <MaterialCommunityIcons name="hand-wave" size={14} color="#FCD34D" />
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.rolePill}>
              <MaterialIcons name="school" size={12} color="#FFFFFF" />
              <Text style={styles.userRole} numberOfLines={1}>
                {user?.activeRoleName || 'Cổng cán bộ'}
              </Text>
            </View>
          </View>

          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A8A" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick action shortcuts */}
        <View style={styles.shortcutsRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.code}
              style={styles.shortcutItem}
              onPress={() => navigation.navigate(a.screen as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: a.color }]}>
                <MaterialIcons name={a.icon as any} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today overview banner */}
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.todayBanner}
        >
          <View style={styles.todayDateBox}>
            <Text style={styles.todayDateNum}>{dateInfo.ngayShort}</Text>
            <Text style={styles.todayDateMon}>{dateInfo.thang.replace('Tháng ', 'TH ')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>{dateInfo.thu}</Text>
            <Text style={styles.todaySubtitle}>
              Truy cập nhanh các chức năng giảng dạy
            </Text>
          </View>
          <MaterialCommunityIcons
            name="cast-education"
            size={32}
            color="#1E3A8A"
            style={{ opacity: 0.4 }}
          />
        </LinearGradient>

        {/* Lịch giảng hôm nay */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="schedule" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Lịch giảng hôm nay</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('LecturerSchedule' as never)}>
            <Text style={styles.linkText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loadingLich ? (
          <View style={[styles.lichCard, { paddingVertical: 24, alignItems: 'center' }]}>
            <ActivityIndicator color="#1E3A8A" size="small" />
          </View>
        ) : todayLich.length === 0 ? (
          <TouchableOpacity
            style={styles.lichEmpty}
            onPress={() => navigation.navigate('LecturerSchedule' as never)}
            activeOpacity={0.85}
          >
            <View style={styles.lichEmptyIcon}>
              <MaterialIcons name="event-available" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lichEmptyTitle}>Hôm nay không có buổi giảng</Text>
              <View style={styles.lichEmptySubRow}>
                <Text style={styles.lichEmptySubtitle}>Tận hưởng một ngày thư giãn</Text>
                <MaterialCommunityIcons name="leaf" size={13} color="#16A34A" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.lichSummary}>
              <MaterialIcons name="notifications-active" size={16} color="#1E40AF" />
              <Text style={styles.lichSummaryText}>
                Hôm nay có <Text style={{ fontWeight: '800' }}>{todayLich.length}</Text> buổi giảng
              </Text>
            </View>
            {todayLich.slice(0, 3).map((it, idx) => {
              const time = `${pad2(it.GIOBATDAU)}:${pad2(it.PHUTBATDAU)} - ${pad2(it.GIOKETTHUC)}:${pad2(it.PHUTKETTHUC)}`;
              return (
                <TouchableOpacity
                  key={`${it.ID}_${idx}`}
                  style={styles.lichItem}
                  onPress={() => navigation.navigate('LecturerSchedule' as never)}
                  activeOpacity={0.85}
                >
                  <View style={styles.lichTimeBox}>
                    <Text style={styles.lichTimeStart}>
                      {pad2(it.GIOBATDAU)}:{pad2(it.PHUTBATDAU)}
                    </Text>
                    <View style={styles.lichTimeBar} />
                    <Text style={styles.lichTimeEnd}>
                      {pad2(it.GIOKETTHUC)}:{pad2(it.PHUTKETTHUC)}
                    </Text>
                  </View>
                  <View style={styles.lichDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lichTitle} numberOfLines={2}>
                      {it.TENHOCPHAN || '(Không tên)'}
                    </Text>
                    <Text style={styles.lichLop} numberOfLines={1}>
                      {it.TENLOPHOCPHAN}
                    </Text>
                    <View style={styles.lichMetaRow}>
                      {!!it.TENPHONGHOC && (
                        <View style={styles.lichMetaItem}>
                          <MaterialIcons name="room" size={11} color="#64748B" />
                          <Text style={styles.lichMeta}>{it.TENPHONGHOC}</Text>
                        </View>
                      )}
                      {it.TIETBATDAU != null && it.TIETKETTHUC != null && (
                        <View style={styles.lichMetaItem}>
                          <MaterialCommunityIcons name="clock-outline" size={11} color="#64748B" />
                          <Text style={styles.lichMeta}>Tiết {it.TIETBATDAU}-{it.TIETKETTHUC}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
            {todayLich.length > 3 && (
              <TouchableOpacity
                style={styles.lichMore}
                onPress={() => navigation.navigate('LecturerSchedule' as never)}
              >
                <Text style={styles.lichMoreText}>
                  + Xem thêm {todayLich.length - 3} buổi nữa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Section header */}
        <View style={[styles.sectionHeader, { marginTop: 18 }]}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="apps" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Chức năng</Text>
          </View>
          <Text style={styles.sectionCount}>{parentMenus.length} mục</Text>
        </View>

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
            {parentMenus.map((item) => {
              const color = iconColor(item.MACHUCNANG);
              return (
                <TouchableOpacity
                  key={item.ID}
                  style={styles.featureCard}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.featureAccent, { backgroundColor: color }]} />
                  <View style={styles.featureBody}>
                    <View style={[styles.featureIcon, { backgroundColor: color }]}>
                      {renderIcon(item.MACHUCNANG)}
                    </View>
                    <Text style={styles.featureTitle} numberOfLines={2}>
                      {item.TENCHUCNANG}
                    </Text>
                    <View style={styles.featureFooter}>
                      <View style={{ flex: 1 }} />
                      <MaterialIcons name="arrow-forward" size={14} color={color} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
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

  // Header
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dateBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E3A8A',
  },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },

  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  lichEmptySubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
    maxWidth: 240,
  },
  userRole: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  avatarWrap: {},
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 32 },

  // Quick action shortcuts row
  shortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  shortcutItem: { flex: 1, alignItems: 'center' },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  shortcutLabel: { fontSize: 11, color: '#334155', fontWeight: '600', textAlign: 'center' },

  // Today banner
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayDateBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  todayDateNum: { fontSize: 22, fontWeight: '800', color: '#1E3A8A', lineHeight: 24 },
  todayDateMon: { fontSize: 9, color: '#64748B', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  todayTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  todaySubtitle: { fontSize: 12, color: '#475569', marginTop: 4 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sectionCount: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  linkText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  // Lịch giảng hôm nay
  lichCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  lichSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
  },
  lichSummaryText: { fontSize: 12, color: '#1E40AF' },
  lichEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  lichEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lichEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  lichEmptySubtitle: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  lichItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  lichTimeBox: { width: 54, alignItems: 'center', paddingHorizontal: 4 },
  lichTimeStart: { fontSize: 13, fontWeight: '800', color: '#1E3A8A' },
  lichTimeBar: { width: 2, height: 12, backgroundColor: '#CBD5E1', marginVertical: 2 },
  lichTimeEnd: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  lichDivider: { width: 1, height: 44, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  lichTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 17 },
  lichLop: { fontSize: 11, color: '#1E3A8A', fontWeight: '600', marginTop: 2 },
  lichMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  lichMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lichMeta: { fontSize: 10, color: '#64748B' },
  lichMore: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  lichMoreText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  // Feature grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 0,
  },
  featureCard: {
    width: '46.5%',
    margin: '1.75%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  featureAccent: { height: 4, width: '100%' },
  featureBody: { padding: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 36,
    lineHeight: 18,
  },
  featureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  featureCode: { fontSize: 10, color: '#94A3B8', fontWeight: '600', flex: 1 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  muted: { marginTop: 12, color: '#64748B', fontSize: 13 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 16, alignItems: 'center', marginHorizontal: 16 },
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
