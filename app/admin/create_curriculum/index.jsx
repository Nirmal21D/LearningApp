import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useState } from 'react';
import { db } from '../../../lib/firebase'; // Import Firestore database
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore functions
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

export default function CreateCurriculum() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(''); // State for error messages

  const handleCreateCurriculum = async () => {
    try {
      await addDoc(collection(db, 'curriculums'), {
        title,
        description,
        createdAt: new Date(),
      });
      console.log('Curriculum created successfully');
      // Optionally reset the form or navigate to another screen
      setTitle('');
      setDescription('');
      setError('Curriculum created successfully!');
    } catch (error) {
      console.error('Error creating curriculum:', error.message);
      setError('Failed to create curriculum. Please try again.'); // Set error message
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          {/* Fixed position header */}
          <View style={styles.topBarContainer}>
            <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
            
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Create Curriculum</Text>
              <Text style={styles.subtitle}>Add a new curriculum to your collection</Text>
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeInDown.duration(1000).springify()} 
              style={styles.main}
            >
              {/* Empty space to account for fixed header */}
              <View style={styles.headerSpacer} />

              {error ? <Text style={error.includes('successfully') ? styles.successText : styles.errorText}>{error}</Text> : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="book-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Curriculum Title"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Curriculum Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity style={styles.createButton} onPress={handleCreateCurriculum}>
                  <Text style={styles.createButtonText}>Create Curriculum</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
    bottom: 80,
  },
  // Fixed position for the header
  topBarContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: Platform.OS === 'web' ? 20 : 16,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    marginLeft: 5,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 14,
    color: '#666',
    lineHeight: 15,
    marginRight: 25,
  },
  // Spacer to prevent content from being hidden under the fixed header
  headerSpacer: {
    height: Platform.OS === 'web' ? 130 : 260,
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  successText: {
    color: '#00aa00',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  formContainer: {
    gap: 20,
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
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  inputIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    marginLeft: 12,
  },
  createButton: {
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
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
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
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
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
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});