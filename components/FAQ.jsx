import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const FAQComponent = () => {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  const data = [
    { question: "What is React Native?", answer: "React Native is a framework for building mobile apps using React and JavaScript." },
    { question: "How does state work in React?", answer: "State is an object that determines how a component renders and behaves." },
    { question: "What are props in React?", answer: "Props are inputs to a React component that allow data to be passed between components." },
    { question: "What is the purpose of useEffect?", answer: "useEffect is used to handle side effects in functional components." },
    { question: "How do you handle user input in React Native?", answer: "You handle user input using the TextInput component and state management." },
    { question: "What is the difference between React and React Native?", answer: "React is for web development, while React Native is used to build mobile applications." },
    { question: "How do you navigate between screens in React Native?", answer: "You can use libraries like React Navigation to navigate between screens." },
    { question: "What is the role of StyleSheet in React Native?", answer: "StyleSheet is used to define styles for components in React Native applications." },
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
