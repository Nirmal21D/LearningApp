
// components/TeachersList.jsx
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
import { ref, onValue } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, database } from '@/lib/firebase';

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) return;
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Query teachers from Firestore
      const teachersRef = collection(db, 'users');
      const teachersQuery = query(
        teachersRef,
        where('role', '==', 'teacher')
      );

      const querySnapshot = await getDocs(teachersQuery);
      
      // Get chat data from Realtime Database
      const chatsRef = ref(database, 'chats');
      const unsubscribe = onValue(chatsRef, (snapshot) => {
        const chatsData = snapshot.val() || {};
        
        const teacherList = [];
        querySnapshot.forEach((doc) => {
          const teacherData = doc.data();
          const teacherId = doc.id;
          const chatId = [auth.currentUser.uid, teacherId].sort().join('_');
          const chatData = chatsData[chatId];
          
          teacherList.push({
            id: teacherId,
            username: teacherData.username,
            email: teacherData.email,
            selectedSubject: teacherData.selectedSubject,
            lastMessage: chatData?.lastMessage?.text,
            unreadCount: chatData?.unreadCount?.[auth.currentUser.uid] || 0,
            timestamp: chatData?.lastMessage?.timestamp
          });
        });

        setTeachers(teacherList);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
      setLoading(false);
    }
  };

  const handleChatPress = (teacher) => {
    if (!auth.currentUser) {
      console.error('No authenticated user');
      return;
    }

    const chatId = [auth.currentUser.uid, teacher.id].sort().join('_');
    router.push({
      pathname: '/chat/private',
      params: {
        chatId,
        teacherId: teacher.id,
        teacherName: teacher.username,
        teacherSubject: teacher.selectedSubject
      }
    });
  };

  const renderTeacherItem = ({ item }) => (
    <TouchableOpacity
      style={styles.teacherItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>
          {item.username || 'Unknown Teacher'}
        </Text>
        <Text style={styles.teacherSubject}>
          {item.selectedSubject || 'Subject not specified'}
        </Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>
            {item.unreadCount}
          </Text>
        </View>
      )}
      
      <Ionicons name="chatbubble-outline" size={24} color="#2196F3" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading teachers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat with Teachers</Text>
      </View>
      
      {teachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No teachers available</Text>
        </View>
      ) : (
        <FlatList
          data={teachers}
          renderItem={renderTeacherItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchTeachers}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    padding: 10,
  },
  teacherItem: {
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
  teacherInfo: {
    flex: 1,
    marginLeft: 15,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  teacherSubject: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#FF4081',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
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