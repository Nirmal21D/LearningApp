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
import { ref, onValue, push, serverTimestamp } from "firebase/database";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, database, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
  requestNotificationPermissions,
  isChatMuted,
  toggleChatMute,
  sendLocalNotification,
} from "@/lib/notifications";
import { useRouter } from "expo-router";

const ChatComponent = ({ chatId, teacherName, teacherSubject }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef(null);
  const router = useRouter();

  // Initialize notifications and get user type
  useEffect(() => {
    const init = async () => {
      await requestNotificationPermissions();
      const muted = await isChatMuted(chatId);
      setIsMuted(muted);

      if (!auth.currentUser?.email) return;

      try {
        const q = query(
          collection(db, "users"),
          where("email", "==", auth.currentUser.email)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setUserType(snapshot.docs[0].data().userType);
        }
      } catch (error) {
        console.error("Error getting user type:", error);
      }
    };
    init();
  }, [chatId]);

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;

    console.log(
      "Setting up message listener for:",
      chatId,
      "User type:",
      userType
    );
    const messagesRef = ref(database, `privateChats/${chatId}/messages`);

    const unsubscribe = onValue(messagesRef, async (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = [];
        snapshot.forEach((childSnapshot) => {
          messagesData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });

        const sortedMessages = messagesData.sort(
          (a, b) => b.timestamp - a.timestamp
        );
        setMessages(sortedMessages);

        const latestMessage = sortedMessages[0];
        console.log("Latest message:", latestMessage);

        if (
          latestMessage &&
          latestMessage.senderId !== auth.currentUser.uid &&
          !isMuted &&
          latestMessage.timestamp > Date.now() - 1000
        ) {
          const senderType = latestMessage.isTeacher ? "Teacher" : "Student";
          await sendLocalNotification(
            `New message from ${senderType}`,
            latestMessage.text
          );
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, isMuted]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        text: newMessage,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email,
        isTeacher: userType === "teacher",
        timestamp: Date.now(),
      };

      const messagesRef = ref(database, `privateChats/${chatId}/messages`);
      await push(messagesRef, messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleToggleMute = async () => {
    const newMuteStatus = await toggleChatMute(chatId);
    setIsMuted(newMuteStatus);
  };

  const handleMeetingLink = (message) => {
    if (message.includes('https://meet.jit.si/')) {
      try {
        // Extract the room name from the Jitsi meet link
        const url = new URL(message);
        const roomName = url.pathname.slice(1); // Remove the leading slash

        router.push({
          pathname: '/screens/video-call',
          params: {
            roomId: roomName,
            sessionId: roomName,
            studentName: auth.currentUser.displayName || auth.currentUser.email,
            isTeacher: false,
            topic: 'Teacher\'s Meeting',
            isJitsi: true, // Flag to indicate this is an external Jitsi meeting
            jitsiUrl: message // Pass the full Jitsi URL
          }
        });
      } catch (error) {
        console.error('Error joining Jitsi meeting:', error);
        Alert.alert('Error', 'Failed to join meeting');
      }
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId === auth.currentUser.uid;
    const isMeetingLink = (item.text && item.text.includes('https://meet.jit.si/')) || item.type === 'meeting';

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Text style={styles.senderEmail}>
            {item.senderEmail || item.senderName}
            {item.isTeacher && ' (Teacher)'}
          </Text>
        )}
        
        {isMeetingLink ? (
          <TouchableOpacity 
            onPress={() => handleMeetingLink(item.text)}
            style={[
              styles.meetingLinkContainer,
              isOwnMessage ? styles.ownMeetingLink : styles.otherMeetingLink
            ]}
          >
            <View style={styles.meetingHeader}>
              <Ionicons 
                name="videocam" 
                size={24} 
                color={isOwnMessage ? "#fff" : "#2196F3"} 
              />
              <Text style={[
                styles.meetingTitle,
                isOwnMessage ? styles.ownMeetingText : styles.otherMeetingText
              ]}>
                {item.isTeacher ? "Join Teacher's Meeting" : "Join Meeting"}
              </Text>
            </View>
            
            <View style={styles.meetingInfo}>
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={isOwnMessage ? "#E3F2FD" : "#666"} 
              />
              <Text style={[
                styles.meetingTime,
                isOwnMessage ? styles.ownMeetingText : styles.otherMeetingText
              ]}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.messageContent,
            isOwnMessage ? styles.ownMessageContent : styles.otherMessageContent
          ]}>
            <Text style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{teacherName}</Text>
        <Text style={styles.headerSubtitle}>{teacherSubject}</Text>
        <TouchableOpacity onPress={handleToggleMute} style={styles.muteButton}>
          <Ionicons
            name={isMuted ? "notifications-off" : "notifications"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  header: {
    padding: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    
  },
  messagesList: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
    
  },
  ownMessageContent: {
    backgroundColor: '#2196F3',
  },
  otherMessageContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  messageText: {
    fontSize: 15,
    
  },
  ownMessageText: {
    color: '#FFFFFF',
    
  },
  otherMessageText: {
    color: '#000000',
  },
  senderEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  meetingLinkContainer: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  ownMeetingLink: {
    backgroundColor: '#1976D2', // Darker blue for meetings
  },
  otherMeetingLink: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  meetingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  meetingTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  ownMeetingText: {
    color: '#FFFFFF',
  },
  otherMeetingText: {
    color: '#2196F3',
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  muteButton: {
    position: "absolute",
    right: 15,
    top: 15,
  },
});

export default ChatComponent;
