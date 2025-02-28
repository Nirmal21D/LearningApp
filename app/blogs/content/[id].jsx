import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import Comments from '../../../components/Comment';
import { db } from '../../../lib/firebase';

const colors = {
  primary: '#2196F3',
  background: '#f8f9fa',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  categoryColors: {
    Physics: '#ff6b6b',
    Chemistry: '#4ecdc4',
    Mathematics: '#45b7d1',
    Biology: '#96ceb4',
    'Study Skills': '#ff9f43',
  }
};
const BlogDetail = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const blogRef = doc(db, 'blogs', id);
    const unsubscribe = onSnapshot(blogRef, (doc) => {
      if (doc.exists()) {
        setBlog({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      } else {
        setBlog(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleVote = async (vote) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const blogRef = doc(db, 'blogs', id);
    const currentVote = blog?.userVotes?.[user.uid] || 0;

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Blog post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Blog Content */}
      <View style={styles.contentContainer}>
        {/* Category Tag */}
        <View style={[styles.categoryTag, { backgroundColor: colors.categoryColors[blog.category] }]}>
          <Text style={styles.categoryText}>{blog.category}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{blog.title}</Text>

        {/* Author Info */}
        <View style={styles.authorContainer}>
          <Image 
            source={{ uri: blog.authorImage || 'https://via.placeholder.com/40' }} 
            style={styles.avatar} 
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{blog.author}</Text>
            <Text style={styles.postDate}>
              {blog.createdAt?.toLocaleDateString()} • {blog.readTime}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.contentText}>{blog.content}</Text>

        {/* Voting Section */}
        <View style={styles.votingContainer}>
          <TouchableOpacity 
            style={styles.voteButton}
            onPress={() => handleVote(1)}
          >
            <Ionicons 
              name="chevron-up" 
              size={28} 
              color={blog.userVotes?.[user?.uid] === 1 ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          
          <Text style={styles.voteCount}>
            {blog.upvotes - blog.downvotes}
          </Text>

          <TouchableOpacity 
            style={styles.voteButton}
            onPress={() => handleVote(-1)}
          >
            <Ionicons 
              name="chevron-down" 
              size={28} 
              color={blog.userVotes?.[user?.uid] === -1 ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Section */}
      <Comments blogId={id} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 20,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
    lineHeight: 34,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  postDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: 32,
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  voteButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  voteCount: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    color: colors.textPrimary,
  },
});

export default BlogDetail;