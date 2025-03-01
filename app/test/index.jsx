import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
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
    const [recommendedVideos, setRecommendedVideos] = useState([]);

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
        // Basic calculations
        const timeBonus = Math.max(0, testData.duration * 60 - timeUsed);
        const baseXP = testData.xpReward || DEFAULT_XP_REWARD;
        const streakBonus = maxStreak * (testData.streakBonus || DEFAULT_STREAK_BONUS);
        const pointsPerQuestion = (testData.pointsPerQuestion || DEFAULT_POINTS_PER_QUESTION) * correctAnswers;
        const timeMultiplier = 1 + (timeBonus / (testData.duration * 60)) * MAX_TIME_BONUS_PERCENTAGE;
        
        // Calculate percentage
        const percentage = Math.round((correctAnswers / testData.questions.length) * 100);
        
        // Initialize eduTokens
        let eduTokens = 0;
        
        // Performance-based tokens (0-5)
        if (percentage >= 90) eduTokens = 5;
        else if (percentage >= 80) eduTokens = 4;
        else if (percentage >= 70) eduTokens = 3;
        else if (percentage >= 60) eduTokens = 2;
        else if (percentage >= 50) eduTokens = 1;
        
        // Add streak bonus (0-3)
        if (maxStreak >= 8) eduTokens += 3;
        else if (maxStreak >= 5) eduTokens += 2;
        else if (maxStreak >= 3) eduTokens += 1;
        
        // Add time bonus (0-2)
        const timeUsedPercentage = timeBonus / (testData.duration * 60);
        if (timeUsedPercentage >= 0.5) eduTokens += 2;  // Completed in half the time or less
        else if (timeUsedPercentage > 0) eduTokens += 1;  // Completed with some time remaining

        console.log('Score Calculation:', {
            correctAnswers,
            percentage,
            maxStreak,
            timeBonus,
            eduTokens,
            timeUsedPercentage
        });

        return {
            xpEarned: Math.round(baseXP * timeMultiplier) + streakBonus,
            points: pointsPerQuestion,
            streakBonus,
            timeBonus: Math.round(baseXP * (timeMultiplier - 1)),
            maxStreak,
            eduTokens,
            percentage
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
            const userStatsRef = doc(db, 'userStats', userId);
            
            // Get current user stats
            const userStatsDoc = await getDoc(userStatsRef);
            const currentStats = userStatsDoc.exists() ? userStatsDoc.data() : {
                totalXP: 0,
                eduTokens: 0,
                premiumFeatures: {
                    olabsUsed: 0,
                    textExtractorUsed: 0,
                    oneToOneSessionsUsed: 0,
                    lastResetDate: new Date().toISOString()
                },
                isPremium: false,
                premiumExpiryDate: null
            };
            
            // Calculate new totals
            const newTotalXP = (currentStats.totalXP || 0) + scoreData.xpEarned;
            const newEduTokens = (currentStats.eduTokens || 0) + scoreData.eduTokens;
            
            console.log('Saving test results:', {
                currentEduTokens: currentStats.eduTokens || 0,
                earnedEduTokens: scoreData.eduTokens,
                newTotalEduTokens: newEduTokens
            });

            // Update user stats with new XP and EduTokens
            await setDoc(userStatsRef, {
                ...currentStats,
                totalXP: newTotalXP,
                eduTokens: newEduTokens,
                lastTestDate: new Date().toISOString(),
                testsCompleted: (currentStats.testsCompleted || 0) + 1
            });

            // Save test progress
            await setDoc(userProgressRef, {
                userId,
                testId,
                answers,
                score: scoreData,
                timestamp: new Date().toISOString(),
                timeSpent: testData.duration * 60 - timeRemaining
            });

            return true;
        } catch (error) {
            console.error('Error saving test result:', error);
            return false;
        }
    };
    const sendWhatsAppMessage = async (to, message, imageBase64 = null) => {
        try {
          const response = await fetch("http://192.168.67.226:3000/api/send-whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ to, message, imageBase64 }),
          });
      
          const result = await response.json();
          console.log("Response:", result);
          return result;
        } catch (error) {
          console.error("Error sending WhatsApp message:", error);
          return { success: false, error: error.message };
        }
      };
      
    
      
      const notifyParent = async (userId, testResults, testInfo) => {
        try {
            // Get user data to find parent's phone number
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.log("User document not found");
                return false;
            }
            
            const userData = userDoc.data();
            const parentPhone = userData.parent_number ;
            
            if (!parentPhone) {
                console.log("No parent phone number found for this student");
                return false;
            }
            
            // Format the message with test results
            const studentName = userData.displayName || userData.name || "Your child";
            const testDate = new Date().toLocaleDateString();
            const testTime = new Date().toLocaleTimeString();
            
            // Create a nicely formatted message
            const message = 
                `📝 *Test Result Notification* 📝\n\n` +
                `Dear Parent,\n\n` + 
                `${studentName} has completed a test in the Learning App.\n\n` +
                `*Test Details:*\n` +
                `📚 Subject: ${testInfo.subjectName || "Subject"}\n` +
                `📖 Chapter: ${testInfo.chapter || "Chapter"}\n` +
                `🔤 Test: ${testInfo.title}\n` +
                `📅 Date: ${testDate} at ${testTime}\n\n` +
                
                `*Results:*\n` +
                `✅ Score: ${testResults.percentage}%\n` +
                `✓ Correct: ${testResults.correct} out of ${testResults.total} questions\n` +
                `🔥 Max streak: ${testResults.maxStreak}x\n` +
                `⭐ XP earned: ${testResults.xpEarned}\n\n` +
                
                `Please encourage your child to continue learning! They can review their answers and view recommended videos in the app.`;
                
            // Send WhatsApp message to parent
            console.log(`Sending test results to parent: ${parentPhone}`);
            const result = await sendWhatsAppMessage(parentPhone, message);
            
            if (result && result.success) {
                console.log("Successfully sent test results to parent");
                return true;
            } else {
                console.log("Failed to send message to parent:", result?.error || "Unknown error");
                return false;
            }
        } catch (error) {
            console.error("Error notifying parent:", error);
            return false;
        }
    };
    

    const handleSubmitTest = async () => {
        if (!testData || !user) {
            Alert.alert('Error', 'Test data or user not found');
            return;
        }
    
        try {
            setIsTimerRunning(false);
            const timeSpent = testData.duration * 60 - timeRemaining;
            let correctAnswers = 0;
            
            // Calculate correct answers
            testData.questions.forEach((question, index) => {
                const userAnswer = userAnswers[`q_${index}`];
                if (userAnswer && userAnswer.toLowerCase() === question.answer.toLowerCase()) {
                    correctAnswers++;
                }
            });
    
            // Calculate percentage
            const percentage = Math.round((correctAnswers / testData.questions.length) * 100);
            
            // Calculate EduTokens based on performance
            let eduTokens = 0;
            if (percentage >= 90) eduTokens = 5;
            else if (percentage >= 80) eduTokens = 4;
            else if (percentage >= 70) eduTokens = 3;
            else if (percentage >= 60) eduTokens = 2;
            else if (percentage >= 50) eduTokens = 1;
    
            // Calculate XP with time bonus
            const timeBonus = Math.max(0, testData.duration * 60 - timeSpent);
            const timeMultiplier = 1 + (timeBonus / (testData.duration * 60)) * 0.5;
            const xpEarned = Math.round((testData.xpReward || 100) * timeMultiplier);
    
            // Calculate points
            const points = correctAnswers * (testData.pointsPerQuestion || 10);
    
            // Prepare score data
            const scoreData = {
                correctAnswers,
                totalQuestions: testData.questions.length,
                percentage,
                points,
                xpEarned,
                eduTokens,
                maxStreak,
                timeBonus,
                completedAt: new Date().toISOString()
            };
    
            // Save to userProgress collection
            const userProgressRef = doc(db, 'userProgress', `${user.uid}_${testId}`);
            await setDoc(userProgressRef, {
                userId: user.uid,
                testId,
<<<<<<< HEAD
=======
                userAnswers,
                finalScoreData,
                testData
            );

            // Send notification to parent about test results
            await notifyParent(user.uid, finalScoreData, testData);

            setScore(finalScoreData);
            setPreviousAttempt({ 
>>>>>>> 7c32d31bd4bf6ec492b3079122112532e70232f6
                answers: userAnswers,
                score: scoreData,
                subjectId: testData.subjectId,
                subjectName: testData.subjectName,
                chapter: testData.chapter,
                timeSpent,
                completedAt: new Date().toISOString()
            });
    
            // Update user stats
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data() || {};
    
            await setDoc(userRef, {
                ...userData,
                totalXP: (userData.totalXP || 0) + xpEarned,
                eduTokens: (userData.eduTokens || 0) + eduTokens,  // This properly updates eduTokens in users collection
                testsCompleted: (userData.testsCompleted || 0) + 1,
                lastTestDate: new Date().toISOString()
            }, { merge: true });
    
            // Also update userStats document for consistency
            const userStatsRef = doc(db, 'userStats', user.uid);
            const userStatsDoc = await getDoc(userStatsRef);
            const currentStats = userStatsDoc.exists() ? userStatsDoc.data() : {
                totalXP: 0,
                eduTokens: 0,
                premiumFeatures: {
                    olabsUsed: 0,
                    textExtractorUsed: 0,
                    oneToOneSessionsUsed: 0,
                    lastResetDate: new Date().toISOString()
                },
                isPremium: false,
                premiumExpiryDate: null
            };
            
            // Update userStats with new eduTokens
            await setDoc(userStatsRef, {
                ...currentStats,
                totalXP: (currentStats.totalXP || 0) + xpEarned,
                eduTokens: (currentStats.eduTokens || 0) + eduTokens,
                lastTestDate: new Date().toISOString(),
                testsCompleted: (currentStats.testsCompleted || 0) + 1
            });
    
            // Log the updates for verification
            console.log('Test Submission Results:', {
                testId,
                scoreData,
                eduTokens,
                xpEarned,
                timeMultiplier,
                percentage
            });
    
            // Update UI state
            setScore(scoreData);
    
            // Show completion alert
            Alert.alert(
                'Test Completed! 🎉',
                `Results:\n\n` +
                `Score: ${percentage}%\n` +
                `Correct Answers: ${correctAnswers}/${testData.questions.length}\n` +
                `XP Earned: +${xpEarned}\n` +
                `EduTokens: +${eduTokens}\n` +
                `Points: ${points}`,
                [
                    {
                        text: 'back to tests',
                        onPress: () => router.back()
                    }
                ]
            );
    
        } catch (error) {
            console.error('Error submitting test:', error);
            Alert.alert('Error', 'Failed to submit test. Please try again.');
        }
    };
    // Add this helper function to validate test data
    const validateTestData = (testData) => {
        return {
            ...testData,
            pointsPerQuestion: testData.pointsPerQuestion || 10,
            xpReward: testData.xpReward || 100,
            streakBonus: testData.streakBonus || 5,
            duration: testData.duration || 30
        };
    };

    // Update the useEffect hook to validate test data
    useEffect(() => {
        const fetchTestData = async () => {
            try {
                const testRef = doc(db, 'tests', testId);
                const testDoc = await getDoc(testRef);
                
                if (testDoc.exists()) {
                    const rawTestData = testDoc.data();
                    const validatedTestData = validateTestData(rawTestData);
                    setTestData(validatedTestData);
                    setTimeRemaining(validatedTestData.duration * 60);
                } else {
                    Alert.alert('Error', 'Test not found');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching test:', error);
                Alert.alert('Error', 'Failed to load test');
            }
        };

        fetchTestData();
    }, [testId]);

    // Add this function to handle answer selection
    const handleAnswerSelect = (questionId, answer) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));

        // Update streak
        const question = testData.questions.find(q => `q_${testData.questions.indexOf(q)}` === questionId);
        if (question && answer.toLowerCase() === question.answer.toLowerCase()) {
            const newStreak = currentStreak + 1;
            setCurrentStreak(newStreak);
            setMaxStreak(Math.max(maxStreak, newStreak));
            
            // Update XP with streak multiplier
            const newMultiplier = Math.min(2, 1 + (newStreak * 0.1)); // Cap at 2x
            setStreakMultiplier(newMultiplier);
            
            const baseXP = 10;
            setCurrentXP(prev => prev + Math.round(baseXP * newMultiplier));
        } else {
            setCurrentStreak(0);
            setStreakMultiplier(1);
        }
    };

    // Add a submit button component
    const SubmitButton = () => (
        <TouchableOpacity
            style={[
                styles.submitButton,
                Object.keys(userAnswers).length !== testData?.questions?.length && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitTest}
            disabled={Object.keys(userAnswers).length !== testData?.questions?.length}
        >
            <Text style={styles.submitButtonText}>
                Submit Test
            </Text>
        </TouchableOpacity>
    );

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
                    <Ionicons name="diamond" size={24} color="#9C27B0" />
                    <Text style={styles.rewardValue}>+{score.eduTokens || 0}</Text>
                    <Text style={styles.rewardLabel}>EduTokens</Text>
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
    
            <View style={styles.tokenBreakdownCard}>
                <Text style={styles.breakdownTitle}>EduTokens Earned</Text>
                <View style={styles.breakdownItem}>
                    <Text>Performance Bonus: {score.percentage >= 90 ? 5 : 
                        score.percentage >= 80 ? 4 :
                        score.percentage >= 70 ? 3 :
                        score.percentage >= 60 ? 2 :
                        score.percentage >= 50 ? 1 : 0} tokens</Text>
                </View>
                <View style={styles.breakdownItem}>
                    <Text>Streak Bonus: {score.maxStreak >= 8 ? 3 :
                        score.maxStreak >= 5 ? 2 :
                        score.maxStreak >= 3 ? 1 : 0} tokens</Text>
                </View>
                <View style={styles.breakdownItem}>
                    <Text>Time Bonus: {score.timeBonus > 0 ? 
                        score.timeBonus > (testData.duration * 30) ? 2 : 1 : 0} tokens</Text>
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
            
            {renderVideoRecommendations()}
            
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

            <View style={styles.tokenContainer}>
                <View style={styles.tokenIconContainer}>
                    <Ionicons name="diamond" size={24} color="#9C27B0" />
                    <Text style={styles.tokenCount}>+{earnedXP > 0 ? Math.floor(earnedXP / 100) : 0}</Text>
                </View>
                <Text style={styles.tokenLabel}>EduTokens</Text>
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

    const fetchRecommendedVideos = async () => {
        try {
            if (!score || !testData) {
                console.log("Score or test data not available yet");
                return;
            }
    
            setRecommendedVideos([]); // Reset videos while loading
            const scorePercentage = (score.correct / score.total) * 100;
            
            // Get reference to the specific subject document
            const subjectDocRef = doc(db, "subjects", testData.subjectId || "");
            let foundVideos = [];
            
            try {
                const subjectDoc = await getDoc(subjectDocRef);
                
                if (subjectDoc.exists()) {
                    const subjectData = subjectDoc.data();
                    
                    // Determine which chapter to look for
                    let targetChapterIndex = testData.chapterIndex || 0;
                    let targetChapterId = `CH${targetChapterIndex + 1}_${subjectData.name.replace(/\s+/g, '')}`;
                    
                    if (scorePercentage >= 70) {
                        // Try to find next chapter
                        const nextChapterIndex = targetChapterIndex + 1;
                        // Check if next chapter exists by examining totalChapters
                        if (nextChapterIndex < (subjectData.chapters.length || 0)) {
                            targetChapterId = `CH${nextChapterIndex + 1}_${subjectData.name.replace(/\s+/g, '')}`;
                            console.log(`Looking for videos in next chapter: ${targetChapterId}`);
                        }
                    } else {
                        console.log(`Looking for videos in current chapter: ${targetChapterId}`);
                    }
                    
                    // Match the chapter key
                    const matchingChapterKey = subjectData.chapters.find(chapter => 
                        chapter.toLowerCase() === targetChapterId.toLowerCase()
                    ) 
                    ? `CH${subjectData.chapters.indexOf(targetChapterId) + 1}_${subjectData.name.replace(/\s+/g, '')}`
                    : targetChapterId;
    
                    // Check if the videos property and the target chapter exist
                    if (subjectData.videos && subjectData.videos[matchingChapterKey]) {
                        // Get videos from the target chapter
                        const chapterVideos = Object.values(subjectData.videos[matchingChapterKey]);
                        
                        // Take up to 3 videos
                        foundVideos = chapterVideos.slice(0, 3).map(video => ({
                            id: video.id,
                            title: video.name,
                            duration: video.duration || "Unknown",
                            thumbnail: video.thumbnail || null,
                            url: video.url || null
                        }));
                        console.log("found video:",foundVideos);
                        console.log(`Found ${foundVideos.length} videos in ${matchingChapterKey}`);
                    } 
                    
                    // If no videos found in target chapter and we were looking for next chapter,
                    // fall back to any videos from this subject
                    if (foundVideos.length === 0) {
                        console.log("No videos in target chapter, falling back to any videos in this subject");
                        
                        // Collect videos from any chapter in this subject
                        if (subjectData.videos) {
                            let allChapterVideos = [];
                            
                            // Loop through all chapters
                            for (const chapterId in subjectData.videos) {
                                const chapterVideosObj = subjectData.videos[chapterId];
                                
                                // Get only numeric properties which contain the actual videos
                                const videosInChapter = Object.entries(chapterVideosObj)
                                    .filter(([key]) => !isNaN(parseInt(key)))
                                    .map(([_, video]) => (video));
                                    
                                allChapterVideos = allChapterVideos.concat(videosInChapter);
                            }
                            
                            // Take up to 3 videos
                            foundVideos = allChapterVideos.slice(0, 3).map(video => ({
                                id: video.id,
                                title: video.title,
                                duration: video.duration || "Unknown",
                                thumbnail: video.thumbnail || null,
                                url: video.url || null
                            }));
                        }
                    }
                } else {
                    console.log("Subject document not found");
                    
                    // If subject not found, query all subjects as fallback
                    const subjectsRef = collection(db, "subjects");
                    const subjectSnapshot = await getDocs(subjectsRef);
                    const allSubjects = [];
                    
                    subjectSnapshot.forEach((doc) => {
                        allSubjects.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Find videos from any subject
                    let allVideos = [];
                    
                    for (const subject of allSubjects) {
                        if (subject.videos) {
                            for (const chapterId in subject.videos) {
                                const chapterVideosObj = subject.videos[chapterId];
                                
                                // Get only numeric properties which contain the actual videos
                                const videosInChapter = Object.entries(chapterVideosObj)
                                    .filter(([key]) => !isNaN(parseInt(key)))
                                    .map(([_, video]) => (video));
                                    
                                allVideos = allVideos.concat(videosInChapter);
                            }
                        }
                    }
                    
                    // Take up to 3 random videos
                    foundVideos = allVideos.sort(() => 0.5 - Math.random()).slice(0, 3).map(video => ({
                        id: video.id,
                        title: video.title,
                        duration: video.duration || "Unknown",
                        thumbnail: video.thumbnail || null,
                        url: video.url || null
                    }));
                }
                
                setRecommendedVideos(foundVideos);
                
            } catch (docError) {
                console.error('Error getting subject document:', docError);
                
                // Fallback to querying all subjects
                const subjectsRef = collection(db, "subjects");
                const subjectSnapshot = await getDocs(subjectsRef);
                let allVideos = [];
                
                subjectSnapshot.forEach((doc) => {
                    const subjectData = doc.data();
                    
                    if (subjectData.videos) {
                        for (const chapterId in subjectData.videos) {
                            const chapterVideosObj = subjectData.videos[chapterId];
                            
                            // Get only numeric properties which contain the actual videos
                            const videosInChapter = Object.entries(chapterVideosObj)
                                .filter(([key]) => !isNaN(parseInt(key)))
                                .map(([_, video]) => (video));
                                
                            allVideos = allVideos.concat(videosInChapter);
                        }
                    }
                });
                
                // Take up to 3 random videos
                foundVideos = allVideos.sort(() => 0.5 - Math.random()).slice(0, 3).map(video => ({
                    id: video.id,
                    title: video.title,
                    duration: video.duration || "Unknown",
                    thumbnail: video.thumbnail || null,
                    url: video.url || null
                }));
                setRecommendedVideos(foundVideos);
                console.log(recommendedVideos);
            }
            
        } catch (error) {
            console.error('Error fetching recommended videos:', error);
        }
    };
    
    // Call this function when score is calculated
    useEffect(() => {
        if (score !== null) {
            fetchRecommendedVideos();
        }
    }, [score]);
    
    // Add this component to render video recommendations
    const renderVideoRecommendations = () => (
        <View style={styles.recommendationsCard}>
            <Text style={styles.breakdownTitle}>
                {score / testData.questions.length < 0.7 
                    ? "Videos to help you improve" 
                    : "Suggested videos to continue learning"}
            </Text>
            
            {recommendedVideos.length > 0 ? ( 
                recommendedVideos.map((video, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.videoItem}
                        onPress={() => {
                            router.push({
                                pathname: `/video/${video.id}`,
                                params: {
                                  videoId: video.id,
                                  videoName: video.name || "Video",
                                  videoUrl: video.url
                                }
                              });
                        }}
                    >
                        <View style={styles.videoThumbnail}>
                            <Ionicons name="play-circle" size={24} color="#2196F3" />
                        </View>
                        <View style={styles.videoDetails}>
                            <Text style={styles.videoTitle}>{video.title}</Text>
                            <Text style={styles.videoDuration}>{video.duration} min</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                ))
            ) : (
                <Text style={styles.noVideosText}>No recommendations available</Text>
            )}
            
            <TouchableOpacity 
                style={styles.seeMoreButton}
                onPress={() => router.push('/videos')}
            >
                <Text style={styles.seeMoreButtonText}>See More Videos</Text>
            </TouchableOpacity>
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
                                        onPress={() => handleAnswerSelect(question.id, option)}
                                    >
                                        <Text style={styles.optionText}>{option}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <TextInput
                                    style={styles.textInput}
                                    value={userAnswers[question.id]}
                                    onChangeText={text => handleAnswerSelect(question.id, text)}
                                />
                            )}
                        </View>
                    ))}
                    <SubmitButton />
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
      backgroundColor: '#4CAF50',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      margin: 16,
      elevation: 2,
    },
    submitButtonDisabled: {
      backgroundColor: '#CCCCCC',
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
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
    recommendationsCard: {
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    videoThumbnail: {
        width: 50,
        height: 50,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoDetails: {
        flex: 1,
        marginLeft: 10,
    },
    videoTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    videoDuration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    seeMoreButton: {
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    seeMoreButtonText: {
        color: '#2196F3',
        fontWeight: '600',
    },
    noVideosText: {
        color: '#666',
        textAlign: 'center',
        padding: 10,
    },
    tokenContainer: {
        alignItems: 'center',
    },
    tokenIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        padding: 8,
        borderRadius: 20,
    },
    tokenCount: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 5,
        color: '#9C27B0',
    },
    tokenLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    tokenBreakdownCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    breakdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});