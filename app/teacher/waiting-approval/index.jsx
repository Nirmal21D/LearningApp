import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function WaitingApproval() {
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeacherInfo = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const teacherDoc = await getDoc(doc(db, 'users', user.uid));
                if (teacherDoc.exists()) {
                    setTeacherInfo(teacherDoc.data());
                }
            } catch (error) {
                console.error('Error fetching teacher info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeacherInfo();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9C27B0" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="time-outline" size={80} color="#9C27B0" style={styles.icon} />
                <Text style={styles.title}>Waiting for Approval</Text>
                
                {teacherInfo && (
                    <View style={styles.teacherInfoBox}>
                        <Text style={styles.teacherName}>{teacherInfo.username}</Text>
                        <Text style={styles.teacherDetail}>Email: {teacherInfo.email}</Text>
                        <Text style={styles.teacherDetail}>Mobile: {teacherInfo.mobile}</Text>
                        <Text style={styles.teacherDetail}>Subject: {teacherInfo.selectedSubject}</Text>
                    </View>
                )}

                <Text style={styles.description}>
                    Your account is currently under review by the admin. You'll be able to access the dashboard once your account is approved.
                </Text>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>What happens next?</Text>
                    <View style={styles.infoItem}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
                        <Text style={styles.infoText}>Admin reviews your credentials</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="mail-outline" size={24} color="#2196F3" />
                        <Text style={styles.infoText}>You'll receive an email notification</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="log-in-outline" size={24} color="#FF9800" />
                        <Text style={styles.infoText}>Login again to access your dashboard</Text>
                    </View>
                </View>

                <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={24} color="#666" />
                    <Text style={styles.noteText}>
                        This process usually takes 1-2 business days. Please ensure your contact information is correct.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    teacherInfoBox: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '100%',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    teacherName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    teacherDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    infoBox: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    infoText: {
        fontSize: 16,
        color: '#444',
        flex: 1,
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        width: '100%',
        gap: 10,
    },
    noteText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
}); 