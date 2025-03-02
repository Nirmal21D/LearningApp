import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, SafeAreaView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue,
    FadeInDown
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ExcelUpload from '../../../components/ExcelUpload';

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
    const [duration, setDuration] = useState('30'); // Default 30 minutes
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
                answer: '',
                correctOption: ''
            }
            : {
                type: 'text',
                question: '',
                answer: ''
              };
        setQuestions([...questions, newQuestion]);
    };
    
    const handleQuestionsLoaded = (loadedQuestions) => {
        setQuestions(loadedQuestions);
    };

    const handleUpdateOption = (questionIndex, optionIndex, text) => {
        const newQuestions = [...questions];
        const question = newQuestions[questionIndex];
        const oldOption = question.options[optionIndex];
        
        // Update the option
        question.options[optionIndex] = text;
        
        // If this option was the answer, update it
        if (question.correctOption === oldOption) {
            question.correctOption = text;
            question.answer = text; // Also update answer field
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

        if (!duration || isNaN(parseInt(duration))) {
            Alert.alert('Error', 'Please enter a valid duration in minutes');
            return;
        }

        if (questions.length === 0) {
            Alert.alert('Error', 'Please add at least one question');
            return;
        }

        // Prepare questions for saving - make sure no undefined values
        const sanitizedQuestions = questions.map(q => {
            if (q.type === 'text') {
                return {
                    type: q.type,
                    question: q.question.trim(),
                    answer: q.answer.trim()
                };
            } else {
                // For MCQs, make sure we're using the correctOption as the answer
                // if answer isn't set yet
                const answer = q.answer || q.correctOption || '';
                return {
                    type: q.type,
                    question: q.question.trim(),
                    options: q.options.map(opt => opt.trim()),
                    answer: answer.trim()
                };
            }
        });

        // Validate questions
        const isValid = sanitizedQuestions.every(q => {
            if (q.type === 'text') {
                return q.question && q.answer;
            } else {
                return q.question && 
                       q.options.every(opt => opt) && 
                       q.answer; // Check for single answer
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
                questions: sanitizedQuestions,
                subjectId: selectedSubject,
                subjectName,
                chapter: selectedChapter,
                duration: parseInt(duration), // Store as number
                // Gamification fields
                xpReward: Math.round(parseInt(duration) * 2), // XP is based on test duration
                pointsPerQuestion: 10, // Base points per question
                streakBonus: 5, // Bonus points for answering consecutive questions correctly
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
                                        newQuestions[index].answer = option; // Set answer to match correctOption
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
                <LinearGradient
                    colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Decorative blur circles */}
            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />
            <View style={[styles.blurCircle, styles.blurCircle3]} />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#333"/>
                        </TouchableOpacity>
                    </BlurView>
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerTitle}>Create New Test</Text>
                        <Text style={styles.headerSubtitle}>Add questions and configure your test settings</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.contentContainer}>
                    <ScrollView 
                        style={styles.scrollView} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollViewContent}
                    >
                        <Animated.View 
                            entering={FadeInDown.duration(1000).springify()} 
                            style={styles.formContainer}
                        >
                            {/* Test Details Section */}
                            <View style={styles.glassCard}>
                                <Text style={styles.sectionTitle}>Test Details</Text>
                                
                                <View style={styles.inputContainer}>
                                    <Ionicons name="book-outline" size={24} color="#666" style={styles.inputIcon} />
                                    <Picker
                                        selectedValue={selectedSubject}
                                        onValueChange={(itemValue) => {
                                            setSelectedSubject(itemValue);
                                            setSelectedChapter('');
                                        }}
                                        style={styles.input}
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
                                </View>

                                <View style={styles.inputContainer}>
                                    <Ionicons name="library-outline" size={24} color="#666" style={styles.inputIcon} />
                                    <Picker
                                        selectedValue={selectedChapter}
                                        onValueChange={setSelectedChapter}
                                        style={styles.input}
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
                                </View>

                                <View style={styles.inputContainer}>
                                    <Ionicons name="create-outline" size={24} color="#666" style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Test Title"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
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
                                </View>

                                <View style={styles.inputContainer}>
                                    <Ionicons name="time-outline" size={24} color="#666" style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input}
                                        value={duration}
                                        onChangeText={setDuration}
                                        placeholder="Test Duration (minutes)"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                    />
                                </View>

                                {/* Gamification Preview */}
                                <View style={styles.gamificationPreview}>
                                    <Text style={styles.gamificationTitle}>Rewards Preview</Text>
                                    <View style={styles.rewardItem}>
                                        <Ionicons name="star-outline" size={20} color="#FFD700" />
                                        <Text style={styles.rewardText}>XP Reward: {parseInt(duration || 0) * 2} XP</Text>
                                    </View>
                                    <View style={styles.rewardItem}>
                                        <Ionicons name="trophy-outline" size={20} color="#FF9800" />
                                        <Text style={styles.rewardText}>Points per Question: 10 pts</Text>
                                    </View>
                                    <View style={styles.rewardItem}>
                                        <Ionicons name="flame-outline" size={20} color="#FF5722" />
                                        <Text style={styles.rewardText}>Streak Bonus: 5 pts per correct answer in a row</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Questions Section */}
                            <View style={styles.glassCard}>
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
                                        <TouchableOpacity 
                                            style={[styles.addButton, styles.textButton]}
                                            onPress={() => handleAddQuestion('text')}
                                        >
                                            <Ionicons name="add-circle-outline" size={20} color="white" />
                                            <Text style={styles.buttonText}>Add Text Question</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={[styles.addButton, styles.mcqButton]}
                                            onPress={() => handleAddQuestion('multiple_choice')}
                                        >
                                            <Ionicons name="list-outline" size={20} color="white" />
                                            <Text style={styles.buttonText}>Add MCQ</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                
                                {/* Import Questions Section */}
                                <View style={styles.importSection}>
                                    <Text style={styles.sectionTitle}>Import Questions</Text>
                                    <ExcelUpload 
                                        onQuestionsLoaded={handleQuestionsLoaded}
                                        setSelectedSubject={(subjectId) => {
                                            const subject = subjects.find(s => s.id === subjectId);
                                            if (subject) {
                                                setSelectedSubject(subjectId);
                                            }
                                        }}
                                        setSelectedChapter={setSelectedChapter}
                                        setTitle={setTitle}
                                        setDescription={setDescription}
                                        setDuration={setDuration}
                                    />
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
                        </Animated.View>
                    </ScrollView>
                </View>
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
    loadingText: {
        fontSize: 18,
        color: '#1A237E',
        textAlign: 'center',
        marginTop: 50,
    },
    // Header styles
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 40,
        left: Platform.OS === 'web' ? 20 : 16,
        zIndex: 10,
        paddingHorizontal: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassEffect: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 9,
    },
    headerContainer: {
        marginLeft: 10,
    },
    headerTitle: {
        fontSize: Platform.OS === 'web' ? 34 : 28,
        fontWeight: 'bold',
        color: '#1A237E',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: Platform.OS === 'web' ? 17 : 14,
        color: '#666',
        lineHeight: 18,
        marginRight: 25,
    },
    // Content container
    contentContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'web' ? 100 : 120,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
        paddingBottom: 40,
    },
    formContainer: {
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
    },
    // Glass card effect
    glassCard: {
        marginBottom: 25,
        padding: Platform.OS === 'web' ? 30 : 20,
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
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 20,
    },
    // Input styling
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
        marginBottom: 15,
    },
    inputIcon: {
        marginRight: 10,
        marginLeft: 5,
    },
    input: {
        flex: 1,
        fontSize: Platform.OS === 'web' ? 16 : 14,
        color: '#333',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    // Gamification Preview
    gamificationPreview: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    gamificationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 12,
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    rewardText: {
        fontSize: 14,
        color: '#555',
    },
    // Question Cards
    questionsList: {
        marginBottom: 25,
    },
    questionCard: {
        marginBottom: 20,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    questionNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A237E',
    },
    deleteButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
    },
    // Question content
    questionContent: {
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    questionInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.7)',
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
    // Options for multiple-choice
    optionsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    optionsLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 15,
    },
    optionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
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
    optionInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 12,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.7)',
    },
    optionNumber: {
        width: 30,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 10,
    },
    optionInput: {
        flex: 1,
        padding: 10,
        fontSize: 16,
        color: '#333',
    },
    // Answer container for text questions
    answerContainer: {
        marginTop: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    answerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 12,
    },
    answerInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.7)',
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
    // Add Question buttons section
    addQuestionSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        padding: 20,
        marginTop: 25,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    addQuestionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 15,
    },
    questionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
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
        fontWeight: '600',
    },
    // Import Section
    importSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    // Submit Button
    submitButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    // Decorative blur circles
    blurCircle: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.5,
    },
    blurCircle1: {
        width: 300,
        height: 300,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        top: -100,
        right: -50,
    },
    blurCircle2: {
        width: 250,
        height: 250,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        bottom: 100,
        left: -100,
    },
    blurCircle3: {
        width: 200,
        height: 200,
        backgroundColor: 'rgba(156, 39, 176, 0.08)',
        bottom: -50,
        right: 100,
    }
});