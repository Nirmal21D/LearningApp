import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Platform, Image, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import ChatBot from '@/components/Chatbot';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import { getUserStatus, purchasePremium, convertXPToTokens } from '@/lib/premium';

import FAQComponent from '../../components/FAQ';
import { auth, db } from '@/lib/firebase';
import LeaderboardComponent from '@/components/Leaderboard';
const { width } = Dimensions.get('window');

export default function Profile() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    mobile: '',
    userType: '',
    isPremium: false,
    eduTokens: 0,
    joinedGroups: [],
    testsCompleted: 0,
    totalXP: 0,
    lastTestDate: null,
    highestStreak: 0,
    currentStreak: 0,
    toolUsage: {
      textExtractor: { usageCount: 0 },
      olabs: { usageCount: 0 },
      personalSessions: { usageCount: 0 },
      oneToOneSessions: { usageCount: 0 },
      teacherSessions: { usageCount: 0 }
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumPlans] = useState([
    {
      id: 'monthly',
      name: 'Monthly Premium',
      cost: 100,
      duration: '1 month',
      features: ['Unlimited access for 1 month', 'All premium features']
    },
    {
      id: 'quarterly',
      name: 'Quarterly Premium',
      cost: 250,
      duration: '3 months',
      features: ['Unlimited access for 3 months', 'All premium features', 'Save 50 tokens']
    },
    {
      id: 'yearly',
      name: 'Yearly Premium',
      cost: 800,
      duration: '12 months',
      features: ['Unlimited access for 1 year', 'All premium features', 'Save 400 tokens']
    }
  ]);

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

  const fetchUserData = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Fetched user data:', userData); // Debug log
        setUserInfo({
          username: userData.username || '',
          email: userData.email || '',
          mobile: userData.mobile || '',
          userType: userData.userType || '',
          isPremium: userData.isPremium || false,
          eduTokens: userData.eduTokens || 0,
          joinedGroups: userData.joinedGroups || [],
          testsCompleted: userData.testsCompleted || 0,
          totalXP: userData.totalXP || 0,
          lastTestDate: userData.lastTestDate || null,
          highestStreak: userData.highestStreak || 0,
          currentStreak: userData.currentStreak || 0,
          toolUsage: userData.toolUsage || {
            textExtractor: { usageCount: 0 },
            olabs: { usageCount: 0 },
            personalSessions: { usageCount: 0 },
            oneToOneSessions: { usageCount: 0 },
            teacherSessions: { usageCount: 0 }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        await fetchUserData();
      } else {
        setUserInfo(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const handlePremiumPurchase = async (plan) => {
    if (!userInfo) {
      Alert.alert('Error', 'User information not found');
      return;
    }

    // Check if user has enough EduTokens
    const currentTokens = userInfo.eduTokens || 0;
    if (currentTokens < plan.cost) {
      Alert.alert(
        'Insufficient EduTokens',
        `You need ${plan.cost} EduTokens to purchase this plan.\nCurrent balance: ${currentTokens} tokens\nShort by: ${plan.cost - currentTokens} tokens`
      );
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);

      // Calculate new token balance
      const newTokenBalance = currentTokens - plan.cost;

      // Calculate premium expiry date
      const now = new Date();
      const expiryDate = new Date(now);

      // Set expiry based on plan
      switch (plan.id) {
        case 'yearly':
          expiryDate.setFullYear(now.getFullYear() + 1);
          break;
        case 'quarterly':
          expiryDate.setMonth(now.getMonth() + 3);
          break;
        case 'monthly':
          expiryDate.setMonth(now.getMonth() + 1);
          break;
      }

      // Update user document
      await updateDoc(userRef, {
        eduTokens: newTokenBalance,
        isPremium: true,
        premiumPurchaseDate: now.toISOString(),
        premiumExpiryDate: expiryDate.toISOString(),
        premiumPlan: plan.id
      });

      // Refresh user data
      await fetchUserData();

      Alert.alert(
        'Premium Activated! 🎉',
        `Successfully purchased ${plan.name} plan!\n\nRemaining EduTokens: ${newTokenBalance}\nExpires: ${expiryDate.toLocaleDateString()}`
      );

      setShowPremiumModal(false);

    } catch (error) {
      console.error('Error purchasing premium:', error);
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your purchase. Please try again.'
      );
    }
  };

  const PremiumModal = () => (
    <Modal
      visible={showPremiumModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPremiumModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Upgrade to Premium</Text>
          <Text style={styles.modalSubtitle}>
            Your EduTokens: {userInfo?.eduTokens || 0}
          </Text>

          {premiumPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.premiumPlanCard}
              onPress={() => handlePremiumPurchase(plan)}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Save {plan.savings}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planCost}>{plan.cost} EduTokens</Text>
              <Text style={styles.planDuration}>{plan.duration}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowPremiumModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Content to be rendered inside the main scroll view
  const renderMainContent = () => (
    <>
      <View style={[styles.welcomeSection, { borderRadius: 0 }]}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.username}>{userInfo ? userInfo.username : 'Loading...'}</Text>
      </View>

      <View style={styles.userInfoContainer}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: userInfo?.photoURL ||
                'https://ui-avatars.com/api/?name=' + userInfo?.username
            }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.email}>{userInfo?.email}</Text>
        <Text style={styles.mobile}>{userInfo?.mobile}</Text>
        <Text style={styles.premiumStatus}>
          {userInfo?.isPremium ? 'Premium Member' : 'Free Member'}
        </Text>
        <Text style={styles.joinedGroups}>
          Joined Groups: {userInfo?.joinedGroups?.length || 0}
        </Text>
        <Text style={styles.lastAssessmentDate}>
          Last Assessment Date: {userInfo?.lastAssessmentDate || 'N/A'}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{userInfo?.totalXP || 0}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.statValue}>{userInfo?.highestStreak || 0}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="school" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{userInfo?.testsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Tests</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.leaderboardToggle}
        onPress={() => setShowLeaderboard(!showLeaderboard)}
      >
        <Ionicons
          name={showLeaderboard ? "chevron-up" : "chevron-down"}
          size={24}
          color="#333"
        />
        <Text style={styles.leaderboardToggleText}>
          {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
        </Text>
      </TouchableOpacity>

      {showLeaderboard && (
        <Modal
          visible={showLeaderboard}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLeaderboard(false)}
        >
          <SafeAreaView style={styles.leaderboardModal}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>Leaderboard</Text>
              <TouchableOpacity
                onPress={() => setShowLeaderboard(false)}
                style={styles.closeLeaderboardButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.leaderboardContent}>
              <LeaderboardComponent />
            </View>
          </SafeAreaView>
        </Modal>
      )}
      <View style={styles.sectionContainer}>
        <View style={styles.filterGrid}>
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
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.tokenInfo}>
          <Ionicons name="diamond" size={24} color="#9C27B0" />
          <Text style={styles.tokenCount}>
            {userInfo?.eduTokens || 0} EduTokens
          </Text>
        </View>

        <View style={styles.premiumStatus}>
          <Ionicons
            name={userInfo?.isPremium ? "star" : "star-outline"}
            size={24}
            color={userInfo?.isPremium ? "#FFD700" : "#666"}
          />
          <Text style={styles.statusText}>
            {userInfo?.isPremium ? 'Premium Member' : 'Free Member'}
          </Text>
        </View>
      </View>

      {!userInfo?.isPremium && (
        <TouchableOpacity
          style={styles.upgradePremiumButton}
          onPress={() => setShowPremiumModal(true)}
        >
          <Ionicons name="flash" size={24} color="white" />
          <Text style={styles.upgradeButtonText}>
            Upgrade to Premium
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        <View style={styles.featureItem}>
          <Ionicons name="infinite" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>Unlimited Access to All Features</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="videocam" size={20} color="#2196F3" />
          <Text style={styles.featureText}>Unlimited Video Lessons</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="document-text" size={20} color="#FF9800" />
          <Text style={styles.featureText}>Unlimited Text Extraction</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="people" size={20} color="#9C27B0" />
          <Text style={styles.featureText}>1-on-1 Sessions with Teachers</Text>
        </View>
      </View>

      {/* Render the FAQ component directly here (outside of any nested ScrollView) */}
      <View style={styles.faqContainer}>
        <FAQComponent />
      </View>
    </>
  );

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

      {/* Main ScrollView - now contains all content directly without nesting other scroll-capable components */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderMainContent()}
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
          <Text style={[styles.navText]}>Home</Text>
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
          <Text style={[styles.navText, styles.activeNavText]}>Profile</Text>
        </TouchableOpacity>
      </View>

      <PremiumModal />
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  statLabel: {
    fontSize: 14,
    color: 'black',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    elevation: 3,
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
        elevation: 3,
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
    elevation: 2,
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
        elevation: 3,
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
  extractorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    elevation: 3,
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  leaderboardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leaderboardToggleText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  leaderboardContainer: {
    flex: 1,
    minHeight: 400,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0000ff',
  },
  mobile: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  premiumStatus: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 16,
  },
  joinedGroups: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  lastAssessmentDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  leaderboardModal: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeLeaderboardButton: {
    padding: 5,
  },
  leaderboardContent: {
    flex: 1,
  },  
  premiumPlanCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planCost: {
    fontSize: 24,
    color: '#9C27B0',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  planDuration: {
    color: '#666',
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    margin: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#9C27B0',
  },
  statusText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#666',
  },
  upgradePremiumButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    margin: 15,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    margin: 15,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
