import React, { useState, useEffect,useRef  } from "react";
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
import { auth } from '@/lib/firebase';
import { updateVideoProgress, getVideoProgress, getSubjectVideoProgress } from '@/app/api/progress';


// Video Viewer Component
const VideoViewer = ({ video, onProgress, onClose }) => {
  const [status, setStatus] = useState({});
  const videoRef = useRef(null);
  
  // Handle video URLs that might be direct or indirect
  const getVideoSource = () => {
    if (!video || !video.url) return null;
    
    // Check if it's a direct video URL that should be handled by the Video component
    if (video.url.match(/\.(mp4|webm|mov)$/i) || 
        video.url.includes('firebasestorage')) {
      return { uri: video.url };
    }
    
    // For URLs that might be streaming or embedded players, use WebView
    return null;
  };

  const videoSource = getVideoSource();
  
  // Track video progress for the Video component
  const handlePlaybackStatusUpdate = (status) => {
    if (status.isLoaded && status.durationMillis > 0) {
      const progress = status.positionMillis / status.durationMillis;
      onProgress?.(progress);
    }
  };
  
  // HTML for WebView-based player (used for non-direct video URLs)
  const generateVideoHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
          }
          .video-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          video {
            max-width: 100%;
            max-height: 100%;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <video
            id="videoPlayer"
            controls
            autoplay
            playsinline
            webkit-playsinline
            src="${video.url}"
          ></video>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const video = document.getElementById('videoPlayer');
            
            video.addEventListener('timeupdate', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'progress',
                currentTime: video.currentTime,
                duration: video.duration
              }));
            });
            
            video.addEventListener('ended', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'progress',
                currentTime: video.duration,
                duration: video.duration
              }));
            });
            
            video.addEventListener('error', function(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Video playback error: ' + (e.message || 'Unknown error')
              }));
            });
            
            // Force video to start
            video.play().catch(err => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Failed to autoplay: ' + err.message
              }));
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.videoPlayerContainer}>
      <View style={styles.videoPlayerHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.videoTitle} numberOfLines={1}>
          {video?.name || video?.title || "Video"}
        </Text>
      </View>
      
      {videoSource ? (
        // Use the Expo Video component for direct video files
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.videoPlayer}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(error) => {
            console.error("Video playback error:", error);
            Alert.alert("Error", "Could not play video. Trying alternative player...");
            // Fall back to WebView player if direct video fails
            setDirectVideoFailed(true);
          }}
        />
      ) : (
        // Use WebView for other video types or as fallback
        <WebView
          source={{
            html: generateVideoHtml(),
            baseUrl: '',
          }}
          style={styles.videoPlayer}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'progress' && data.duration > 0) {
                onProgress?.(data.currentTime / data.duration);
              } else if (data.type === 'error') {
                console.error('Video playback error:', data.message);
                Alert.alert("Playback Error", "There was an error playing this video");
              }
            } catch (error) {
              console.error('Error handling video message:', error);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          )}
        />
      )}
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
  const [videoProgress, setVideoProgress] = useState({});
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [localVideoProgress, setLocalVideoProgress] = useState({});

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
        console.log(subjectData.videos);
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
    if (!currentVideo || !currentVideo.learningStyleTags || currentVideo.learningStyleTags.length === 0)
      return;
  
    try {
      const subjectsRef = collection(db, "subjects");
      const querySnapshot = await getDocs(subjectsRef);
      
      let relatedVideos = [];
  
      querySnapshot.forEach((doc) => {
        const subjectData = doc.data();
        if (subjectData.chapters) {
          Object.values(subjectData.chapters).forEach((chapter) => {
            if (chapter.videos) {
              Object.values(chapter.videos).forEach((video) => {
                if (
                  video.id !== currentVideo.id &&
                  video.learningStyleTags.some(tag => currentVideo.learningStyleTags.includes(tag))
                ) {
                  relatedVideos.push({ id: video.id, ...video });
                }
              });
            }
          });
        }
      });
  
      setRelatedVideos(relatedVideos);
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

  const loadVideoProgress = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !subjectId) return;

      const progress = await getSubjectVideoProgress(userId, subjectId);
      const progressMap = {};
      progress.forEach(p => {
        progressMap[p.videoId] = p;
      });
      setVideoProgress(progressMap);
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  };

  const handleVideoProgress = async (video, progress) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('No user ID found');
        return;
      }

      // Ensure progress is a valid number between 0 and 1
      const validProgress = Math.min(Math.max(progress || 0, 0), 1);
      const isCompleted = validProgress >= 0.9;
      
      // Update local state first
      const updatedProgress = {
        ...localVideoProgress,
        [video.id]: {
          videoId: video.id,
          progress: validProgress,
          completed: isCompleted,
          lastWatched: new Date(),
        }
      };
      setLocalVideoProgress(updatedProgress);

      // Only update database if video is completed
      if (isCompleted && (!videoProgress[video.id]?.completed)) {
        console.log('Video completed, updating database');
        const videoData = {
          ...video,
          subjectId: subjectId,
          chapterId: chapterId
        };
        await updateVideoProgress(userId, videoData, validProgress);
        await loadVideoProgress(); // Reload progress after update
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  // Add cleanup effect to save progress when leaving page
  useEffect(() => {
    return async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        // Save all pending progress updates
        for (const [videoId, progress] of Object.entries(localVideoProgress)) {
          // Only update if progress has changed from what's in the database
          const dbProgress = videoProgress[videoId];
          if (!dbProgress || 
              Math.abs(dbProgress.progress - progress.progress) > 0.1 || 
              dbProgress.completed !== progress.completed) {
            
            const video = chapterData.videos.find(v => v.id === videoId);
            if (video) {
              const videoData = {
                ...video,
                subjectId: subjectId,
                chapterId: chapterId
              };
              await updateVideoProgress(userId, videoData, progress.progress);
            }
          }
        }
      } catch (error) {
        console.error('Error saving video progress:', error);
      }
    };
  }, [localVideoProgress, videoProgress, chapterData.videos]);

  const handleVideoSelect = async (video) => {
    try {
      const videoUrl = getVideoUrl(video);
      if (!videoUrl) {
        Alert.alert("Error", "Video URL not available");
        return;
      }

      setSelectedVideo({
        ...video,
        url: videoUrl
      });
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert("Error", "Unable to play video");
    }
  };

  const getVideoUrl = (video) => {
    if (!video?.url) return null;
    
    // Handle different video URL formats
    const url = video.url.trim();
    
    // If it's already a direct video URL or streaming URL
    if (url.match(/\.(mp4|webm|ogg)$/i) || 
        url.includes('streaming') || 
        url.includes('manifest')) {
      return url;
    }
    
    // If it's a Firebase storage URL, ensure it has proper access
    if (url.includes('firebase') || url.includes('googleapis')) {
      return `${url}?alt=media`;
    }
    
    return url;
  };

  const renderVideos = () => {
    if (!chapterData || !chapterData.videos || chapterData.videos.length === 0) {
      return (
        <View style={styles.noMaterialContainer}>
          <Text style={styles.noMaterialText}>
            {!chapterData ? 'Loading videos...' : 'No videos available for this chapter'}
          </Text>
        </View>
      );
    }

    const getVideoProgress = (videoId) => {
      // Prefer local progress over database progress
      return localVideoProgress[videoId] || videoProgress[videoId] || {};
    };

    // Calculate completed videos count
    const completedVideos = chapterData.videos.filter(video => 
      getVideoProgress(video.id)?.completed
    ).length;

    return (
      <View>
        {selectedVideo && (
          <VideoViewer
            video={selectedVideo}
            onProgress={(progress) => handleVideoProgress(selectedVideo, progress)}
            onClose={() => setSelectedVideo(null)}
          />
        )}

        <View style={styles.videosHeader}>
          <Text style={styles.sectionTitle}>All Videos</Text>
          <Text style={styles.videoStats}>
            {completedVideos} / {chapterData.videos.length} Completed
          </Text>
        </View>

        {chapterData.videos.map((video) => {
          const progress = getVideoProgress(video.id);
          const progressPercent = Math.round((progress.progress || 0) * 100);

          return (
            <View key={video.id || Math.random().toString()} style={styles.materialCard}>
              <View style={styles.materialIconContainer}>
                <Ionicons 
                  name={progress.completed ? "checkmark-circle" : "play-circle"} 
                  size={32} 
                  color={progress.completed ? "#4CAF50" : "#2196F3"} 
                />
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
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${progressPercent}%`,
                          backgroundColor: progress.completed ? '#4CAF50' : '#2196F3' 
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressText, progress.completed && styles.completedText]}>
                      {progress.completed ? 'Completed' : `${progressPercent}% watched`}
                    </Text>
                    {progress.lastWatched && (
                      <Text style={styles.lastWatchedText}>
                        Last watched: {new Date(progress.lastWatched.seconds * 1000).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>

                {video.description && (
                  <Text style={styles.videoDescription} numberOfLines={2}>
                    {video.description}
                  </Text>
                )}

                {video.tags && video.tags.length > 0 && (
                  <View style={styles.videoTags}>
                    {video.tags.map((tag) => (
                      <Text key={tag} style={styles.videoTag}>#{tag}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.materialActions}>
                <TouchableOpacity
                  onPress={() => handleVideoSelect(video)}
                  style={styles.actionButton}
                >
                  <Ionicons 
                    name={progress.completed ? "refresh" : "play"} 
                    size={24} 
                    color="#2196F3" 
                  />
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
          );
        })}
      </View>
    );
  };

  // Add this useEffect to load video progress when component mounts
  useEffect(() => {
    if (chapterData?.videos) {
        loadVideoProgress();
    }
  }, [chapterData]);

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
        {activeTab === "videos" && renderVideos()}

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
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoPlayer: {
    flex: 1,
    backgroundColor: '#000',
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
  videoPlayerContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoPlayerHeader: {
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
  videoTitle: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  materialActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginLeft: 10,
  },
  progressContainer: {
    marginTop: 8,
    marginBottom: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  videoTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  completionText: {
    color: '#4CAF50',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  lastWatchedText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  videosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  videoStats: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
