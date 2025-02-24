import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CallButton = ({ roomId }) => {
  const router = useRouter();

  const handlePress = () => {
    const generatedRoomId = roomId || `room-${Math.random().toString(36).slice(2)}`;
    router.push({
      pathname: '/screens/video-call',
      params: { roomId: generatedRoomId }
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="videocam" size={24} color="white" />
      <Text style={styles.buttonText}>Start Video Call</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CallButton; 