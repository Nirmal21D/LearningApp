import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue 
} from 'react-native-reanimated';

// Create an animated pressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Create a reusable interactive component
const InteractiveContainer = ({ children, style, onPress }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <AnimatedPressable
            onPressIn={() => {
                scale.value = withSpring(0.98);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
            }}
            onPress={onPress}
            style={[animatedStyle, style]}
        >
            {children}
        </AnimatedPressable>
    );
};

export default function CreateTest() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTest = async () => {
        if (isSaving) return;
        setIsSaving(true);
        await handleCreateTest();
        setIsSaving(false);
    };

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const subjectsRef = collection(db, 'subjects');
                const subjectsSnapshot = await getDocs(subjectsRef);
                const subjectsList = subjectsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSubjects(subjectsList);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching subjects:', error);
                Alert.alert('Error', 'Failed to load subjects');
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) {
            setChapters([]);
            return;
        }
        const selectedSubjectData = subjects.find(subject => subject.id === selectedSubject);
        if (selectedSubjectData && selectedSubjectData.chapters) {
            setChapters(selectedSubjectData.chapters);
        } else {
            setChapters([]);
        }
    }, [selectedSubject, subjects]);

    const handleAddQuestion = (type) => {
        const newQuestion = type === 'multiple_choice' 
            ? {
                type: 'multiple_choice',
                question: '',
                options: ['', '', '', ''],
                answer: '' // Single answer storing the option value
            }
            : {
                type: 'text',
                question: '',
                answer: ''
              };
        setQuestions([...questions, newQuestion]);
    };

    const handleUpdateOption = (questionIndex, optionIndex, text) => {
        const newQuestions = [...questions];
        const question = newQuestions[questionIndex];
        const oldOption = question.options[optionIndex];
        
        // Update the option
        question.options[optionIndex] = text;
        
        // If this option was the answer, update it
        if (question.answer === oldOption) {
            question.answer = text;
        }
        
        setQuestions(newQuestions);
    };

    const handleCreateTest = async () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        if (!selectedSubject || !selectedChapter) {
            Alert.alert('Error', 'Please select both subject and chapter');
            return;
        }

        if (questions.length === 0) {
            Alert.alert('Error', 'Please add at least one question');
            return;
        }

        // Validate questions
        const isValid = questions.every(q => {
            if (q.type === 'text') {
                return q.question.trim() && q.answer.trim();
            } else {
                return q.question.trim() && 
                       q.options.every(opt => opt.trim()) && 
                       q.answer.trim(); // Check for single answer
            }
        });

        if (!isValid) {
            Alert.alert('Error', 'Please fill in all question fields and select a correct answer for each MCQ');
            return;
        }

        try {
            const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = selectedSubjectData?.name || '';

            const testData = {
                title: title.trim(),
                description: description.trim(),
                questions: questions.map(q => ({
                    ...q,
                    question: q.question.trim(),
                    options: q.type === 'multiple_choice' ? q.options.map(opt => opt.trim()) : undefined,
                    answer: q.answer.trim()
                })),
                subjectId: selectedSubject,
                subjectName,
                chapter: selectedChapter,
                createdAt: serverTimestamp(),
            };

            const testsRef = collection(db, 'tests');
            const docRef = await addDoc(testsRef, testData);
            
            console.log('Test saved successfully with ID:', docRef.id);
            
            Alert.alert(
                'Success',
                'Test created successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            console.error('Detailed error:', error);
            Alert.alert(
                'Error',
                'Failed to create test: ' + (error.message || 'Unknown error')
            );
        }
    };

    const renderQuestion = (question, index) => {
        if (question.type === 'multiple_choice') {
            return (
                <View style={styles.questionContent}>
                    <View style={styles.questionInputContainer}>
                        <Ionicons name="help-circle-outline" size={24} color="#666" style={styles.questionIcon} />
                        <TextInput 
                            style={styles.questionInput}
                            value={question.question}
                            onChangeText={text => {
                                const newQuestions = [...questions];
                                newQuestions[index].question = text;
                                setQuestions(newQuestions);
                            }}
                            placeholder="Enter your question"
                            placeholderTextColor="#999"
                            multiline
                        />
                    </View>
                    
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsLabel}>Answer Options</Text>
                        {question.options.map((option, optionIndex) => (
                            <View key={optionIndex} style={styles.optionWrapper}>
                                <TouchableOpacity 
                                    style={[
                                        styles.radioButton,
                                        question.correctOption === option && styles.radioButtonSelected
                                    ]}
                                    onPress={() => {
                                        const newQuestions = [...questions];
                                        newQuestions[index].correctOption = option;
                                        setQuestions(newQuestions);
                                    }}
                                >
                                    {question.correctOption === option && (
                                        <Ionicons name="checkmark" size={16} color="white" />
                                    )}
                                </TouchableOpacity>
                                <View style={styles.optionInputContainer}>
                                    <Text style={styles.optionNumber}>{String.fromCharCode(65 + optionIndex)}</Text>
                                    <TextInput 
                                        style={styles.optionInput}
                                        value={option}
                                        onChangeText={(text) => handleUpdateOption(index, optionIndex, text)}
                                        placeholder={`Option ${optionIndex + 1}`}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.questionContent}>
                <View style={styles.questionInputContainer}>
                    <Ionicons name="help-circle-outline" size={24} color="#666" style={styles.questionIcon} />
                    <TextInput 
                        style={styles.questionInput}
                        value={question.question}
                        onChangeText={text => {
                            const newQuestions = [...questions];
                            newQuestions[index].question = text;
                            setQuestions(newQuestions);
                        }}
                        placeholder="Enter your question"
                        placeholderTextColor="#999"
                        multiline
                    />
                </View>

                <View style={styles.answerContainer}>
                    <Text style={styles.answerLabel}>Correct Answer</Text>
                    <View style={styles.answerInputContainer}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#666" style={styles.answerIcon} />
                        <TextInput 
                            style={styles.answerInput}
                            value={question.answer}
                            onChangeText={text => {
                                const newQuestions = [...questions];
                                newQuestions[index].answer = text;
                                setQuestions(newQuestions);
                            }}
                            placeholder="Enter the correct answer"
                            placeholderTextColor="#999"
                            multiline
                        />
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Test</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Subject Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Details</Text>
                    
                    <InteractiveContainer style={styles.pickerContainer}>
                        <Ionicons name="book-outline" size={24} color="#666" style={styles.pickerIcon} />
                        <Picker
                            selectedValue={selectedSubject}
                            onValueChange={(itemValue) => {
                                setSelectedSubject(itemValue);
                                setSelectedChapter('');
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label="Select a subject" value="" />
                            {subjects.map((subject) => (
                                <Picker.Item 
                                    key={subject.id} 
                                    label={subject.name} 
                                    value={subject.id}
                                />
                            ))}
                        </Picker>
                    </InteractiveContainer>

                    <InteractiveContainer style={styles.pickerContainer}>
                        <Ionicons name="library-outline" size={24} color="#666" style={styles.pickerIcon} />
                        <Picker
                            selectedValue={selectedChapter}
                            onValueChange={setSelectedChapter}
                            style={styles.picker}
                            enabled={selectedSubject !== ''}
                        >
                            <Picker.Item label="Select a chapter" value="" />
                            {chapters.map((chapter, index) => (
                                <Picker.Item 
                                    key={index}
                                    label={chapter}
                                    value={chapter}
                                />
                            ))}
                        </Picker>
                    </InteractiveContainer>

                    <InteractiveContainer style={styles.inputContainer}>
                        <Ionicons name="create-outline" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Test Title"
                            placeholderTextColor="#999"
                        />
                    </InteractiveContainer>

                    <InteractiveContainer style={styles.inputContainer}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Test Description"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </InteractiveContainer>
                </View>

                {/* Questions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Questions</Text>
                    
                    {/* Questions List */}
                    {questions.length > 0 && (
                        <View style={styles.questionsList}>
                            {questions.map((question, index) => (
                                <View key={index} style={styles.questionCard}>
                                    <View style={styles.questionHeader}>
                                        <Text style={styles.questionNumber}>Question {index + 1}</Text>
                                        <TouchableOpacity 
                                            style={styles.deleteButton}
                                            onPress={() => {
                                                const newQuestions = questions.filter((_, i) => i !== index);
                                                setQuestions(newQuestions);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#FF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    {renderQuestion(question, index)}
                                </View>
                            ))}
                        </View>
                    )}
                    
                    {/* Add Question Buttons */}
                    <View style={styles.addQuestionSection}>
                        <Text style={styles.addQuestionTitle}>Add New Question</Text>
                        <View style={styles.questionButtons}>
                            <InteractiveContainer 
                                style={[styles.addButton, styles.textButton]}
                                onPress={() => handleAddQuestion('text')}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="white" />
                                <Text style={styles.buttonText}>Add Text Question</Text>
                            </InteractiveContainer>
                            
                            <InteractiveContainer 
                                style={[styles.addButton, styles.mcqButton]}
                                onPress={() => handleAddQuestion('multiple_choice')}
                            >
                                <Ionicons name="list-outline" size={20} color="white" />
                                <Text style={styles.buttonText}>Add MCQ</Text>
                            </InteractiveContainer>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleSaveTest}
                    disabled={isSaving}
                >
                    <Text style={styles.submitButtonText}>
                        {isSaving ? "Creating Test..." : "Create Test"}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    pickerIcon: {
        padding: 12,
    },
    picker: {
        flex: 1,
        height: 50,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    questionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    textButton: {
        backgroundColor: '#4CAF50',
    },
    mcqButton: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: 'white',
        fontWeight: '500',
    },
    questionCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    questionNumber: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    questionContent: {
        marginTop: 15,
    },
    questionInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    questionIcon: {
        padding: 12,
    },
    questionInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#333',
        minHeight: 60,
        textAlignVertical: 'top',
    },
    optionsContainer: {
        marginTop: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
    },
    optionsLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    optionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    optionInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    optionNumber: {
        width: 30,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        borderRightWidth: 1,
        borderRightColor: '#eee',
        paddingVertical: 10,
    },
    optionInput: {
        flex: 1,
        padding: 10,
        fontSize: 16,
        color: '#333',
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#2196F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        backgroundColor: '#2196F3',
    },
    answerContainer: {
        marginTop: 10,
    },
    answerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    answerInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    answerIcon: {
        padding: 12,
    },
    answerInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#333',
        minHeight: 60,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 30,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    questionsList: {
        marginBottom: 25,
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    deleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FFF5F5',
    },
    addQuestionSection: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 20,
        marginTop: 10,
    },
    addQuestionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 15,
    },
    questionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    textButton: {
        backgroundColor: '#4CAF50',
    },
    mcqButton: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
    questionCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    questionNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    questionContent: {
        marginTop: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
    },
    questionInputContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    optionsContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
});