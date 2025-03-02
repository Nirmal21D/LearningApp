import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import ChatComponent from '@/components/ChatComponent';
import { auth, db } from '@/lib/firebase';
import LoadingScreen from './LoadingScreen';

export default function TeacherChats() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      fetchStudentChats();
    }
  }, []);

  const fetchStudentChats = async () => {
    try {
      console.log('Fetching student chats...'); // Debug log
      setLoading(true);
      
      // Get all users who are students
      const usersRef = collection(db, 'users');
      const studentsQuery = query(
        usersRef,
        where('userType', '==', 'student')
      );

      const querySnapshot = await getDocs(studentsQuery);
      console.log('Students found:', !querySnapshot.empty); // Debug log

      const studentsList = [];
      querySnapshot.forEach((doc) => {
        studentsList.push({
          id: doc.id,
          ...doc.data(),
          chatId: [auth.currentUser.uid, doc.id].sort().join('_')
        });
      });

      console.log('Total students:', studentsList.length); // Debug log
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (student) => {
    setSelectedChat({
      sessionId: student.chatId,
      isTeacher: true,
      studentName: student.username || 'Student',
      teacherName: auth.currentUser.displayName || 'Teacher'
    });
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {item.username || 'Unknown Student'}
        </Text>
        <Text style={styles.studentEmail}>
          {item.email || 'No email provided'}
        </Text>
      </View>
      <Ionicons name="chatbubble-outline" size={24} color="#2196F3" />
    </TouchableOpacity>
  );

  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedChat(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
            <Text style={styles.backText}>Back to Students</Text>
          </TouchableOpacity>
        </View>
        <ChatComponent {...selectedChat} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
     <LoadingScreen/>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Chats</Text>
      </View>
      
      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No students available</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchStudentChats}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    padding: 10,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});
