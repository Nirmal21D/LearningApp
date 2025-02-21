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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request One-to-One Session</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Teacher Selection */}
        <View style={styles.formGroup}>
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
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="Enter session topic"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you want to learn"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDateModal(true)}
          >
            <Ionicons name="calendar" size={24} color="#2196F3" />
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowTimeModal(true)}
          >
            <Ionicons name="time" size={24} color="#2196F3" />
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleTimeString()}
            </Text>
          </TouchableOpacity>
        </View>

        {renderDatePicker()}
        {renderTimePicker()}

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  teacherList: {
    marginTop: 10,
    marginBottom: 20,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginRight: 15,
    marginBottom: 10,
    width: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTeacherCard: {
    backgroundColor: '#2196F3',
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
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  dateList: {
    maxHeight: 300,
  },
  dateItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 