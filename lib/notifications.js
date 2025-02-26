import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notifications for immediate display when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    return true;
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;

    // Only ask if permissions have not been determined
    if (settings.status !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    // Log the permission status
    console.log('📱 Notification permission status:', finalStatus);

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Failed to get notification permission!');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

export async function isChatMuted(chatId) {
  try {
    const mutedChats = await AsyncStorage.getItem('mutedChats');
    return mutedChats ? JSON.parse(mutedChats).includes(chatId) : false;
  } catch (error) {
    console.error('Error checking mute status:', error);
    return false;
  }
}

export async function toggleChatMute(chatId) {
  try {
    const mutedChats = await AsyncStorage.getItem('mutedChats');
    let mutedChatsArray = mutedChats ? JSON.parse(mutedChats) : [];
    
    if (mutedChatsArray.includes(chatId)) {
      mutedChatsArray = mutedChatsArray.filter(id => id !== chatId);
    } else {
      mutedChatsArray.push(chatId);
    }
    
    await AsyncStorage.setItem('mutedChats', JSON.stringify(mutedChatsArray));
    return mutedChatsArray.includes(chatId);
  } catch (error) {
    console.error('Error toggling mute status:', error);
    return false;
  }
}

export async function sendLocalNotification(title, body, data = {}) {
  console.log('🔔 Attempting to send notification:', { title, body });

  if (Platform.OS === 'web') {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
          console.log('✅ Web notification sent successfully');
        } else {
          console.warn('⚠️ Web notification permission not granted');
        }
      } catch (error) {
        console.error('❌ Error sending web notification:', error);
      }
    }
    return;
  }

  try {
    // Check if we have permission first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ No notification permission!');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // Schedule the notification
    const notificationContent = {
      title,
      body,
      data,
      sound: true,
      priority: 'high',
      vibrate: [0, 250, 250, 250],
      badge: 1,
    };

    console.log('📤 Scheduling notification with content:', notificationContent);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // null means send immediately
    });

    console.log('✅ Notification scheduled successfully:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}