import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { collection, doc, addDoc, updateDoc, deleteDoc, increment, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, auth } from "../lib/firebase";

const Comments = ({ blogId }) => {
  const user = auth.currentUser;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!blogId) return;

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

  const postComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'blogs', blogId, 'comments'), {
        text: newComment,
        author: userData?.username || user?.displayName || 'Anonymous',
        userId: user?.uid,
        createdAt: serverTimestamp(),
        parentId: replyTo
      });

      await updateDoc(doc(db, 'blogs', blogId), {
        commentsCount: increment(1)
      });

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, 'blogs', blogId, 'comments', commentId));
      await updateDoc(doc(db, 'blogs', blogId), {
        commentsCount: increment(-1)
      });
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
    <View style={[styles.commentItem, item.parentId && styles.replyItem]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{item.author}</Text>
        <Text style={styles.commentDate}>
          {item.createdAt?.toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => setReplyTo(item.id)}>
          <Text style={styles.replyButton}>Reply</Text>
        </TouchableOpacity>
        {user?.uid === item.userId && (
          <TouchableOpacity onPress={() => confirmDeleteComment(item.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      {comments.filter(comment => comment.parentId === item.id).map(reply => (
        <View key={reply.id} style={styles.replyContainer}>
          {renderComment({ item: reply })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={comments.filter(comment => !comment.parentId)}
        keyExtractor={item => item.id}
        renderItem={renderComment}
      />

      {user ? (
        <View style={styles.commentInputContainer}>
          {replyTo && (
            <Text style={styles.replyingTo}>
              Replying to {comments.find(comment => comment.id === replyTo)?.author}
            </Text>
          )}
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity 
            style={styles.postButton}
            onPress={postComment}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.loginPrompt}>
          Please login to comment
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
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
  commentInputContainer: {
    flexDirection: 'column',
    marginTop: 16,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyingTo: {
    marginBottom: 8,
    color: '#666',
  },
  commentInput: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
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
  loginPrompt: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});

export default Comments;