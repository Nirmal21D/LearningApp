import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
    const [answerHistory, setAnswerHistory] = useState([]);
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
                // First check if user has already taken this test
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

    const renderPreviousAttempt = () => (
        <ScrollView>
            <View style={styles.scoreContainer}>
                <Text style={styles.title}>{testData.title}</Text>
                <Text style={styles.chapterTitle}>{testData.chapter}</Text>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>Your Score: {score.correct}/{score.total}</Text>
                    <Text style={styles.percentageText}>{score.percentage.toFixed(1)}%</Text>
                </View>
                
                {testData.questions.map((question, index) => {
                    const userAnswer = previousAttempt.answers[question.id];
                    const isCorrect = question.type === 'multiple_choice' 
                        ? userAnswer === question.correctOption
                        : userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();

                    return (
                        <View key={question.id} style={styles.questionResultContainer}>
                            <View style={styles.questionHeader}>
                                <Text style={styles.questionNumber}>{index + 1}.</Text>
                                <Text style={styles.questionText}>{question.question}</Text>
                            </View>
                            
                            <View style={styles.answerContainer}>
                                <View style={[styles.answerBox, isCorrect ? styles.correctAnswer : styles.wrongAnswer]}>
                                    <Text style={styles.answerLabel}>Your Answer:</Text>
                                    <Text style={styles.answerText}>{userAnswer}</Text>
                                    <Ionicons 
                                        name={isCorrect ? "checkmark-circle" : "close-circle"} 
                                        size={24} 
                                        color={isCorrect ? "#4CAF50" : "#F44336"}
                                        style={styles.resultIcon}
                                    />
                                </View>
                                
                                {!isCorrect && (
                                    <View style={styles.correctAnswerBox}>
                                        <Text style={styles.answerLabel}>Correct Answer:</Text>
                                        <Text style={styles.correctAnswerText}>
                                            {question.type === 'multiple_choice' ? question.correctOption : question.answer}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
                
                <TouchableOpacity 
                    style={styles.returnButton}
                    onPress={() => router.push(`/subject?subjectId=${testData.subjectId}&subjectName=${testData.subjectName}`)}
                >
                    <Text style={styles.returnButtonText}>Return to Subject</Text>
                </TouchableOpacity>
            </View>
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

    // If user has already taken the test, show results
    if (previousAttempt && score) {
        return (
            <SafeAreaView style={styles.container}>
                {renderPreviousAttempt()}
            </SafeAreaView>
        );
    }

    // Original test-taking UI remains the same...
    return (
        <SafeAreaView style={styles.container}>
            {/* Your existing test-taking UI code here */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ... (keeping your existing styles)
    
    // New styles for results view
    scoreContainer: {
        padding: 20,
    },
    scoreBox: {
        backgroundColor: '#E3F2FD',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    percentageText: {
        fontSize: 18,
        color: '#2196F3',
        marginTop: 5,
    },
    questionResultContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
    },
    questionHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    questionNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
    answerContainer: {
        marginTop: 10,
    },
    answerBox: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    correctAnswer: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
        borderWidth: 1,
    },
    wrongAnswer: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
        borderWidth: 1,
    },
    correctAnswerBox: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 8,
        borderColor: '#4CAF50',
        borderWidth: 1,
    },
    answerLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    answerText: {
        fontSize: 16,
        marginRight: 30,
    },
    correctAnswerText: {
        fontSize: 16,
        color: '#4CAF50',
    },
    resultIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    returnButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    returnButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});