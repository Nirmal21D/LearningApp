import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, getDoc, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
            <BlurView intensity={60} tint="light" style={styles.modalContainer}>
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
            </BlurView>
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
        <Animated.View 
            entering={FadeInDown.duration(500).delay(200).springify()}
            style={styles.subjectCard}
        >
            <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{item.name}</Text>
                <Text style={styles.subjectDescription}>{item.description}</Text>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => router.push(`/admin/manage_curriculum/view_curriculum/view_subject?subjectId=${item.id}`)}
                >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteSubject(item.id)}
                >
                    <Ionicons name="trash" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />
            <View style={[styles.blurCircle, styles.blurCircle3]} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.topBarContainer}>
                    <BlurView intensity={60} tint="light" style={[styles.backButton, styles.glassEffect]}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#333"/>
                        </TouchableOpacity>
                    </BlurView>
                    
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>{curriculum?.name || 'Curriculum'}</Text>
                        <Text style={styles.subtitle}>View and manage subjects</Text>
                    </View>
                </View>

                <FlatList
                    data={subjects}
                    renderItem={renderSubjectItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.subjectsList}
                    showsVerticalScrollIndicator={false}
                />

                <ConfirmModal 
                    visible={deleteModalVisible}
                    onClose={() => setDeleteModalVisible(false)}
                    onConfirm={confirmDelete}
                    title="Delete Subject"
                    message="Are you sure you want to delete this subject?"
                />
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
    topBarContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingTop: Platform.OS === 'web' ? 20 : 40,
        paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
        marginBottom: 15,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
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
    headerContainer: {
        marginLeft: 5,
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
    subjectsList: {
        padding: 20,
        paddingTop: 10,
    },
    subjectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Platform.OS === 'web' ? 16 : 12,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 20,
        marginBottom: 15,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        borderTopColor: 'rgba(255, 255, 255, 0.9)',
        borderLeftColor: 'rgba(255, 255, 255, 0.9)',
        borderRightColor: 'rgba(255, 255, 255, 0.7)',
        borderBottomColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    },
    subjectInfo: {
        flex: 1,
        paddingRight: 10,
    },
    subjectName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#1A237E',
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
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    viewButton: {
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    deleteButton: {
        shadowColor: '#ff4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1A237E',
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        color: '#666',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        padding: 12,
        borderRadius: 16,
        width: '45%',
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelButton: {
        backgroundColor: 'rgba(240, 240, 240, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    confirmButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '500',
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