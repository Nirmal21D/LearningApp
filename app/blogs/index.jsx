import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { onSnapshot, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Feather, AntDesign, Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';

import { db } from "../../lib/firebase";

const Blogs = () => {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // Sample categories - replace with your actual categories
  const categories = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'ComputerScience', 'Other'];

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Posts</Text>
        <Text style={styles.headerSubtitle}>Discover and share ideas with others</Text>
      </View>

      {/* Create Button */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => router.push('/create-blog')}
      >
        <Feather name="plus-circle" size={18} color="white" />
        <Text style={styles.createButtonText}>Create New Post</Text>
      </TouchableOpacity>

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
              selectedCategory === category ? styles.categoryButtonActive : styles.categoryButtonInactive
            ]}
          >
            <Text 
              style={[
                styles.categoryText,
                selectedCategory === category ? styles.categoryTextActive : styles.categoryTextInactive
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Blog List */}
      {filteredBlogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={60} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No posts found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedCategory !== 'All' 
              ? `There are no posts in the ${selectedCategory} category yet.` 
              : 'Be the first to create a post!'}
          </Text>
        </View>
      ) : (
        filteredBlogs.map(blog => (
          <TouchableOpacity 
            key={blog.id} 
            style={styles.blogCard}
            onPress={() => router.push(`/blogs/content/${blog.id}`)}
          >
            {/* Post Header */}
            <View style={styles.blogHeader}>
              {blog.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{blog.category}</Text>
                </View>
              )}
              <Text style={styles.blogTitle}>{blog.title}</Text>
              
              {/* Author Info */}
              <View style={styles.authorContainer}>
                <Image 
                  source={{ uri: blog.authorPhotoURL || 'https://via.placeholder.com/40' }} 
                  style={styles.authorAvatar}
                />
                <Text style={styles.authorName}>{blog.authorName || 'Anonymous'}</Text>
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
                    color={blog.userVotes?.[user?.uid] === 1 ? '#3b82f6' : '#9ca3af'} 
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
                    color={blog.userVotes?.[user?.uid] === -1 ? '#3b82f6' : '#9ca3af'} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Comments Section */}
              <View style={styles.commentsContainer}>
                <Ionicons name="chatbubble-outline" size={16} color="#9ca3af" />
                <Text style={styles.commentsCount}>{blog.commentsCount || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
      
      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    color: '#4b5563',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  createButtonText: {
    color: 'white',
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
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: '#2563eb',
  },
  categoryButtonInactive: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  categoryText: {
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
  },
  categoryTextInactive: {
    color: '#4b5563',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#6b7280',
    marginTop: 16,
    fontSize: 18,
  },
  emptySubtitle: {
    color: '#9ca3af',
    textAlign: 'center',
    marginHorizontal: 40,
    marginTop: 8,
  },
  blogCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  blogHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryBadgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '500',
  },
  blogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
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
    color: '#4b5563',
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
    color: '#4b5563',
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
    borderTopColor: '#f3f4f6',
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
    color: '#4b5563',
  },
  commentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsCount: {
    color: '#6b7280',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 80,
  },
});

export default Blogs;
