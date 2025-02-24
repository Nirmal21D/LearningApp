import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export default function SimilarTaggedVideos({ currentVideoId, tags, subjectId }) {
  const [similarVideos, setSimilarVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const db = getFirestore();

  useEffect(() => {
    const fetchSimilarVideos = async () => {
      if (!tags || tags.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const subjectsRef = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        const taggedVideos = [];

        // Process all subjects to find videos with similar tags
        subjectsSnapshot.forEach((subjectDoc) => {
          const subjectData = subjectDoc.data();
          const currentSubject = subjectData.id === subjectId;
          
          if (subjectData.videos) {
            for (const chapter in subjectData.videos) {
              const videosArray = subjectData.videos[chapter];
              
              videosArray.forEach(video => {
                // Skip the current video
                if (video.id === currentVideoId) return;
                
                // Check if this video has any matching tags
                if (video.learningStyleTags && video.learningStyleTags.length > 0) {
                  const matchingTags = video.learningStyleTags.filter(tag => 
                    tags.includes(tag)
                  );
                  
                  if (matchingTags.length > 0) {
                    taggedVideos.push({
                      id: video.id,
                      name: video.name,
                      thumbnailUrl: video.thumbnailUrl,
                      duration: video.duration,
                      matchingTagCount: matchingTags.length,
                      matchingTags,
                      subjectName: subjectData.name,
                      subjectColor: subjectData.color,
                      currentSubject,
                      chapterId: chapter,
                      url: video.url,
                    });
                  }
                }
              });
            }
          }
        });

        // Sort by number of matching tags (descending) and prioritize videos from the same subject
        taggedVideos.sort((a, b) => {
          if (a.currentSubject && !b.currentSubject) return -1;
          if (!a.currentSubject && b.currentSubject) return 1;
          return b.matchingTagCount - a.matchingTagCount;
        });

        // Limit to top 10 similar videos
        setSimilarVideos(taggedVideos.slice(0, 10));
      } catch (error) {
        console.error("Error fetching similar videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarVideos();
  }, [currentVideoId, tags, subjectId]);

  const navigateToVideo = (video) => {
    router.push({
      pathname: '/video/[videoId]',
      params: { 
        videoId: video.id,
        videoName: video.name,
        videoUrl: video.url
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Finding similar videos...</Text>
      </View>
    );
  }

  if (similarVideos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No similar videos found</Text>
      </View>
    );
  }

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.videoCard}
      onPress={() => navigateToVideo(item)}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnailUrl ? (
          <Image 
            source={{ uri: item.thumbnailUrl }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="videocam" size={30} color="#bbb" />
          </View>
        )}
        {item.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.name}</Text>
        
        <View style={[styles.subjectBadge, { backgroundColor: item.subjectColor || '#2196F3' }]}>
          <Text style={styles.subjectText}>{item.subjectName}</Text>
        </View>
        
        <View style={styles.tagsContainer}>
          {item.matchingTags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.matchingTags.length > 2 && (
            <Text style={styles.moreTagsText}>+{item.matchingTags.length - 2} more</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={similarVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  videoCard: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    height: 124,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    height: 40,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  subjectText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagChip: {
    backgroundColor: '#E8F5FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#0288D1',
    fontSize: 11,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
});