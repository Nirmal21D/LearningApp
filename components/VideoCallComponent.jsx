import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  StatusBar,
  Platform,
  Linking,
  BackHandler,
  AppState,
  InteractionManager,
} from "react-native";
import WebView from "react-native-webview";
import { Camera } from "expo-camera";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { sendLocalNotification, requestNotificationPermissions } from '../lib/notifications';

const VideoCallComponent = forwardRef(({
  roomId,
  sessionId,
  isTeacher,
  studentName,
  teacherName,
  topic,
  isJitsi,
  jitsiUrl,
  onClose,
}, ref) => {
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionErrorCount, setPermissionErrorCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isInBackground, setIsInBackground] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [focusAttempts, setFocusAttempts] = useState(0);
  const [studentViolations, setStudentViolations] = useState(0);
  const MAX_RETRIES = 3;
  const MAX_FOCUS_ATTEMPTS = 2; // Reduced from 5 to 2 - leave meeting sooner
  const BACKGROUND_CHECK_INTERVAL = 500; // 500ms for faster detection
  const MAX_BACKGROUND_TIME = 2000; // 2 seconds maximum in background (reduced from 3s)

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
        console.error("Error hiding navigation bar:", error);
      }
    }
  };

  // Function to reload WebView with a delay
  const reloadWebView = useCallback(() => {
    if (webViewRef.current) {
      setIsLoading(true);
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.reload();
        }
        setIsLoading(false);
      }, 2000);
    }
  }, []);

  // Function to leave meeting automatically
  const leaveJitsiMeeting = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        try {
          if (window._jitsiApi) {
            window._jitsiApi.executeCommand('hangup');
            console.log('Meeting left automatically');
          }
          true;
        } catch (err) {
          console.error('Failed to leave meeting:', err);
          false;
        }
      `);

      // Call onClose after a short delay to ensure proper cleanup
      setTimeout(() => {
        onClose && onClose();
      }, 1000);
    }
  }, [onClose]);

  const INJECTED_JAVASCRIPT = `
