import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';


const filterCategories = [
  { id: 'all', label: 'All' },
  { id: 'tests', label: 'Tests' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'progress', label: 'Progress' },
  { id: 'reminders', label: 'Reminders' },
];

const initialNotifications = [
  {
    id: 1,
    type: 'alert',
    title: 'Physics Test Result Alert',
    message: 'Your recent test score (65%) is below the passing threshold. Schedule remedial session.',
    time: '10m ago',
    icon: 'warning',
    iconColor: '#FF4444',
    iconBg: '#FFF1F0',
    actions: [
      { label: 'Schedule Now', primary: true },
      { label: 'View Details', primary: false }
    ]
  },
  {
    id: 2,
    type: 'achievement',
    title: 'New Achievement!',
    message: 'Earned "Math Master" badge for 90%+ in 3 consecutive tests.',
    time: '1h ago',
    icon: 'trophy',
    iconColor: '#4CAF50',
    iconBg: '#E8F5E9'
  },
  {
    id: 3,
    type: 'tests',
    title: 'Chemistry Test Tomorrow',
    message: 'Topics: Alcohols, Ethers, and Aldehydes.',
    time: '2h ago',
    icon: 'document-text',
    iconColor: '#2196F3',
    iconBg: '#E3F2FD',
    actions: [
      { label: 'View Syllabus', primary: false }
    ]
  },
  {
    id: 4,
    type: 'progress',
    title: 'Progress Update',
    message: '15% improvement in Mathematics this month!',
    time: '3h ago',
    icon: 'trending-up',
    iconColor: '#9C27B0',
    iconBg: '#F3E5F5'
  }
];


export default function NotificationsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [unreadCount, setUnreadCount] = useState(6);
  const [notifications, setNotifications] = useState(initialNotifications);

  const filteredNotifications = selectedCategory === 'all'
    ? notifications
    : notifications.filter(notif => notif.type === selectedCategory);

  const handleDismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.notificationArea}>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <Ionicons name="notifications-outline" size={24} color="#333" />
          </View>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.filterButton,
              selectedCategory === category.id && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedCategory === category.id && styles.filterButtonTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.map((notification) => (
          <View key={notification.id} style={styles.notificationCard}>
            <View style={[styles.iconContainer, { backgroundColor: notification.iconBg }]}>
              <Ionicons name={notification.icon} size={28} color={notification.iconColor} />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <TouchableOpacity 
                  onPress={() => handleDismissNotification(notification.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              {notification.actions && (
                <View style={styles.actionButtons}>
                  {notification.actions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionButton,
                        action.primary && styles.primaryButton
                      ]}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        action.primary && styles.primaryButtonText
                      ]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.timeStamp}>{notification.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: {
      backgroundColor: '#f8f9fa',  // Lighter background for better contrast
    //   flex: 1,
    },
    headerContainer: {
      backgroundColor: 'white',
      borderBottomWidth: 0,
      borderBottomColor: '#e9ecef',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 14,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#f8f9fa',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: '#1a73e8',  // Google Blue for better branding
      letterSpacing: -0.5,
    },
    notificationArea: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    badge: {
      backgroundColor: '#ea4335',  // Google Red for alerts
      borderRadius: 12,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      right: 2,
      top: -2,
      zIndex: 1,
      paddingHorizontal: 6,
      borderWidth: 2,
      borderColor: 'white',
    },
    badgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '700',
    },
    filterContainer: {
      backgroundColor: 'white',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e9ecef',
    },
    filterContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#f8f9fa',
      marginRight: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    filterButtonActive: {
      backgroundColor: '#1a73e8',
      shadowColor: '#1a73e8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    filterButtonText: {
      color: '#5f6368',
      fontSize: 14,
      fontWeight: '600',
    },
    filterButtonTextActive: {
      color: 'white',
    },
    notificationsList: {
      padding: 16,
      paddingTop: 8,
      top: '30px'
    },
    notificationCard: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#e9ecef',
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1a73e8',
      flex: 1,
      marginRight: 8,
      letterSpacing: -0.3,
    },
    notificationMessage: {
      fontSize: 14,
      color: '#202124',
      marginBottom: 12,
      lineHeight: 20,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    actionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#f8f9fa',
      borderWidth: 1,
      borderColor: '#e9ecef',
    },
    primaryButton: {
      backgroundColor: '#ea4335',  // Google Red for primary actions
      borderWidth: 0,
      shadowColor: '#ea4335',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    actionButtonText: {
      color: '#5f6368',
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: 'white',
    },
    timeStamp: {
      fontSize: 12,
      color: '#80868b',
      marginTop: 4,
    },
  });