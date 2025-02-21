// /app/chat/private.jsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import TeacherChat from './teacher-chat';
import StudentChat from './student-chat';

export default function PrivateChat() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserType = async () => {
      if (!auth.currentUser) {
        router.push('/login');
        return;
      }

      try {
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', auth.currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setUserType(userData.userType);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking user type:', error);
        setLoading(false);
      }
    };

    checkUserType();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Render the appropriate chat component based on user type
  return userType === 'teacher' ? <TeacherChat /> : <StudentChat />;
}