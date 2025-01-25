import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

    const handleCreateSubject = async () => {
        try {
            setLoading(true);
            if (!subject.name || !subject.description) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            const subjectData = {
                ...subject,
                createdAt: serverTimestamp(),
                totalChapters: subject.chapters.length,
                materials: [],
                curriculumId: curriculumId
            };

            const docRef = await addDoc(collection(db, 'subjects'), subjectData);
            Alert.alert('Success', 'Subject created successfully!');
            router.push(`/admin/manage_curriculum/subjects?curriculumId=${curriculumId}`);
        } catch (error) {
            console.error('Error creating subject:', error);
            Alert.alert('Error', 'Failed to create subject');
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