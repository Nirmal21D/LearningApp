import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import TextExtractor from '@/components/TextExtractor';
import ChatBot from '@/components/Chatbot';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const courseFilters = [
  { id: 1, name: 'Live Courses', icon: 'videocam-outline' },
  { id: 2, name: 'Test Series', icon: 'clipboard-outline' },
  { id: 3, name: 'Recorded Courses', icon: 'play-circle-outline' },
  { id: 4, name: 'All Courses', icon: 'grid-outline' },
];

const reviews = [
  {
    id: 1,
    name: 'Rahul Patel',
    content: 'This app has helped me improve my understanding of complex topics.',
    rating: 5,
    subject: 'Mathematics',
  },
  {
    id: 2,
    name: 'Priya Shah',
    content: 'The live courses are excellent and teachers are very supportive.',
    rating: 4,
    subject: 'Science',
  },
  {
    id: 3,
    name: 'Amit Kumar',
    content: 'Great learning experience with interactive content.',
    rating: 5,
    subject: 'English',
  },
];

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const db = getFirestore();
        const subjectsCollection = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsCollection);
        const subjectsList = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsList);
        
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const auth = getAuth();
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
        console.log(data)
        setUserInfo(data);

        // Redirect teacher to teacher dashboard
        if (data.userType === 'teacher') {
          router.replace('/teacher/dashboard');
          return;
        }
      } else {
        setUserInfo(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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

      {/* Navigation Bar */}
      <View style={styles.navbar}>
        {/* <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color="#333" />
        </TouchableOpacity> */}
        <Text style={styles.className}>Std 10</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <View style={styles.notificationBadge} />
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Welcome Section */}
        <View style={[styles.welcomeSection, { borderRadius: 0 }]}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.username}>{userInfo ? userInfo.username : 'Loading...'}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userInfo ? userInfo.coursesCount : '0'}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userInfo ? userInfo.progress : '0%'} </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          </View>
        </View>

        {/* Subjects Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.subjectsGrid}>
            {subjects.map((subject) => (
              <TouchableOpacity 
                key={subject.id}
                style={styles.subjectCard}
                onPress={() => {
                  router.push({
                    pathname: `/subject/${subject.id}`,
                    params: { 
                      subjectName: subject.name,
                      subjectId: subject.id
                    }
                  });
                }}
              >
                <View style={[styles.subjectIconContainer, { backgroundColor: subject.color }]}>
                  <Ionicons name={subject.icon} size={32} color="white" />
                </View>
                <Text style={styles.subjectName}>{subject.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Course Categories */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterGrid}>
            {courseFilters.map((filter) => (
              <TouchableOpacity 
                key={filter.id}
                style={styles.filterCard}
              >
                <View style={styles.filterIconContainer}>
                  <Ionicons name={filter.icon} size={28} color="#2196F3" />
                </View>
                <Text style={styles.filterName}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.textExtractorContainer}>
          <TextExtractor />
        </View>

        {/* Reviews Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Student Reviews</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>All Reviews</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.reviewsContainer}
          >
            {/* Assuming reviews are fetched from another source or hardcoded */}
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName}>{review.name}</Text>
                      <Text style={styles.reviewSubject}>{review.subject}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons 
                      key={i}
                      name={i < review.rating ? "star" : "star-outline"}
                      size={16}
                      color={i < review.rating ? "#FFD700" : "#666"}
                    />
                  ))}
                </View>
                <Text style={styles.reviewContent}>{review.content}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Footer */}
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
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
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Platform.OS === 'web' ? 15 : 8,
    gap: Platform.OS === 'web' ? 15 : 8,
    marginTop: Platform.OS === 'web' ? 0 : 5,
  },
  subjectCard: {
    width: (width - (Platform.OS === 'web' ? 50 : 30)) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    padding: Platform.OS === 'web' ? 15 : 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  subjectIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  filterGrid: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 15,
    gap: Platform.OS === 'web' ? 15 : 10,
  },
  filterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    padding: Platform.OS === 'web' ? 15 : 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
  reviewsContainer: {
    paddingHorizontal: 20,
  },
  reviewCard: {
    width: Platform.OS === 'web' ? 300 : width - 40,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    padding: Platform.OS === 'web' ? 20 : 15,
    borderRadius: 16,
    marginRight: Platform.OS === 'web' ? 15 : 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewerInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewSubject: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 5,
  },
  reviewContent: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: Platform.OS === 'web' ? 20 : 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 0 : 80,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 20,
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
    backgroundColor: 'rgba(33, 150, 243, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
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
    elevation: 10,
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
    padding: 12,
    borderRadius: 999,
    marginBottom: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 20 : 15,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
});