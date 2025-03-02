import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SessionRequest() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const auth = getAuth();

  // Time slots for picker
  const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return {
      label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      value: { hour, minute }
    };
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userType', '==', 'teacher'));
      const snapshot = await getDocs(q);
      
      const teachersList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().username,
        email: doc.data().email,
        subject: doc.data().selectedSubject,
        mobile: doc.data().mobile
      }));
      
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      Alert.alert('Error', 'Failed to load teachers list');
    }
  };

  const handleDateSelect = (date) => {
    setTempDate(date);
  };

  const handleTimeSelect = (time) => {
    const newDate = new Date(tempDate);
    newDate.setHours(time.hour);
    newDate.setMinutes(time.minute);
    setSelectedDate(newDate);
    setShowTimeModal(false);
  };

  const confirmDate = () => {
    setSelectedDate(tempDate);
    setShowDateModal(false);
    setShowTimeModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedTeacher) {
      Alert.alert('Error', 'Please select a teacher');
      return;
    }

    if (!topic || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const sessionData = {
        topic,
        description,
        requestedDate: selectedDate,
        status: 'pending',
        studentId: auth.currentUser.uid,
        studentName: auth.currentUser.displayName,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        teacherEmail: selectedTeacher.email,
        teacherSubject: selectedTeacher.subject,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'sessionRequests'), sessionData);

      Alert.alert(
        'Success',
        'Your session request has been submitted',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request');
    }
  };

  const renderDatePicker = () => {
    const dates = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date;
    });

    return (
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <ScrollView style={styles.dateList}>
              {dates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    tempDate.toDateString() === date.toDateString() && styles.selectedDateItem
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text style={[
                    styles.dateText,
                    tempDate.toDateString() === date.toDateString() && styles.selectedDateText
                  ]}>
                    {date.toDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmDate}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTimePicker = () => (
    <Modal
      visible={showTimeModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Time</Text>
          <ScrollView style={styles.timeList}>
            {timeSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.timeItem}
                onPress={() => handleTimeSelect(slot.value)}
              >
                <Text style={styles.timeText}>{slot.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowTimeModal(false)}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        {/* Fixed Header */}
        <View style={styles.topBarContainer}>
          <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333"/>
            </TouchableOpacity>
          </BlurView>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Request Session</Text>
            <Text style={styles.subtitle}>Schedule a one-to-one learning session</Text>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeInDown.duration(1000).springify()} 
              style={styles.main}
            >
              <View style={styles.formContainer}>
                {/* Teacher Selection */}
                <Text style={styles.label}>Select Teacher</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.teacherList}
                >
                  {teachers.map((teacher) => (
                    <TouchableOpacity
                      key={teacher.id}
                      style={[
                        styles.teacherCard,
                        selectedTeacher?.id === teacher.id && styles.selectedTeacherCard
                      ]}
                      onPress={() => setSelectedTeacher(teacher)}
                    >
                      <View style={styles.teacherAvatarContainer}>
                        <Ionicons 
                          name="person-circle" 
                          size={40} 
                          color={selectedTeacher?.id === teacher.id ? "#fff" : "#2196F3"} 
                        />
                      </View>
                      <View style={styles.teacherInfo}>
                        <Text style={[
                          styles.teacherName,
                          selectedTeacher?.id === teacher.id && styles.selectedTeacherText
                        ]}>
                          {teacher.name}
                        </Text>
                        <Text style={[
                          styles.teacherSubject,
                          selectedTeacher?.id === teacher.id && styles.selectedTeacherText
                        ]}>
                          {teacher.subject}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Topic</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="book-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={topic}
                      onChangeText={setTopic}
                      placeholder="Enter session topic"
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Description</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Describe what you want to learn"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Select Date & Time</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDateModal(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#666" style={styles.inputIcon} />
                    <Text style={styles.dateButtonText}>
                      {selectedDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowTimeModal(true)}
                  >
                    <Ionicons name="time" size={20} color="#666" style={styles.inputIcon} />
                    <Text style={styles.dateButtonText}>
                      {selectedDate.toLocaleTimeString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </View>

        {renderDatePicker()}
        {renderTimePicker()}
      </SafeAreaView>
    </View>
  );
}

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
  // New content container to enable fixed header and scrollable content
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 140 : 170, // Add padding to account for fixed header
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  // Fixed position for the header with improved z-index
  topBarContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: Platform.OS === 'web' ? 20 : 16,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    marginLeft: 5,
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
  formContainer: {
    gap: 20,
    padding: Platform.OS === 'web' ? 25 : 20,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1A237E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    shadowOpacity: 0.01,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    marginLeft: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  teacherList: {
    marginTop: 10,
    marginBottom: 10,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 16,
    marginRight: 15,
    marginBottom: 10,
    width: 180,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 3,
  },
  selectedTeacherCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  teacherAvatarContainer: {
    marginRight: 12,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  teacherSubject: {
    fontSize: 13,
    color: '#666',
  },
  selectedTeacherText: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
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
    // elevation: 5,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1A237E',
  },
  dateList: {
    maxHeight: 300,
  },
  dateItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedDateItem: {
    backgroundColor: '#2196F3',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDateText: {
    color: 'white',
  },
  timeList: {
    maxHeight: 300,
  },
  timeItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8,
    marginBottom: 5,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
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