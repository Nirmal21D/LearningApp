import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';

const TeamsFeature = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      }
    };
    fetchUserInfo();
  }, []);

  const handlePrivateChat = () => {
    if (!auth.currentUser) {
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

  const handleSessionRequest = async () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Initialize usage tracking if it doesn't exist
      const usageRef = doc(db, 'toolUsage', auth.currentUser.uid);
      const usageDoc = await getDoc(usageRef);
      
      if (!usageDoc.exists()) {
        await setDoc(usageRef, {
          personalSessions: 0,
          lastSessionRequest: null,
          userId: auth.currentUser.uid
        });
      }

      // Premium users get unlimited access
      if (userData.isPremium) {
        router.push('/session/request');
        return;
      }

      const sessionCost = 10; // Cost in EduTokens

      // Check if user has enough tokens
      if (userData.eduTokens >= sessionCost) {
        const useTokens = await new Promise((resolve) => {
          Alert.alert(
            'Schedule One-to-One Session',
            `This session requires ${sessionCost} EduTokens.\n\nYou have: ${userData.eduTokens} tokens\nCost: ${sessionCost} tokens`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continue', onPress: () => resolve(true) }
            ]
          );
        });

        if (useTokens) {
          const batch = writeBatch(db);
          
          // Update user tokens
          batch.update(userRef, {
            eduTokens: userData.eduTokens - sessionCost
          });

          // Update usage tracking
          batch.update(usageRef, {
            personalSessions: increment(1),
            lastSessionRequest: new Date().toISOString()
          });

          await batch.commit();
          router.push('/session/request');
        }
      } else {
        Alert.alert(
          'Insufficient EduTokens',
          `One-to-one sessions require ${sessionCost} EduTokens.\n\nYou have: ${userData.eduTokens} tokens\n\nUpgrade to Premium for unlimited sessions!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Get Premium',
              onPress: () => router.push('/profile')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing session request:', error);
      Alert.alert('Error', 'Failed to process session request');
    }
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

      <TouchableOpacity 
        style={[
          styles.featureCard, 
          !userInfo?.isPremium && styles.premiumFeature
        ]} 
        onPress={handleSessionRequest}
      >
        <Ionicons name="person-outline" size={24} color="#2196F3" />
        <Text style={styles.featureTitle}>Request One-to-One Session</Text>
        <Text style={styles.featureSubtitle}>Schedule personal tutoring</Text>
        {!userInfo?.isPremium && (
          <View style={styles.tokenCost}>
            <Ionicons name="diamond" size={16} color="#9C27B0" />
            <Text style={styles.tokenText}>10</Text>
          </View>
        )}
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
  premiumFeature: {
    borderColor: '#9C27B0',
    borderWidth: 1,
  },
  tokenCost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  tokenText: {
    marginLeft: 4,
    color: '#9C27B0',
    fontWeight: 'bold',
  }
});

export default TeamsFeature;