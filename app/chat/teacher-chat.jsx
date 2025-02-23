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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, database, auth } from '@/lib/firebase';

const TeacherChatsScreen = () => {
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user');
        return;
      }

      // Get all students
      const studentsQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'student')
      );

      const studentsSnapshot = await getDocs(studentsQuery);
      const students = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // For each student, check if there's a chat with the current teacher
      const chatPromises = students.map(async (student) => {
        const chatId = `${student.id}_${auth.currentUser.uid}`;
        const chatRef = ref(database, `privateChats/${chatId}/messages`);
        const chatSnapshot = await get(chatRef);
        
        if (chatSnapshot.exists()) {
          // Get the last message
          const messages = Object.values(chatSnapshot.val());
          const lastMessage = messages[messages.length - 1];
          
          return {
            id: chatId,
            studentName: student.username,
            studentId: student.id,
            lastMessage,
            timestamp: lastMessage.timestamp
          };
        }
        return null;
      });

      const chats = (await Promise.all(chatPromises)).filter(chat => chat !== null);
      
      // Sort chats by timestamp
      chats.sort((a, b) => b.timestamp - a.timestamp);
      
      setChatSessions(chats);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions');
      setIsLoading(false);
    }
  };

  const handleOpenChat = (session) => {
    router.push({
      pathname: '/chat/private',
      params: {
        chatId: session.id,
        studentName: session.studentName,
        recipientId: session.studentId,
        isTeacher: true
      }
    });
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.chatIcon}>
        <Ionicons name="person-circle-outline" size={40} color="#2196F3" />
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.studentName}>{item.studentName}</Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
        )}
      </View>
      {item.lastMessage && (
        <Text style={styles.timestamp}>
          {new Date(item.lastMessage.timestamp).toLocaleTimeString()}
        </Text>
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Student Messages</Text>
      </View>

      {chatSessions.length > 0 ? (
        <FlatList
          data={chatSessions}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#757575" />
          <Text style={styles.emptyText}>No chat sessions yet</Text>
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
  listContainer: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatIcon: {
    marginRight: 16,
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
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});

export default TeacherChatsScreen;