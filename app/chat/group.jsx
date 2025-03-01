import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ref, push, onValue, off, set, update } from "firebase/database";
import { auth, database, addUserToGroupChat } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function GroupChats() {
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    const loadUserData = async () => {
      try {
        const userQuery = query(
          collection(db, "users"),
          where("email", "==", auth.currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const user = userSnapshot.docs[0].data();
          const userId = userSnapshot.docs[0].id;
          setUserRole(user.userType || "student");
          setUserData({
            id: userId,
            ...user,
            joinedGroups: user.joinedGroups || [],
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || !userData) return;

    const loadSubjectGroups = async () => {
      try {
        console.log("Current user ID:", auth.currentUser.uid);
        console.log("User role:", userRole);

        // For teachers: Get all subjects they teach
        // For students: Get all available subjects
        let subjectsQuery;

        if (userRole === "teacher") {
          subjectsQuery = query(
            collection(db, "subjects"),
            where("teacherId", "==", userData.id)
          );
        } else {
          // For students, get all subjects
          subjectsQuery = collection(db, "subjects");
        }

        const subjectsSnapshot = await getDocs(subjectsQuery);
        console.log("Number of subjects found:", subjectsSnapshot.size);

        if (subjectsSnapshot.empty) {
          setSubjectGroups([]);
          setLoading(false);
          return;
        }

        // Listen to realtime group chat updates
        const groupChatsRef = ref(database, "groupChats");
        const unsubscribe = onValue(groupChatsRef, async (snapshot) => {
          const groupChatsData = snapshot.val() || {};
          const groupsList = [];

          subjectsSnapshot.forEach((doc) => {
            const subjectData = doc.data();
            const subjectId = doc.id;
            const groupChatId = subjectData.groupChatId;

            // If no group chat exists yet for this subject
            if (!groupChatId || !groupChatsData[groupChatId]) {
              groupsList.push({
                id: `subject_${subjectId}`,
                subjectId,
                subjectName: subjectData.name,
                description: subjectData.description,
                teacherId: subjectData.teacherId,
                needsInitialization: true,
                participantsCount: 0,
              });
              return;
            }

            const groupChatData = groupChatsData[groupChatId];

            // Check if user is already a participant from Firebase data
            const isParticipantInFirebase =
              groupChatData?.participants?.[auth.currentUser.uid] ||
              groupChatData?.participants?.[userData.id];

            // Check if user has this group in their joinedGroups array
            const isInUserJoinedGroups =
              userData.joinedGroups?.includes(groupChatId);

            const isParticipant =
              // Check if user is in participants list by their Firestore ID
              (userData.id && groupChatData?.participants?.[userData.id]) ||
              // Or check if user is in participants list by their Auth UID
              (auth.currentUser.uid &&
                groupChatData?.participants?.[auth.currentUser.uid]) ||
              // Or check if groupChatId is in user's joinedGroups array
              (userData.joinedGroups &&
                userData.joinedGroups.includes(groupChatId));

            console.log(
              `Group ${groupChatId} - Is participant: ${isParticipant}`,
              {
                inFirebase:
                  groupChatData?.participants?.[userData.id] ||
                  groupChatData?.participants?.[auth.currentUser.uid],
                inJoinedGroups: userData.joinedGroups?.includes(groupChatId),
              }
            );
            const isTeacherOfSubject = userData.id === subjectData.teacherId;

            if (userRole === "teacher" && isTeacherOfSubject) {
              groupsList.push({
                id: groupChatId,
                subjectId,
                subjectName: subjectData.name,
                description: subjectData.description,
                teacherId: subjectData.teacherId,
                lastMessage: groupChatData.lastMessage,
                participantsCount: Object.keys(groupChatData.participants || {})
                  .length,
                unreadCount: 0,
                isParticipant: true,
              });
            } else if (isParticipant) {
              groupsList.push({
                id: groupChatId,
                subjectId,
                subjectName: subjectData.name,
                description: subjectData.description,
                teacherId: subjectData.teacherId,
                lastMessage: groupChatData.lastMessage,
                participantsCount: Object.keys(groupChatData.participants || {})
                  .length,
                unreadCount: 0,
                isParticipant: true,
              });
            } else if (userRole === "student") {
              // For students, show all available groups they can join
              groupsList.push({
                id: groupChatId,
                subjectId,
                subjectName: subjectData.name,
                description: subjectData.description,
                teacherId: subjectData.teacherId,
                participantsCount: Object.keys(groupChatData.participants || {})
                  .length,
                isParticipant: false,
              });
            }
          });

          console.log("Final groups list count:", groupsList.length);
          setSubjectGroups(groupsList);
          setLoading(false);
        });

        return () => off(groupChatsRef);
      } catch (error) {
        console.error("Error loading group chats:", error);
        setLoading(false);
      }
    };

    if (userData) {
      loadSubjectGroups();
    }
  }, [userData, userRole]);

  const initializeGroupChat = async (group) => {
    try {
      // Create the group chat in the Realtime Database
      const chatId = `subject_${group.subjectId}`;
      const chatRef = ref(database, `groupChats/${chatId}`);

      // Set initial chat data
      await set(chatRef, {
        subjectId: group.subjectId,
        subjectName: group.subjectName,
        teacherId: group.teacherId,
        participants: {
          [auth.currentUser.uid]: true,
          [userData.id]: true,
        },
        createdAt: Date.now(),
        lastMessage: {
          text: "Group chat created",
          senderName: userData.username || "Teacher",
          senderId: auth.currentUser.uid,
          timestamp: Date.now(),
        },
      });

      // Update the subject document with the group chat ID
      await updateDoc(doc(db, "subjects", group.subjectId), {
        groupChatId: chatId,
      });

      // Add group to teacher's joinedGroups array
      const userDocRef = doc(db, "users", userData.id);
      await updateDoc(userDocRef, {
        joinedGroups: arrayUnion(chatId),
      });

      // Update local state
      setUserData({
        ...userData,
        joinedGroups: [...(userData.joinedGroups || []), chatId],
      });

      Alert.alert(
        "Success",
        "Group chat has been initialized for this subject!",
        [{ text: "OK" }]
      );

      // Navigate to the chat
      router.push({
        pathname: "/chat/subject-chat",
        params: {
          chatId: chatId,
          subjectName: group.subjectName,
        },
      });
    } catch (error) {
      console.error("Error initializing group chat:", error);
      Alert.alert(
        "Error",
        "Failed to initialize the group chat. Please try again."
      );
    }
  };

  const joinGroupChat = async (group) => {
    try {
      // Check if user is already a member (double check)
      if (userData.joinedGroups?.includes(group.id)) {
        // User is already a member, just navigate to chat
        router.push({
          pathname: "/chat/subject-chat",
          params: {
            chatId: group.id,
            subjectName: group.subjectName,
          },
        });
        return;
      }

      // Add the user to the participants list in Firebase Realtime DB
      await addUserToGroupChat(
        group.id,
        userData.id,
        userData.username || auth.currentUser.displayName || "Student"
      );

      // Add group to user's joinedGroups array in Firestore
      const userDocRef = doc(db, "users", userData.id);
      await updateDoc(userDocRef, {
        joinedGroups: arrayUnion(group.id),
      });

      // Update local state
      setUserData({
        ...userData,
        joinedGroups: [...(userData.joinedGroups || []), group.id],
      });

      Alert.alert("Success", "You have joined the group!", [{ text: "OK" }]);

      // Navigate to the chat
      router.push({
        pathname: "/chat/subject-chat",
        params: {
          chatId: group.id,
          subjectName: group.subjectName,
        },
      });
    } catch (error) {
      console.error("Error joining group chat:", error);
      Alert.alert("Error", "Failed to join the group. Please try again.");
    }
  };

  const handleGroupPress = (group) => {
    // First, double-check if user is already a member (could happen if state is out of sync)
    const isAlreadyMember =
      userData.joinedGroups && userData.joinedGroups.includes(group.id);

    if (userRole === "teacher" && group.needsInitialization) {
      // For teachers - initialize the group if it doesn't exist
      Alert.alert(
        "Initialize Group Chat",
        `Do you want to create a group chat for ${group.subjectName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Create", onPress: () => initializeGroupChat(group) },
        ]
      );
    } else if (
      !group.isParticipant &&
      !isAlreadyMember &&
      userRole === "student"
    ) {
      // For students - join the group if not already a participant
      Alert.alert(
        "Join Group Chat",
        `Do you want to join the ${group.subjectName} group chat?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Join", onPress: () => joinGroupChat(group) },
        ]
      );
    } else {
      // If already a participant by any means, just navigate to the chat
      router.push({
        pathname: "/chat/subject-chat",
        params: {
          chatId: group.id,
          subjectName: group.subjectName,
        },
      });
    }
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.groupItem,
        !item.isParticipant &&
          !item.needsInitialization &&
          styles.inactiveGroup,
      ]}
      onPress={() => handleGroupPress(item)}
    >
      <View style={styles.groupIconContainer}>
        <Ionicons
          name={item.needsInitialization ? "create-outline" : "people"}
          size={24}
          color={
            item.isParticipant || item.needsInitialization ? "#2196F3" : "#999"
          }
        />
      </View>

      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.subjectName}</Text>

        {item.needsInitialization && userRole === "teacher" && (
          <Text style={styles.needsInitText}>Tap to initialize group chat</Text>
        )}

        {!item.isParticipant &&
          !item.needsInitialization &&
          userRole === "student" && (
            <Text style={styles.joinText}>Tap to join</Text>
          )}

        {item.participantsCount > 0 && (
          <Text style={styles.participantsCount}>
            {item.participantsCount} participants
          </Text>
        )}

        {item.lastMessage && (
          <View style={styles.lastMessageContainer}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {item.lastMessage.senderName}: {item.lastMessage.text}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.lastMessage.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}

      {!item.isParticipant && !item.needsInitialization && (
        <View style={styles.joinIconContainer}>
          <Ionicons name="add-circle-outline" size={24} color="#666" />
        </View>
      )}
    </TouchableOpacity>
  );

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { id: Date.now().toString(), text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === "You" ? styles.ownMessage : styles.otherMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

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
          <Text style={styles.loadingText}>Loading subject groups...</Text>
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

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BlurView intensity={0} tint="light" style={styles.headerBlur}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Subject Groups</Text>
            <View style={styles.placeholderView} />
          </BlurView>
        </View>

        <Animated.View entering={FadeInDown.duration(1000).springify()}>
          {subjectGroups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BlurView intensity={40} tint="light" style={styles.emptyBlurContainer}>
                <Ionicons name="people-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>
                  {userRole === "teacher"
                    ? "You don't have any subjects to create groups for"
                    : "No subject groups available"}
                </Text>
              </BlurView>
            </View>
          ) : (
            <FlatList
              data={subjectGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </Animated.View>

        <View style={styles.messagesContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContainer}
              inverted
            />
          )}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 40 : 15,
    zIndex: 10,
  },
  headerBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A237E",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  placeholderView: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyBlurContainer: {
    padding: 30,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listContainer: {
    padding: 16,
  },
  groupItem: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 15,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    ////borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
  },
  inactiveGroup: {
    opacity: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(227, 242, 253, 0.6)',
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1A237E",
  },
  needsInitText: {
    fontSize: 12,
    color: "#2196F3",
    fontStyle: "italic",
    marginBottom: 5,
  },
  joinText: {
    fontSize: 12,
    color: "#4CAF50",
    fontStyle: "italic",
    marginBottom: 5,
  },
  participantsCount: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  lastMessageContainer: {
    marginTop: 5,
  },
  lastMessageText: {
    fontSize: 14,
    color: "#444",
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 10,
    right: 10,
  },
  unreadCount: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  joinIconContainer: {
    justifyContent: "center",
    marginLeft: 10,
  },
  // Blur circles from login screen
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
  messagesContainer: {
    padding: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    maxWidth: "80%",
  },
  ownMessage: {
    backgroundColor: "#2196F3",
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#FFF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
});