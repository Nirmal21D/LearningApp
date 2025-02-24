import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const router = useRouter();

  const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const db = getFirestore();
        const subjectsCollection = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsCollection);
        const subjectsList = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsList);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchVideos = async (selectedLearningStyle, selectedMaterialType) => {
        try {
          const subjectsSnapshot = await getDocs(collection(db, "subjects"));
          let videos = [];
      
          for (const subjectDoc of subjectsSnapshot.docs) {
            const subjectData = subjectDoc.data();
            const chaptersSnapshot = await getDocs(collection(subjectDoc.ref, "chapters"));
      
            for (const chapterDoc of chaptersSnapshot.docs) {
              const videosSnapshot = await getDocs(collection(chapterDoc.ref, "videos"));
      
              videosSnapshot.forEach((videoDoc) => {
                const videoData = videoDoc.data();
      
                // Ensure the video matches the filters
                const matchesLearningStyle = selectedLearningStyle
                  ? videoData.learningStyleTags?.includes(selectedLearningStyle)
                  : true;
                const matchesMaterialType = selectedMaterialType
                  ? videoData.materialType === selectedMaterialType
                  : true;
      
                if (matchesLearningStyle && matchesMaterialType) {
                  videos.push({
                    id: videoDoc.id,
                    title: videoData.title || "Untitled",
                    url: videoData.url || "",
                    learningStyleTags: videoData.learningStyleTags || [],
                    materialType: videoData.materialType || "",
                    uploadedAt: videoData.uploadedAt || null,
                    subject: {
                      id: subjectDoc.id,
                      name: subjectData.name || "Unknown Subject",
                      color: subjectData.color || "#000000",
                    },
                  });
                }
              });
            }
          }
      
          return videos;
        } catch (error) {
          console.error("Error fetching videos:", error);
          return [];
        }
      };

    fetchVideos();
  }, []);

  useEffect(() => {
    // Filter videos based on search text, selected subject, and difficulty
    let result = [...videos];
    
    if (searchText) {
      result = result.filter(video => 
        video.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (selectedSubject) {
      result = result.filter(video => video.subjectId === selectedSubject);
    }
    
    if (selectedDifficulty) {
      result = result.filter(video => video.difficulty === selectedDifficulty);
    }
    
    setFilteredVideos(result);
  }, [searchText, selectedSubject, selectedDifficulty, videos]);

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

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handleVideoPress(item)}
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
            <Ionicons name="videocam" size={40} color="#999" />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration || "N/A"}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.name || "Untitled Video"}
        </Text>
        {item.subjectName && (
          <View style={[styles.subjectBadge, { backgroundColor: item.subjectColor || '#2196F3' }]}>
            <Text style={styles.subjectText}>{item.subjectName}</Text>
          </View>
        )}
        <View style={styles.videoMeta}>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>
              {item.difficulty || "Beginner"}
            </Text>
          </View>
          {item.learningStyleTags && item.learningStyleTags.length > 0 && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>{item.learningStyleTags[0]}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Library</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedSubject && styles.activeFilterChip
            ]}
            onPress={() => setSelectedSubject(null)}
          >
            <Text style={[
              styles.filterChipText,
              !selectedSubject && styles.activeFilterChipText
            ]}>All</Text>
          </TouchableOpacity>
          
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject.id}
              style={[
                styles.filterChip,
                selectedSubject === subject.id && styles.activeFilterChip,
                selectedSubject === subject.id && { backgroundColor: subject.color + '30' }
              ]}
              onPress={() => setSelectedSubject(
                selectedSubject === subject.id ? null : subject.id
              )}
            >
              <Text style={[
                styles.filterChipText,
                selectedSubject === subject.id && styles.activeFilterChipText,
                selectedSubject === subject.id && { color: subject.color }
              ]}>{subject.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {difficulties.map(difficulty => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.filterChip,
                selectedDifficulty === difficulty && styles.activeFilterChip
              ]}
              onPress={() => setSelectedDifficulty(
                selectedDifficulty === difficulty ? null : difficulty
              )}
            >
              <Text style={[
                styles.filterChipText,
                selectedDifficulty === difficulty && styles.activeFilterChipText
              ]}>{difficulty}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      ) : filteredVideos.length > 0 ? (
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.videoRow}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>Try changing your search or filters</Text>
        </View>
      )}
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
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersScrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 5,
  },
  activeFilterChip: {
    backgroundColor: '#2196F330',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  listContent: {
    padding: 10,
  },
  videoRow: {
    justifyContent: 'space-between',
  },
  videoCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  subjectText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    backgroundColor: '#EBF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  difficultyText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '500',
  },
  tagContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 5,
    color: '#999',
    fontSize: 14,
  },
});