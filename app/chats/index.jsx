import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import ChatBot from '@/components/Chatbot';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import { auth, db } from '@/lib/firebase';
import TeamsFeature from '@/components/TeamsFeature';
import SessionNotification from '@/components/SessionNotification';
import { getUserProgress } from '@/app/api/progress';

const { width } = Dimensions.get('window');

export default function Chats() {
  const router = useRouter();
  const user = auth.currentUser;
  const [userInfo, setUserInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [careerGuiders, setCareerGuiders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setIsLoggedIn(!!user);
      if (user) {
        const db = getFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error("User data not found");
        }

        const data = userDocSnap.data();
        setUserInfo(data);

        if (data.userType === 'teacher') {
          router.replace('/teacher/dashboard');
          return;
        }
      } else {
        setUserInfo(null);
        setProgressData(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    const fetchCareerGuiders = async () => {
      try {
        const guidersQuery = query(
          collection(db, 'users'),
          where('userType', '==', 'careerGuider')
        );
        
        const guidersSnapshot = await getDocs(guidersQuery);
        const guidersData = guidersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Found career guiders:', guidersData.length);
        setCareerGuiders(guidersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching career guiders:', error);
        setLoading(false);
      }
    };

    if (user) {
      fetchCareerGuiders();
    }
  }, [user]);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleCareerChatPress = (guider) => {
    if (!user || !userInfo) return;

    router.push({
      pathname: '/chat/career-chat',
      params: {
        guiderId: guider.id,
        guiderName: guider.username || 'Career Guider',
        studentId: user.uid,
        studentName: userInfo.username || 'Student',
        isGuider: false
      }
    });
  };

  if (isLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.circleBackground}>
        <View style={styles.circle} />
      </View>

      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <View style={styles.navbar}>
        <Text style={styles.className}>Std 10</Text>
        <View style={styles.navRight}>
        <TouchableOpacity style={styles.notificationButton}>
          <View style={styles.notificationBadge} />
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF4444" />
          </TouchableOpacity>
      </View>
      </View>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={[styles.welcomeSection, { borderRadius: 0 }]}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.username}>{userInfo ? userInfo.username : 'Loading...'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teams & Communication</Text>
          <TeamsFeature />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Career Guidance</Text>
            <Text style={styles.sectionSubtitle}>
              Chat with career experts for professional guidance
            </Text>
          </View>

          {careerGuiders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#B0BEC5" />
              <Text style={styles.emptyStateText}>
                No career guiders available at the moment
              </Text>
            </View>
          ) : (
            careerGuiders.map((guider) => (
              <TouchableOpacity
                key={guider.id}
                style={styles.careerGuiderCard}
                onPress={() => handleCareerChatPress(guider)}
              >
                <View style={styles.guiderAvatar}>
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                </View>
                
                <View style={styles.guiderInfo}>
                  <Text style={styles.guiderName}>
                    {guider.username || 'Career Guider'}
                  </Text>
                  <Text style={styles.guiderRole}>Career Guider</Text>
                  <Text style={styles.guiderEmail}>
                    {guider.email}
                  </Text>
                </View>

                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color="#B0BEC5" 
                  style={styles.arrow}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            {['logo-facebook', 'logo-twitter', 'logo-instagram', 'logo-youtube'].map((icon) => (
              <TouchableOpacity 
                key={icon}
                style={styles.socialButton}
              >
                <Ionicons name={icon} size={24} color="#2196F3" />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.chatBotWrapper}>
        <ChatBot />
      </View>

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
          <Ionicons name="newspaper-outline" size={24} color="#666" />
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
    overflow: 'hidden',
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
  className: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    color: '#1A237E',
    left: Platform.OS === 'web' ? 160 : 140,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    zIndex: 1,
  },
  welcomeSection: {
    padding: Platform.OS === 'web' ? 20 : 15,
    backgroundColor: '#2196F3',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.65)',
  },
  welcomeText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  username: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A237E',
    letterSpacing: -0.5,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 20 : 15,
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'web' ? 20 : 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 5,
    padding: 10,
    borderRadius: 16,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 42,
    marginBottom: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  contactButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    // backgroundColor: '#E3F2FD',
    padding: 1,
    borderRadius: 999,
    marginTop: 6,
    transform: [{ scale: 1.45 }],
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  activeNavText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  chatBotWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 90 : 85,
    right: Platform.OS === 'web' ? 0 : 8,
    zIndex: 999,
    transform: Platform.OS === 'web' ? [] : [{ scale: 0.9 }],
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
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 20 : 15,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  careerGuiderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guiderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guiderInfo: {
    flex: 1,
  },
  guiderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  guiderRole: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 2,
  },
  guiderEmail: {
    fontSize: 12,
    color: '#666',
  },
  arrow: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 16,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
});


