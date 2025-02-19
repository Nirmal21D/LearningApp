import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WebView } from "react-native-webview";
import { Video, ResizeMode } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";

// Video Viewer Component (similar to MaterialViewer)
const VideoViewer = ({ video, onClose }) => {
  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>
          {video.title || "Video"}
        </Text>
      </View>
      <WebView
        source={{ uri: video.url }}
        style={styles.webview}
        originWhitelist={["*"]}
      />
    </View>
  );
};
const openMaterial = async (url) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error("Error opening material:", error);
    Alert.alert("Error", "Unable to open material");
  }
};

const downloadVideo = async (video) => {
    try {
      // Validate URL
      if (!video.url || typeof video.url !== 'string') {
        throw new Error('Invalid download URL');
      }

      // Prepare download directory
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      
      await FileSystem.makeDirectoryAsync(downloadDir, { 
        intermediates: true 
      }).catch(dirError => {
        console.warn('Directory creation warning:', dirError);
      });

      // Sanitize filename
      const sanitizeFileName = (filename) => {
        return filename
          .replace(/[^a-z0-9.]/gi, '_')
          .replace(/__+/g, '_')
          .toLowerCase();
      };

      // Extract clean filename
      const extractFileName = (video) => {
        try {
          let fileName = video.title || 'video';
          
          // Add extension
          const urlExtension = video.url.split('.').pop().split(/[#?]/)[0];
          const extension = ['mp4', 'avi', 'mov'].includes(urlExtension) 
            ? urlExtension 
            : 'mp4';

          fileName = `${fileName}_${Date.now()}.${extension}`;
          return sanitizeFileName(fileName);
        } catch (error) {
          console.warn('Filename extraction error:', error);
          return `video_${Date.now()}.mp4`;
        }
      };

      const fileName = extractFileName(video);
      const fileUri = `${downloadDir}${fileName}`;

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        video.url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download Progress: ${(progress * 100).toFixed(2)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();

      // Platform-specific sharing/notification
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(
          "Download Complete", 
          `Video saved to ${uri}`, 
          [{ text: "OK" }]
        );
      }

    } catch (error) {
      console.error("Detailed Video Download Error:", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });

      // Specific error handling
      let errorMessage = 'Video download failed';
      Alert.alert(
        "Download Error", 
        errorMessage, 
        [{ text: "OK" }]
      );
    }
  };
const MaterialViewer = ({ material, onClose }) => {
  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>
          {material.title || "Study Material"}
        </Text>
      </View>
      <WebView
        source={{ uri: material }}
        style={styles.webview}
        originWhitelist={["*"]}
      />
    </View>
  );
};

