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
  StatusBar,
  ImageBackground,
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
    interpolate,
    withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Enhanced interactive card with glass effect
const GlassCard = ({ children, style, onPress }) => {
    const scale = useSharedValue(1);
    const elevation = useSharedValue(2);
    const opacity = useSharedValue(0.7);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: interpolate(elevation.value, [2, 8], [0.1, 0.2]),
        shadowRadius: elevation.value,
    }));

    return (
        <AnimatedPressable 
            style={[animatedStyle, style]}
            onPress={onPress}
            onPressIn={() => {
                scale.value = withSpring(0.98);
                elevation.value = withSpring(8);
                opacity.value = withTiming(0.85);
            }}
            onPressOut={() => {
                scale.value = withSpring(1);
                elevation.value = withSpring(2);
                opacity.value = withTiming(0.7);
            }}
        >
            <BlurView intensity={20} tint="light" style={styles.blurContainer}>
                <Animated.View style={[{ opacity }, styles.glassOverlay]} />
                {children}
            </BlurView>
        </AnimatedPressable>
    );
};

const MaterialCard = ({ material, onView, onDelete }) => (
  <GlassCard style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.titleContainer}>
        <Text style={styles.materialTitle}>{material.title}</Text>
        <View style={[styles.typeBadge, { 
          backgroundColor: material.type === 'pdf' ? 'rgba(255, 152, 0, 0.8)' : 'rgba(76, 175, 80, 0.8)' 
        }]}>
          <Text style={styles.typeText}>{material.type.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.description}>{material.description}</Text>
    </View>

    <View style={styles.cardFooter}>
      <View style={styles.metadataContainer}>
        <Text style={styles.metadata}>
          <Ionicons name="time-outline" size={16} color="rgba(51, 51, 51, 0.8)" /> {material.uploadDate}
        </Text>
        <Text style={styles.metadata}>
          <Ionicons name="document-outline" size={16} color="rgba(51, 51, 51, 0.8)" /> {material.size}
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
  </GlassCard>
);

export default function ViewMaterials() {
  const router = useRouter();
  const [materials, setMaterials] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials');

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
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=1000' }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <BlurView intensity={60} tint="light" style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading materials and videos...</Text>
        </BlurView>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=1000' }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Glassmorphic Header */}
        <BlurView intensity={60} tint="light" style={styles.header}>
          <View style={styles.headerLeft}>
            <GlassCard 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </GlassCard>
            <Text style={styles.headerTitle}>Learning Materials</Text>
          </View>
        </BlurView>

        {/* Tab Navigation */}
        <BlurView intensity={40} tint="light" style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'materials' && styles.activeTab]} 
            onPress={() => setActiveTab('materials')}
          >
            <Ionicons 
              name="document-text" 
              size={20} 
              color={activeTab === 'materials' ? "#2196F3" : "#666"} 
            />
            <Text style={[styles.tabText, activeTab === 'materials' && styles.activeTabText]}>
              Study Materials
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]} 
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons 
              name="videocam" 
              size={20} 
              color={activeTab === 'videos' ? "#2196F3" : "#666"} 
            />
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Video Materials
            </Text>
          </TouchableOpacity>
        </BlurView>

        {/* Content Container */}
        <View style={styles.listsContainer}>
          {activeTab === 'materials' ? (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item, index) => item.url || index.toString()}
              ListEmptyComponent={
                <BlurView intensity={40} tint="light" style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={50} color="#666" />
                  <Text style={styles.emptyText}>No study materials uploaded yet</Text>
                </BlurView>
              }
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={videos}
              renderItem={renderVideoItem}
              keyExtractor={(item, index) => item.url || index.toString()}
              ListEmptyComponent={
                <BlurView intensity={40} tint="light" style={styles.emptyContainer}>
                  <Ionicons name="videocam-outline" size={50} color="#666" />
                  <Text style={styles.emptyText}>No video materials uploaded yet</Text>
                </BlurView>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 12,
    flex: 1,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  listsContainer: {
    flex: 1,
    padding: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardHeader: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
    opacity: 0.8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 15,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  metadataContainer: {
    flexDirection: "column",
    gap: 8,
  },
  metadata: {
    fontSize: 13,
    color: "#333",
    opacity: 0.8,
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
    borderRadius: 12,
    gap: 6,
  },
  viewButton: {
    backgroundColor: "rgba(33, 150, 243, 0.9)",
  },
  deleteButton: {
    backgroundColor: "rgba(255, 82, 82, 0.9)",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    marginTop: 50,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});