import React, { useRef, useState, useEffect } from 'react';
import { 
  View, StyleSheet, ActivityIndicator, Text, 
  Alert, StatusBar, Platform, Linking 
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

const VideoCallComponent = ({ 
  roomId, 
  sessionId, 
  isTeacher, 
  studentName, 
  teacherName, 
  topic,
  isJitsi,
  jitsiUrl, 
  onClose 
}) => {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      let cameraPermission = await Camera.getCameraPermissionsAsync();
      let audioPermission = await Audio.getPermissionsAsync();

      // If permissions are not granted, request them
      if (!cameraPermission.granted) {
        cameraPermission = await Camera.requestCameraPermissionsAsync();
      }
      if (!audioPermission.granted) {
        audioPermission = await Audio.requestPermissionsAsync();
      }

      // Check if both permissions are granted
      if (cameraPermission.granted && audioPermission.granted) {
        setHasPermissions(true);
      } else {
        // If permissions are still not granted, show alert
        Alert.alert(
          'Permissions Required',
          'Please enable camera and microphone access in your device settings to join the meeting.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                Platform.OS === 'ios' 
                  ? Linking.openURL('app-settings:') 
                  : Linking.openSettings();
              }
            },
            {
              text: 'Try Again',
              onPress: checkAndRequestPermissions
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: onClose
            }
          ]
        );
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermissions(true); // Continue anyway to let Jitsi handle permissions
    }
  };

  const generateJitsiHtml = () => {
    const meetingUrl = isJitsi ? jitsiUrl : `https://meet.jit.si/${roomId}`;
    const displayName =studentName || auth.currentUser?.email || 'Student';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src='https://meet.jit.si/external_api.js'></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; }
            #meet { height: 100%; }
          </style>
        </head>
        <body>
          <div id="meet"></div>
          <script>
            const domain = 'meet.jit.si';
            const options = {
              roomName: '${roomId}',
              width: '100%',
              height: '100%',
              parentNode: document.querySelector('#meet'),
              userInfo: {
                displayName: '${displayName}'
              },
              configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false,
                enableWelcomePage: false,
                enableClosePage: false,
                resolution: 720,
                constraints: {
                  video: {
                    height: {
                      ideal: 720,
                      max: 720,
                      min: 180
                    },
                    width: {
                      ideal: 1280,
                      max: 1280,
                      min: 320
                    }
                  }
                },
                p2p: {
                  enabled: true
                },
                // Students need to wait for teacher's approval
                lobby: {
                  enabled: true,
                  autoKnock: true
                }
              },
              interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                  'microphone', 'camera', 'closedcaptions', 'desktop',
                  'fullscreen', 'fodeviceselection', 'hangup', 'chat',
                  'raisehand', 'videoquality', 'filmstrip',
                  'tileview'
                ],
                SETTINGS_SECTIONS: ['devices', 'language', 'moderator'],
                SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                SHOW_WATERMARK: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
                OPTIMAL_BROWSERS: ['chrome', 'chromium', 'firefox', 'nwjs', 'electron', 'safari'],
                DISABLE_VIDEO_BACKGROUND: true,
                INITIAL_TOOLBAR_TIMEOUT: 20000,
                TOOLBAR_TIMEOUT: 4000,
                TOOLBAR_ALWAYS_VISIBLE: false
              }
            };
            const api = new JitsiMeetExternalAPI(domain, options);
            
            api.addEventListener('videoConferenceLeft', () => {
              window.ReactNativeWebView.postMessage('call_ended');
            });

            api.addEventListener('participantRoleChanged', (event) => {
              if (event.role === 'moderator') {
                api.executeCommand('toggleLobby', true);
              }
            });

            api.addEventListener('knockingParticipant', (event) => {
              if (!event.allowJoin) {
                window.ReactNativeWebView.postMessage('waiting_for_teacher');
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            Joining meeting...
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: generateJitsiHtml() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onMessage={(event) => {
          const { data } = event.nativeEvent;
          if (data === 'call_ended') {
            onClose();
          } else if (data === 'jitsi_error') {
            Alert.alert(
              'Meeting Error',
              'There was an error with the video call. Please try again.',
              [{ text: 'OK', onPress: onClose }]
            );
          }
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
          Alert.alert('Error', 'Failed to load video call');
          onClose();
        }}
        originWhitelist={['*']}
        mixedContentMode="always"
        useWebKit={true}
        androidHardwareAccelerationDisabled={false}
        allowsFullscreenVideo={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  }
});

export default VideoCallComponent;
