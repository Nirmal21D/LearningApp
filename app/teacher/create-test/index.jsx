import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CreateTest() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { question: '', answer: '' }]);
    };

    const handleCreateTest = async () => {
        try {
            const testsRef = collection(db, 'tests');
            const newTest = {
                title,
                description,
                questions,
                createdAt: serverTimestamp(),
            };
            await addDoc(testsRef, newTest);
            router.back();
        } catch (error) {
            console.error('Error creating test:', error);
            Alert.alert('Error', 'Failed to create test');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Title</Text>
            <TextInput 
                style={styles.input} 
                value={title} 
                onChangeText={setTitle} 
                placeholder="Enter title" 
            />
            <Text style={styles.label}>Description</Text>
            <TextInput 
                style={styles.input} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Enter description" 
            />
            {questions.map((question, index) => (
                <View key={index}>
                    <Text style={styles.label}>Question {index + 1}</Text>
                    <TextInput 
                        style={styles.input} 
                        value={question.question} 
                        onChangeText={text => {
                            const newQuestions = [...questions];
                            newQuestions[index].question = text;
                            setQuestions(newQuestions);
                        }} 
                        placeholder="Enter question" 
                    />
                    <Text style={styles.label}>Answer</Text>
                    <TextInput 
                        style={styles.input} 
                        value={question.answer} 
                        onChangeText={text => {
                            const newQuestions = [...questions];
                            newQuestions[index].answer = text;
                            setQuestions(newQuestions);
                        }} 
                        placeholder="Enter answer" 
                    />
                </View>
            ))}
            <Button title="Add Question" onPress={handleAddQuestion} />
            <Button title="Create Test" onPress={handleCreateTest} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    label: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    input: {
        fontSize: 16,
        color: '#333',
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
});
