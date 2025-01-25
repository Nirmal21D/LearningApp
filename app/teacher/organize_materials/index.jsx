import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function OrganizeMaterials() {
    const router = useRouter();
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const materialsRef = collection(db, 'materials');
            const materialsQuery = query(materialsRef, orderBy('createdAt', 'desc'));
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

    return (
        <View style={styles.container}>
            <FlatList
                data={materials}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.materialCard}>
                        <Text style={styles.materialTitle}>{item.title}</Text>
                        <Text style={styles.materialDescription}>{item.description}</Text>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.materialsList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    materialCard: {
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 15,
    },
    materialTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    materialDescription: {
        fontSize: 14,
        color: '#666',
    },
    materialsList: {
        padding: 20,
    },
});