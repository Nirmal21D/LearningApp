import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import {  collection, doc, addDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';

import db from "../lib/firebase"
const Comments = ({ blogId }) => {
    const auth = getAuth();
  const user = auth.currentUser;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const commentsRef = collection(db, 'blogs', blogId, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setComments(commentsData.sort((a, b) => a.createdAt - b.createdAt));
    });
    return unsubscribe;
  }, [blogId]);

  const postComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'blogs', blogId, 'comments'), {
        text: newComment,
        author: user?.displayName || 'Anonymous',
        userId: user?.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'blogs', blogId), {
        commentsCount: increment(1)
      });

      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  return (
    <View className="p-4">
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="bg-gray-100 p-3 rounded-lg my-1">
            <Text className="font-bold text-blue-600">{item.author}</Text>
            <Text className="text-gray-800">{item.text}</Text>
            <Text className="text-gray-500 text-xs mt-1">
              {item.createdAt?.toLocaleDateString()}
            </Text>
          </View>
        )}
      />

      {user ? (
        <View className="flex-row mt-4">
          <TextInput
            className="flex-1 border p-2 rounded-l-lg"
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity 
            className="bg-blue-500 px-4 py-2 rounded-r-lg"
            onPress={postComment}
          >
            <Text className="text-white">Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text className="text-center text-gray-500 mt-4">
          Please login to comment
        </Text>
      )}
    </View>
  );
};

export default Comments;