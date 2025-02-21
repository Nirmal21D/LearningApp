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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, database } from '@/lib/firebase';

export default function StudentChats() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) return;

    const loadTeachers = async () => {
      try {
        // Get student's data first
        const studentDoc = await getDocs(
          query(collection(db, 'users'), 
          where('email', '==', auth.currentUser.email))
        );
        
        const studentData = studentDoc.docs[0]?.data();
        if (!studentData || studentData.userType !== 'student') {
          console.error('Invalid student access');
          return;
        }

        // Listen to realtime chat updates
        const chatsRef = ref(database, 'chats');
        const unsubscribe = onValue(chatsRef, async (snapshot) => {
          const chatsData = snapshot.val() || {};
          
          // Get all teachers
          const teachersSnapshot = await getDocs(
            query(collection(db, 'users'), 
            where('userType', '==', 'teacher'))
          );
          
          const teachersList = [];
          
          teachersSnapshot.forEach((doc) => {
            const teacherData = doc.data();
            const teacherId = doc.id;
            const chatId = [auth.currentUser.uid, teacherId].sort().join('_');
            const chatData = chatsData[chatId];
            
            teachersList.push({
              id: teacherId,
              username: teacherData.username,
              email: teacherData.email,
              subject: teacherData.selectedSubject,
              chatId,
              lastMessage: chatData?.lastMessage,
              unreadCount: chatData?.unreadCount?.[auth.currentUser.uid] || 0
            });
          });
          
          setTeachers(teachersList);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading chats:', error);
        setLoading(false);
      }
    };

    loadTeachers();
  }, []);

  const renderTeacherItem = ({ item }) => (
    <TouchableOpacity
      style={styles.teacherItem}
      onPress={() => {
        router.push({
          pathname: '/chat',
          params: {
            chatId: item.chatId,
            teacherName: item.username,
            teacherSubject: item.subject,
            isTeacher: false
          }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>{item.username || 'Unknown Teacher'}</Text>
        <Text style={styles.subjectName}>{item.subject}</Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teacher Messages</Text>
      </View>
      
      <FlatList
        data={teachers}
        renderItem={renderTeacherItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  teacherInfo: {
    flex: 1,
    marginLeft: 16,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subjectName: {
    color: '#666',
    fontSize: 14,
  },
  lastMessage: {
    color: '#666',
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#FF4081',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
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
});