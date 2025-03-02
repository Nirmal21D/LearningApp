import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { db } from "../../lib/firebase";

const CreateBlog = () => {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Physics',
    readTime: ''
  });
  const [errors, setErrors] = useState({
    title: '',
    content: '',
    readTime: ''
  });
  const [userData, setUserData] = useState(null);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Validate form fields
  const validateForm = () => {
    let isValid = true;
    const newErrors = { title: '', content: '', readTime: '' };

    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    } else if (form.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
      isValid = false;
    }

    if (!form.content.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (form.content.length < 50) {
      newErrors.content = 'Content must be at least 50 characters';
      isValid = false;
    }

    if (form.readTime && isNaN(parseInt(form.readTime))) {
      newErrors.readTime = 'Read time must be a number';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Calculate estimated read time based on content length
  useEffect(() => {
    if (form.content) {
      // Average reading speed: 200 words per minute
      const wordCount = form.content.trim().split(/\s+/).length;
      const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));
      setForm(prev => ({ ...prev, readTime: estimatedReadTime.toString() }));
    }
  }, [form.content]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'blogs'), {
        ...form,
        author: userData?.username || user?.displayName || 'Anonymous',
        authorId: user?.uid || null,
        authorPhotoURL: userData?.photoURL || user?.photoURL || null,
        upvotes: 0,
        downvotes: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        userVotes: {}
      });
      Alert.alert('Success', 'Your blog post has been published!');
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSubmit = () => {
    Alert.alert(
      'Publish Blog Post',
      'Are you sure you want to publish this blog post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: handleSubmit }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
      <View style={styles.glassEffectContainer}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.header}>Create a New Blog</Text>
        </View>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.main}>
            <View style={styles.formContainer}>
              {Object.values(errors).some(error => error) && (
                <Text style={styles.errorText}>Please fix the errors below</Text>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <View style={[styles.inputContainer, errors.title ? {borderColor: '#ff3333'} : null]}>
                  <Ionicons name="create-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter an engaging title"
                    value={form.title}
                    onChangeText={text => setForm({...form, title: text})}
                    maxLength={100}
                  />
                </View>
                {errors.title ? <Text style={styles.fieldErrorText}>{errors.title}</Text> : null}
                <Text style={styles.charCount}>{form.title.length}/100</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={[styles.inputContainer, styles.pickerContainer]}>
                  <Ionicons name="bookmark-outline" size={20} color="#666" style={styles.inputIcon} />
                  <Picker
                    selectedValue={form.category}
                    onValueChange={value => setForm({...form, category: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Physics" value="Physics" />
                    <Picker.Item label="Chemistry" value="Chemistry" />
                    <Picker.Item label="Mathematics" value="Mathematics" />
                    <Picker.Item label="Biology" value="Biology" />
                    <Picker.Item label="Computer Science" value="ComputerScience" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Content</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer, errors.content ? {borderColor: '#ff3333'} : null]}>
                  <Ionicons name="document-text-outline" size={20} color="#666" style={[styles.inputIcon, {alignSelf: 'flex-start', marginTop: 12}]} />
                  <TextInput
                    style={styles.textArea}
                    multiline
                    placeholder="Write your blog content here..."
                    value={form.content}
                    onChangeText={text => setForm({...form, content: text})}
                  />
                </View>
                {errors.content ? <Text style={styles.fieldErrorText}>{errors.content}</Text> : null}
                <Text style={styles.charCount}>
                  {form.content.length} characters | ~{form.readTime} min read
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Estimated Read Time (minutes)</Text>
                <View style={[styles.inputContainer, errors.readTime ? {borderColor: '#ff3333'} : null]}>
                  <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Auto-calculated, but you can adjust"
                    value={form.readTime}
                    onChangeText={text => setForm({...form, readTime: text})}
                    keyboardType="numeric"
                  />
                </View>
                {errors.readTime ? <Text style={styles.fieldErrorText}>{errors.readTime}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.publishButton}
                onPress={confirmSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.publishButtonText}>Publish Blog Post</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  glassEffectContainer: {
    flex: 1,
    padding: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    marginHorizontal: 3,
    top: 10,
    justifyContent: 'flex-start',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 50,
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  formContainer: {
    gap: 11,
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
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
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
  pickerContainer: {
    padding: 0,
    paddingLeft: Platform.OS === 'web' ? 16 : 12,
    height: 54,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    padding: 0,
    paddingLeft: Platform.OS === 'web' ? 16 : 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
  },
  picker: {
    flex: 1,
    height: 54,
    color: '#333',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  textArea: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    minHeight: 200,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingRight: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 51, 51, 0.05)',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  fieldErrorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: 4,
  },
  publishButton: {
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
    elevation: 5,
    marginTop: 10,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: 10,
    left: -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: 320,
    right: -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: 60,
    left: -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});

export default CreateBlog;