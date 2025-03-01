import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalSubjects: 0,
        totalChapters: 0,
        recentActivities: []
    });

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const subjectsRef = collection(db, 'subjects');
            const subjectsQuery = query(subjectsRef, orderBy('createdAt', 'desc'));
            const subjectsSnapshot = await getDocs(subjectsQuery);
            
            let totalChapters = 0;
            const recentActivities = [];

            subjectsSnapshot.forEach(doc => {
                const subject = doc.data();
                totalChapters += subject.chapters?.length || 0;
                
                // Add to recent activities
                recentActivities.push({
                    id: doc.id,
                    type: 'subject',
                    name: subject.name,
                    date: subject.createdAt
                });
            });

            setStats({
                totalSubjects: subjectsSnapshot.size,
                totalChapters,
                recentActivities: recentActivities.slice(0, 5) // Get only last 5 activities
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            Alert.alert('Error', 'Failed to load dashboard statistics');
        }
    };

    const menuItems = [
        {
            title: 'Create Curriculum',
            icon: 'create-outline',
            route: '/admin/create_curriculum',
            color: '#2196F3',
            description: 'Create new subjects and chapters'
        },
        {
            title: 'Manage Curriculum',
            icon: 'list-outline',
            route: '/admin/manage_curriculum',
            color: '#4CAF50',
            description: 'Edit and organize existing content'
        },
        {
            title: 'Upload Materials',
            icon: 'cloud-upload-outline',
            route: '/admin/create_curriculum/upload',
            color: '#FF9800',
            description: 'Add study materials and resources'
        }
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Decorative blur circles */}
            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />
            <View style={[styles.blurCircle, styles.blurCircle3]} />

            <SafeAreaView style={styles.safeArea}>
                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Admin Dashboard</Text>
                        <Text style={styles.subtitle}>Manage your educational content</Text>
                    </View>

                    <Animated.View 
                        entering={FadeInDown.duration(800).springify()} 
                        style={styles.content}
                    >
                        {/* Stats Section */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{stats.totalSubjects}</Text>
                                <Text style={styles.statLabel}>Total Subjects</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{stats.totalChapters}</Text>
                                <Text style={styles.statLabel}>Total Chapters</Text>
                            </View>
                        </View>

                        {/* Menu Grid */}
                        <View style={styles.menuGrid}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.menuItem}
                                    onPress={() => router.push(item.route)}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                        <Ionicons name={item.icon} size={32} color="#fff" />
                                    </View>
                                    <Text style={styles.menuTitle}>{item.title}</Text>
                                    <Text style={styles.menuDescription}>{item.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Recent Activities */}
                        <View style={styles.recentActivities}>
                            <Text style={styles.sectionTitle}>Recent Activities</Text>
                            {stats.recentActivities.length > 0 ? (
                                stats.recentActivities.map((activity, index) => (
                                    <View key={index} style={styles.activityItem}>
                                        <Ionicons name="time-outline" size={20} color="#666" />
                                        <View style={styles.activityContent}>
                                            <Text style={styles.activityText}>
                                                New subject created: {activity.name}
                                            </Text>
                                            <Text style={styles.activityDate}>
                                                {new Date(activity.date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No recent activities found</Text>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        padding: 20,
        marginTop: Platform.OS === 'ios' ? 20 : 40,
    },
    title: {
        fontSize: Platform.OS === 'web' ? 34 : 28,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Platform.OS === 'web' ? 17 : 14,
        color: '#666',
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingVertical: 15,
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        width: '48%',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    statNumber: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1A237E',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    menuGrid: {
        paddingVertical: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    menuDescription: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    recentActivities: {
        marginTop: 10,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 15,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    activityContent: {
        marginLeft: 10,
        flex: 1,
    },
    activityText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    activityDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Decorative blur circles
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
});