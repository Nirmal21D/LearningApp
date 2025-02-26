"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { collection, doc, getDoc, getDocs, query, where, updateDoc, arrayUnion } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useRouter } from "expo-router"
import * as DocumentPicker from "expo-document-picker"
import * as VideoThumbnails from "expo-video-thumbnails"
import { Ionicons } from "@expo/vector-icons"
import Animated, { useAnimatedStyle, withSpring, useSharedValue, interpolate } from "react-native-reanimated"

const InteractiveCard = ({ children, style }) => {
  const scale = useSharedValue(1)
  const elevation = useSharedValue(2)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(elevation.value, [2, 8], [0.1, 0.15]),
    shadowRadius: elevation.value,
  }))

  return (
    <Animated.View
      style={[animatedStyle, style]}
      onTouchStart={() => {
        scale.value = withSpring(0.995)
        elevation.value = withSpring(8)
      }}
      onTouchEnd={() => {
        scale.value = withSpring(1)
        elevation.value = withSpring(2)
      }}
    >
      {children}
    </Animated.View>
  )
}

const InteractiveInput = ({ children, style }) => {
  const scale = useSharedValue(1)
  const backgroundColor = useSharedValue("rgba(33, 150, 243, 0.04)")
  const borderColor = useSharedValue("rgba(33, 150, 243, 0.08)")

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
    borderColor: borderColor.value,
  }))

  return (
    <Animated.View
      style={[animatedStyle, style]}
      onTouchStart={() => {
        scale.value = withSpring(0.98, { damping: 15 })
        backgroundColor.value = withSpring("rgba(33, 150, 243, 0.08)")
        borderColor.value = withSpring("rgba(33, 150, 243, 0.15)")
      }}
      onTouchEnd={() => {
        scale.value = withSpring(1, { damping: 15 })
        backgroundColor.value = withSpring("rgba(33, 150, 243, 0.04)")
        borderColor.value = withSpring("rgba(33, 150, 243, 0.08)")
      }}
    >
      {children}
    </Animated.View>
  )
}

const InteractiveButton = ({ children, style, onPress, disabled }) => {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.95)
          opacity.value = withSpring(0.9)
        }}
        onPressOut={() => {
          scale.value = withSpring(1)
          opacity.value = withSpring(1)
        }}
        style={styles.buttonTouchable}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  )
}

const CurriculumInput = ({ children, style }) => {
  const scale = useSharedValue(1)
  const backgroundColor = useSharedValue("rgba(33, 150, 243, 0.02)")
  const borderColor = useSharedValue("rgba(33, 150, 243, 0.04)")

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
    borderColor: borderColor.value,
  }))

  return (
    <Animated.View
      style={[animatedStyle, style]}
      onTouchStart={() => {
        scale.value = withSpring(0.98, { damping: 15 })
        backgroundColor.value = withSpring("rgba(33, 150, 243, 0.04)")
        borderColor.value = withSpring("rgba(33, 150, 243, 0.08)")
      }}
      onTouchEnd={() => {
        scale.value = withSpring(1, { damping: 15 })
        backgroundColor.value = withSpring("rgba(33, 150, 243, 0.02)")
        borderColor.value = withSpring("rgba(33, 150, 243, 0.04)")
      }}
    >
      {children}
    </Animated.View>
  )
}

