import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot} from 'firebase/firestore';
import { db,auth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function SessionNotification() {
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(newNotifications);

      // Show alert for new session notifications
      newNotifications.forEach(notification => {
        if (notification.type === 'session_started') {
          Alert.alert(
            'Session Started',
            notification.message,
            [
              {
                text: 'Join Now',
                onPress: () => handleJoinSession(notification)
              },
              {
                text: 'Later',
                style: 'cancel'
              }
            ]
          );
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const handleJoinSession = (notification) => {
    router.push({
      pathname: '/screens/video-call',
      params: { 
        roomId: notification.roomId,
        sessionId: notification.sessionId,
        isTeacher: false
      }
    });
  };

  return (
    <View style={styles.container}>
      {notifications.map(notification => (
        <TouchableOpacity 
          key={notification.id}
          style={styles.notificationCard}
          onPress={() => handleJoinSession(notification)}
        >
          <Ionicons 
            name={notification.type === 'session_started' ? 'videocam' : 'notifications'} 
            size={24} 
            color="#2196F3" 
          />
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // container: {
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   right: 0,
  //   zIndex: 1000,
  // },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationContent: {
    marginLeft: 10,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 