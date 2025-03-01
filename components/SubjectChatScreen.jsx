import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ref, push, onValue, off, set, serverTimestamp } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { getDocs, doc, getDoc, collection, query, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SubjectChatScreen() {
  const { chatId, subjectName } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [participants, setParticipants] = useState({});
  const flatListRef = useRef(null);
  const router = useRouter();

  // Get current user data
  useEffect(() => {
    const getCurrentUserData = async () => {
      try {
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', auth.currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          
          // If this is the first time the user is accessing this chat,
          // add the chatId to their joinedGroups array
          if (chatId && (!userData.joinedGroups || !userData.joinedGroups.includes(chatId))) {
            const userDocRef = doc(db, 'users', userDoc.id);
            await updateDoc(userDocRef, {
              joinedGroups: arrayUnion(chatId)
            });
            
            // Update local state with the new joinedGroups
            userData.joinedGroups = [...(userData.joinedGroups || []), chatId];
          }
          
          setUserData({
            id: userDoc.id,
            ...userData
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (auth.currentUser) {
      getCurrentUserData();
    }
  }, [chatId]);

  // Load messages and participants
  useEffect(() => {
    if (!chatId) return;

    // Reference to messages in this group chat
    const messagesRef = ref(database, `groupChats/${chatId}/messages`);
    const participantsRef = ref(database, `groupChats/${chatId}/participants`);

    // Listen for new messages
    const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val() || {};
      
      // Format and sort messages by timestamp (oldest first)
      const formattedMessages = Object.keys(messagesData)
        .map(key => ({
          id: key,
          ...messagesData[key],
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(formattedMessages);
      setLoading(false);
      
      // Scroll to bottom after messages load
      if (formattedMessages.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: false });
        }, 200);
      }
    });

    // Listen for participant changes
    const participantsUnsubscribe = onValue(participantsRef, (snapshot) => {
      const participantsData = snapshot.val() || {};
      setParticipants(participantsData);
    });

    return () => {
      off(messagesRef, 'value', messagesUnsubscribe);
      off(participantsRef, 'value', participantsUnsubscribe);
    };
  }, [chatId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userData) return;

    try {
      const messageRef = push(ref(database, `groupChats/${chatId}/messages`));
      
      // Create message object
      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData.username || userData.displayName || 'User',
        userType: userData.userType || 'student',
        timestamp: Date.now()
      };
      
      // Add message to database
      await set(messageRef, messageData);
      
      // Update last message in group chat
      await set(ref(database, `groupChats/${chatId}/lastMessage`), {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData.username || userData.displayName || 'User',
        timestamp: Date.now()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;
    const isSystemMessage = item.senderId === 'system';
    
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Text style={styles.senderName}>
            {item.senderName} {item.userType === 'teacher' ? '(Teacher)' : ''}
          </Text>
        )}
        <BlurView intensity={0} tint="light" style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          styles.glassEffect
        ]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTimestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </BlurView>
      </View>
    );
  };

  const renderParticipantCount = () => {
    const count = Object.keys(participants).length;
    return (
      <BlurView intensity={0} tint="light" style={[styles.participantsButton, styles.glassEffect]}>
        <Ionicons name="people" size={16} color="#1A237E" />
        <Text style={styles.participantsCount}>{count}</Text>
      </BlurView>
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
        <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
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
      
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BlurView intensity={0} tint="light" style={[styles.backButtonContainer, styles.glassEffect]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1A237E" />
            </TouchableOpacity>
          </BlurView>
          <Text style={styles.headerTitle}>{subjectName}</Text>
          {renderParticipantCount()}
        </View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <Animated.View 
            entering={FadeInDown.duration(800).springify()} 
            style={styles.messageListContainer}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onContentSizeChange={() => 
                flatListRef.current?.scrollToEnd({ animated: false })
              }
              onLayout={() => 
                flatListRef.current?.scrollToEnd({ animated: false })
              }
            />
          </Animated.View>
          
          <BlurView intensity={0} tint="light" style={[styles.inputContainer, styles.glassEffect]}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color={newMessage.trim() ? "#2196F3" : "#BBB"} 
              />
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
    marginLeft: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  participantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  participantsCount: {
    color: '#1A237E',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messageListContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    margin: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  systemMessageText: {
    fontSize: 12,
    color: '#1A237E',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 8,
    borderRadius: 10,
    textAlign: 'center',
    maxWidth: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
    color: '#1A237E',
    marginLeft: 12,
    fontWeight: '500',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 80,
  },
  currentUserBubble: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderBottomRightRadius: 5,
  },
  otherUserBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    margin: 10,
    marginTop: 0,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sendButton: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    // elevation: 2,
  },
  // Decorative circles from Login page
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