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
  StyleSheet
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

import {db} from "../../lib/firebase";

const CreateBlog = () => {
  const router = useRouter();
  const auth = getAuth();
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
      const user = auth.currentUser;
      await addDoc(collection(db, 'blogs'), {
        ...form,
        author: user?.username || 'Anonymous',
        authorId: user?.uid || null,
        authorPhotoURL: user?.photoURL || null,
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Create New Blog Post</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder="Enter an engaging title"
            value={form.title}
            onChangeText={text => setForm({...form, title: text})}
            maxLength={100}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
          <Text style={styles.charCount}>{form.title.length}/100</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
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

        <View style={styles.formGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.textArea, errors.content ? styles.inputError : null]}
            multiline
            placeholder="Write your blog content here..."
            value={form.content}
            onChangeText={text => setForm({...form, content: text})}
          />
          {errors.content ? <Text style={styles.errorText}>{errors.content}</Text> : null}
          <Text style={styles.charCount}>
            {form.content.length} characters | ~{form.readTime} min read
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Estimated Read Time (minutes)</Text>
          <TextInput
            style={[styles.input, errors.readTime ? styles.inputError : null]}
            placeholder="Auto-calculated, but you can adjust"
            value={form.readTime}
            onChangeText={text => setForm({...form, readTime: text})}
            keyboardType="numeric"
          />
          {errors.readTime ? <Text style={styles.errorText}>{errors.readTime}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={confirmSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Publish Blog Post</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007aff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default CreateBlog;