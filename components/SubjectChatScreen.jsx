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
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTimestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderParticipantCount = () => {
    const count = Object.keys(participants).length;
    return (
      <TouchableOpacity 
        style={styles.participantsButton}
        onPress={() => alert(`${count} participants in this group`)}
      >
        <Ionicons name="people" size={16} color="#FFF" />
        <Text style={styles.participantsCount}>{count}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName}</Text>
        {renderParticipantCount()}
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
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
              color={newMessage.trim() ? "#2196F3" : "#999"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
  participantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantsCount: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 12,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 5,
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
    color: '#888',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 10,
    textAlign: 'center',
    maxWidth: '70%',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
    color: '#666',
    marginLeft: 12,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#E3F2FD',
    borderBottomRightRadius: 5,
  },
  otherUserBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
});