(function() {
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let audioContext = null;
  const isTeacher = ${JSON.stringify(isTeacher)};
  const displayName = ${JSON.stringify(studentName || "Student")};

  // Function to initialize audio context
  async function initAudioContext() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }
      return true;
    } catch (err) {
      console.error('Audio context init error:', err);
      return false;
    }
  }

  // Remove Jitsi watermarks and unwanted UI elements
  function removeJitsiWatermarks() {
    const style = document.createElement('style');
    style.textContent = \`
      .watermark, .leftwatermark, .rightwatermark { 
        display: none !important; 
        opacity: 0 !important;
        visibility: hidden !important;
      }
      #largeVideoBackgroundContainer {
        background-color: #000 !important;
      }
      .videocontainer__background {
        background-color: #000 !important;
      }
      .premeeting-screen {
        background-color: #000 !important;
      }
      #videoconference_page {
        background-color: #000 !important;
      }
      .subject-info-container { display: none !important; }
      .new-toolbox { opacity: 0.8 !important; }
      .filmstrip { background-color: rgba(0,0,0,0.5) !important; }
      .connection-indicator { display: none !important; }
      
      /* Hide end-meeting elements */
      .feedback-dialog { display: none !important; }
      .feedback-button { display: none !important; }
      .btn-primary.feedback-button { display: none !important; }
      #feedbackButton { display: none !important; }
      .popover { display: none !important; }
      
      /* End meeting container */
      .premeeting-screen {
        background-image: none !important;
        background-color: #000 !important;
      }
    \`;
    document.head.appendChild(style);
    
    // Interval to keep removing elements
    setInterval(() => {
      const watermarks = document.querySelectorAll('.watermark, .leftwatermark, .rightwatermark');
      watermarks.forEach(el => {
        el.style.display = 'none';
        el.remove();
      });
      
      // Remove feedback dialog
      const feedbackElements = document.querySelectorAll('.feedback-dialog, .feedback-button, #feedbackButton');
      feedbackElements.forEach(el => {
        el.style.display = 'none';
        el.remove();
      });
    }, 1000);
  }

  async function initJitsiAndDevices() {
    try {
      // Apply watermark removal immediately and periodically
      removeJitsiWatermarks();
      
      // Wait for JitsiMeetExternalAPI to be available
      if (typeof JitsiMeetExternalAPI === 'undefined') {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(initJitsiAndDevices, 1000);
          return;
        } else {
          throw new Error('JitsiMeetExternalAPI not available after retries');
        }
      }

      // Initialize audio context first
      await initAudioContext();

      // Try to initialize devices one at a time
      let audioStream = null;
      let videoStream = null;

      try {
        // Try video first
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (videoErr) {
        console.warn('Video init error:', videoErr);
      }

      try {
        // Then try audio
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true },
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16
          }
        });
      } catch (audioErr) {
        console.warn('Audio init error:', audioErr);
        // If audio fails, try with minimal constraints
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
          });
        } catch (fallbackErr) {
          console.error('Fallback audio init error:', fallbackErr);
        }
      }

      if (!audioStream && !videoStream) {
        throw new Error('Could not initialize any media devices');
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      // Clean up test streams
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }

      // Initialize Jitsi with available devices and proper display name
      initJitsiMeeting(
        videoDevices.length > 0 ? videoDevices[0].deviceId : null,
        audioDevices.length > 0 ? audioDevices[0].deviceId : null
      );
    } catch (err) {
      window.ReactNativeWebView.postMessage('INIT_ERROR: ' + err.message);
    }
  }

  function initJitsiMeeting(videoDeviceId, audioDeviceId) {
    try {
      const domain = 'meet.jit.si';
      const options = {
        roomName: ${JSON.stringify(roomId || `meeting_${Date.now()}`)},
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet'),
        userInfo: {
          displayName: displayName
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableLipSync: false,
          disableAP: true,
          useNewAudioDevices: true,
          startSilent: false,
          enableNoAudioDetection: false,
          enableNoisyMicDetection: false,
          disableAudioLevels: true,
          resolution: 720,
          maxFullResolutionParticipants: 2,
          displayName: displayName,
          hiddenDomain: 'recorder.meet.jit.si', // Hide recording participants
          hideConferenceSubject: true, // Hide subject/room name
          hideConferenceTimer: true,
          disableFeedbackPrompt: true, // Disable feedback prompt at the end
          disableThirdPartyRequests: true,
          analytics: {
            disabled: true
          },
          constraints: {
            video: videoDeviceId ? {
              deviceId: { ideal: videoDeviceId },
              height: { ideal: 720, max: 720, min: 180 },
              width: { ideal: 1280, max: 1280, min: 320 }
            } : true,
            audio: audioDeviceId ? {
              deviceId: { ideal: audioDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            } : true
          }
        },
        interfaceConfigOverwrite: {
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'settings',
            'raisehand',
            'videoquality'
          ],
          SETTINGS_SECTIONS: ['devices', 'language'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DISABLE_FOCUS_INDICATOR: true,
          DISABLE_VIDEO_BACKGROUND: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
          DISABLE_TRANSCRIPTION_SUBTITLES: true,
          DISABLE_RINGING: true,
          DISABLE_PRESENCE_STATUS: true,
          DISABLE_FEEDBACK: true,
          DEFAULT_BACKGROUND: '#000000'
        }
      };

      // Add background state detection
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          window.ReactNativeWebView.postMessage('APP_BACKGROUND');
        } else if (document.visibilityState === 'visible') {
          window.ReactNativeWebView.postMessage('APP_FOREGROUND');
        }
      });

      // Reduce logging frequency for media status
      let lastMediaStatus = null;
      setInterval(() => {
        if (window._jitsiApi) {
          const isAudioMuted = window._jitsiApi.isAudioMuted();
          const isVideoMuted = window._jitsiApi.isVideoMuted();
          const currentStatus = JSON.stringify({audio: !isAudioMuted, video: !isVideoMuted});
          
          // Only send message if status has changed
          if (currentStatus !== lastMediaStatus) {
            lastMediaStatus = currentStatus;
            window.ReactNativeWebView.postMessage('MEDIA_STATUS: ' + currentStatus);
          }
          
          // Continue removing watermarks
          removeJitsiWatermarks();
        }
      }, 5000);
      
      const api = new JitsiMeetExternalAPI(domain, options);

      // Handle conference events
      api.addEventListener('videoConferenceJoined', () => {
        window.ReactNativeWebView.postMessage('CONFERENCE_JOINED');
        // Force set display name on join
        api.executeCommand('displayName', displayName);
        // Ensure watermarks are removed after joining
        removeJitsiWatermarks();
      });

      // Add chat message handler
      api.addEventListener('incomingMessage', (event) => {
        try {
          console.log('📨 Received chat message:', event);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CHAT_MESSAGE',
            data: {
              from: event.from,
              message: event.message,
              privateMessage: event.privateMessage,
              timestamp: Date.now()
            }
          }));
        } catch (e) {
          console.error('Error handling chat message:', e);
        }
      });

      // Handle participant messages for teacher notifications
      api.addEventListener('endpointTextMessageReceived', (event) => {
        try {
          console.log('🎯 Received Jitsi message event:', event);
          const data = JSON.parse(event.data.eventData.text);
          console.log('📨 Parsed message data:', data);
          
          if (isTeacher && data.type === 'STUDENT_VIOLATION') {
            console.log('🚸 Processing student violation in Jitsi');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIOLATION_DETECTED',
              data: data,
              timestamp: Date.now()
            }));
          }
        } catch (e) {
          console.error('❌ Error in Jitsi message handler:', e);
          window.ReactNativeWebView.postMessage('ERROR: ' + e.message);
        }
      });

      api.addEventListener('audioMuteStatusChanged', (status) => {
        window.ReactNativeWebView.postMessage('AUDIO_STATUS: ' + JSON.stringify(status));
      });

      api.addEventListener('videoMuteStatusChanged', (status) => {
        window.ReactNativeWebView.postMessage('VIDEO_STATUS: ' + JSON.stringify(status));
      });

      api.addEventListener('deviceListChanged', (devices) => {
        window.ReactNativeWebView.postMessage('DEVICES: ' + JSON.stringify(devices));
      });

      // Handle meeting end events
      api.addEventListener('readyToClose', () => {
        if (audioContext) {
          audioContext.close();
        }
        // Hide feedback dialog
        removeJitsiWatermarks();
        window.ReactNativeWebView.postMessage('READY_TO_CLOSE');
      });
      
      // Handle feedback dialog - disable it
      api.addEventListener('feedbackPromptDisplayed', () => {
        // Hide feedback dialog programmatically
        const feedbackElements = document.querySelectorAll('.feedback-dialog, .feedback-button, #feedbackButton');
        feedbackElements.forEach(el => {
          el.style.display = 'none';
          el.remove();
        });
        
        // Notify app that meeting is ending
        window.ReactNativeWebView.postMessage('MEETING_ENDING');
      });

      window._jitsiApi = api;
    } catch (err) {
      window.ReactNativeWebView.postMessage('MEETING_INIT_ERROR: ' + err.message);
    }
  }

  // Start initialization
  document.addEventListener('click', async () => {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  });

  // Apply watermark removal on load
  removeJitsiWatermarks();
  
  // Initialize Jitsi
  initJitsiAndDevices();
  return true;
})();
`;

  // Enhanced app state monitoring with auto-leave functionality
  useEffect(() => {
    // Keep the screen awake
    activateKeepAwake();

    // Lock orientation
    lockOrientation();

    // Hide navigation bar
    hideNavigationBar();

    // Set up app state monitoring
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Set up background check interval - more frequent checks
    const backgroundCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - lastActiveTime > BACKGROUND_CHECK_INTERVAL) {
        handleBackgroundCheck();
      }
      setLastActiveTime(currentTime);
    }, BACKGROUND_CHECK_INTERVAL);

    // Set up back button handler
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!isTeacher) {
          // For students, show warning and prevent back action
          Alert.alert(
            "Warning",
            "You cannot leave the video call without permission.",
            [{ text: "Stay in Call", style: "cancel" }],
            { cancelable: false }
          );
          return true;
        } else {
          // For teachers, allow closing with confirmation
          Alert.alert(
            "End Meeting",
            "Are you sure you want to end this meeting?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "End Meeting",
                style: "destructive",
                onPress: () => {
                  leaveJitsiMeeting();
                }
              }
            ]
          );
          return true;
        }
      }
    );

    return () => {
      subscription.remove();
      clearInterval(backgroundCheckInterval);
      backHandler.remove();
      deactivateKeepAwake();
      // Reset orientation and navigation bar
      ScreenOrientation.unlockAsync();
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible");
      }
    };
  }, [isTeacher, focusAttempts, leaveJitsiMeeting]);

  const handleBackgroundCheck = () => {
    if (AppState.currentState !== "active") {
      const currentTime = Date.now();

      // If been in background for more than MAX_BACKGROUND_TIME
      if (currentTime - lastActiveTime > MAX_BACKGROUND_TIME) {
        // Auto-leave the meeting for any user type (teacher or student)
        InteractionManager.runAfterInteractions(() => {
          if (focusAttempts >= MAX_FOCUS_ATTEMPTS) {
            console.log("User has left the app multiple times, leaving meeting automatically");
            leaveJitsiMeeting();
          } else {
            forceReturnToApp();
          }
        });
      }
    }
  };

  // Update the WebView onMessage handler with enhanced debugging
  const handleWebViewMessage = async (event) => {
    console.log('🔍 WebView message type:', typeof event.nativeEvent.data);
    console.log('📝 Raw message:', event.nativeEvent.data);

    const message = event.nativeEvent.data;

    // Handle background state changes first, before any JSON parsing
    if (message === "APP_BACKGROUND") {
      console.log("🔴 User went to background");

      try {
        // Send teacher notification first if this is a student
        if (!isTeacher) {
          await sendTeacherNotification(
            "⚠️ Student Left Call",
            `${studentName || "Student"} has switched away from the video call at ${new Date().toLocaleTimeString()}`
          );
        }

        // Always force return for first attempts
        if (focusAttempts < MAX_FOCUS_ATTEMPTS) {
          await forceReturnToApp();
        } else {
          // Auto-leave after multiple attempts
          console.log("Max focus attempts reached, leaving meeting");
          leaveJitsiMeeting();
        }
      } catch (error) {
        console.error("❌ Failed to handle background state:", error);
      }
      return;
    }

    if (message === "APP_FOREGROUND") {
      console.log("🟢 App returned to foreground");
      setIsInBackground(false);
      return;
    }

    if (message === "READY_TO_CLOSE" || message === "MEETING_ENDING") {
      console.log("👋 Meeting ready to close or ending");
      onClose && onClose();
      return;
    }

    // Try to parse JSON messages
    try {
      const data = JSON.parse(message);
      console.log('🔄 Parsed WebView message:', data);

      // Handle chat messages
      if (data.type === 'CHAT_MESSAGE') {
        console.log('💬 Processing chat message');
        try {
          // Send notification for chat message
          await sendLocalNotification(
            `New Message from ${data.data.from}`,
            data.data.message,
            {
              type: 'chat_message',
              from: data.data.from,
              timestamp: data.data.timestamp
            }
          );
          console.log('✅ Chat notification sent');
        } catch (error) {
          console.error('❌ Error showing chat notification:', error);
        }
      }

      // Handle student violations
      if (data.type === 'VIOLATION_DETECTED') {
        console.log("🚨 Processing violation detection");
        if (isTeacher) {
          console.log("👨‍🏫 Teacher receiving violation notification");
          try {
            // Send notification to teacher's device
            console.log('📱 Sending local notification to teacher...');
            await sendLocalNotification(
              `Student Alert: ${data.data.studentName}`,
              data.data.message
            );
            console.log('✅ Teacher notification sent successfully');

            // Show alert dialog
            Alert.alert(
              `Student Alert - ${data.data.severity === 'high' ? '⚠️ High Priority' : 'Warning'}`,
              `${data.data.studentName} has attempted to leave the video call.\n\nDetails: ${data.data.message}`,
              [{
                text: "Acknowledge",
                style: "default",
                onPress: () => console.log('👍 Teacher acknowledged notification at:', new Date().toISOString())
              }],
              { cancelable: false }
            );
          } catch (error) {
            console.error('❌ Error showing teacher notification:', error);
          }
        }
      }
    } catch (e) {
      // Handle initialization errors
      if (message.includes("INIT_ERROR") ||
        message.includes("DEVICE_ERROR") ||
        message.includes("MEETING_INIT_ERROR")
      ) {
        console.error("🔧 Jitsi initialization error:", message);
        handleJitsiError(message);
      } else {
        console.log('ℹ️ Non-JSON message received:', message);
      }
    }
  };

  const handleJitsiError = (errorMessage) => {
    console.log('🔧 Handling Jitsi error:', errorMessage);
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setRetryCount((prev) => prev + 1);
      reloadWebView();
    } else {
      console.log('❌ Max retries reached, showing error dialog');
      Alert.alert(
        "Connection Error",
        "Failed to initialize video call. Please check your camera and microphone permissions and try again.",
        [{ text: "OK", onPress: () => onClose && onClose() }]
      );
    }
  };

  // Update sendTeacherNotification function
  const sendTeacherNotification = async (title, message) => {
    try {
      console.log('🔔 Starting notification process...', { title, message, isTeacher });

      // Send local notification regardless of user type (for testing)
      console.log('📱 Sending local notification...');
      await sendLocalNotification(
        title,
        message,
        {
          type: 'teacher_alert',
          studentName: studentName || 'Student',
          timestamp: new Date().toISOString()
        }
      );
      console.log('✅ Local notification sent');

      // If this is a student device, send Jitsi message to teacher
      if (!isTeacher && webViewRef.current) {
        const jitsiMessage = {
          type: 'STUDENT_VIOLATION',
          studentName: studentName || 'Student',
          message: message,
          timestamp: Date.now(),
          severity: focusAttempts > 1 ? 'high' : 'medium', // Increased severity threshold
          eventType: 'background_switch'
        };

        console.log('💬 Sending Jitsi message:', jitsiMessage);

        const jsCode = `
                try {
                    if (window._jitsiApi) {
                        window._jitsiApi.executeCommand('sendEndpointTextMessage', '', ${JSON.stringify(JSON.stringify(jitsiMessage))});
                        console.log('Jitsi message sent');
                    } else {
                        console.warn('Jitsi API not available');
                    }
                    true;
                } catch (err) {
                    console.error('Failed to send Jitsi message:', err);
                    false;
                }
            `;

        await new Promise((resolve) => {
          webViewRef.current.injectJavaScript(jsCode);
          setTimeout(resolve, 500); // Give some time for the message to be sent
        });

        console.log('✅ Jitsi message sent');
      }

      console.log('✅ Notification process completed successfully');
    } catch (error) {
      console.error('❌ Notification error:', {
        error: error.message,
        stack: error.stack,
        context: {
          isTeacher,
          studentName,
          focusAttempts,
          hasWebView: !!webViewRef.current
        }
      });
      throw error;
    }
  };

  // Update the forceReturnToApp function
  const forceReturnToApp = async () => {
    setIsInBackground(true);
    setFocusAttempts((prev) => prev + 1);
    const newCount = studentViolations + 1;
    setStudentViolations(newCount);

    // Send notification about the attempt
    await sendTeacherNotification(
      "Student Alert",
      `${studentName || "Student"} has left the video call (Attempt ${newCount})`
    );

    const remainingAttempts = MAX_FOCUS_ATTEMPTS - focusAttempts;

    // Show alert to user
    const warningText = remainingAttempts <= 0
      ? "This is your final warning. The meeting will end if you leave again."
      : `Warning: You have ${remainingAttempts} more attempt(s) before being removed from the meeting.`;

    Alert.alert(
      "Warning",
      `Switching apps is not allowed during video calls. ${warningText}`,
      [{
        text: "Return to Call",
        onPress: () => {
          setIsInBackground(false);
          if (Platform.OS === "android") {
            hideNavigationBar();
          }
          // Reset camera if needed
          InteractionManager.runAfterInteractions(() => {
            lockOrientation();
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (window._jitsiApi) {
                  window._jitsiApi.executeCommand('toggleVideo');
                  setTimeout(() => window._jitsiApi.executeCommand('toggleVideo'), 500);
                  window._jitsiApi.executeCommand('displayName', '${studentName || "Student"}');
                }
                true;
              `);
            }
          });
        },
      }],
      { cancelable: false }
    );
  };

  const handleAppStateChange = (nextAppState) => {
    const currentState = appStateRef.current;
    appStateRef.current = nextAppState;

    if (nextAppState === "background" || nextAppState === "inactive") {
      // For any user type, trigger return to app or leave meeting
      if (focusAttempts >= MAX_FOCUS_ATTEMPTS) {
        leaveJitsiMeeting();
      } else {
        forceReturnToApp();
      }
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Request notification permissions first
        const notificationPermission = await requestNotificationPermissions();
        console.log('🔔 Notification permission result:', notificationPermission);

        // Then request other permissions
        await requestPermissions();
      } catch (error) {
        console.error('❌ Error during initialization:', error);
      }
    };

    initializeComponent();

    // Cleanup function
    return () => {
      // Clean up WebView reference
      if (webViewRef.current) {
        webViewRef.current = null;
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      // Request permissions using Camera API
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission =
        await Camera.requestMicrophonePermissionsAsync();

      console.log("Camera permission:", cameraPermission);
      console.log("Microphone permission:", microphonePermission);

      if (
        cameraPermission.status === "granted" && microphonePermission.status === "granted"
      ) {
        setHasPermissions(true);
        setPermissionErrorCount(0);
      } else {
        setHasPermissions(false);
        setPermissionErrorCount((prev) => prev + 1);

        if (permissionErrorCount >= 1) {
          // Show more detailed instructions after second attempt
          Alert.alert(
            "Permission Required",
            "Camera and microphone access are necessary for video calls. Please enable these permissions in your device settings to continue.",
            [
              {
                text: "Open Settings",
                onPress: () => Linking.openSettings(),
              },
              {
                text: "Cancel",
                onPress: () => onClose && onClose(),
                style: "cancel",
              },
            ]
          );
        } else {
          // First attempt - simple message
          Alert.alert(
            "Permission Denied",
            "Camera and microphone access are required for video calls.",
            [
              {
                text: "Try Again",
                onPress: () => requestPermissions(),
              },
              {
                text: "Cancel",
                onPress: () => onClose && onClose(),
                style: "cancel",
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert(
        "Error",
        "Failed to request camera/microphone permissions. Please try again.",
        [{ text: "OK", onPress: () => onClose && onClose() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    leaveJitsiMeeting,
    reloadWebView,
    sendTeacherNotification,
    forceReturnToApp
  }));

  // Generate the correct source URL
  const getSourceUrl = () => {
    if (isJitsi && jitsiUrl) {
      return { uri: jitsiUrl };
    }

    // Use default Jitsi meet URL with our room ID
    return {
      uri: `https://meet.jit.si/${roomId || `meeting_${Date.now()}`}`
    };
  };

  // Return loading view if still loading or permissions not granted
  if (isLoading || !hasPermissions) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>
          {isLoading
            ? "Preparing video call..."
            : "Waiting for camera/microphone permissions..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webViewRef}
        source={getSourceUrl()}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        onMessage={handleWebViewMessage}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onLoadEnd={() => setIsLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error:", nativeEvent);
          handleJitsiError(`WebView error: ${nativeEvent.description}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView HTTP error:", nativeEvent);
          if (nativeEvent.statusCode >= 400) {
            handleJitsiError(`HTTP error: ${nativeEvent.statusCode}`);
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    width: "100%",
    height: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "black",
  },
  loadingText: {
    color: "white",
    marginTop: 20,
    textAlign: "center",
  },
});

export default VideoCallComponent;