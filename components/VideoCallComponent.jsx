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
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { sendLocalNotification, requestNotificationPermissions } from '../lib/notifications';
import NetInfo from '@react-native-community/netinfo';

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
        // Fix: Use "inset-hide" instead of "overlay"
        await NavigationBar.setBehaviorAsync("inset-hide");
      } catch (error) {
        // console.error("Error hiding navigation bar:", error);
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
    // Force immediate exit first
    InteractionManager.runAfterInteractions(() => {
      onClose && onClose();
    });
    
    // Then cleanup in background
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        try {
          if (window._jitsiApi) {
            window._jitsiApi.executeCommand('hangup');
            window._jitsiApi.dispose();
            window._jitsiApi = null;
          }
        } catch (e) {}
        true;
      `);
    }
  }, [onClose]);

  // Handle Jitsi errors
  const handleJitsiError = useCallback((errorMessage) => {
    console.error("Jitsi error:", errorMessage);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setRetryCount(prev => prev + 1);
      reloadWebView();
    } else {
      Alert.alert(
        'Connection Error',
        'Failed to initialize video call. Please check your internet connection and try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setRetryCount(0);
              reloadWebView();
            }
          },
          {
            text: 'Cancel',
            onPress: () => onClose && onClose(),
            style: 'cancel'
          }
        ]
      );
    }
  }, [retryCount, reloadWebView, onClose]);

  // Create HTML content with proper Jitsi library inclusion
  const generateHtmlContent = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Jitsi Meeting</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      overflow: hidden;
      height: 100%;
      width: 100%;
      background-color: #000;
    }
    #meet {
      width: 100%;
      height: 100%;
    }
  </style>
  <script src='https://meet.jit.si/external_api.js'></script>
</head>
<body>
  <div id="meet"></div>
</body>
</html>`;
  };

  // JavaScript to inject after page load
  const INJECTED_JAVASCRIPT = `
(function() {
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let audioContext = null;
  const isTeacher = ${JSON.stringify(isTeacher)};
  const displayName = ${JSON.stringify(studentName || "Student")};
  const roomId = ${JSON.stringify(roomId || `meeting_${Date.now()}`)};

  // Function to check if JitsiMeetExternalAPI is available
  function checkJitsiAPI() {
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      window.ReactNativeWebView.postMessage('WAITING_FOR_API: Attempt ' + (retryCount + 1));
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(checkJitsiAPI, 1000);
      } else {
        window.ReactNativeWebView.postMessage('INIT_ERROR: JitsiMeetExternalAPI not available after retries');
      }
      return false;
    }
    return true;
  }

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
      
      // Check if JitsiMeetExternalAPI is available
      if (!checkJitsiAPI()) {
          return;
      }

      window.ReactNativeWebView.postMessage('API_AVAILABLE: JitsiMeetExternalAPI found');

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
        window.ReactNativeWebView.postMessage('VIDEO_INITIALIZED');
      } catch (videoErr) {
        console.warn('Video init error:', videoErr);
        window.ReactNativeWebView.postMessage('VIDEO_INIT_ERROR: ' + videoErr.message);
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
        // window.ReactNativeWebView.postMessage('AUDIO_INITIALIZED');
      } catch (audioErr) {
        console.warn('Audio init error:', audioErr);
        // window.ReactNativeWebView.postMessage('AUDIO_INIT_ERROR: ' + audioErr.message);
        // If audio fails, try with minimal constraints
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
          });
          window.ReactNativeWebView.postMessage('AUDIO_FALLBACK_INITIALIZED');
        } catch (fallbackErr) {
          // console.error('Fallback audio init error:', fallbackErr);
          // window.ReactNativeWebView.postMessage('AUDIO_FALLBACK_ERROR: ' + fallbackErr.message);
        }
      }

      if (!audioStream && !videoStream) {
        throw new Error('Could not initialize any media devices');
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      window.ReactNativeWebView.postMessage('DEVICES_FOUND: ' + JSON.stringify({
        video: videoDevices.length,
        audio: audioDevices.length
      }));

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
      window.ReactNativeWebView.postMessage('STARTING_JITSI_INIT');
      
      const domain = 'meet.jit.si';
      const options = {
        roomName: roomId,
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
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          filmStripOnly: false,
          HIDE_DEEP_LINKING_LOGO: true,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          ENABLE_FEEDBACK: false,
          DISABLE_PRESENCE_STATUS: true,
          SETTINGS_SECTIONS: [],
          DEFAULT_BACKGROUND: '#000000',
          DEFAULT_LOCAL_DISPLAY_NAME: 'me',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Student',
          TOOLBAR_ALWAYS_VISIBLE: false,
          TOOLBAR_TIMEOUT: 4000,
          MAXIMUM_ZOOMING: 1.0
        }
      };

      window.ReactNativeWebView.postMessage('JITSI_OPTIONS_PREPARED');

      // Add background state detection
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          window.ReactNativeWebView.postMessage('APP_BACKGROUND');
        } else if (document.visibilityState === 'visible') {
          window.ReactNativeWebView.postMessage('APP_FOREGROUND');
        }
      });

      window.ReactNativeWebView.postMessage('CREATING_JITSI_API');
      
      try {
        const api = new JitsiMeetExternalAPI(domain, options);
        window.ReactNativeWebView.postMessage('JITSI_API_CREATED');

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
          // Immediately leave and clean up
          window.ReactNativeWebView.postMessage('MEETING_ENDED');
          api.dispose();
          window._jitsiApi = null;
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
        window.ReactNativeWebView.postMessage('JITSI_MEETING_INITIALIZED');
      } catch (apiError) {
        window.ReactNativeWebView.postMessage('JITSI_API_ERROR: ' + apiError.message);
        console.error('Failed to create Jitsi API:', apiError);
      }
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
  
  // Initialize Jitsi with a slight delay to ensure DOM is ready
  setTimeout(() => {
    window.ReactNativeWebView.postMessage('STARTING_INITIALIZATION');
  initJitsiAndDevices();
  }, 1000);
  
  return true;
})();
`;

  // Enhanced app state monitoring with auto-leave functionality
  useEffect(() => {
    // Keep the screen awake using async function
    const keepAwake = async () => {
      try {
        await activateKeepAwakeAsync();
      } catch (error) {
        console.warn('Keep awake error:', error);
      }
    };
    
    keepAwake();

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
  const handleWebViewMessage = useCallback((event) => {
    const message = event.nativeEvent.data;
    console.log('WebView message:', message);
    
    if (message === 'PAGE_LOADED') {
      console.log('WebView page loaded successfully');
      return;
    }

    if (message.includes('STARTING_INITIALIZATION') || 
        message.includes('API_AVAILABLE') || 
        message.includes('JITSI_OPTIONS_PREPARED') || 
        message.includes('CREATING_JITSI_API') || 
        message.includes('JITSI_API_CREATED') || 
        message.includes('JITSI_MEETING_INITIALIZED')) {
      // console.log('Jitsi initialization progress:', message);
      return;
    }

    if (message.includes('WAITING_FOR_API')) {
      console.log('Waiting for Jitsi API:', message);
      return;
    }

    if (message.includes('INIT_ERROR') || 
        message.includes('SCRIPT_ERROR') || 
        message.includes('JITSI_API_ERROR') || 
        message.includes('MEETING_INIT_ERROR')) {
      // console.error('Jitsi initialization error:', message);
      // Instead of showing alert, try to reload
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        reloadWebView();
      }
      return;
    }

    if (message.includes('CONFERENCE_JOINED')) {
      console.log('Successfully joined the conference');
      setIsLoading(false);
      return;
    }

    // For any meeting end event, exit immediately
    if (message.includes('READY_TO_CLOSE') || 
        message.includes('MEETING_ENDING') ||
        message.includes('MEETING_ENDED') ||
        message.includes('HANGUP')) {
      // Cleanup and exit immediately
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
          try {
            if (window._jitsiApi) {
              window._jitsiApi.dispose();
              window._jitsiApi = null;
            }
          } catch (e) {}
          true;
        `);
        }
      // Force immediate exit
      InteractionManager.runAfterInteractions(() => {
        onClose && onClose();
      });
      return;
    }

    // Handle other messages...
  }, [onClose]);

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
                  // Ensure video and audio are working
                  window._jitsiApi.executeCommand('toggleVideo');
                  setTimeout(() => {
                    window._jitsiApi.executeCommand('toggleVideo');
                  }, 500);
                  
                  // Send status update
                  window._jitsiApi.executeCommand('sendEndpointTextMessage', '', 
                    JSON.stringify({
                      type: 'USER_RETURNED',
                      userName: ${JSON.stringify(studentName || "Student")},
                      timestamp: Date.now()
                    })
                  );
        }
        true;
      `);
      }
          });
        }
      }],
      { cancelable: false }
    );
  };

  // Add permission request handling
  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      
      // Request camera and microphone permissions
      const [cameraPermission, microphonePermission] = await Promise.all([
        Camera.requestCameraPermissionsAsync(),
        Camera.requestMicrophonePermissionsAsync()
      ]);
      
      // Request notification permissions for alerts
      await requestNotificationPermissions();
      
      console.log("Camera permission:", cameraPermission);
      console.log("Microphone permission:", microphonePermission);

      if (cameraPermission.status === "granted" && microphonePermission.status === "granted") {
        setHasPermissions(true);
      } else {
        Alert.alert(
          "Permissions Required",
          "Camera and microphone access are needed for video calls",
          [
            { 
              text: "Settings", 
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
            { 
              text: "Cancel", 
              style: "cancel",
              onPress: () => onClose && onClose()
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert(
        "Error",
        "Failed to request camera and microphone permissions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Handle app state changes
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
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    leaveCall: leaveJitsiMeeting,
    reloadCall: reloadWebView
  }));

  // Add network check before joining
  const checkNetworkAndJoin = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          [{ text: "OK", onPress: () => onClose?.() }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Network check error:", error);
      return false;
    }
  }, [onClose]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Preparing video call...</Text>
      </View>
    );
  }

  // Render permissions request state
  if (!hasPermissions) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Camera and microphone permissions are required.
        </Text>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webViewRef}
        source={{ 
          html: generateHtmlContent(),
          baseUrl: 'https://meet.jit.si'
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsFullscreenVideo={true}
        cacheEnabled={false}
        incognito={true}
        allowsBackgroundMediaPlayback={true}
          androidLayerType="hardware"
        onMessage={handleWebViewMessage}
          originWhitelist={["*"]}
        mixedContentMode="always"
        useWebKit={true}
        scrollEnabled={false}
        bounces={false}
        startInLoadingState={true}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onShouldStartLoadWithRequest={() => true}
        webviewDebuggingEnabled={true}
        onLoadStart={() => checkNetworkAndJoin()}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
  },
});

export default VideoCallComponent;