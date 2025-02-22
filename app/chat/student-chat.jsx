// app/chat/student-chat.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, database } from '@/lib/firebase';

export default function StudentChat() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const loadTeachers = async () => {
    try {
      if (!auth.currentUser?.email) {
        router.replace('/login');
        return;
      }

      // Get student's data
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', auth.currentUser.email)
      );
      
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        setError('User account not found');
        setLoading(false);
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Verify user is a student
      if (userData.userType !== 'student') {
        setError('Unauthorized: Student account required');
        setLoading(false);
        return;
      }

      // Get joined groups (subjects)
      const joinedGroups = userData.joinedGroups || [];
      
      if (joinedGroups.length === 0) {
        setError('No subjects enrolled. Please join a subject first.');
        setLoading(false);
        return;
      }

      // Get teachers without isActive check
      const teachersQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'teacher')
      );
      
      const teachersSnapshot = await getDocs(teachersQuery);
      
      if (teachersSnapshot.empty) {
        setError('No teachers available');
        setLoading(false);
        return;
      }

      const teachersList = teachersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          chatId: [auth.currentUser.uid, doc.id].sort().join('_')
        }))
        .filter(teacher => teacher.selectedSubject); // Only filter for teachers with a selected subject

      if (teachersList.length === 0) {
        setError('No teachers available for your subjects');
        setLoading(false);
        return;
      }

      setTeachers(teachersList);
      setError(null);

    } catch (error) {
      console.error('Error in loadTeachers:', error);
      setError('Unable to load teachers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleChatPress = (teacher) => {
    router.push({
      pathname: '/chat/private',
      params: {
        chatId: teacher.chatId,
        teacherId: teacher.id,
        teacherName: teacher.username,
        teacherSubject: teacher.selectedSubject
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF4081" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadTeachers}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={teachers}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.teacherItem}
            onPress={() => handleChatPress(item)}
          >
            <View style={styles.teacherAvatar}>
              <Text style={styles.avatarText}>
                {item.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>{item.username}</Text>
              <Text style={styles.subjectText}>{item.selectedSubject}</Text>
            </View>
          </TouchableOpacity>
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4081',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
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
  teacherAvatar: {
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
    fontWeight: 'bold',
  },
  teacherInfo: {
    marginLeft: 16,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});