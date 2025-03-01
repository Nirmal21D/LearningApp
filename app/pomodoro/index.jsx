import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  AppState,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


const TIMER_STATES = {
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  IDLE: 'idle'
};

const DEFAULT_TIMES = {
  [TIMER_STATES.WORK]: 25 * 60,      // 25 minutes
  [TIMER_STATES.SHORT_BREAK]: 5 * 60, // 5 minutes
  [TIMER_STATES.LONG_BREAK]: 15 * 60  // 15 minutes
};

const PomodoroTimer = () => {
  // Timer States
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMES[TIMER_STATES.WORK]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentState, setCurrentState] = useState(TIMER_STATES.IDLE);
  const router = useRouter();
  
  // Task States
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // Refs
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Load saved tasks on mount
  useEffect(() => {
    loadSavedTasks();
    return () => clearInterval(timerRef.current);
  }, []);
  
  // App state handling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        updateTimerAfterBackground();
      }
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadSavedTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('@pomodoro_tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setLoading(false);
    }
  };

  const saveTasks = async (updatedTasks) => {
    try {
      await AsyncStorage.setItem('@pomodoro_tasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const updateTimerAfterBackground = () => {
    if (isRunning) {
      // Handle timer updates after app comes back from background
      const now = Date.now();
      const timePassed = Math.floor((now - appStateRef.current) / 1000);
      setTimeLeft(prev => Math.max(0, prev - timePassed));
    }
  };

  const startTimer = () => {
    if (!currentTask) {
      Alert.alert('Select Task', 'Please select a task before starting the timer.');
      return;
    }
  
    setIsRunning(true);
    setCurrentState(currentState === TIMER_STATES.IDLE ? TIMER_STATES.WORK : currentState);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
  };

  const resetTimer = () => {
    stopTimer();
    
    // Ensure currentState has a valid default time set
    if (currentState !== TIMER_STATES.IDLE) {
      setTimeLeft(DEFAULT_TIMES[currentState]);
    } else {
      setTimeLeft(DEFAULT_TIMES[TIMER_STATES.WORK]); // Default to work timer if idle
    }
  };
  
  const deleteTask = (taskId) => {
    // Filter out the task with the provided taskId
    const updatedTasks = tasks.filter(task => task.id !== taskId);
  
    // Update state and AsyncStorage
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    
    if (currentTask?.id === taskId) {
      setCurrentTask(null);
    }
  };  

  const handleTimerComplete = () => {
    stopTimer();
    playNotification();
  
    if (currentState === TIMER_STATES.WORK) {
      handleWorkComplete();
    } else if (currentState === TIMER_STATES.SHORT_BREAK || currentState === TIMER_STATES.LONG_BREAK) {
      handleBreakComplete();
    }
  };

  const handleWorkComplete = () => {
    // Update task pomodoros
    if (currentTask) {
      const updatedTasks = tasks.map(task =>
        task.id === currentTask.id
          ? { ...task, pomodoros: task.pomodoros + 1 }
          : task
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
    }
  
    setCompletedPomodoros(prev => prev + 1);
  
    // Start break timer (5-minute short break)
    setCurrentState(TIMER_STATES.SHORT_BREAK);
    setTimeLeft(DEFAULT_TIMES[TIMER_STATES.SHORT_BREAK]);
  };

  const handleBreakComplete = () => {
    // After the break, set up for the Pomodoro work timer again
    setCurrentState(TIMER_STATES.WORK);
    setTimeLeft(DEFAULT_TIMES[TIMER_STATES.WORK]);
  };

  const playNotification = () => {
    // Vibrate device if supported
    if (Platform.OS !== 'web') {
      if (Platform.OS === 'android') {
        // Android vibration needs import from 'react-native'
        try {
          const Vibration = require('react-native').Vibration;
          Vibration.vibrate(1000);
        } catch (e) {
          console.log('Vibration not available');
        }
      }
    }
    
    Alert.alert(
      'Timer Complete!',
      currentState === TIMER_STATES.WORK
        ? 'Time for a break!'
        : 'Break is over. Ready to work?',
      [{ text: 'OK' }]
    );
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false,
        pomodoros: 0,
        createdAt: new Date().toISOString()
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      setNewTaskText('');
      setShowAddTask(false);

      if (!currentTask) {
        setCurrentTask(newTask);
      }
    }
  };

  const completeTask = (taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, completed: true, completedAt: new Date().toISOString() }
        : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    if (currentTask?.id === taskId) {
      const nextTask = updatedTasks.find(task => !task.completed);
      setCurrentTask(nextTask || null);
    }
  };

  const selectTask = (task) => {
    if (!isRunning) {
      setCurrentTask(task);
    } else {
      Alert.alert(
        'Timer Running',
        'Please stop the timer before switching tasks.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // State color mappings
  const getStateColor = () => {
    switch(currentState) {
      case TIMER_STATES.WORK:
        return '#ff6b6b';
      case TIMER_STATES.SHORT_BREAK:
        return '#4ecdc4';
      case TIMER_STATES.LONG_BREAK:
        return '#45b7d1';
      default:
        return '#2196F3';
    }
  };
  
  const getTimerStateText = () => {
    switch(currentState) {
      case TIMER_STATES.WORK:
        return 'Focus Time';
      case TIMER_STATES.SHORT_BREAK:
        return 'Short Break';
      case TIMER_STATES.LONG_BREAK:
        return 'Long Break';
      default:
        return 'Ready to Start';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBarContainer}>
            <View style={styles.headerContainer}>
            <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
              <Text style={styles.title}>Pomodoro Timer</Text>
              <Text style={styles.subtitle}>Ready to start</Text>
            </View>
          </View>
        
        <Animated.View 
          entering={FadeInDown.duration(800).springify()} 
          style={styles.mainContent}
        >
          <View style={styles.timerCard}>
            <Text style={styles.currentTaskText}>
              {currentTask ? currentTask.text : 'No Task Selected'}
            </Text>
            <Text style={[styles.timerText, { color: getStateColor() }]}>
              {formatTime(timeLeft)}
            </Text>
            
            <View style={styles.progressIndicator}>
              <Text style={styles.pomodoroSessionsText}>
                Sessions completed: {completedPomodoros}
              </Text>
            </View>
            
            <View style={styles.timerButtons}>
              <TouchableOpacity
                style={[styles.glassButton, isRunning ? styles.stopButton : styles.startButton]}
                onPress={isRunning ? stopTimer : startTimer}
              >
                <Text style={styles.buttonText}>
                  {isRunning ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.glassButton, styles.resetButton]}
                onPress={resetTimer}
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.taskListHeader}>My Tasks</Text>
          
          <ScrollView style={styles.taskList}>
            {loading ? (
              <Text style={styles.loadingText}>Loading tasks...</Text>
            ) : tasks.length === 0 ? (
              <Text style={styles.noTasksText}>No tasks added yet</Text>
            ) : (
              tasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskItem,
                    task.completed && styles.taskCompleted,
                    currentTask?.id === task.id && styles.taskSelected
                  ]}
                  onPress={() => selectTask(task)}
                >
                  <View style={styles.taskContent}>
                    <Text style={[
                      styles.taskText,
                      task.completed && styles.taskTextCompleted
                    ]}>
                      {task.text}
                    </Text>
                    <Text style={styles.pomodoroCount}>
                      🍅 {task.pomodoros}
                    </Text>
                  </View>
                
                  <View style={styles.taskActions}>
                    {!task.completed && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => completeTask(task.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={24} color="#2ecc71" />
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={() => setShowAddTask(true)}
          >
            <Text style={styles.addTaskButtonText}>+ Add New Task</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <Modal
        visible={showAddTask}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={10} tint="light" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Task</Text>
              
              <TextInput
                style={styles.input}
                value={newTaskText}
                onChangeText={setNewTaskText}
                placeholder="What are you working on?"
                placeholderTextColor="rgba(0,0,0,0.4)"
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddTask(false);
                    setNewTaskText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={addTask}
                >
                  <Text style={styles.addButtonText}>Add Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 14,
    color: '#666',
    lineHeight: 15,
    marginRight: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    // elevation: 3,
  },
  mainContent: {
    flex: 1,
    padding: 15,
  },
  timerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
  },
  currentTaskText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  progressIndicator: {
    marginBottom: 15,
  },
  pomodoroSessionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 10,
  },
  glassButton: {
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    minWidth: 120,
  },
  startButton: {
    backgroundColor: 'rgba(46, 204, 113, 0.75)',
    shadowColor: '#2ecc71',
  },
  stopButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.75)',
    shadowColor: '#e74c3c',
  },
  resetButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    shadowColor: '#2196F3',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  taskListHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 10,
    marginTop: 5,
    paddingLeft: 5,
  },
  taskList: {
    flex: 1,
    marginBottom: 10,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  noTasksText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontStyle: 'italic',
  },
  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  taskCompleted: {
    backgroundColor: 'rgba(245, 245, 245, 0.4)',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  taskSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  pomodoroCount: {
    fontSize: 14,
    color: '#e74c3c',
    marginLeft: 10,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 5,
    marginLeft: 5,
  },
  addTaskButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    marginBottom: 15,
  },
  addTaskButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBlur: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'rgba(149, 165, 166, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 20 : 10,
    left: Platform.OS === 'web' ? -80 : -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: Platform.OS === 'web' ? 220 : 180,
    height: Platform.OS === 'web' ? 220 : 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 390 : 320,
    right: Platform.OS === 'web' ? -40 : -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: Platform.OS === 'web' ? 200 : 160,
    height: Platform.OS === 'web' ? 200 : 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});

export default PomodoroTimer;