import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from "react-native-webview";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import RecommendedVideos from '@/components/RecommendedVideos';
import SimilarTaggedVideos from  "../../components/VideoRelaatedRecommendation"
import { collection, getDocs } from 'firebase/firestore';


const { width } = Dimensions.get('window');

export default function VideoPlayer() {
  const params = useLocalSearchParams();
  const { videoId, videoName, videoUrl } = params; // Ensure videoUrl is correctly used
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        if (!videoId) {
          setError("Invalid video ID");
          return;
        }
  
        setLoading(true);
        const subjectsRef = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        let foundVideo = null;
        let foundSubject = null;
        let videoUrl = null;
  
        subjectsSnapshot.forEach((subjectDoc) => {
          const subjectData = subjectDoc.data();
  
          if (subjectData.videos) {
            for (const chapter in subjectData.videos) {
              const videosArray = subjectData.videos[chapter];
              const matchedVideo = videosArray.find(v => v.id === videoId);
              
              if (matchedVideo) {
                foundVideo = matchedVideo;
                foundSubject = { id: subjectDoc.id, ...subjectData };
                videoUrl = matchedVideo.url;
                return;
              }
            }
          }
        });
  
        if (!foundVideo || !foundSubject) {
          setError("Video not found in any subject");
          return;
        }
  
        setVideoData({
          id: videoId,
          ...foundVideo,
          subjectName: foundSubject.name,
          subjectColor: foundSubject.color,
          subjectId: foundSubject.id,
          url: videoUrl,
        });
  
        // Update view count inside the correct subject document
        if (auth.currentUser) {
            console.log(foundSubject.videos[foundVideo.chapterId]); // Debugging to check if we get the correct array
          
            const subjectDocRef = doc(db, "subjects", foundSubject.id);
          
            // Get the correct chapter's video array
            const chapterVideos = foundSubject.videos[foundVideo.chapterId] || [];
          
            // Update the view count by matching the video by name instead of ID
            const updatedVideos = chapterVideos.map(video =>
              video.name === foundVideo.name ? { ...video, viewCount: (video.viewCount || 0) + 1 } : video
            );
          
            // Update Firestore with the modified array
            await updateDoc(subjectDocRef, {
              [`videos.${foundVideo.chapterId}`]: updatedVideos,
            });
          }
          
          
      } catch (error) {
        console.error("Error fetching video:", error);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };
  
    fetchVideoData();
  }, [videoId]);
  

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
          {videoName || "Video Player"}
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.videoContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading video...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <WebView
                source={{ uri: videoData?.url || videoUrl }} // Ensure the correct URL is used
                style={styles.video}
                originWhitelist={["*"]}
            />
          )}
        </View>
        
        {videoData && (
          <View style={styles.videoInfoContainer}>
            <Text style={styles.videoTitle}>{videoData.name}</Text>
            
            {videoData.subjectName && (
              <View style={[styles.subjectBadge, { backgroundColor: videoData.subjectColor || '#2196F3' }]}>
                <Text style={styles.subjectText}>{videoData.subjectName}</Text>
              </View>
            )}
            
            <View style={styles.metadataRow}>
              {videoData.difficulty && (
                <View style={styles.metadataItem}>
                  <Ionicons name="fitness-outline" size={16} color="#666" style={styles.metadataIcon} />
                  <Text style={styles.metadataText}>{videoData.difficulty}</Text>
                </View>
              )}
              
              {videoData.duration && (
                <View style={styles.metadataItem}>
                  <Ionicons name="time-outline" size={16} color="#666" style={styles.metadataIcon} />
                  <Text style={styles.metadataText}>{videoData.duration}</Text>
                </View>
              )}
              
              {videoData.viewCount !== undefined && (
                <View style={styles.metadataItem}>
                  <Ionicons name="eye-outline" size={16} color="#666" style={styles.metadataIcon} />
                  <Text style={styles.metadataText}>{videoData.viewCount} views</Text>
                </View>
              )}
            </View>
            
            {videoData.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{videoData.description}</Text>
              </View>
            )}
            
            {videoData.learningStyleTags && videoData.learningStyleTags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsTitle}>Learning Styles</Text>
                <View style={styles.tagsList}>
                  {videoData.learningStyleTags.map((tag, index) => (
                    <View key={index} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        
        {videoData && videoData.learningStyleTags && videoData.learningStyleTags.length > 0 && (
          <View style={styles.similarVideosSection}>
            <Text style={styles.sectionTitle}>Videos with Similar Learning Styles</Text>
            <SimilarTaggedVideos 
              currentVideoId={videoData.id}
              tags={videoData.learningStyleTags}
              subjectId={videoData.subjectId}
            />
          </View>
        )}
        
        <View style={styles.recommendedSection}>
          <Text style={styles.recommendedTitle}>More Videos</Text>
          <RecommendedVideos subjectId={videoData?.subjectId} />
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
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
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
  videoInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  subjectText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    marginBottom: 8,
  },
  metadataIcon: {
    marginRight: 6,
  },
  metadataText: {
    color: '#666',
    fontSize: 14,
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  tagsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E8F5FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#0288D1',
    fontSize: 13,
    fontWeight: '500',
  },
  similarVideosSection: {
    marginTop: 4,
    paddingTop: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
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