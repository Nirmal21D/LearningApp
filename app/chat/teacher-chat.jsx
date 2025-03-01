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
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
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
      
      // Get all students first
      const studentsData = await Promise.all(studentsSnapshot.docs.map(async (doc) => {
        const studentData = doc.data();
        const chatId = `${doc.id}_${auth.currentUser.uid}`;
        
        // Check for existing chat
        const chatRef = ref(database, `privateChats/${chatId}/messages`);
        const chatSnapshot = await get(chatRef);
        
        let lastMessage = null;
        if (chatSnapshot.exists()) {
          const messages = Object.values(chatSnapshot.val());
          lastMessage = messages[messages.length - 1];
        }

        return {
          id: doc.id,
          chatId: chatId,
          username: studentData.username || 'Student',
          email: studentData.email,
          hasChat: chatSnapshot.exists(),
          lastMessage: lastMessage,
          timestamp: lastMessage?.timestamp || 0
        };
      }));

      // Sort: students with chats first, then alphabetically
      const sortedStudents = studentsData.sort((a, b) => {
        if (a.hasChat && !b.hasChat) return -1;
        if (!a.hasChat && b.hasChat) return 1;
        if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
        return a.username.localeCompare(b.username);
      });

      setStudents(sortedStudents);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
      setIsLoading(false);
    }
  };

  const handleOpenChat = (student) => {
    router.push({
      pathname: '/chat/private',
      params: {
        chatId: student.chatId,
        studentName: student.username,
        recipientId: student.id,
        isTeacher: true
      }
    });
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.chatIcon}>
        <Ionicons 
          name={item.hasChat ? "person-circle" : "person-circle-outline"} 
          size={40} 
          color={item.hasChat ? "#2196F3" : "#757575"} 
        />
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.studentName}>
          {item.username}
          {item.hasChat && <Text style={styles.activeChat}> • Active Chat</Text>}
        </Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
        )}
      </View>
      <Ionicons 
        name={item.hasChat ? "chatbubbles" : "chatbubbles-outline"} 
        size={24} 
        color={item.hasChat ? "#2196F3" : "#757575"} 
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Messages</Text>
      </View>

      {students.length > 0 ? (
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#757575" />
          <Text style={styles.emptyText}>No students found</Text>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  separator: {
    height: 8,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  activeChat: {
    color: '#2196F3',
    fontSize: 14,
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
  }
});

export default TeacherChatsScreen;