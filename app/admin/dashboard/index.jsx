import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

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
            title: 'Manage Curriculum',
            icon: 'book',
            route: '/admin/manage_curriculum',
            color: '#2196F3',
            description: 'Create and organize course content'
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
            color: '#4CAF50',
            description: 'Design new curriculum structure'
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
            color: '#673AB7',
            description: 'View app usage statistics'
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
                <View style={styles.topBarContainer}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Admin Dashboard</Text>
                        <Text style={styles.subtitle}>Manage your learning platform</Text>
                    </View>
                    <BlurView intensity={0} tint="light" style={[styles.logoutButton, styles.glassEffect]}>
                        <TouchableOpacity onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#E91E63"/>
                        </TouchableOpacity>
                    </BlurView>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <Animated.View 
                        entering={FadeInDown.duration(1000).springify()} 
                        style={styles.main}
                    >
                        {/* Stats Section */}
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

                        {/* Menu Grid */}
                        <View style={styles.menuGrid}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
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
                            ))}
                        </View>

                        {/* Recent Activities */}
                        <View style={styles.recentActivities}>
                            <Text style={styles.sectionTitle}>Recent Activities</Text>
                            {stats.recentActivities && stats.recentActivities.length > 0 ? (
                                stats.recentActivities.map((activity, index) => (
                                    <View key={index} style={styles.activityItem}>
                                        <Ionicons name="time-outline" size={20} color="#666" />
                                        <View style={styles.activityContent}>
                                            <Text style={styles.activityText}>
                                                {activity.text}
                                            </Text>
                                            <Text style={styles.activityDate}>
                                                {activity.date}
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
    scrollViewContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    main: {
        flex: 1,
        padding: 16,
        maxWidth: Platform.OS === 'web' ? 1200 : undefined,
        width: '100%',
        alignSelf: 'center',
    },
    // Fixed position for the header
    topBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        paddingTop: Platform.OS === 'web' ? 20 : 40,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    headerContainer: {
        flex: 1,
    },
    title: {
        fontSize: Platform.OS === 'web' ? 34 : 28,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Platform.OS === 'web' ? 17 : 14,
        color: '#666',
        lineHeight: 20,
    },
    // Stats Section
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 24,
        width: '31%',
        alignItems: 'center',
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
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 6,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    // Menu Grid
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    menuItem: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
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
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        position: 'relative',
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    menuDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
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
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 6,
    },
    // Recent Activities
    recentActivities: {
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
        borderRadius: 24,
        padding: 20,
        marginTop: 8,
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
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 16,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 8,
        borderRadius: 16,
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
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 16,
    },
    // Logout button with glass effect
    logoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassEffect: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 9,
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