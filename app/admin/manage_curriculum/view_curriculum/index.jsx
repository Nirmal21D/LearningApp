import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, getDoc, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Confirmation Modal Component
const ConfirmModal = ({ 
    visible, 
    onClose, 
    onConfirm, 
    title = 'Confirm Deletion', 
    message = 'Are you sure you want to delete this item?' 
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalMessage}>{message}</Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]} 
                        onPress={onClose}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.confirmButton]} 
                        onPress={onConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export default function ViewCurriculum() {
    const { curriculumId } = useLocalSearchParams();
    const router = useRouter();
    const [curriculum, setCurriculum] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState(null);

    useEffect(() => {
        fetchCurriculumData();
    }, [curriculumId]);

    const fetchCurriculumData = async () => {
        try {
            const curriculumRef = doc(db, 'curriculums', curriculumId);
            const curriculumDoc = await getDoc(curriculumRef);
            
            if (curriculumDoc.exists()) {
                setCurriculum({ id: curriculumDoc.id, ...curriculumDoc.data() });
            }

            const subjectsRef = collection(db, 'subjects');
            const subjectsQuery = query(
                subjectsRef, 
                where('curriculumId', '==', curriculumId), 
                orderBy('createdAt', 'desc')
            );
            const subjectsSnapshot = await getDocs(subjectsQuery);
            
            const subjectsData = subjectsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSubjects(subjectsData);
        } catch (error) {
            console.error('Error fetching curriculum data:', error);
        }
    };

    const handleDeleteSubject = (subjectId) => {
        setSubjectToDelete(subjectId);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        try {
            if (!subjectToDelete) return;

            const subjectDocRef = doc(db, 'subjects', subjectToDelete);
            await deleteDoc(subjectDocRef);

            setSubjects(currentSubjects => 
                currentSubjects.filter(subject => subject.id !== subjectToDelete)
            );

            setDeleteModalVisible(false);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const renderSubjectItem = ({ item }) => (
        <View style={styles.subjectCard}>
            <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{item.name}</Text>
                <Text style={styles.subjectDescription}>{item.description}</Text>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => router.push(`/admin/manage_curriculum/view_curriculum/view_subject?subjectId=${item.id}`)}
                >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSubject(item.id)}
                >
                    <Ionicons name="trash" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>{curriculum?.name || 'Curriculum'}</Text>
            </View>

            <FlatList
                data={subjects}
                renderItem={renderSubjectItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.subjectsList}
            />

            <ConfirmModal 
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Subject"
                message="Are you sure you want to delete this subject?"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subjectsList: {
        padding: 20,
    },
    subjectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    subjectInfo: {
        flex: 1,
    },
    subjectName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    subjectDescription: {
        fontSize: 14,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewButton: {
        marginRight: 15,
    },
    deleteButton: {
        marginRight: 15,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    confirmButton: {
        backgroundColor: '#ff4444',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '500',
    },
});