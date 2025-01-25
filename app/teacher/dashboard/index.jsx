import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherPanel() {
    const router = useRouter();
    const [quickActions, setQuickActions] = useState([
        { 
            id: 'upload', 
            title: 'Upload Study Materials', 
            icon: 'cloud-upload', 
            onPress: () => router.push('/teacher/upload_materials')
        },
        { 
            id: 'organize', 
            title: 'Organize Materials', 
            icon: 'folder-open', 
            onPress: () => router.push('/teacher/organize_materials')
        },
        { 
            id: 'create-test', 
            title: 'Create Test', 
            icon: 'create', 
            onPress: () => router.push('/teacher/create_test')
        },
        { 
            id: 'attendance', 
            title: 'Track Attendance', 
            icon: 'people', 
            onPress: () => router.push('/teacher/attendance')
        },
        { 
            id: 'grades', 
            title: 'Manage Grades', 
            icon: 'stats-chart', 
            onPress: () => router.push('/teacher/grades')
        }
    ]);

    const renderQuickActionCard = (action) => (
        <TouchableOpacity 
            key={action.id}
            style={styles.featureButton} 
            onPress={action.onPress}
        >
            <View style={styles.featureButtonContent}>
                <Ionicons 
                    name={action.icon} 
                    size={24} 
                    color="#007bff" 
                    style={styles.featureButtonIcon}
                />
                <Text style={styles.featureButtonText}>{action.title}</Text>
            </View>
        </TouchableOpacity>
    );

    const handleClassOverview = () => {
        router.push('/teacher/class_overview');
    };

    const handleQuickNotification = () => {
        Alert.prompt(
            'Send Quick Notification',
            'Enter your message to students',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Send',
                    onPress: (message) => {
                        // Implement notification sending logic
                        Alert.alert('Notification Sent', message);
                    },
                },
            ],
            'plain-text'
        );
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Teacher Dashboard</Text>
                <TouchableOpacity 
                    style={styles.overviewButton}
                    onPress={handleClassOverview}
                >
                    <Text style={styles.overviewButtonText}>Class Overview</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                    {quickActions.map(renderQuickActionCard)}
                </View>
            </View>

            <TouchableOpacity 
                style={styles.notificationButton}
                onPress={handleQuickNotification}
            >
                <Ionicons 
                    name="notifications" 
                    size={24} 
                    color="white" 
                    style={styles.notificationIcon}
                />
                <Text style={styles.notificationButtonText}>
                    Send Quick Notification
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    contentContainer: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    overviewButton: {
        backgroundColor: '#007bff',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
    },
    overviewButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    quickActionsContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        color: '#333',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    featureButton: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    featureButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    featureButtonIcon: {
        marginRight: 10,
    },
    featureButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    notificationButton: {
        flexDirection: 'row',
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationIcon: {
        marginRight: 10,
    },
    notificationButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});