import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  getDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue,
    interpolate 
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const InteractiveCard = ({ children, style }) => {
    const scale = useSharedValue(1);
    const elevation = useSharedValue(2);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: interpolate(elevation.value, [2, 8], [0.1, 0.15]),
        shadowRadius: elevation.value,
    }));

    return (
        <AnimatedPressable 
            style={[animatedStyle, style]}
            onPressIn={() => {
                scale.value = withSpring(0.98);
                elevation.value = withSpring(8);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
                elevation.value = withSpring(2);
            }}
        >
            {children}
        </AnimatedPressable>
    );
};

const MaterialCard = ({ material, onView, onDelete }) => (
  <InteractiveCard style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.titleContainer}>
        <Text style={styles.materialTitle}>{material.title}</Text>
        <View style={[styles.typeBadge, { backgroundColor: material.type === 'pdf' ? '#FF9800' : '#4CAF50' }]}>
          <Text style={styles.typeText}>{material.type.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.description}>{material.description}</Text>
    </View>

    <View style={styles.cardFooter}>
      <View style={styles.metadataContainer}>
        <Text style={styles.metadata}>
          <Ionicons name="time-outline" size={16} color="#666" /> {material.uploadDate}
        </Text>
        <Text style={styles.metadata}>
          <Ionicons name="document-outline" size={16} color="#666" /> {material.size}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.viewButton]}
          onPress={onView}
        >
          <Ionicons name="eye-outline" size={20} color="white" />
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </InteractiveCard>
);

