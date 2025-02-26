import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import TextExtractor from '@/components/TextExtractor';
import ChatBot from '@/components/Chatbot';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import LearningStyleAssessment from '@/components/LearningStyleAssessment';
import { auth } from '@/lib/firebase';
const { width } = Dimensions.get('window');


export default function Home() {
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  if (isLoading) {
  return (
    <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
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
        {/* <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color="#333" />
        </TouchableOpacity> */}
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
        {/* Welcome Section */}
        <View style={[styles.welcomeSection, { borderRadius: 0 }]}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.username}>{userInfo ? userInfo.username : 'Loading...'}</Text>
        </View>


        {/* Course Categories */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Other tools</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterGrid}>
              <TouchableOpacity 
               
                style={styles.filterCard}
                onPress={() => {
                  router.push({
                    pathname: '/labs'
                  });
                }}
              >
                <View style={styles.filterIconContainer}>
                 
                </View>
                <Text style={styles.filterName}>Labs</Text>
              </TouchableOpacity>
             
              <TouchableOpacity 
               
                style={styles.filterCard}
                onPress={() => {
                  router.push({
                    pathname: '/pomodoro'
                  });
                }}
              >
                <View style={styles.filterIconContainer}>
                 
        </View>
                <Text style={styles.filterName}>Pomodoro</Text>
              </TouchableOpacity>


              <TouchableOpacity 
               
                style={styles.filterCard}
                onPress={() => {
                  router.push({
                    pathname: '/career'
                  });
                }}
              >
                <View style={styles.filterIconContainer}>
                 
        </View>
                <Text style={styles.filterName}>Career</Text>
              </TouchableOpacity>
           
          </View>
        </View>
        <View style={styles.textExtractorContainer}>
          <TextExtractor />
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

      {/* Place ChatBot before bottom nav but with adjusted style */}
      <View style={styles.chatBotWrapper}>
        <ChatBot />
      </View>

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
    sectionContainer: {
      marginVertical: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1A237E',
      letterSpacing: -0.5,
    },
    seeAllButton: {
      color: '#2196F3',
      fontSize: 14,
      fontWeight: '600',
    },
    filterGrid: {
      paddingHorizontal: Platform.OS === 'web' ? 20 : 15,
      gap: Platform.OS === 'web' ? 15 : 10,
    },
    filterCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
      padding: Platform.OS === 'web' ? 15 : 12,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 10 : 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      // elevation: 3,
    },
    filterIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(245, 245, 245, 0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 15,
    },
    filterName: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
    },
   footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    // elevation: 3,
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
      backgroundColor: 'rgba(245, 245, 245, 0.10)',
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
      transform: [{ scale: 1.45 }],
    },
    navText: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
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
      top: Platform.OS === 'web' ? 340 : 30,
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
    textExtractorContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
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
      // elevation: 3,
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
    loadingText: {
      fontSize: 18,
      color: '#2196F3',
      textAlign: 'center',
      marginTop: 50,
    },
  });


