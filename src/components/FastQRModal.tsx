import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FastQRModalProps {
  visible: boolean;
  onClose: () => void;
  qrUrl: string;
  paymentCode: string;
  amount: number;
  content: string;
}

const { width } = Dimensions.get('window');

const FastQRModal: React.FC<FastQRModalProps> = ({
  visible,
  onClose,
  qrUrl,
  paymentCode,
  amount,
  content,
}) => {
  const [showQR, setShowQR] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showBankList, setShowBankList] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (visible) {
      setShowQR(true); // Hiển thị QR luôn
      setImageLoaded(false);
      setImageError(false);
      setShowBankList(false);
    }
  }, [visible]);

  const handleShowQR = () => {
    // console.log('[FastQRModal] User requested to show QR');
    setShowQR(true);
  };

  const handleImageLoad = () => {
    // console.log('[FastQRModal] QR image loaded successfully');
    setImageLoaded(true);
  };

  const handleImageError = () => {
    // console.log('[FastQRModal] QR image failed to load');
    setImageError(true);
  };

  const handleOpenSpecificBank = async (bankScheme: string, bankName: string, fallbackUrl: string) => {
    try {
      // Thử các scheme khác nhau cho MB Bank
      let schemesToTry = [bankScheme];
      if (bankName === 'MB Bank') {
        schemesToTry = [
          'mbbank://',
          'mb-bank://',
          'mbbanking://',
          'com.mbbank.mb://',
          'mbbank-app://'
        ];
      }
      
      // Thử từng scheme cho đến khi tìm được cái hoạt động
      for (const scheme of schemesToTry) {
        const canOpen = await Linking.canOpenURL(scheme);
        // console.log(`[FastQRModal] Testing ${bankName} scheme: ${scheme} - Can open: ${canOpen}`);
        
        if (canOpen) {
          // console.log(`[FastQRModal] Opening ${bankName} app with scheme: ${scheme}`);
          await Linking.openURL(scheme);
          setShowBankList(false);
          return;
        }
      }
      
      // Nếu không scheme nào hoạt động
      // console.log(`[FastQRModal] ${bankName} not found with any scheme, opening store...`);
      await Linking.openURL(fallbackUrl);
    } catch (error) {
      console.error(`[FastQRModal] Error opening ${bankName}:`, error);
      alert(`Không thể mở app ${bankName}. Vui lòng kiểm tra app đã được cài đặt.`);
    }
  };

  const handleOpenBankApp = async () => {
    setShowBankList(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thanh toán</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Payment Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Mã thanh toán:</Text>
                <Text style={styles.value}>{paymentCode}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Số tiền:</Text>
                <Text style={styles.amount}>
                  {new Intl.NumberFormat('vi-VN').format(amount)} VNĐ
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Nội dung:</Text>
                <Text style={styles.content}>{content}</Text>
              </View>
            </View>

            {/* QR Section */}
            {!showQR ? (
              <View style={styles.qrPrompt}>
                <MaterialIcons name="qr-code" size={64} color="#3B82F6" />
                <Text style={styles.promptTitle}>Hiển thị mã QR thanh toán</Text>
                <Text style={styles.promptSubtitle}>
                  Ấn nút bên dưới để tải và hiển thị mã QR
                </Text>
                <TouchableOpacity style={styles.showQRButton} onPress={handleShowQR}>
                  <MaterialIcons name="qr-code-scanner" size={20} color="#FFFFFF" />
                  <Text style={styles.showQRButtonText}>Hiển thị QR Code</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qrContainer}>
                {!imageLoaded && !imageError && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Đang tải mã QR...</Text>
                  </View>
                )}
                
                {imageError && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>Không thể tải mã QR</Text>
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={() => {
                        setImageError(false);
                        setImageLoaded(false);
                      }}
                    >
                      <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {showQR && (
                  <Image
                    source={{ uri: qrUrl }}
                    style={[styles.qrImage, !imageLoaded && styles.hiddenImage]}
                    resizeMode="contain"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </View>
            )}

            {/* Quick Actions - Removed for now */}
            {/* <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleOpenBankApp}>
                <MaterialIcons name="account-balance" size={20} color="#10B981" />
                <Text style={styles.actionButtonText}>Mở app ngân hàng</Text>
              </TouchableOpacity>
            </View> */}
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  amount: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  content: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  qrPrompt: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  showQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  showQRButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  hiddenImage: {
    opacity: 0,
  },
  loadingContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
  },
  bankListContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  bankListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  bankItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  bankIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bankName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeFooterButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default FastQRModal;