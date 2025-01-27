import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function TestPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { testId } = params;

    const [user, setUser] = useState(null);
    const [testData, setTestData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [answerHistory, setAnswerHistory] = useState([]);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async currentUser => {
            setUser(currentUser);
            if (!currentUser) {
                router.push('/login');
                return;
            }

            const fetchTestData = async () => {
                try {
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

                        const initialAnswers = {};
                        questionsWithIds.forEach(q => {
                            initialAnswers[q.id] = '';
                        });
                        setUserAnswers(initialAnswers);
                    } else {
                        console.log('No such test!');
                    }
                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching test data:', error);
                    setLoading(false);
                }
            };

            fetchTestData();
        });

        return () => unsubscribe();
    }, [testId, router]);

    const handleAnswerChange = (questionId, answer, questionType) => {
        console.log('Updating answer for question:', questionId, 'with:', answer);

        setAnswerHistory(prev => [...prev, {
            questionId,
            answer,
            timestamp: new Date().toISOString()
        }]);

        setUserAnswers(prev => {
            const newAnswers = { ...prev };
            newAnswers[questionId] = answer;
            console.log('New answers state:', newAnswers);
            return newAnswers;
        });
    };

    const handleSubmit = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to submit the test');
            return;
        }

        const unansweredQuestions = testData.questions.filter(
            question => !userAnswers[question.id] || userAnswers[question.id].trim() === ''
        );

        if (unansweredQuestions.length > 0) {
            Alert.alert(
                'Incomplete Test',
                'Please answer all questions before submitting.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            await setDoc(doc(db, 'userProgress', `${user.uid}_${testId}`), {
                userId: user.uid,
                testId,
                answers: userAnswers,
                answerHistory,
                submittedAt: timestamp,
                chapter: testData.chapter,
                subjectId: testData.subjectId
            });
            Alert.alert(
                'Success',
                'Test submitted successfully!',
                [{ 
                    text: 'OK', 
                    onPress: () => router.push(`/subject?subjectId=${testData.subjectId}&subjectName=${testData.subjectName}`)
                }]
            );
        } catch (error) {
            console.error('Error saving progress:', error);
            Alert.alert('Error', 'Failed to submit test. Please try again.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <Text style={styles.title}>{testData.title}</Text>
                <Text style={styles.chapterTitle}>{testData.chapter}</Text>
                {testData.questions.map((question, index) => (
                    <View key={question.id} style={styles.questionContainer}>
                        <Text style={styles.questionText}>
                            {index + 1}. {question.question}
                            {(!userAnswers[question.id] || userAnswers[question.id].trim() === '') && 
                                <Text style={styles.requiredStar}> *</Text>
                            }
                        </Text>
                        {question.type === 'multiple_choice' ? (
                            question.options.map((option, idx) => (
                                <TouchableOpacity
                                    key={`${question.id}_${idx}`}
                                    style={[
                                        styles.optionButton,
                                        userAnswers[question.id] === option && styles.selectedOption
                                    ]}
                                    onPress={() => handleAnswerChange(question.id, option, 'multiple_choice')}
                                >
                                    <Text style={styles.optionText}>{option}</Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your answer here"
                                value={userAnswers[question.id] || ''}
                                onChangeText={(text) => handleAnswerChange(question.id, text, 'text')}
                                multiline={true}
                            />
                        )}
                    </View>
                ))}
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    chapterTitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    questionContainer: {
        marginBottom: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        elevation: 2,
    },
    questionText: {
        fontSize: 18,
        marginBottom: 15,
        color: '#333',
    },
    requiredStar: {
        color: 'red',
        fontSize: 18,
    },
    optionButton: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedOption: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196F3',
    },
    optionText: {
        fontSize: 16,
    },
    textInput: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        minHeight: 100,
        textAlignVertical: 'top'
    },
    submitButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#2196F3',
        borderRadius: 5,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
    },
});