export default function ChapterDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState({
    videos: [],
    materials: [],
    tests: [],
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  const subjectId = params.subjectId ? String(params.subjectId) : null;
  const chapterId = params.chapterName ? String(params.chapterName) : null;
  const subjectName = params.subjectName || "Unknown Subject";
  const chapterName = params.chapterName || "Unknown Chapter";

  // Download File Function
  const downloadFile = async (url) => {
    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid download URL');
      }
  
      // Check network connectivity (optional, requires additional import)
      // const netInfo = await NetInfo.fetch();
      // if (!netInfo.isConnected) {
      //   throw new Error('No internet connection');
      // }
  
      // Prepare download directory
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      
      // Ensure directory exists with full permissions
      await FileSystem.makeDirectoryAsync(downloadDir, { 
        intermediates: true 
      }).catch(dirError => {
        console.warn('Directory creation warning:', dirError);
      });
  
      // Sanitize filename
      const sanitizeFileName = (filename) => {
        return filename
          .replace(/[^a-z0-9.]/gi, '_')
          .replace(/__+/g, '_')
          .toLowerCase();
      };
  
      // Extract clean filename
      const extractFileName = (urlString) => {
        try {
          const parsedUrl = new URL(urlString);
          let fileName = parsedUrl.pathname.split('/').pop();
          
          // Fallback filename if extraction fails
          if (!fileName || fileName === '') {
            fileName = `download_${Date.now()}`;
          }
  
          // Add extension if missing
          if (!fileName.includes('.')) {
            fileName += '.pdf'; // Default to PDF, adjust as needed
          }
  
          return sanitizeFileName(fileName);
        } catch (error) {
          console.warn('Filename extraction error:', error);
          return `download_${Date.now()}.pdf`;
        }
      };
  
      const fileName = extractFileName(url);
      const fileUri = `${downloadDir}${fileName}`;
  
      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download Progress: ${(progress * 100).toFixed(2)}%`);
        }
      );
  
      const { uri } = await downloadResumable.downloadAsync();
  
      // Platform-specific sharing/notification
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        // For Android, show a download complete alert
        Alert.alert(
          "Download Complete", 
          `File saved to ${uri}`, 
          [{ text: "OK" }]
        );
      }
  
      console.log("Download successful:", {
        originalUrl: url,
        savedUri: uri,
        fileName: fileName
      });
  
    } catch (error) {
      // Comprehensive error logging
      console.error("Detailed Download Error:", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
  
      // Specific error handling
      let errorMessage = 'Download failed';
      if (error.message.includes('network')) {
        errorMessage = 'No internet connection';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Storage permission denied';
      } else if (error.message.includes('disk')) {
        errorMessage = 'Not enough storage space';
      }
  
      // User-friendly error alert
      Alert.alert(
        "Download Error", 
        errorMessage, 
        [{ text: "OK" }]
      );
    }
  };

  useEffect(() => {
    // Add additional parameter validation
    const validateParameters = () => {
      if (!subjectId) {
        console.error("Missing subjectId");
        // Optionally, navigate back or show an error
        return false;
      }
      if (!chapterId) {
        console.error("Missing chapterId");
        // Optionally, navigate back or show an error
        return false;
      }
      return true;
    };

    if (validateParameters()) {
      fetchChapterData();
    } else {
      setLoading(false);
    }
  }, [subjectId, chapterId]);

  useEffect(() => {
    if (subjectId && chapterId) {
      fetchChapterData();
      fetchChapterTests();  // Add this line to fetch tests
    }
  }, [subjectId, chapterId]);

  useEffect(() => {
    if (selectedVideo) {
      fetchRelatedVideos(selectedVideo);
    }
  }, [selectedVideo]);
  
  const fetchChapterTests = async () => {
    try {
      const testsRef = collection(db, "tests");
      const q = query(
        testsRef, 
        where("subjectId", "==", subjectId)
      );
  
      const querySnapshot = await getDocs(q);
      const tests = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(tests);
  
      setChapterData(prevData => ({
        ...prevData,
        tests: tests
      }));
    } catch (error) {
      console.error("Error fetching chapter tests:", error);
      Alert.alert("Error", "Unable to fetch tests");
    }
  };

  const fetchChapterData = async () => {
    setLoading(true);
    try {
      if (!subjectId || !chapterId) {
        throw new Error("Invalid subjectId or chapterId");
      }
  
      const subjectRef = doc(db, "subjects", subjectId);
      const subjectSnap = await getDoc(subjectRef);
  
      if (!subjectSnap.exists()) {
        throw new Error("Subject not found");
      }
  
      const subjectData = subjectSnap.data();
      
      console.log("Debug - Received Chapter ID:", chapterId);
      console.log("Debug - Available Chapters:", subjectData.chapters);
      console.log("Debug - Subject Data:", subjectData);
  
      // Find the matching chapter key for videos
      const matchingChapterKey = 
        subjectData.chapters.find(chapter => 
          chapter.toLowerCase() === chapterId.toLowerCase()
        ) 
        ? `CH${subjectData.chapters.indexOf(chapterId) + 1}_${subjectData.name.replace(/\s+/g, '')}`
        : chapterId;
  
      console.log("Debug - Matched Chapter Key:", matchingChapterKey);
  
      // Extract videos for the specific chapter
      const chapterVideos = subjectData.videos && subjectData.videos[matchingChapterKey] 
        ? subjectData.videos[matchingChapterKey] 
        : [];
        const chapterMaterials = subjectData.materials && subjectData.materials[matchingChapterKey] 
        ? subjectData.materials[matchingChapterKey] 
        : [];
  
      console.log("Debug - Extracted Videos:", chapterVideos);
        
      // Combine data
      
      setChapterData({
        ...subjectData,
        videos: chapterVideos,
        materials: chapterMaterials,
        
      });
  
    } catch (error) {
      console.error("Error fetching chapter data:", error);
      Alert.alert("Error", `Unable to fetch chapter data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMaterial = async (material) => {
    try {
      const { uri } = await FileSystem.downloadAsync(
        material.url, 
        FileSystem.documentDirectory + material.title
      );
      
      setSelectedMaterial({ ...material, localUri: uri });
      setMaterialModalVisible(true);
    } catch (error) {
      console.error('View material error:', error);
      Alert.alert('Error', 'Unable to view the material');
    }
  };

  // Material Rendering
  const renderMaterials = () => {
    // Ensure chapterData and materials exist
    if (!chapterData || !chapterData.materials || chapterData.materials.length === 0) {
      return (
        <View style={styles.noMaterialContainer}>
          <Text style={styles.noMaterialText}>
            No materials available for this chapter
          </Text>
        </View>
      );
    }
  
    return (
      <View>
        <Text style={styles.sectionTitle}>Study Materials</Text>
        {chapterData.materials.map((material) => (
          <View key={material.id || Math.random().toString()} style={styles.materialCard}>
            <View style={styles.materialIconContainer}>
              <Ionicons
                name={
                  material.fileType?.includes("pdf")
                    ? "document-text"
                    : material.fileType?.includes("document")
                    ? "document"
                    : "attach"
                }
                size={24}
                color="#2196F3"
              />
            </View>
            <View style={styles.materialInfo}>
              <Text style={styles.materialTitle}>
                {material.name || "Unnamed Material"}
              </Text>
              <Text style={styles.materialType}>
                {material.fileType 
                  ? `${material.materialType?.toUpperCase() || 'MATERIAL'} | ${material.fileType.split("/").pop().toUpperCase()}`
                  : 'Unknown Type'}
              </Text>
            </View>
            <View style={styles.materialActions}>
              <TouchableOpacity
                onPress={() => {
                  if (material.url) {
                    setSelectedMaterial(material);
                  } else {
                    Alert.alert("Error", "No preview available");
                  }
                }}
                style={styles.actionButton}
              >
                <Ionicons name="eye-outline" size={24} color="#2196F3"
                onPress={() => {
                  if (material.url) {
                    openMaterial(material.url);
                  } else {
                    Alert.alert("Error", "No preview available");
                  }
                }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (material.url) {
                    downloadFile(material.url);
                  } else {
                    Alert.alert("Error", "Unable to download");
                  }
                }}
                style={styles.actionButton}
              >
                <Ionicons name="download-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const fetchRelatedVideos = async (currentVideo) => {
    if (!currentVideo || !currentVideo.tags || currentVideo.tags.length === 0)
      return;

    try {
      const videosRef = collection(db, "videos");
      const q = query(
        videosRef,
        where("tags", "array-contains-any", currentVideo.tags),
        where("id", "!=", currentVideo.id)
      );

      const querySnapshot = await getDocs(q);
      const videos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRelatedVideos(videos);
    } catch (error) {
      console.error("Error fetching related videos:", error);
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

  const handleStartTest = (testId) => {
    router.push({
      pathname: "/test",
      params: {
        subjectId,
        chapterId,
        testId,
      },
    });
  };

  const renderVideos = () => {
    // Check if chapter data and videos exist and are loaded
    if (!chapterData || !chapterData.videos) {
      return (
        <View style={styles.noMaterialContainer}>
          <Text style={styles.noMaterialText}>
            Loading videos...
          </Text>
        </View>
      );
    }
  
    // If videos array is empty
    if (chapterData.videos.length === 0) {
      return (
        <View style={styles.noMaterialContainer}>
          <Text style={styles.noMaterialText}>
            No videos available for this chapter
          </Text>
        </View>
      );
    }
  
    return (
      <View>
        {/* Currently Playing Video Section */}
        {selectedVideo && (
          <View style={styles.videoPlayerContainer}>
            <WebView
              source={{ uri: selectedVideo.url }}
              style={styles.videoPlayer}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
            />
            <Text style={styles.videoTitle}>{selectedVideo.title || selectedVideo.name}</Text>
            {selectedVideo.description && (
              <Text style={styles.videoDescription}>{selectedVideo.description}</Text>
            )}
          </View>
        )}
  
        {/* All Videos List */}
        <Text style={styles.sectionTitle}>All Videos</Text>
        {chapterData.videos.map((video) => (
          <View key={video.id || Math.random().toString()} style={styles.materialCard}>
            <View style={styles.materialIconContainer}>
              <Ionicons name="play-circle" size={32} color="#2196F3" />
            </View>
            
            <View style={styles.materialInfo}>
              <Text style={styles.materialTitle}>
                {video.name || video.title || "Untitled Video"}
              </Text>
              
              <Text style={styles.materialType}>
                {video.duration || video.fileSize 
                  ? `${video.duration || ''} ${video.fileSize ? `| ${(video.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}`
                  : 'Size/duration not available'
                }
              </Text>
              
              {video.description && (
                <Text style={styles.videoDescription} numberOfLines={2}>
                  {video.description}
                </Text>
              )}
  
              {video.tags && video.tags.length > 0 && (
                <View style={styles.videoTags}>
                  {video.tags.map((tag) => (
                    <Text key={tag} style={styles.videoTag}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>
  
            <View style={styles.materialActions}>
              <TouchableOpacity
                onPress={() => {
                  if (video.url) {
                    setSelectedVideo(video);
                  } else {
                    Alert.alert("Error", "Video URL not available");
                  }
                }}
                style={styles.actionButton}
              >
                <Ionicons name="eye-outline" size={24} color="#2196F3" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  if (video.url) {
                    downloadVideo(video);
                  } else {
                    Alert.alert("Error", "Video URL not available");
                  }
                }}
                style={styles.actionButton}
              >
                <Ionicons name="download-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
  
        {/* Related Videos Section */}
        {relatedVideos.length > 0 && (
          <View style={styles.relatedVideosContainer}>
            <Text style={styles.sectionTitle}>Related Videos</Text>
            {relatedVideos.map((video) => (
              <View key={video.id || Math.random().toString()} style={styles.materialCard}>
                <View style={styles.materialIconContainer}>
                  <Ionicons name="play-circle" size={32} color="#2196F3" />
                </View>
                
                <View style={styles.materialInfo}>
                  <Text style={styles.materialTitle}>
                    {video.name || video.title || "Untitled Video"}
                  </Text>
                  
                  <Text style={styles.materialType}>
                    {video.duration || video.fileSize 
                      ? `${video.duration || ''} ${video.fileSize ? `| ${(video.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}`
                      : 'Size/duration not available'
                    }
                  </Text>
  
                  {video.tags && video.tags.length > 0 && (
                    <View style={styles.videoTags}>
                      {video.tags.map((tag) => (
                        <Text key={tag} style={styles.videoTag}>
                          #{tag}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
  
                <View style={styles.materialActions}>
                  <TouchableOpacity
                    onPress={() => {
                      if (video.url) {
                        setSelectedVideo(video);
                      } else {
                        Alert.alert("Error", "Video URL not available");
                      }
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="eye-outline" size={24} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subjectName}>{subjectName}</Text>
        <Text style={styles.chapterName}>{chapterName}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "videos" && styles.activeTab]}
          onPress={() => setActiveTab("videos")}
        >
          <Ionicons
            name="play-circle-outline"
            size={24}
            color={activeTab === "videos" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "videos" && styles.activeTabText,
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "materials" && styles.activeTab]}
          onPress={() => setActiveTab("materials")}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={activeTab === "materials" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "materials" && styles.activeTabText,
            ]}
          >
            Materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "tests" && styles.activeTab]}
          onPress={() => setActiveTab("tests")}
        >
          <Ionicons
            name="clipboard-outline"
            size={24}
            color={activeTab === "tests" ? "#2196F3" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "tests" && styles.activeTabText,
            ]}
          >
            Tests
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* {activeTab === "videos" && (
          <View>
            {selectedVideo && (
              <View style={styles.videoPlayerContainer}>
                {renderVideoPlayer()}
                <Text style={styles.videoTitle}>{selectedVideo.title}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>All Videos</Text>
            {chapterData.videos.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => setSelectedVideo(video)}
              >
                <View style={styles.videoThumbnail}>
                  <Ionicons name="play-circle" size={32} color="#fff" />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoCardTitle}>{video.title}</Text>
                  <Text style={styles.videoDuration}>{video.duration}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {relatedVideos.length > 0 && (
              <View style={styles.relatedVideosContainer}>
                <Text style={styles.sectionTitle}>Related Videos</Text>
                {relatedVideos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => setSelectedVideo(video)}
                  >
                    <View style={styles.videoThumbnail}>
                      <Ionicons name="play-circle" size={32} color="#fff" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoCardTitle}>{video.title}</Text>
                      <Text style={styles.videoDuration}>{video.duration}</Text>
                      <View style={styles.videoTags}>
                        {video.tags?.map((tag) => (
                          <Text key={tag} style={styles.videoTag}>
                            #{tag}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )} */}
            {activeTab === "videos" && renderVideos()}
          {/* </View> */}
        {/* )} */}

        {activeTab === "materials" && renderMaterials()}

        {activeTab === "tests" && (
          <View>
            <Text style={styles.sectionTitle}>Chapter Tests</Text>
            {chapterData.tests.map((test) => (
              <TouchableOpacity
                key={test.id}
                style={styles.testCard}
                onPress={() => handleStartTest(test.id)}
              >
                <View style={styles.testInfo}>
                  <Text style={styles.testTitle}>{test.title}</Text>
                  <Text style={styles.testDescription}>{test.description}</Text>
                  <View style={styles.testStats}>
                    <Text style={styles.testStat}>
                      {test.questions?.length} Questions
                    </Text>
                    <Text style={styles.testStat}>{test.duration} mins</Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#2196F3" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#2196F3",
    padding: 20,
    paddingTop: 40,
  },
  subjectName: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 5,
  },
  chapterName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2196F3",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#2196F3",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  videoPlayerContainer: {
    marginBottom: 20,
  },
  videoPlayer: {
    width: "100%",
    height: 200,
    backgroundColor: "#000",
    borderRadius: 10,
    marginBottom: 10,
  },
  videoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    width: 120,
    height: 80,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: {
    flex: 1,
    padding: 15,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  videoCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  videoDuration: {
    fontSize: 14,
    color: "#666",
  },
  materialCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialInfo: {
    flex: 1,
    marginLeft: 15,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  materialType: {
    fontSize: 14,
    color: "#666",
  },
  testCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testInfo: {
    flex: 1,
    marginRight: 15,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  testDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  testStats: {
    flexDirection: "row",
    gap: 15,
  },
  testStat: {
    fontSize: 12,
    color: "#666",
  },
  relatedVideosContainer: {
    marginTop: 20,
  },
  videoTags: {
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
  },
  noMaterialContainer: {
    backgroundColor: "#f0f0f0",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  noMaterialText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  videoTag: {
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    marginLeft: 15,
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  materialCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialIconContainer: {
    marginRight: 15,
  },
  materialInfo: {
    flex: 1,
  },
  materialActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginLeft: 10,
  },
});
