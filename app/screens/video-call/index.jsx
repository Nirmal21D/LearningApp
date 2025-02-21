import React from 'react';
import { View, StyleSheet } from 'react-native';
import VideoCallComponent from '@/components/VideoCallComponent';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function VideoCallScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Extract all necessary params
  const {
    roomId = `room-${Math.random().toString(36).slice(2)}`,
    sessionId,
    isTeacher = false,
    studentName,
    teacherName,
    topic
  } = params;

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <VideoCallComponent
        roomId={roomId}
        sessionId={sessionId}
        isTeacher={Boolean(isTeacher)}
        studentName={studentName}
        teacherName={teacherName}
        topic={topic}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});