export default function ViewMaterials() {
  const router = useRouter();
  const [materials, setMaterials] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
    fetchVideos();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      // Fetch all subjects
      const subjectsRef = collection(db, "subjects");
      const subjectsSnapshot = await getDocs(subjectsRef);

      // Collect all materials across all subjects and chapters
      const allMaterials = [];

      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectData = subjectDoc.data();
        const subjectId = subjectDoc.id;

        // Check if the subject has materials
        if (subjectData.materials) {
          // Iterate through chapters
          Object.keys(subjectData.materials).forEach((chapterId) => {
            const chapterMaterials = subjectData.materials[chapterId] || [];

            // Transform and add materials with additional context
            const transformedMaterials = chapterMaterials.map((material) => ({
              ...material,
              subjectId: subjectId,
              chapterId: chapterId,
              id: material.id || Math.random().toString(), // Fallback ID if not present
            }));

            allMaterials.push(...transformedMaterials);
          });
        }
      }

      // Sort materials by upload date (most recent first)
      const sortedMaterials = allMaterials.sort((a, b) => {
        const dateA =
          a.uploadedAt instanceof Date ? a.uploadedAt : new Date(a.uploadedAt);
        const dateB =
          b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt);
        return dateB - dateA;
      });

      setMaterials(sortedMaterials);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching materials:", error);
      Alert.alert("Error", "Failed to fetch materials");
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      // Fetch all subjects
      const subjectsRef = collection(db, "subjects");
      const subjectsSnapshot = await getDocs(subjectsRef);

      // Collect all videos across all subjects and chapters
      const allVideos = [];

      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectData = subjectDoc.data();
        const subjectId = subjectDoc.id;

        // Check if the subject has videos
        if (subjectData.videos) {
          // Iterate through chapters
          Object.keys(subjectData.videos).forEach((chapterId) => {
            const chapterVideos = subjectData.videos[chapterId] || [];

            // Transform and add videos with additional context
            const transformedVideos = chapterVideos.map((video) => ({
              ...video,
              subjectId: subjectId,
              chapterId: chapterId,
              id: video.id || Math.random().toString(), // Fallback ID if not present
            }));

            allVideos.push(...transformedVideos);
          });
        }
      }

      // Sort videos by upload date (most recent first)
      const sortedVideos = allVideos.sort((a, b) => {
        const dateA =
          a.uploadedAt instanceof Date ? a.uploadedAt : new Date(a.uploadedAt);
        const dateB =
          b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt);
        return dateB - dateA;
      });

      setVideos(sortedVideos);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching videos:", error);
      Alert.alert("Error", "Failed to fetch videos");
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (material) => {
    try {
      // Unlike the previous version, we'll need to update the entire subject document
      const subjectRef = doc(db, "subjects", material.subjectId);
      const subjectSnap = await getDoc(subjectRef);
      const subjectData = subjectSnap.data();

      if (subjectData.materials && subjectData.materials[material.chapterId]) {
        // Remove the specific material from the chapter's materials array
        const updatedChapterMaterials = subjectData.materials[
          material.chapterId
        ].filter((m) => m.url !== material.url);

        // Update the subject document
        await updateDoc(subjectRef, {
          [`materials.${material.chapterId}`]: updatedChapterMaterials,
        });

        // Update local state
        setMaterials(materials.filter((m) => m.url !== material.url));

        Alert.alert("Success", "Material deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      Alert.alert("Error", "Failed to delete material");
    }
  };

  const handleDeleteVideo = async (video) => {
    try {
      // Unlike the previous version, we'll need to update the entire subject document
      const subjectRef = doc(db, "subjects", video.subjectId);
      const subjectSnap = await getDoc(subjectRef);
      const subjectData = subjectSnap.data();

      if (subjectData.videos && subjectData.videos[video.chapterId]) {
        // Remove the specific video from the chapter's videos array
        const updatedChapterVideos = subjectData.videos[video.chapterId].filter((v) => v.url !== video.url);

        // Update the subject document
        await updateDoc(subjectRef, {
          [`videos.${video.chapterId}`]: updatedChapterVideos,
        });

        // Update local state
        setVideos(videos.filter((v) => v.url !== video.url));

        Alert.alert("Success", "Video deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      Alert.alert("Error", "Failed to delete video");
    }
  };

  const openMaterial = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening material:", error);
      Alert.alert("Error", "Unable to open material");
    }
  };

  const openVideo = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening video:", error);
      Alert.alert("Error", "Unable to open video");
    }
  };

  const renderMaterialItem = ({ item }) => (
    <MaterialCard
      material={{
        title: item.name,
        description: item.description || "No description",
        type: item.materialType || "Unknown",
        size: ((item.fileSize / 1024 / 1024).toFixed(2) + " MB"),
        uploadDate: new Date(item.uploadedAt).toLocaleDateString(),
      }}
      onView={() => openMaterial(item.url)}
      onDelete={() => handleDeleteMaterial(item)}
    />
  );

  const renderVideoItem = ({ item }) => (
    <MaterialCard
      material={{
        title: item.name,
        description: item.description || "No description",
        type: item.videoType || "Unknown",
        size: ((item.fileSize / 1024 / 1024).toFixed(2) + " MB"),
        uploadDate: new Date(item.uploadedAt).toLocaleDateString(),
      }}
      onView={() => openVideo(item.url)}
      onDelete={() => handleDeleteVideo(item)}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Loading materials and videos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Navbar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <InteractiveCard 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </InteractiveCard>
          <Text style={styles.headerTitle}>Materials</Text>
        </View>
      </View>

      {/* Content Container */}
      <View style={styles.listsContainer}>
        {/* Section Headers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Study Materials</Text>
        </View>
        
        {/* Materials List */}
        <FlatList
          contentContainerStyle={styles.listContent}
          data={materials}
          renderItem={renderMaterialItem}
          keyExtractor={(item, index) => item.url || index.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No materials uploaded yet</Text>
          }
        />

        {/* Videos Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Video Materials</Text>
        </View>

        {/* Videos List */}
        <FlatList
          contentContainerStyle={styles.listContent}
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item, index) => item.url || index.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No videos uploaded yet</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.5,
  },
  listsContainer: {
    flex: 1,
    padding: 10,
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingBottom: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  metadataContainer: {
    flexDirection: "column",
    gap: 8,
  },
  metadata: {
    fontSize: 13,
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#FF5252",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
});
