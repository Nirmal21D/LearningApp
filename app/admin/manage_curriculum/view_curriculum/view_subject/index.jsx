import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ViewSubjectDetails() {
    const { subjectId } = useLocalSearchParams();
    const router = useRouter();
    const [subject, setSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [editingSubject, setEditingSubject] = useState(false);
    const [editedSubject, setEditedSubject] = useState(null);
    const [editingChapter, setEditingChapter] = useState(null);

    useEffect(() => {
        fetchSubject();
    }, [subjectId]);

    const fetchSubject = async () => {
        try {
            const subjectRef = doc(db, 'subjects', subjectId);
            const subjectDoc = await getDoc(subjectRef);
            
            if (subjectDoc.exists()) {
                const subjectData = { id: subjectDoc.id, ...subjectDoc.data() };
                setSubject(subjectData);
                setChapters(subjectData.chapters?.map((name, index) => ({
                    id: `chapter_${index}`,
                    name
                })) || []);
            } else {
                Alert.alert('Error', 'Subject not found');
                router.back();
            }
        } catch (error) {
            console.error('Error fetching subject:', error);
            Alert.alert('Error', 'Failed to fetch subject details');
        }
    };

    const handleUpdateSubject = async () => {
        try {
            await updateDoc(doc(db, 'subjects', subjectId), {
                name: editedSubject.name,
                description: editedSubject.description
            });
            setSubject(editedSubject);
            setEditingSubject(false);
        } catch (error) {
            console.error('Error updating subject:', error);
            Alert.alert('Error', 'Failed to update subject');
        }
    };

    const handleDeleteSubject = async () => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this subject?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'subjects', subjectId));
                            router.back();
                        } catch (error) {
                            console.error('Error deleting subject:', error);
                            Alert.alert('Error', 'Failed to delete subject');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateChapter = async () => {
        try {
            const updatedChapters = chapters.map(chapter => 
                chapter.id === editingChapter.id ? editingChapter : chapter
            );

            await updateDoc(doc(db, 'subjects', subjectId), {
                chapters: updatedChapters.map(chapter => chapter.name)
            });

            setChapters(updatedChapters);
            setEditingChapter(null);
        } catch (error) {
            console.error('Error updating chapter:', error);
            Alert.alert('Error', 'Failed to update chapter');
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this chapter?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedChapters = chapters.filter(chapter => chapter.id !== chapterId);
                            await updateDoc(doc(db, 'subjects', subjectId), {
                                chapters: updatedChapters.map(chapter => chapter.name)
                            });
                            setChapters(updatedChapters);
                        } catch (error) {
                            console.error('Error deleting chapter:', error);
                            Alert.alert('Error', 'Failed to delete chapter');
                        }
                    }
                }
            ]
        );
    };

    const renderChapterItem = ({ item }) => (
        <View style={styles.chapterCard}>
            {editingChapter?.id === item.id ? (
                <View style={styles.editChapterContainer}>
                    <TextInput
                        value={editingChapter.name}
                        onChangeText={(text) => setEditingChapter({...editingChapter, name: text})}
                        style={styles.editInput}
                    />
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={handleUpdateChapter}
                        >
                            <Ionicons name="save" size={24} color="green" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => setEditingChapter(null)}
                        >
                            <Ionicons name="close" size={24} color="red" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <View style={styles.chapterInfo}>
                        <Text style={styles.chapterName}>{item.name}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => setEditingChapter(item)}
                        >
                            <Ionicons name="create" size={24} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteChapter(item.id)}
                        >
                            <Ionicons name="trash" size={24} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {editingSubject ? (
                <View style={styles.editSubjectContainer}>
                    <TextInput
                        value={editedSubject.name}
                        onChangeText={(text) => setEditedSubject({...editedSubject, name: text})}
                        style={styles.editInput}
                        placeholder="Subject Name"
                    />
                    <TextInput
                        value={editedSubject.description}
                        onChangeText={(text) => setEditedSubject({...editedSubject, description: text})}
                        style={styles.editInput}
                        placeholder="Subject Description"
                    />
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={handleUpdateSubject}
                        >
                            <Ionicons name="save" size={24} color="green" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => setEditingSubject(false)}
                        >
                            <Ionicons name="close" size={24} color="red" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : subject && (
                <View style={styles.subjectCard}>
                    <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectDescription}>{subject.description}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => {
                                setEditedSubject({...subject});
                                setEditingSubject(true);
                            }}
                        >
                            <Ionicons name="create" size={24} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={handleDeleteSubject}
                        >
                            <Ionicons name="trash" size={24} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <FlatList
                data={chapters}
                renderItem={renderChapterItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <Text style={styles.emptyListText}>No chapters found</Text>
                }
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
    subjectCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    editSubjectContainer: {
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    editChapterContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    editInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginRight: 10,
        padding: 5,
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
    editButton: {
        marginRight: 15,
    },
    deleteButton: {
        marginRight: 15,
    },
    saveButton: {
        marginRight: 10,
    },
    cancelButton: {},
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
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
        fontSize: 16,
    },
});