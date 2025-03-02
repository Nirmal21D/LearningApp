import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
     
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Check if the user is a student
        if (userData.userType === 'student') {
          if (userData.learningProfile?.tags?.length > 0) {
            // Student already has a learning profile, don't show the form
            setShowForm(false);
            onClose(); // Automatically close the modal
          } else {
            // Student has no learning profile, show the form
            setShowForm(true);
          }
        } else {
          // If user is not a student, hide the form
          setShowForm(false);
          onClose();
        }
      } else {
        setShowForm(false);
        onClose();
      }
  
      setLoading(false);
    };
  
    if (userId) {
      checkUserTags();
    }
  }, [userId, onClose]);

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
        attentionSpan: '',
        environmentPreference: '',
        feedbackStyle: '',
        problemSolvingApproach: '',
        scoreBreakdown: counts
      }
    };

    // Determine primary learning style based on most frequent answers
    let primaryStyle = '';
    let maxCount = 0;
    for (const [style, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryStyle = style;
      }
    }

    // Map learning styles to tags and descriptions
    const styleMap = {
      A: {
        tag: 'visual-learner',
        description: 'Visual Learner 👁️'
      },
      B: {
        tag: 'auditory-learner',
        description: 'Auditory Learner 👂'
      },
      C: {
        tag: 'reading-writing-learner',
        description: 'Reading/Writing Learner ✍️'
      },
      D: {
        tag: 'kinesthetic-learner',
        description: 'Kinesthetic Learner 🤸'
      }
    };

    // Add primary learning style tag
    learningProfile.tags.push(styleMap[primaryStyle].tag);
    learningProfile.details.primaryStyle = styleMap[primaryStyle].description;

    // Add learning speed tag based on question 6
    if (answers[6] === 'A') {
      learningProfile.tags.push('quick-processor');
      learningProfile.tags.push('intuitive-learner');
      learningProfile.details.learningSpeed = 'Quick Processor 🚀';
    } else if (answers[6] === 'B') {
      learningProfile.tags.push('reflective-learner');
      learningProfile.tags.push('analytical-thinker');
      learningProfile.details.learningSpeed = 'Reflective Learner 🔄';
    } else if (answers[6] === 'C') {
      learningProfile.tags.push('methodical-learner');
      learningProfile.tags.push('sequential-processor');
      learningProfile.details.learningSpeed = 'Methodical Learner 🐢';
    } else if (answers[6] === 'D') {
      learningProfile.tags.push('experiential-learner');
      learningProfile.tags.push('hands-on-processor');
      learningProfile.details.learningSpeed = 'Experiential Learner 🛠️';
    }

    // Add study preference tag based on question 15
    if (answers[14] === 'A') {
      learningProfile.tags.push('visual-content-preference');
      learningProfile.details.studyPreference = 'Visual Content 🎬';
    } else if (answers[14] === 'B') {
      learningProfile.tags.push('audio-content-preference');
      learningProfile.details.studyPreference = 'Audio Content 🎧';
    } else if (answers[14] === 'C') {
      learningProfile.tags.push('text-content-preference');
      learningProfile.details.studyPreference = 'Text Content 📖';
    } else if (answers[14] === 'D') {
      learningProfile.tags.push('practical-application-preference');
      learningProfile.details.studyPreference = 'Practical Application 🔧';
    }

    // Add group role tag based on question 10
    if (answers[9] === 'A') {
      learningProfile.tags.push('visual-communicator');
      learningProfile.tags.push('graphic-organizer');
    } else if (answers[9] === 'B') {
      learningProfile.tags.push('verbal-explainer');
      learningProfile.tags.push('discussion-leader');
    } else if (answers[9] === 'C') {
      learningProfile.tags.push('note-taker');
      learningProfile.tags.push('information-organizer');
    } else if (answers[9] === 'D') {
      learningProfile.tags.push('practical-demonstrator');
      learningProfile.tags.push('active-facilitator');
    }

    // Add memory technique tag based on question 11
    if (answers[10] === 'A') {
      learningProfile.tags.push('visual-memory-technique');
      learningProfile.tags.push('color-pattern-association');
    } else if (answers[10] === 'B') {
      learningProfile.tags.push('verbal-memory-technique');
      learningProfile.tags.push('social-reinforcement-learning');
    } else if (answers[10] === 'C') {
      learningProfile.tags.push('written-memory-technique');
      learningProfile.tags.push('repetition-reinforcement');
    } else if (answers[10] === 'D') {
      learningProfile.tags.push('action-memory-technique');
      learningProfile.tags.push('embodied-cognition');
    }

    // Add attention span based on question 13
    if (answers[12] === 'A') {
      learningProfile.tags.push('visual-attention-dependency');
      learningProfile.details.attentionSpan = 'Needs Visual Stimulation 👀';
    } else if (answers[12] === 'B') {
      learningProfile.tags.push('active-recall-processor');
      learningProfile.details.attentionSpan = 'Verbal Reinforcement 🔄';
    } else if (answers[12] === 'C') {
      learningProfile.tags.push('note-taking-focused');
      learningProfile.details.attentionSpan = 'Documentation Oriented 📝';
    } else if (answers[12] === 'D') {
      learningProfile.tags.push('activity-dependent-focus');
      learningProfile.details.attentionSpan = 'Needs Interaction 🏃';
    }

    // Add problem-solving approach based on question 9
    if (answers[8] === 'A') {
      learningProfile.tags.push('visual-solution-seeker');
      learningProfile.details.problemSolvingApproach = 'Visual Solutions 🎥';
    } else if (answers[8] === 'B') {
      learningProfile.tags.push('social-problem-solver');
      learningProfile.details.problemSolvingApproach = 'Verbal Assistance 💬';
    } else if (answers[8] === 'C') {
      learningProfile.tags.push('research-oriented');
      learningProfile.details.problemSolvingApproach = 'Independent Research 📑';
    } else if (answers[8] === 'D') {
      learningProfile.tags.push('experimental-problem-solver');
      learningProfile.details.problemSolvingApproach = 'Practical Testing 🔬';
    }

    // Add environment preference based on question 3
    if (answers[2] === 'A') {
      learningProfile.tags.push('media-rich-environment');
      learningProfile.details.environmentPreference = 'Media-Rich Environment 📺';
    } else if (answers[2] === 'B') {
      learningProfile.tags.push('audio-environment');
      learningProfile.details.environmentPreference = 'Audio Environment 🎶';
    } else if (answers[2] === 'C') {
      learningProfile.tags.push('quiet-reading-environment');
      learningProfile.details.environmentPreference = 'Quiet Reading Environment 📚';
    } else if (answers[2] === 'D') {
      learningProfile.tags.push('workshop-environment');
      learningProfile.details.environmentPreference = 'Hands-On Environment 🛠️';
    }

    // Add feedback style based on question 12
    if (answers[11] === 'A') {
      learningProfile.tags.push('visual-summary-preference');
      learningProfile.details.feedbackStyle = 'Visual Summaries 📊';
    } else if (answers[11] === 'B') {
      learningProfile.tags.push('discussion-oriented');
      learningProfile.details.feedbackStyle = 'Verbal Discussion 🎙️';
    } else if (answers[11] === 'C') {
      learningProfile.tags.push('detailed-analysis-preference');
      learningProfile.details.feedbackStyle = 'Written Analysis 📚';
    } else if (answers[11] === 'D') {
      learningProfile.tags.push('practical-feedback-preference');
      learningProfile.details.feedbackStyle = 'Practical Implementation 🎭';
    }

    // Add secondary learning style if significant
    const secondaryCounts = {...counts};
    delete secondaryCounts[primaryStyle];
    const secondaryStyle = Object.entries(secondaryCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    if (secondaryCounts[secondaryStyle] >= 3) {
      learningProfile.tags.push(`secondary-${styleMap[secondaryStyle].tag}`);
    }

    // Add learning balance tags based on score distribution
    const totalAnswers = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Calculate percentages for each style
    const stylePercentages = {};
    for (const [style, count] of Object.entries(counts)) {
      stylePercentages[style] = (count / totalAnswers) * 100;
    }
    
    // Check if the learning style is balanced
    if (Object.values(stylePercentages).every(percentage => percentage >= 15)) {
      learningProfile.tags.push('balanced-learner');
    }
    
    // Add strong preference tag if primary style is very dominant
    if (stylePercentages[primaryStyle] >= 50) {
      learningProfile.tags.push('strong-preference');
    }
    setShowForm(false);
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
        
        // Automatically close when data is saved
        onClose();
      } catch (error) {
        /* console.error('Error updating learning style:', error);
        alert('Failed to save your learning profile. Please try again.'); */
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        </View>
      </Modal>
    );
  }

  if (!showForm) {
    return null; // Don't render anything if the form shouldn't be shown
  }

  const question = questions[currentQuestion];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Discover Your Learning Style</Text>
            {/* Removed the close button as requested */}
          </View>
          
          <Text style={{ marginBottom: 10 }}>Question {currentQuestion + 1} of {questions.length}</Text>
          <Text style={{ fontSize: 16, marginBottom: 15 }}>{question.text}</Text>
          
          <ScrollView style={{ maxHeight: 350 }}>
            {question.options.map(option => (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleAnswer(option.id)}
                style={{ 
                  padding: 15, 
                  marginVertical: 8, 
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8, 
                  backgroundColor: 'white',
                  flexDirection: 'row', 
                  alignItems: 'center' 
                }}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>{option.emoji}</Text>
                <Text style={{ flex: 1 }}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {isSubmitting && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={{ marginTop: 10 }}>Saving your learning profile...</Text>
            </View>
          )}
          
          <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
            {/* Removed the exit button as requested */}
            
            {currentQuestion > 0 && (
              <TouchableOpacity
                onPress={() => setCurrentQuestion(prev => prev - 1)}
                style={{ 
                  padding: 12, 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1
                }}>
                <Text>Previous</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LearningStyleAssessment;