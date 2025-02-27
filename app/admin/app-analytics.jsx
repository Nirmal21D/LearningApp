import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, database, auth } from '../../lib/firebase';

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

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            
            // Fetch user statistics
            const usersRef = collection(db, 'users');
            const studentsSnap = await getDocs(query(usersRef, where('userType', '==', 'student')));
            const teachersSnap = await getDocs(query(usersRef, where('userType', '==', 'teacher')));
            const guidersSnap = await getDocs(query(usersRef, where('userType', '==', 'careerGuider')));

            // Fetch content statistics
            const subjectsSnap = await getDocs(collection(db, 'subjects'));
            let totalChapters = 0;
            let totalMaterials = 0;
            
            subjectsSnap.forEach(doc => {
                const subject = doc.data();
                totalChapters += subject.chapters?.length || 0;
                totalMaterials += subject.materials?.length || 0;
            });

            // Fetch chat statistics
            const chatsRef = ref(database, 'chats');
            const chatsSnap = await get(chatsRef);
            let totalMessages = 0;
            let activeChats = 0;
            
            chatsSnap.forEach(chat => {
                const chatData = chat.val();
                if (chatData.messages) {
                    totalMessages += Object.keys(chatData.messages).length;
                    if (chatData.lastMessageTime > Date.now() - 24 * 60 * 60 * 1000) {
                        activeChats++;
                    }
                }
            });

            setAnalytics({
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
                    totalChats: chatsSnap.size,
                    activeChats,
                    totalMessages
                },
                assessments: {
                    total: 0, // Add your assessment logic here
                    completed: 0,
                    averageScore: 0
                }
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9C27B0" />
                <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
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
}); 