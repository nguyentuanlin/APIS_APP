import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { financeService, FinanceSummary, FinanceItem, ReceiptItem } from '../services/financeService';
import { scheduleService, StudentInfo } from '../services/scheduleService';
import FinanceDetailModal from '../components/FinanceDetailModal';
import ReceiptDetailModal from '../components/ReceiptDetailModal';
import FastQRModal from '../components/FastQRModal';

const { width } = Dimensions.get('window');

const FinanceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    items: FinanceItem[];
    totalAmount: number;
  }>({
    title: '',
    items: [],
    totalAmount: 0,
  });
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<{
    title: string;
    items: ReceiptItem[];
    totalAmount: number;
  }>({
    title: '',
    items: [],
    totalAmount: 0,
  });
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrModalData, setQrModalData] = useState<{
    qrUrl: string;
    paymentCode: string;
    amount: number;
    content: string;
  }>({
    qrUrl: '',
    paymentCode: '',
    amount: 0,
    content: '',
  });
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [debtData, totalAmountItems, exemptionItems, paidItems, surplusItems, generalSurplusItems, receiptItems, surplusReceiptItems, invoiceItems, studentData] = await Promise.all([
        financeService.getFinanceInfo(),
        financeService.getTotalAmountItems(),
        financeService.getExemptionItems(),
        financeService.getPaidItems(),
        financeService.getSurplusItems(),
        financeService.getGeneralSurplusItems(),
        financeService.getReceiptItems(),
        financeService.getSurplusReceiptItems(),
        financeService.getInvoiceItems(),
        scheduleService.getStudentInfo()
      ]);
      
      // Tính tổng các khoản
      const totalAmount = totalAmountItems.reduce((sum, item) => sum + (item.SOTIEN || 0), 0);
      const totalExemption = exemptionItems.reduce((sum, item) => sum + (item.SOTIEN || 0), 0);
      const totalPaid = paidItems.reduce((sum, item) => sum + (item.SOTIEN || 0), 0);
      const totalSurplus = surplusItems.reduce((sum, item) => sum + (item.SOTIEN || 0), 0);
      const totalGeneralSurplus = generalSurplusItems.reduce((sum, item) => sum + (item.SOTIEN || 0), 0);
      const totalReceipts = receiptItems.reduce((sum, item) => sum + (item.TONGTIEN || 0), 0);
      const totalSurplusReceipts = surplusReceiptItems.reduce((sum, item) => sum + (item.TONGTIEN || 0), 0);
      const totalInvoices = invoiceItems.reduce((sum, item) => sum + (item.TONGTIEN || 0), 0);
      
      // Merge dữ liệu
      const mergedData: FinanceSummary = {
        ...debtData,
        totalAmount,
        totalAmountItems,
        totalExemption,
        exemptionItems,
        totalPaid,
        paidItems,
        totalSurplus,
        surplusItems,
        totalGeneralSurplus,
        generalSurplusItems,
        totalReceipts,
        receiptItems,
        totalSurplusReceipts,
        surplusReceiptItems,
        totalInvoices,
        invoiceItems,
      };
      
      setFinanceSummary(mergedData);
      setStudentInfo(studentData);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinanceData();
    setRefreshing(false);
  };

  const handlePaymentCodePress = (qrUrl: string, paymentCode: string, amount: number, content: string) => {
    // Prevent multiple rapid clicks
    if (isProcessingQR) {
      // console.log('[FinanceScreen] QR processing in progress, ignoring click');
      return;
    }
    
    setIsProcessingQR(true);
    
    // console.log('[FinanceScreen] Opening QR modal:', {
    //   paymentCode,
    //   amount,
    //   qrUrl: qrUrl.substring(0, 100) + '...'
    // });
    
    try {
      // Đóng modal chi tiết trước khi mở QR modal
      setModalVisible(false);
      
      // Đợi một chút để modal chi tiết đóng hoàn toàn
      setTimeout(() => {
        setQrModalData({ qrUrl, paymentCode, amount, content });
        setQrModalVisible(true);
      }, 100);
    } catch (error) {
      console.error('[FinanceScreen] Error opening QR modal:', error);
    }
    
    // Reset processing flag after a short delay
    setTimeout(() => {
      setIsProcessingQR(false);
    }, 2000);
  };

  const handleDetailPress = (cardTitle: string, cardType: string) => {
    if (!financeSummary) return;

    let items: FinanceItem[] = [];
    let receiptItems: ReceiptItem[] = [];
    let totalAmount = 0;
    let title = '';

    switch (cardType) {
      case 'totalDebt':
        // Card "Tổng nợ chung các khoản" hiển thị tất cả items từ API
        items = financeSummary.items;
        totalAmount = financeSummary.items.reduce((sum, item) => sum + (item.SOTIENPHAINOP || 0), 0);
        title = 'Danh sách khoản nợ chung';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'totalAmount':
        // Card "Khoản phải nộp" hiển thị từ API
        items = financeSummary.totalAmountItems || [];
        totalAmount = financeSummary.totalAmount;
        title = 'Danh sách khoản phải nộp';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'exemption':
        // Card "Khoản được miễn" hiển thị từ API
        items = financeSummary.exemptionItems || [];
        totalAmount = financeSummary.totalExemption;
        title = 'Danh sách khoản được miễn';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'totalPaid':
        // Card "Khoản đã nộp" hiển thị từ API
        items = financeSummary.paidItems || [];
        totalAmount = financeSummary.totalPaid;
        title = 'Danh sách khoản đã nộp';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'surplus':
        // Card "Khoản dư rút" hiển thị từ API
        items = financeSummary.surplusItems || [];
        totalAmount = financeSummary.totalSurplus;
        title = 'Danh sách khoản dư rút';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'totalSurplus':
        // Card "Tổng dư chung các khoản" hiển thị từ API
        items = financeSummary.generalSurplusItems || [];
        totalAmount = financeSummary.totalGeneralSurplus;
        title = 'Danh sách dư chung';
        setModalData({ title, items, totalAmount });
        setModalVisible(true);
        break;
      case 'receipts':
        // Card "Danh sách phiếu đã thu" - dùng modal riêng
        receiptItems = financeSummary.receiptItems || [];
        totalAmount = financeSummary.totalReceipts;
        title = 'Danh sách phiếu đã thu';
        setReceiptModalData({ title, items: receiptItems, totalAmount });
        setReceiptModalVisible(true);
        break;
      case 'surplusReceipts':
        // Card "Danh sách phiếu dư rút" - dùng modal riêng
        receiptItems = financeSummary.surplusReceiptItems || [];
        totalAmount = financeSummary.totalSurplusReceipts;
        title = 'Danh sách phiếu dư rút';
        setReceiptModalData({ title, items: receiptItems, totalAmount });
        setReceiptModalVisible(true);
        break;
      case 'invoices':
        // Card "Danh sách phiếu hóa đơn" - dùng modal riêng
        receiptItems = financeSummary.invoiceItems || [];
        totalAmount = financeSummary.totalInvoices;
        title = 'Danh sách hóa đơn';
        setReceiptModalData({ title, items: receiptItems, totalAmount });
        setReceiptModalVisible(true);
        break;
      default:
        // Tất cả các card khác chưa có API
        alert(`Tính năng "${cardTitle}" đang được phát triển.\nAPI endpoint chưa có sẵn.`);
        return;
    }
  };

  const getFinanceCards = () => {
    if (!financeSummary) return [];

    return [
      {
        title: 'Khoản phải nộp',
        amount: financeService.formatCurrency(financeSummary.totalAmount), // Từ API thực
        icon: 'payments',
        color: '#10B981',
        bgColor: '#F0FDF4',
        type: 'totalAmount',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Khoản được miễn',
        amount: financeService.formatCurrency(financeSummary.totalExemption), // Từ API thực
        icon: 'emoji-events',
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        type: 'exemption',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Khoản đã nộp',
        amount: financeService.formatCurrency(financeSummary.totalPaid), // Từ API thực
        icon: 'credit-card',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        type: 'totalPaid',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Khoản dư rút',
        amount: financeService.formatCurrency(financeSummary.totalSurplus), // Từ API thực
        icon: 'account-balance-wallet',
        color: '#10B981',
        bgColor: '#F0FDF4',
        type: 'surplus',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Tổng nợ chung các khoản',
        amount: financeService.formatCurrency(financeSummary.totalDebt), // Từ API thực
        icon: 'money-off',
        color: '#8B5A2B',
        bgColor: '#FEF3E2',
        type: 'totalDebt',
        hasRealData: true, // Chỉ card này có API thực
      },
      {
        title: 'Tổng dư chung các khoản',
        amount: financeService.formatCurrency(financeSummary.totalGeneralSurplus), // Từ API thực
        icon: 'savings',
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        type: 'totalSurplus',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Danh sách phiếu đã thu',
        amount: financeService.formatCurrency(financeSummary.totalReceipts), // Từ API thực
        icon: 'receipt-long',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        type: 'receipts',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Danh sách phiếu dư rút',
        amount: financeService.formatCurrency(financeSummary.totalSurplusReceipts), // Từ API thực
        icon: 'trending-up',
        color: '#EF4444',
        bgColor: '#FEF2F2',
        type: 'surplusReceipts',
        hasRealData: true, // Đã có API thực
      },
      {
        title: 'Danh sách phiếu hóa đơn',
        amount: financeService.formatCurrency(financeSummary.totalInvoices), // Từ API thực
        icon: 'description',
        color: '#06B6D4',
        bgColor: '#F0F9FF',
        type: 'invoices',
        hasRealData: true, // Đã có API thực
      },
    ];
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải thông tin tài chính...</Text>
        </View>
      );
    }

    if (!financeSummary || !studentInfo) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Không thể tải thông tin tài chính</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFinanceData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const financeCards = getFinanceCards();

    return (
      <View style={styles.contentContainer}>
        {/* Student Info Header */}
        <View style={styles.studentInfoCard}>
          <View style={styles.studentInfoHeader}>
            <Text style={styles.studentName}>
              {`${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`.toUpperCase()}
            </Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: financeSummary.totalDebt > 0 ? '#EF4444' : '#10B981' }
            ]}>
              <Text style={styles.statusText}>
                {financeSummary.totalDebt > 0 
                  ? `Tổng nợ: -${financeService.formatCurrency(financeSummary.totalDebt)} đ`
                  : 'Đã hoàn thành'
                }
              </Text>
            </View>
          </View>
          <Text style={styles.studentDetails}>
            Mã: {studentInfo.QLSV_NGUOIHOC_MASO} - Lớp: {studentInfo.DAOTAO_LOPQUANLY_TEN}
          </Text>
        </View>

        {/* Finance Cards Grid */}
        <View style={styles.financeGrid}>
          {financeCards.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.financeCard}
              onPress={() => handleDetailPress(item.title, item.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.financeCardContent, { backgroundColor: item.bgColor }]}>
                <View style={styles.financeCardHeader}>
                  <View style={[styles.financeIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailButton}>
                    <Text style={styles.detailButtonText}>Chi tiết</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#6B7280" />
                  </View>
                </View>
                
                <Text style={styles.financeAmount}>{item.amount}</Text>
                <Text style={styles.financeTitle}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.breadcrumb}>Tài chính</Text>
          <MaterialIcons name="chevron-right" size={16} color="#6B7280" />
          <Text style={styles.breadcrumbActive}>Học phí</Text>
        </View>
        <TouchableOpacity style={styles.helpButton}>
          <MaterialIcons name="help-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {/* Đã bỏ phần tabs theo yêu cầu */}

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Finance Detail Modal */}
      <FinanceDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalData.title}
        items={modalData.items}
        totalAmount={modalData.totalAmount}
        onPaymentCodePress={handlePaymentCodePress}
      />

      {/* Receipt Detail Modal */}
      <ReceiptDetailModal
        visible={receiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        title={receiptModalData.title}
        items={receiptModalData.items}
        totalAmount={receiptModalData.totalAmount}
      />

      {/* Fast QR Modal */}
      <FastQRModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        qrUrl={qrModalData.qrUrl}
        paymentCode={qrModalData.paymentCode}
        amount={qrModalData.amount}
        content={qrModalData.content}
      />
    </View>
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  breadcrumb: {
    fontSize: 16,
    color: '#6B7280',
  },
  breadcrumbActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpButton: {
    padding: 8,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  studentInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 120,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  studentDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  financeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  financeCard: {
    width: (width - 44) / 2,
    marginBottom: 12,
  },
  financeCardContent: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  detailButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  financeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  financeTitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  historyDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyAmountContainer: {
    alignItems: 'flex-end',
  },
  historyDebt: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  debtListContainer: {
    marginTop: 20,
  },
  debtItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debtItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debtItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  debtItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  debtItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  debtItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  debtItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  debtItemInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  historyMethod: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  debtSummaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FinanceScreen;