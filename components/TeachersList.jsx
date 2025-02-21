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
import { Ionicons } from '@expo/vector-icons';
import {auth,db} from '@/lib/firebase.js';

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      console.log('Fetching teachers...'); // Debug log
      setLoading(true);
      
      // Create a query against the users collection
      const teachersRef = collection(db, 'users');
      const teachersQuery = query(
        teachersRef,
        where('role', '==', 'teacher')
      );

      // Get the teachers
      const querySnapshot = await getDocs(teachersQuery);
      console.log('Snapshot received:', !querySnapshot.empty); // Debug log

      const teacherList = [];
      querySnapshot.forEach((doc) => {
        teacherList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('Teachers found:', teacherList.length); // Debug log
      setTeachers(teacherList);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    } finally {
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
        teacherName: teacher.username || 'Unknown Teacher',
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
        <Text style={styles.teacherEmail}>
          {item.email || 'No email provided'}
        </Text>
      </View>
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
  teacherEmail: {
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