import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { onSnapshot, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Feather, AntDesign, Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { db } from "../../lib/firebase";
import LoadingScreen from '../../components/LoadingScreen';

const Blogs = () => {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // Sample categories - replace with your actual categories
  const categories = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'ComputerScience', 'Other'];

  // Category color mapping
  const categoryColors = {
    'Physics': '#ff6b6b',
    'Chemistry': '#4ecdc4',
    'Mathematics': '#45b7d1',
    'Biology': '#96ceb4',
    'ComputerScience': '#8a70d6',
    'Other': '#ff9f43',
    'All': '#2196F3'
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'blogs'), (snapshot) => {
      const blogsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setBlogs(blogsData.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleVote = async (blogId, vote) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    const blogRef = doc(db, 'blogs', blogId);
    const currentVote = blogs.find(b => b.id === blogId)?.userVotes?.[user.uid] || 0;

    const updates = {
      upvotes: increment(vote === 1 ? (currentVote === 1 ? -1 : 1) : 0),
      downvotes: increment(vote === -1 ? (currentVote === -1 ? -1 : 1) : 0),
      [`userVotes.${user.uid}`]: currentVote === vote ? null : vote
    };

    try {
      await updateDoc(blogRef, updates);
    } catch (error) {
      console.error('Voting error:', error);
      alert('Failed to update vote. Please try again.');
    }
  };

  const filteredBlogs = selectedCategory === 'All' 
    ? blogs 
    : blogs.filter(blog => blog.category === selectedCategory);

  const formatDate = (date) => {
    if (!date) return '';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <LoadingScreen/>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          entering={FadeInDown.duration(800).springify()} 
          style={styles.headerContainer}
        >
          {/* Header */}
          <BlurView intensity={0} tint="light" style={[styles.glassEffect, styles.header]}>
            <Text style={styles.headerTitle}>Community Posts</Text>
            <Text style={styles.headerSubtitle}>Discover and share ideas with others</Text>
          </BlurView>

          {/* Create Button */}
          <BlurView intensity={0} tint="light" style={[styles.glassEffect, styles.createButtonContainer]}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/create-blog')}
            >
              <Feather name="plus-circle" size={18} color="white" />
              <Text style={styles.createButtonText}>Create New Post</Text>
            </TouchableOpacity>
          </BlurView>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === category 
                      ? categoryColors[category] || '#2196F3'
                      : 'rgba(255, 255, 255, 0.3)'
                  },
                  styles.glassEffect
                ]}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === category ? 'white' : '#1A237E' }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Blog List */}
        <ScrollView style={styles.blogListContainer}>
          {filteredBlogs.length === 0 ? (
            <Animated.View 
              entering={FadeInDown.duration(600).springify()}
              style={[styles.emptyContainer, styles.glassEffect]}
            >
              <Feather name="inbox" size={60} color="#1A237E" />
              <Text style={styles.emptyTitle}>No posts found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory !== 'All' 
                  ? `There are no posts in the ${selectedCategory} category yet.` 
                  : 'Be the first to create a post!'}
              </Text>
            </Animated.View>
          ) : (
            filteredBlogs.map((blog, index) => (
              <Animated.View
                key={blog.id}
                entering={FadeInDown.duration(600).delay(index * 100).springify()}
              >
                <TouchableOpacity 
                  style={[styles.blogCard, styles.glassEffect]}
                  onPress={() => router.push(`/blogs/content/${blog.id}`)}
                >
                  {/* Post Header */}
                  <View style={styles.blogHeader}>
                    {blog.category && (
                      <View style={[
                        styles.categoryBadge,
                        { backgroundColor: `${categoryColors[blog.category] || '#ffA500'}40` }
                      ]}>
                        <Text style={[
                          styles.categoryBadgeText,
                          { color: categoryColors[blog.category] || '#1A237E' }
                        ]}>
                          {blog.category}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.blogTitle}>{blog.title}</Text>
                    
                    {/* Author Info */}
                    <View style={styles.authorContainer}>
                      <Image 
                        source={{ uri: blog.authorPhotoURL || 'https://via.placeholder.com/40' }} 
                        style={styles.authorAvatar}
                      />
                      <Text style={styles.authorName}>{blog.author || 'Anonymous'}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={styles.dateText}>{formatDate(blog.createdAt)}</Text>
                    </View>
                  </View>
                  
                  {/* Post Content */}
                  <View style={styles.contentContainer}>
                    <Text style={styles.contentText} numberOfLines={2}>
                      {blog.content}
                    </Text>
                  </View>
                  
                  {/* Post Image (if available) */}
                  {blog.imageURL && (
                    <Image 
                      source={{ uri: blog.imageURL }} 
                      style={styles.blogImage}
                      resizeMode="cover"
                    />
                  )}
                  
                  {/* Post Footer */}
                  <View style={styles.blogFooter}>
                    {/* Voting Section */}
                    <View style={styles.votingContainer}>
                      <TouchableOpacity 
                        onPress={() => handleVote(blog.id, 1)}
                        style={styles.voteButton}
                      >
                        <AntDesign 
                          name="arrowup" 
                          size={16} 
                          color={blog.userVotes?.[user?.uid] === 1 ? '#2196F3' : '#666'} 
                        />
                      </TouchableOpacity>
                      <Text style={styles.voteCount}>{(blog.upvotes || 0) - (blog.downvotes || 0)}</Text>
                      <TouchableOpacity 
                        onPress={() => handleVote(blog.id, -1)}
                        style={styles.voteButton}
                      >
                        <AntDesign 
                          name="arrowdown" 
                          size={16} 
                          color={blog.userVotes?.[user?.uid] === -1 ? '#2196F3' : '#666'} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Comments Section */}
                    <View style={styles.commentsContainer}>
                      <Ionicons name="chatbubble-outline" size={16} color="#666" />
                      <Text style={styles.commentsCount}>{blog.commentsCount || 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
          
          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  createButtonContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  createButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    // elevation: 5,
  },
  createButtonText: {
    color: 'blue',
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    color: 'blue',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  categoryText: {
    fontWeight: '500',
    color: '#ffA500',
  },
  blogListContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  emptyTitle: {
    color: '#ffA500',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#ffA500',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 8,
  },
  blogCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  blogHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  authorName: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  dotSeparator: {
    marginHorizontal: 4,
    color: '#9ca3af',
  },
  dateText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  contentText: {
    color: '#666',
    marginTop: 4,
  },
  blogImage: {
    width: '100%',
    height: 192,
    marginTop: 8,
  },
  blogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  voteCount: {
    fontWeight: 'bold',
    color: '#1A237E',
  },
  commentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsCount: {
    color: '#666',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 80,
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: 10,
    left: -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: 320,
    right: -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: 60,
    left: -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});

export default Blogs;