import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

export default function TestPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { testId } = params;

    const [user, setUser] = useState(null);
    const [testData, setTestData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [previousAttempt, setPreviousAttempt] = useState(null);
    const [score, setScore] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async currentUser => {
            setUser(currentUser);
            if (!currentUser) {
                router.push('/login');
                return;
            }

            try {
                // Check if user has already taken this test
                const userProgressRef = doc(db, 'userProgress', `${currentUser.uid}_${testId}`);
                const userProgressDoc = await getDoc(userProgressRef);

                // Fetch test data
                const testRef = doc(db, 'tests', testId);
                const testDoc = await getDoc(testRef);

                if (testDoc.exists()) {
                    const data = testDoc.data();
                    const questionsWithIds = data.questions.map((q, index) => ({
                        ...q,
                        id: `q_${index}`,
                        question: q.question,
                        type: q.type,
                        options: q.type === 'multiple_choice' ? q.options : [],
                        correctOption: q.correctOption,
                        answer: q.answer
                    }));

                    setTestData({
                        title: data.title,
                        chapter: data.chapter,
                        subjectId: data.subjectId,
                        subjectName: data.subjectName,
                        questions: questionsWithIds
                    });

                    if (userProgressDoc.exists()) {
                        const progressData = userProgressDoc.data();
                        setPreviousAttempt(progressData);

                        // Calculate score
                        let correctAnswers = 0;
                        questionsWithIds.forEach(question => {
                            const userAnswer = progressData.answers[question.id];
                            if (question.type === 'multiple_choice') {
                                if (userAnswer === question.correctOption) correctAnswers++;
                            } else {
                                if (userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()) correctAnswers++;
                            }
                        });

                        setScore({
                            correct: correctAnswers,
                            total: questionsWithIds.length,
                            percentage: (correctAnswers / questionsWithIds.length) * 100
                        });
                    } else {
                        const initialAnswers = {};
                        questionsWithIds.forEach(q => {
                            initialAnswers[q.id] = '';
                        });
                        setUserAnswers(initialAnswers);
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
                Alert.alert('Error', 'Failed to load test data');
            }
        });

        return () => unsubscribe();
    }, [testId, router]);

    const saveTestResult = async (userId, testId, answers, score, testData) => {
        try {
            const userProgressRef = doc(db, 'userProgress', `${userId}_${testId}`);
            const resultData = {
                userId,
                testId,
                answers,
                score,
                title: testData.title,
                chapter: testData.chapter,
                subjectId: testData.subjectId,
                subjectName: testData.subjectName,
                timestamp: new Date().toISOString(),
            };
            await setDoc(userProgressRef, resultData);
            console.log('Test result saved successfully!');
        } catch (error) {
            console.error('Error saving test result:', error);
            Alert.alert('Error', 'Failed to save your test results. Please try again.');
        }
    };

    const handleSubmitTest = async () => {
        try {
            let correctAnswers = 0;
            testData.questions.forEach(question => {
                const userAnswer = userAnswers[question.id];
                if (question.type === 'multiple_choice') {
                    if (userAnswer === question.correctOption || userAnswer === question.answer) correctAnswers++;
                } else {
                    if (userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()) correctAnswers++;
                }
            });

            const scoreData = {
                correct: correctAnswers,
                total: testData.questions.length,
                percentage: (correctAnswers / testData.questions.length) * 100,
            };

            // Save to Firestore
            await saveTestResult(user.uid, testId, userAnswers, scoreData, testData);

            // Update local state
            setScore(scoreData);
            setPreviousAttempt({ answers: userAnswers });
        } catch (error) {
            console.error('Error submitting test:', error);
            Alert.alert('Error', 'An error occurred while submitting the test. Please try again.');
        }
    };

    const renderPreviousAttempt = () => (
        <ScrollView style={styles.resultsContainer}>
            <View style={styles.resultHeader}>
                <Text style={styles.resultHeaderTitle}>{testData.title}</Text>
                <Text style={styles.resultHeaderSubtitle}>{testData.chapter}</Text>
            </View>
    
            <View style={styles.scoreCard}>
                <View style={styles.scoreCircle}>
                    <Text style={styles.scorePercentage}>{score.percentage.toFixed(0)}%</Text>
                    <Text style={styles.scoreText}>
                        {score.correct}/{score.total} Correct
                    </Text>
                </View>
            </View>
    
            <View style={styles.resultDetails}>
                {testData.questions.map((question, index) => {
                    const userAnswer = previousAttempt.answers[question.id];
                    const isCorrect = question.type === 'multiple_choice' 
                        ? userAnswer === question.correctOption
                        : userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    
                    return (
                        <View 
                            key={question.id} 
                            style={[
                                styles.questionResultCard, 
                                isCorrect ? styles.correctQuestionCard : styles.incorrectQuestionCard
                            ]}
                        >
                            <View style={styles.questionResultHeader}>
                                <Text style={styles.questionResultNumber}>
                                    Question {index + 1}
                                </Text>
                                <Ionicons 
                                    name={isCorrect ? "checkmark-circle" : "close-circle"} 
                                    size={24} 
                                    color={isCorrect ? "#4CAF50" : "#F44336"}
                                />
                            </View>
                            
                            <Text style={styles.questionResultText}>
                                {question.question}
                            </Text>
    
                            <View style={styles.answerSection}>
                                <Text style={styles.answerLabel}>Your Answer:</Text>
                                <Text style={[
                                    styles.answerText, 
                                    isCorrect ? styles.correctAnswerText : styles.incorrectAnswerText
                                ]}>
                                    {userAnswer}
                                </Text>
                            </View>
    
                            {!isCorrect && (
                                <View style={styles.correctAnswerSection}>
                                    <Text style={styles.answerLabel}>Correct Answer:</Text>
                                    <Text style={styles.correctAnswerText}>
                                        {question.type === 'multiple_choice' 
                                            ? question.correctOption 
                                            : question.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
            
            <TouchableOpacity 
                style={styles.returnButton}
                onPress={() => router.push(`/subject?subjectId=${testData.subjectId}&subjectName=${testData.subjectName}`)}
            >
                <Text style={styles.returnButtonText}>Return to Subject</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
        </ScrollView>
    );
    
  

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (previousAttempt && score) {
        return (
            <SafeAreaView style={styles.container}>
                {renderPreviousAttempt()}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.testContainer}>
                    {testData.questions.map((question, index) => (
                        <View key={question.id} style={styles.questionContainer}>
                            <Text style={styles.questionText}>{index + 1}. {question.question}</Text>
                            {question.type === 'multiple_choice' ? (
                                question.options.map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.optionButton,
                                            userAnswers[question.id] === option ? styles.selectedOption : null,
                                        ]}
                                        onPress={() => setUserAnswers(prev => ({ ...prev, [question.id]: option }))}
                                    >
                                        <Text style={styles.optionText}>{option}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <TextInput
                                    style={styles.textInput}
                                    value={userAnswers[question.id]}
                                    onChangeText={text => setUserAnswers(prev => ({ ...prev, [question.id]: text }))}
                                />
                            )}
                        </View>
                    ))}
                    <TouchableOpacity 
                        style={styles.submitButton}
                        onPress={handleSubmitTest}
                    >
                        <Text style={styles.submitButtonText}>Submit Test</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f4f4f4',
    },
    testContainer: {
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 15,
      margin: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    questionContainer: {
      marginBottom: 20,
      backgroundColor: '#f9f9f9',
      padding: 15,
      borderRadius: 10,
    },
    questionText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
      marginBottom: 10,
    },
    optionButton: {
      backgroundColor: '#f0f0f0',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedOption: {
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
    },
    optionText: {
      color: '#333',
      fontSize: 15,
    },
    textInput: {
      backgroundColor: '#f0f0f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 15,
    },
    submitButton: {
      backgroundColor: '#2196F3',
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f4f4f4',
    },
    loadingText: {
      fontSize: 16,
      color: '#666',
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    resultHeader: {
        backgroundColor: '#2196F3',
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    resultHeaderTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '600',
    },
    resultHeaderSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        marginTop: 5,
    },
    scoreCard: {
        alignItems: 'center',
        marginVertical: 20,
    },
    scoreCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    scorePercentage: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    scoreText: {
        fontSize: 18,
        color: '#2196F3',
        marginTop: 10,
    },
    resultDetails: {
        paddingHorizontal: 15,
    },
    questionResultCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
    },
    correctQuestionCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50',
    },
    incorrectQuestionCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#F44336',
    },
    questionResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    questionResultNumber: {
        fontSize: 16,
        color: '#666',
    },
    questionResultText: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 10,
    },
    answerSection: {
        marginTop: 10,
    },
    answerLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    answerText: {
        fontSize: 16,
        fontWeight: '500',
    },
    correctAnswerText: {
        color: '#4CAF50',
    },
    incorrectAnswerText: {
        color: '#F44336',
    },
    correctAnswerSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    returnButton: {
        flexDirection: 'row',
        backgroundColor: '#2196F3',
        padding: 15,
        marginHorizontal: 15,
        marginBottom: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    returnButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
  });