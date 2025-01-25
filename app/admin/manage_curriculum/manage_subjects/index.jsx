import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageSubject() {
    const { subjectId } = useLocalSearchParams();
    const router = useRouter();
    const [subject, setSubject] = useState(null);
    const [chapters, setChapters] = useState([]);

    useEffect(() => {
        fetchSubjectData();
    }, [subjectId]);

    const fetchSubjectData = async () => {
        try {
            const subjectRef = doc(db, 'subjects', subjectId);
            const subjectDoc = await getDoc(subjectRef);
            
            if (subjectDoc.exists()) {
                setSubject({ id: subjectDoc.id, ...subjectDoc.data() });
                setChapters(subjectDoc.data().chapters || []);
            } else {
                Alert.alert('Error', 'Subject not found');
                router.back();
            }
        } catch (error) {
            console.error('Error fetching subject data:', error);
            Alert.alert('Error', 'Failed to fetch subject details');
        }
    };

    const handleViewChapter = (chapterId) => {
        router.push(`/admin/manage_curriculum/view_chapter?chapterId=${chapterId}`);
    };

    const handleManageChapter = (chapterId) => {
        router.push(`/admin/manage_curriculum/manage_chapter?chapterId=${chapterId}`);
    };

    const handleDeleteChapter = async (chapterId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this chapter? This action cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            // Delete chapter logic here
                            Alert.alert('Success', 'Chapter deleted successfully!');
                            fetchSubjectData(); // Refresh the list
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error deleting chapter:', error);
            Alert.alert('Error', 'Failed to delete chapter');
        }
    };

    const renderChapterItem = ({ item }) => (
        <View style={styles.chapterCard}>
            <View style={styles.chapterInfo}>
                <Text style={styles.chapterName}>{item.name}</Text>
                <Text style={styles.chapterDescription}>{item.description}</Text>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => handleViewChapter(item.id)}
                >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => handleManageChapter(item.id)}
                >
                    <Ionicons name="settings-outline" size={24} color="#FF9800" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteChapter(item.id)}
                >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
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
                <Text style={styles.title}>{subject?.name || 'Subject'}</Text>
            </View>

            <FlatList
                data={chapters}
                renderItem={renderChapterItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chaptersList}
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
    chaptersList: {
        padding: 20,
    },
    chapterCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    chapterInfo: {
        flex: 1,
    },
    chapterName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    chapterDescription: {
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
    manageButton: {
        marginRight: 15,
    },
    deleteButton: {
        marginRight: 15,
    },
});