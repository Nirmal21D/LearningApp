import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView
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
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue,
    interpolate
} from 'react-native-reanimated';

const InteractiveCard = ({ children, style }) => {
    const scale = useSharedValue(1);
    const elevation = useSharedValue(2);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: interpolate(elevation.value, [2, 8], [0.1, 0.15]),
        shadowRadius: elevation.value,
    }));

    return (
        <Animated.View 
            style={[animatedStyle, style]}
            onTouchStart={() => {
                scale.value = withSpring(0.995);
                elevation.value = withSpring(8);
            }}
            onTouchEnd={() => {
                scale.value = withSpring(1);
                elevation.value = withSpring(2);
            }}
        >
            {children}
        </Animated.View>
    );
};

const InteractiveInput = ({ children, style }) => {
    const scale = useSharedValue(1);
    const backgroundColor = useSharedValue('rgba(33, 150, 243, 0.04)');
    const borderColor = useSharedValue('rgba(33, 150, 243, 0.08)');
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        backgroundColor: backgroundColor.value,
        borderColor: borderColor.value,
    }));

    return (
        <Animated.View 
            style={[animatedStyle, style]}
            onTouchStart={() => {
                scale.value = withSpring(0.98, { damping: 15 });
                backgroundColor.value = withSpring('rgba(33, 150, 243, 0.08)');
                borderColor.value = withSpring('rgba(33, 150, 243, 0.15)');
            }}
            onTouchEnd={() => {
                scale.value = withSpring(1, { damping: 15 });
                backgroundColor.value = withSpring('rgba(33, 150, 243, 0.04)');
                borderColor.value = withSpring('rgba(33, 150, 243, 0.08)');
            }}
        >
            {children}
        </Animated.View>
    );
};

const InteractiveButton = ({ children, style, onPress, disabled }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            <TouchableOpacity 
                onPress={onPress}
                disabled={disabled}
                onPressIn={() => {
                    scale.value = withSpring(0.95);
                    opacity.value = withSpring(0.9);
                }}
                onPressOut={() => {
                    scale.value = withSpring(1);
                    opacity.value = withSpring(1);
                }}
                style={styles.buttonTouchable}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

const CurriculumInput = ({ children, style }) => {
    const scale = useSharedValue(1);
    const backgroundColor = useSharedValue('rgba(33, 150, 243, 0.02)');
    const borderColor = useSharedValue('rgba(33, 150, 243, 0.04)');
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        backgroundColor: backgroundColor.value,
        borderColor: borderColor.value,
    }));

    return (
        <Animated.View 
            style={[animatedStyle, style]}
            onTouchStart={() => {
                scale.value = withSpring(0.98, { damping: 15 });
                backgroundColor.value = withSpring('rgba(33, 150, 243, 0.04)');
                borderColor.value = withSpring('rgba(33, 150, 243, 0.08)');
            }}
            onTouchEnd={() => {
                scale.value = withSpring(1, { damping: 15 });
                backgroundColor.value = withSpring('rgba(33, 150, 243, 0.02)');
                borderColor.value = withSpring('rgba(33, 150, 243, 0.04)');
            }}
        >
            {children}
        </Animated.View>
    );
};

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Curriculum Details Box */}
        <InteractiveCard style={styles.section}>
          <Text style={styles.sectionTitle}>Curriculum Details</Text>
          
          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="school-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedCurriculum}
              onValueChange={setSelectedCurriculum}
              style={styles.picker}
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
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="book-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedSubject}
              onValueChange={setSelectedSubject}
              style={styles.picker}
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
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="library-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedChapter}
              onValueChange={setSelectedChapter}
              style={styles.picker}
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
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="documents-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedMaterialType}
              onValueChange={setSelectedMaterialType}
              style={styles.picker}
            >
              <Picker.Item label="Select Material Type" value="" />
              {materialTypeOptions.map((type) => (
                <Picker.Item 
                  key={type.value} 
                  label={type.label} 
                  value={type.value} 
                />
              ))}
            </Picker>
          </CurriculumInput>
        </InteractiveCard>

        {/* Video Details Box */}
        <InteractiveCard style={styles.section}>
          <Text style={styles.sectionTitle}>Video Details</Text>

          <InteractiveInput style={styles.inputContainer}>
            <Ionicons name="videocam-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={videoTitle}
              onChangeText={setVideoTitle}
              placeholder="Video Title"
              placeholderTextColor="#999"
            />
          </InteractiveInput>

          <InteractiveInput style={styles.inputContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={videoDescription}
              onChangeText={setVideoDescription}
              placeholder="Video Description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </InteractiveInput>

          <InteractiveInput style={styles.inputContainer}>
            <Ionicons name="time-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={videoDuration}
              onChangeText={setVideoDuration}
              placeholder="Duration (minutes)"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </InteractiveInput>

          <InteractiveInput style={styles.inputContainer}>
            <Ionicons name="pricetags-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={videoTags}
              onChangeText={setVideoTags}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#999"
            />
          </InteractiveInput>
        </InteractiveCard>

        {/* File Selection */}
        <InteractiveButton 
          style={styles.fileButton} 
          onPress={handleFileUpload}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.fileButtonText}>Select Video File</Text>
          </View>
        </InteractiveButton>

        {file && (
          <Text style={styles.fileName}>
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </Text>
        )}

        {/* Upload Button */}
        <InteractiveButton 
          style={[
            styles.uploadButton, 
            isUploadDisabled() && styles.disabledUploadButton
          ]} 
          onPress={uploadVideo}
          disabled={isUploadDisabled()}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.uploadButtonText}>
              {loading ? 'Uploading...' : 'Upload Video'}
            </Text>
          </View>
        </InteractiveButton>

        {loading && (
          <ActivityIndicator 
            size="large" 
            color="#007bff" 
            style={styles.loadingIndicator} 
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 25,
    letterSpacing: -0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.04)',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(33, 150, 243, 0.08)',
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputIcon: {
    padding: 15,
    color: '#2196F3',
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  picker: {
    flex: 1,
    height: 55,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    height: '100%',
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileButton: {
    backgroundColor: '#2196F3',
    height: 56,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  fileButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  disabledUploadButton: {
    backgroundColor: '#e0e0e0',
    opacity: 0.9,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  loadingIndicator: {
    marginTop: 25,
  },
  fileName: {
    marginTop: 12,
    marginBottom: 20,
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  curriculumInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.02)',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(33, 150, 243, 0.04)',
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
});