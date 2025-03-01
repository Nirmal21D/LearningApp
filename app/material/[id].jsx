import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// MaterialViewer Component
const MaterialViewer = ({ material, onClose }) => {
  return (
    <View style={styles.materialViewerContainer}>
      <View style={styles.materialViewerHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.materialTitle} numberOfLines={1}>
          {material.title || "Material"}
        </Text>
      </View>
      <WebView
        source={{ uri: material.url }}
        style={styles.webView}
        originWhitelist={["*"]}
      />
    </View>
  );
};

export default function MaterialPlayer() {
  const params = useLocalSearchParams();
  const { materialId, materialName } = params;
  const [materialData, setMaterialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchMaterialData = async () => {
      try {
        if (!materialId) {
          setError("Invalid material ID");
          return;
        }

        setLoading(true);
        const subjectsRef = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        let foundMaterial = null;
        let foundSubject = null;

        subjectsSnapshot.forEach((subjectDoc) => {
          const subjectData = subjectDoc.data();

          if (subjectData.materials) {
            for (const chapter in subjectData.materials) {
              const materialsArray = subjectData.materials[chapter];
              const matchedMaterial = materialsArray.find(m => m.id === materialId);

              if (matchedMaterial) {
                foundMaterial = matchedMaterial;
                foundSubject = { id: subjectDoc.id, ...subjectData };
                return;
              }
            }
          }
        });

        if (!foundMaterial || !foundSubject) {
          setError("Material not found in any subject");
          return;
        }

        setMaterialData({
          id: materialId,
          ...foundMaterial,
          subjectName: foundSubject.name,
          subjectColor: foundSubject.color,
          subjectId: foundSubject.id,
          url: foundMaterial.url,
        });

        // Update view count inside the correct subject document
        if (auth.currentUser) {
          const subjectDocRef = doc(db, "subjects", foundSubject.id);
          
          // Get the correct chapter's material array
          const chapterMaterials = foundSubject.materials[foundMaterial.chapterId] || [];
          
          // Update the view count by matching the material by name instead of ID
          const updatedMaterials = chapterMaterials.map(material =>
            material.name === foundMaterial.name ? { ...material, viewCount: (material.viewCount || 0) + 1 } : material
          );
          
          // Update Firestore with the modified array
          await updateDoc(subjectDocRef, {
            [`materials.${foundMaterial.chapterId}`]: updatedMaterials,
          });
        }
      } catch (error) {
        console.error("Error fetching material:", error);
        setError("Failed to load material");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialData();
  }, [materialId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {materialName || "Material Viewer"}
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.materialContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading material...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <MaterialViewer 
              material={materialData}
              onClose={() => router.back()}
            />
          )}
        </View>
        
        <View style={styles.recommendedSection}>
          <Text style={styles.recommendedTitle}>More Materials</Text>
          {/* Add your RecommendedMaterials component here */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  content: {
    paddingBottom: 30,
  },
  materialContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: 'white',
  },
  materialViewerContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  materialViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: 4,
  },
  materialTitle: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  errorText: {
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
  },
  recommendedSection: {
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
});