import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, database, auth } from '@/lib/firebase';

const TeacherChatsScreen = () => {
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChats, setActiveChats] = useState([]);

  useEffect(() => {
    fetchChatSessions();
    subscribeToActiveChats();
    
    return () => {
      // Cleanup subscriptions if needed
    };
  }, []);

  const fetchChatSessions = async () => {
    try {
      // Fetch sessions where the teacher is involved
      const sessionsRef = collection(db, 'sessionRequests');
      const q = query(
        sessionsRef,
        where('teacherId', '==', auth.currentUser.uid),
        where('status', 'in', ['approved', 'in-progress', 'completed'])
      );

      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check for messages in each session
      const sessionsWithMessages = await Promise.all(
        sessions.map(async (session) => {
          const messagesRef = ref(database, `privateChats/${session.id}/messages`);
          const messagesSnapshot = await get(messagesRef);
          const hasMessages = messagesSnapshot.exists();
          const lastMessage = hasMessages ? 
            Object.values(messagesSnapshot.val()).sort((a, b) => b.timestamp - a.timestamp)[0] : 
            null;

          return {
            ...session,
            hasMessages,
            lastMessage
          };
        })
      );

      setChatSessions(sessionsWithMessages.filter(session => session.hasMessages));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions');
      setIsLoading(false);
    }
  };

  const subscribeToActiveChats = () => {
    // Subscribe to real-time updates for active chats
    const activeChatsRef = collection(db, 'activeChats');
    const q = query(
      activeChatsRef,
      where('teacherId', '==', auth.currentUser.uid),
      where('status', '==', 'active')
    );

    return onSnapshot(q, (snapshot) => {
      const activeChatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveChats(activeChatsData);
    });
  };

  const handleOpenChat = (session) => {
    router.push({
      pathname: '/screens/private-chat',
      params: {
        sessionId: session.id,
        isTeacher: true,
        studentName: session.studentName || 'Student',
        teacherName: session.teacherName || 'Teacher'
      }
    });
  };

  const renderChatItem = ({ item }) => {
    const lastMessageTime = item.lastMessage ? 
      new Date(item.lastMessage.timestamp).toLocaleTimeString() : 
      'No messages';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleOpenChat(item)}
      >
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubbles" size={24} color="#2196F3" />
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.studentName}>
            {item.studentName || 'Unnamed Student'}
          </Text>
          <Text style={styles.topicText}>Topic: {item.topic}</Text>
          <Text style={styles.lastMessage}>
            {item.lastMessage ? 
              (item.lastMessage.text.length > 30 ? 
                `${item.lastMessage.text.substring(0, 30)}...` : 
                item.lastMessage.text) : 
              'No messages yet'}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={styles.timeText}>{lastMessageTime}</Text>
          {item.status === 'in-progress' && (
            <View style={styles.activeIndicator} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Chats</Text>
        {activeChats.length > 0 && (
          <Text style={styles.activeChatsText}>
            {activeChats.length} Active Chat{activeChats.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {chatSessions.length > 0 ? (
        <FlatList
          data={chatSessions}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.noChatsContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#757575" />
          <Text style={styles.noChatsText}>No chat sessions found</Text>
          <Text style={styles.noChatsSubtext}>
            Chat sessions will appear here once you start communicating with students
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  activeChatsText: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  topicText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#757575',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#9e9e9e',
    marginBottom: 8,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  noChatsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noChatsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  noChatsSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default TeacherChatsScreen;