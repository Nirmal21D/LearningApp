import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ref, onValue, push, get, update } from "firebase/database";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, database, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const CareerChatComponent = ({ 
  chatId, 
  otherUserId, 
  otherUserName, 
  isGuider = false 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);
  const router = useRouter();

  // Get current user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;

      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userSnapshot = await getDoc(userDocRef);
        
        if (userSnapshot.exists()) {
          setCurrentUser({
            ...userSnapshot.data(),
            id: auth.currentUser.uid
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Generate a chat ID if not provided
  useEffect(() => {
    if (!chatId && otherUserId && auth.currentUser) {
      const generatedChatId = [auth.currentUser.uid, otherUserId].sort().join('_');
      // Reset any unread count when opening the chat
      resetUnreadCount(generatedChatId);
    }
  }, [chatId, otherUserId]);

  // Reset unread count when opening the chat
  const resetUnreadCount = async (cId) => {
    if (!auth.currentUser) return;
    
    try {
      const chatRef = ref(database, `careerChats/${cId}`);
      const chatSnapshot = await get(chatRef);
      
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.val();
        // Only reset if current user is the recipient of messages
        if (chatData.lastSenderId !== auth.currentUser.uid) {
          await update(chatRef, { unreadCount: 0 });
        }
      }
    } catch (error) {
      console.error("Error resetting unread count:", error);
    }
  };

  // Listen to messages
  useEffect(() => {
    if (!auth.currentUser || (!chatId && !otherUserId)) {
      console.log('Missing required chat parameters');
      return;
    }
    
    const actualChatId = chatId || [auth.currentUser.uid, otherUserId].sort().join('_');
    console.log('Setting up listener for chat:', actualChatId);
    
    const messagesRef = ref(database, `careerChats/${actualChatId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesData = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          messagesData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
      }

      // Sort messages in chronological order (oldest to newest)
      const sortedMessages = messagesData.sort((a, b) => a.timestamp - b.timestamp);
      console.log('Messages loaded:', messagesData.length);
      setMessages(sortedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, otherUserId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser || !otherUserId) return;

    try {
      const actualChatId = chatId || [auth.currentUser.uid, otherUserId].sort().join('_');
      console.log('Sending message to chat:', actualChatId); // Debug log
      
      const messagesRef = ref(database, `careerChats/${actualChatId}/messages`);
      const chatRef = ref(database, `careerChats/${actualChatId}`);

      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: currentUser?.username || auth.currentUser.email,
        isGuider,
        timestamp: Date.now(),
      };

      // Update chat metadata
      const updates = {
        lastMessage: newMessage.trim(),
        lastMessageTime: Date.now(),
        lastSenderId: auth.currentUser.uid,
        guiderId: isGuider ? auth.currentUser.uid : otherUserId,
        studentId: isGuider ? otherUserId : auth.currentUser.uid
      };

      // Update the chat
      await update(chatRef, updates);
      
      // Push the message
      await push(messagesRef, messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId === auth.currentUser?.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>
            {item.senderName}
            {item.isGuider && ' (Career Guider)'}
          </Text>
        )}

        <View
          style={[
            styles.messageContent,
            isOwnMessage ? styles.ownMessageContent : styles.otherMessageContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUserName}</Text>
        <Text style={styles.headerSubtitle}>
          {isGuider ? "Student" : "Career Guidance"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatText}>
            Start a conversation with {otherUserName}
          </Text>
          <Text style={styles.emptyChatSubText}>
            {isGuider 
              ? "Provide career guidance and advice to help the student"
              : "Ask questions about your career interests and future plans"}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            // Scroll to bottom when new messages arrive
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            // Scroll to bottom on initial render
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          inverted={false}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.disabledButton
          ]} 
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={newMessage.trim() ? "#2196F3" : "#B0BEC5"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  headerSubtitle: {
    color: "#E3F2FD",
    fontSize: 14,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    marginLeft: 4,
  },
  messageContent: {
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  ownMessageContent: {
    backgroundColor: "#E3F2FD",
    borderBottomRightRadius: 4,
  },
  otherMessageContent: {
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ownMessageText: {
    color: "#0D47A1",
  },
  otherMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
    color: "#666",
    textAlign: "center",
  },
  emptyChatSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});

export default CareerChatComponent;