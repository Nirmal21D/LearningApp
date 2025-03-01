import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, database } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

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

    const createSubjectGroupChat = async (subjectId, subjectData, teacherId = null) => {
        try {
            console.log('Creating group chat for subject:', subjectData.name);

            // Get all students
            const studentsSnapshot = await getDocs(
                query(collection(db, 'users'), where('userType', '==', 'student'))
            );

            // Create participants object
            const participants = {};
            
            // Add teacher if exists
            if (teacherId) {
                participants[teacherId] = {
                    userType: 'teacher',
                    joined: Date.now(),
                    username: 'Teacher'
                };
            }

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
                teacherId: teacherId || 'unassigned',
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

            let teacherId = null;

            // Try to find teacher but don't require one
            try {
                const teachersSnapshot = await getDocs(
                    query(collection(db, 'users'), 
                    where('userType', '==', 'teacher'),
                    where('selectedSubject', '==', subject.name))
                );

                if (!teachersSnapshot.empty) {
                    teacherId = teachersSnapshot.docs[0].id;
                }
            } catch (error) {
                console.warn('Error finding teacher:', error);
                // Continue without teacher
            }

            // Create the subject in Firestore
            const subjectData = {
                ...subject,
                createdAt: serverTimestamp(),
                totalChapters: subject.chapters.length,
                materials: [],
                curriculumId,
                teacherId: teacherId || 'unassigned' // Use 'unassigned' if no teacher found
            };

            // Add subject to Firestore
            const subjectRef = await addDoc(collection(db, 'subjects'), subjectData);
            const subjectId = subjectRef.id;

            // Create group chat using the actual subject ID
            const groupChatId = await createSubjectGroupChat(
                subjectId,
                subjectData,
                teacherId // This can be null
            );

            // Update subject with group chat ID
            await updateDoc(doc(db, 'subjects', subjectId), {
                groupChatId
            });

            Alert.alert(
                'Success', 
                teacherId 
                    ? 'Subject and group chat created successfully!' 
                    : 'Subject and group chat created successfully! No teacher assigned yet.'
            );
            router.push(`/admin/dashboard`);

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
                <View style={styles.headerContainer}>
                    <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#333"/>
                        </TouchableOpacity>
                    </BlurView>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Create New Subject</Text>
                        <Text style={styles.subtitle}>Add details for your new subject</Text>
                    </View>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollViewContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        entering={FadeInDown.duration(1000).springify()}
                        style={styles.formContainer}
                    >
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Subject Name *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="book-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={subject.name}
                                    onChangeText={(text) => setSubject({...subject, name: text})}
                                    placeholder="Enter subject name"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <Ionicons name="information-circle-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={subject.description}
                                    onChangeText={(text) => setSubject({...subject, description: text})}
                                    placeholder="Enter subject description"
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>

                        {subject.chapters.map((chapter, index) => (
                            <View key={index} style={styles.inputGroup}>
                                <Text style={styles.label}>Chapter {index + 1} *</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="list-outline" size={20} color="#666" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={chapter}
                                        onChangeText={(text) => handleChapterChange(index, text)}
                                        placeholder="Enter chapter name"
                                    />
                                    <TouchableOpacity 
                                        onPress={() => handleRemoveChapter(index)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity 
                            style={styles.addChapterButton}
                            onPress={handleAddChapter}
                        >
                            <BlurView intensity={0} tint="light" style={[styles.addChapterButtonInner, styles.glassEffect]}>
                                <Ionicons name="add" size={24} color="#2196F3" />
                                <Text style={styles.addChapterText}>Add Chapter</Text>
                            </BlurView>
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
                    </Animated.View>
                </ScrollView>
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
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Platform.OS === 'web' ? 20 : 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
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
    titleContainer: {
        marginLeft: 5,
    },
    title: {
        fontSize: Platform.OS === 'web' ? 28 : 24,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Platform.OS === 'web' ? 16 : 14,
        color: '#666',
        lineHeight: 18,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 40,
    },
    formContainer: {
        margin: Platform.OS === 'web' ? 20 : 16,
        padding: Platform.OS === 'web' ? 25 : 20,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 24,
        borderTopColor: 'rgba(255, 255, 255, 0.9)',
        borderLeftColor: 'rgba(255, 255, 255, 0.9)',
        borderRightColor: 'rgba(255, 255, 255, 0.7)',
        borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#1A237E',
        fontWeight: '500',
        paddingLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        shadowOpacity: 0.01,
        padding: Platform.OS === 'web' ? 16 : 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.02,
        shadowRadius: 12,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: Platform.OS === 'web' ? 16 : 14,
        color: '#333',
        marginLeft: 12,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    addChapterButton: {
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    addChapterButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    addChapterText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600',
    },
    createButton: {
        backgroundColor: 'rgba(33, 150, 243, 0.75)',
        padding: Platform.OS === 'web' ? 16 : 14,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: 'rgba(204, 204, 204, 0.75)',
        shadowOpacity: 0.15,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
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