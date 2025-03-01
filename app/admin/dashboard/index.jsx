import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalTeachers: 0,
        pendingApprovals: 0,
        totalContent: 0,
        recentActivities: []
    });

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // Fetch teacher stats from users collection
            const teachersRef = collection(db, 'users');
            const teachersQuery = query(teachersRef, where('userType', '==', 'teacher'));
            const teachersSnapshot = await getDocs(teachersQuery);
            
            const teachers = teachersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const pendingTeachers = teachers.filter(teacher => !teacher.approved).length;
            const totalTeachers = teachers.length;

            // Fetch content stats
            const contentRef = collection(db, 'content');
            const contentSnapshot = await getDocs(contentRef);

            setStats({
                totalTeachers,
                pendingApprovals: pendingTeachers,
                totalContent: contentSnapshot.docs.length,
                recentActivities: []
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            Alert.alert('Error', 'Failed to load dashboard statistics');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.replace('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const menuItems = [
        {
            title: 'Manage Teachers',
            icon: 'people',
            route: '/admin/manage_teachers',
            color: '#9C27B0',
            description: 'Approve and manage teacher accounts',
            badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : null
        },
        {
            title: 'Content Management',
            icon: 'library',
            route: '/admin/manage_content',
            color: '#FF5722',
            description: 'Manage study materials and resources'
        },
        {
            title: 'Create Curriculum',
            icon: 'create',
            route: '/admin/create_curriculum',
            color: '#2196F3',
            description: 'Create and organize course content'
        },
        {
            title: 'Upload Materials',
            icon: 'cloud-upload',
            route: '/admin/upload_materials',
            color: '#FF9800',
            description: 'Add new study materials'
        },
        {
            title: 'Analytics',
            icon: 'analytics',
            route: '/admin/app-analytics',
            color: '#4CAF50',
            description: 'View app usage statistics'
        }
    ];

    const renderMenuItem = (item) => (
        <TouchableOpacity
            key={item.title}
            style={styles.menuItem}
            onPress={() => router.push(item.route)}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="white" />
                {item.badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                )}
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Admin Dashboard</Text>
                    <Text style={styles.subtitle}>Manage your learning platform</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out" size={24} color="#E91E63" />
                </TouchableOpacity>
            </View>
            {/* Decorative blur circles */}
            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />
            <View style={[styles.blurCircle, styles.blurCircle3]} />
            <ScrollView style={styles.content}>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.totalTeachers}</Text>
                        <Text style={styles.statLabel}>Total Teachers</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
                        <Text style={styles.statLabel}>Pending Approvals</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.totalContent}</Text>
                        <Text style={styles.statLabel}>Total Content</Text>
                    </View>
                </View>

                <View style={styles.menuGrid}>
                    {menuItems.map(renderMenuItem)}
                </View>
            </ScrollView>
        </View>

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
        </ScrollView>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        backgroundColor: '#fff',
        marginVertical: 10,
        borderRadius: 12,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statCard: {
        alignItems: 'center',
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
        padding: 10,
        paddingVertical: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
        width: 48,
        height: 48,
        borderRadius: 24,
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
        marginBottom: 8,
    },
    menuDescription: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#E91E63',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
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
    analyticsButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 6,
    },
});