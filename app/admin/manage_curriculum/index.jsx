import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageCurriculum() {
    const router = useRouter();
    const [curriculums, setCurriculums] = useState([]);

    useEffect(() => {
        fetchCurriculums();
    }, []);

    const fetchCurriculums = async () => {
        try {
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
            Alert.alert('Error', 'Failed to fetch curriculums');
        }
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

    const handleDeleteCurriculum = async (curriculumId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this curriculum? This action cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            // Delete curriculum logic here
                            Alert.alert('Success', 'Curriculum deleted successfully!');
                            fetchCurriculums(); // Refresh the list
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error deleting curriculum:', error);
            Alert.alert('Error', 'Failed to delete curriculum');
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

    return (
        <FlatList
            data={curriculums}
            renderItem={renderCurriculumItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.container}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    curriculumCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
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
    },
    addButton: {
        marginRight: 15,
    },
    manageButton: {
        marginRight: 15,
    },
    deleteButton: {
        marginRight: 15,
    },
}); 