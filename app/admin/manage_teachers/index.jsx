import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageTeachers() {
    const router = useRouter();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = setupTeacherListener();
        return () => unsubscribe();
    }, []);

    const setupTeacherListener = () => {
        try {
            const teachersRef = collection(db, 'users');
            const q = query(
                teachersRef,
                where('userType', '==', 'teacher'),
                orderBy('createdAt', 'desc')  // Sort by newest first
            );

            return onSnapshot(q, 
                (snapshot) => {
                    if (snapshot.empty) {
                        setTeachers([]);
                        setLoading(false);
                        setRefreshing(false);
                        return;
                    }

                    const teachersList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate(),
                        submittedAt: doc.data().submittedAt?.toDate()
                    }));
                    setTeachers(teachersList);
                    setLoading(false);
                    setRefreshing(false);
                    setError(null);
                },
                (err) => {
                    console.error('Error fetching teachers:', err);
                    setError('Failed to load teachers. Please try again.');
                    setLoading(false);
                    setRefreshing(false);
                }
            );
        } catch (error) {
            console.error('Error setting up teacher listener:', error);
            setError('Failed to connect to the database. Please check your connection.');
            setLoading(false);
            setRefreshing(false);
            return () => {};
        }
    };

    const handleApprove = async (teacherId) => {
        try {
            const teacherRef = doc(db, 'users', teacherId);
            await updateDoc(teacherRef, {
                approved: true,
                status: 'active',
                approvedAt: new Date()
            });
            
            Alert.alert('Success', 'Teacher approved successfully');
        } catch (error) {
            console.error('Error approving teacher:', error);
            Alert.alert('Error', 'Failed to approve teacher. Please try again.');
        }
    };

    const handleReject = async (teacherId) => {
        Alert.alert(
            'Confirm Rejection',
            'Are you sure you want to reject this teacher? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const teacherRef = doc(db, 'users', teacherId);
                            await updateDoc(teacherRef, {
                                status: 'rejected',
                                rejectedAt: new Date()
                            });
                            Alert.alert('Success', 'Teacher rejected successfully');
                        } catch (error) {
                            console.error('Error rejecting teacher:', error);
                            Alert.alert('Error', 'Failed to reject teacher. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleBlock = async (teacherId, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        try {
            const teacherRef = doc(db, 'users', teacherId);
            await updateDoc(teacherRef, {
                status: newStatus,
                lastStatusUpdate: new Date()
            });
            
            Alert.alert('Success', `Teacher ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`);
        } catch (error) {
            console.error('Error updating teacher status:', error);
            Alert.alert('Error', 'Failed to update teacher status. Please try again.');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setupTeacherListener();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading teachers...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => setupTeacherListener()}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Teachers</Text>
            </View>

            <ScrollView 
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {teachers.filter(t => t.status === 'pending').length}
                        </Text>
                        <Text style={styles.statLabel}>Pending Approval</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {teachers.filter(t => t.status === 'active').length}
                        </Text>
                        <Text style={styles.statLabel}>Active Teachers</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {teachers.filter(t => t.status === 'rejected').length}
                        </Text>
                        <Text style={styles.statLabel}>Rejected</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pending Approvals</Text>
                    {teachers.filter(t => t.status === 'pending').length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
                            <Text style={styles.emptyStateText}>No pending approvals</Text>
                        </View>
                    ) : (
                        teachers.filter(t => t.status === 'pending').map(teacher => (
                            <View key={teacher.id} style={styles.teacherCard}>
                                <View style={styles.teacherInfo}>
                                    <Text style={styles.teacherName}>
                                        {teacher.username || 'Unnamed Teacher'}
                                    </Text>
                                    <Text style={styles.teacherEmail}>
                                        {teacher.email}
                                    </Text>
                                    <Text style={styles.teacherMobile}>
                                        Mobile: {teacher.mobile}
                                    </Text>
                                    <Text style={styles.teacherSubject}>
                                        Subject: {teacher.selectedSubject || 'Not specified'}
                                    </Text>
                                    <Text style={styles.submissionDate}>
                                        Submitted: {teacher.submittedAt?.toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.approveButton]}
                                        onPress={() => handleApprove(teacher.id)}
                                    >
                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.rejectButton]}
                                        onPress={() => handleReject(teacher.id)}
                                    >
                                        <Ionicons name="close" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Teachers</Text>
                    {teachers.filter(t => t.status === 'active').length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color="#666" />
                            <Text style={styles.emptyStateText}>No active teachers</Text>
                        </View>
                    ) : (
                        teachers.filter(t => t.status === 'active').map(teacher => (
                            <View key={teacher.id} style={styles.teacherCard}>
                                <View style={styles.teacherInfo}>
                                    <Text style={styles.teacherName}>
                                        {teacher.username || 'Unnamed Teacher'}
                                    </Text>
                                    <Text style={styles.teacherEmail}>
                                        {teacher.email}
                                    </Text>
                                    <Text style={styles.teacherMobile}>
                                        Mobile: {teacher.mobile}
                                    </Text>
                                    <Text style={styles.teacherSubject}>
                                        Subject: {teacher.selectedSubject || 'Not specified'}
                                    </Text>
                                    <View style={styles.statusContainer}>
                                        <Text style={[
                                            styles.statusBadge,
                                            { backgroundColor: teacher.status === 'active' ? '#4CAF50' : '#f44336' }
                                        ]}>
                                            {teacher.status === 'active' ? 'Active' : 'Blocked'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        teacher.status === 'blocked' ? styles.unblockButton : styles.blockButton
                                    ]}
                                    onPress={() => handleBlock(teacher.id, teacher.status)}
                                >
                                    <Ionicons 
                                        name={teacher.status === 'blocked' ? 'lock-open' : 'lock-closed'} 
                                        size={20} 
                                        color="#fff" 
                                    />
                                    <Text style={styles.buttonText}>
                                        {teacher.status === 'blocked' ? 'Unblock' : 'Block'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
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
    },
    statCard: {
        alignItems: 'center',
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
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    teacherCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teacherInfo: {
        marginBottom: 15,
    },
    teacherName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    teacherEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    teacherMobile: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    teacherSubject: {
        fontSize: 14,
        color: '#2196F3',
        marginBottom: 5,
    },
    statusContainer: {
        marginTop: 5,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    blockButton: {
        backgroundColor: '#FF9800',
    },
    unblockButton: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    submissionDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
});