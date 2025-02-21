import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

const LearningStyleAssessment = ({ onClose, userId, visible }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserTags = async () => {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().learningProfile?.tags?.length > 0) {
        setShowForm(false);
        console.log("ok")
      } else {
        setShowForm(true);
        console.log("ok not")
      }
      setLoading(false);
    };

    if (userId) {
      checkUserTags();
    }
  }, [userId]);

  const questions = [
    {
        id: 1,
        text: "If you're learning something new, what's your go-to method?",
        options: [
          { id: 'A', text: 'Watch a video or look at pictures', emoji: '🖼️' },
          { id: 'B', text: 'Listen to an explanation', emoji: '🎧' },
          { id: 'C', text: 'Read about it in a book or article', emoji: '📖' },
          { id: 'D', text: 'Try it out myself', emoji: '🛠️' }
        ]
      },
      {
        id: 2,
        text: "You need to remember an important piece of information. What do you do?",
        options: [
          { id: 'A', text: 'Draw a diagram or use colors', emoji: '🎨' },
          { id: 'B', text: 'Repeat it out loud', emoji: '🗣️' },
          { id: 'C', text: 'Write it down in a notebook', emoji: '✍️' },
          { id: 'D', text: 'Relate it to an action or movement', emoji: '🤹' }
        ]
      },
      {
        id: 3,
        text: "What do you enjoy doing in your free time?",
        options: [
          { id: 'A', text: 'Watching movies, YouTube, or playing video games', emoji: '📺' },
          { id: 'B', text: 'Listening to music or podcasts', emoji: '🎶' },
          { id: 'C', text: 'Reading books or articles', emoji: '📚' },
          { id: 'D', text: 'Doing something hands-on like cooking or crafting', emoji: '🛠️' }
        ]
      },
      {
        id: 4,
        text: "How do you study for an important test?",
        options: [
          { id: 'A', text: 'Use diagrams, mind maps, or flashcards', emoji: '🧠' },
          { id: 'B', text: 'Listen to recordings or discuss with a friend', emoji: '🎙️' },
          { id: 'C', text: 'Read notes or textbooks carefully', emoji: '📑' },
          { id: 'D', text: 'Solve problems, do experiments, or practice actively', emoji: '🏋️' }
        ]
      },
      {
        id: 5,
        text: "When you get a new gadget, how do you figure out how to use it?",
        options: [
          { id: 'A', text: 'Look at the pictures or diagrams in the manual', emoji: '📸' },
          { id: 'B', text: 'Watch a video tutorial', emoji: '🎬' },
          { id: 'C', text: 'Read the instructions carefully', emoji: '📝' },
          { id: 'D', text: 'Just start pressing buttons and exploring', emoji: '🛠️' }
        ]
      },
      {
        id: 6,
        text: "If a teacher explains something fast, how do you feel?",
        options: [
          { id: 'A', text: 'I understand it quickly and move on', emoji: '🚀' },
          { id: 'B', text: 'I get most of it but need to review later', emoji: '🔄' },
          { id: 'C', text: 'I need to go through it step by step', emoji: '🐢' },
          { id: 'D', text: 'I only get it if I can try it out myself', emoji: '🎭' }
        ]
      },
      {
        id: 7,
        text: "How do you describe directions to someone?",
        options: [
          { id: 'A', text: 'Draw a map or point it out visually', emoji: '🗺️' },
          { id: 'B', text: 'Explain it step by step', emoji: '🗣️' },
          { id: 'C', text: 'Write it down clearly', emoji: '✏️' },
          { id: 'D', text: 'Walk them through it physically', emoji: '🚶' }
        ]
      },
      {
        id: 8,
        text: "What's your favorite way to learn a new language?",
        options: [
          { id: 'A', text: 'Using flashcards and pictures', emoji: '🎨' },
          { id: 'B', text: 'Listening to audio lessons or talking to people', emoji: '🎧' },
          { id: 'C', text: 'Reading books, articles, or grammar guides', emoji: '📖' },
          { id: 'D', text: 'Practicing in real-life conversations or role-playing', emoji: '🎭' }
        ]
      },
      {
        id: 9,
        text: "If you don't understand something in class, what do you do?",
        options: [
          { id: 'A', text: 'Look for a video or a visual explanation', emoji: '🎥' },
          { id: 'B', text: 'Ask a friend or teacher to explain it again', emoji: '💬' },
          { id: 'C', text: 'Re-read the textbook or my notes', emoji: '📑' },
          { id: 'D', text: 'Try solving a related problem or experiment', emoji: '🔬' }
        ]
      },
      {
        id: 10,
        text: "When studying in a group, what role do you usually take?",
        options: [
          { id: 'A', text: 'The one who draws charts or makes visual aids', emoji: '📊' },
          { id: 'B', text: 'The one who explains things aloud', emoji: '🗣️' },
          { id: 'C', text: 'The one who writes summaries', emoji: '📝' },
          { id: 'D', text: 'The one who demonstrates and applies concepts', emoji: '🎭' }
        ]
      },
      {
        id: 11,
        text: "What helps you remember things better?",
        options: [
          { id: 'A', text: 'Watching animations or using colors', emoji: '🎨' },
          { id: 'B', text: 'Repeating it aloud or discussing with someone', emoji: '🎤' },
          { id: 'C', text: 'Writing and rewriting notes', emoji: '✍️' },
          { id: 'D', text: 'Acting it out or doing related activities', emoji: '🤹' }
        ]
      },
      {
        id: 12,
        text: "How do you feel about reading long articles or books?",
        options: [
          { id: 'A', text: 'I prefer summaries, diagrams, or videos instead', emoji: '📺' },
          { id: 'B', text: 'I like hearing the key points in a discussion', emoji: '🎙️' },
          { id: 'C', text: 'I enjoy reading and analyzing in detail', emoji: '📚' },
          { id: 'D', text: 'I prefer learning through hands-on activities', emoji: '🎭' }
        ]
      },
      {
        id: 13,
        text: "What happens when you listen to a long lecture?",
        options: [
          { id: 'A', text: 'I zone out unless there are visuals', emoji: '😴' },
          { id: 'B', text: 'I remember it if I repeat the key points', emoji: '🔄' },
          { id: 'C', text: 'I take detailed notes and review them later', emoji: '📝' },
          { id: 'D', text: 'I lose focus unless I can do something interactive', emoji: '🏃' }
        ]
      },
      {
        id: 14,
        text: "If you had to explain something complex to a friend, how would you do it?",
        options: [
          { id: 'A', text: 'Draw a diagram or show a video', emoji: '📊' },
          { id: 'B', text: 'Talk them through it', emoji: '🗣️' },
          { id: 'C', text: 'Give them notes to read', emoji: '📄' },
          { id: 'D', text: 'Show them with a real example', emoji: '🏗️' }
        ]
      },
      {
        id: 15,
        text: "What's your ideal way to study?",
        options: [
          { id: 'A', text: 'Watching video tutorials and using graphics', emoji: '🎬' },
          { id: 'B', text: 'Listening to discussions or recorded explanations', emoji: '🎧' },
          { id: 'C', text: 'Reading detailed books or articles', emoji: '📖' },
          { id: 'D', text: 'Doing hands-on practice or solving problems', emoji: '🔧' }
        ]
      }
  ];

  const calculateLearningStyle = useCallback(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(answers).forEach(answer => {
      counts[answer]++;
    });

    const learningProfile = {
      tags: [],
      details: {
        learningSpeed: '',
        primaryStyle: '',
        studyPreference: '',
        scoreBreakdown: counts
      }
    };

    if (answers[6] === 'A' || answers[6] === 'B') {
      learningProfile.tags.push('fast-learner');
      learningProfile.details.learningSpeed = 'Fast Learner 🚀';
    } else if (answers[6] === 'C') {
      learningProfile.tags.push('methodical-learner');
      learningProfile.details.learningSpeed = 'Methodical Learner 🐢';
    } else {
      learningProfile.tags.push('hands-on-learner');
      learningProfile.details.learningSpeed = 'Hands-on Learner 🛠️';
    }
    setShowForm(false)
    return learningProfile;
  }, [answers]);

  const handleAnswer = async (answer) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        const learningProfile = calculateLearningStyle();
        const db = getFirestore();
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          learningProfile,
          lastAssessmentDate: new Date().toISOString()
        });


        onClose();
      } catch (error) {
        console.error('Error updating learning style:', error);
        alert('Failed to save your learning style. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!showForm) {
    return null;
  }

  const question = questions[currentQuestion];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Discover Your Learning Style</Text>
          <Text style={{ marginVertical: 10 }}>Question {currentQuestion + 1} of {questions.length}</Text>
          <Text style={{ fontSize: 16, marginVertical: 10 }}>{question.text}</Text>
          {question.options.map(option => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleAnswer(option.id)}
              style={{ padding: 10, marginVertical: 5, borderWidth: 1, borderRadius: 5, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>{option.emoji}</Text>
              <Text style={{ marginLeft: 10 }}>{option.text}</Text>
            </TouchableOpacity>
          ))}
          {isSubmitting && <ActivityIndicator size="large" color="#0000ff" />}
        </View>
      </View>
    </Modal>
  );
};

export default LearningStyleAssessment;
