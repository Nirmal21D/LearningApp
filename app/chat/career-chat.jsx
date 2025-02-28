import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { auth } from '../../lib/firebase';
import CareerChatComponent from '../../components/CareerChatComponent';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function CareerChat() {
  const params = useLocalSearchParams();
  const user = auth.currentUser;

  if (!user || !params) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Determine if current user is guider or student
  const isGuider = user.uid === params.guiderId;
  
  // Set up props for CareerChatComponent
  const chatProps = {
    otherUserId: isGuider ? params.studentId : params.guiderId,
    otherUserName: isGuider ? params.studentName : params.guiderName,
    isGuider: isGuider,
    // chatId is optional, it will be generated in the component if not provided
    chatId: `${params.guiderId}_${params.studentId}`
  };

  return <CareerChatComponent {...chatProps} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  }
});