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
  SafeAreaView,
} from "react-native";
import { ref, onValue, push, get, update } from "firebase/database";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, database, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown } from "react-native-reanimated";

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
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blurred circles */}
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Glass effect header */}
          <View style={styles.header}>
            <BlurView intensity={0} tint="light" style={styles.headerBlur}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{otherUserName}</Text>
                <Text style={styles.headerSubtitle}>
                  {isGuider ? "Student" : "Career Guidance"}
                </Text>
              </View>
            </BlurView>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <Animated.View 
              entering={FadeInDown.duration(1000).springify()}
              style={styles.emptyChat}
            >
              <Text style={styles.emptyChatText}>
                Start a conversation with {otherUserName}
              </Text>
              <Text style={styles.emptyChatSubText}>
                {isGuider 
                  ? "Provide career guidance and advice to help the student"
                  : "Ask questions about your career interests and future plans"}
              </Text>
            </Animated.View>
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

          <View style={styles.inputContainerWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#666"
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

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
  keyboardAvoid: {
    flex: 1,
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
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    zIndex: 10,
  },
  headerBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    color: "#1A237E",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 18,
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
    // elevation: 1,
    borderWidth: 1,
  },
  ownMessageContent: {
    backgroundColor: "rgba(227, 242, 253, 0.7)",
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomRightRadius: 4,
  },
  otherMessageContent: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
  inputContainerWrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: "#333",
    paddingVertical: 8,
    paddingLeft: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
    color: "#1A237E",
    textAlign: "center",
  },
  emptyChatSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  // Decorative blurred circles (same as in login component)
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

export default CareerChatComponent;