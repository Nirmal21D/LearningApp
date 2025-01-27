import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

export default function UploadMaterialPage() {
  const [curriculums, setCurriculums] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState('free');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const router = useRouter();

  const materialTypeOptions = [
    { label: 'Free', value: 'free' },
    { label: 'Premium', value: 'premium' }
  ];

  useEffect(() => {
    fetchCurriculums();
  }, []);

  useEffect(() => {
    if (selectedCurriculum) {
      fetchSubjects();
      setSelectedSubject('');
      setSelectedChapter('');
    }
  }, [selectedCurriculum]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters();
      setSelectedChapter('');
    }
  }, [selectedSubject]);

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchCurriculums = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'curriculums'));
      const curriculumList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().title || 'Unnamed Curriculum'
      }));
      setCurriculums(curriculumList);
    } catch (error) {
      console.error('Curriculum fetch error:', error);
      showNotification('Could not fetch curriculums');
    }
  };

  const fetchSubjects = async () => {
    if (!selectedCurriculum) return;
    
    try {
      const subjectQuery = query(
        collection(db, 'subjects'), 
        where('curriculumId', '==', selectedCurriculum)
      );
      const querySnapshot = await getDocs(subjectQuery);
      const subjectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed Subject'
      }));
      setSubjects(subjectList);
    } catch (error) {
      console.error('Subjects fetch error:', error);
      showNotification('Could not fetch subjects');
    }
  };

  const fetchChapters = async () => {
    if (!selectedSubject) return;
    
    try {
      const subjectRef = doc(db, 'subjects', selectedSubject);
      const subjectSnap = await getDoc(subjectRef);
      const chaptersList = subjectSnap.data()?.chapters || [];
      setChapters(chaptersList.map((chapter, index) => ({
        id: `chapter_${index}`,
        name: chapter || `Chapter ${index + 1}`
      })));
    } catch (error) {
      console.error('Chapters fetch error:', error);
      showNotification('Could not fetch chapters');
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      const selectedFile = result.assets[0];
      
      // Check file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        showNotification('File size exceeds 50MB limit');
        return;
      }

      setFile(selectedFile);
    } catch (error) {
      console.error('Error picking document:', error);
      showNotification('Error selecting file');
    }
  };

  const uploadMaterial = async () => {
    // Validation
    if (!selectedCurriculum) {
      showNotification('Please select a curriculum');
      return;
    }
    if (!selectedSubject) {
      showNotification('Please select a subject');
      return;
    }
    if (!selectedChapter) {
      showNotification('Please select a chapter');
      return;
    }
    if (!file) {
      showNotification('Please select a file');
      return;
    }
    if (!selectedMaterialType) {
      showNotification('Please select material type');
      return;
    }

    setLoading(true);

    try {
      // Create blob from file URI
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const storageRef = ref(
        storage, 
        `materials/${selectedCurriculum}/${selectedSubject}/${selectedChapter}/${file.name}`
      );

      // Upload blob
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save material metadata to Firestore
      await addDoc(collection(db, 'materials'), {
        name: file.name,
        url: downloadURL,
        subjectId: selectedSubject,
        curriculumId: selectedCurriculum,
        chapterId: selectedChapter,
        uploadedAt: new Date(),
        fileType: file.mimeType,
        fileSize: file.size,
        difficulty: 'beginner',
        materialType: selectedMaterialType
      });

      // Update subject with material reference
      const subjectRef = doc(db, 'subjects', selectedSubject);
      await updateDoc(subjectRef, {
        materials: arrayUnion(downloadURL)
      });

      showNotification('Material uploaded successfully', 'success');
      
      setTimeout(() => {
        router.push('/teacher/view_materials');
      }, 1500);

      setFile(null);
    } catch (error) {
      console.error('Error uploading material:', error);
      showNotification('Failed to upload material');
    } finally {
      setLoading(false);
    }
  };

  const isUploadDisabled = () => {
    return loading || 
           !selectedCurriculum || 
           !selectedSubject || 
           !selectedChapter || 
           !file || 
           !selectedMaterialType;
  };

  return (
    <ScrollView style={styles.container}>
      {notification && (
        <View 
          style={[
            styles.notificationContainer, 
            notification.type === 'success' ? styles.successNotification : styles.errorNotification
          ]}
        >
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      <Text style={styles.title}>Upload Study Material</Text>

      {/* Curriculum Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Curriculum</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            style={styles.picker}
            selectedValue={selectedCurriculum}
            onValueChange={setSelectedCurriculum}
          >
            <Picker.Item label="Select Curriculum" value="" />
            {curriculums.map((curriculum) => (
              <Picker.Item 
                key={curriculum.id} 
                label={curriculum.name} 
                value={curriculum.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Subject Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Subject</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            style={styles.picker}
            selectedValue={selectedSubject}
            onValueChange={setSelectedSubject}
            enabled={selectedCurriculum !== ''}
          >
            <Picker.Item label="Select Subject" value="" />
            {subjects.map((subject) => (
              <Picker.Item 
                key={subject.id} 
                label={subject.name} 
                value={subject.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Chapter Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Chapter</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            style={styles.picker}
            selectedValue={selectedChapter}
            onValueChange={setSelectedChapter}
            enabled={selectedSubject !== ''}
          >
            <Picker.Item label="Select Chapter" value="" />
            {chapters.map((chapter) => (
              <Picker.Item 
                key={chapter.id} 
                label={chapter.name} 
                value={chapter.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Material Type Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Material Type</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            style={styles.picker}
            selectedValue={selectedMaterialType}
            onValueChange={setSelectedMaterialType}
          >
            {materialTypeOptions.map((type) => (
              <Picker.Item 
                key={type.value} 
                label={type.label} 
                value={type.value} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* File Selection */}
      <View style={styles.fileContainer}>
        <TouchableOpacity 
          style={styles.fileInputButton} 
          onPress={handleFileUpload}
        >
          <Text style={styles.fileInputButtonText}>Select File</Text>
        </TouchableOpacity>
        {file && (
          <Text style={styles.fileName}>
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </Text>
        )}
      </View>

      {/* Upload Button */}
      <TouchableOpacity 
        style={[
          styles.uploadButton, 
          isUploadDisabled() && styles.disabledUploadButton
        ]} 
        onPress={uploadMaterial}
        disabled={isUploadDisabled()}
      >
        <Text style={styles.uploadButtonText}>
          {loading ? 'Uploading...' : 'Upload Material'}
        </Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator 
          size="large" 
          color="#007bff" 
          style={styles.loadingIndicator} 
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f6f9'
  },
  notificationContainer: {
    padding: 10,
    marginBottom: 20,
    borderRadius: 5
  },
  successNotification: {
    backgroundColor: '#4caf50'
  },
  errorNotification: {
    backgroundColor: '#f44336'
  },
  notificationText: {
    color: 'white',
    textAlign: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  pickerContainer: {
    marginBottom: 15
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: 'white',
    overflow: 'hidden'
  },
  picker: {
    height: 50,
    width: '100%'
  },
  fileContainer: {
    marginVertical: 15
  },
  fileInputButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center'
  },
  fileInputButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  fileName: {
    marginTop: 10,
    color: '#666',
    fontSize: 14
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10
  },
  disabledUploadButton: {
    backgroundColor: '#cccccc'
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  loadingIndicator: {
    marginTop: 20
  }
});