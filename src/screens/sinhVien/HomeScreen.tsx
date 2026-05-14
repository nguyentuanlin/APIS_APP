import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import CustomDrawer from '../../components/CustomDrawer';
import NotificationModal from '../../components/NotificationModal';
import {
  scheduleService,
  ScheduleItem,
  StudentInfo,
} from '../../services/sinhVien/scheduleService';
import { fcmService } from '../../services/chung/fcmService';

const VN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

// Shortcut nhanh (giống bên giảng viên)
const QUICK_ACTIONS = [
  { label: 'Lịch học', icon: 'schedule', color: '#3B82F6', screen: 'StudySchedule' },
  { label: 'Lịch thi', icon: 'assignment', color: '#EF4444', screen: 'ExamSchedule' },
  { label: 'Điểm', icon: 'grade', color: '#10B981', screen: 'GradeLookup' },
  { label: 'Tài chính', icon: 'account-balance-wallet', color: '#F59E0B', screen: 'Finance' },
];

// Tính năng chính
const FEATURES = [
  {
    title: 'Thời khóa biểu',
    subtitle: 'Lịch học hôm nay',
    icon: 'schedule',
    color: '#3B82F6',
    screen: 'StudySchedule',
  },
  {
    title: 'Lịch thi',
    subtitle: 'Lịch thi các môn',
    icon: 'assignment',
    color: '#EF4444',
    screen: 'ExamSchedule',
  },
  {
    title: 'Tra cứu điểm',
    subtitle: 'Kết quả học tập',
    icon: 'grade',
    color: '#10B981',
    screen: 'GradeLookup',
  },
  {
    title: 'Tài chính',
    subtitle: 'Học phí & thanh toán',
    icon: 'account-balance-wallet',
    color: '#F59E0B',
    screen: 'Finance',
  },
  {
    title: 'Đăng ký',
    subtitle: 'Đăng ký môn / nguyện vọng',
    icon: 'app-registration',
    color: '#9333EA',
    screen: 'RegistrationMenu',
  },
  {
    title: 'Văn bản',
    subtitle: 'Văn bản, quy định',
    icon: 'description',
    color: '#0EA5E9',
    screen: 'Document',
  },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [showDrawer, setShowDrawer] = useState(false);
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [unreadNoti, setUnreadNoti] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(true);

  useEffect(() => {
    const unsub = fcmService.subscribe((_inbox, unread) => setUnreadNoti(unread));
    return unsub;
  }, []);

  const loadToday = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      setLoadingStudentInfo(true);
      const [schedules, student] = await Promise.all([
        scheduleService.getTodaySchedule(),
        scheduleService.getStudentInfo(),
      ]);
      const today = new Date();
      const todayStr = `${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()}`;
      const list = (schedules || [])
        .filter((s) => s.NGAYHOC === todayStr)
        .sort((a: any, b: any) => {
          const ta = (a.GIOBATDAU || 0) * 60 + (a.PHUTBATDAU || 0);
          const tb = (b.GIOBATDAU || 0) * 60 + (b.PHUTBATDAU || 0);
          return ta - tb;
        });
      setTodaySchedules(list);
      setStudentInfo(student);
    } catch (e) {
      // Silent fail
    } finally {
      setLoadingSchedule(false);
      setLoadingStudentInfo(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadToday();
    setIsRefreshing(false);
  };

  const dateInfo = useMemo(() => {
    const d = new Date();
    return {
      thu: VN_THU[d.getDay()],
      ngay: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
      ngayShort: `${pad2(d.getDate())}`,
      thang: `TH ${pad2(d.getMonth() + 1)}`,
    };
  }, []);

  const displayName = studentInfo
    ? `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`.trim()
    : user?.fullname || user?.username || 'Sinh viên';

  const studyCount = todaySchedules.filter((s) => s.PHANLOAI !== 'LICHTHI').length;
  const examCount = todaySchedules.filter((s) => s.PHANLOAI === 'LICHTHI').length;

  // Stats cards (compact)
  const stats = studentInfo
    ? [
        {
          title: 'Mã SV',
          value: studentInfo.QLSV_NGUOIHOC_MASO,
          subtitle: 'Student ID',
          icon: 'badge',
          color: '#3B82F6',
        },
        {
          title: 'Lớp',
          value: studentInfo.DAOTAO_LOPQUANLY_MA,
          subtitle: studentInfo.DAOTAO_LOPQUANLY_TEN,
          icon: 'school',
          color: '#10B981',
        },
        {
          title: 'Khóa',
          value: studentInfo.DAOTAO_KHOADAOTAO_MA,
          subtitle: studentInfo.DAOTAO_KHOADAOTAO_TEN,
          icon: 'timeline',
          color: '#9333EA',
        },
        {
          title: 'Trạng thái',
          value:
            studentInfo.QLSV_TRANGTHAINGUOIHOC_MA === 'NORMAL'
              ? 'Bình thường'
              : studentInfo.QLSV_TRANGTHAINGUOIHOC_MA,
          subtitle: studentInfo.QLSV_TRANGTHAINGUOIHOC_TEN,
          icon: 'verified-user',
          color: '#F59E0B',
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#1E40AF', '#1E3A8A']}
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
            <Text style={styles.dateBadgeText}>
              {dateInfo.thu}, {dateInfo.ngay}
            </Text>
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

        {/* User block */}
        <View style={styles.userBlock}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <MaterialCommunityIcons name="hand-wave" size={14} color="#FCD34D" />
            </View>
            {loadingStudentInfo ? (
              <View style={styles.loadingNameRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingNameText}>Đang tải...</Text>
              </View>
            ) : (
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
            )}
            <View style={styles.rolePill}>
              <MaterialIcons name="school" size={12} color="#FFFFFF" />
              <Text style={styles.userRole} numberOfLines={1}>
                {studentInfo
                  ? `${studentInfo.QLSV_NGUOIHOC_MASO} · ${studentInfo.DAOTAO_LOPQUANLY_TEN}`
                  : 'Cổng thông tin sinh viên'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile' as never)}
            activeOpacity={0.9}
            style={styles.avatarWrap}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#60A5FA', '#3B82F6']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {studentInfo
                    ? studentInfo.QLSV_NGUOIHOC_TEN.charAt(0).toUpperCase()
                    : (user?.fullname || 'S').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1E3A8A" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick action shortcuts */}
        <View style={styles.shortcutsRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
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

        {/* Today banner */}
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.todayBanner}
        >
          <View style={styles.todayDateBox}>
            <Text style={styles.todayDateNum}>{dateInfo.ngayShort}</Text>
            <Text style={styles.todayDateMon}>{dateInfo.thang}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>{dateInfo.thu}</Text>
            <Text style={styles.todaySubtitle}>
              {todaySchedules.length === 0
                ? 'Tận hưởng ngày học tập của bạn'
                : examCount > 0 && studyCount > 0
                ? `${studyCount} lịch học · ${examCount} lịch thi`
                : examCount > 0
                ? `${examCount} lịch thi hôm nay`
                : `${studyCount} lịch học hôm nay`}
            </Text>
          </View>
          <MaterialCommunityIcons name="school" size={32} color="#1E3A8A" style={{ opacity: 0.4 }} />
        </LinearGradient>

        {/* Lịch hôm nay */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="today" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Lịch hôm nay</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('StudySchedule' as never)}>
            <Text style={styles.linkText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loadingSchedule ? (
          <View style={[styles.lichCard, { paddingVertical: 24, alignItems: 'center' }]}>
            <ActivityIndicator color="#1E3A8A" size="small" />
          </View>
        ) : todaySchedules.length === 0 ? (
          <TouchableOpacity
            style={styles.lichEmpty}
            onPress={() => navigation.navigate('StudySchedule' as never)}
            activeOpacity={0.85}
          >
            <View style={styles.lichEmptyIcon}>
              <MaterialIcons name="event-available" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lichEmptyTitle}>Hôm nay không có lịch</Text>
              <View style={styles.lichEmptySubRow}>
                <Text style={styles.lichEmptySubtitle}>Hãy tận dụng thời gian để ôn tập</Text>
                <MaterialCommunityIcons name="book-open-page-variant" size={13} color="#16A34A" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {(examCount > 0 || studyCount > 0) && (
              <View style={styles.lichSummary}>
                <MaterialIcons name="notifications-active" size={16} color="#1E40AF" />
                <Text style={styles.lichSummaryText}>
                  Hôm nay có{' '}
                  <Text style={{ fontWeight: '800' }}>{todaySchedules.length}</Text>{' '}
                  {examCount > 0 && studyCount > 0
                    ? `(${studyCount} học + ${examCount} thi)`
                    : examCount > 0
                    ? 'lịch thi'
                    : 'lịch học'}
                </Text>
              </View>
            )}
            {todaySchedules.slice(0, 3).map((s, idx) => {
              const isExam = s.PHANLOAI === 'LICHTHI';
              const stripColor = isExam ? '#EF4444' : '#3B82F6';
              const gioBd = (s as any).GIOBATDAU ?? 0;
              const phutBd = (s as any).PHUTBATDAU ?? 0;
              const gioKt = (s as any).GIOKETTHUC ?? 0;
              const phutKt = (s as any).PHUTKETTHUC ?? 0;
              return (
                <TouchableOpacity
                  key={`${s.ID}_${idx}`}
                  style={[styles.lichItem, { borderLeftColor: stripColor }]}
                  onPress={() =>
                    navigation.navigate(
                      isExam ? ('ExamSchedule' as never) : ('StudySchedule' as never)
                    )
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.lichTimeBox}>
                    <Text style={[styles.lichTimeStart, { color: stripColor }]}>
                      {pad2(gioBd)}:{pad2(phutBd)}
                    </Text>
                    <View style={styles.lichTimeBar} />
                    <Text style={styles.lichTimeEnd}>
                      {pad2(gioKt)}:{pad2(phutKt)}
                    </Text>
                  </View>
                  <View style={styles.lichDivider} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.lichTitle} numberOfLines={2}>
                        {s.TENHOCPHAN || '(Không tên)'}
                      </Text>
                      {isExam && (
                        <View style={styles.examBadge}>
                          <Text style={styles.examBadgeText}>THI</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.lichMetaRow}>
                      {!!s.TENPHONGHOC && (
                        <View style={styles.lichMetaItem}>
                          <MaterialIcons name="room" size={11} color="#64748B" />
                          <Text style={styles.lichMeta}>{s.TENPHONGHOC}</Text>
                        </View>
                      )}
                      {!!s.GIANGVIEN && (
                        <View style={styles.lichMetaItem}>
                          <MaterialIcons name="person" size={11} color="#64748B" />
                          <Text style={styles.lichMeta} numberOfLines={1}>
                            {s.GIANGVIEN}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
            {todaySchedules.length > 3 && (
              <TouchableOpacity
                style={styles.lichMore}
                onPress={() => navigation.navigate('StudySchedule' as never)}
              >
                <Text style={styles.lichMoreText}>
                  + Xem thêm {todaySchedules.length - 3} lịch nữa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats cards */}
        {stats.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="info" size={20} color="#1E3A8A" />
                <Text style={styles.sectionTitle}>Thông tin học tập</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              {stats.map((stat, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                    <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statSubtitle} numberOfLines={1}>
                    {stat.subtitle}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Tính năng chính */}
        <View style={[styles.sectionHeader, { marginTop: 18 }]}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="apps" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Tính năng chính</Text>
          </View>
          <Text style={styles.sectionCount}>{FEATURES.length} mục</Text>
        </View>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.title}
              style={styles.featureCard}
              onPress={() => navigation.navigate(f.screen as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.featureAccent, { backgroundColor: f.color }]} />
              <View style={styles.featureBody}>
                <View style={[styles.featureIcon, { backgroundColor: f.color }]}>
                  <MaterialIcons name={f.icon as any} size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.featureTitle} numberOfLines={2}>
                  {f.title}
                </Text>
                <Text style={styles.featureSubtitle} numberOfLines={2}>
                  {f.subtitle}
                </Text>
                <View style={styles.featureFooter}>
                  <View style={{ flex: 1 }} />
                  <MaterialIcons name="arrow-forward" size={14} color={f.color} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <CustomDrawer visible={showDrawer} onClose={() => setShowDrawer(false)} navigation={navigation} />
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

  userBlock: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  lichEmptySubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  loadingNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  loadingNameText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
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
    maxWidth: 260,
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

  // Shortcuts row
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
  todayDateMon: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  todayTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  todaySubtitle: { fontSize: 12, color: '#475569', marginTop: 4 },

  // Section
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

  // Lịch hôm nay
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
  },
  lichTimeBox: { width: 54, alignItems: 'center', paddingHorizontal: 4 },
  lichTimeStart: { fontSize: 13, fontWeight: '800' },
  lichTimeBar: { width: 2, height: 12, backgroundColor: '#CBD5E1', marginVertical: 2 },
  lichTimeEnd: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  lichDivider: { width: 1, height: 44, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  lichTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 17 },
  examBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examBadgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  lichMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  lichMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '60%' },
  lichMeta: { fontSize: 10, color: '#64748B' },
  lichMore: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
  lichMoreText: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  statCard: {
    width: '46.5%',
    margin: '1.75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statTitle: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  statSubtitle: { fontSize: 10, color: '#94A3B8', marginTop: 1 },

  // Features
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
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
    lineHeight: 18,
  },
  featureSubtitle: { fontSize: 11, color: '#64748B', marginTop: 4, minHeight: 28 },
  featureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default HomeScreen;
