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
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isRunning, setIsRunning] = useState(false);
  const [currentState, setCurrentState] = useState(TIMER_STATES.IDLE);
  
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
    } catch (error) {
      console.error('Error loading tasks:', error);
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
    startTimer();
  };
  

  const handleBreakComplete = () => {
    // After the break, start the Pomodoro work timer again
    setCurrentState(TIMER_STATES.WORK);
    setTimeLeft(DEFAULT_TIMES[TIMER_STATES.WORK]);
    startTimer();
  };
  

  const playNotification = () => {
    // Vibrate device if supported
    if (Platform.OS !== 'web') {
      Platform.OS === 'android' 
        ? Platform.select({ android: () => Vibration.vibrate(1000) })()
        : Vibration.vibrate();
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.taskList}>
        {tasks.map(task => (
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
             {/* Delete Button */}
        
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTask(task.id)}
            >
                <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
           
            {!task.completed && currentTask?.id === task.id && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeTask(task.id)}
              >
                <Text style={styles.completeButtonText}>✓</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addTaskButton}
        onPress={() => setShowAddTask(true)}
      >
        <Text style={styles.addTaskButtonText}>+ Add Task</Text>
      </TouchableOpacity>

      <View style={styles.timerSection}>
        <Text style={styles.stateText}>
          {currentTask ? currentTask.text : 'No Task Selected'}
        </Text>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, isRunning && styles.stopButton]}
            onPress={isRunning ? stopTimer : startTimer}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetTimer}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showAddTask}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="Enter task description"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddTask(false);
                  setNewTaskText('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={addTask}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  taskList: {
    flex: 1,
    padding: 15,
    maxHeight: '40%',
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#f8f9fa',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  taskSelected: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  pomodoroCount: {
    fontSize: 14,
    color: '#e74c3c',
    marginLeft: 10,
  },
  completeButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  addTaskButton: {
    backgroundColor: '#3498db',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timerSection: {
    padding: 20,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eleteButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#2ecc71',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  resetButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  addButton: {
    backgroundColor: '#2ecc71',
  },
});

export default PomodoroTimer;