export default function UploadVideoPage() {
  const [curriculums, setCurriculums] = useState([])
  const [subjects, setSubjects] = useState([])
  const [chapters, setChapters] = useState([])
  const [selectedCurriculum, setSelectedCurriculum] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedChapter, setSelectedChapter] = useState("")
  const [selectedMaterialType, setSelectedMaterialType] = useState("free")
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [videoDuration, setVideoDuration] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [videoDescription, setVideoDescription] = useState("")
  const [videoTags, setVideoTags] = useState("")
  const [thumbnailUri, setThumbnailUri] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [showTagSelector, setShowTagSelector] = useState(false)

  const router = useRouter()

  const materialTypeOptions = [
    { label: "Free", value: "free" },
    { label: "Premium", value: "premium" },
  ]

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
  ]

  const getTagsByCategory = () => {
    const categories = {}
    LEARNING_STYLE_TAGS.forEach(tag => {
      if (!categories[tag.category]) {
        categories[tag.category] = []
      }
      categories[tag.category].push(tag)
    })
    return categories
  }

  const tagsByCategory = getTagsByCategory()

  useEffect(() => {
    fetchCurriculums()
  }, [])

  useEffect(() => {
    if (selectedCurriculum) {
      fetchSubjects()
      setSelectedSubject("")
      setSelectedChapter("")
    }
  }, [selectedCurriculum])

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters()
      setSelectedChapter("")
    }
  }, [selectedSubject])

  const showNotification = (message, type = "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchCurriculums = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "curriculums"))
      const curriculumList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().title || "Unnamed Curriculum",
      }))
      setCurriculums(curriculumList)
    } catch (error) {
      console.error("Curriculum fetch error:", error)
      showNotification("Could not fetch curriculums")
    }
  }

  const fetchSubjects = async () => {
    if (!selectedCurriculum) return

    try {
      const subjectQuery = query(collection(db, "subjects"), where("curriculumId", "==", selectedCurriculum))
      const querySnapshot = await getDocs(subjectQuery)
      const subjectList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Subject",
      }))
      setSubjects(subjectList)
    } catch (error) {
      console.error("Subjects fetch error:", error)
      showNotification("Could not fetch subjects")
    }
  }

  const fetchChapters = async () => {
    if (!selectedSubject) return
    
    try {
      const subjectRef = doc(db, "subjects", selectedSubject)
      const subjectSnap = await getDoc(subjectRef)
      
      if (subjectSnap.exists()) {
        const chaptersList = subjectSnap.data()?.chapters || []
        setChapters(
          chaptersList.map((chapter, index) => ({
            id: `chapter_${index}`,
            name: chapter || `Chapter ${index + 1}`,
          }))
        )
        
      } else {
        setChapters([])
        console.error("Subject document does not exist")
        showNotification("Subject not found")
      }
    } catch (error) {
      console.error('Chapters fetch error:', error);
      showNotification('Could not fetch chapters');
    }
  }

  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Get thumbnail at 1 second mark
      })
      setThumbnailUri(uri)
      return uri
    } catch (error) {
      console.warn("Failed to generate thumbnail:", error)
      return null
    }
  }

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const selectedFile = result.assets[0]

      // File size check
      if (selectedFile.size > 500 * 1024 * 1024) {
        showNotification("File size exceeds 500MB limit")
        return
      }

      // Video type verification
      if (!selectedFile.mimeType?.startsWith("video/")) {
        showNotification("Please select a video file")
        return
      }

      // Generate thumbnail
      await generateThumbnail(selectedFile.uri)

      // Set default title from filename
      setVideoTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
      setFile(selectedFile)
    } catch (error) {
      console.error("Error picking document:", error)
      showNotification("Error selecting file")
    }
  }

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const uploadVideo = async () => {
    // Validation checks
    if (!selectedCurriculum || !selectedSubject || !selectedChapter || !file || !selectedMaterialType || !videoTitle) {
      showNotification("Please fill all required fields")
      return
    }

    setLoading(true)

    try {
      // Fetch the subject document to get subject name and chapters
      const subjectRef = doc(db, "subjects", selectedSubject)
      const subjectSnap = await getDoc(subjectRef)

      if (!subjectSnap.exists()) {
        throw new Error("Subject not found")
      }

      const subjectData = subjectSnap.data()
      const subjectName = subjectData.name || "Unknown"
      const chapters = subjectData.chapters || []

      // Sanitize subject name and create chapter mapping
      const sanitizedSubjectName = subjectName.replace(/\s+/g, "")
      const chapterMapping = chapters.reduce((mapping, chapter, index) => {
        mapping[`chapter_${index}`] = `CH${index + 1}_${sanitizedSubjectName}`
        return mapping
      }, {})

      // Get the mapped chapter name
      const mappedChapter = chapterMapping[selectedChapter] || selectedChapter

      // Create blob from file URI
      const response = await fetch(file.uri)
      const blob = await response.blob()

      // Upload video with the correct chapter path
      const storageRef = ref(
        storage, 
        `videos/${selectedCurriculum}/${selectedSubject}/${mappedChapter}/${file.name}`
      )
      const snapshot = await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Upload thumbnail if exists
      let thumbnailURL = null
      if (thumbnailUri) {
        const thumbnailResponse = await fetch(thumbnailUri)
        const thumbnailBlob = await thumbnailResponse.blob()
        const thumbnailStorageRef = ref(
          storage,
          `thumbnails/${selectedCurriculum}/${selectedSubject}/${mappedChapter}/${file.name}_thumb`
        )
        const thumbnailSnapshot = await uploadBytes(thumbnailStorageRef, thumbnailBlob)
        thumbnailURL = await getDownloadURL(thumbnailSnapshot.ref)
      }

      // Get chapter name from the chapters array
      const chapterName = chapters[parseInt(selectedChapter.split('_')[1])] || 'Unknown Chapter';

      // Prepare video data with chapter information
      const videoData = {
        id: `video_${Date.now()}`,
        name: videoTitle,
        url: downloadURL,
        thumbnailUrl: thumbnailURL,
        uploadedAt: new Date(),
        fileType: file.mimeType,
        fileSize: file.size,
        difficulty: "beginner",
        materialType: selectedMaterialType,
        duration: videoDuration || null,
        description: videoDescription || null,
        learningStyleTags: selectedTags,
        chapterName: chapterName, // Actual chapter name
        chapterId: mappedChapter, // Mapped chapter ID for storage
        tags: videoTags
          ? videoTags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [],
      }

      // Update subject with video reference using the mapped chapter
      await updateDoc(subjectRef, {
        [`videos.${mappedChapter}`]: arrayUnion(videoData),
        videoBanner: downloadURL,
      })

      showNotification("Video uploaded successfully", "success")

      // Navigate after success
      setTimeout(() => {
        router.push("/teacher/dashboard")
      }, 1500)

      // Reset form
      setFile(null)
      setThumbnailUri(null)
      setVideoTitle("")
      setVideoDescription("")
      setVideoDuration("")
      setVideoTags("")
      setSelectedTags([])
    } catch (error) {
      console.error("Error uploading video:", error)
      showNotification("Failed to upload video: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isUploadDisabled = () => {
    return (
      loading ||
      !selectedCurriculum ||
      !selectedSubject ||
      !selectedChapter ||
      !file ||
      !selectedMaterialType ||
      !videoTitle
    )
  }

  const renderTagsSelection = () => {
    return (
      <View style={styles.tagsContainer}>
        <View style={styles.tagsHeader}>
          <Text style={styles.tagsSectionTitle}>Learning Style Tags</Text>
          <TouchableOpacity 
            style={styles.closeTagsButton}
            onPress={() => setShowTagSelector(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
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
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
      </View>

      {notification && (
        <View style={[styles.notification, { backgroundColor: notification.type === "success" ? "#4CAF50" : "#F44336" }]}>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Curriculum Details Box */}
        <InteractiveCard style={styles.section}>
          <Text style={styles.sectionTitle}>Curriculum Details</Text>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="school-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker selectedValue={selectedCurriculum} onValueChange={setSelectedCurriculum} style={styles.picker}>
              <Picker.Item label="Select Curriculum" value="" />
              {curriculums.map((curriculum) => (
                <Picker.Item key={curriculum.id} label={curriculum.name} value={curriculum.id} />
              ))}
            </Picker>
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="book-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedSubject}
              onValueChange={setSelectedSubject}
              style={styles.picker}
              enabled={selectedCurriculum !== ""}
            >
              <Picker.Item label="Select Subject" value="" />
              {subjects.map((subject) => (
                <Picker.Item key={subject.id} label={subject.name} value={subject.id} />
              ))}
            </Picker>
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="library-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker
              selectedValue={selectedChapter}
              onValueChange={setSelectedChapter}
              style={styles.picker}
              enabled={selectedSubject !== ""}
            >
              <Picker.Item label="Select Chapter" value="" />
              {chapters.map((chapter) => (
                <Picker.Item key={chapter.id} label={chapter.name} value={chapter.id} />
              ))}
            </Picker>
          </CurriculumInput>

          <CurriculumInput style={styles.curriculumInputContainer}>
            <Ionicons name="documents-outline" size={24} color="#2196F3" style={styles.inputIcon} />
            <Picker selectedValue={selectedMaterialType} onValueChange={setSelectedMaterialType} style={styles.picker}>
              {materialTypeOptions.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
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
            <Ionicons name="pricetag-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={videoTags}
              onChangeText={setVideoTags}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#999"
            />
          </InteractiveInput>

          <InteractiveButton style={styles.tagsButton} onPress={() => setShowTagSelector(true)}>
            <View style={styles.buttonContent}>
              <Ionicons name="options-outline" size={24} color="white" />
              <Text style={styles.fileButtonText}>Select Learning Style Tags</Text>
            </View>
          </InteractiveButton>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsPreview}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScrollPreview}
              >
                {selectedTags.map(tagId => {
                  const tag = LEARNING_STYLE_TAGS.find(t => t.id === tagId);
                  return (
                    <View key={tagId} style={styles.selectedTagChip}>
                      <Text style={styles.selectedTagText}>{tag?.name}</Text>
                      <TouchableOpacity 
                        onPress={() => toggleTag(tagId)}
                        style={styles.removeTagButton}
                      >
                        <Ionicons name="close-circle" size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </InteractiveCard>

        {/* File Selection */}
        <InteractiveButton style={styles.fileButton} onPress={handleFileUpload}>
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
          style={[styles.uploadButton, isUploadDisabled() && styles.disabledUploadButton]}
          onPress={uploadVideo}
          disabled={isUploadDisabled()}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            )}
          </View>
        </InteractiveButton>

        {showTagSelector && renderTagsSelection()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.08)",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "rgba(33, 150, 243, 0.04)",
  },
  curriculumInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.04)",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "rgba(33, 150, 243, 0.02)",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333333",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  picker: {
    flex: 1,
    height: 50,
  },
  fileButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tagsButton: {
    backgroundColor: "#3F51B5",
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#3F51B5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  fileButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  fileName: {
    color: "#666666",
    marginBottom: 16,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledUploadButton: {
    backgroundColor: "#A5D6A7",
    shadowOpacity: 0.1,
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonTouchable: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  notification: {
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "white",
    fontWeight: "500",
  },
  tagsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    padding: 16,
    zIndex: 1000,
  },
  tagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tagsSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333333",
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
    fontWeight: "600",
    color: "#555555",
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagChip: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  tagChipSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#1E88E5",
  },
  tagChipText: {
    color: "#2196F3",
    fontSize: 14,
  },
  tagChipTextSelected: {
    color: "white",
  },
  doneButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  selectedTagsPreview: {
    marginBottom: 16,
  },
  tagsScrollPreview: {
    flexDirection: "row",
  },
  selectedTagChip: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  selectedTagText: {
    color: "#2196F3",
    fontSize: 14,
    marginRight: 4,
  },
  removeTagButton: {
    padding: 2,
  }
});