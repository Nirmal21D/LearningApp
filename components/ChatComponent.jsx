  const ChatComponent = ({ sessionId, isTeacher, studentName, teacherName }) => {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');

    useEffect(() => {
      if (!sessionId || !auth.currentUser) return;

      // Reference to the specific chat
      const chatRef = ref(database, `chats/${sessionId}`);
      
      const unsubscribe = onValue(chatRef, (snapshot) => {
        const chatData = snapshot.val();
        if (chatData?.messages) {
          const messageList = Object.entries(chatData.messages)
            .map(([id, message]) => ({
              id,
              ...message
            }))
            .sort((a, b) => b.timestamp - a.timestamp);
          
          setMessages(messageList);
          
          // Mark messages as read
          const updates = {};
          messageList.forEach(message => {
            if (!message.read && message.senderId !== auth.currentUser.uid) {
              updates[`chats/${sessionId}/messages/${message.id}/read`] = true;
            }
          });
          
          if (Object.keys(updates).length > 0) {
            update(ref(database), updates);
          }
        }
      });

      return () => unsubscribe();
    }, [sessionId]);

    const handleSendMessage = async () => {
      if (!messageText.trim()) return;

      try {
        const messagesRef = ref(database, `chats/${sessionId}/messages`);
        const newMessageRef = push(messagesRef);
        
        const messageData = {
          text: messageText.trim(),
          senderId: auth.currentUser.uid,
          senderName: isTeacher ? teacherName : studentName,
          isTeacher: isTeacher,
          timestamp: Date.now(),
          read: false
        };

        await set(newMessageRef, messageData);
        
        // Update last message
        await set(ref(database, `chats/${sessionId}/lastMessage`), messageData);
        
        setMessageText('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    };

    const handleOpenLink = async (url) => {
      try {
        if (Platform.OS === 'web') {
          window.open(url, '_blank');
        } else {
          await WebBrowser.openBrowserAsync(url);
        }
      } catch (error) {
        console.error('Error opening link:', error);
        Alert.alert('Error', 'Failed to open link');
      }
    };

    const handleShareMeeting = () => {
      const meetingLink = generateMeetingLink();
      setMessageText(`Join video session: ${meetingLink}`);
      handleSendMessage();
    };

    const renderMessage = ({ item }) => {
      const isCurrentUser = item.senderId === auth.currentUser.uid;
      const meetingLink = item.text.match(/https:\/\/meet\.jit\.si\/[^\s]+/);

      return (
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
        ]}>
          <Text style={styles.senderName}>
            {item.senderName} {item.isTeacher ? '(Teacher)' : '(Student)'}
          </Text>
          
          {meetingLink ? (
            <View>
              <Text style={styles.messageText}>Video Session Link:</Text>
              <TouchableOpacity 
                onPress={() => handleOpenLink(meetingLink[0])}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Join Meeting</Text>
                <Ionicons name="videocam" size={20} color="#2196F3" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.messageText}>{item.text}</Text>
          )}
          
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            inverted={true}
          />

          {isTeacher && (
            <View style={styles.actionContainer}>
              <TouchableOpacity 
                style={styles.shareButton} 
                onPress={handleShareMeeting}
              >
                <Ionicons name="videocam" size={24} color="white" />
                <Text style={styles.shareButtonText}>Share Meeting Link</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color="white"
                style={!messageText.trim() ? { opacity: 0.5 } : null}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    messageList: {
      flex: 1,
      padding: 10,
    },
    actionContainer: {
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      backgroundColor: '#fff',
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2196F3',
      padding: 12,
      borderRadius: 8,
    },
    shareButtonText: {
      color: 'white',
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
    },
    messageContainer: {
      padding: 10,
      marginVertical: 5,
      borderRadius: 8,
      maxWidth: '80%',
    },
    currentUserMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#DCF8C6',
    },
    otherUserMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#fff',
    },
    senderName: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
    },
    messageText: {
      fontSize: 16,
      color: '#333',
    },
    timestamp: {
      fontSize: 10,
      color: '#999',
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f0f0',
      padding: 8,
      borderRadius: 4,
      marginTop: 4,
    },
    linkText: {
      color: '#2196F3',
      marginRight: 8,
      fontSize: 14,
      fontWeight: '600',
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    input: {
      flex: 1,
      backgroundColor: '#f0f0f0',
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 8,
      marginRight: 10,
      fontSize: 16,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: '#2196F3',
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  export default ChatComponent;