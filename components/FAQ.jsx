import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const FAQComponent = () => {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  const data = [
    { question: "How can I improve my grammar and writing skills using this app?", answer: "The app provides interactive grammar exercises, writing prompts, and expert tips to help you improve your English writing and grammar skills." },
    { question: "Are there chapter-wise summaries for quick revision?", answer: "Yes, each chapter has a summary with key points, important dates, and concept maps for easy revision." },
    { question: "Does the app include practical experiment videos?", answer: "Yes, we offer interactive videos and simulations to help you understand practical concepts visually." },
    { question: "Can I practice problems step by step with solutions?", answer: "Yes, the app provides step-by-step solutions for complex problems, along with video explanations" },

  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.faqItem}>
            <TouchableOpacity style={styles.question} onPress={() => toggleExpand(index)}>
              <Text style={styles.questionText}>{item.question}</Text>
              <Text style={styles.icon}>{expanded === index ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expanded === index && <Text style={styles.answer}>{item.answer}</Text>}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  faqItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  question: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  icon: {
    fontSize: 18,
    color: '#1E88E5',
  },
  answer: {
    fontSize: 14,
    color: '#424242',
    marginTop: 5,
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 5,
  },
});

export default FAQComponent;
