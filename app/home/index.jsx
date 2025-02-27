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
import RecommendedVideos from '@/components/RecommendedVideos';


import { auth } from '@/lib/firebase';
import TeamsFeature from '@/components/TeamsFeature';
import SessionNotification from '@/components/SessionNotification';
import { getUserProgress } from '@/app/api/progress';
import TodoListComponent from '../../components/Todo';
import AudioQA from '../../components/AudioQA';
import SpeechToText from '../../components/SpeechToText';
const { width } = Dimensions.get('window');
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
  const [showTagForm, setShowTagForm] = useState();
  const [progressData, setProgressData] = useState(null);
  const [userfortodo, setUserfortodo] = useState();
  const calculateOverallProgress = (data) => {
    if (!data) return 0;
    
    // Use the same averageScore from the summary as used in the progress page
    return data.summary.averageScore || 0;
  };

  const fetchProgressData = async (userId) => {
    try {
      const progress = await getUserProgress(userId, '3m');
      setProgressData(progress);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

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
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setIsLoggedIn(!!user);
      if (user) {
        setUserfortodo(user);
        const db = getFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error("User data not found");
        }

        const data = userDocSnap.data();
        setUserInfo(data);

        await fetchProgressData(user.uid);

        if (data.userType === 'teacher') {
          router.replace('/teacher/dashboard');
          return;
        }
       else if (data.userType === 'careerGuider') {
        router.push('/career-guider/dashboard');
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

      {/* Navigation Bar */}
     { userInfo && (
        <LearningStyleAssessment
          userId={getAuth().currentUser.uid}
          onClose={() => setShowTagForm(false)}
        />
      )}
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
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{subjects.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[
                styles.statNumber,
                { color: getPerformanceColor(progressData ? calculateOverallProgress(progressData) : 0) }
              ]}>
                {progressData ? calculateOverallProgress(progressData) + '%' : '0%'}
              </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          </View>
        </View>

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
                    pathname: '/subject/' + subject.id,
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

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Videos</Text>
            <TouchableOpacity 
              onPress={() => router.push('/videos')}
            >
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          <RecommendedVideos />
        </View>

        {/* Course Categories */}
        {/* <View style={styles.sectionContainer}>
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
                    pathname: '/progress'
                  });
                }}
              >
                <View style={styles.filterIconContainer}>
                 
                </View>
                <Text style={styles.filterName}>Progress</Text>
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
           
          </View>
        </View>
        <View style={styles.textExtractorContainer}>
          <TextExtractor />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teams & Communication</Text>
          <TeamsFeature />
        </View> */}

            <TodoListComponent 
              storageKey="tenthGradeTasks"
              title="My Tasks" 
              user={userfortodo}
            />

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
        <ScrollView>
          {/* Learning Recommendations Section */}
          {progressData && (
            <View style={styles.recommendationsContainer}>
              <View style={styles.recommendationsHeader}>
                <Ionicons name="bulb" size={24} color="#FFD700" />
                <Text style={styles.recommendationsTitle}>Learning Recommendations</Text>
        </View>

              {/* Progress-based recommendations */}
              {calculateOverallProgress(progressData) < 70 && (
                <View style={[styles.recommendationItem, styles.warningItem]}>
                  <View style={styles.recommendationIcon}>
                    <Ionicons name="alert-circle" size={24} color="#FF9800" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>Focus Areas</Text>
                    <Text style={styles.recommendationText}>
                      Improve your performance in: {progressData.summary.weakAreas.join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Video completion recommendations */}
              {progressData.summary.videosWatched < progressData.summary.totalVideos && (
                <View style={[styles.recommendationItem, styles.infoItem]}>
                  <View style={styles.recommendationIcon}>
                    <Ionicons name="play-circle" size={24} color="#2196F3" />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>Complete Your Videos</Text>
                    <Text style={styles.recommendationText}>
                      {progressData.summary.totalVideos - progressData.summary.videosWatched} videos remaining to watch
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: progressData.summary.videosWatched / progressData.summary.totalVideos * 100 + '%',
                            backgroundColor: '#2196F3'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Learning speed adaptation */}
              <View style={[styles.recommendationItem, styles.successItem]}>
                <View style={styles.recommendationIcon}>
                  <Ionicons name="speedometer" size={24} color="#4CAF50" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Learning Pace</Text>
                  <Text style={styles.recommendationText}>
                    {progressData.summary.learningSpeed === 'Fast' ? 
                      'Great pace! Keep up the momentum' :
                      progressData.summary.learningSpeed === 'Slow' ? 
                      'Take your time to understand concepts thoroughly' :
                      'You\'re maintaining a steady learning rhythm'}
                  </Text>
                </View>
              </View>

              {/* Study streak suggestion */}
              <View style={[styles.recommendationItem, styles.primaryItem]}>
                <View style={styles.recommendationIcon}>
                  <Ionicons name="timer" size={24} color="#9C27B0" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Study Technique</Text>
                  <Text style={styles.recommendationText}>
                    Use the Pomodoro timer: 25 minutes of focused study followed by a 5-minute break
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Learning Guide Section */}
          <View style={styles.learningGuideContainer}>
            <View style={styles.learningGuideHeader}>
              <Ionicons name="book" size={24} color="#2196F3" />
              <Text style={styles.learningGuideTitle}>How to Learn Effectively</Text>
            </View>
            
            {/* Step 1 */}
            <View style={[styles.guideStep, styles.assessmentStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#FF9800' }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Start with Assessment</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="clipboard-outline" size={20} color="#FF9800" />
                  <Text style={styles.stepText}>Complete the learning style assessment</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="analytics-outline" size={20} color="#FF9800" />
                  <Text style={styles.stepText}>Identify your weak subjects</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="bar-chart-outline" size={20} color="#FF9800" />
                  <Text style={styles.stepText}>Review your current progress</Text>
                </View>
              </View>
            </View>

            {/* Step 2 */}
            <View style={[styles.guideStep, styles.planningStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Plan Your Study</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                  <Text style={styles.stepText}>Set daily learning goals</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="timer-outline" size={20} color="#4CAF50" />
                  <Text style={styles.stepText}>Use Pomodoro: 25 min study + 5 min break</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="library-outline" size={20} color="#4CAF50" />
                  <Text style={styles.stepText}>Choose 2-3 subjects per day</Text>
                </View>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.guideStep, styles.watchStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#2196F3' }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Watch & Learn</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="play-circle-outline" size={20} color="#2196F3" />
                  <Text style={styles.stepText}>Watch videos completely</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="create-outline" size={20} color="#2196F3" />
                  <Text style={styles.stepText}>Take notes with Text Extractor</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="flask-outline" size={20} color="#2196F3" />
                  <Text style={styles.stepText}>Practice in Labs section</Text>
                </View>
              </View>
            </View>

            {/* Step 4 */}
            <View style={[styles.guideStep, styles.testStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#9C27B0' }]}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepTitle}>Test Your Knowledge</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="checkbox-outline" size={20} color="#9C27B0" />
                  <Text style={styles.stepText}>Complete chapter tests</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="refresh-circle-outline" size={20} color="#9C27B0" />
                  <Text style={styles.stepText}>Review and retake tests</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="school-outline" size={20} color="#9C27B0" />
                  <Text style={styles.stepText}>Practice with Lab questions</Text>
                </View>
              </View>
            </View>

            {/* Step 5 */}
            <View style={[styles.guideStep, styles.helpStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#FF5722' }]}>
                  <Text style={styles.stepNumberText}>5</Text>
                </View>
                <Text style={styles.stepTitle}>Get Help When Needed</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="chatbubbles-outline" size={20} color="#FF5722" />
                  <Text style={styles.stepText}>Use ChatBot for quick help</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="people-outline" size={20} color="#FF5722" />
                  <Text style={styles.stepText}>Join subject Teams</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="person-outline" size={20} color="#FF5722" />
                  <Text style={styles.stepText}>Connect with teachers</Text>
                </View>
              </View>
            </View>

            {/* Step 6 */}
            <View style={[styles.guideStep, styles.trackStep]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#00BCD4' }]}>
                  <Text style={styles.stepNumberText}>6</Text>
                </View>
                <Text style={styles.stepTitle}>Track & Improve</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepItem}>
                  <Ionicons name="trending-up-outline" size={20} color="#00BCD4" />
                  <Text style={styles.stepText}>Check progress daily</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="flag-outline" size={20} color="#00BCD4" />
                  <Text style={styles.stepText}>Focus on subjects below 70%</Text>
                </View>
                <View style={styles.stepItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#00BCD4" />
                  <Text style={styles.stepText}>Adjust your learning pace</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

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
        <SpeechToText/>
      </ScrollView>

      {/* Place ChatBot before bottom nav but with adjusted style */}
      <View style={styles.chatBotWrapper}>
      <ChatBot />
      <AudioQA/>
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    padding: Platform.OS === 'web' ? 15 : 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // elevation: 3,
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
  reviewsContainer: {
    paddingHorizontal: 20,
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 20 : 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    height: 200,
    width: 350,
    // elevation: 3,
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
    // marginTop: 1,
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
  recommendationsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined,
    borderRadius: 16,
    padding: 20,
    margin: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        // elevation: 3,
      }
    })
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
  },
  warningItem: {
    backgroundColor: '#FFF3E0',
  },
  infoItem: {
    backgroundColor: '#E3F2FD',
  },
  successItem: {
    backgroundColor: '#E8F5E9',
  },
  primaryItem: {
    backgroundColor: '#F3E5F5',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // elevation: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  learningGuideContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined,
    borderRadius: 16,
    padding: 20,
    margin: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        // elevation: 3,
      }
    })
  },
  learningGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  learningGuideTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  guideStep: {
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
  },
  assessmentStep: {
    backgroundColor: '#FFF3E0',
  },
  planningStep: {
    backgroundColor: '#E8F5E9',
  },
  watchStep: {
    backgroundColor: '#E3F2FD',
  },
  testStep: {
    backgroundColor: '#F3E5F5',
  },
  helpStep: {
    backgroundColor: '#FBE9E7',
  },
  trackStep: {
    backgroundColor: '#E0F7FA',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepContent: {
    marginLeft: 40,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  section: {
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
    // elevation: 3
  },
  extractorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  chatButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    padding: Platform.OS === 'web' ? 15 : 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // elevation: 3,
  },
});

// Add helper function to get performance color
const getPerformanceColor = (score) => {
  if (score >= 85) return '#4CAF50';
  if (score >= 70) return '#2196F3';
  if (score >= 50) return '#FF9800';
  return '#F44336';
};