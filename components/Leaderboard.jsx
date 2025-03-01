import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Platform, SafeAreaView
} from 'react-native';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const LeaderboardComponent = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [timeframe, setTimeframe] = useState('daily'); // daily, weekly, monthly
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('all');

    const fetchUserData = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                return {
                    username: userDoc.data().username || 'Unknown',
                    email: userDoc.data().email
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    const fetchLeaderboardData = async () => {
        try {
            setLoading(true);
            const startDate = getTimeframeStart();
            
            const userProgressRef = collection(db, 'userProgress');
            let q = query(
                userProgressRef,
                where('timestamp', '>=', startDate.toISOString()),
                orderBy('timestamp', 'desc')
            );

            if (selectedSubject !== 'all') {
                q = query(q, where('subjectId', '==', selectedSubject));
            }

            const querySnapshot = await getDocs(q);
            
            const studentScores = {};
            
            // Fetch all unique user data first
            const uniqueUserIds = new Set();
            querySnapshot.forEach(doc => uniqueUserIds.add(doc.data().userId));
            
            const userDataPromises = Array.from(uniqueUserIds).map(fetchUserData);
            const userData = await Promise.all(userDataPromises);
            const userMap = {};
            
            Array.from(uniqueUserIds).forEach((userId, index) => {
                if (userData[index]) {
                    userMap[userId] = userData[index];
                }
            });

            // Process test results
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const userId = data.userId;
                const user = userMap[userId] || { username: 'Unknown', email: '' };
                
                if (!studentScores[userId]) {
                    studentScores[userId] = {
                        userId: userId,
                        studentName: user.username,
                        email: user.email,
                        totalXP: 0,
                        testsCompleted: 0,
                        averageScore: 0,
                        totalScore: 0,
                        highestStreak: 0,
                        totalTimeBonus: 0,
                        lastActive: data.timestamp
                    };
                }

                const score = data.score || {};
                studentScores[userId].totalXP += score.xpEarned || 0;
                studentScores[userId].testsCompleted += 1;
                studentScores[userId].totalScore += score.percentage || 0;
                studentScores[userId].highestStreak = Math.max(
                    studentScores[userId].highestStreak, 
                    score.maxStreak || 0
                );
                studentScores[userId].totalTimeBonus += score.timeBonus || 0;
            });

            const leaderboardArray = Object.values(studentScores)
                .map(student => ({
                    ...student,
                    averageScore: Math.round(student.totalScore / student.testsCompleted)
                }))
                .sort((a, b) => b.totalXP - a.totalXP);

            setLeaderboardData(leaderboardArray);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboardData();
    }, [timeframe, selectedSubject]);

    const getTimeframeStart = () => {
        const now = new Date();
        switch (timeframe) {
            case 'daily':
                return new Date(now.setHours(0, 0, 0, 0));
            case 'weekly':
                return new Date(now.setDate(now.getDate() - now.getDay()));
            case 'monthly':
                return new Date(now.setDate(1));
            default:
                return new Date(now.setHours(0, 0, 0, 0));
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>See who's leading in achievements</Text>
            
            <View style={styles.timeframeContainer}>
                {['daily', 'weekly', 'monthly'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.timeframeButton,
                            timeframe === option && styles.activeTimeframe
                        ]}
                        onPress={() => setTimeframe(option)}
                    >
                        <Text style={[
                            styles.timeframeText,
                            timeframe === option && styles.activeTimeframeText
                        ]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderItem = ({ item, index }) => (
        <Animated.View 
            entering={FadeInDown.delay(index * 100).duration(600).springify()}
            style={styles.leaderboardItem}
        >
            <View style={styles.rankContainer}>
                {index < 3 ? (
                    <Ionicons 
                        name="trophy" 
                        size={24} 
                        color={['#FFD700', '#C0C0C0', '#CD7F32'][index]} 
                    />
                ) : (
                    <Text style={styles.rankText}>{index + 1}</Text>
                )}
            </View>
            
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.studentName}</Text>
                <Text style={styles.emailText}>{item.email}</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.statText}>{item.totalXP} XP</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="school" size={16} color="#4CAF50" />
                        <Text style={styles.statText}>{item.averageScore}%</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="flame" size={16} color="#FF5722" />
                        <Text style={styles.statText}>{item.highestStreak}x</Text>
                    </View>
                </View>
            </View>

            <View style={styles.achievementsContainer}>
                {item.totalTimeBonus > 0 && (
                    <BlurView intensity={0} tint="light" style={[styles.achievementIcon, styles.glassEffect]}>
                        <Ionicons name="timer-outline" size={20} color="#2196F3" />
                    </BlurView>
                )}
                {item.highestStreak >= 5 && (
                    <BlurView intensity={0} tint="light" style={[styles.achievementIcon, styles.glassEffect]}>
                        <Ionicons name="flame" size={20} color="#FF5722" />
                    </BlurView>
                )}
                {item.testsCompleted >= 5 && (
                    <BlurView intensity={0} tint="light" style={[styles.achievementIcon, styles.glassEffect]}>
                        <Ionicons name="ribbon" size={20} color="#4CAF50" />
                    </BlurView>
                )}
            </View>
        </Animated.View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={[styles.blurCircle, styles.blurCircle1]} />
                <View style={[styles.blurCircle, styles.blurCircle2]} />
                <View style={[styles.blurCircle, styles.blurCircle3]} />
                
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading leaderboard...</Text>
                </View>
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
            
            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />
            <View style={[styles.blurCircle, styles.blurCircle3]} />
            
            <SafeAreaView style={styles.safeArea}>
                {renderHeader()}
                <FlatList
                    data={leaderboardData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <BlurView intensity={0} tint="light" style={[styles.emptyContainer, styles.glassEffect]}>
                            <Text style={styles.emptyText}>No data available for this timeframe</Text>
                        </BlurView>
                    }
                />
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
    headerContainer: {
        paddingTop: Platform.OS === 'web' ? 20 : 40,
        paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
        paddingBottom: 20,
    },
    title: {
        fontSize: Platform.OS === 'web' ? 34 : 28,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Platform.OS === 'web' ? 17 : 14,
        color: '#666',
        lineHeight: 15,
        marginRight: 25,
        marginBottom: 20,
    },
    timeframeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 25,
        padding: 4,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    timeframeButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    activeTimeframe: {
        backgroundColor: 'rgba(33, 150, 243, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 2,
    },
    timeframeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTimeframeText: {
        color: '#fff',
        fontWeight: '600',
    },
    listContainer: {
        padding: Platform.OS === 'web' ? 20 : 16,
        paddingTop: 10,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        padding: 16,
        borderRadius: 28,
        marginBottom: 12,
        backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 24,
        borderTopColor: 'rgba(255, 255, 255, 0.9)',
        borderLeftColor: 'rgba(255, 255, 255, 0.9)',
        borderRightColor: 'rgba(255, 255, 255, 0.7)',
        borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    },
    rankContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A237E',
    },
    studentInfo: {
        flex: 1,
        marginLeft: 15,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 5,
    },
    emailText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statText: {
        fontSize: 14,
        color: '#666',
    },
    achievementsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 10,
    },
    achievementIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassEffect: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 9,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#1A237E',
    },
    emptyContainer: {
        padding: 20,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
    },
    emptyText: {
        fontSize: 16,
        color: '#1A237E',
    },
    
});

export default LeaderboardComponent;