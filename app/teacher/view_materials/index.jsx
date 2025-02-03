import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
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
    <View style={styles.materialCard}>
      <Text style={styles.materialTitle}>{item.name}</Text>
      <Text style={styles.materialDescription}>
        Description: {item.description || "No description"}
        {"\n"}Type: {item.materialType || "Unknown"}
        {"\n"}Size: {(item.fileSize / 1024 / 1024).toFixed(2)} MB
        {"\n"}Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
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
          onPress={() => handleDeleteMaterial(item)}
        >
          <Ionicons name="trash" size={24} color="#ff4444" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVideoItem = ({ item }) => (
    <View style={styles.videoCard}>
      <Text style={styles.videoTitle}>{item.name}</Text>
      <Text style={styles.videoDescription}>
        Description: {item.description || "No description"}
        {"\n"}Type: {item.videoType || "Unknown"}
        {"\n"}Size: {(item.fileSize / 1024 / 1024).toFixed(2)} MB
        {"\n"}Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
      </Text>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => openVideo(item.url)}
        >
          <Ionicons name="eye" size={24} color="#007bff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteVideo(item)}
        >
          <Ionicons name="trash" size={24} color="#ff4444" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Loading materials and videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        renderItem={renderMaterialItem}
        keyExtractor={(item, index) => item.url || index.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No materials uploaded yet</Text>
        }
      />
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item, index) => item.url || index.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No videos uploaded yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  materialCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  materialDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f2ff",
    padding: 10,
    borderRadius: 5,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 5,
  },
  actionButtonText: {
    marginLeft: 5,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  videoCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  videoDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
});
