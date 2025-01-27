import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Picker } from '@react-native-picker/picker';

export default function CreateTest() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTest = async () => {
        if (isSaving) return;
        setIsSaving(true);
        await handleCreateTest();
        setIsSaving(false);
    };

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const subjectsRef = collection(db, 'subjects');
                const subjectsSnapshot = await getDocs(subjectsRef);
                const subjectsList = subjectsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSubjects(subjectsList);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching subjects:', error);
                Alert.alert('Error', 'Failed to load subjects');
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) {
            setChapters([]);
            return;
        }
        const selectedSubjectData = subjects.find(subject => subject.id === selectedSubject);
        if (selectedSubjectData && selectedSubjectData.chapters) {
            setChapters(selectedSubjectData.chapters);
        } else {
            setChapters([]);
        }
    }, [selectedSubject, subjects]);

    const handleAddQuestion = (type) => {
        const newQuestion = type === 'multiple_choice' 
            ? {
                type: 'multiple_choice',
                question: '',
                options: ['', '', '', ''],
                correctOption: 0,
              }
            : {
                type: 'text',
                question: '',
                answer: ''
              };
        setQuestions([...questions, newQuestion]);
    };

    const handleUpdateOption = (questionIndex, optionIndex, text) => {
        const newQuestions = [...questions];
        newQuestions[questionIndex].options[optionIndex] = text;
        setQuestions(newQuestions);
    };

    const handleCreateTest = async () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        if (!selectedSubject || !selectedChapter) {
            Alert.alert('Error', 'Please select both subject and chapter');
            return;
        }

        if (questions.length === 0) {
            Alert.alert('Error', 'Please add at least one question');
            return;
        }

        // Validate questions
        const isValid = questions.every(q => {
            if (q.type === 'text') {
                return q.question.trim() && q.answer.trim();
            } else {
                return q.question.trim() && 
                       q.options.every(opt => opt.trim()) && 
                       typeof q.correctOption === 'number';
            }
        });

        if (!isValid) {
            Alert.alert('Error', 'Please fill in all question fields');
            return;
        }

        try {
            // Get the selected subject's name
            const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
            const subjectName = selectedSubjectData?.name || '';

            const testData = {
                title: title.trim(),
                description: description.trim(),
                questions: questions.map(q => ({
                    ...q,
                    question: q.question.trim(),
                    ...(q.type === 'text' 
                        ? { answer: q.answer.trim() }
                        : { options: q.options.map(opt => opt.trim()) }
                    )
                })),
                subjectId: selectedSubject,
                subjectName, // Add subject name for easier querying
                chapter: selectedChapter,
                createdAt: serverTimestamp(),
            };

            console.log('Saving test data:', testData);

            // Create the test document
            const testsRef = collection(db, 'tests');
            const docRef = await addDoc(testsRef, testData);
            
            console.log('Test saved successfully with ID:', docRef.id);
            
            Alert.alert(
                'Success',
                'Test created successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            console.error('Detailed error:', error);
            Alert.alert(
                'Error',
                'Failed to create test: ' + (error.message || 'Unknown error')
            );
        }
    };

    const renderQuestion = (question, index) => {
        if (question.type === 'multiple_choice') {
            return (
                <View key={index} style={styles.questionContainer}>
                    <Text style={styles.label}>Multiple Choice Question {index + 1}</Text>
                    <TextInput 
                        style={styles.input} 
                        value={question.question} 
                        onChangeText={text => {
                            const newQuestions = [...questions];
                            newQuestions[index].question = text;
                            setQuestions(newQuestions);
                        }} 
                        placeholder="Enter question" 
                        multiline
                    />
                    
                    {question.options.map((option, optionIndex) => (
                        <View key={optionIndex} style={styles.optionContainer}>
                            <TouchableOpacity 
                                style={[
                                    styles.radioButton,
                                    question.correctOption === optionIndex && styles.radioButtonSelected
                                ]}
                                onPress={() => {
                                    const newQuestions = [...questions];
                                    newQuestions[index].correctOption = optionIndex;
                                    setQuestions(newQuestions);
                                }}
                            >
                                <Text style={styles.radioButtonText}>
                                    {question.correctOption === optionIndex ? '✓' : ''}
                                </Text>
                            </TouchableOpacity>
                            <TextInput 
                                style={styles.optionInput}
                                value={option}
                                onChangeText={(text) => handleUpdateOption(index, optionIndex, text)}
                                placeholder={`Option ${optionIndex + 1}`}
                            />
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View key={index} style={styles.questionContainer}>
                <Text style={styles.label}>Text Question {index + 1}</Text>
                <TextInput 
                    style={styles.input} 
                    value={question.question} 
                    onChangeText={text => {
                        const newQuestions = [...questions];
                        newQuestions[index].question = text;
                        setQuestions(newQuestions);
                    }} 
                    placeholder="Enter question" 
                    multiline
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
                    multiline
                />
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(itemValue) => {
                        setSelectedSubject(itemValue);
                        setSelectedChapter('');
                    }}
                    style={styles.picker}
                >
                    <Picker.Item label="Select a subject" value="" />
                    {subjects.map((subject) => (
                        <Picker.Item 
                            key={subject.id} 
                            label={subject.name} 
                            value={subject.id} 
                        />
                    ))}
                </Picker>
            </View>

            <Text style={styles.label}>Chapter</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedChapter}
                    onValueChange={setSelectedChapter}
                    style={styles.picker}
                    enabled={selectedSubject !== ''}
                >
                    <Picker.Item label="Select a chapter" value="" />
                    {chapters.map((chapter, index) => (
                        <Picker.Item 
                            key={index}
                            label={chapter}
                            value={chapter}
                        />
                    ))}
                </Picker>
            </View>

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
                multiline
            />

            {questions.map((question, index) => renderQuestion(question, index))}

            <View style={styles.buttonContainer}>
                <View style={styles.addQuestionContainer}>
                    <Button 
                        title="Add Text Question" 
                        onPress={() => handleAddQuestion('text')} 
                    />
                    <View style={styles.buttonSpacing} />
                    <Button 
                        title="Add Multiple Choice" 
                        onPress={() => handleAddQuestion('multiple_choice')} 
                    />
                </View>
                <View style={styles.buttonSpacing} />
                <Button 
                    title={isSaving ? "Creating Test..." : "Create Test"}
                    onPress={handleSaveTest}
                    disabled={isSaving}
                />
            </View>

            
        </ScrollView>
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
        minHeight: 40,
    },
    pickerContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    questionContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginLeft: 10,
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        backgroundColor: '#007AFF',
    },
    radioButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 40,
    },
    addQuestionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonSpacing: {
        height: 10,
        width: 10,
    },
});