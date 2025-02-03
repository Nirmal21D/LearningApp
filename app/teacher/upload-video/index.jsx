import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
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
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function UploadVideoPage() {
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
  const [videoDuration, setVideoDuration] = useState('');   
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTags, setVideoTags] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState(null);

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

  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Get thumbnail at 1 second mark
      });
      setThumbnailUri(uri);
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const selectedFile = result.assets[0];
      
      // File size check
      if (selectedFile.size > 500 * 1024 * 1024) {
        showNotification('File size exceeds 500MB limit');
        return;
      }

      // Video type verification
      if (!selectedFile.mimeType?.startsWith('video/')) {
        showNotification('Please select a video file');
        return;
      }

      // Generate thumbnail
      await generateThumbnail(selectedFile.uri);

      // Set default title from filename
      setVideoTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setFile(selectedFile);
    } catch (error) {
      console.error('Error picking document:', error);
      showNotification('Error selecting file');
    }
  };  

  const uploadVideo = async () => {
    // Validation checks
    if (!selectedCurriculum || !selectedSubject || !selectedChapter || 
        !file || !selectedMaterialType || !videoTitle) {
      showNotification('Please fill all required fields');
      return;
    }
  
    setLoading(true);
  
    try {
      // Fetch the subject document to get subject name and chapters
      const subjectRef = doc(db, 'subjects', selectedSubject);
      const subjectSnap = await getDoc(subjectRef);
      
      if (!subjectSnap.exists()) {
        throw new Error('Subject not found');
      }
  
      const subjectData = subjectSnap.data();
      const subjectName = subjectData.name || 'Unknown';
      const chapters = subjectData.chapters || [];
  
      // Sanitize subject name for chapter mapping
      const sanitizedSubjectName = subjectName.replace(/\s+/g, '');
  
      // Dynamically generate chapter mapping based on actual chapters
      const chapterMapping = chapters.reduce((mapping, chapter, index) => {
        mapping[`chapter_${index}`] = `CH${index + 1}_${sanitizedSubjectName}`;
        return mapping;
      }, {});
  
      const mappedChapter = chapterMapping[selectedChapter] || selectedChapter;
  
      // Create blob from file URI
      const response = await fetch(file.uri);
      const blob = await response.blob();
  
      // Upload video
      const storageRef = ref(
        storage, 
        `videos/${selectedCurriculum}/${selectedSubject}/${mappedChapter}/${file.name}`
      );
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
  
      // Upload thumbnail if exists
      let thumbnailURL = null;
      if (thumbnailUri) {
        const thumbnailResponse = await fetch(thumbnailUri);
        const thumbnailBlob = await thumbnailResponse.blob();
        const thumbnailStorageRef = ref(
          storage, 
          `thumbnails/${selectedCurriculum}/${selectedSubject}/${mappedChapter}/${file.name}_thumb`
        );
        const thumbnailSnapshot = await uploadBytes(thumbnailStorageRef, thumbnailBlob);
        thumbnailURL = await getDownloadURL(thumbnailSnapshot.ref);
      }
  
      // Prepare video data
      const videoData = {
        id: `video_${Date.now()}`,
        name: videoTitle,
        url: downloadURL,
        thumbnailUrl: thumbnailURL,
        uploadedAt: new Date(),
        fileType: file.mimeType,
        fileSize: file.size,
        difficulty: 'beginner',
        materialType: selectedMaterialType,
        duration: videoDuration || null,
        description: videoDescription || null,
        tags: videoTags ? videoTags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };
  
      // Update subject with video reference using the mapped chapter
      await updateDoc(subjectRef, {
        [`videos.${mappedChapter}`]: arrayUnion(videoData),
        videoBanner: downloadURL
      });
  
      showNotification('Video uploaded successfully', 'success');
      
      // Navigate after success
      setTimeout(() => {
        router.push('/teacher/dashboard');
      }, 1500);
  
      // Reset form
      setFile(null);
      setThumbnailUri(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoDuration('');
      setVideoTags('');
    } catch (error) {
      console.error('Error uploading video:', error);
      showNotification('Failed to upload video');
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
           !selectedMaterialType ||
           !videoTitle;
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

      <Text style={styles.title}>Upload Video</Text>

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

      {/* Video Title */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Video Title</Text>
        <TextInput
          style={styles.input}
          value={videoTitle}
          onChangeText={setVideoTitle}
          placeholder="Enter video title"
        />
      </View>

      {/* Video Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Video Description (Optional)</Text>
        <TextInput
          style={styles.input}
          value={videoDescription}
          onChangeText={setVideoDescription}
          placeholder="Enter video description"
          multiline
        />
      </View>

      {/* Video Duration */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Video Duration (Optional)</Text>
        <TextInput
          style={styles.input}
          value={videoDuration}
          onChangeText={setVideoDuration}
          placeholder="e.g., 10:30"
          keyboardType="default"
        />
      </View>

      {/* Video Tags */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Video Tags (Optional, comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={videoTags}
          onChangeText={setVideoTags}
          placeholder="e.g., grammar, vocabulary"
        />
      </View>

      {/* File Selection */}
      <View style={styles.fileContainer}>
        <TouchableOpacity 
          style={styles.fileInputButton} 
          onPress={handleFileUpload}
        >
          <Text style={styles.fileInputButtonText}>Select Video File</Text>
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
        onPress={uploadVideo}
        disabled={isUploadDisabled()}
      >
        <Text style={styles.uploadButtonText}>
          {loading ? 'Uploading...' : 'Upload Video'}
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
  inputContainer: {
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'white'
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