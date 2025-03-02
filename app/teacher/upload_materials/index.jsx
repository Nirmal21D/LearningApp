import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
        learningStyleTags: selectedTags,
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
      setSelectedTags([]);
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
      <View style={styles.tagsModal}>
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.tagsSafeArea}>
          <View style={styles.tagsHeader}>
            <Text style={styles.tagsSectionTitle}>Learning Style Tags</Text>
            <TouchableOpacity
              style={[styles.closeTagsButton, styles.glassEffect]}
              onPress={() => setShowTagSelector(false)}
            >
              <Ionicons name="close" size={24} color="#1A237E" />
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
        </SafeAreaView>
      </View>
    );
  };

  // Calculate status bar height for proper spacing
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
  const headerHeight = Platform.OS === 'ios' ? 90 : 70 + statusBarHeight;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blur circles - moved to background layer */}
      <View style={styles.backgroundDecoration}>
        <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
      </View>

      <SafeAreaView style={styles.safeContainer}>
        {/* Header - now with fixed height */}
        <View style={[styles.header, { height: headerHeight, paddingTop: Platform.OS === 'android' ? statusBarHeight : 0 }]}>
          <TouchableOpacity
            style={[styles.backButton, styles.glassEffect]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Upload Study Material</Text>
            <Text style={styles.subtitle}>Add resources to your curriculum</Text>
          </View>
        </View>

        {/* Main content - with proper padding for the header */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingTop: headerHeight + 10 } // Add padding to account for the header
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(800).springify()}
            style={styles.main}
          >
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

            <View style={styles.formContainer}>
              {/* Curriculum Picker */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="school-outline" size={18} color="#666" style={styles.inputIcon} />
                  <Text style={styles.pickerLabel}>Curriculum</Text>
                </View>
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
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="book-outline" size={18} color="#666" style={styles.inputIcon} />
                  <Text style={styles.pickerLabel}>Subject</Text>
                </View>
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
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="bookmark-outline" size={18} color="#666" style={styles.inputIcon} />
                  <Text style={styles.pickerLabel}>Chapter</Text>
                </View>
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
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="pricetag-outline" size={18} color="#666" style={styles.inputIcon} />
                  <Text style={styles.pickerLabel}>Material Type</Text>
                </View>
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

              {/* Learning Style Tags */}
              <TouchableOpacity
                style={styles.tagsButton}
                onPress={() => setShowTagSelector(true)}
              >
                <Ionicons name="pricetags-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
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

              {/* File Selection */}
              <View style={styles.fileSelectionContainer}>
                <TouchableOpacity
                  style={styles.fileInputButton}
                  onPress={handleFileUpload}
                >
                  <Ionicons name="document-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.fileInputButtonText}>Select File</Text>
                </TouchableOpacity>
                {file && (
                  <View style={styles.fileInfoContainer}>
                    <Ionicons name="document-text-outline" size={20} color="#2196F3" />
                    <Text style={styles.fileName}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  </View>
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
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                )}
                <Text style={styles.uploadButtonText}>
                  {loading ? 'Uploading...' : 'Upload Material'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {showTagSelector && renderTagsSelection()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  safeContainer: {
    flex: 1,
  },
  // Background decoration layer
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  // Fixed header with proper z-index
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    lineHeight: 18,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  main: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  // Blurred circles for background design - adjusted to be less intrusive
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.7,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.35)',
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
    backgroundColor: 'rgba(173, 216, 255, 0.35)',
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
    backgroundColor: 'rgba(173, 216, 255, 0.35)',
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
  // Form styling
  formContainer: {
    gap: 16,
    padding: Platform.OS === 'web' ? 25 : 20,
    borderRadius: 28,
    backgroundColor: 'rgb(255, 255, 255)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgb(255, 255, 255)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 6,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.7)',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  glassEffect: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileSelectionContainer: {
    marginTop: 8,
  },
  fileInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  fileInputButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileName: {
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
    flex: 1,
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3F51B5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  tagsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTagsPreview: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  selectedTagChip: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  selectedTagText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  disabledUploadButton: {
    backgroundColor: '#BDBDBD',
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notificationContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successNotification: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorNotification: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  notificationText: {
    color: '#333',
    fontSize: 14,
  },
  // Tags Modal Styling
  tagsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tagsSafeArea: {
    flex: 1,
    padding: 16,
  },
  tagsHeader: {
    flexDirection: 'row',
    objectFit: 'contain',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tagsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  closeTagsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsScrollView: {
    flex: 1,
    marginVertical: 16,
  },
  tagCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
  },
  tagChipSelected: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196F3',
  },
  tagChipText: {
    color: '#1565C0',
    fontSize: 14,
  },
  tagChipTextSelected: {
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});