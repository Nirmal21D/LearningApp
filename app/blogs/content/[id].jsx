import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Comments from '@/components/Comment';
import { db } from '@/lib/firebase';
import LoadingScreen from '../../../components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
      <LoadingScreen/>
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
        {/* Back Button with glass effect */}
        <View style={styles.topBarContainer}>
          <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333"/>
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Fixed outer container */}
        <View style={styles.fixedContainer}>
          <Animated.View 
            entering={FadeInDown.duration(1000).springify()} 
            style={styles.contentWrapper}
          >
            {/* Scrollable content inside fixed container */}
            <ScrollView 
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Blog Content */}
              <View style={styles.contentContainer}>
                {/* Category Tag */}
                <View style={[styles.categoryTag, { backgroundColor: colors.categoryColors[blog.category] || '#2196F3' }]}>
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
                    style={[styles.voteButton, styles.glassEffect]}
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
                    style={[styles.voteButton, styles.glassEffect]}
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
              <View style={styles.commentsWrapper}>
                <Comments blogId={id} />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
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
  topBarContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    // elevation: 3 for Android
  },
  fixedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 80, // Space for back button
  },
  contentWrapper: {
    flex: 1,
    width: '100%', // Increased width of the outside container
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden', // Ensures content doesn't overflow the rounded corners
  },
  scrollViewContent: {
    padding: 20,
  },
  contentContainer: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 24,
    lineHeight: 34,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
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
    marginVertical: 16,
  },
  voteButton: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  voteCount: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    color: colors.textPrimary,
  },
  commentsWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  // Decorative blur circles
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

export default BlogDetail;