import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ViewMaterials() {
  const router = useRouter();
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const materialsRef = collection(db, 'materials');
      const materialsQuery = query(materialsRef, orderBy('uploadedAt', 'desc'));
      const materialsSnapshot = await getDocs(materialsQuery);
      
      const materialsData = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching materials:', error);
      Alert.alert('Error', 'Failed to fetch materials');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    try {
      await deleteDoc(doc(db, 'materials', materialId));
      setMaterials(materials.filter(material => material.id !== materialId));
      Alert.alert('Success', 'Material deleted successfully');
    } catch (error) {
      console.error('Error deleting material:', error);
      Alert.alert('Error', 'Failed to delete material');
    }
  };

  const openMaterial = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening material:', error);
      Alert.alert('Error', 'Unable to open material');
    }
  };

  const renderMaterialItem = ({ item }) => (
    <View style={styles.materialCard}>
      <Text style={styles.materialTitle}>{item.name}</Text>
      <Text style={styles.materialDescription}>
        Subject: {item.subjectId}
        {'\n'}Size: {(item.fileSize / 1024 / 1024).toFixed(2)} MB
        {'\n'}Type: {item.fileType}
      </Text>
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.viewButton} 
          onPress={() => openMaterial(item.url)}
        >
          <Ionicons name="eye" size={24} color="#007bff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteMaterial(item.id)}
        >
          <Ionicons name="trash" size={24} color="#ff4444" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        renderItem={renderMaterialItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No materials uploaded yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  materialCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  materialDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 10,
    borderRadius: 5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
  },
  actionButtonText: {
    marginLeft: 5,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});