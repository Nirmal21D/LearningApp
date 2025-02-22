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
    if (message.includes("/session") || message.includes("meet.jit.si")) {
      try {
        let roomId;
        if (message.includes("/session")) {
          roomId = message.split("/session")[1];
        } else {
          const url = new URL(message);
          roomId = url.pathname.slice(1);
        }

        router.push({
          pathname: "/screens/video-call",
          params: {
            roomId: roomId,
            sessionId: roomId,
            studentName: auth.currentUser.displayName || auth.currentUser.email,
            isTeacher: false,
            topic: message.includes("/session") ? "Joined Session" : "Jitsi Meeting",
            isJitsi: message.includes("meet.jit.si"),
            jitsiUrl: message.includes("meet.jit.si") ? message : null,
          },
        });
      } catch (error) {
        console.error("Error joining meeting:", error);
        Alert.alert("Error", "Failed to join meeting");
      }
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId === auth.currentUser.uid;
    const isMeetingLink = item.text && (
      item.text.includes('https://meet.jit.si/session') || 
      item.text.includes('/session')
    );

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Text style={styles.senderEmail}>
            {item.senderEmail || item.senderName}
          </Text>
        )}
        
        <View style={[
          styles.messageContent,
          isOwnMessage ? styles.ownMessageContent : styles.otherMessageContent,
          isMeetingLink && styles.meetingLinkContainer
        ]}>
          {isMeetingLink ? (
            <TouchableOpacity 
              onPress={() => handleMeetingLink(item.text)}
              style={styles.linkButton}
            >
              <View style={styles.linkContent}>
                <Ionicons 
                  name="videocam" 
                  size={20} 
                  color={isOwnMessage ? "#fff" : "#2196F3"} 
                  style={styles.linkIcon}
                />
                <Text style={[
                  styles.linkText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}>
                  Join Video Call
                </Text>
              </View>
              <Text style={[
                styles.urlText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]} numberOfLines={1}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
          )}
        </View>
        
        <Text style={[
          styles.timestamp,
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
        ]}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
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
    backgroundColor: "#fff",
  },
  header: {
    padding: 15,
    backgroundColor: "#2196F3",
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
    padding: 15,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    borderRadius: 16,
    padding: 8,
    maxWidth: '80%',
  },
  ownMessageContent: {
    backgroundColor: '#2196F3',
  },
  otherMessageContent: {
    backgroundColor: '#E8E8E8',
  },
  meetingLinkContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  linkButton: {
    padding: 12,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  linkIcon: {
    marginRight: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  urlText: {
    fontSize: 12,
    opacity: 0.8,
    textDecorationLine: 'underline',
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
  },
  ownTimestamp: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  otherTimestamp: {
    alignSelf: 'flex-start',
    marginLeft: 4,
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
