// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Import necessary Firebase products based on project requirements
import { getFirestore } from "firebase/firestore"; // Example: Firestore for database
import { getAuth } from "firebase/auth"; // Example: Authentication
import { getStorage } from "firebase/storage"; // Example: Authentication
import { getDatabase, ref, set, serverTimestamp,push } from "firebase/database"; // Example: Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcJuMJp1O6faqbntlS0cmubXp1TMWO8Yo",
  authDomain: "hackaton-70b38.firebaseapp.com",
  projectId: "hackaton-70b38",
  storageBucket: "hackaton-70b38.appspot.com",
  messagingSenderId: "500779632759",
  appId: "1:500779632759:web:54db5d931d2ea1a3101e72",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Firestore instance
export const auth = getAuth(app); // Auth instance
export const storage = getStorage(app);
export const database = getDatabase(app);

// Add these helper functions for chat operations
export const createPrivateChat = async (studentId, teacherId) => {
  const chatId = [studentId, teacherId].sort().join('_');
  const chatRef = ref(database, `privateChats/${chatId}`);
  // Initialize chat if it doesn't exist
  await set(chatRef, {
    participants: {
      [studentId]: true,
      [teacherId]: true
    },
    createdAt: serverTimestamp()
  });
  return chatId;
};

export const getPrivateChats = async (userId) => {
  const chatsRef = ref(database, 'privateChats');
  const snapshot = await get(chatsRef);
  const chats = [];
  
  if (snapshot.exists()) {
    snapshot.forEach((chatSnapshot) => {
      const chatData = chatSnapshot.val();
      if (chatData.participants && chatData.participants[userId]) {
        chats.push({
          id: chatSnapshot.key,
          ...chatData
        });
      }
    });
  }
  return chats;
};

// New functions for subject group chats
export const createSubjectGroupChat = async (subjectId, subjectName, teacherId) => {
  const chatId = `subject_${subjectId}`;
  const chatRef = ref(database, `groupChats/${chatId}`);
  
  // Initialize group chat
  await set(chatRef, {
    subjectId,
    subjectName,
    teacherId,
    participants: {
      [teacherId]: true // Teacher is initially the only participant
    },
    createdAt: serverTimestamp(),
    lastMessage: {
      text: "Group chat created",
      senderName: "System",
      senderId: "system",
      timestamp: Date.now()
    }
  });
  
  // Update the subject document with the group chat ID
  await updateDoc(doc(db, 'subjects', subjectId), {
    groupChatId: chatId
  });
  
  return chatId;
};

export const addUserToGroupChat = async (groupChatId, userId, userName) => {
  const participantRef = ref(database, `groupChats/${groupChatId}/participants/${userId}`);
  await set(participantRef, true);
  
  // Notify group about new participant
  const messageRef = push(ref(database, `groupChats/${groupChatId}/messages`));
  await set(messageRef, {
    text: `${userName} joined the group`,
    senderId: "system",
    senderName: "System",
    timestamp: Date.now(),
    type: "notification"
  });
};

export const getSubjectGroupChats = async (userId) => {
  const groupChatsRef = ref(database, 'groupChats');
  const snapshot = await get(groupChatsRef);
  const groups = [];
  
  if (snapshot.exists()) {
    snapshot.forEach((groupSnapshot) => {
      const groupData = groupSnapshot.val();
      if (groupData.participants && groupData.participants[userId]) {
        groups.push({
          id: groupSnapshot.key,
          ...groupData
        });
      }
    });
  }
  
  return groups;
};