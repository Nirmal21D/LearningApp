import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import LoadingScreen from './LoadingScreen';

const RecommendedVideos = ({ subjectId = null }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchRecommendedVideos = async () => {
        try {
          setLoading(true);
          const user = auth.currentUser;
          if (!user) return;
      
          // Fetch user learning profile
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const userTags = userDocSnap.exists() ? userDocSnap.data().learningProfile?.tags || [] : [];
      
          if (userTags.length === 0) {
            setLoading(false);
            return;
          }
      
          // Fetch all subjects (since chapters & videos are nested inside)
          const subjectsSnapshot = await getDocs(collection(db, "subjects"));
          let allVideos = [];
      
          subjectsSnapshot.forEach((subjectDoc) => {
            const subjectData = subjectDoc.data();
          //  console.log(subjectData);
      
            if (subjectData.chapters && subjectData.videos) {
              Object.values(subjectData.videos).forEach((chapter) => {
                
                if (chapter) {
                  Object.values(chapter).forEach((video) => {
                    console.log(video);
                    if (video.learningStyleTags) {
                      // Find matching tags
                      const matchingTags = video.learningStyleTags.filter(tag => userTags.includes(tag));
      
                      // Ensure at least one tag matches before recommending
                      if (matchingTags.length > 0) {
                        const matchPercentage = Math.round((matchingTags.length / userTags.length) * 100);
      
                        allVideos.push({
                          id: video.id,
                          ...video,
                          matchPercentage: matchPercentage > 0 ? matchPercentage : 1, // Ensure at least 1%
                        });
                      }
                    }
                  });
                }
              });
            }
          });
      
          // Sort videos by match percentage (higher matches first)
          allVideos.sort((a, b) => b.matchPercentage - a.matchPercentage);
      console.log(allVideos)
          setVideos(allVideos);
        } catch (error) {
         /*  console.error("Error fetching recommended videos:", error); */
        } finally {
          setLoading(false);
        }
      };
      

    fetchRecommendedVideos();
  }, [subjectId]);

  const handleVideoPress = (video) => {
    router.push({
      pathname: `/video/${video.id}`,
      params: {
        videoId: video.id,
        videoName: video.name || "Video",
        videoUrl: video.url
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingScreen/>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off-outline" size={32} color="#999" />
        <Text style={styles.emptyText}>No videos available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.videoCard} onPress={() => handleVideoPress(item)}>
            <View style={styles.thumbnailContainer}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <Ionicons name="videocam" size={30} color="#999" />
                </View>
              )}
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>{item.name || "Untitled Video"}</Text>
              <Text style={styles.videoSubject}>{item.subjectName || ""}</Text>
              <View style={styles.videoMeta}>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>{item.matchPercentage}% Match</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  listContent: { paddingHorizontal: 15, paddingVertical: 5 },
  videoCard: {
    width: 250,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  thumbnailContainer: { height: 140, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: { padding: 12 },
  videoTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  videoSubject: { fontSize: 13, color: '#666', marginBottom: 8 },
  videoMeta: { flexDirection: 'row', alignItems: 'center' },
  matchBadge: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchText: {
    color: '#155724',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, marginHorizontal: 20 },
  emptyText: { marginTop: 8, color: '#999', fontSize: 14 },
});

export default RecommendedVideos;
