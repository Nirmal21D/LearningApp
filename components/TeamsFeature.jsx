import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '@/lib/firebase';

const TeamsFeature = () => {
  const router = useRouter();

  const handlePrivateChat = () => {
    if (!auth.currentUser) {
      // Handle authentication check
      router.push('/login');
      return;
    }
    router.push('/chat/private');
  };

  const handleGroupChat = () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }
    router.push('/chat/group');
  };

  const handleSessionRequest = () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }
    router.push('/session/request');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.featureCard} onPress={handlePrivateChat}>
        <Ionicons name="chatbubbles-outline" size={24} color="#2196F3" />
        <Text style={styles.featureTitle}>Chat with Teachers</Text>
        <Text style={styles.featureSubtitle}>Start a private conversation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureCard} onPress={handleGroupChat}>
        <Ionicons name="people-outline" size={24} color="#2196F3" />
        <Text style={styles.featureTitle}>Community & Group Chat</Text>
        <Text style={styles.featureSubtitle}>Join group discussions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.featureCard} onPress={handleSessionRequest}>
        <Ionicons name="person-outline" size={24} color="#2196F3" />
        <Text style={styles.featureTitle}>Request One-to-One Session</Text>
        <Text style={styles.featureSubtitle}>Schedule personal tutoring</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  featureCard: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featureSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
});

export default TeamsFeature;