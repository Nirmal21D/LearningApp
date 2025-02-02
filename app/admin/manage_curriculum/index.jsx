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
    deleteDoc,
    doc,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageCurriculum() {
    const router = useRouter();
    const [curriculums, setCurriculums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchCurriculums();
    }, []);

    const fetchCurriculums = async () => {
        try {
            setLoading(true);
            const curriculumsRef = collection(db, 'curriculums');
            const curriculumsQuery = query(curriculumsRef, orderBy('createdAt', 'desc'));
            const curriculumsSnapshot = await getDocs(curriculumsQuery);
            
            const curriculumsData = curriculumsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCurriculums(curriculumsData);
        } catch (error) {
            console.error('Error fetching curriculums:', error);
            Alert.alert(
                'Error',
                'Failed to fetch curriculums. Please check your connection and try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCurriculums();
    };

    const handleViewCurriculum = (curriculumId) => {
        router.push(`/admin/manage_curriculum/view_curriculum?curriculumId=${curriculumId}`);
    };

    const handleAddSubject = (curriculumId) => {
        router.push(`/admin/manage_curriculum/add_subject?curriculumId=${curriculumId}`);
    };

    const handleManageSubject = (curriculumId) => {
        router.push(`/admin/manage_curriculum/manage_subjects?curriculumId=${curriculumId}`);
    };

    const deleteSubjectsForCurriculum = async (curriculumId) => {
        const subjectsRef = collection(db, 'subjects');
        const subjectsQuery = query(subjectsRef, where('curriculumId', '==', curriculumId));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        
        const batch = writeBatch(db);
        subjectsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    };

    const handleDeleteCurriculum = async (curriculumId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this curriculum? This will also delete all associated subjects and cannot be undone.',
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
                                // First delete all subjects associated with this curriculum
                                await deleteSubjectsForCurriculum(curriculumId);
                                
                                // Then delete the curriculum itself
                                const curriculumRef = doc(db, 'curriculums', curriculumId);
                                await deleteDoc(curriculumRef);
                                
                                Alert.alert('Success', 'Curriculum and associated subjects deleted successfully!');
                                fetchCurriculums(); // Refresh the list
                            } catch (error) {
                                console.error('Error during deletion:', error);
                                Alert.alert(
                                    'Error',
                                    'Failed to delete curriculum. Please try again.'
                                );
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

    const renderCurriculumItem = ({ item }) => (
        <View style={styles.curriculumCard}>
            <View style={styles.curriculumInfo}>
                <Text style={styles.curriculumName}>{item.name}</Text>
                <Text style={styles.curriculumDescription}>{item.description}</Text>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => handleViewCurriculum(item.id)}
                >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => handleAddSubject(item.id)}
                >
                    <Ionicons name="add-outline" size={24} color="#4CAF50" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => handleManageSubject(item.id)}
                >
                    <Ionicons name="settings-outline" size={24} color="#FF9800" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCurriculum(item.id)}
                >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <FlatList
            data={curriculums}
            renderItem={renderCurriculumItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
            refreshing={refreshing}
            onRefresh={handleRefresh}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    curriculumCard: {
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
    curriculumInfo: {
        flex: 1,
    },
    curriculumName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    curriculumDescription: {
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
    addButton: {
        marginRight: 15,
        padding: 5,
    },
    manageButton: {
        marginRight: 15,
        padding: 5,
    },
    deleteButton: {
        marginRight: 0,
        padding: 5,
    },
});