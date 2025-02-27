import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Add these constants at the top of your file
const DEFAULT_POINTS_PER_QUESTION = 10;
const DEFAULT_XP_REWARD = 40;
const DEFAULT_STREAK_BONUS = 5;
const MAX_TIME_BONUS_PERCENTAGE = 0.5; // 50% max time bonus

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
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [testStartTime, setTestStartTime] = useState(null);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [currentXP, setCurrentXP] = useState(0);
    const [streakMultiplier, setStreakMultiplier] = useState(1);
    const [earnedXP, setEarnedXP] = useState(0);
    const [showTimeWarning, setShowTimeWarning] = useState(false);
    const [startTimestamp, setStartTimestamp] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async currentUser => {
            setUser(currentUser);
            if (!currentUser) {
                router.push('/login');
                return;
            }

            try {
                // First fetch test data
                const testRef = doc(db, 'tests', testId);
                const testDoc = await getDoc(testRef);

                if (testDoc.exists()) {
                    const data = testDoc.data();
                    // Set start timestamp when test loads
                    setStartTimestamp(new Date().toISOString());
                    setTimeRemaining(data.duration * 60);
                    
                    const questionsWithIds = data.questions.map((q, index) => ({
                        ...q,
                        id: `q_${index}`,
                    }));

                    setTestData({
                        ...data,
                        questions: questionsWithIds
                    });

                    // Initialize answers object
                    const initialAnswers = {};
                    questionsWithIds.forEach(q => {
                        initialAnswers[q.id] = '';
                    });
                    setUserAnswers(initialAnswers);

                    // Check for previous attempt
                    if (currentUser) {
                        const userProgressRef = doc(db, 'userProgress', `${currentUser.uid}_${testId}`);
                        const progressDoc = await getDoc(userProgressRef);
                        
                        if (progressDoc.exists()) {
                            const progressData = progressDoc.data();
                            setPreviousAttempt({
                                answers: progressData.answers || {},
                                score: progressData.score || null
                            });
                            
                            if (progressData.score) {
                                setScore(progressData.score);
                            }
                        } else {
                            setPreviousAttempt(null);
                            setScore(null);
                        }
                    }
                } else {
                    Alert.alert('Error', 'Test not found');
                    router.back();
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

    // Timer logic
    useEffect(() => {
        if (!timeRemaining || !isTimerRunning) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleTimeUp();
                    return 0;
                }
                if (prev === 300) { // 5 minutes warning
                    setShowTimeWarning(true);
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, isTimerRunning]);

    const handleTimeUp = () => {
        Alert.alert(
            'Time Up!',
            'Your time has expired. The test will be submitted now.',
            [{ text: 'OK', onPress: () => handleSubmitTest() }]
        );
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const calculateGameScore = (correctAnswers, timeUsed, testData) => {
        const timeBonus = Math.max(0, testData.duration * 60 - timeUsed);
        const baseXP = testData.xpReward;
        const streakBonus = maxStreak * testData.streakBonus;
        const pointsPerQuestion = testData.pointsPerQuestion * correctAnswers;
        const timeMultiplier = 1 + (timeBonus / (testData.duration * 60)) * 0.5; // Up to 50% bonus for speed

        return {
            xpEarned: Math.round(baseXP * timeMultiplier) + streakBonus,
            points: pointsPerQuestion,
            streakBonus,
            timeBonus: Math.round(baseXP * (timeMultiplier - 1)),
            maxStreak
        };
    };

    const updateStreak = (isCorrect) => {
        if (isCorrect) {
            const newStreak = currentStreak + 1;
            setCurrentStreak(newStreak);
            setMaxStreak(Math.max(maxStreak, newStreak));
            console.log('Streak updated:', { newStreak, maxStreak: Math.max(maxStreak, newStreak) });
        } else {
            setCurrentStreak(0);
            console.log('Streak reset to 0');
        }
    };

    const saveTestResult = async (userId, testId, answers, scoreData, testData) => {
        try {
            const userProgressRef = doc(db, 'userProgress', `${userId}_${testId}`);
            
            const resultData = {
                userId,
                testId,
                answers,
                score: {
                    ...scoreData,
                    points: Math.floor(scoreData.points),
                    streakBonus: Math.floor(scoreData.streakBonus),
                    timeBonus: Math.floor(scoreData.timeBonus),
                    timeUsed: Math.floor(scoreData.timeUsed),
                    xpEarned: Math.floor(scoreData.xpEarned),
                    correct: Math.floor(scoreData.correct),
                    total: Math.floor(scoreData.total),
                    percentage: Math.round(scoreData.percentage),
                    maxStreak: Math.floor(scoreData.maxStreak),
                    isFirstAttempt: scoreData.isFirstAttempt
                },
                title: testData.title,
                chapter: testData.chapter,
                subjectId: testData.subjectId,
                subjectName: testData.subjectName,
                timestamp: new Date().toISOString(),
                startTime: scoreData.startTime,
                endTime: scoreData.endTime,
                isFirstAttempt: scoreData.isFirstAttempt
            };

            console.log('Saving test result with streak:', resultData);
            await setDoc(userProgressRef, resultData);
            console.log('Test result saved successfully!');
        } catch (error) {
            console.error('Error saving test result:', error);
            Alert.alert('Error', 'Failed to save your test results. Please try again.');
        }
    };

    const handleSubmitTest = async () => {
        try {
            setIsTimerRunning(false);
            const endTimestamp = new Date().toISOString();
            
            // Check if this is user's first attempt
            const hasAttempted = await checkPreviousAttempt(user.uid, testId);
            if (hasAttempted) {
                console.log('User has already attempted this test');
                Alert.alert('Notice', 'This is not your first attempt at this test.');
            }

            // Calculate time used in seconds
            const startTime = new Date(startTimestamp).getTime();
            const endTime = new Date(endTimestamp).getTime();
            const timeUsedSeconds = Math.floor((endTime - startTime) / 1000);
            
            // Get total allowed time in seconds
            const totalTimeAllowed = testData.duration * 60;
            
            // Initialize counters and streak
            let correctAnswers = 0;
            let currentStreak = 0;
            let maxStreakCount = 0;
            const totalQuestions = testData.questions.length;

            // Count correct answers and calculate streak
            testData.questions.forEach((question, index) => {
                const userAnswer = userAnswers[question.id];
                const isCorrect = question.type === 'multiple_choice' 
                    ? (parseInt(userAnswer) === question.correctOption || userAnswer === question.answer)
                    : (userAnswer?.toLowerCase().trim() === question.answer.toLowerCase().trim());
                
                if (isCorrect) {
                    correctAnswers++;
                    currentStreak++;
                    maxStreakCount = Math.max(maxStreakCount, currentStreak);
                    console.log(`Question ${index + 1}: Correct! Current streak: ${currentStreak}`);
                } else {
                    currentStreak = 0;
                    console.log(`Question ${index + 1}: Incorrect. Streak reset.`);
                }
            });

            console.log('Final streak calculations:', {
                maxStreakAchieved: maxStreakCount,
                totalCorrect: correctAnswers
            });

            // Get base values from testData or use defaults
            const pointsPerQuestion = testData.pointsPerQuestion || 10;
            const baseXP = testData.xpReward || 40;
            const streakBonusPoints = testData.streakBonus || 5;

            // Calculate scores
            const points = correctAnswers * pointsPerQuestion;
            const percentage = (correctAnswers / totalQuestions) * 100;
            const streakBonus = Math.floor(maxStreakCount * streakBonusPoints);

            // Calculate time bonus
            let timeBonus = 0;
            if (timeUsedSeconds < totalTimeAllowed) {
                const timeRatio = (totalTimeAllowed - timeUsedSeconds) / totalTimeAllowed;
                timeBonus = Math.floor(baseXP * timeRatio * 0.5);
            }

            // Calculate total XP
            const xpEarned = Math.floor(baseXP + streakBonus + timeBonus);

            console.log('Detailed Score Calculations:', {
                startTimestamp,
                endTimestamp,
                timeUsedSeconds,
                totalTimeAllowed,
                correctAnswers,
                points,
                streakBonus,
                timeBonus,
                xpEarned,
                maxStreak: maxStreakCount,
                isFirstAttempt: !hasAttempted
            });

            const finalScoreData = {
                correct: correctAnswers,
                total: totalQuestions,
                percentage: Math.round(percentage),
                points: points,
                streakBonus: streakBonus,
                timeBonus: timeBonus,
                timeUsed: timeUsedSeconds,
                xpEarned: xpEarned,
                maxStreak: maxStreakCount,
                startTime: startTimestamp,
                endTime: endTimestamp,
                completedAt: endTimestamp,
                isFirstAttempt: !hasAttempted
            };

            // Save to Firestore
            await saveTestResult(
                user.uid,
                testId,
                userAnswers,
                finalScoreData,
                testData
            );

            setScore(finalScoreData);
            setPreviousAttempt({ 
                answers: userAnswers,
                isFirstAttempt: !hasAttempted
            });

            // Show completion message with streak information
            Alert.alert(
                'Test Completed!',
                `You got ${correctAnswers} correct answers with a maximum streak of ${maxStreakCount}!\n` +
                `Total XP earned: ${xpEarned}`,
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('Error submitting test:', error);
            Alert.alert('Error', 'An error occurred while submitting the test.');
        }
    };

    // Add this function to check if user has attempted the test before
    const checkPreviousAttempt = async (userId, testId) => {
        try {
            const userProgressRef = doc(db, 'userProgress', `${userId}_${testId}`);
            const progressDoc = await getDoc(userProgressRef);
            return progressDoc.exists();
        } catch (error) {
            console.error('Error checking previous attempt:', error);
            return false;
        }
    };

    // Helper function to ensure numeric values
    const ensureNumber = (value, defaultValue = 0) => {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
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
    
            <View style={styles.gamificationCard}>
                <View style={styles.rewardItem}>
                    <Ionicons name="star" size={24} color="#FFD700" />
                    <Text style={styles.rewardValue}>+{score.xpEarned || 0}</Text>
                    <Text style={styles.rewardLabel}>Total XP</Text>
                </View>
    
                <View style={styles.rewardItem}>
                    <Ionicons name="flame" size={24} color="#FF5722" />
                    <Text style={styles.rewardValue}>{score.maxStreak || 0}x</Text>
                    <Text style={styles.rewardLabel}>Max Streak</Text>
                </View>
    
                <View style={styles.rewardItem}>
                    <Ionicons name="timer-outline" size={24} color="#4CAF50" />
                    <Text style={styles.rewardValue}>+{score.timeBonus || 0}</Text>
                    <Text style={styles.rewardLabel}>Time Bonus</Text>
                </View>
            </View>
    
            <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                
                <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Base Points:</Text>
                    <Text style={styles.breakdownValue}>
                        {score.points || 0} pts ({score.correct || 0} × {testData.pointsPerQuestion || DEFAULT_POINTS_PER_QUESTION})
                    </Text>
                </View>
    
                <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Streak Bonus:</Text>
                    <Text style={styles.breakdownValue}>
                        +{score.streakBonus || 0} XP ({score.maxStreak || 0} × {testData.streakBonus || DEFAULT_STREAK_BONUS})
                    </Text>
                </View>
    
                <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Time Bonus:</Text>
                    <Text style={styles.breakdownValue}>+{score.timeBonus || 0} XP</Text>
                </View>
    
                <View style={styles.breakdownDivider} />
    
                <View style={styles.breakdownTotal}>
                    <Text style={styles.breakdownTotalLabel}>Total XP Earned:</Text>
                    <Text style={styles.breakdownTotalValue}>{score.xpEarned || 0} XP</Text>
                </View>
            </View>
    
            <View style={styles.resultDetails}>
                <Text style={styles.sectionTitle}>Question Review</Text>
                {testData.questions.map((question, index) => {
                    const userAnswer = previousAttempt.answers[question.id];
                    const isCorrect = question.type === 'multiple_choice' 
                        ? parseInt(userAnswer) === question.correctOption || userAnswer === question.answer
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
                                            ? question.options[question.correctOption]
                                            : question.answer}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.pointsSection}>
                                <Text style={styles.pointsText}>
                                    {isCorrect ? `+${testData.pointsPerQuestion} points` : '+0 points'}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
            
            <TouchableOpacity 
                style={styles.returnButton}
                onPress={() => router.back()}
            >
                <Text style={styles.returnButtonText}>Return to Tests</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
        </ScrollView>
    );
    
    // Add this to your render method, before the questions
    const renderTimer = () => (
        <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={24} color={timeRemaining <= 300 ? "#FF5722" : "#2196F3"} />
            <Text style={[
                styles.timerText,
                timeRemaining <= 300 && styles.timerWarning
            ]}>
                {formatTime(timeRemaining)}
            </Text>
        </View>
    );

    // Add this modal for time warning
    const renderTimeWarningModal = () => (
        <Modal
            transparent
            visible={showTimeWarning}
            onRequestClose={() => setShowTimeWarning(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Ionicons name="warning" size={48} color="#FF5722" />
                    <Text style={styles.modalTitle}>5 Minutes Remaining!</Text>
                    <Text style={styles.modalText}>Please finish your test soon.</Text>
                    <TouchableOpacity 
                        style={styles.modalButton}
                        onPress={() => setShowTimeWarning(false)}
                    >
                        <Text style={styles.modalButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Add this component for the XP and Streak display
    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.streakContainer}>
                <View style={styles.streakIconContainer}>
                    <Ionicons 
                        name="flame" 
                        size={24} 
                        color={currentStreak > 0 ? "#FF5722" : "#999"} 
                    />
                    <Text style={[
                        styles.streakCount, 
                        currentStreak > 0 && styles.activeStreak
                    ]}>
                        {currentStreak}x
                    </Text>
                </View>
                <Text style={styles.streakLabel}>
                    Current Streak
                </Text>
            </View>

            <View style={styles.xpContainer}>
                <View style={styles.xpIconContainer}>
                    <Ionicons name="star" size={24} color="#FFD700" />
                    <Text style={styles.xpCount}>+{currentXP}</Text>
                </View>
                <Text style={styles.xpLabel}>XP Earned</Text>
            </View>

            {currentStreak >= 3 && (
                <View style={styles.multiplierBadge}>
                    <Text style={styles.multiplierText}>
                        {streakMultiplier}x XP
                    </Text>
                </View>
            )}
        </View>
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
            {renderTimeWarningModal()}
            <ScrollView>
                {renderTimer()}
                {renderProgressBar()}
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
    gamificationCard: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
    },
    rewardItem: {
        alignItems: 'center',
    },
    rewardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 5,
    },
    rewardLabel: {
        fontSize: 12,
        color: '#666',
    },
    breakdownCard: {
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
    },
    breakdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
    },
    breakdownTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    breakdownTotalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    breakdownTotalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 15,
        marginBottom: 10,
    },
    pointsSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    pointsText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4CAF50',
        textAlign: 'right',
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
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 25,
        margin: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    timerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        marginLeft: 10,
    },
    timerWarning: {
        color: '#FF5722',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 5,
        margin: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
        color: '#FF5722',
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 25,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    streakContainer: {
        alignItems: 'center',
    },
    streakIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 8,
        borderRadius: 20,
    },
    streakCount: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 5,
        color: '#999',
    },
    activeStreak: {
        color: '#FF5722',
    },
    streakLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    xpContainer: {
        alignItems: 'center',
    },
    xpIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        padding: 8,
        borderRadius: 20,
    },
    xpCount: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 5,
        color: '#FFA000',
    },
    xpLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    multiplierBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    multiplierText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
  });