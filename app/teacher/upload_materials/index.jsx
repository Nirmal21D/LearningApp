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
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const router = useRouter();
  const LEARNING_STYLE_TAGS = [
    // Primary learning styles
    { id: 'visual-learner', name: 'Visual Learner', category: 'Primary' },
    { id: 'auditory-learner', name: 'Auditory Learner', category: 'Primary' },
    { id: 'reading-writing-learner', name: 'Reading/Writing Learner', category: 'Primary' },
    { id: 'kinesthetic-learner', name: 'Kinesthetic Learner', category: 'Primary' },
    
    // Secondary learning styles
    { id: 'secondary-visual-learner', name: 'Secondary Visual Learner', category: 'Secondary' },
    { id: 'secondary-auditory-learner', name: 'Secondary Auditory Learner', category: 'Secondary' },
    { id: 'secondary-reading-writing-learner', name: 'Secondary Reading/Writing Learner', category: 'Secondary' },
    { id: 'secondary-kinesthetic-learner', name: 'Secondary Kinesthetic Learner', category: 'Secondary' },
    
    // Processing styles
    { id: 'quick-processor', name: 'Quick Processor', category: 'Processing' },
    { id: 'intuitive-learner', name: 'Intuitive Learner', category: 'Processing' },
    { id: 'reflective-learner', name: 'Reflective Learner', category: 'Processing' },
    { id: 'analytical-thinker', name: 'Analytical Thinker', category: 'Processing' },
    { id: 'methodical-learner', name: 'Methodical Learner', category: 'Processing' },
    { id: 'sequential-processor', name: 'Sequential Processor', category: 'Processing' },
    { id: 'experiential-learner', name: 'Experiential Learner', category: 'Processing' },
    { id: 'hands-on-processor', name: 'Hands-on Processor', category: 'Processing' },
    
    // Content preferences
    { id: 'visual-content-preference', name: 'Visual Content Preference', category: 'Content' },
    { id: 'audio-content-preference', name: 'Audio Content Preference', category: 'Content' },
    { id: 'text-content-preference', name: 'Text Content Preference', category: 'Content' },
    { id: 'practical-application-preference', name: 'Practical Application Preference', category: 'Content' },
    
    // Communication styles
    { id: 'visual-communicator', name: 'Visual Communicator', category: 'Communication' },
    { id: 'graphic-organizer', name: 'Graphic Organizer', category: 'Communication' },
    { id: 'verbal-explainer', name: 'Verbal Explainer', category: 'Communication' },
    { id: 'discussion-leader', name: 'Discussion Leader', category: 'Communication' },
    { id: 'note-taker', name: 'Note Taker', category: 'Communication' },
    { id: 'information-organizer', name: 'Information Organizer', category: 'Communication' },
    { id: 'practical-demonstrator', name: 'Practical Demonstrator', category: 'Communication' },
    { id: 'active-facilitator', name: 'Active Facilitator', category: 'Communication' },
    
    // Memory techniques
    { id: 'visual-memory-technique', name: 'Visual Memory Technique', category: 'Memory' },
    { id: 'color-pattern-association', name: 'Color/Pattern Association', category: 'Memory' },
    { id: 'verbal-memory-technique', name: 'Verbal Memory Technique', category: 'Memory' },
    { id: 'social-reinforcement-learning', name: 'Social Reinforcement Learning', category: 'Memory' },
    { id: 'written-memory-technique', name: 'Written Memory Technique', category: 'Memory' },
    { id: 'repetition-reinforcement', name: 'Repetition Reinforcement', category: 'Memory' },
    { id: 'action-memory-technique', name: 'Action Memory Technique', category: 'Memory' },
    { id: 'embodied-cognition', name: 'Embodied Cognition', category: 'Memory' },
    
    // Attention focus
    { id: 'visual-attention-dependency', name: 'Visual Attention Dependency', category: 'Attention' },
    { id: 'active-recall-processor', name: 'Active Recall Processor', category: 'Attention' },
    { id: 'note-taking-focused', name: 'Note Taking Focused', category: 'Attention' },
    { id: 'activity-dependent-focus', name: 'Activity Dependent Focus', category: 'Attention' },
    
    // Problem-solving
    { id: 'visual-solution-seeker', name: 'Visual Solution Seeker', category: 'Problem Solving' },
    { id: 'social-problem-solver', name: 'Social Problem Solver', category: 'Problem Solving' },
    { id: 'research-oriented', name: 'Research Oriented', category: 'Problem Solving' },
    { id: 'experimental-problem-solver', name: 'Experimental Problem Solver', category: 'Problem Solving' },
    
    // Environmental preferences
    { id: 'media-rich-environment', name: 'Media Rich Environment', category: 'Environment' },
    { id: 'audio-environment', name: 'Audio Environment', category: 'Environment' },
    { id: 'quiet-reading-environment', name: 'Quiet Reading Environment', category: 'Environment' },
    { id: 'workshop-environment', name: 'Workshop Environment', category: 'Environment' },
    
    // Feedback preferences
    { id: 'visual-summary-preference', name: 'Visual Summary Preference', category: 'Feedback' },
    { id: 'discussion-oriented', name: 'Discussion Oriented', category: 'Feedback' },
    { id: 'detailed-analysis-preference', name: 'Detailed Analysis Preference', category: 'Feedback' },
    { id: 'practical-feedback-preference', name: 'Practical Feedback Preference', category: 'Feedback' },
    
    // General tags
    { id: 'balanced-learner', name: 'Balanced Learner', category: 'General' },
    { id: 'strong-preference', name: 'Strong Preference', category: 'General' }
  ];
  
  const getTagsByCategory = () => {
    const categories = {};
    LEARNING_STYLE_TAGS.forEach(tag => {
      if (!categories[tag.category]) {
        categories[tag.category] = [];
      }
      categories[tag.category].push(tag);
    });
    return categories;
  };
  
  const tagsByCategory = getTagsByCategory();

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

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
    if (!selectedCurriculum || !selectedSubject || !selectedChapter || !file || !selectedMaterialType) {
      showNotification('Please fill all required fields');
      return;
    }
  
    setLoading(true);
  
    try {
      const subjectRef = doc(db, 'subjects', selectedSubject);
      const subjectSnap = await getDoc(subjectRef);
      const subjectData = subjectSnap.data();
      const subjectName = subjectData.name || 'Unknown';
      const chapters = subjectData.chapters || [];
      const sanitizedSubjectName = subjectName.replace(/\s+/g, '');
      const chapterMapping = chapters.reduce((mapping, chapter, index) => {
        mapping[`chapter_${index}`] = `CH${index + 1}_${sanitizedSubjectName}`;
        return mapping;
      }, {});
      const mappedChapter = chapterMapping[selectedChapter] || selectedChapter;
      
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
  
      const materialData = {
        name: file.name,
        url: downloadURL,
        subjectId: selectedSubject,
        curriculumId: selectedCurriculum,
        chapterId: selectedChapter,
        uploadedAt: new Date(),
        fileType: file.mimeType,
        fileSize: file.size,
        difficulty: 'beginner',
        materialType: selectedMaterialType,
        learningStyleTags: selectedTags, // Add tags to material data
      };
  
      // Save material metadata to Firestore
      await updateDoc(subjectRef, {
        [`materials.${mappedChapter}`]: arrayUnion(materialData)
      });
  
      showNotification('Material uploaded successfully', 'success');
      
      setTimeout(() => {
        router.push('/teacher/view_materials');
      }, 1500);
  
      setFile(null);
      setSelectedTags([]); // Reset tags after upload
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

  const renderTagsSelection = () => {
    return (
      <View style={styles.tagsContainer}>
        <View style={styles.tagsHeader}>
          <Text style={styles.tagsSectionTitle}>Learning Style Tags</Text>
          <TouchableOpacity 
            style={styles.closeTagsButton}
            onPress={() => setShowTagSelector(false)}
          >
           
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.tagsScrollView}>
          {Object.entries(tagsByCategory).map(([category, tags]) => (
            <View key={category} style={styles.tagCategory}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.tagsList}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      selectedTags.includes(tag.id) && styles.tagChipSelected
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text 
                      style={[
                        styles.tagChipText,
                        selectedTags.includes(tag.id) && styles.tagChipTextSelected
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => setShowTagSelector(false)}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
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

      <TouchableOpacity 
        style={styles.tagsButton}
        onPress={() => setShowTagSelector(true)}
      >
        <Text style={styles.tagsButtonText}>Select Learning Style Tags</Text>
      </TouchableOpacity>

      {selectedTags.length > 0 && (
        <View style={styles.selectedTagsPreview}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedTags.map(tagId => {
              const tag = LEARNING_STYLE_TAGS.find(t => t.id === tagId);
              return (
                <View key={tagId} style={styles.selectedTagChip}>
                  <Text style={styles.selectedTagText}>{tag?.name}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {showTagSelector && renderTagsSelection()}

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
  },
  tagsButton: {
    backgroundColor: '#3F51B5',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  tagsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedTagsPreview: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  selectedTagChip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedTagText: {
    color: '#2196F3',
    fontSize: 14,
  },
  tagsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: 16,
    zIndex: 1000,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  closeTagsButton: {
    padding: 8,
  },
  tagsScrollView: {
    flex: 1,
  },
  tagCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  tagChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#1E88E5',
  },
  tagChipText: {
    color: '#2196F3',
    fontSize: 14,
  },
  tagChipTextSelected: {
    color: 'white',
  },
  doneButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});