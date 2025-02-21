import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Alert,
    TextInput,
    Modal,
    SafeAreaView,
    ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    updateDoc,
    doc,
    addDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

export default function SessionApproval() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const auth = getAuth();
    const router = useRouter();

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            const requestsRef = collection(db, 'sessionRequests');
            const q = query(
                requestsRef,
                where('teacherId', '==', auth.currentUser.uid),
                where('status', '==', 'pending')
            );
            
            const snapshot = await getDocs(q);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setPendingRequests(requests);
        } catch (error) {
            console.error('Error fetching requests:', error);
            Alert.alert('Error', 'Failed to load session requests');
        }
    };

    const handleApprove = async (request) => {
        try {
            const roomId = `session-${Math.random().toString(36).slice(2)}`;
            await updateDoc(doc(db, 'sessionRequests', request.id), {
                status: 'approved',
                roomId,
                updatedAt: serverTimestamp()
            });

            // Send notification to student
            await addDoc(collection(db, 'notifications'), {
                userId: request.studentId,
                title: 'Session Request Approved',
                message: `Your session request for "${request.topic}" has been approved`,
                type: 'session_approved',
                sessionId: request.id,
                createdAt: serverTimestamp(),
                read: false
            });

            Alert.alert('Success', 'Session request approved');
            fetchPendingRequests();
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert('Error', 'Failed to approve request');
        }
    };

    const handleReject = (request) => {
        setSelectedRequest(request);
        setShowRejectModal(true);
    };

    const submitRejection = async () => {
        if (!rejectionReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejection');
            return;
        }

        try {
            await updateDoc(doc(db, 'sessionRequests', selectedRequest.id), {
                status: 'rejected',
                rejectionReason: rejectionReason,
                updatedAt: serverTimestamp()
            });

            // Send notification to student
            await addDoc(collection(db, 'notifications'), {
                userId: selectedRequest.studentId,
                title: 'Session Request Rejected',
                message: `Your session request for "${selectedRequest.topic}" was rejected`,
                reason: rejectionReason,
                type: 'session_rejected',
                sessionId: selectedRequest.id,
                createdAt: serverTimestamp(),
                read: false
            });

            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedRequest(null);
            fetchPendingRequests();
            Alert.alert('Success', 'Session request rejected');
        } catch (error) {
            console.error('Error rejecting request:', error);
            Alert.alert('Error', 'Failed to reject request');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Session Requests</Text>
            </View>

            <ScrollView style={styles.content}>
                {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.studentName}>
                                    From: {request.studentName}
                                </Text>
                                <Text style={styles.topic}>
                                    Topic: {request.topic}
                                </Text>
                                <Text style={styles.description}>
                                    {request.description}
                                </Text>
                                <Text style={styles.dateTime}>
                                    Requested for: {new Date(request.requestedDate.toDate()).toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.approveButton]}
                                    onPress={() => handleApprove(request)}
                                >
                                    <Ionicons name="checkmark" size={20} color="white" />
                                    <Text style={styles.buttonText}>Approve</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.rejectButton]}
                                    onPress={() => handleReject(request)}
                                >
                                    <Ionicons name="close" size={20} color="white" />
                                    <Text style={styles.buttonText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noRequestsText}>No pending requests</Text>
                )}
            </ScrollView>

            <Modal
                visible={showRejectModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rejection Reason</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="Enter reason for rejection"
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                    setSelectedRequest(null);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitRejection}
                            >
                                <Text style={styles.modalButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
  },
  listContainer: {
    padding: 15,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    marginBottom: 15,
  },
  topic: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 30,
  },
}); 