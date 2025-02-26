import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Keyboard,
  ScrollView,
  Modal,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const TodoListComponent = ({ storageKey = 'studentTasks', title = 'My Tasks', user }) => {
  const [task, setTask] = useState('');
  const [taskItems, setTaskItems] = useState([]);
  const [editIndex, setEditIndex] = useState(-1);
  const [userInfo, setUserInfo] = useState(null);
  const [categories, setCategories] = useState([
    { id: 'math', name: 'Math', color: '#FF9AA2', icon: 'calculate' },
    { id: 'science', name: 'Science', color: '#FFB7B2', icon: 'science' },
    { id: 'english', name: 'English', color: '#FFDAC1', icon: 'menu-book' },
    { id: 'history', name: 'History', color: '#E2F0CB', icon: 'public' },
    { id: 'language', name: 'Foreign Language', color: '#B5EAD7', icon: 'translate' },
    { id: 'art', name: 'Art', color: '#C7CEEA', icon: 'color-lens' },
    { id: 'pe', name: 'Physical Ed', color: '#F8C8DC', icon: 'directions-run' },
    { id: 'other', name: 'Other', color: '#E6E6FA', icon: 'school' }
  ]);
  const [selectedCategory, setSelectedCategory] = useState('math');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get Firestore database reference
  const db = getFirestore();

  // Load user info and tasks on component mount

  useEffect(() => {
    if (user) {
      fetchUserData();
      loadTasks();
      registerForPushNotifications();
    }
  }, [user]);

  // Save tasks to Firestore whenever tasks change
  useEffect(() => {
    if (user && !loading) {
      saveTasks();
    }
  }, [taskItems, completedTasks, loading]);

  // Handle notifications for existing tasks
  useEffect(() => {
    if (notificationsEnabled) {
      // Clear existing notifications
      cancelAllScheduledNotifications();
      
      // Schedule notifications for all active tasks
      taskItems.forEach(item => {
        scheduleHourlyNotification(item);
      });
    }
  }, [taskItems, notificationsEnabled]);

  const fetchUserData = async () => {
    
  
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setIsLoggedIn(!!user);
      if (user) {
        const db = getFirestore();
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error("User data not found");
        }
        const data = userDocSnap.data();
        setUserInfo(data); 
      }
    }) 
    return () => unsubscribe();
  };

  const registerForPushNotifications = async () => {
    try {
      // Check if permissions are already granted
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
  
      // Only ask if permission has not been granted before
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
  
      if (finalStatus === 'granted') {
        console.log('Notification permissions granted');
        setNotificationsEnabled(true);
      } else {
        console.log('Notification permissions denied');
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your phone settings to receive task reminders.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
        );
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
    }
  };

  const scheduleHourlyNotification = async (taskItem) => {
    try {
      // Schedule hourly notifications for this task
      const categoryName = getCategoryName(taskItem.category);
      
      // First notification 1 hour from now
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 ${categoryName} Task Reminder`,
          body: `Don't forget to complete: ${taskItem.text}`,
          data: { taskId: taskItem.id },
        },
        trigger: {
          seconds: 60*60 , // 1 hour
          repeats: true,
        },
      });
      
      console.log(`Scheduled hourly notification for task: ${taskItem.text}`);
    } catch (error) {
      console.log('Error scheduling notification:', error);
    }
  };

  const cancelNotificationsForTask = async (taskId) => {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel notifications for this task
      for (const notification of scheduledNotifications) {
        if (notification.content.data && notification.content.data.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.log('Error canceling notifications for task:', error);
    }
  };

  const cancelAllScheduledNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.log('Error canceling notifications:', error);
    }
  };

  const loadTasks = async () => {
    try {
      if (!user) return;
      
      setLoading(true);
      
      // Get tasks collection for this user
      const tasksCollectionRef = collection(db, "users", user.uid, "tasks");
      const completedCollectionRef = collection(db, "users", user.uid, "completedTasks");
      
      // Get all tasks
      const tasksSnapshot = await getDocs(tasksCollectionRef);
      const tasksData = tasksSnapshot.docs.map(doc => doc.data());
      
      // Get all completed tasks
      const completedSnapshot = await getDocs(completedCollectionRef);
      const completedData = completedSnapshot.docs.map(doc => doc.data());
      
      setTaskItems(tasksData);
      setCompletedTasks(completedData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading tasks:", error);
      Alert.alert('Error', 'Failed to load your tasks');
      setLoading(false);
    }
  };

  const saveTasks = async () => {
    try {
      if (!user) return;
      
      // Save active tasks
      for (const task of taskItems) {
        const taskDocRef = doc(db, "users", user.uid, "tasks", task.id);
        await setDoc(taskDocRef, task);
      }
      
      // Save completed tasks
      for (const completedTask of completedTasks) {
        const completedTaskDocRef = doc(db, "users", user.uid, "completedTasks", completedTask.id);
        await setDoc(completedTaskDocRef, completedTask);
      }
      
      console.log("Tasks saved to Firestore");
    } catch (error) {
      console.error("Error saving tasks:", error);
      Alert.alert('Error', 'Failed to save your tasks');
    }
  };

  const handleAddTask = () => {
    if (task.trim() === '') {
      Alert.alert('Error', 'Please enter a task');
      return;
    }

    Keyboard.dismiss();
    
    if (editIndex !== -1) {
      // Update existing task
      const updatedItems = [...taskItems];
      const updatedTask = {
        ...updatedItems[editIndex],
        text: task,
        category: selectedCategory,
        updatedAt: new Date().toISOString()
      };
      
      updatedItems[editIndex] = updatedTask;
      setTaskItems(updatedItems);
      setEditIndex(-1);
      
      // Update task in Firestore
      updateTaskInFirestore(updatedTask);
      
      // Update notifications for this task
      if (notificationsEnabled) {
        cancelNotificationsForTask(updatedTask.id);
        scheduleHourlyNotification(updatedTask);
      }
    } else {
      // Create new task
      const newTask = {
        id: Date.now().toString(),
        text: task,
        category: selectedCategory,
        createdAt: new Date().toISOString(),
        userId: user.uid
      };
      
      setTaskItems([...taskItems, newTask]);
      
      // Add task to Firestore
      addTaskToFirestore(newTask);
      
      // Schedule notifications for new task
      if (notificationsEnabled) {
        scheduleHourlyNotification(newTask);
        
        // Show confirmation that notifications are set
        Alert.alert(
          'Task Added',
          'You will receive hourly reminders for this task.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
        );
      }
    }
    
    setTask('');
  };

  const addTaskToFirestore = async (task) => {
    try {
      const taskDocRef = doc(db, "users", user.uid, "tasks", task.id);
      await setDoc(taskDocRef, task);
      console.log("Task added to Firestore:", task.id);
    } catch (error) {
      console.error("Error adding task to Firestore:", error);
    }
  };

  const updateTaskInFirestore = async (task) => {
    try {
      const taskDocRef = doc(db, "users", user.uid, "tasks", task.id);
      await updateDoc(taskDocRef, task);
      console.log("Task updated in Firestore:", task.id);
    } catch (error) {
      console.error("Error updating task in Firestore:", error);
    }
  };

  const deleteTaskFromFirestore = async (taskId) => {
    try {
      const taskDocRef = doc(db, "users", user.uid, "tasks", taskId);
      await deleteDoc(taskDocRef);
      console.log("Task deleted from Firestore:", taskId);
    } catch (error) {
      console.error("Error deleting task from Firestore:", error);
    }
  };

  const completeTaskInFirestore = async (task) => {
    try {
      // Delete from active tasks
      await deleteTaskFromFirestore(task.id);
      
      // Add to completed tasks
      const completedTaskDocRef = doc(db, "users", user.uid, "completedTasks", task.id);
      await setDoc(completedTaskDocRef, {
        ...task,
        completedAt: new Date().toISOString()
      });
      console.log("Task marked as completed in Firestore:", task.id);
    } catch (error) {
      console.error("Error completing task in Firestore:", error);
    }
  };

  const restoreTaskInFirestore = async (task) => {
    try {
      // Delete from completed tasks
      const completedTaskDocRef = doc(db, "users", user.uid, "completedTasks", task.id);
      await deleteDoc(completedTaskDocRef);
      
      // Add to active tasks
      const taskDocRef = doc(db, "users", user.uid, "tasks", task.id);
      await setDoc(taskDocRef, {
        ...task,
        completedAt: null
      });
      console.log("Task restored in Firestore:", task.id);
    } catch (error) {
      console.error("Error restoring task in Firestore:", error);
    }
  };

  const handleEditTask = (index) => {
    setTask(taskItems[index].text);
    setSelectedCategory(taskItems[index].category);
    setEditIndex(index);
  };

  const handleDeleteTask = (index) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => {
            const taskId = taskItems[index].id;
            
            // Cancel notifications for this task
            if (notificationsEnabled) {
              cancelNotificationsForTask(taskId);
            }
            
            // Delete task from Firestore
            deleteTaskFromFirestore(taskId);
            
            const updatedItems = [...taskItems];
            updatedItems.splice(index, 1);
            setTaskItems(updatedItems);
            
            if (editIndex === index) {
              setEditIndex(-1);
              setTask('');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleCompleteTask = (index) => {
    const completedTask = taskItems[index];
    
    // Cancel notifications for this task
    if (notificationsEnabled) {
      cancelNotificationsForTask(completedTask.id);
    }
    
    // Complete task in Firestore
    completeTaskInFirestore(completedTask);
    
    // Remove from tasks and add to completed
    const newTaskItems = [...taskItems];
    newTaskItems.splice(index, 1);
    
    setTaskItems(newTaskItems);
    setCompletedTasks([
      ...completedTasks,
      {
        ...completedTask,
        completedAt: new Date().toISOString()
      }
    ]);
    
    if (editIndex === index) {
      setEditIndex(-1);
      setTask('');
    }
  };

  const handleRestoreTask = (index) => {
    const taskToRestore = completedTasks[index];
    
    // Restore task in Firestore
    restoreTaskInFirestore(taskToRestore);
    
    // Remove from completed and add to tasks
    const newCompletedTasks = [...completedTasks];
    newCompletedTasks.splice(index, 1);
    
    const restoredTask = {
      ...taskToRestore,
      completedAt: null
    };
    
    setCompletedTasks(newCompletedTasks);
    setTaskItems([...taskItems, restoredTask]);
    
    // Re-schedule notifications for this task
    if (notificationsEnabled) {
      scheduleHourlyNotification(restoredTask);
    }
  };

  const selectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    setCategoryModalVisible(false);
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#E6E6FA';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Other';
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.icon : 'school';
  };

  const applyFilter = (filter, categoryId = null) => {
    setActiveFilter(filter);
    setFilterCategoryId(categoryId);
    setFilterModalVisible(false);
  };

  const getFilteredTasks = () => {
    if (activeFilter === 'all') {
      return taskItems;
    } else if (activeFilter === 'category' && filterCategoryId) {
      return taskItems.filter(item => item.category === filterCategoryId);
    } else if (activeFilter === 'recent') {
      const sortedTasks = [...taskItems].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      return sortedTasks;
    }
    return taskItems;
  };

  const getFilteredCompletedTasks = () => {
    if (activeFilter === 'all') {
      return completedTasks;
    } else if (activeFilter === 'category' && filterCategoryId) {
      return completedTasks.filter(item => item.category === filterCategoryId);
    } else if (activeFilter === 'recent') {
      const sortedTasks = [...completedTasks].sort((a, b) => 
        new Date(b.completedAt) - new Date(a.completedAt)
      );
      return sortedTasks;
    }
    return completedTasks;
  };

  const renderCategoryItem = (category) => {
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryItem,
          { backgroundColor: category.color },
          selectedCategory === category.id && styles.selectedCategoryItem
        ]}
        onPress={() => selectCategory(category.id)}
      >
        <MaterialIcons name={category.icon} size={24} color="#333" />
        <Text style={styles.categoryItemText}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterCategoryItem = (category) => {
    const isSelected = activeFilter === 'category' && filterCategoryId === category.id;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.filterCategoryItem,
          { backgroundColor: category.color },
          isSelected && styles.selectedFilterItem
        ]}
        onPress={() => applyFilter('category', category.id)}
      >
        <MaterialIcons name={category.icon} size={20} color="#333" />
        <Text style={styles.filterCategoryText}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.item}>
        <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.category) }]} />
        <MaterialIcons name={getCategoryIcon(item.category)} size={24} color="#555" style={styles.itemIcon} />
        <View style={styles.itemContent}>
          <Text style={styles.itemText}>{item.text}</Text>
          <Text style={styles.categoryLabel}>{getCategoryName(item.category)}</Text>
          {notificationsEnabled && (
            <View style={styles.reminderBadge}>
              <MaterialIcons name="notifications-active" size={12} color="#fff" />
              <Text style={styles.reminderText}>Hourly reminders</Text>
            </View>
          )}
        </View>
        <View style={styles.itemButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleCompleteTask(index)}>
            <MaterialIcons name="check-circle-outline" size={24} color="green" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditTask(index)}>
            <MaterialIcons name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteTask(index)}>
            <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompletedItem = ({ item, index }) => {
    return (
      <View style={[styles.item, styles.completedItem]}>
        <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.category) }]} />
        <MaterialIcons name={getCategoryIcon(item.category)} size={24} color="#888" style={styles.itemIcon} />
        <View style={styles.itemContent}>
          <Text style={[styles.itemText, styles.completedItemText]}>{item.text}</Text>
          <Text style={styles.categoryLabel}>{getCategoryName(item.category)}</Text>
          <Text style={styles.completedDate}>
            Completed: {new Date(item.completedAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleRestoreTask(index)}>
          <MaterialIcons name="restore" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const filteredTasks = getFilteredTasks();
  const filteredCompletedTasks = getFilteredCompletedTasks();

  if (!user) {
    return (
      <View style={[styles.componentContainer, styles.centeredContent]}>
        <Text style={styles.errorText}>Please log in to view your tasks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.componentContainer}>
      {userInfo && (
        <View style={styles.userInfoContainer}>
          <Text style={styles.welcomeText}>Welcome, {userInfo.displayName || 'Student'}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task..."
          value={task}
          onChangeText={text => setTask(text)}
        />
        <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
          <Text style={styles.addButtonText}>{editIndex !== -1 ? 'Update' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.categorySelector, { backgroundColor: getCategoryColor(selectedCategory) }]}
        onPress={() => setCategoryModalVisible(true)}
      >
        <MaterialIcons name={getCategoryIcon(selectedCategory)} size={24} color="#333" />
        <Text style={styles.categorySelectorText}>
          Category: {getCategoryName(selectedCategory)}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
      </TouchableOpacity>

      {!notificationsEnabled && (
        <TouchableOpacity 
          style={styles.notificationAlert}
          onPress={registerForPushNotifications}
        >
          <MaterialIcons name="notifications-off" size={20} color="#fff" />
          <Text style={styles.notificationAlertText}>
            Enable notifications to get hourly reminders
          </Text>
        </TouchableOpacity>
      )}

      {/* Category Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            <View style={styles.categoryGrid}>
              {categories.map(category => renderCategoryItem(category))}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filter Tasks</Text>
            
            <View style={styles.filterOptions}>
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  activeFilter === 'all' && styles.selectedFilterItem
                ]} 
                onPress={() => applyFilter('all')}
              >
                <MaterialIcons name="list" size={24} color="#333" />
                <Text style={styles.filterOptionText}>Show All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption, 
                  activeFilter === 'recent' && styles.selectedFilterItem
                ]} 
                onPress={() => applyFilter('recent')}
              >
                <MaterialIcons name="access-time" size={24} color="#333" />
                <Text style={styles.filterOptionText}>Most Recent</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filterSectionTitle}>Filter by Subject</Text>
            <View style={styles.filterCategoryGrid}>
              {categories.map(category => renderFilterCategoryItem(category))}
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.tasksWrapper}>
        <View style={styles.headerRow}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Tasks</Text>
            <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
              <Text style={styles.viewToggle}>
                {showCompleted ? 'Hide Completed' : 'Show Completed'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialIcons name="filter-list" size={24} color="#4A6FA5" />
            {activeFilter !== 'all' && (
              <View style={styles.filterIndicator} />
            )}
          </TouchableOpacity>
        </View>

        {activeFilter !== 'all' && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>
              {activeFilter === 'category' 
                ? `Filtered: ${getCategoryName(filterCategoryId)}` 
                : 'Filtered: Most Recent'}
            </Text>
            <TouchableOpacity onPress={() => applyFilter('all')}>
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              {activeFilter !== 'all' 
                ? 'No tasks match your filter. Try another filter or add new tasks.'
                : 'No tasks yet! Add some above.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.taskList}
          />
        )}

        {showCompleted && (
          <>
            <Text style={styles.sectionTitle}>Completed Tasks</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading completed tasks...</Text>
              </View>
            ) : filteredCompletedTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {activeFilter !== 'all' 
                    ? 'No completed tasks match your filter.'
                    : 'No completed tasks yet!'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCompletedTasks}
                renderItem={renderCompletedItem}
                keyExtractor={item => `completed-${item.id}`}
                style={styles.taskList}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  componentContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    margin: 15,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  addButton: {
    width: 80,
    backgroundColor: '#4A6FA5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  categorySelectorText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tasksWrapper: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  viewToggle: {
    color: '#4A6FA5',
    fontWeight: '500',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginLeft: 10,
  },
  filterIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 5,
    top: 0,
    right: 0,
  },
  activeFilterBadge: {
    backgroundColor: '#4A6FA5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '500',
    marginRight: 8,
  },
  taskList: {
    marginBottom: 20,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIndicator: {
    width: 8,
    height: '100%',
    borderRadius: 4,
    marginRight: 10,
  },
  itemIcon: {
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  itemButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
  },
  completedItem: {
    opacity: 0.7,
  },
  completedItemText: {
    textDecorationLine: 'line-through',
  },
  completedDate: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  categoryItem: {
    width: '46%',
    margin: '2%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  selectedCategoryItem: {
    borderWidth: 3,
    borderColor: '#4A6FA5',
  },
  categoryItemText: {
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 15,
    width: '50%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#4A6FA5',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  filterOption: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  filterOptionText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 10,
    color: '#333',
  },
  filterCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  filterCategoryItem: {
    width: '31%',
    margin: '1%',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  filterCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedFilterItem: {
    borderWidth: 2,
    borderColor: '#4A6FA5',
  },
  userInfoContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

export default TodoListComponent;