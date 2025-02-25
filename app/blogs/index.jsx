import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  Dimensions,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Sample blog data
const BLOG_DATA = [
  {
    id: '1',
    title: 'How to Master Physics Problem Solving',
    excerpt: 'Learn effective strategies to tackle complex physics problems with confidence.',
    author: 'Dr. Sarah Chen',
    date: 'Feb 20, 2025',
    readTime: '6 min read',
    category: 'Physics',
    image: null, // Will use placeholder
    featured: true,
  },
  {
    id: '2',
    title: 'Memory Techniques for Chemistry Formulas',
    excerpt: 'Discover mnemonic devices and visualization techniques to remember complex chemical formulas.',
    author: 'Prof. Michael Rodriguez',
    date: 'Feb 15, 2025',
    readTime: '4 min read',
    category: 'Chemistry',
    image: null,
    featured: false,
  },
  {
    id: '3',
    title: 'The Ultimate Guide to Math Exam Preparation',
    excerpt: 'Follow these proven strategies to prepare effectively for your upcoming mathematics exams.',
    author: 'Emma Johnson',
    date: 'Feb 10, 2025',
    readTime: '8 min read',
    category: 'Mathematics',
    image: null,
    featured: false,
  },
  {
    id: '4',
    title: 'The Science of Effective Studying',
    excerpt: 'Research-backed methods to optimize your study sessions and retain information longer.',
    author: 'Dr. James Wilson',
    date: 'Feb 5, 2025',
    readTime: '5 min read',
    category: 'Study Skills',
    image: null,
    featured: false,
  },
  {
    id: '5',
    title: 'Understanding Biology Through Everyday Examples',
    excerpt: 'Connect complex biological concepts to familiar everyday phenomena for better comprehension.',
    author: 'Dr. Lisa Patel',
    date: 'Jan 30, 2025',
    readTime: '7 min read',
    category: 'Biology',
    image: null,
    featured: true,
  }
];

// Categories for filter
const CATEGORIES = [
  'All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Study Skills'
];

export default function Blogs() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredBlogs, setFilteredBlogs] = useState(BLOG_DATA);
  
  // Filter blogs when category changes
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredBlogs(BLOG_DATA);
    } else {
      setFilteredBlogs(BLOG_DATA.filter(blog => blog.category === selectedCategory));
    }
  }, [selectedCategory]);

  // Get featured blogs
  const featuredBlogs = BLOG_DATA.filter(blog => blog.featured);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Background decoration */}
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Educational Blogs</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Featured Blogs Section */}
        {featuredBlogs.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Featured Articles</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScrollContainer}
            >
              {featuredBlogs.map(blog => (
                <TouchableOpacity 
                  key={blog.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/blogDetail/${blog.id}`)}
                >
                  <View style={styles.featuredImageContainer}>
                    <View style={styles.featuredImage} />
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{blog.category}</Text>
                    </View>
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle}>{blog.title}</Text>
                    <Text style={styles.featuredExcerpt} numberOfLines={2}>
                      {blog.excerpt}
                    </Text>
                    <View style={styles.featuredMeta}>
                      <Text style={styles.featuredAuthor}>{blog.author}</Text>
                      <Text style={styles.featuredReadTime}>{blog.readTime}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Filter */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContainer}
          >
            {CATEGORIES.map(category => (
              <TouchableOpacity 
                key={category}
                style={[
                  styles.categoryPill,
                  selectedCategory === category && styles.selectedCategoryPill
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text 
                  style={[
                    styles.categoryPillText,
                    selectedCategory === category && styles.selectedCategoryPillText
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Blogs List */}
        <View style={styles.allBlogsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Articles</Text>
            <TouchableOpacity>
              <Text style={styles.sortButton}>Sort by: Latest</Text>
            </TouchableOpacity>
          </View>

          {filteredBlogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#BBDEFB" />
              <Text style={styles.emptyStateText}>No articles found in this category</Text>
            </View>
          ) : (
            filteredBlogs.map(blog => (
              <TouchableOpacity 
                key={blog.id}
                style={styles.blogCard}
                onPress={() => router.push(`/blogDetail/${blog.id}`)}
              >
                <View style={styles.blogImageContainer}>
                  <View style={styles.blogImage} />
                </View>
                <View style={styles.blogContent}>
                  <View style={styles.blogCategoryContainer}>
                    <Text style={styles.blogCategory}>{blog.category}</Text>
                  </View>
                  <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                  <Text style={styles.blogExcerpt} numberOfLines={2}>{blog.excerpt}</Text>
                  <View style={styles.blogMeta}>
                    <Text style={styles.blogDate}>{blog.date}</Text>
                    <Text style={styles.blogDot}>•</Text>
                    <Text style={styles.blogReadTime}>{blog.readTime}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/chats')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#666" />
          <Text style={styles.navText}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/tools')}
        >
          <Ionicons name="build-outline" size={24} color="#666" />
          <Text style={styles.navText}>Tools</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, styles.activeNavItem]}
          onPress={() => router.push('/home')}
        >
          <View style={styles.homeIconContainer}>
            <Ionicons name="home" size={24} color="#2196F3" />
          </View>
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/blogs')}
        >
          <Ionicons name="newspaper" size={24} color="#666" />
          <Text style={styles.navText}>Blogs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A237E',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'web' ? 90 : 120,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 20 : 10,
    left: Platform.OS === 'web' ? -80 : -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: Platform.OS === 'web' ? 220 : 180,
    height: Platform.OS === 'web' ? 220 : 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 240 : 180,
    right: Platform.OS === 'web' ? -40 : -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: Platform.OS === 'web' ? 200 : 160,
    height: Platform.OS === 'web' ? 200 : 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: Platform.OS === 'web' ? 30 : 80,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
  featuredSection: {
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 15,
  },
  featuredScrollContainer: {
    paddingBottom: 15,
    paddingRight: 20,
  },
  featuredCard: {
    width: width * 0.75,
    marginRight: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // elevation: 3,
  },
  featuredImageContainer: {
    position: 'relative',
    height: 160,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#BBDEFB',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredContent: {
    padding: 15,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featuredExcerpt: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredAuthor: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '500',
  },
  featuredReadTime: {
    fontSize: 12,
    color: '#666',
  },
  categoriesContainer: {
    marginVertical: 15,
    
  },
  categoriesScrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  categoryPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, x)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  selectedCategoryPill: {
    backgroundColor: '#2196F3',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryPillText: {
    color: 'white',
  },
  allBlogsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortButton: {
    fontSize: 14,
    color: '#2196F3',
  },
  blogCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    gap: 1,
    marginBottom: 5,
    // elevation: 2,
  },
  blogImageContainer: {
    width: 100,
    height: 100,
  },
  blogImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#BBDEFB',
  },
  blogContent: {
    flex: 1,
    padding: 12,
  },
  blogCategoryContainer: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  blogCategory: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '500',
  },
  blogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  blogExcerpt: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  blogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blogDate: {
    fontSize: 11,
    color: '#888',
  },
  blogDot: {
    fontSize: 11,
    color: '#888',
    marginHorizontal: 5,
  },
  blogReadTime: {
    fontSize: 11,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // elevation: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 80 : 70,
    zIndex: 998,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 60,
  },
  activeNavItem: {
    transform: [{ translateY: -5 }],
  },
  homeIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 1,
    borderRadius: 999,
    marginBottom: 2,
    transform: [{ scale: 1.5 }],
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeNavText: {
    color: '#2196F3',
    fontWeight: '600',
  }
});