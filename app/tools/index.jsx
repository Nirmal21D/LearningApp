import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import TextExtractor from '@/components/TextExtractor';
import ChatBot from '@/components/Chatbot';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import LearningStyleAssessment from '@/components/LearningStyleAssessment';
import { auth } from '@/lib/firebase';
const { width } = Dimensions.get('window');

// Define premium tools and their usage limits for free users
const PREMIUM_TOOLS = {
  labs: { limit: 3, name: 'Labs' },
  career: { limit: 2, name: 'Career Assessment' },
  chatbot: { limit: 5, name: 'AI Chatbot' }
};

// Free tools without restrictions
const FREE_TOOLS = ['pomodoro'];

export default function Home() {
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState({});
  
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

        // Get usage data
        if (!data.isPremium) {
          const usageDocRef = doc(db, "usage", user.uid);
          try {
            const usageDocSnap = await getDoc(usageDocRef);
            if (usageDocSnap.exists()) {
              setUsageData(usageDocSnap.data());
            } else {
              // Initialize usage document if it doesn't exist
              const initialUsage = Object.keys(PREMIUM_TOOLS).reduce((acc, tool) => {
                acc[tool] = 0;
                return acc;
              }, {});
              
              await updateDoc(usageDocRef, initialUsage);
              setUsageData(initialUsage);
            }
          } catch (error) {
            console.error("Error getting usage data:", error);
            // Initialize default usage if document doesn't exist
            setUsageData(Object.keys(PREMIUM_TOOLS).reduce((acc, tool) => {
              acc[tool] = 0;
              return acc;
            }, {}));
          }
        }

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

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleToolPress = async (toolName) => {
    // Skip restriction check for free tools
    if (FREE_TOOLS.includes(toolName.toLowerCase())) {
      router.push(`/${toolName.toLowerCase()}`);
      return;
    }
    
    // If premium user, allow unrestricted access
    if (userInfo?.isPremium) {
      router.push(`/${toolName.toLowerCase()}`);
      return;
    }
    
    // Check usage limits for free users
    const toolData = PREMIUM_TOOLS[toolName.toLowerCase()];
    if (!toolData) {
      router.push(`/${toolName.toLowerCase()}`);
      return;
    }
    
    const currentUsage = usageData[toolName.toLowerCase()] || 0;
    
    if (currentUsage >= toolData.limit) {
      // Show upgrade prompt
      Alert.alert(
        'Usage Limit Reached',
        `You've reached the free limit for ${toolData.name}. Upgrade to Premium for unlimited access.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/upgrade') }
        ]
      );
    } else {
      // Increment usage and proceed
      const db = getFirestore();
      const user = auth.currentUser;
      if (user) {
        const usageDocRef = doc(db, "usage", user.uid);
        const newUsage = { ...usageData, [toolName.toLowerCase()]: currentUsage + 1 };
        
        try {
          await updateDoc(usageDocRef, newUsage);
          setUsageData(newUsage);
          router.push(`/${toolName.toLowerCase()}`);
        } catch (error) {
          console.error("Error updating usage:", error);
          router.push(`/${toolName.toLowerCase()}`);
        }
      }
    }
  };

  const getRemainingUses = (toolName) => {
    if (!userInfo || userInfo.isPremium) return 'Unlimited';
    
    const toolData = PREMIUM_TOOLS[toolName.toLowerCase()];
    if (!toolData) return 'Unlimited';
    
    const currentUsage = usageData[toolName.toLowerCase()] || 0;
    return `${toolData.limit - currentUsage}/${toolData.limit}`;
  };

  const checkAccess = async (toolId) => {
    if (!auth.currentUser) {
        Alert.alert('Login Required', 'Please login to continue');
        router.push('/login');
        return false;
    }

    try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Check text extractor usage limit (3 free uses)
        if (toolId === 'text-extractor') {
            const usageRef = doc(db, 'toolUsage', auth.currentUser.uid);
            const usageDoc = await getDoc(usageRef);
            
            let usageData = usageDoc.exists() ? usageDoc.data() : { textExtractor: 0 };
            const currentUsage = usageData.textExtractor || 0;

            if (currentUsage < 3) {
                // Still has free uses
                await setDoc(usageRef, {
                    ...usageData,
                    textExtractor: currentUsage + 1,
                    lastUsed: new Date().toISOString()
                }, { merge: true });
                
                if (currentUsage === 2) { // Last free use
                    Alert.alert(
                        'Last Free Use',
                        'This is your last free use of the Text Extractor. Future uses will require Premium access or EduTokens.'
                    );
                }
                return true;
            }
        }

        // Free tools - always accessible
        if (toolId === 'calculator' || toolId === 'notes') {
            return true;
        }

        // Premium user - has access to all tools
        if (userData.isPremium) {
            return true;
        }

        // Token costs for premium tools
        const tokenCosts = {
            'text-extractor': 5,
            'olabs': 10,
            'one-to-one': 20
        };

        const tokenCost = tokenCosts[toolId];

        // Check if user has enough tokens
        if (userData.eduTokens >= tokenCost) {
            const useTokens = await new Promise((resolve) => {
                Alert.alert(
                    'Use EduTokens',
                    `This tool requires ${tokenCost} EduTokens. You have ${userData.eduTokens} tokens.\n\nWould you like to continue?`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Use Tokens', onPress: () => resolve(true) }
                    ]
                );
            });

            if (useTokens) {
                // Create batch write
                const batch = writeBatch(db);
                
                // Update user tokens
                batch.update(userRef, {
                    eduTokens: userData.eduTokens - tokenCost
                });

                // Update usage tracking
                const usageRef = doc(db, 'toolUsage', auth.currentUser.uid);
                batch.set(usageRef, {
                    [`${toolId}Usage`]: increment(1),
                    lastUsed: new Date().toISOString(),
                    userId: auth.currentUser.uid
                }, { merge: true });

                // Commit the batch
                await batch.commit();
                return true;
            }
            return false;
        } else {
            Alert.alert(
                'Insufficient EduTokens',
                `This tool requires ${tokenCost} EduTokens. You have ${userData.eduTokens} tokens.\n\nUpgrade to Premium for unlimited access!`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Get Premium', onPress: () => router.push('/profile') }
                ]
            );
            return false;
        }
    } catch (error) {
        console.error('Error checking access:', error);
        Alert.alert('Error', 'Failed to verify access');
        return false;
    }
};

// Add this function to check remaining free uses
const getRemainingFreeUses = async () => {
    try {
        const usageRef = doc(db, 'toolUsage', auth.currentUser.uid);
        const usageDoc = await getDoc(usageRef);
        
        if (!usageDoc.exists()) {
            return 3; // All free uses available
        }
        
        const usageData = usageDoc.data();
        const currentUsage = usageData.textExtractor || 0;
        return Math.max(0, 3 - currentUsage);
    } catch (error) {
        console.error('Error getting remaining uses:', error);
        return 0;
    }
};

// Update your text extractor button to show remaining uses
const TextExtractorButton = () => {
    const [remainingUses, setRemainingUses] = useState(null);

    useEffect(() => {
        const loadRemainingUses = async () => {
            const uses = await getRemainingFreeUses();
            setRemainingUses(uses);
        };
        loadRemainingUses();
    }, []);

    return (
        <TouchableOpacity 
            style={styles.toolButton} 
            onPress={() => handleToolPress('text-extractor')}
        >
            <View style={styles.toolContent}>
                <Ionicons name="document-text" size={24} color="#4CAF50" />
                <Text style={styles.toolName}>Text Extractor</Text>
                {!userInfo?.isPremium && remainingUses !== null && (
                    <View style={styles.usageInfo}>
                        {remainingUses > 0 ? (
                            <Text style={styles.freeUsesText}>
                                {remainingUses} free uses left
                            </Text>
                        ) : (
                            <View style={styles.tokenCost}>
                                <Ionicons name="diamond" size={16} color="#9C27B0" />
                                <Text style={styles.tokenText}>5</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

// Add these styles
const additionalStyles = StyleSheet.create({
    usageInfo: {
        marginLeft: 'auto',
    },
    freeUsesText: {
        color: 'rgba(245, 247, 250, 0.86)',
        fontWeight: 'bold',
        fontSize: 12,
    }
});

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
          {!userInfo?.isPremium && (
            <View style={styles.accountBadge}>
              <Text style={styles.accountBadgeText}>Free Account</Text>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => router.push('/upgrade')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}
          {userInfo?.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium Account</Text>
            </View>
          )}
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
                style={[styles.filterCard, !userInfo?.isPremium && styles.premiumTool]}
                onPress={() => handleToolPress('labs')}
              >
                <View style={styles.filterIconContainer}>
                 
                </View>
                <View style={styles.toolInfo}>
                  <Text style={styles.filterName}>Labs</Text>
                  {!userInfo?.isPremium && (
                    <View style={styles.usageIndicator}>
                      <Text style={styles.usageText}>Uses left: {getRemainingUses('labs')}</Text>
                    </View>
                  )}
                </View>
                {!userInfo?.isPremium && (
                  <Ionicons name="star" size={16} color="#FFD700" style={styles.premiumIcon} />
                )}
              </TouchableOpacity>
             
              <TouchableOpacity 
                style={styles.filterCard}
                onPress={() => handleToolPress('pomodoro')}
              >
                <View style={styles.filterIconContainer}>
                 
                </View>
                <View style={styles.toolInfo}>
                  <Text style={styles.filterName}>Pomodoro</Text>
                  <Text style={styles.freeToolText}>Free Tool</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filterCard, !userInfo?.isPremium && styles.premiumTool]}
                onPress={() => handleToolPress('career')}
              >
                <View style={styles.filterIconContainer}>
                 
                </View>
                <View style={styles.toolInfo}>
                  <Text style={styles.filterName}>Career</Text>
                  {!userInfo?.isPremium && (
                    <View style={styles.usageIndicator}>
                      <Text style={styles.usageText}>Uses left: {getRemainingUses('career')}</Text>
                    </View>
                  )}
                </View>
                {!userInfo?.isPremium && (
                  <Ionicons name="star" size={16} color="#FFD700" style={styles.premiumIcon} />
                )}
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

      {/* ChatBot with usage restriction */}
      <View style={styles.chatBotWrapper}>
        <TouchableOpacity
          onPress={() => {
            if (userInfo?.isPremium) {
              // Premium users get unlimited access
              return;
            }
            
            const currentUsage = usageData.chatbot || 0;
            if (currentUsage >= PREMIUM_TOOLS.chatbot.limit) {
              Alert.alert(
                'Chat Limit Reached',
                `You've reached the free limit for AI Chatbot. Upgrade to Premium for unlimited access.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Upgrade', onPress: () => router.push('/upgrade') }
                ]
              );
            } else {
              // Increment usage on first interaction (handle in ChatBot component)
              // The tracking should be inside the ChatBot component
            }
          }}
        >
          <ChatBot 
            isPremium={userInfo?.isPremium} 
            usageLimit={PREMIUM_TOOLS.chatbot.limit}
            currentUsage={usageData.chatbot || 0}
          />
        </TouchableOpacity>
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
      backgroundColor: 'rgba(245, 247, 250, 0.86)',
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
      color: 'rgba(22, 102, 222, 0.45)',
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
      backgroundColor: 'rgba(9, 126, 221, 0.68)',
    },
    welcomeText: {
      fontSize: 24,
      color: 'rgba(255,255,255,0.8)',
    },
    username: {
      fontSize: Platform.OS === 'web' ? 32 : 28,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 10,
    },
    accountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    accountBadgeText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
    },
    upgradeButton: {
      backgroundColor: '#FFD700',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginLeft: 8,
    },
    upgradeButtonText: {
      color: '#1A237E',
      fontWeight: 'bold',
      fontSize: 12,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 215, 0, 0.3)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    premiumBadgeText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
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
      position: 'relative',
    },
    premiumTool: {
      borderColor: 'rgba(255, 215, 0, 0.4)',
    },
    premiumIcon: {
      position: 'absolute',
      top: 10,
      right: 10,
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
    toolInfo: {
      flex: 1,
    },
    filterName: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
    },
    usageIndicator: {
      marginTop: 2,
    },
    usageText: {
      fontSize: 12,
      color: '#666',
    },
    freeToolText: {
      fontSize: 12,
      color: '#2196F3',
      fontWeight: '500',
      marginTop: 2,
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