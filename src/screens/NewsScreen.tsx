import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { newsService, NewsItem, NewsCategory } from '../services/newsService';

const NewsScreen = () => {
  const navigation = useNavigation();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterNews();
  }, [newsList, selectedCategory, searchKeyword]);

  const loadData = async () => {
    try {
      console.log('[NewsScreen] 🔄 Loading news data...');
      setIsLoading(true);
      const [news, cats] = await Promise.all([
        newsService.getNewsList(),
        newsService.getNewsCategories(),
      ]);
      console.log('[NewsScreen] ✅ News loaded:', news.length);
      console.log('[NewsScreen] ✅ Categories loaded:', cats.length);
      setNewsList(news);
      setCategories(cats);
    } catch (error) {
      console.error('[NewsScreen] ❌ Error loading news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const filterNews = () => {
    let filtered = [...newsList];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        item => item.DAOTAO_COCAUTOCHUC_ID === selectedCategory
      );
    }

    // Filter by keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.TIEUDE.toLowerCase().includes(keyword) ||
          item.NOIDUNG.toLowerCase().includes(keyword) ||
          item.DAOTAO_COCAUTOCHUC_TEN.toLowerCase().includes(keyword)
      );
    }

    setFilteredNews(filtered);
  };

  const handleNewsPress = async (news: NewsItem) => {
    console.log('[NewsScreen] 📰 Opening news:', news.TIEUDE);
    console.log('[NewsScreen] 📰 News ID:', news.ID);
    
    setSelectedNews(news);
    setShowDetail(true);
    
    // Thêm lượt xem
    console.log('[NewsScreen] 👁️ Adding view...');
    newsService.addNewsView(news.ID).catch((err) => {
      console.warn('[NewsScreen] ⚠️ Failed to add view:', err);
    });
    
    // Load bình luận
    console.log('[NewsScreen] 💬 Loading comments...');
    setLoadingComments(true);
    try {
      const newsComments = await newsService.getNewsComments(news.ID);
      console.log('[NewsScreen] ✅ Comments loaded:', newsComments.length);
      setComments(newsComments);
    } catch (error) {
      console.error('[NewsScreen] ❌ Error loading comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const renderNewsCard = (news: NewsItem) => {
    const imageUrl = newsService.getImageUrl(news.DUONGDANANHHIENTHI);
    const isFeatured = news.TIEUDIEM === 1;

    return (
      <TouchableOpacity
        key={news.ID}
        style={[styles.newsCard, isFeatured && styles.featuredCard]}
        onPress={() => handleNewsPress(news)}
        activeOpacity={0.7}
      >
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.newsImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.newsContent}>
          {isFeatured && (
            <View style={styles.featuredBadge}>
              <MaterialIcons name="star" size={14} color="#FFFFFF" />
              <Text style={styles.featuredBadgeText}>Tiêu điểm</Text>
            </View>
          )}
          
          <Text style={styles.newsTitle} numberOfLines={2}>
            {news.TIEUDE}
          </Text>
          
          <View style={styles.newsMetaContainer}>
            <View style={styles.newsMeta}>
              <MaterialIcons name="business" size={14} color="#6B7280" />
              <Text style={styles.newsMetaText} numberOfLines={1}>
                {news.DAOTAO_COCAUTOCHUC_TEN}
              </Text>
            </View>
            
            <View style={styles.newsMeta}>
              <MaterialIcons name="schedule" size={14} color="#6B7280" />
              <Text style={styles.newsMetaText}>
                {newsService.getRelativeTime(news.NGAYTAO_DD_MM_YYYY)}
              </Text>
            </View>
          </View>
          
          <View style={styles.newsFooter}>
            <View style={styles.authorInfo}>
              <MaterialIcons name="person" size={14} color="#9CA3AF" />
              <Text style={styles.authorText} numberOfLines={1}>
                {news.NGUOITAO_TENDAYDU}
              </Text>
            </View>
            
            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    console.log('[NewsScreen] 🎨 Rendering detail modal');
    console.log('[NewsScreen] 📋 Selected news:', selectedNews?.TIEUDE);
    console.log('[NewsScreen] 👁️ Show detail:', showDetail);
    
    if (!selectedNews) {
      console.log('[NewsScreen] ⚠️ Not showing modal - selectedNews is null');
      return null;
    }

    const imageUrl = newsService.getImageUrl(selectedNews.DUONGDANANHHIENTHI);
    console.log('[NewsScreen] 🖼️ Image URL:', imageUrl);
    console.log('[NewsScreen] 💬 Comments count:', comments.length);
    console.log('[NewsScreen] ⏳ Loading comments:', loadingComments);

    return (
      <Modal
        visible={showDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetail(false);
          setComments([]);
        }}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity 
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowDetail(false);
              setComments([]);
            }}
          />
          
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHeaderTitle}>Chi tiết tin tức</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetail(false);
                  setComments([]);
                }}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailContent}>
              {imageUrl && (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              )}
              
              <View style={styles.detailBody}>
                <Text style={styles.detailTitle}>{selectedNews.TIEUDE}</Text>
                
                <View style={styles.detailMetaContainer}>
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="business" size={16} color="#6B7280" />
                    <Text style={styles.detailMetaText}>
                      {selectedNews.DAOTAO_COCAUTOCHUC_TEN}
                    </Text>
                  </View>
                  
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="person" size={16} color="#6B7280" />
                    <Text style={styles.detailMetaText}>
                      {selectedNews.NGUOITAO_TENDAYDU}
                    </Text>
                  </View>
                  
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="schedule" size={16} color="#6B7280" />
                    <Text style={styles.detailMetaText}>
                      {selectedNews.NGAYTAO_DD_MM_YYYY}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <Text style={styles.detailContentText}>
                  {newsService.stripHtmlAndDecode(selectedNews.NOIDUNG)}
                </Text>
                
                {/* Comments Section */}
                <View style={styles.commentsSection}>
                  <View style={styles.commentsSectionHeader}>
                    <MaterialIcons name="comment" size={20} color="#1F2937" />
                    <Text style={styles.commentsSectionTitle}>
                      Ý kiến cá nhân ({comments.length})
                    </Text>
                  </View>
                  
                  {loadingComments ? (
                    <View style={styles.commentsLoading}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.commentsLoadingText}>Đang tải bình luận...</Text>
                    </View>
                  ) : comments.length === 0 ? (
                    <View style={styles.noComments}>
                      <Text style={styles.noCommentsText}>Chưa có bình luận nào</Text>
                    </View>
                  ) : (
                    <View style={styles.commentsList}>
                      {comments.map((comment) => (
                        <View key={comment.ID} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <View style={styles.commentAvatar}>
                              <MaterialIcons name="person" size={16} color="#FFFFFF" />
                            </View>
                            <View style={styles.commentHeaderInfo}>
                              <Text style={styles.commentAuthor}>
                                {comment.NGUOIDUNG_TENDAYDU || 'Người dùng'}
                              </Text>
                              <Text style={styles.commentDate}>
                                {newsService.getRelativeTime(comment.NGAYTAO.substring(0, 8))}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.commentContent}>
                            {newsService.stripHtmlAndDecode(comment.NOIDUNG)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tin tức</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải tin tức...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Tin tức</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tin tức..."
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholderTextColor="#9CA3AF"
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')}>
            <MaterialIcons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === 'all' && styles.categoryChipTextActive,
            ]}
          >
            Tất cả ({newsList.length})
          </Text>
        </TouchableOpacity>
        
        {categories.map(cat => {
          const count = newsList.filter(
            item => item.DAOTAO_COCAUTOCHUC_ID === cat.ID
          ).length;
          
          return (
            <TouchableOpacity
              key={cat.ID}
              style={[
                styles.categoryChip,
                selectedCategory === cat.ID && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.ID)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.ID && styles.categoryChipTextActive,
                ]}
              >
                {cat.TEN} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* News List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
      >
        {filteredNews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="newspaper" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không có tin tức</Text>
            <Text style={styles.emptyText}>
              {searchKeyword
                ? 'Không tìm thấy tin tức phù hợp'
                : 'Chưa có tin tức nào được đăng'}
            </Text>
          </View>
        ) : (
          <View style={styles.newsListContainer}>
            {filteredNews.map(news => renderNewsCard(news))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {renderDetailModal()}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1F2937',
  },
  categoryContainer: {
    marginTop: 16,
    maxHeight: 50,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  newsListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredCard: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  newsImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
  },
  newsContent: {
    padding: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 22,
  },
  newsMetaContainer: {
    marginBottom: 12,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  newsMetaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
    flex: 1,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    height: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
  },
  detailBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 28,
  },
  detailMetaContainer: {
    marginBottom: 16,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailMetaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  detailContentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  commentsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  commentsLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  noComments: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentHeaderInfo: {
    marginLeft: 8,
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default NewsScreen;