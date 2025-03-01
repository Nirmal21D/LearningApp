import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminHeader from '../../../components/AdminHeader';
import * as DocumentPicker from 'expo-document-picker';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function UploadMaterials() {
  const [material, setMaterial] = useState({
    title: '',
    description: '',
    type: 'document', // document, presentation, worksheet
    file: null,
  });

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (result.type === 'success') {
        setMaterial({ ...material, file: result });
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const handleUpload = async () => {
    try {
      if (!material.title || !material.description || !material.file) {
        alert('Please fill in all fields and select a file');
        return;
      }

      // Upload file to Firebase Storage
      const response = await fetch(material.file.uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `materials/${Date.now()}_${material.file.name}`);
      const uploadResult = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Save material metadata to Firestore
      const materialsRef = collection(db, 'materials');
      await addDoc(materialsRef, {
        title: material.title,
        description: material.description,
        type: material.type,
        fileUrl: downloadURL,
        fileName: material.file.name,
        uploadedAt: new Date().toISOString(),
      });

      // Reset form
      setMaterial({
        title: '',
        description: '',
        type: 'document',
        file: null,
      });

      alert('Material uploaded successfully!');
    } catch (error) {
      console.error('Error uploading material:', error);
      alert('Error uploading material. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Upload Materials" />
      <ScrollView style={styles.content}>
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload New Material</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={material.title}
            onChangeText={(text) => setMaterial({ ...material, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            multiline
            value={material.description}
            onChangeText={(text) => setMaterial({ ...material, description: text })}
          />
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                material.type === 'document' && styles.selectedType
              ]}
              onPress={() => setMaterial({ ...material, type: 'document' })}
            >
              <Text style={styles.typeText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                material.type === 'presentation' && styles.selectedType
              ]}
              onPress={() => setMaterial({ ...material, type: 'presentation' })}
            >
              <Text style={styles.typeText}>Presentation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                material.type === 'worksheet' && styles.selectedType
              ]}
              onPress={() => setMaterial({ ...material, type: 'worksheet' })}
            >
              <Text style={styles.typeText}>Worksheet</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.fileButton}
            onPress={handleFilePick}
          >
            <Text style={styles.buttonText}>
              {material.file ? `Selected: ${material.file.name}` : 'Select File'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
          >
            <Text style={styles.buttonText}>Upload Material</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  uploadSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeText: {
    fontSize: 16,
    color: '#333',
  },
  fileButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#00C851',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 