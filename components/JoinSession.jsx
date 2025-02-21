import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Import db from your Firebase config
import { db } from '@/lib/firebase';

const JoinSessionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { inviteCode } = params;
  
  const [meetingCode, setMeetingCode] = useState(inviteCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const auth = getAuth();

  useEffect(() => {
    // If invitation code was provided via deep link, validate it immediately
    if (inviteCode) {
      validateMeetingCode(inviteCode);
    }
  }, [inviteCode]);

  const validateMeetingCode = async (code) => {
    if (!code.trim()) return;
    
    setIsValidating(true);
    setSessionError('');
    
    try {
      // Query the session with this meeting code
      const sessionsRef = collection(db, 'sessionRequests');
      const q = query(sessionsRef, where('meetingCode', '==', code.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setSessionError('Invalid meeting code. Please check and try again.');
        setSessionInfo(null);
        return;
      }

      const sessionData = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };

      // Check if session is still active
      if (sessionData.status === 'ended') {
        setSessionError('This session has ended.');
        setSessionInfo(null);
        return;
      }

      // Get teacher info
      const teacherDoc = await getDoc(doc(db, 'users', sessionData.teacherId));
      if (teacherDoc.exists()) {
        sessionData.teacherProfile = teacherDoc.data();
      }

      setSessionInfo(sessionData);
    } catch (error) {
      console.error('Error validating meeting code:', error);
      setSessionError('Failed to validate session. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'Please sign in to join a session');
      return;
    }

    if (!sessionInfo) {
      Alert.alert('Error', 'Please enter a valid meeting code');
      return;
    }

    setIsJoining(true);
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();

      // Check if student is already in session
      if (sessionInfo.participants?.includes(userData.username)) {
        // If already joined, just navigate to the session
        navigateToSession(sessionInfo, userData);
        return;
      }

      // Update session participants
      await updateDoc(doc(db, 'sessionRequests', sessionInfo.id), {
        participants: arrayUnion(userData.username)
      });

      // Add join record to participation history
      await addDoc(collection(db, 'sessionParticipation'), {
        sessionId: sessionInfo.id,
        userId: auth.currentUser.uid,
        userName: userData.username,
        userRole: userData.role,
        joinedAt: serverTimestamp(),
        topic: sessionInfo.topic,
        teacherId: sessionInfo.teacherId,
        teacherName: sessionInfo.teacherName
      });

      // Navigate to video call screen
      navigateToSession(sessionInfo, userData);
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const navigateToSession = (sessionData, userData) => {
    router.push({
      pathname: '/screens/video-call',
      params: {
        roomId: sessionData.meetingCode || sessionData.roomId,
        sessionId: sessionData.id,
        isTeacher: false,
        studentName: userData.username,
        teacherName: sessionData.teacherName,
        topic: sessionData.topic
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Join Session</Text>
            <View style={styles.placeholderRight} />
          </View>

          <View style={styles.bannerContainer}>
            <Image 
              source={require('@/assets/images/react-logo.png')} 
              style={styles.bannerImage} 
              resizeMode="contain"
              alt='join session'
            />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter meeting code"
                value={meetingCode}
                onChangeText={(text) => {
                  setMeetingCode(text);
                  setSessionInfo(null);
                  setSessionError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading && !isValidating}
              />
              {meetingCode.length > 0 && (
                <TouchableOpacity 
                  onPress={() => validateMeetingCode(meetingCode)}
                  disabled={isValidating}
                  style={styles.validateButton}
                >
                  {isValidating ? (
                    <ActivityIndicator size="small" color="#2196F3" />
                  ) : (
                    <Text style={styles.validateButtonText}>Validate</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {sessionError ? (
              <Text style={styles.errorText}>{sessionError}</Text>
            ) : null}

            {sessionInfo && (
              <View style={styles.sessionInfoCard}>
                <View style={styles.sessionInfoHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.sessionInfoTitle}>Valid Session</Text>
                </View>
                
                <View style={styles.sessionInfoContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Topic:</Text>
                    <Text style={styles.infoValue}>{sessionInfo.topic}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Teacher:</Text>
                    <Text style={styles.infoValue}>{sessionInfo.teacherName}</Text>
                  </View>
                  
                  {sessionInfo.startTime && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Started:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(sessionInfo.startTime.seconds * 1000).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Participants:</Text>
                    <Text style={styles.infoValue}>
                      {sessionInfo.participants?.length || 0} students joined
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.joinButton, 
                (!sessionInfo || isJoining) && styles.joinButtonDisabled
              ]}
              onPress={handleJoinSession}
              disabled={!sessionInfo || isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.joinButtonText}>Join Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Before You Join:</Text>
            <View style={styles.tipRow}>
              <Ionicons name="headset-outline" size={20} color="#2196F3" />
              <Text style={styles.tipText}>Headphones recommended for better audio quality</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="wifi-outline" size={20} color="#2196F3" />
              <Text style={styles.tipText}>Connect to a stable internet connection</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="volume-medium-outline" size={20} color="#2196F3" />
              <Text style={styles.tipText}>Find a quiet place to minimize background noise</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholderRight: {
    width: 40,
  },
  bannerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bannerImage: {
    width: '100%',
    height: 180,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  validateButton: {
    backgroundColor: '#e7f3ff',
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  validateButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 15,
  },
  sessionInfoCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sessionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sessionInfoContent: {
    marginLeft: 32,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  tipsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
});

export default JoinSessionScreen;