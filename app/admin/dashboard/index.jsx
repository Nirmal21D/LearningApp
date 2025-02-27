import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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

    const navigateToAnalytics = () => {
        router.push('/admin/app-analytics');  // New route
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Dashboard</Text>
                <TouchableOpacity 
                    style={styles.analyticsButton}
                    onPress={navigateToAnalytics}
                >
                    <Ionicons name="stats-chart" size={24} color="#fff" />
                    <Text style={styles.analyticsButtonText}>View Analytics</Text>
                </TouchableOpacity>
            </View>

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
                {stats.recentActivities.map((activity, index) => (
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
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 15,
        justifyContent: 'space-around',
    },
    statCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        width: '45%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    menuGrid: {
        padding: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '500',
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
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    activityContent: {
        marginLeft: 10,
        flex: 1,
    },
    activityText: {
        fontSize: 14,
        color: '#333',
    },
    activityDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    analyticsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9C27B0',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    analyticsButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontWeight: '600',
    },
});