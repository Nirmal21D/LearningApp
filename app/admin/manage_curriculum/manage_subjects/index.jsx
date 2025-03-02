import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    where, 
    getDoc, 
    doc, 
    updateDoc,
    deleteDoc,
    writeBatch 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingScreen from '../../../../components/LoadingScreen';

export default function ManageSubject() {
    const { curriculumId } = useLocalSearchParams();
    const router = useRouter();
    const [curriculum, setCurriculum] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!curriculumId) {
            Alert.alert('Error', 'Curriculum ID is required');
            router.back();
            return;
        }
        fetchCurriculumData();
    }, [curriculumId]);

const fetchCurriculumData = async () => {
    try {
        setLoading(true);
        // Fetch curriculum data
        const curriculumRef = doc(db, 'curriculums', curriculumId);
        const curriculumDoc = await getDoc(curriculumRef);
        
        if (curriculumDoc.exists()) {
            const curriculumData = { id: curriculumDoc.id, ...curriculumDoc.data() };
            setCurriculum(curriculumData);
            
            // Fetch subjects for this curriculum
            const subjectsRef = collection(db, 'subjects');
            let subjectsQuery;
            
            try {
                // First try with ordering
                subjectsQuery = query(
                    subjectsRef, 
                    where('curriculumId', '==', curriculumId),
                    
                );
                const subjectsSnapshot = await getDocs(subjectsQuery);
                const subjectsData = subjectsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSubjects(subjectsData);
            } catch (error) {
                // If index error occurs, fall back to basic query
                if (error.code === 'failed-precondition' || error.code === 'resource-exhausted') {
                    console.log('Falling back to basic query without ordering');
                    subjectsQuery = query(
                        subjectsRef, 
                        where('curriculumId', '==', curriculumId)
                    );
                    const subjectsSnapshot = await getDocs(subjectsQuery);
                    const subjectsData = subjectsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    // Sort the data in memory
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    setSubjects(subjectsData);

                    // Show index creation message to admin
                    Alert.alert(
                        'Index Required',
                        'Please create an index for better performance. Contact the administrator.',
                        [
                            {
                                text: 'OK',
                                onPress: () => console.log('Index alert acknowledged')
                            }
                        ]
                    );
                } else {
                    throw error; // Re-throw if it's a different error
                }
            }
        } else {
            Alert.alert('Error', 'Curriculum not found');
            router.back();
        }
    } catch (error) {
        console.error('Error fetching curriculum data:', error);
        Alert.alert(
            'Error', 
            'Failed to fetch curriculum details. Please try again.'
        );
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCurriculumData();
    };

    const handleAddSubject = () => {
        router.push(`/admin/manage_curriculum/add_subject?curriculumId=${curriculumId}`);
    };

    const handleViewSubject = (subjectId) => {
        router.push(`/admin/manage_curriculum/view_subject?subjectId=${subjectId}&curriculumId=${curriculumId}`);
    };

    const handleManageChapters = (subjectId) => {
        router.push(`/admin/manage_curriculum/manage_chapters?subjectId=${subjectId}&curriculumId=${curriculumId}`);
    };

    const deleteChaptersForSubject = async (subjectId) => {
        const chaptersRef = collection(db, 'chapters');
        const chaptersQuery = query(chaptersRef, where('subjectId', '==', subjectId));
        const chaptersSnapshot = await getDocs(chaptersQuery);
        
        const batch = writeBatch(db);
        
        // Delete all chapters and their associated lessons
        for (const chapterDoc of chaptersSnapshot.docs) {
            // Delete lessons for this chapter
            const lessonsRef = collection(db, 'lessons');
            const lessonsQuery = query(lessonsRef, where('chapterId', '==', chapterDoc.id));
            const lessonsSnapshot = await getDocs(lessonsQuery);
            
            lessonsSnapshot.docs.forEach((lessonDoc) => {
                batch.delete(lessonDoc.ref);
            });
            
            // Delete the chapter
            batch.delete(chapterDoc.ref);
        }
        
        await batch.commit();
    };

    const handleDeleteSubject = async (subjectId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this subject? This will also delete all associated chapters and lessons and cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setLoading(true);
                                // First delete all chapters and lessons
                                await deleteChaptersForSubject(subjectId);
                                
                                // Then delete the subject itself
                                const subjectRef = doc(db, 'subjects', subjectId);
                                await deleteDoc(subjectRef);
                                
                                // Update the curriculum's subjects count if needed
                                if (curriculum.subjectsCount) {
                                    const curriculumRef = doc(db, 'curriculums', curriculumId);
                                    await updateDoc(curriculumRef, {
                                        subjectsCount: (curriculum.subjectsCount || 1) - 1
                                    });
                                }
                                
                                Alert.alert('Success', 'Subject and all associated content deleted successfully!');
                                fetchCurriculumData(); // Refresh the list
                            } catch (error) {
                                console.error('Error during deletion:', error);
                                Alert.alert('Error', 'Failed to delete subject. Please try again.');
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error in delete handler:', error);
            Alert.alert('Error', 'Failed to process deletion request');
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
                    onPress={() => handleViewSubject(item.id)}
                >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => handleManageChapters(item.id)}
                >
                    <Ionicons name="settings-outline" size={24} color="#FF9800" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSubject(item.id)}
                >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <LoadingScreen/>
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
                <Text style={styles.title}>{curriculum?.name || 'Curriculum'}</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={handleAddSubject}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={subjects}
                renderItem={renderSubjectItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.subjectsList}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No subjects found</Text>
                        <Text style={styles.emptySubtext}>Add a new subject to get started</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 15,
    },
    addButton: {
        padding: 5,
    },
    subjectsList: {
        padding: 20,
        flexGrow: 1,
    },
    subjectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
        padding: 5,
    },
    manageButton: {
        marginRight: 15,
        padding: 5,
    },
    deleteButton: {
        padding: 5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
});