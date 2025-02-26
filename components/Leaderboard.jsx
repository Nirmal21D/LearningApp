import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Image, Animated 
} from 'react-native';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';

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
    );

    const renderItem = ({ item, index }) => (
        <Animated.View style={styles.leaderboardItem}>
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
                    <Ionicons name="timer-outline" size={20} color="#2196F3" />
                )}
                {item.highestStreak >= 5 && (
                    <Ionicons name="flame" size={20} color="#FF5722" />
                )}
                {item.testsCompleted >= 5 && (
                    <Ionicons name="ribbon" size={20} color="#4CAF50" />
                )}
            </View>
        </Animated.View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}
            <FlatList
                data={leaderboardData}
                renderItem={renderItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No data available for this timeframe</Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    timeframeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: '#fff',
        elevation: 2,
    },
    timeframeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    activeTimeframe: {
        backgroundColor: '#2196F3',
    },
    timeframeText: {
        fontSize: 14,
        color: '#666',
    },
    activeTimeframeText: {
        color: '#fff',
    },
    listContainer: {
        padding: 15,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 2,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
    },
    studentInfo: {
        flex: 1,
        marginLeft: 15,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 20,
    }
});

export default LeaderboardComponent; 