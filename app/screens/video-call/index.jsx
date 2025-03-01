import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Text,
  BackHandler,
  AppState,
  InteractionManager,
} from "react-native";
import VideoCallComponent from "@/components/VideoCallComponent";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera } from "expo-camera";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";

export default function VideoCallScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [error, setError] = useState(null);
  const [isInBackground, setIsInBackground] = useState(false);
  const [focusAttempts, setFocusAttempts] = useState(0);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [showBackgroundWarning, setShowBackgroundWarning] = useState(false);
  const [backgroundWarningMessage, setBackgroundWarningMessage] = useState("");
  const appStateRef = useRef(AppState.currentState);
  const videoComponentRef = useRef(null);

  const MAX_FOCUS_ATTEMPTS = 3;
  const BACKGROUND_CHECK_INTERVAL = 500; // 500ms
  const MAX_BACKGROUND_TIME = 3000; // 3 seconds
  const BACKGROUND_WARNING_THRESHOLD = 2; // Show warning after 2 background attempts

  // Parse parameters with default values
  const {
    roomId,
    sessionId,
    isTeacher = false,
    studentName,
    teacherName,
    topic,
    isJitsi = false,
    jitsiUrl,
  } = params;

  // Function to handle screen orientation lock
  const lockOrientation = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } catch (error) {
      console.error("Error locking orientation:", error);
    }
  };

  // Function to hide navigation bar (Android only)
  const hideNavigationBar = async () => {
    if (Platform.OS === "android") {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay");
      } catch (error) {
        // console.error("Error hiding navigation bar:", error);
      }
    }
  };

  const handleBackgroundCheck = () => {
    if (!isTeacher && AppState.currentState !== "active") {
      const currentTime = Date.now();
      
      if (currentTime - lastActiveTime > MAX_BACKGROUND_TIME) {
        InteractionManager.runAfterInteractions(() => {
          forceReturnToApp();
          // Send warning message through the VideoCallComponent
          if (videoComponentRef.current) {
            const timeoutMessage = `⚠️ Warning: ${studentName || "Student"} was away for more than ${MAX_BACKGROUND_TIME/1000} seconds`;
            videoComponentRef.current.sendMessageToChat(timeoutMessage);
          }
        });
      }
    }
  };

  const forceReturnToApp = () => {
    setFocusAttempts(prev => {
      const newCount = prev + 1;
      
      // Show different alerts based on attempt count
      if (newCount >= MAX_FOCUS_ATTEMPTS) {
        Alert.alert(
          "Final Warning",
          "Returning to other apps during class is not allowed. Your teacher has been notified.",
          [{ text: "Return to Class", style: "cancel" }],
          { cancelable: false }
        );
        
        // Send final warning message
        if (videoComponentRef.current) {
          const message = `🚫 ALERT: ${studentName || "Student"} has attempted to leave the video call ${newCount} times`;
          videoComponentRef.current.sendMessageToChat(message);
        }
        
        // Show persistent warning on screen
        setBackgroundWarningMessage(`🚫 Student has left the class ${newCount} times. Teacher has been notified.`);
        setShowBackgroundWarning(true);
      } else if (newCount >= BACKGROUND_WARNING_THRESHOLD) {
        Alert.alert(
          "Warning",
          "Please stay in the video call during class time.",
          [{ text: "Return to Class", style: "cancel" }],
          { cancelable: false }
        );
        
        // Show warning on screen after threshold
        setBackgroundWarningMessage(`⚠️ Student has left the class ${newCount} times`);
        setShowBackgroundWarning(true);
      } else {
        Alert.alert(
          "Warning",
          "Please stay in the video call during class time.",
          [{ text: "Return to Class", style: "cancel" }],
          { cancelable: false }
        );
      }
      
      return newCount;
    });

    setIsInBackground(true);
    if (Platform.OS === "android") {
      hideNavigationBar();
    }
    lockOrientation();
  };

  const handleAppStateChange = (nextAppState) => {
    const currentState = appStateRef.current;
    appStateRef.current = nextAppState;

    if (
      !isTeacher &&
      (nextAppState === "background" ||
        nextAppState === "inactive" ||
        (currentState === "active" && nextAppState !== "active"))
    ) {
      forceReturnToApp();
    }

    if (nextAppState === "active") {
      setLastActiveTime(Date.now());
      setIsInBackground(false);
    }
  };

  useEffect(() => {
    initializeVideoCall();

    if (!isTeacher) {
      // Keep screen awake
      activateKeepAwake();
      
      // Lock orientation
      lockOrientation();
      
      // Hide navigation bar
      hideNavigationBar();

      // Set up app state monitoring
      const subscription = AppState.addEventListener("change", handleAppStateChange);

      // Set up background check interval
      const backgroundCheckInterval = setInterval(() => {
        handleBackgroundCheck();
      }, BACKGROUND_CHECK_INTERVAL);

      return () => {
        subscription.remove();
        clearInterval(backgroundCheckInterval);
        deactivateKeepAwake();
        ScreenOrientation.unlockAsync();
        if (Platform.OS === "android") {
          NavigationBar.setVisibilityAsync("visible");
        }
      };
    }

    // Handle hardware back button (Android)
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => {
      backHandler.remove();
    };
  }, [isTeacher]);

  const handleBackPress = () => {
    handleClose();
    return true;
  };

  const initializeVideoCall = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate required parameters
      if (!roomId) {
        throw new Error("Room ID is required");
      }

      // Check and request permissions
      const hasPermissions = await checkAndRequestPermissions();

      if (!hasPermissions) {
        throw new Error("Required permissions not granted");
      }

      setPermissionsGranted(true);
    } catch (error) {
      console.error("Error initializing video call:", error);
      setError(error.message);
      Alert.alert(
        "Error",
        "Failed to initialize video call: " + error.message,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // In VideoCallScreen.js
  const checkAndRequestPermissions = async () => {
    try {
      // Use the correct permission request methods
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission =
        await Camera.requestMicrophonePermissionsAsync();

      console.log("Camera permission:", cameraPermission);
      console.log("Microphone permission:", microphonePermission);

      if (
        cameraPermission.status === "granted" &&
        microphonePermission.status === "granted"
      ) {
        return true;
      }

      // More persistent alert that can't be easily dismissed
      Alert.alert(
        "Permissions Required",
        "Camera and microphone access are required for video calls. Please enable them in settings.",
        [
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
              router.back();
            },
          },
          {
            text: "Exit Call",
            onPress: () => router.back(),
            style: "destructive",
          },
        ],
        { cancelable: false }
      );
      return false;
    } catch (error) {
      console.error("Error checking permissions:", error);
      Alert.alert(
        "Permission Error",
        "Failed to check or request necessary permissions. Please try again.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return false;
    }
  };

  const handleClose = () => {
    // Force immediate navigation
    InteractionManager.runAfterInteractions(() => {
      router.back();
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initializing video call...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to start video call</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>
          Camera and microphone permissions are required
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoCallComponent
        ref={videoComponentRef}
        roomId={roomId}
        sessionId={sessionId}
        isTeacher={Boolean(isTeacher)}
        studentName={studentName}
        teacherName={teacherName}
        topic={topic}
        isJitsi={Boolean(isJitsi)}
        jitsiUrl={jitsiUrl}
        onClose={handleClose}
        isInBackground={isInBackground}
        focusAttempts={focusAttempts}
      />
      
      {/* Background warning banner */}
      {showBackgroundWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{backgroundWarningMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc3545",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  warningBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(220, 53, 69, 0.9)",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  warningText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});