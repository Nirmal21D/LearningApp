import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import ChatComponent from '@/components/ChatComponent';
import StudentChat from './student-chat';
import TeacherChatsScreen from './teacher-chat';

export default function PrivateChat() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', auth.currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          setError('User profile not found');
          setLoading(false);
          return;
        }

        const userData = userSnapshot.docs[0].data();
        
        // Basic validation
        if (!userData.userType || !['student', 'teacher'].includes(userData.userType)) {
          setError('Invalid user profile');
          setLoading(false);
          return;
        }

        setUserType(userData.userType);
        setLoading(false);
      } catch (error) {
        console.error('Error checking user access:', error);
        setError('Failed to verify user access. Please try again.');
        setTimeout(() => router.back(), 3000);
      }
    };

    checkUserAccess();
  }, []);

  // Render loading state with enhanced glass effect UI
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        <Animated.View entering={FadeIn.duration(800)} style={styles.backgroundElements}>
          <View style={[styles.blurCircle, styles.blurCircle1]} />
          <View style={[styles.blurCircle, styles.blurCircle2]} />
          <View style={[styles.blurCircle, styles.blurCircle3]} />
        </Animated.View>
        
        <SafeAreaView style={styles.safeArea}>
          <Animated.View 
            entering={FadeInDown.duration(800).springify()} 
            style={styles.loaderContainer}
          >
            <BlurView intensity={80} tint="light" style={styles.glassCard}>
              <View style={styles.loaderContent}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading chat...</Text>
              </View>
            </BlurView>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Render error state with enhanced glass effect UI
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        <Animated.View entering={FadeIn.duration(800)} style={styles.backgroundElements}>
          <View style={[styles.blurCircle, styles.blurCircle1]} />
          <View style={[styles.blurCircle, styles.blurCircle2]} />
          <View style={[styles.blurCircle, styles.blurCircle3]} />
        </Animated.View>
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBarContainer}>
            <BlurView intensity={80} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
          </View>
          
          <Animated.View 
            entering={FadeInDown.duration(800).springify()} 
            style={styles.contentWrapper}
          >
            <BlurView intensity={80} tint="light" style={styles.glassErrorCard}>
              <Ionicons name="alert-circle" size={40} color="#FF4081" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => router.back()}
              >
                <Text style={styles.retryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Main layout for both chat and list views
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View entering={FadeIn.duration(800)} style={styles.backgroundElements}>
        <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
      </Animated.View>
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header with glass effect */}
        <Animated.View 
          entering={FadeInDown.duration(600).springify()} 
          style={styles.headerWrapper}
        >
          <BlurView intensity={70} tint="light" style={styles.glassHeader}>
            <View style={styles.headerContentWrapper}>
              <View style={styles.headerLeft}>
                <TouchableOpacity 
                  style={styles.backButtonInner}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={22} color="#1A237E"/>
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>
                  {params.chatId 
                    ? (params.teacherName || 'Chat') 
                    : (userType === 'teacher' ? 'Teacher Chat' : 'Student Chat')
                  }
                </Text>
                <Text style={styles.headerSubtitle}>
                  {params.chatId 
                    ? (params.teacherSubject || 'Private conversation') 
                    : (userType === 'teacher' 
                        ? 'Manage your student conversations' 
                        : 'Connect with your teachers')
                  }
                </Text>
              </View>
              
              <View style={styles.headerRight}>
                {/* Optional right-side header elements */}
              </View>
            </View>
          </BlurView>
        </Animated.View>
        
        {/* Main content with glass effect */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(800).springify()} 
          style={styles.contentWrapper}
        >
          <BlurView intensity={50} tint="light" style={styles.glassContentCard}>
            {params.chatId ? (
              // Show chat component if chatId is provided
              <ChatComponent
                chatId={params.chatId}
                teacherName={params.teacherName}
                teacherSubject={params.teacherSubject}
                isTeacher={userType === 'teacher'}
              />
            ) : (
              // Otherwise show appropriate list based on user type
              userType === 'teacher' ? (
  <View style={styles.transparentContainer}>
    <TeacherChatsScreen />
  </View>
) : <StudentChat />
            )}
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentWrapper: {
    flex: 1,
    marginTop: 10,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  headerWrapper: {
    marginTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight + 10,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  glassHeader: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    // elevation: 3,
  },
  headerContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#555',
    opacity: 0.8,
  },
  glassContentCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // elevation: 5,
  },
  glassCard: {
    padding: 25,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // elevation: 5,
    width: 280,
    height: 150,
  },
  glassErrorCard: {
    padding: 30,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // elevation: 5,
    width: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loaderContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FF4081',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // elevation: 3,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 0,
    left: 16,
    zIndex: 10,
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // elevation: 3,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 20 : 5,
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
    top: Platform.OS === 'web' ? 390 : 320,
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
    bottom: Platform.OS === 'web' ? 30 : 40,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});