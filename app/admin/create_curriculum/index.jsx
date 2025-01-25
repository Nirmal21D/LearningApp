import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { db } from '../../../lib/firebase'; // Import Firestore database
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore functions

export default function CreateCurriculum() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(''); // State for error messages

  const handleCreateCurriculum = async () => {
    try {
      await addDoc(collection(db, 'curriculums'), {
        title,
        description,
        createdAt: new Date(),
      });
      console.log('Curriculum created successfully');
      // Optionally reset the form or navigate to another screen
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creating curriculum:', error.message);
      setError('Failed to create curriculum. Please try again.'); // Set error message
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Curriculum</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null} {/* Display error message */}
        
        <TextInput
          style={styles.input}
          placeholder="Curriculum Title"
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Curriculum Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        
        <TouchableOpacity style={styles.button} onPress={handleCreateCurriculum}>
          <Text style={styles.buttonText}>Create Curriculum</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});
