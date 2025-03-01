// app/chat/private.jsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ChatComponent from '@/components/ChatComponent';
import StudentChat from './student-chat';
import TeacherChatsScreen from './teacher-chat';

export default function PrivateChat() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', auth.currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          setError('User profile not found');
          setLoading(false);
          return;
        }

        const userData = userSnapshot.docs[0].data();
        
        // Basic validation
        if (!userData.userType || !['student', 'teacher'].includes(userData.userType)) {
          setError('Invalid user profile');
          setLoading(false);
          return;
        }

        setUserType(userData.userType);
        setLoading(false);
      } catch (error) {
        console.error('Error checking user access:', error);
        Alert.alert(
          'Error',
          'Failed to verify user access. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    };

    checkUserAccess();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // If we have a chatId in params, show the chat component
  if (params.chatId) {
    return (
      <ChatComponent
        chatId={params.chatId}
        teacherName={params.teacherName}
        teacherSubject={params.teacherSubject}
        isTeacher={userType === 'teacher'}
      />
    );
  }

  // Otherwise show the appropriate list view based on user type
  return userType === 'teacher' ? <TeacherChatsScreen /> : <StudentChat />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4081',
    textAlign: 'center',
    marginVertical: 10,
  },
});