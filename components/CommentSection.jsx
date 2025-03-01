import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const CommentSection = ({ videoId }) => {
  const user = getAuth().currentUser;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('videoId', '==', videoId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setComments(commentsData.sort((a, b) => a.createdAt - b.createdAt));
    });

    return () => unsubscribe();
  }, [videoId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const commentData = {
      videoId,
      text: newComment,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      replyTo: replyTo ? replyTo.id : null,
    };

    await addDoc(collection(db, 'comments'), commentData);
    setNewComment('');
    setReplyTo(null);
  };

  const deleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const confirmDeleteComment = (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteComment(commentId) }
      ]
    );
  };

  const renderComment = ({ item }) => (
    <View style={[styles.commentItem, item.replyTo && styles.replyItem]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{item.userName}</Text>
        <Text style={styles.commentDate}>
          {item.createdAt?.toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => setReplyTo(item)}>
          <Text style={styles.replyButton}>Reply</Text>
        </TouchableOpacity>
        {user?.uid === item.userId && (
          <TouchableOpacity onPress={() => confirmDeleteComment(item.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      {comments.filter(comment => comment.replyTo === item.id).map(reply => (
        <View key={reply.id} style={styles.replyContainer}>
          {renderComment({ item: reply })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments</Text>
      <FlatList
        data={comments.filter(comment => !comment.replyTo)}
        keyExtractor={item => item.id}
        renderItem={renderComment}
      />
      {replyTo && (
        <View style={styles.replyingToContainer}>
          <Text>Replying to: {replyTo.userName}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Write a comment..."
        value={newComment}
        onChangeText={setNewComment}
      />
      <TouchableOpacity 
        style={styles.postButton}
        onPress={handleAddComment}
      >
        <Text style={styles.postButtonText}>Post Comment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyItem: {
    marginLeft: 20,
    backgroundColor: '#f1f1f1',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#0077cc',
  },
  commentText: {
    color: '#333',
    marginTop: 4,
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  replyButton: {
    color: '#0077cc',
    marginRight: 16,
  },
  deleteButton: {
    color: '#cc0000',
  },
  replyContainer: {
    marginTop: 8,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelReply: {
    color: '#FF4444',
    marginLeft: 8,
  },
  postButton: {
    backgroundColor: '#0077cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CommentSection;