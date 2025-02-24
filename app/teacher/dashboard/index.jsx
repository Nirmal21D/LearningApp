import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue,
    interpolate 
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Interactive Card Component
const InteractiveCard = ({ children, style, onPress }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        backgroundColor: interpolate(
            scale.value,
            [1, 0.97],
            ['white', '#f8f9fa']
        ),
    }));

    return (
        <AnimatedPressable
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            onPress={onPress}
            style={[animatedStyle, style]}
        >
            {children}
        </AnimatedPressable>
    );
};

export default function TeacherPanel() {
    const router = useRouter();
    const [quickActions] = useState([
        { 
            id: 'upload', 
            title: 'Upload Study Materials',
            status: '28 Files',
            update: '+4 this week',
            icon: 'cloud-upload',
            color: '#4CAF50',
            onPress: () => router.push('/teacher/upload_materials')
        },
        { 
            id: 'organize', 
            title: 'Organize Materials',
            status: '12 Folders',
            update: '2 updated',
            icon: 'folder-open',
            color: '#FF9800',
            onPress: () => router.push('/teacher/view_materials')
        },
        { 
            id: 'create-test', 
            title: 'Create Test',
            status: '15 Tests',
            update: '3 this week',
            icon: 'create',
            color: '#2196F3',
            onPress: () => router.push('/teacher/create-test')
        },
        // { 
        //     id: 'attendance', 
        //     title: 'Track Attendance',
        //     status: '156 Students',
        //     update: 'Updated today',
        //     icon: 'people',
        //     color: '#9C27B0',
        //     onPress: () => router.push('/teacher/attendance')
        // },
        { 
            id: 'grades', 
            title: 'Manage Grades',
            status: '8 Subjects',
            update: 'Last updated 2d ago',
            icon: 'stats-chart',
            color: '#F44336',
            onPress: () => router.push('/teacher/grades')
        },
        { 
            id: 'videos', 
            title: 'Upload Videos',
            status: '45 Videos',
            update: '+2 this week',
            icon: 'cloud-upload',
            color: '#00BCD4',
            onPress: () => router.push('/teacher/upload-video')
        }
    ]);

    const renderQuickActionCard = (action) => (
        <InteractiveCard 
            key={action.id}
            style={styles.featureCard}
            onPress={action.onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
                <Ionicons 
                    name={action.icon} 
                    size={24} 
                    color={action.color}
                />
            </View>
            <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{action.title}</Text>
                <Text style={styles.featureStatus}>{action.status}</Text>
                <Text style={styles.featureUpdate}>{action.update}</Text>
            </View>
        </InteractiveCard>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <InteractiveCard 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </InteractiveCard>
                    <View style={styles.headerTexts}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.headerTitle}>Teacher Dashboard</Text>
                    </View>
                </View>
            </View>

            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Quick Actions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <InteractiveCard 
                            style={styles.overviewButton}
                            onPress={() => router.push('/teacher/class_overview')}
                        >
                            <Text style={styles.overviewButtonText}>Class Overview</Text>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </InteractiveCard>
                    </View>
                    <View style={styles.quickActionsGrid}>
                        {quickActions.map(renderQuickActionCard)}
                    </View>
                </View>

                {/* Notification Button */}
                <InteractiveCard 
                    style={styles.notificationButton}
                    onPress={() => {
                        Alert.prompt(
                            'Send Quick Notification',
                            'Enter your message to students',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Send',
                                    onPress: (message) => Alert.alert('Notification Sent', message)
                                },
                            ],
                            'plain-text'
                        );
                    }}
                >
                    <Ionicons name="notifications" size={24} color="white" />
                    <Text style={styles.notificationButtonText}>
                        Send Quick Notification
                    </Text>
                </InteractiveCard>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    headerTexts: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    overviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        gap: 4,
    },
    overviewButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    quickActionsGrid: {
        gap: 12,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureContent: {
        flex: 1,
        paddingTop: 4,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    featureStatus: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    featureUpdate: {
        fontSize: 14,
        color: '#666',
    },
    notificationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});