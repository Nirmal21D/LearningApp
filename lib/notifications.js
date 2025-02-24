import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    return true; // Web notifications handled differently
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
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

export async function sendLocalNotification(title, body) {
  if (Platform.OS === 'web') {
    // Web notification handling
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      } catch (error) {
        console.error('Error sending web notification:', error);
      }
    }
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}