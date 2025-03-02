import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, Animated, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, FlatList, Image, PanResponder } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { debounce } from 'lodash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
// import * as MediaLibrary from 'expo-media-library';
// import ViewShot from 'react-native-view-shot';
import Svg, { Path, G } from 'react-native-svg';
import LoadingScreen from './LoadingScreen';

const StudyNotes = ({ subjectFilter }) => {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState(['Other']);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState(subjectFilter || 'All');
  const [isNotesMinimized, setIsNotesMinimized] = useState(false);
  const [formatOptions, setFormatOptions] = useState({
    bold: false,
    italic: false,
    bullet: false,
    highlight: false,
  });
  const [isShared, setIsShared] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortOption, setSortOption] = useState('newest');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState({ start: 0, end: 0 });
  const [reminderDate, setReminderDate] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [selectedReminderType, setSelectedReminderType] = useState('custom'); // 'custom', 'hour', 'day', 'week'
  const [selectedNote, setSelectedNote] = useState(null);
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(3);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([[locationX, locationY]]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => [...prev, [locationX, locationY]]);
      },
      onPanResponderRelease: () => {
        if (currentPath.length > 0) {
          setPaths(prev => [...prev, {
            points: currentPath,
            color: currentColor,
            width: currentWidth
          }]);
          setCurrentPath([]);
        }
      }
    })
  ).current;
  
  // Animation references
  const addButtonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Fetch subjects from database
  const fetchSubjects = async () => {
    try {
      const subjectsRef = collection(db, 'subjects');
      const querySnapshot = await getDocs(subjectsRef);
      
      const subjectsList = querySnapshot.docs.map(doc => {
        return doc.data().name || 'Other'; // Get subject name directly
      });

      // Add "Other" option and remove duplicates
      const uniqueSubjects = [...new Set([...subjectsList, 'Other'])];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects(['Other']);
    }
  };

  useEffect(() => {
    fetchSubjects();
    requestNotificationPermission();
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Auth state changed - User logged in:", user.uid);
        fetchNotes();
      } else {
        console.log("Auth state changed - No user");
        setNotes([]);
      }
    });

    // Optimize animation performance
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();

    return () => {
      unsubscribe();
      pulseAnimation.stop();
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Notification Permission', 'Enable notifications to receive study reminders');
    }
  };

  useEffect(() => {
    if (subjectFilter) {
      setSelectedSubjectFilter(subjectFilter);
      if (auth.currentUser) {
        fetchNotes();
      }
    }
  }, [subjectFilter]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      if (!auth.currentUser) {
        console.log("No user logged in");
        setIsLoading(false);
        return;
      }

      const userId = auth.currentUser.uid;

      // Animated fade out
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }).start();

      try {
        // First try: Use composite index
      let notesQuery = query(
        collection(db, "studyNotes"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(notesQuery);
        handleQueryResults(querySnapshot);
      } catch (error) {
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
          console.log("Index error detected, creating index...");
          
          // Extract index creation URL if available
          const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
          
          // Show index creation dialog
          Alert.alert(
            "One-time Setup Required",
            "This feature needs a one-time database setup. Would you like to set it up now?",
            [
              {
                text: "Yes, Set Up Now",
                onPress: async () => {
                  if (urlMatch) {
                    // Open Firebase Console for index creation
                    await Linking.openURL(urlMatch[0]);
                    
                    // Show instructions
                    Alert.alert(
                      "Index Creation Instructions",
                      "1. Sign in to Firebase Console\n2. Click 'Create Index' button\n3. Wait for index to be created (may take a few minutes)\n4. Come back to the app and try again",
                      [{ text: "OK" }]
                    );
                  }
                  
                  // Meanwhile, use fallback query
                  useFallbackQuery(userId);
                }
              },
              {
                text: "Use Basic Version",
                onPress: () => useFallbackQuery(userId)
              }
            ]
          );
        } else {
          throw error;
        }
      }

      // Animated fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error("Error loading notes:", error);
      Alert.alert(
        "Error Loading Notes",
        "There was an error loading your notes. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to handle query results
  const handleQueryResults = (querySnapshot) => {
    const notesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || serverTimestamp(),
      updatedAt: doc.data().updatedAt || serverTimestamp(),
      title: doc.data().title || 'Untitled',
      content: doc.data().content || '',
      subject: doc.data().subject || 'Other',
      isShared: doc.data().isShared || false,
      isBookmarked: doc.data().isBookmarked || false,
      isPinned: doc.data().isPinned || false,
      tags: doc.data().tags || [],
      reminder: doc.data().reminder || null,
      formatOptions: doc.data().formatOptions || {
            bold: false,
            italic: false,
            bullet: false,
            highlight: false,
          }
    }));

    // Separate pinned and regular notes
      const pinned = notesList.filter(note => note.isPinned);
      const regular = notesList.filter(note => !note.isPinned);
      
      setPinnedNotes(pinned);
      setNotes(regular);

      if (notesList.length === 0) {
        // Alert.alert(
        //   "No Notes",
        // "Would you like to create your first note?",
        //   [
        //   { text: "Not Now", style: "cancel" },
        //     { text: "Create Note", onPress: () => setShowNoteModal(true) }
        //   ]
        // );
      }
  };

  // Fallback query without ordering
  const useFallbackQuery = async (userId) => {
    try {
      const fallbackQuery = query(
        collection(db, "studyNotes"),
        where("userId", "==", userId)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const fallbackNotes = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || serverTimestamp(),
      }));
      
      // Sort locally
      fallbackNotes.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      const pinned = fallbackNotes.filter(note => note.isPinned);
      const regular = fallbackNotes.filter(note => !note.isPinned);
      
      setPinnedNotes(pinned);
      setNotes(regular);
    } catch (error) {
      console.error("Error in fallback query:", error);
      Alert.alert("Error", "Failed to load notes. Please try again later.");
    }
  };

  const handleSaveNote = async () => {
    try {
      if (!title.trim()) {
        Alert.alert("Error", "Please enter a title for your note");
        return;
      }

      setIsLoading(true);
      const userId = auth.currentUser.uid;

      const noteData = {
        userId,
        title: title.trim(),
        content,
        subject: subject || 'Other',
        isShared,
        isBookmarked,
        isPinned: editingNote?.isPinned || false,
        formatOptions,
        tags,
        reminder: reminderDate,
        updatedAt: serverTimestamp(),
      };
      
      if (editingNote) {
        await updateDoc(doc(db, "studyNotes", editingNote.id), noteData);
        // Show success feedback
        Alert.alert("Success", "Note updated successfully");
      } else {
        noteData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "studyNotes"), noteData);
        // Set reminder if date is provided
        if (reminderDate) {
          scheduleNoteReminder(title, reminderDate);
        }
      }
      
      clearForm();
      setShowNoteModal(false);
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert("Error", "Failed to save note. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleNoteReminder = async (noteTitle, reminderTime) => {
    const trigger = new Date(reminderTime);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study Reminder",
        body: `Time to review your note: ${noteTitle}`,
        data: { noteTitle },
      },
      trigger,
    });
    
    Alert.alert(
      "Reminder Set",
      `You'll be reminded about "${noteTitle}" on ${trigger.toLocaleDateString()} at ${trigger.toLocaleTimeString()}`
    );
  };

  const handleDeleteNote = async (noteId) => {
            try {
              setIsLoading(true);
              await deleteDoc(doc(db, "studyNotes", noteId));
      
      // Cancel any existing reminder
      await Notifications.cancelScheduledNotificationAsync(noteId);
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setPinnedNotes(prev => prev.filter(note => note.id !== noteId));
      
              Alert.alert("Success", "Note deleted successfully");
      setShowDeleteModal(false);
      setShowNoteModal(false);
            } catch (error) {
              console.error("Error deleting note:", error);
      Alert.alert("Error", "Failed to delete note");
            } finally {
              setIsLoading(false);
            }
  };

  const handleSetReminder = async () => {
    try {
      if (!selectedNote) {
        Alert.alert("Error", "Please select a note first");
        setShowReminderModal(false);
        return;
      }

      let reminderTime = new Date();
      
      switch (selectedReminderType) {
        case 'hour':
          reminderTime.setHours(reminderTime.getHours() + 1);
          break;
        case 'day':
          reminderTime.setDate(reminderTime.getDate() + 1);
          break;
        case 'week':
          reminderTime.setDate(reminderTime.getDate() + 7);
          break;
        case 'custom':
          if (!reminderDate) {
            Alert.alert("Error", "Please select a reminder time");
            return;
          }
          reminderTime = reminderDate;
          break;
      }

      if (reminderTime <= new Date()) {
        Alert.alert("Invalid Time", "Please select a future time for the reminder");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Study Reminder",
          body: `Time to review your note: ${selectedNote.title}`,
          data: { noteId: selectedNote.id },
        },
        trigger: reminderTime,
        identifier: selectedNote.id,
      });

      // Update note in Firestore
      await updateDoc(doc(db, "studyNotes", selectedNote.id), {
        reminder: reminderTime.toISOString(),
      });

      Alert.alert("Success", `Reminder set for ${reminderTime.toLocaleString()}`);
      setShowReminderModal(false);
      setSelectedNote(null);
      fetchNotes(); // Refresh notes to show updated reminder
    } catch (error) {
      console.error("Error setting reminder:", error);
      Alert.alert("Error", "Failed to set reminder");
    }
  };

  const togglePinNote = useCallback(async (note) => {
    try {
      const noteRef = doc(db, "studyNotes", note.id);
      await updateDoc(noteRef, {
        isPinned: !note.isPinned,
        updatedAt: serverTimestamp(),
      });
      fetchNotes();
    } catch (error) {
      console.error("Error toggling pin:", error);
      Alert.alert("Error", "Failed to update pin status");
    }
  }, []);

  const toggleBookmarkNote = useCallback(async (note) => {
    try {
      const noteRef = doc(db, "studyNotes", note.id);
      await updateDoc(noteRef, {
        isBookmarked: !note.isBookmarked,
        updatedAt: serverTimestamp(),
      });
      fetchNotes();
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert("Error", "Failed to update bookmark status");
    }
  }, []);

  const handleEditNote = useCallback((note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject);
    setFormatOptions(note.formatOptions || {
      bold: false,
      italic: false,
      bullet: false,
      highlight: false,
    });
    setTags(note.tags || []);
    setReminderDate(note.reminder);
    setShowNoteModal(true);
  }, []);

  const handleExportNotes = useCallback(() => {
    Alert.alert(
      "Export Notes",
      "Choose export options:",
      [
        {
          text: "Text (.txt)",
          onPress: () => exportAsText([...pinnedNotes, ...notes])
        },
        {
          text: "Markdown (.md)",
          onPress: () => exportAsMarkdown([...pinnedNotes, ...notes])
        },
        {
          text: "Share as Text",
          onPress: () => shareAsText([...pinnedNotes, ...notes])
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  }, [notes, pinnedNotes]);

  const shareAsText = async (notesToShare) => {
    try {
      let textContent = `STUDY NOTES - ${new Date().toLocaleDateString()}\n\n`;
      
      notesToShare.forEach(note => {
        textContent += `${note.title}\n`;
        textContent += `Subject: ${note.subject}\n`;
        textContent += `${note.content}\n`;
        if (note.tags && note.tags.length > 0) {
          textContent += `Tags: ${note.tags.join(', ')}\n`;
        }
        textContent += `Created: ${note.createdAt?.toDate?.().toLocaleString() || 'Unknown'}\n`;
        textContent += `Updated: ${note.updatedAt?.toDate?.().toLocaleString() || 'Unknown'}\n`;
        textContent += `----------------------------------------\n\n`;
      });

      await Sharing.shareAsync(
        Platform.select({
          ios: {
            dialogTitle: 'Share Notes',
            text: textContent,
          },
          android: {
            dialogTitle: 'Share Notes',
            text: textContent,
            type: 'text/plain',
          },
        })
      );
    } catch (error) {
      console.error("Error sharing notes:", error);
      Alert.alert("Error", "Failed to share notes");
    }
  };

  const exportAsText = async (notesToExport) => {
    try {
      const fileName = `StudyNotes_${new Date().toISOString().split('T')[0]}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      let fileContent = `STUDY NOTES - ${new Date().toLocaleDateString()}\n\n`;
      
      notesToExport.forEach(note => {
        fileContent += `Title: ${note.title}\n`;
        fileContent += `Subject: ${note.subject}\n\n`;
        fileContent += `${note.content}\n\n`;
        if (note.tags && note.tags.length > 0) {
          fileContent += `Tags: ${note.tags.join(', ')}\n`;
        }
        fileContent += `Created: ${note.createdAt?.toDate?.().toLocaleString() || 'Unknown'}\n`;
        fileContent += `Updated: ${note.updatedAt?.toDate?.().toLocaleString() || 'Unknown'}\n`;
        fileContent += `----------------------------------------\n\n`;
      });
      
      await FileSystem.writeAsStringAsync(filePath, fileContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { 
          UTI: 'public.plain-text',
          mimeType: 'text/plain',
          dialogTitle: 'Export Notes as Text'
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
      Alert.alert("Error", "Failed to export notes");
    }
  };

  const exportAsMarkdown = async (notesToExport) => {
    try {
      const fileName = `StudyNotes_${new Date().toISOString().split('T')[0]}.md`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      let fileContent = `# STUDY NOTES - ${new Date().toLocaleDateString()}\n\n`;
      
      notesToExport.forEach(note => {
        fileContent += `## ${note.title}\n\n`;
        fileContent += `**Subject:** ${note.subject}\n\n`;
        fileContent += `${note.content}\n\n`;
        if (note.tags && note.tags.length > 0) {
          fileContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
        }
        if (note.createdAt?.toDate) {
          fileContent += `*Created: ${note.createdAt.toDate().toLocaleString()}*\n\n`;
        }
        if (note.updatedAt?.toDate) {
          fileContent += `*Updated: ${note.updatedAt.toDate().toLocaleString()}*\n\n`;
        }
        fileContent += `---\n\n`;
      });
      
      await FileSystem.writeAsStringAsync(filePath, fileContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { UTI: '.md', mimeType: 'text/markdown' });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
      Alert.alert("Error", "Failed to export notes");
    }
  };

  const speakNote = (note) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    const textToSpeak = `${note.title}. ${note.content}`;
    
    Speech.speak(textToSpeak, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: (error) => {
        console.error('Speech error:', error);
        setIsSpeaking(false);
      }
    });
    
    setIsSpeaking(true);
  };

  const clearForm = () => {
    setTitle('');
    setContent('');
    setSubject('');
    setEditingNote(null);
    setFormatOptions({
      bold: false,
      italic: false,
      bullet: false,
      highlight: false,
    });
    setTags([]);
    setReminderDate(null);
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Render tag input section
  const renderTagInput = useCallback(() => (
    <View style={styles.tagInputSection}>
      <Text style={styles.sectionLabel}>Tags:</Text>
      
      <View style={styles.tagInput}>
        <TextInput
          style={styles.tagTextInput}
          placeholder="Add tags..."
          value={currentTag}
          onChangeText={setCurrentTag}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <TouchableOpacity 
          style={styles.addTagButton}
          onPress={addTag}
        >
          <Ionicons name="add" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      {tags.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScrollView}
          data={tags}
          keyExtractor={(tag) => tag}
          renderItem={({ item: tag }) => (
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
              <TouchableOpacity 
                onPress={() => removeTag(tag)}
                style={styles.removeTagButton}
              >
                <Ionicons name="close-circle" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  ), [tags, currentTag]);

  // Render reminder section
  const renderReminderSection = useCallback(() => (
    <View style={styles.reminderSection}>
      <Text style={styles.sectionLabel}>Reminder:</Text>
      
      <TouchableOpacity 
        style={styles.reminderButton}
        onPress={() => {
          setSelectedNote(null);
          setShowReminderModal(true);
        }}
      >
        <Ionicons name="alarm-outline" size={20} color="#666" />
        <Text style={styles.reminderButtonText}>
          {selectedNote ? new Date(selectedNote.reminder).toLocaleString() : "Set reminder"}
        </Text>
        {selectedNote && (
          <TouchableOpacity onPress={() => setReminderDate(null)}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  ), [selectedNote]);

  // Render format actions toolbar
  const renderFormatActions = useCallback(() => (
    <View style={styles.formatActions}>
      <TouchableOpacity 
        style={[styles.formatAction, formatOptions.bold && styles.activeFormatAction]} 
        onPress={() => handleFormatting('bold')}
      >
        <MaterialIcons
          name="format-bold" 
          size={20} 
          color={formatOptions.bold ? "#2196F3" : "#666"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.formatAction, formatOptions.italic && styles.activeFormatAction]}
        onPress={() => handleFormatting('italic')}
      >
        <MaterialIcons
          name="format-italic"
          size={20} 
          color={formatOptions.italic ? "#2196F3" : "#666"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.formatAction, formatOptions.bullet && styles.activeFormatAction]}
        onPress={() => handleFormatting('bullet')}
      >
        <MaterialIcons
          name="format-list-bulleted"
          size={20} 
          color={formatOptions.bullet ? "#2196F3" : "#666"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.formatAction, formatOptions.highlight && styles.activeFormatAction]}
        onPress={() => handleFormatting('highlight')}
      >
        <MaterialIcons
          name="highlight"
          size={20} 
          color={formatOptions.highlight ? "#2196F3" : "#666"} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.formatAction, styles.whiteboardButton]}
        onPress={() => setShowWhiteboardModal(true)}
      >
        <MaterialIcons
          name="brush"
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
    </View>
  ), [formatOptions]);

  // Apply text formatting functions
  const handleFormatting = (type) => {
    const selection = selectedText;
    if (selection.start === selection.end) return;

    let newContent = content;
    const selectedPortion = content.slice(selection.start, selection.end);
    let formattedText = '';

    switch (type) {
      case 'bold':
        formattedText = `**${selectedPortion}**`;
        break;
      case 'italic':
        formattedText = `_${selectedPortion}_`;
        break;
      case 'bullet':
        formattedText = selectedPortion.split('\n')
          .map(line => line.trim() ? `• ${line}` : line)
          .join('\n');
        break;
    }

    newContent = content.slice(0, selection.start) + formattedText + content.slice(selection.end);
    setContent(newContent);
  };

  // Memoize filtered notes for better performance
  const filteredNotes = useMemo(() => {
    let filtered = [...notes];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    if (selectedSubjectFilter !== 'All') {
      filtered = filtered.filter(note => note.subject === selectedSubjectFilter);
    }
    
    // Apply sorting
    if (sortOption === 'newest') {
      filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (sortOption === 'oldest') {
      filtered.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    } else if (sortOption === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return filtered;
  }, [notes, searchQuery, selectedSubjectFilter, sortOption]);

  // Memoize filtered pinned notes
  const filteredPinnedNotes = useMemo(() => {
    let filtered = [...pinnedNotes];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    if (selectedSubjectFilter !== 'All') {
      filtered = filtered.filter(note => note.subject === selectedSubjectFilter);
    }
    
    return filtered;
  }, [pinnedNotes, searchQuery, selectedSubjectFilter]);

  // Debounce search to improve performance
  const debouncedSearch = useCallback(
    debounce((text) => {
      setSearchQuery(text);
    }, 300),
    []
  );

  // Format subject name for display
  const formatSubjectName = useCallback((subjectName) => {
    if (subjectName === 'Other') return 'Other';
    // Remove chapter prefix (e.g., "CH1_") and format
    return subjectName.replace(/CH\d+_/g, '').replace(/-/g, ' ').trim();
  }, []);

  // Get subject color based on subject name
  const getSubjectColor = useCallback((subjectName) => {
    if (subjectName === 'Other') return '#6C5CE7';
    
    // Create a consistent color based on subject name
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to HSL for better color distribution
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 60%)`;
  }, []);

  // Render individual note card
  const renderNoteCard = useCallback((note, isPinned = false) => {
    const formattedDate = note.updatedAt?.toDate?.()
      ? note.updatedAt.toDate().toLocaleDateString()
      : 'No date';

    return (
      <View 
        key={note.id} 
        style={[
          styles.noteCard,
          viewMode === 'grid' ? styles.gridCard : styles.listCard,
          note.isBookmarked && styles.bookmarkedCard,
          isPinned && styles.pinnedCard,
        ]}
      >
        <TouchableOpacity 
          style={styles.noteContent}
          onPress={() => handleEditNote(note)}
        >
          <View style={[
            styles.noteSubjectTag,
            { backgroundColor: getSubjectColor(note.subject) }
          ]}>
            <Text style={styles.noteSubjectText}>
              {formatSubjectName(note.subject)}
            </Text>
          </View>
          
          {isPinned && (
            <View style={styles.pinnedIndicator}>
              <Ionicons name="pin" size={16} color="#FF6B6B" />
            </View>
          )}
          
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle} numberOfLines={2}>
              {note.title}
            </Text>
          </View>
          
          <Text style={styles.notePreview} numberOfLines={3}>
            {note.content}
          </Text>
          
          {note.tags && note.tags.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tagsContainer}
            >
              {note.tags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>

        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{formattedDate}</Text>
          
          <View style={styles.noteActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => toggleBookmarkNote(note)}
            >
              <Ionicons 
                name={note.isBookmarked ? "bookmark" : "bookmark-outline"}
                size={22}
                color={note.isBookmarked ? "#2196F3" : "#666"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => togglePinNote(note)}
            >
              <Ionicons 
                name={isPinned ? "pin" : "pin-outline"}
                size={22}
                color={isPinned ? "#FF6B6B" : "#666"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setSelectedNote(note);
                setShowReminderModal(true);
              }}
            >
              <Ionicons 
                name="alarm-outline"
                size={22}
                color="#666"
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => speakNote(note)}
            >
              <Ionicons 
                name={isSpeaking ? "stop-circle" : "play-circle-outline"}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                setNoteToDelete(note.id);
                setShowDeleteModal(true);
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#FF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {note.reminder && (
          <View style={styles.reminderBadge}>
            <Ionicons name="alarm-outline" size={12} color="#FFF" />
            <Text style={styles.reminderText}>
              {new Date(note.reminder).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    );
  }, [viewMode, isSpeaking, formatSubjectName, getSubjectColor]);

  // Add this function after handleSaveNote
  const handleSaveWhiteboard = async () => {
    try {
      if (paths.length === 0 && currentPath.length === 0) {
        Alert.alert("Error", "Please draw something first");
        return;
      }

      // Create a combined array of paths including the current path if it exists
      const allPaths = [...paths];
      if (currentPath.length > 0) {
        allPaths.push({
          points: currentPath,
          color: currentColor,
          width: currentWidth
        });
      }

      // Convert SVG to a base64 string
      const svgString = `
        <svg width="100%" height="100%" viewBox="0 0 400 600">
          ${allPaths.map(path => `
            <path
              d="M ${path.points.map(point => point.join(' ')).join(' L ')}"
              stroke="${path.color}"
              stroke-width="${path.width}"
              fill="none"
            />
          `).join('')}
        </svg>
      `;

      const fileName = `whiteboard_${Date.now()}.svg`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, svgString, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // If editing a note, update the note with the whiteboard
      if (editingNote) {
        const noteRef = doc(db, "studyNotes", editingNote.id);
        await updateDoc(noteRef, {
          whiteboardPath: filePath,
          updatedAt: serverTimestamp(),
        });
      }

      Alert.alert("Success", "Whiteboard saved successfully!");
      setShowWhiteboardModal(false);
      setPaths([]);
      setCurrentPath([]);
    } catch (error) {
      console.error("Error saving whiteboard:", error);
      Alert.alert("Error", "Failed to save whiteboard");
    }
  };

  // Add this function for handling drawing
  const handleDrawing = (event) => {
    const { x, y } = event.nativeEvent;
    const newPath = { path: `M ${x} ${y}`, color: currentColor, width: currentWidth };
    setCurrentPath([...currentPath, [x, y]]);
  };

  // Add this function for clearing the whiteboard
  const clearWhiteboard = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  // Add the whiteboard modal component
  const renderWhiteboardModal = () => (
    <Modal
      visible={showWhiteboardModal}
      animationType="slide"
      onRequestClose={() => setShowWhiteboardModal(false)}
    >
      <View style={styles.whiteboardContainer}>
        <View style={styles.whiteboardHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowWhiteboardModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Whiteboard</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveWhiteboard}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.whiteboardTools}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={clearWhiteboard}
          >
            <Ionicons name="trash-outline" size={24} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.colorPicker}>
            {['#000000', '#FF0000', '#0000FF', '#00FF00'].map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  currentColor === color && styles.selectedColor
                ]}
                onPress={() => setCurrentColor(color)}
              />
            ))}
          </View>
          
          <View style={styles.strokePicker}>
            {[2, 4, 6, 8].map(width => (
              <TouchableOpacity
                key={width}
                style={[
                  styles.strokeButton,
                  currentWidth === width && styles.selectedStroke
                ]}
                onPress={() => setCurrentWidth(width)}
              >
                <View style={[styles.strokePreview, { height: width }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={styles.canvas}>
            <G>
              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={`M ${path.points.map(point => point.join(' ')).join(' L ')}`}
                  stroke={path.color}
                  strokeWidth={path.width}
                  fill="none"
                />
              ))}
              {currentPath.length > 0 && (
                <Path
                  d={`M ${currentPath.map(point => point.join(' ')).join(' L ')}`}
                  stroke={currentColor}
                  strokeWidth={currentWidth}
                  fill="none"
                />
              )}
            </G>
          </Svg>
        </View>
      </View>
    </Modal>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isNotesMinimized ? styles.minimizedContainer : {}]}>
        {isLoading && (
          <LoadingScreen/>
        )}
        
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="book" size={22} color="#2196F3" />
            <Text style={styles.headerTitle}>Smart Study Notes</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              <Ionicons 
                name={viewMode === 'grid' ? "list" : "grid"} 
                size={22} 
                color="#666" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setIsNotesMinimized(!isNotesMinimized)}
            >
              <Ionicons 
                name={isNotesMinimized ? "chevron-down" : "chevron-up"} 
                size={22} 
                color="#666" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleExportNotes}
            >
              <Ionicons name="share-outline" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {!isNotesMinimized && (
          <View style={styles.mainContainer}>
            <View style={styles.searchAndFilter}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChangeText={debouncedSearch}
                />
              </View>
              
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                data={['All', ...subjects]}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.filterChip,
                      selectedSubjectFilter === item && styles.activeFilterChip
                    ]}
                    onPress={() => setSelectedSubjectFilter(item)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedSubjectFilter === item && styles.activeFilterChipText
                    ]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              
              <View style={styles.sortContainer}>
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => {
                    Alert.alert(
                      "Sort Notes",
                      "Choose sorting option",
                      [
                        { text: "Newest First", onPress: () => setSortOption('newest') },
                        { text: "Oldest First", onPress: () => setSortOption('oldest') },
                        { text: "Alphabetical", onPress: () => setSortOption('alphabetical') },
                        { text: "Cancel", style: "cancel" }
                      ]
                    );
                  }}
                >
                  <Ionicons name="funnel-outline" size={20} color="#666" />
                  <Text style={styles.sortButtonText}>Sort</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              style={styles.notesContainer}
              contentContainerStyle={styles.notesContentContainer}
              ListHeaderComponent={() => (
                filteredPinnedNotes.length > 0 ? (
                  <View style={styles.pinnedSection}>
                    <Text style={styles.sectionTitle}>📌 Pinned Notes</Text>
                    <FlatList
                      data={filteredPinnedNotes}
                      renderItem={({ item }) => renderNoteCard(item, true)}
                      keyExtractor={(item) => `pinned-${item.id}`}
                      horizontal={false}
                      numColumns={viewMode === 'grid' ? 2 : 1}
                      scrollEnabled={false}
                    />
                    <View style={styles.sectionDivider} />
                  </View>
                ) : null
              )}
              data={filteredNotes}
              renderItem={({ item }) => renderNoteCard(item)}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
            />
          </View>
        )}

        <Animated.View style={[
          styles.addButtonContainer,
          { transform: [{ scale: addButtonScale }] }
        ]}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              clearForm();
              setShowNoteModal(true);
            }}
          >
            <View style={styles.addButtonInner}>
              <Ionicons name="add" size={32} color="#FFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Modal
          visible={showNoteModal}
          animationType="slide"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowNoteModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingNote ? "Edit Note" : "New Note"}
              </Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveNote}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.titleInput}
                placeholder="Note Title"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.subjectPicker}>
                <Text style={styles.sectionLabel}>Subject:</Text>
                <FlatList
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.subjectScroll}
                  data={subjects}
                  keyExtractor={(item) => item}
                  renderItem={({ item: subj }) => (
                    <TouchableOpacity
                      style={[
                        styles.subjectChip,
                        subject === subj && styles.activeSubjectChip,
                        { backgroundColor: getSubjectColor(subj) }
                      ]}
                      onPress={() => setSubject(subj)}
                    >
                      <Text style={styles.subjectChipText}>{subj}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {renderFormatActions()}

              <TextInput
                style={styles.contentInput}
                placeholder="Start typing your note..."
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                onSelectionChange={(event) => {
                  setSelectedText({
                    start: event.nativeEvent.selection.start,
                    end: event.nativeEvent.selection.end,
                  });
                }}
              />

              {renderTagInput()}
              {renderReminderSection()}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={showReminderModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowReminderModal(false);
            setSelectedNote(null);
          }}
        >
          <View style={styles.reminderModalContainer}>
            <View style={styles.reminderModalContent}>
              <Text style={styles.reminderModalTitle}>Set Reminder</Text>
              
              <View style={styles.reminderTypeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.reminderTypeButton,
                    selectedReminderType === 'hour' && styles.selectedReminderType
                  ]}
                  onPress={() => setSelectedReminderType('hour')}
                >
                  <Text style={styles.reminderTypeText}>+1 Hour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reminderTypeButton,
                    selectedReminderType === 'day' && styles.selectedReminderType
                  ]}
                  onPress={() => setSelectedReminderType('day')}
                >
                  <Text style={styles.reminderTypeText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reminderTypeButton,
                    selectedReminderType === 'week' && styles.selectedReminderType
                  ]}
                  onPress={() => setSelectedReminderType('week')}
                >
                  <Text style={styles.reminderTypeText}>Next Week</Text>
                </TouchableOpacity>
              </View>

              {selectedReminderType === 'custom' && (
                <>
                  <View style={styles.reminderInputGroup}>
                    <Text style={styles.reminderInputLabel}>Custom Date & Time:</Text>
                    <View style={styles.customDateTimeInputs}>
                      {/* Existing date and time inputs */}
                    </View>
                  </View>
                </>
              )}

              <View style={styles.reminderModalButtons}>
                <TouchableOpacity
                  style={styles.cancelReminderButton}
                  onPress={() => {
                    setShowReminderModal(false);
                    setSelectedNote(null);
                  }}
                >
                  <Text style={styles.cancelReminderText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.setReminderButton}
                  onPress={handleSetReminder}
                >
                  <Text style={styles.setReminderText}>Set Reminder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Delete Note</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete this note? This action cannot be undone.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity 
                  style={[styles.deleteModalButton, styles.cancelButton]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                  onPress={() => noteToDelete && handleDeleteNote(noteToDelete)}
                >
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {renderWhiteboardModal()}
      </View>
    </GestureHandlerRootView>
  );
};

export default React.memo(StudyNotes);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  minimizedContainer: {
    maxHeight: 90,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    width: '%',
  },
  searchAndFilter: {
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7CB9E8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterScroll: {
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#7CB9E8',
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#666',
  },
  filterChipText: {
    color: '#666',
  },
  activeFilterChipText: {
    color: '#FFF',
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  sortButtonText: {
    marginLeft: 5,
    color: '#666',
    backgroundColor: 'ffA500',
  },
  notesContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Adjust padding to prevent content from being hidden
    backgroundColor: 'rgba(207, 232, 252, 0.88)',
    width: '100%',
  },
  notesContentContainer: {
    padding: 8,
  },
  pinnedSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    color: '#333',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  noteCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    margin: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 200, // Ensure minimum height for content
  },
  gridCard: {
    width: '46%', // Slightly narrower to fit better
    marginHorizontal: '2%',
    marginVertical: 8,
  },
  listCard: {
    width: '96%',
    marginHorizontal: '2%',
    marginVertical: 6,
  },
  bookmarkedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  pinnedCard: {
    borderTopWidth: 4,
    borderTopColor: '#FF6B6B',
  },
  noteContent: {
    flex: 1,
    minHeight: 120, // Ensure space for content
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // Allow wrapping if needed
    justifyContent: 'flex-end',
    marginLeft: 'auto', // Push to the right
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
    marginVertical: 2,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
    marginLeft: 4,
  },
  noteDate: {
    fontSize: 11,
    color: '#999',
    flex: 1,
    marginRight: 8,
  },
  tagsContainer: {
    maxHeight: 30,
    marginBottom: 8,
  },
  tagChip: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    color: '#FFF',
    fontSize: 11,
  },
  noteSubjectTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '70%', // Prevent long subject names from overflowing
  },
  noteSubjectText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pinnedIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
  },
  noteHeader: {
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 40,
    marginTop: 25, // Add space for subject tag
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    marginTop: 5,
  },
  reminderBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reminderText: {
    color: '#FFF',
    fontSize: 10,
    marginLeft: 4,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    right: 25,
    zIndex: 1000,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  addButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonInner: {
    backgroundColor: '#2196F3',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // Add gradient-like effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 15,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  subjectPicker: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subjectScroll: {
    marginBottom: 10,
  },
  subjectChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeSubjectChip: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  subjectChipText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  formatActions: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  formatAction: {
    marginRight: 15,
    padding: 5,
  },
  activeFormatAction: {
    backgroundColor: '#E3F2FD',
    borderRadius: 5,
  },
  contentInput: {
    minHeight: 200,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  tagInputSection: {
    marginBottom: 15,
  },
  tagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagTextInput: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginRight: 10,
  },
  addTagButton: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  tagsScrollView: {
    marginTop: 10,
  },
  reminderSection: {
    marginBottom: 15,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  reminderButtonText: {
    marginLeft: 10,
    flex: 1,
    color: '#666',
  },
  reminderModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  reminderModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  reminderTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reminderTypeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#EEE',
    flex: 1,
    marginHorizontal: 5,
  },
  selectedReminderType: {
    backgroundColor: '#2196F3',
  },
  reminderTypeText: {
    textAlign: 'center',
    color: '#333',
  },
  reminderInputGroup: {
    marginBottom: 15,
  },
  reminderInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  customDateTimeInputs: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 5,
  },
  reminderModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelReminderButton: {
    backgroundColor: '#EEE',
    padding: 10,
    borderRadius: 5,
    flex: 1,
  },
  cancelReminderText: {
    color: '#333',
    textAlign: 'center',
  },
  setReminderButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
  },
  setReminderText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF4444',
  },
  deleteModalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#EEE',
  },
  confirmDeleteButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmDeleteText: {
    color: 'white',
    fontWeight: 'bold',
  },
  whiteboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  whiteboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  whiteboardTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  toolButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#F5F5F5',
  },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#EEE',
  },
  selectedColor: {
    borderColor: '#2196F3',
    borderWidth: 3,
  },
  strokePicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strokeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#F5F5F5',
  },
  selectedStroke: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  strokePreview: {
    width: 20,
    backgroundColor: '#000',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  whiteboardButton: {
    marginLeft: 'auto', // Push to the right side
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    padding: 8,
  },
});