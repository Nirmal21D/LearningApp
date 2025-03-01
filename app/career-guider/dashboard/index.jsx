import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../lib/firebase';
import { signOut, getAuth } from 'firebase/auth';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDatabase, ref, get, onValue } from 'firebase/database';

export default function CareerGuiderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use useCallback to memoize the fetchStudents function
  const fetchStudents = useCallback(async (guiderId) => {
    try {
      setLoading(true);
      // Get all users who are students
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('userType', '==', 'student')
      );

      const querySnapshot = await getDocs(q);
      const studentsData = [];
      const realtimeDb = getDatabase();

      for (const userDoc of querySnapshot.docs) {
        const studentData = userDoc.data();
        const chatId = [userDoc.id, guiderId].sort().join('_');
        
        // Get chat data from Realtime Database
        const chatRef = ref(realtimeDb, `careerChats/${chatId}`);
        const chatSnapshot = await get(chatRef);
        const chatData = chatSnapshot.val() || {};

        studentsData.push({
          id: userDoc.id,
          studentId: userDoc.id,
          studentName: studentData.username || 'Unknown Student',
          email: studentData.email || '',
          mobile: studentData.mobile || '',
          learningSpeed: studentData.learningProfile?.details?.learningSpeed || '',
          lastMessage: chatData.lastMessage || null,
          lastMessageTime: chatData.lastMessageTime || null,
          unreadCount: chatData.unreadCount || 0
        });
      }

      // Sort by last message time
      studentsData.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) {
          return a.studentName.localeCompare(b.studentName);
        }
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime - a.lastMessageTime;
      });

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this doesn't depend on any props or state

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchStudents(currentUser.uid);
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [fetchStudents, router]); // Add dependencies here

  const handleChatPress = (studentId, studentName) => {
    if (!user) return;
    router.push({
      pathname: '/chat/career-chat',
      params: { 
        studentId: studentId,
        studentName: studentName,
        guiderId: user.uid,
        guiderName: user.displayName || 'Career Guider'
      }
    });
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderChatList = () => (
    <FlatList
      data={students}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.chatCard}
          onPress={() => handleChatPress(item.studentId, item.studentName)}
        >
          <View style={styles.chatInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={40} color="#007AFF" />
            </View>
            <View style={styles.messagePreview}>
              <Text style={styles.studentName}>{item.studentName}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              {item.lastMessage ? (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              ) : (
                <Text style={styles.noMessage}>Start a conversation</Text>
              )}
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No students available</Text>
          <Text style={styles.emptySubText}>Students will appear here once they join</Text>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Career Guidance Chats</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : (
        renderChatList()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatCard: {
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  messagePreview: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  noMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});
