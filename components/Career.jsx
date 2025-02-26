import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Share, Linking, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';
import TextToSpeech from 'react-native-tts';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Reanimated, { Easing } from 'react-native-reanimated';

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyAKASQbhtjqI22tS55IKcsmuQlnhQivrqM'); // Replace with your API key
const AnimatedProgress = Reanimated.createAnimatedComponent(Reanimated.View);
const CareerAssessment = () => {
  const [currentSection, setCurrentSection] = useState('interests');
  const [showResults, setShowResults] = useState(false);
  const [careerRecommendations, setCareerRecommendations] = useState('');
  const [answers, setAnswers] = useState({
    interests: {},
    aptitude: {},
    academics: {},
    personalityTraits: {},
  });

  // Interest assessment questions
  const interestQuestions = [
    { id: 'int1', question: "I enjoy solving mathematical problems", field: "math" },
    { id: 'int2', question: "I'm curious about how machines and technology work", field: "tech" },
    { id: 'int3', question: "I like to write creatively (stories, poetry, etc.)", field: "creative" },
    { id: 'int4', question: "I'm interested in business and commerce topics", field: "business" },
    { id: 'int5', question: "I enjoy learning about living things and nature", field: "science" },
  ];

  // Aptitude assessment questions
  const aptitudeQuestions = [
    { id: 'apt1', question: "I can visualize three-dimensional objects from different angles", field: "spatial" },
    { id: 'apt2', question: "I can identify patterns and solve logical problems quickly", field: "logical" },
    { id: 'apt3', question: "I can persuade others to see my point of view", field: "communication" },
    { id: 'apt4', question: "I'm good at organizing and planning events or projects", field: "organization" },
    { id: 'apt5', question: "I have strong memory for facts and details", field: "memory" },
  ];

  // Academic performance input fields
  const academicSubjects = [
    { id: 'sub1', name: "Mathematics", field: "math" },
    { id: 'sub2', name: "Science", field: "science" },
    { id: 'sub3', name: "English", field: "language" },
    { id: 'sub4', name: "Social Studies", field: "social" },
    { id: 'sub5', name: "Languages (Hindi/Marathi)", field: "language" },
  ];

  // Personality traits assessment
  const personalityQuestions = [
    { id: 'per1', question: "I prefer working in teams rather than alone", trait: "teamwork" },
    { id: 'per2', question: "I like taking initiative and leadership roles", trait: "leadership" },
    { id: 'per3', question: "I'm patient and persistent when solving difficult problems", trait: "perseverance" },
    { id: 'per4', question: "I prefer practical tasks over theoretical concepts", trait: "practical" },
    { id: 'per5', question: "I'm comfortable with public speaking and presentations", trait: "extroversion" },
  ];
  const [state, setState] = useState({
    careers: [],
    expanded: {},
    comparisons: [],
    loading: true,
    showComparison: false
  });
  const progressAnim = useRef(new Reanimated.Value(0)).current;

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem('careerData');
        if (saved) setState(prev => ({...prev, ...JSON.parse(saved)}));
      } catch (e) { /* Handle error */ }
    };
    loadData();
  }, []);

  // Save data
  useEffect(() => {
    AsyncStorage.setItem('careerData', JSON.stringify(state));
  }, [state.careers, state.comparisons]);

  // Animated progress
  Reanimated.useEffect(() => {
    Reanimated.timing(progressAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.exp),
    }).start();
  }, []);


  
  // Fetch career recommendations
  const fetchCareers = async (answers) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate career recommendations based on: ${JSON.stringify(answers)}`;
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      
      const parsedCareers = text.split('\n').map(line => ({
        id: Math.random().toString(36).substr(2, 9),
        title: line.split(':')[0],
        description: line.split(':')[1],
        metrics: {
          demand: Math.floor(Math.random() * 100),
          salary: Math.floor(Math.random() * 100),
          growth: Math.floor(Math.random() * 100)
        },
        courses: [
          { title: 'Related Course 1', url: 'https://example.com' },
          { title: 'Related Course 2', url: 'https://example.com' }
        ]
      }));
      
      setState(prev => ({ ...prev, careers: parsedCareers, loading: false }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle rating selection for interests and personality
  const handleRatingSelect = (section, questionId, rating) => {
    setAnswers({
      ...answers,
      [section]: {
        ...answers[section],
        [questionId]: rating,
      },
    });
  };

  // Handle academic marks input
  const handleMarksInput = (subjectId, marks) => {
    const numericMarks = marks === '' ? '' : parseInt(marks, 10);

    if (marks === '' || (numericMarks >= 0 && numericMarks <= 100)) {
      setAnswers({
        ...answers,
        academics: {
          ...answers.academics,
          [subjectId]: marks,
        },
      });
    }
  };

  // Navigate between assessment sections
  const navigateToSection = (section) => {
    setCurrentSection(section);
    setShowResults(false);
  };

  // Check if assessment is complete enough to submit
  const isAssessmentComplete = () => {
    const interestAnswers = Object.keys(answers.interests).length;
    const aptitudeAnswers = Object.keys(answers.aptitude).length;
    const academicAnswers = Object.keys(answers.academics).length;
    const personalityAnswers = Object.keys(answers.personalityTraits).length;

    return interestAnswers >= 3 && aptitudeAnswers >= 3 && academicAnswers >= 3 && personalityAnswers >= 3;
  };

  // Generate career recommendations using Gemini
  const generateCareerRecommendations = async (userData) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
  You are a career guidance expert. Based on the following user profile, suggest 3 suitable career paths that align with their interests, aptitudes, academic performance, and personality traits. For each career path, provide:
"
const interestQuestions = [
    { id: 'int1', question: "I enjoy solving mathematical problems", field: "math" },
    { id: 'int2', question: "I'm curious about how machines and technology work", field: "tech" },
    { id: 'int3', question: "I like to write creatively (stories, poetry, etc.)", field: "creative" },
    { id: 'int4', question: "I'm interested in business and commerce topics", field: "business" },
    { id: 'int5', question: "I enjoy learning about living things and nature", field: "science" },
  ];

  // Aptitude assessment questions
  const aptitudeQuestions = [
    { id: 'apt1', question: "I can visualize three-dimensional objects from different angles", field: "spatial" },
    { id: 'apt2', question: "I can identify patterns and solve logical problems quickly", field: "logical" },
    { id: 'apt3', question: "I can persuade others to see my point of view", field: "communication" },
    { id: 'apt4', question: "I'm good at organizing and planning events or projects", field: "organization" },
    { id: 'apt5', question: "I have strong memory for facts and details", field: "memory" },
  ];

  // Academic performance input fields
  const academicSubjects = [
    { id: 'sub1', name: "Mathematics", field: "math" },
    { id: 'sub2', name: "Science", field: "science" },
    { id: 'sub3', name: "English", field: "language" },
    { id: 'sub4', name: "Social Studies", field: "social" },
    { id: 'sub5', name: "Languages (Hindi/Marathi)", field: "language" },
  ];

  // Personality traits assessment
  const personalityQuestions = [
    { id: 'per1', question: "I prefer working in teams rather than alone", trait: "teamwork" },
    { id: 'per2', question: "I like taking initiative and leadership roles", trait: "leadership" },
    { id: 'per3', question: "I'm patient and persistent when solving difficult problems", trait: "perseverance" },
    { id: 'per4', question: "I prefer practical tasks over theoretical concepts", trait: "practical" },
    { id: 'per5', question: "I'm comfortable with public speaking and presentations", trait: "extroversion" },
  ];
"



  1. **Career Title**: A clear and concise title for the career.
  2. **Description**: A brief overview of the career, including what the role entails and why it suits the user.
  3. **Key Skills**: A list of essential skills required for this career.
  4. **Recommended Resources**: Suggest specific courses, certifications, or resources (e.g., books, websites, or platforms like Coursera, Udemy, or edX) to help the user get started.
  5. **Job Market Outlook**: A short note on the current demand or growth potential for this career (if applicable).

  **User Profile**:
  - **Interests**: ${JSON.stringify(userData.interests)}
  - **Aptitude**: ${JSON.stringify(userData.aptitude)}
  - **Academics**: ${JSON.stringify(userData.academics)}
  - **Personality Traits**: ${JSON.stringify(userData.personalityTraits)}

  Format the response as a numbered list with clear headings for each section (Career Title, Description, Key Skills, Recommended Resources, Job Market Outlook). Ensure the recommendations are practical, realistic, and tailored to the user's profile.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error('Error generating career recommendations:', error);
      return 'Unable to generate recommendations at this time. Please try again later.';
    }
  };

  // Submit assessment and generate recommendations
  const submitAssessment = async () => {
    if (!isAssessmentComplete()) {
      alert('Please complete at least 3 questions in each section before submitting.');
      return;
    }

    const aiRecommendations = await generateCareerRecommendations(answers);
    setCareerRecommendations(aiRecommendations);
    setShowResults(true);
    setCurrentSection('results');
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const totalQuestions =
      interestQuestions.length + aptitudeQuestions.length + academicSubjects.length + personalityQuestions.length;

    const answeredQuestions =
      Object.keys(answers.interests).length +
      Object.keys(answers.aptitude).length +
      Object.keys(answers.academics).length +
      Object.keys(answers.personalityTraits).length;

    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  // Render results section
 // Render results section
// Render results section
const renderResults = () => {
    const [expandedDescriptions, setExpandedDescriptions] = useState({});

    const toggleDescription = (careerTitle) => {
      setExpandedDescriptions(prev => ({
        ...prev,
        [careerTitle]: !prev[careerTitle]
      }));
    };
    // Improved parser with error handling
    const parseCareerRecommendations = (text) => {
      try {
        return text.split(/\d+\./g)
          .slice(1) // Skip empty first element
          .map(section => {
            const getSectionContent = (regex) => {
              const match = section.match(regex);
              return match ? match[1].trim().replace(/\n/g, ' ') : '';
            };
  
            return {
              title: getSectionContent(/\*\*Career Title\*\*: (.+?)(\n|$)/i),
              description: getSectionContent(/\*\*Description\*\*: (.+?)(\n\*\*|$)/is),
              skills: getSectionContent(/\*\*Key Skills\*\*: (.+?)(\n\*\*|$)/is).split(/,\s*|\n- /),
              resources: getSectionContent(/\*\*Recommended Resources\*\*: (.+?)(\n\*\*|$)/is)
                .split('\n').filter(r => r.trim()),
              outlook: getSectionContent(/\*\*Job Market Outlook\*\*: (.+?)$/is)
            };
          });
      } catch (error) {
        console.error('Error parsing recommendations:', error);
        return [];
      }
    };
  
    const careerList = parseCareerRecommendations(careerRecommendations);
  
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.resultsHeader}>Career Path Recommendations</Text>
        
        {careerRecommendations ? (
          careerList.length > 0 ? (
            <ScrollView 
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.carouselContainer}
            >
              {careerList.map((career, index) => (
                <View key={index} style={styles.carouselCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                      <Text style={styles.careerTitle}>{career.title}</Text>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.starIcon}>⭐</Text>
                      ))}
                    </View>
                  </View>
  
                  {/* Description */}
                  <View style={styles.descriptionContainer}>
                        {/* Role Overview */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>📋</Text>
                            <Text style={styles.sectionTitle}>Role Overview</Text>
                        </View>
                        <Text style={styles.descriptionText}>
                            {career.description.split('. ')[0]}.
                        </Text>

                        {/* Key Aspects */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>🔑</Text>
                            <Text style={styles.sectionTitle}>Key Aspects</Text>
                        </View>
                        {career.description.split('. ').slice(1, 3).map((point, i) => (
                            <View key={i} style={styles.bulletPoint}>
                            <Text style={styles.bulletIcon}>•</Text>
                            <Text style={styles.bulletText}>{point.replace(/^\d+\)\s*/, '').trim()}</Text>
                            </View>
                        ))}

                        {/* Why It Fits You */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>✅</Text>
                            <Text style={styles.sectionTitle}>Why It Fits You</Text>
                        </View>
                        <View style={styles.highlightBox}>
                            <Text style={styles.highlightText}>
                            {career.description.match(/your(.+?)\./i)?.[0] || 
                            "This role aligns well with your assessed skills and interests"}
                            </Text>
                        </View>

                        {/* Daily Responsibilities */}
                        {career.description.includes('day-to-day') && (
                            <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>📅</Text>
                            <Text style={styles.sectionTitle}>Typical Day</Text>
                            </View>
                        )}
                        <Text style={styles.descriptionDetails}>
                            {career.description.split('day-to-day')[1]?.split('.')[0]}
                        </Text>
                        </View>
  
                  {/* Skills Progress */}
                  <Text style={styles.subHeader}>Key Competencies</Text>
                  <View style={styles.skillsContainer}>
                    {career.skills.slice(0, 5).map((skill, i) => (
                      <View key={i} style={styles.skillMeter}>
                        <View style={[styles.meterFill, { width: `${Math.min(100, 80 + i * 5)}%` }]} />
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
  
                  {/* Resources Accordion */}
                  <Text style={styles.subHeader}>Learning Path</Text>
                  <View style={styles.accordion}>
                    {career.resources.map((resource, i) => (
                      <View key={i} style={styles.accordionItem}>
                        <Text style={styles.resourceType}>
                          {i === 0 ? '📚 Courses' : i === 1 ? '📖 Books' : '🌐 Websites'}
                        </Text>
                        <Text style={styles.resourceText}>{resource.replace(/^- /, '')}</Text>
                      </View>
                    ))}
                  </View>
  
                  {/* Market Outlook */}
                  <View style={styles.outlookContainer}>
                    <Text style={styles.outlookLabel}>Market Outlook:</Text>
                    <View style={styles.outlookPill}>
                      <Text style={styles.outlookText}>{career.outlook}</Text>
                    </View>
                  </View>
  
                  {/* Action Buttons */}
                  <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.saveButton}>
                      <Text style={styles.buttonText}>💾 Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton}>
                      <Text style={styles.buttonText}>📤 Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ Couldn't parse recommendations</Text>
              <Text style={styles.errorHint}>Please try submitting again</Text>
            </View>
          )
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>Analyzing your profile...</Text>
          </View>
        )}
  
        <TouchableOpacity 
          style={styles.floatingActionButton}
          onPress={() => navigateToSection('personalityTraits')}
        >
          <Text style={styles.fabText}>🔄 Retake</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Updated Styles
 
  


  // Render different assessment sections
  const renderSection = () => {
    if (showResults) {
      return renderResults();
    }

    switch (currentSection) {
      case 'interests':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Interest Assessment</Text>
            <Text style={styles.sectionDescription}>
              Rate how much you agree with each statement to help us understand your interests.
            </Text>

            {interestQuestions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionText}>{q.question}</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, answers.interests[q.id] === rating ? styles.selectedRating : null]}
                      onPress={() => handleRatingSelect('interests', q.id, rating)}
                    >
                      <Text style={styles.ratingText}>{rating}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabelText}>Strongly Disagree</Text>
                  <Text style={styles.ratingLabelText}>Strongly Agree</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.nextButton} onPress={() => navigateToSection('aptitude')}>
              <Text style={styles.buttonText}>Next: Aptitude Assessment</Text>
            </TouchableOpacity>
          </View>
        );

      case 'aptitude':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Aptitude Assessment</Text>
            <Text style={styles.sectionDescription}>Rate your skills and abilities in different areas.</Text>

            {aptitudeQuestions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionText}>{q.question}</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, answers.aptitude[q.id] === rating ? styles.selectedRating : null]}
                      onPress={() => handleRatingSelect('aptitude', q.id, rating)}
                    >
                      <Text style={styles.ratingText}>{rating}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabelText}>Not Strong</Text>
                  <Text style={styles.ratingLabelText}>Very Strong</Text>
                </View>
              </View>
            ))}

            <View style={styles.navigationButtons}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigateToSection('interests')}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={() => navigateToSection('academics')}>
                <Text style={styles.buttonText}>Next: Academic Performance</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'academics':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Academic Performance</Text>
            <Text style={styles.sectionDescription}>
              Enter your approximate marks (out of 100) for each subject in your recent exams.
            </Text>

            {academicSubjects.map((subject) => (
              <View key={subject.id} style={styles.academicInputCard}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <TextInput
                  style={styles.marksInput}
                  keyboardType="numeric"
                  placeholder="0-100"
                  value={answers.academics[subject.id] || ''}
                  onChangeText={(text) => handleMarksInput(subject.id, text)}
                  maxLength={3}
                />
              </View>
            ))}

            <View style={styles.navigationButtons}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigateToSection('aptitude')}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={() => navigateToSection('personalityTraits')}>
                <Text style={styles.buttonText}>Next: Personality Traits</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'personalityTraits':
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Personality Traits</Text>
            <Text style={styles.sectionDescription}>Rate how much the following statements describe you.</Text>

            {personalityQuestions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionText}>{q.question}</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        answers.personalityTraits[q.id] === rating ? styles.selectedRating : null,
                      ]}
                      onPress={() => handleRatingSelect('personalityTraits', q.id, rating)}
                    >
                      <Text style={styles.ratingText}>{rating}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabelText}>Not Like Me</Text>
                  <Text style={styles.ratingLabelText}>Very Like Me</Text>
                </View>
              </View>
            ))}

            <View style={styles.navigationButtons}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigateToSection('academics')}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={submitAssessment}>
                <Text style={styles.buttonText}>Submit Assessment</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return (
          <View>
            <Text>Unknown section</Text>
          </View>
        );
    }
  };
   // Component Functions
   const CareerCard = ({ career }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{career.title}</Text>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => TextToSpeech.speak(career.description)}>
            <Text>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, state.comparisons.includes(career.id) && styles.selectedButton]}
            onPress={() => setState(prev => ({
              ...prev,
              comparisons: prev.comparisons.includes(career.id)
                ? prev.comparisons.filter(id => id !== career.id)
                : [...prev.comparisons, career.id]
            }))}
          >
            <Text>🔍 Compare</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text 
        numberOfLines={state.expanded[career.id] ? undefined : 3} 
        style={styles.description}
      >
        {career.description}
      </Text>
      {career.description.length > 150 && (
        <TouchableOpacity onPress={() => setState(prev => ({
          ...prev,
          expanded: { ...prev.expanded, [career.id]: !prev.expanded[career.id] }
        }))}>
          <Text style={styles.readMore}>
            {state.expanded[career.id] ? '▲ Less' : '▼ More'}
          </Text>
        </TouchableOpacity>
      )}

      <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
        <VictoryAxis tickValues={['Demand', 'Salary', 'Growth']} />
        <VictoryAxis dependentAxis tickFormat={(t) => `${t}%`} />
        <VictoryBar
          data={Object.entries(career.metrics).map(([key, value]) => ({ x: key, y: value }))}
          style={{ data: { fill: '#4CAF50' } }}
        />
      </VictoryChart>

      <AnimatedProgress
        style={[
          styles.progress,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${career.metrics.demand}%`]
            })
          }
        ]}
      />

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={async () => {
            const pdf = await RNHTMLtoPDF.convert({
              html: `<h1>${career.title}</h1><p>${career.description}</p>`
            });
            Share.share({ url: pdf.filePath });
          }}
        >
          <Text>📄 Report</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Linking.openURL(career.courses[0].url)}
        >
          <Text>🎓 Courses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {state.loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          <ScrollView>
            {state.careers.map(career => (
              <CareerCard key={career.id} career={career} />
            ))}
          </ScrollView>

          <Modal visible={state.showComparison}>
            <View style={styles.modal}>
              {state.comparisons.map(id => {
                const career = state.careers.find(c => c.id === id);
                return <Text key={id}>{career?.title}</Text>;
              })}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setState(prev => ({ ...prev, showComparison: false }))}
              >
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>

          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => setState(prev => ({ ...prev, showComparison: true }))}
          >
            <Text>Compare ({state.comparisons.length})</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );


  return (
    <ScrollView style={styles.container}>
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Assessment Progress: {calculateCompletion()}%</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${calculateCompletion()}%` }]} />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, currentSection === 'interests' ? styles.activeTab : null]}
          onPress={() => navigateToSection('interests')}
        >
          <Text style={styles.tabText}>Interests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentSection === 'aptitude' ? styles.activeTab : null]}
          onPress={() => navigateToSection('aptitude')}
        >
          <Text style={styles.tabText}>Aptitude</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentSection === 'academics' ? styles.activeTab : null]}
          onPress={() => navigateToSection('academics')}
        >
          <Text style={styles.tabText}>Academics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentSection === 'personalityTraits' ? styles.activeTab : null]}
          onPress={() => navigateToSection('personalityTraits')}
        >
          <Text style={styles.tabText}>Personality</Text>
        </TouchableOpacity>

        {showResults && (
          <TouchableOpacity
            style={[styles.tab, currentSection === 'results' ? styles.activeTab : null]}
            onPress={() => setCurrentSection('results')}
          >
            <Text style={styles.tabText}>Results</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderSection()}
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tab: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  activeTab: {
    backgroundColor: '#4caf50',
  },
  tabText: {
    fontSize: 14,
    color: '#333',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  questionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ratingButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  selectedRating: {
    backgroundColor: '#4caf50',
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingLabelText: {
    fontSize: 12,
    color: '#666',
  },
  academicInputCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  subjectName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  marksInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
  },
  aiResponseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginTop: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  careerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  careerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3436',
    flex: 1,
    marginRight: 10,
  },
  matchBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  matchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  careerDescription: {
    fontSize: 15,
    color: '#636e72',
    lineHeight: 22,
    marginBottom: 15,
  },
  subHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8,
    marginTop: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    backgroundColor: '#dfe6e9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skillText: {
    fontSize: 14,
    color: '#2d3436',
  },
  resourceItem: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
    marginLeft: 8,
  },
  outlookText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  resultsHeader: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d3436',
    marginBottom: 25,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  carouselContainer: {
    marginHorizontal: -20,
  },
  carouselCard: {
    width: Dimensions.get('window').width - 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  careerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3436',
    marginRight: 12,
  },
  rankBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rankText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    fontSize: 18,
    marginLeft: 2,
  },
  careerDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#636e72',
    marginBottom: 25,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    paddingLeft: 12,
  },
  skillsContainer: {
    marginBottom: 20,
  },
  skillMeter: {
    height: 36,
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  meterFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  skillText: {
    position: 'absolute',
    left: 12,
    top: 8,
    fontSize: 14,
    color: '#2d3436',
    fontWeight: '500',
  },
  accordion: {
    marginBottom: 20,
  },
  accordionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resourceType: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '700',
    marginBottom: 4,
  },
  resourceText: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
  },
  outlookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  outlookLabel: {
    fontSize: 14,
    color: '#636e72',
    marginRight: 8,
  },
  outlookPill: {
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  outlookText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: '500',
  },
  errorHint: {
    color: '#c62828',
    fontSize: 14,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    color: '#636e72',
    fontSize: 16,
  },
  descriptionContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3436',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#636e72',
    marginLeft: 30,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 30,
    marginBottom: 8,
  },
  bulletIcon: {
    fontSize: 16,
    color: '#4caf50',
    marginRight: 10,
  },
  bulletText: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
    flex: 1,
  },
  highlightBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  highlightText: {
    fontSize: 14,
    color: '#2d3436',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  descriptionDetails: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
    marginLeft: 30,
    marginTop: 5,
  },
  container: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#2D3436' },
  controls: { flexDirection: 'row', gap: 8 },
  button: { padding: 8, borderWidth: 1, borderRadius: 8, borderColor: '#E0E0E0' },
  selectedButton: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  description: { fontSize: 14, color: '#636E72', lineHeight: 20 },
  readMore: { color: '#2196F3', marginTop: 8 },
  progress: { height: 8, backgroundColor: '#4CAF50', borderRadius: 4, marginVertical: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 8 },
  loader: { flex: 1, justifyContent: 'center' },
  compareButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 24,
    elevation: 4,
  },
  modal: { flex: 1, padding: 24, backgroundColor: 'white' },
  closeButton: { position: 'absolute', top: 24, right: 24 },

});

export default CareerAssessment;