import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { getFirestore, addDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const AudioQA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [audioQuestions, setAudioQuestions] = useState([]);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState(null);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  
  // AssemblyAI API key - replace with your actual API key
  const ASSEMBLYAI_API_KEY = '27cade7ed7bb4a2fa8ebf6cbb5135b3c';

  useEffect(() => {
    loadAudioQuestions();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadAudioQuestions = async () => {
    try {
      // First try to load from AsyncStorage
      const savedQuestions = await AsyncStorage.getItem('audioQuestions');
      
      if (savedQuestions) {
        setAudioQuestions(JSON.parse(savedQuestions));
      }
      
      // Then try to load from Firestore if user is logged in
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const db = getFirestore();
        const q = query(
          collection(db, 'audio_questions'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const firestoreQuestions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (firestoreQuestions.length > 0) {
          setAudioQuestions(firestoreQuestions);
          await AsyncStorage.setItem('audioQuestions', JSON.stringify(firestoreQuestions));
        }
      }
    } catch (error) {
      console.error('Error loading audio questions:', error);
    }
  };

  const saveAudioQuestionToStorage = async (newQuestions) => {
    try {
      await AsyncStorage.setItem('audioQuestions', JSON.stringify(newQuestions));
    } catch (error) {
      console.error('Error saving audio questions:', error);
    }
  };

  const saveAudioQuestionToFirestore = async (question) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const db = getFirestore();
        await addDoc(collection(db, 'audio_questions'), {
          ...question,
          userId: user.uid
        });
      }
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Process the recording
      await processAudioQuestion(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording.');
    } finally {
      setRecording(null);
      setIsProcessing(false);
    }
  };
  const clearAudioQuestions = async () => {
    try {
      // Clear from state
      setAudioQuestions([]);
      
      // Clear from AsyncStorage
      await AsyncStorage.removeItem('audioQuestions');
      
      // Clear from Firestore if user is logged in
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        // Note: This is just clearing from the app's perspective.
        // For complete deletion from Firestore, you would need to actually delete documents,
        // but that requires a server-side function or more complex client-side code
        console.log('User is logged in, but Firestore deletion requires additional implementation');
      }
      
      Alert.alert('Success', 'Audio question history has been cleared.');
    } catch (error) {
      console.error('Error clearing audio questions:', error);
      Alert.alert('Error', 'Failed to clear audio question history.');
    }
  };
  
  // Add a confirmation dialog for clearing history
  const confirmClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all audio questions and answers? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: clearAudioQuestions,
          style: 'destructive'
        }
      ]
    );
  };

  const transcribeWithAssemblyAI = async (uri) => {
    try {
      // 1. Read the file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // 2. Create a temporary file with binary data
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileExtension = uri.split('.').pop();
      console.log(fileExtension);
      const mimeType = `audio/${fileExtension === 'mp4' ? 'm4a' : fileExtension}`;
      
      console.log(FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Binary }));
      // 3. Upload the audio to AssemblyAI
      console.log("Uploading audio to AssemblyAI...");
      const uploadResponse = await FileSystem.uploadAsync('https://api.assemblyai.com/v2/upload', uri, {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': "audio/m4a"
        },
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
      });
      
      if (!uploadResponse) {
        
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
        
      }
      
      const uploadData = JSON.parse(uploadResponse.body);
     // const audioUrl = uploadResult.upload_url;
      
      // 4. Start transcription
      console.log("Starting transcription...");
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ audio_url: uploadData.upload_url })
      });
      
      
      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed with status: ${transcriptResponse.status}`);
      }
      
      const transcriptResult = await transcriptResponse.json();
      const transcriptId = transcriptResult.id;
      
      // 5. Poll for transcription result
      console.log("Polling for results...");
      let transcript = null;
      let retries = 0;
      const maxRetries = 30; // Maximum number of polling attempts
      
      while (!transcript && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
        
        const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          method: 'GET',
          headers: {
            'authorization': ASSEMBLYAI_API_KEY
          }
        });
        
        if (!pollingResponse.ok) {
          retries++;
          continue;
        }
        
        const pollingResult = await pollingResponse.json();
        
        if (pollingResult.status === 'completed') {
          transcript = pollingResult.text;
          break;
        } else if (pollingResult.status === 'error') {
          throw new Error(`Transcription error: ${pollingResult.error}`);
        }
        
        retries++;
      }
      
      if (!transcript) {
        throw new Error('Transcription timed out');
      }
      
      // 6. Determine subject based on keywords in the transcription
      let subject = 'General';
      if (transcript.match(/equation|value|pi|quadratic|math|algebra|geometry|trigonometry/i)) {
        subject = 'Mathematics';
      } else if (transcript.match(/newton|motion|force|energy|heat|light|sound|electricity|physics/i)) {
        subject = 'Physics';
      } else if (transcript.match(/acid|base|element|compound|reaction|molecule|chemistry|atom/i)) {
        subject = 'Chemistry';
      } else if (transcript.match(/cell|plant|animal|photosynthesis|biology|ecosystem|water cycle/i)) {
        subject = 'Biology';
      } else if (transcript.match(/history|independence|movement|empire|civilization|ruler|war/i)) {
        subject = 'History';
      } else if (transcript.match(/geography|continent|country|climate|river|mountain|plateau/i)) {
        subject = 'Geography';
      }
      
      return {
        success: true,
        subject: subject,
        text: transcript
      };
      
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const generateAIAnswer = async (question) => {
    const genAI = new GoogleGenerativeAI("AIzaSyAKASQbhtjqI22tS55IKcsmuQlnhQivrqM");
    
    // Use the same system instruction as your main chatbot to maintain consistency
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are an AI tutor trained to answer academic doubts for 10th Std Maharashtra Board students in Mathematics, Science (Physics, Chemistry, Biology), Social Science (History, Geography, Civics, Economics), and English. Your responses must be structured, accurate, and easy to understand. Follow these guidelines:

General Response Format:
1️⃣ Direct Answer: Provide a clear and concise explanation.
2️⃣ Stepwise Explanation (if applicable): Break down complex solutions logically.
3️⃣ Key Takeaways: Summarize key concepts.
4️⃣ Real-World Applications: Relate concepts to practical scenarios.
5️⃣ Diagrams & Formulas (Text-Based): Represent equations, graphs, or tables in text format.

Keep your answers concise, accurate and targeted for 10th grade level understanding.`,
    });
    
    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
      responseMimeType: "text/plain",
    };
    
    try {
      const result = await model.generateContent(question, generationConfig);
      return result.response.text();
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "I couldn't generate an answer for this question. Please try asking in a different way.";
    }
  };

  const processAudioQuestion = async (audioUri) => {
    try {
      // 1. Transcribe the audio using AssemblyAI
      const transcriptionResult = await transcribeWithAssemblyAI(audioUri);
      
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Failed to transcribe audio');
      }
      
      // 2. Set up the new question object
      const newQuestion = {
        id: Date.now().toString(),
        audioUri: audioUri,
        subject: transcriptionResult.subject,
        question: transcriptionResult.text,
        timestamp: new Date().toISOString(),
        answered: false,
        answer: '',
      };
      
      // 3. Update state with the new question
      const updatedQuestions = [newQuestion, ...audioQuestions];
      setAudioQuestions(updatedQuestions);
      
      // 4. Save to storage
      await saveAudioQuestionToStorage(updatedQuestions);
      
      // 5. Save to Firestore
      await saveAudioQuestionToFirestore(newQuestion);
      
      // 6. Set as current question to generate answer
      setCurrentQuestion(newQuestion);
      setIsGeneratingAnswer(true);
      
      // 7. Generate AI answer
      const answer = await generateAIAnswer(transcriptionResult.text);
      
      // 8. Update question with answer
      const answeredQuestion = {
        ...newQuestion,
        answered: true,
        answer: answer
      };
      
      // 9. Update state and storage with the answered question
      const finalUpdatedQuestions = audioQuestions.map(q => 
        q.id === answeredQuestion.id ? answeredQuestion : q
      );
      
      setAudioQuestions([answeredQuestion, ...finalUpdatedQuestions.filter(q => q.id !== answeredQuestion.id)]);
      await saveAudioQuestionToStorage([answeredQuestion, ...finalUpdatedQuestions.filter(q => q.id !== answeredQuestion.id)]);
      await saveAudioQuestionToFirestore(answeredQuestion);
      
      setIsGeneratingAnswer(false);
      setCurrentQuestion(null);
      
    } catch (error) {
      console.error('Error processing audio question:', error);
      setIsGeneratingAnswer(false);
      setCurrentQuestion(null);
      Alert.alert('Error', 'Failed to process audio question.');
    }
  };

  const playAudio = async (uri, id) => {
    // Stop current playing sound if any
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      
      if (currentPlayingId === id) {
        setCurrentPlayingId(null);
        return;
      }
    }
    
    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setCurrentPlayingId(id);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setCurrentPlayingId(null);
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const speakAnswer = async (text, id) => {
    try {
      // Stop any current speech
      Speech.stop();
      
      if (currentPlayingId === `speech_${id}`) {
        setCurrentPlayingId(null);
        return;
      }
      
      setCurrentPlayingId(`speech_${id}`);
      
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setCurrentPlayingId(null),
        onError: () => setCurrentPlayingId(null)
      });
      
    } catch (error) {
      console.error('Error speaking answer:', error);
      setCurrentPlayingId(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderQuestionItem = ({ item }) => (
    <View style={styles.questionItem}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Audio Q&A</Text>
        <View style={styles.headerButtons}>
            <TouchableOpacity 
            onPress={confirmClearHistory}
            style={styles.clearButton}
            disabled={audioQuestions.length === 0}
            >
            <Ionicons name="trash-outline" size={22} color={audioQuestions.length === 0 ? "#ccc" : "#FF6B6B"} />
            </TouchableOpacity>
            <TouchableOpacity 
            onPress={() => setIsVisible(false)}
            style={styles.closeButton}
            >
            <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
        </View>
        </View>
      
      <View style={styles.questionBody}>
        <View style={styles.questionRow}>
          <Text style={styles.questionText}>{item.question}</Text>
          <TouchableOpacity 
            onPress={() => playAudio(item.audioUri, item.id)}
            style={[
              styles.audioButton, 
              currentPlayingId === item.id ? styles.playingButton : {}
            ]}
          >
            <Ionicons 
              name={currentPlayingId === item.id ? "pause" : "play"} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
        
        {item.answered ? (
          <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Answer:</Text>
            <Text style={styles.answerText}>{item.answer}</Text>
            <TouchableOpacity 
              onPress={() => speakAnswer(item.answer, item.id)}
              style={[
                styles.speakButton, 
                currentPlayingId === `speech_${item.id}` ? styles.speakingButton : {}
              ]}
            >
              <Ionicons 
                name={currentPlayingId === `speech_${item.id}` ? "volume-high" : "volume-medium"} 
                size={18} 
                color="white" 
              />
              <Text style={styles.speakButtonText}>
                {currentPlayingId === `speech_${item.id}` ? "Stop" : "Speak"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.generatingText}>Generating answer...</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        style={styles.audioButton}
      >
        <Ionicons name="mic" size={30} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.audioQAContainer}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Audio Q&A</Text>
              <TouchableOpacity 
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
              {audioQuestions.length === 0 && !isProcessing && !isGeneratingAnswer ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="mic-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No Audio Questions Yet</Text>
                  <Text style={styles.emptySubtext}>Tap the microphone below to ask any study-related question</Text>
                </View>
              ) : (
                <FlatList
                  data={audioQuestions}
                  renderItem={renderQuestionItem}
                  keyExtractor={item => item.id}
                  style={styles.questionsList}
                  contentContainerStyle={styles.questionsListContent}
                />
              )}
              
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.processingText}>Transcribing with AssemblyAI...</Text>
                </View>
              )}
              
              {isGeneratingAnswer && currentQuestion && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.processingText}>Generating answer for:</Text>
                  <Text style={styles.currentQuestionText}>"{currentQuestion.question}"</Text>
                </View>
              )}
            </View>

            <View style={styles.recordContainer}>
              <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                style={[
                  styles.recordButton,
                  isRecording ? styles.recordingButton : {}
                ]}
                disabled={isProcessing || isGeneratingAnswer}
              >
                <Ionicons 
                  name={isRecording ? "stop" : "mic"} 
                  size={30} 
                  color="white" 
                />
              </TouchableOpacity>
              <Text style={styles.recordText}>
                {isRecording ? "Recording... Tap to stop" : "Tap to ask any study-related question"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  audioButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#FF5722',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  audioQAContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  contentContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  questionsList: {
    flex: 1,
  },
  questionsListContent: {
    padding: 15,
  },
  questionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  subjectText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timestampText: {
    color: '#999',
    fontSize: 12,
  },
  questionBody: {},
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  audioButton: {
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingButton: {
    backgroundColor: '#f44336',
  },
  answerContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  answerLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  answerText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  speakButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  speakingButton: {
    backgroundColor: '#f44336',
  },
  speakButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
  },
  generatingText: {
    color: '#FFA000',
    marginLeft: 10,
    fontStyle: 'italic',
  },
  recordContainer: {
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  recordButton: {
    backgroundColor: '#FF5722',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  recordText: {
    color: '#666',
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 16,
    marginTop: 15,
    color: '#333',
    textAlign: 'center',
  },
  currentQuestionText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  // Add these style definitions to the StyleSheet
headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    marginRight: 5,
  },
});

export default AudioQA;