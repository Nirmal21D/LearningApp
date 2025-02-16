// components/ChatBot/index.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, addDoc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as DocumentPicker from 'expo-document-picker';

const ChatBot = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const [documentUri, setDocumentUri] = useState(null);

  
  const scaleAnimation = React.useRef(new Animated.Value(1)).current;
  const flatListRef = React.useRef(null);

  var Doutsolverinfo = `You are an AI tutor trained to answer academic doubts for 10th Std Maharashtra Board students in Mathematics, Science (Physics, Chemistry, Biology), Social Science (History, Geography, Civics, Economics), and English. Your responses must be structured, accurate, and easy to understand. Follow these guidelines:

General Response Format:
1️⃣ Direct Answer: Provide a clear and concise explanation.
2️⃣ Stepwise Explanation (if applicable): Break down complex solutions logically.
3️⃣ Key Takeaways: Summarize key concepts.
4️⃣ Real-World Applications: Relate concepts to practical scenarios.
5️⃣ Diagrams & Formulas (Text-Based): Represent equations, graphs, or tables in text format.

Subject-Specific Instructions:
📌 Mathematics:

Solve problems using step-by-step methods.
Provide formula derivations and proofs where necessary.
Include alternative methods if applicable.
📌 Science:

Explain concepts with definitions, key points, and real-world applications.
Use chemical equations, reaction mechanisms, or circuit diagrams where needed.
Provide practical examples of scientific principles in daily life.
📌 Social Science:

Present historical events, geographical concepts, and economic theories with structured breakdowns.
Highlight key dates, causes, effects, and consequences.
Use comparative tables for better understanding.
📌 English:

Explain grammar rules with examples.
Break down literary analysis with themes, characters, and summary.
Provide stepwise writing techniques for essays, letters, and reports.
Additional Features:
✔ Clarify vague questions before answering.
✔ Include quizzes or thought-provoking questions for engagement.
✔ Use analogies and simplified explanations to make learning easier.
✔ Ensure factual and conceptual accuracy while maintaining engagement.

"Your goal is to act as an interactive AI tutor, providing well-structured, stepwise, and engaging academic assistance while maintaining accuracy and clarity."`;

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (!isFirstLoad) {
      saveChatHistory();
    }
  }, [chatHistory]);

  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
      setIsFirstLoad(false);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async () => {
    try {
      await AsyncStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getAIResponse = async (userMessage) => {
    const genAI = new GoogleGenerativeAI("AIzaSyAKASQbhtjqI22tS55IKcsmuQlnhQivrqM");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash",
      systemInstruction: Doutsolverinfo,
     });
    const generationConfig = {
      temperature: 1.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };
    try {
      const result = await model.generateContent(userMessage, generationConfig); // Dynamically use the user message as the prompt
      return result.response.text();
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "Sorry, I couldn't generate a response.";
    }
  };
  
  

  const saveMessageToFirestore = async (message) => {
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (user) {
        await addDoc(collection(db, 'chat_messages'), {
          userId: user.uid,
          message: message.text,
          sender: message.sender,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Update the handleImagePicker function
const handleImagePicker = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*', // Allow all types
  });
  if (result.type === 'success') {
    setDocumentUri(result.uri);
    setMessage(`Document selected: ${result.name}`);  // Display the selected document name in the message field.
  }
};


  const handleSend = async () => {
  // Create user message
  const userMessage = {
    id: Date.now(),
    text: message,
    sender: 'user',
    timestamp: new Date().toISOString(),
  };

  // Add user message to chat history
  setChatHistory(prev => [...prev, userMessage]);

  // Get AI response and add to chat history
  const aiResponse = await getAIResponse(message);
  const botMessage = {
    id: Date.now() + 1,
    text: aiResponse,
    sender: 'bot',
    timestamp: new Date().toISOString(),
  };

  setChatHistory(prev => [...prev, botMessage]);
};

const handleClearHistory = async () => {
  try {
    await AsyncStorage.removeItem('chatHistory');
    setChatHistory([]);
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatBubble = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userMessageText : styles.botMessageText]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          animateButton();
          setIsVisible(true);
          setUnreadCount(0);
        }}
        style={styles.chatButton}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
          <Ionicons name="chatbubble-ellipses" size={30} color="white" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderText}>AI Doubt Solver</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  onPress={handleClearHistory}
                  style={styles.clearButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {chatHistory.length === 0 ? (
              <View style={styles.emptyChatContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
                <Text style={styles.emptyChatText}>Start a conversation!</Text>
                <Text style={styles.emptyChatSubtext}>Ask any question about your studies</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={chatHistory}
                renderItem={renderChatBubble}
                keyExtractor={item => item.id.toString()}
                style={styles.chatList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
            )}

            {isTyping && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.typingText}>AI is typing...</Text>
              </View>
            )}

              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ask your doubt..."
                  multiline
                  maxLength={500}
                />
                
                {/* Show the selected document name if it's available */}
                {documentUri && (
                  <Text style={styles.documentInfo}>
                    Document selected: {documentUri.split('/').pop()}
                  </Text>
                )}

                <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
                  <Ionicons name="image" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSend}
                  style={[styles.sendButton, { opacity: message.trim() === '' ? 0.5 : 1 }]}
                  disabled={message.trim() === ''}
                >
                  <Ionicons name="send" size={24} color="white" />
                </TouchableOpacity>
              </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
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
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 5,
    marginRight: 10,
  },
  closeButton: {
    padding: 5,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  chatList: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 10,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatBot;