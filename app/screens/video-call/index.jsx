import React, { useEffect } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import VideoCallComponent from '@/components/VideoCallComponent';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Permissions from 'expo-permissions';
import { Camera } from 'expo-camera';

export default function VideoCallScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Parse parameters with default values
  const {
    roomId,
    sessionId,
    isTeacher = false,
    studentName,
    teacherName,
    
    topic,
    isJitsi = false,
    jitsiUrl
  } = params;

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission = await Camera.requestMicrophonePermissionsAsync();

      if (cameraPermission.status !== 'granted' || microphonePermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone access are needed for video calls',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
                router.back(); // Go back since permissions weren't granted
              }
            },
            {
              text: 'Cancel',
              onPress: () => router.back(),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request necessary permissions',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

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
        isJitsi={Boolean(isJitsi)}
        jitsiUrl={jitsiUrl}
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