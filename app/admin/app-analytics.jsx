import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, database, auth } from '../../lib/firebase';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import LoadingScreen from '../../components/LoadingScreen';

export default function AppAnalytics() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analytics, setAnalytics] = useState({
        users: {
            total: 0,
            students: 0,
            teachers: 0,
            careerGuiders: 0
        },
        content: {
            totalSubjects: 0,
            totalChapters: 0,
            totalMaterials: 0
        },
        engagement: {
            totalChats: 0,
            activeChats: 0,
            totalMessages: 0
        },
        assessments: {
            total: 0,
            completed: 0,
            averageScore: 0
        }
    });

    const [chartData, setChartData] = useState({
        userGrowth: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{ data: [0, 0, 0, 0, 0, 0] }]
        },
        userDistribution: [
            { name: 'Students', population: 0, color: '#2196F3', legendFontColor: '#7F7F7F' },
            { name: 'Teachers', population: 0, color: '#4CAF50', legendFontColor: '#7F7F7F' },
            { name: 'Career Guiders', population: 0, color: '#9C27B0', legendFontColor: '#7F7F7F' }
        ],
        messageActivity: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
        }
    });

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            
            // Fetch user statistics (Firestore)
            const usersRef = collection(db, 'users');
            const studentsSnap = await getDocs(query(usersRef, where('userType', '==', 'student')));
            const teachersSnap = await getDocs(query(usersRef, where('userType', '==', 'teacher')));
            const guidersSnap = await getDocs(query(usersRef, where('userType', '==', 'careerGuider')));

            // Fetch content statistics (Firestore)
            const subjectsSnap = await getDocs(collection(db, 'subjects'));
            let totalChapters = 0;
            let totalMaterials = 0;
            
            subjectsSnap.forEach(doc => {
                const subject = doc.data();
                totalChapters += subject.chapters?.length || 0;
                totalMaterials += subject.materials?.length || 0;
            });

            // Fetch chat statistics (Realtime Database)
            const regularChatsRef = ref(database, 'chats');
            const careerChatsRef = ref(database, 'careerChats');
            
            const [regularChatsSnap, careerChatsSnap] = await Promise.all([
                get(regularChatsRef),
                get(careerChatsRef)
            ]);

            let totalMessages = 0;
            let activeChats = 0;
            let weeklyMessageCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

            // Process regular chats
            if (regularChatsSnap.exists()) {
                regularChatsSnap.forEach(chat => {
                    const chatData = chat.val();
                    if (chatData.messages) {
                        const messages = Object.values(chatData.messages);
                        totalMessages += messages.length;
                        
                        // Count active chats (with messages in last 24h)
                        const hasRecentMessage = messages.some(msg => 
                            Date.now() - msg.timestamp < 24 * 60 * 60 * 1000
                        );
                        if (hasRecentMessage) activeChats++;

                        // Count messages by day of week
                        messages.forEach(msg => {
                            const dayOfWeek = new Date(msg.timestamp).getDay();
                            weeklyMessageCounts[dayOfWeek]++;
                        });
                    }
                });
            }

            // Process career chats
            if (careerChatsSnap.exists()) {
                careerChatsSnap.forEach(chat => {
                    const chatData = chat.val();
                    if (chatData.messages) {
                        const messages = Object.values(chatData.messages);
                        totalMessages += messages.length;
                        
                        const hasRecentMessage = messages.some(msg => 
                            Date.now() - msg.timestamp < 24 * 60 * 60 * 1000
                        );
                        if (hasRecentMessage) activeChats++;

                        messages.forEach(msg => {
                            const dayOfWeek = new Date(msg.timestamp).getDay();
                            weeklyMessageCounts[dayOfWeek]++;
                        });
                    }
                });
            }

            const newAnalytics = {
                users: {
                    total: studentsSnap.size + teachersSnap.size + guidersSnap.size,
                    students: studentsSnap.size,
                    teachers: teachersSnap.size,
                    careerGuiders: guidersSnap.size
                },
                content: {
                    totalSubjects: subjectsSnap.size,
                    totalChapters,
                    totalMaterials
                },
                engagement: {
                    totalChats: (regularChatsSnap.size || 0) + (careerChatsSnap.size || 0),
                    activeChats,
                    totalMessages
                },
                assessments: {
                    total: 0,
                    completed: 0,
                    averageScore: 0
                }
            };

            setAnalytics(newAnalytics);

            // Rotate array to start with Monday
            const mondayFirst = [...weeklyMessageCounts.slice(1), weeklyMessageCounts[0]];

            // Update chart data
            setChartData({
                userGrowth: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        data: [
                            newAnalytics.users.total * 0.3,
                            newAnalytics.users.total * 0.5,
                            newAnalytics.users.total * 0.6,
                            newAnalytics.users.total * 0.8,
                            newAnalytics.users.total * 0.9,
                            newAnalytics.users.total
                        ]
                    }]
                },
                userDistribution: [
                    {
                        name: 'Students',
                        population: newAnalytics.users.students,
                        color: '#2196F3',
                        legendFontColor: '#7F7F7F'
                    },
                    {
                        name: 'Teachers',
                        population: newAnalytics.users.teachers,
                        color: '#4CAF50',
                        legendFontColor: '#7F7F7F'
                    },
                    {
                        name: 'Career Guiders',
                        population: newAnalytics.users.careerGuiders,
                        color: '#9C27B0',
                        legendFontColor: '#7F7F7F'
                    }
                ],
                messageActivity: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        data: mondayFirst
                    }]
                }
            });

            console.log('Analytics updated:', newAnalytics);
            console.log('Message counts by day:', mondayFirst);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <LoadingScreen/>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Analytics</Text>
            </View>

            {/* Users Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={24} color="#2196F3" />
                        <Text style={styles.statNumber}>{analytics.users.total}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="school" size={24} color="#4CAF50" />
                        <Text style={styles.statNumber}>{analytics.users.students}</Text>
                        <Text style={styles.statLabel}>Students</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="person" size={24} color="#FF9800" />
                        <Text style={styles.statNumber}>{analytics.users.teachers}</Text>
                        <Text style={styles.statLabel}>Teachers</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="briefcase" size={24} color="#9C27B0" />
                        <Text style={styles.statNumber}>{analytics.users.careerGuiders}</Text>
                        <Text style={styles.statLabel}>Career Guiders</Text>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Content Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="library" size={24} color="#2196F3" />
                        <Text style={styles.statNumber}>{analytics.content.totalSubjects}</Text>
                        <Text style={styles.statLabel}>Total Subjects</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="book" size={24} color="#4CAF50" />
                        <Text style={styles.statNumber}>{analytics.content.totalChapters}</Text>
                        <Text style={styles.statLabel}>Total Chapters</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="document" size={24} color="#FF9800" />
                        <Text style={styles.statNumber}>{analytics.content.totalMaterials}</Text>
                        <Text style={styles.statLabel}>Study Materials</Text>
                    </View>
                </View>
            </View>

            {/* Engagement Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Engagement Metrics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="chatbubbles" size={24} color="#2196F3" />
                        <Text style={styles.statNumber}>{analytics.engagement.totalChats}</Text>
                        <Text style={styles.statLabel}>Total Chats</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="chatbox" size={24} color="#4CAF50" />
                        <Text style={styles.statNumber}>{analytics.engagement.activeChats}</Text>
                        <Text style={styles.statLabel}>Active Chats</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="mail" size={24} color="#FF9800" />
                        <Text style={styles.statNumber}>{analytics.engagement.totalMessages}</Text>
                        <Text style={styles.statLabel}>Total Messages</Text>
                    </View>
                </View>
            </View>

            {/* Charts Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Growth</Text>
                <LineChart
                    data={chartData.userGrowth}
                    width={Dimensions.get('window').width - 64}
                    height={220}
                    chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                        style: {
                            borderRadius: 16
                        }
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Distribution</Text>
                <PieChart
                    data={chartData.userDistribution}
                    width={Dimensions.get('window').width - 64}
                    height={220}
                    chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    style={styles.chart}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Message Activity</Text>
                <BarChart
                    data={chartData.messageActivity}
                    width={Dimensions.get('window').width - 64}
                    height={220}
                    yAxisLabel=""
                    chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                        style: {
                            borderRadius: 16
                        }
                    }}
                    style={styles.chart}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    section: {
        margin: 16,
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    }
}); 