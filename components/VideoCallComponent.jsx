import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getFirestore, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const VideoCallComponent = ({ roomId, sessionId, isTeacher, studentName, teacherName, topic, onClose }) => {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [webViewError, setWebViewError] = useState(null);
  const [pendingParticipants, setPendingParticipants] = useState([]);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const db = getFirestore();
  const auth = getAuth();

  // More robust room ID generation
  const generateRoomId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `room_${timestamp}_${random}`;
  };

  // Clean roomId to be compatible with Jitsi
  const cleanRoomId = React.useMemo(() => {
    if (!roomId) {
      return generateRoomId().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
    
    try {
      return roomId.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    } catch (error) {
      console.error('Error cleaning roomId:', error);
      return generateRoomId().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
  }, [roomId]);

  const handleStartSession = async () => {
    if (!sessionId) {
      console.error('Missing sessionId');
      Alert.alert('Error', 'Invalid session configuration');
      onClose();
      return;
    }

    try {
      const validRoomId = cleanRoomId || generateRoomId().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const sessionRef = doc(db, 'sessionRequests', sessionId);
      const sessionData = {
        status: 'in-progress',
        startTime: serverTimestamp(),
        roomId: validRoomId,
        ...(teacherName && { teacherName }),
        ...(studentName && { studentName }),
        pendingParticipants: [],
        approvedParticipants: isTeacher ? [auth.currentUser.uid] : []
      };

      await updateDoc(sessionRef, sessionData);
      console.log('Session started:', validRoomId);
      
      setSessionStarted(true);
      setIsLoading(false);

    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session');
      onClose();
    }
  };

  // Listen for pending participants if user is a teacher
  useEffect(() => {
    if (!isTeacher || !sessionId || !db) return;
    
    const sessionRef = doc(db, 'sessionRequests', sessionId);
    
    const unsubscribe = onSnapshot(sessionRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.pendingParticipants && data.pendingParticipants.length > 0) {
          setPendingParticipants(data.pendingParticipants);
          setShowAdmitModal(true);
        } else {
          setPendingParticipants([]);
          setShowAdmitModal(false);
        }
      }
    }, (error) => {
      console.error("Error listening to pending participants:", error);
    });
    
    return () => unsubscribe();
  }, [isTeacher, sessionId, db]);

  // Handle student requesting to join
  const handleRequestJoin = async () => {
    if (!sessionId || isTeacher) return;
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be signed in to join');
        onClose();
        return;
      }
      
      const sessionRef = doc(db, 'sessionRequests', sessionId);
      await updateDoc(sessionRef, {
        pendingParticipants: serverTimestamp.arrayUnion({
          uid: currentUser.uid,
          displayName: currentUser.displayName || studentName || 'Anonymous Student',
          email: currentUser.email,
          requestTime: serverTimestamp()
        })
      });
      
      setIsLoading(true);
      Alert.alert('Waiting for admission', 'The teacher will admit you to the session shortly.');
      
    } catch (error) {
      console.error('Error requesting to join:', error);
      Alert.alert('Error', 'Failed to request session admission');
      onClose();
    }
  };

  // Handle teacher admitting a participant
  const handleAdmitParticipant = async (participant) => {
    try {
      const sessionRef = doc(db, 'sessionRequests', sessionId);
      
      await updateDoc(sessionRef, {
        pendingParticipants: serverTimestamp.arrayRemove(participant),
        approvedParticipants: serverTimestamp.arrayUnion(participant.uid)
      });
      
      const updatedPending = pendingParticipants.filter(p => p.uid !== participant.uid);
      setPendingParticipants(updatedPending);
      
      if (updatedPending.length === 0) {
        setShowAdmitModal(false);
      }
      
    } catch (error) {
      console.error('Error admitting participant:', error);
      Alert.alert('Error', 'Failed to admit participant');
    }
  };

  // Check if current user is approved to join (for students)
  useEffect(() => {
    if (isTeacher || !sessionId || !auth.currentUser) return;
    
    const checkApprovalStatus = async () => {
      const sessionRef = doc(db, 'sessionRequests', sessionId);
      
      const unsubscribe = onSnapshot(sessionRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.approvedParticipants && data.approvedParticipants.includes(auth.currentUser.uid)) {
            setSessionStarted(true);
            setIsLoading(false);
          }
        }
      });
      
      return () => unsubscribe();
    };
    
    checkApprovalStatus();
  }, [sessionId, isTeacher]);

  useEffect(() => {
    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore not initialized');
      Alert.alert('Error', 'Database connection failed');
      onClose();
      return;
    }
  
    if (isTeacher && !sessionStarted) {
      handleStartSession();
    } else if (!isTeacher && !sessionStarted) {
      handleRequestJoin();
    }
  }, []);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <title>Video Call</title>
        <script src='https://meet.jit.si/external_api.js'></script>
        <style>
          body, html {
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: #000;
          }
          #meet {
            height: 100vh;
            width: 100vw;
          }
        </style>
      </head>
      <body>
        <div id="meet"></div>
        <script>
          window.onerror = function(message, source, lineno, colno, error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ERROR',
              error: message
            }));
            return true;
          };

          try {
            const domain = 'meet.jit.si';
            const options = {
              roomName: '${cleanRoomId}',
              width: '100%',
              height: '100%',
              parentNode: document.querySelector('#meet'),
              configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: ${!isTeacher},
                disableDeepLinking: true,
                enableLobby: true,
                requireDisplayName: true,
                enableClosePage: false,
                lobby: {
                  autoKnock: true,
                  enableChat: false
                }
              },
              interfaceConfigOverwrite: {
                MOBILE_APP_PROMO: false,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                TOOLBAR_BUTTONS: [
                  'microphone', 'camera', 'closedcaptions', 'hangup', 
                  'profile', 'chat', 'settings', 'raisehand',
                  'videoquality', 'filmstrip', 'tileview',
                  ${isTeacher ? "'security', 'participants-pane', 'invite'" : ''}
                ],
                SETTINGS_SECTIONS: [
                  'devices', 'language', 'moderator', 'profile', 'sounds'
                ],
                SHOW_PROMOTIONAL_CLOSE_PAGE: false
              },
              userInfo: {
                displayName: '${(isTeacher ? teacherName : studentName) || 'User'}',
                email: '${auth.currentUser?.email || ''}',
                role: '${isTeacher ? 'moderator' : 'participant'}'
              }
            };
            
            const api = new JitsiMeetExternalAPI(domain, options);
            
            api.addEventListener('videoConferenceJoined', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'JOINED'
              }));

              if (${isTeacher}) {
                api.executeCommand('enableLobby');
              }
            });

            api.addEventListener('participantRoleChanged', (event) => {
              if (${isTeacher} && event.role === 'moderator') {
                api.executeCommand('toggleLobby', true);
              }
            });

            api.addEventListener('knockingParticipant', (participant) => {
              if (${isTeacher}) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PARTICIPANT_WAITING',
                  participant: participant
                }));
              }
            });

            api.addEventListener('videoConferenceLeft', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CLOSED'
              }));
            });

            window.jitsiApi = api;
          } catch (error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ERROR',
              error: error.message
            }));
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      if (!event.nativeEvent?.data) return;

      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'JOINED':
          setIsLoading(false);
          break;
        case 'PARTICIPANT_WAITING':
          if (isTeacher) {
            Alert.alert(
              'Participant Waiting',
              `${data.participant.displayName} wants to join the meeting`,
              [
                {
                  text: 'Deny',
                  style: 'cancel',
                  onPress: () => {
                    webViewRef.current.injectJavaScript(`
                      window.jitsiApi.executeCommand('answerKnockingParticipant', 
                        '${data.participant.id}', 
                        false
                      );
                    `);
                  }
                },
                {
                  text: 'Admit',
                  onPress: () => {
                    webViewRef.current.injectJavaScript(`
                      window.jitsiApi.executeCommand('answerKnockingParticipant', 
                        '${data.participant.id}', 
                        true
                      );
                    `);
                  }
                }
              ]
            );
          }
          break;
        case 'CLOSED':
          onClose();
          break;
        case 'ERROR':
          console.error('Jitsi error:', data.error);
          setWebViewError(data.error);
          Alert.alert('Error', 'Failed to initialize video call');
          onClose();
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  if (webViewError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load video call</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onClose}>
          <Text style={styles.retryButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.sessionInfo}>{topic || 'Video Session'}</Text>
          <Text style={styles.codeInfo}>Room: {cleanRoomId}</Text>
        </View>
        <TouchableOpacity style={styles.endButton} onPress={onClose}>
          <Ionicons name="call" size={24} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            {isTeacher ? 'Starting session...' : 'Waiting for teacher approval...'}
          </Text>
        </View>
      )}

      {/* Pending Participants Modal for Teachers */}
      {isTeacher && (
        <Modal
          visible={showAdmitModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pending Participants</Text>
              
              {pendingParticipants.length === 0 ? (
                <Text style={styles.noParticipantsText}>No pending participants</Text>
              ) : (
                pendingParticipants.map((participant, index) => (
                  <View key={participant.uid || index} style={styles.participantItem}>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{participant.displayName}</Text>
                      <Text style={styles.participantEmail}>{participant.email}</Text>
                    </View>
                    <View style={styles.participantActions}>
                      <TouchableOpacity 
                        style={styles.admitButton}
                        onPress={() => handleAdmitParticipant(participant)}
                      >
                        <Text style={styles.admitButtonText}>Admit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowAdmitModal(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!isLoading && sessionStarted && (
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onMessage={handleMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
            setWebViewError(nativeEvent);
            Alert.alert('Error', 'Failed to load video call');
            onClose();
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('HTTP error:', nativeEvent);
            setWebViewError(nativeEvent);
          }}
          originWhitelist={['*']}
          mixedContentMode="always"
          useWebKit={true}
        />
      )}
      
      {isTeacher && (
        <TouchableOpacity 
          style={styles.participantsButton} 
          onPress={() => setShowAdmitModal(true)}
        >
          <Ionicons name="people" size={24} color="white" />
          {pendingParticipants.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{pendingParticipants.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
    zIndex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  sessionInfo: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  codeInfo: {
    color: '#2196F3',
    fontSize: 14,
    marginTop: 4,
  },
  endButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 2,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  participantEmail: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  participantActions: {
    flexDirection: 'row',
  },
  admitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  admitButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  closeModalButton: {
    backgroundColor: '#555',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  noParticipantsText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  participantsButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default VideoCallComponent;