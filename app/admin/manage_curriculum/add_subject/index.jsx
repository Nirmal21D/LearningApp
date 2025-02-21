import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, database } from '@/lib/firebase';

export default function AddSubject() {
    const { curriculumId } = useLocalSearchParams();
    const router = useRouter();
    const [subject, setSubject] = useState({
        name: '',
        description: '',
        difficulty: 'beginner',
        chapters: []
    });
    const [loading, setLoading] = useState(false);

    const createSubjectGroupChat = async (subjectId, subjectData, teacherId) => {
        try {
            console.log('Creating group chat for subject:', subjectData.name);

            // Get all students
            const studentsSnapshot = await getDocs(
                query(collection(db, 'users'), where('userType', '==', 'student'))
            );

            // Create participants object with teacher
            const participants = {};
            participants[teacherId] = {
                userType: 'teacher',
                joined: Date.now(),
                username: 'Teacher'
            };

            // Add all students to participants
            studentsSnapshot.forEach((doc) => {
                const studentData = doc.data();
                participants[doc.id] = {
                    userType: 'student',
                    joined: Date.now(),
                    username: studentData.username || 'Student'
                };
            });

            // Create group chat directly with subject ID
            const chatId = `subject_${subjectId}`;
            const groupChatRef = ref(database, `groupChats/${chatId}`);

            const groupChatData = {
                subjectId,
                subjectName: subjectData.name,
                description: subjectData.description,
                createdAt: Date.now(),
                participants,
                teacherId,
                curriculumId,
                lastMessage: {
                    text: `Welcome to ${subjectData.name} group chat!`,
                    senderId: 'system',
                    senderName: 'System',
                    timestamp: Date.now()
                },
                messages: {
                    welcome: {
                        text: `Welcome to ${subjectData.name} group chat!`,
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: Date.now()
                    }
                }
            };

            // Set the group chat data
            await set(groupChatRef, groupChatData);
            console.log('Group chat created with ID:', chatId);

            return chatId;
        } catch (error) {
            console.error('Error creating group chat:', error);
            throw error;
        }
    };

    const handleCreateSubject = async () => {
        try {
            setLoading(true);
            if (!subject.name || !subject.description) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            // Find teacher for this subject
            const teachersSnapshot = await getDocs(
                query(collection(db, 'users'), 
                where('userType', '==', 'teacher'),
                where('selectedSubject', '==', subject.name))
            );

            if (teachersSnapshot.empty) {
                Alert.alert('Error', 'No teacher found for this subject');
                return;
            }

            const teacherId = teachersSnapshot.docs[0].id;

            // First create the subject in Firestore
            const subjectData = {
                ...subject,
                createdAt: serverTimestamp(),
                totalChapters: subject.chapters.length,
                materials: [],
                curriculumId,
                teacherId
            };

            // Add subject to Firestore first
            const subjectRef = await addDoc(collection(db, 'subjects'), subjectData);
            const subjectId = subjectRef.id;

            // Create group chat using the actual subject ID
            const groupChatId = await createSubjectGroupChat(
                subjectId,
                subjectData,
                teacherId
            );

            // Update subject with group chat ID
            await updateDoc(doc(db, 'subjects', subjectId), {
                groupChatId
            });

            Alert.alert('Success', 'Subject and group chat created successfully!');
            router.push(`/admin/manage_curriculum/subjects?curriculumId=${curriculumId}`);

        } catch (error) {
            console.error('Error:', error);
            Alert.alert('Error', 'Failed to create subject and group chat');
        } finally {
            setLoading(false);
        }
    };

    const handleAddChapter = () => {
        setSubject({...subject, chapters: [...subject.chapters, '']});
    };

    const handleChapterChange = (index, text) => {
        const newChapters = [...subject.chapters];
        newChapters[index] = text;
        setSubject({...subject, chapters: newChapters});
    };

    const handleRemoveChapter = (index) => {
        const newChapters = [...subject.chapters];
        newChapters.splice(index, 1);
        setSubject({...subject, chapters: newChapters});
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Create New Subject</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Subject Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={subject.name}
                        onChangeText={(text) => setSubject({...subject, name: text})}
                        placeholder="Enter subject name"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={subject.description}
                        onChangeText={(text) => setSubject({...subject, description: text})}
                        placeholder="Enter subject description"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {subject.chapters.map((chapter, index) => (
                    <View key={index} style={styles.inputGroup}>
                        <Text style={styles.label}>Chapter {index + 1} *</Text>
                        <TextInput
                            style={styles.input}
                            value={chapter}
                            onChangeText={(text) => handleChapterChange(index, text)}
                            placeholder="Enter chapter name"
                        />
                        <TouchableOpacity 
                            style={styles.removeChapterButton}
                            onPress={() => handleRemoveChapter(index)}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity 
                    style={styles.addChapterButton}
                    onPress={handleAddChapter}
                >
                    <Ionicons name="add" size={24} color="#2196F3" />
                    <Text style={styles.addChapterText}>Add Chapter</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.createButton, loading && styles.disabledButton]}
                    onPress={handleCreateSubject}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Creating...' : 'Create Subject'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    addChapterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    addChapterText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#666',
    },
    removeChapterButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    createButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
}); 