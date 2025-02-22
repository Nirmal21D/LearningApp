import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import CallButton from "@/components/CallButton";

export default function TeacherDashboard() {
  const router = useRouter();
  const [approvedSessions, setApprovedSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherInfo();
    fetchApprovedSessions().then(() => {
      console.log("Fetched approved sessions completed");
    });
    checkActiveSession();
  }, []);

  useEffect(() => {
    // Debug query to check all session requests
    const debugSessions = async () => {
      try {
        const sessionsRef = collection(db, "sessionRequests");
        const snapshot = await getDocs(sessionsRef);
        console.log(`Total sessions in DB: ${snapshot.docs.length}`);
        snapshot.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(
            `Session ${i} - Status: ${data.status}, TeacherId: ${data.teacherId}`
          );
        });
      } catch (err) {
        console.error("Debug query error:", err);
      }
    };

    debugSessions();
  }, []);
  const [quickActions] = useState([
    {
      id: "session-requests",
      title: "Session Requests",
      icon: "calendar",
      onPress: () => router.push("/teacher/session-approval"),
      color: "#4CAF50",
    },
    {
      id: "teacher-chats",
      title: "Student Chats",
      icon: "chatbubbles",
      onPress: () => router.push("/chat/private"),
      color: "#2196F3",
    },
    {
      id: "active-sessions",
      title: "Active Sessions",
      icon: "videocam",
      onPress: () => handleViewActiveSessions(),
      color: "#E91E63",
    },
    // {
    //   id: "chats",
    //   title: "View Chats",
    //   icon: "chatbubbles",
    //   onPress: () => router.push("/chat/group"),
    //   color: "#2196F3",
    // },
    {
      id: "upload",
      title: "Upload Study Materials",
      icon: "cloud-upload",
      onPress: () => router.push("/teacher/upload_materials"),
      color: "#FF9800",
    },
    {
      id: "organize",
      title: "Organize Materials",
      icon: "folder-open",
      onPress: () => router.push("/teacher/view_materials"),
      color: "#9C27B0",
    },
    {
      id: "videos",
      title: "Upload Videos",
      icon: "videocam",
      onPress: () => router.push("/teacher/upload-video"),
      color: "#E91E63",
    },
  ]);

  const materialActions = [
    {
      id: "add-material",
      title: "Add New Material",
      icon: "add-circle",
      onPress: () => router.push("/teacher/upload_materials"),
      color: "#4CAF50",
    },
    {
      id: "update-material",
      title: "Update Material",
      icon: "create",
      onPress: () => router.push("/teacher/organize_materials"),
      color: "#FF9800",
    },
    {
      id: "add-video",
      title: "Upload Video",
      icon: "cloud-upload",
      onPress: () => router.push("/teacher/upload_video"),
      color: "#2196F3",
    },
    {
      id: "create-test",
      title: "Create Test",
      icon: "film",
      onPress: () => router.push("/teacher/create-test"),
      color: "#9C27B0",
    },
  ];

  useEffect(() => {
    fetchTeacherInfo();
    fetchApprovedSessions();
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      if (!auth.currentUser) return;

      const sessionsRef = collection(db, "sessionRequests");
      const q = query(
        sessionsRef,
        where("teacherId", "==", auth.currentUser.uid),
        where("status", "==", "in-progress")
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Include the document ID in the session data
        const activeSessionData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
        setActiveSession(activeSessionData);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error("Error checking active session:", error);
      setActiveSession(null);
    }
  };

  const fetchTeacherInfo = async () => {
    try {
      const teacherRef = collection(db, "teachers");
      const q = query(teacherRef, where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const teacherData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
        setTeacherInfo(teacherData);
      }
    } catch (error) {
      console.error("Error fetching teacher info:", error);
    }
  };

  const fetchApprovedSessions = async () => {
    try {
      console.log("Fetching approved sessions...");
      const sessionsRef = collection(db, "sessionRequests");
      const q = query(
        sessionsRef,
        where("teacherId", "==", auth.currentUser.uid),
        where("status", "==", "approved"),
        orderBy("requestedDate", "desc") // Show newest first
      );

      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} approved sessions`);

      const sessions = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            requestedDate: data.requestedDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        })
        .filter((session) => {
          // Filter out past sessions
          return new Date(session.requestedDate) > new Date();
        });

      console.log("Processed sessions:", sessions);
      setApprovedSessions(sessions);
    } catch (error) {
      /* console.error("Error fetching approved sessions:", error);
      Alert.alert("Error", "Failed to load upcoming sessions"); */
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (session) => {
    try {
      // First, validate that we have a valid session with an ID
      if (!session || !session.id) {
        console.error("Invalid session data", session);
        Alert.alert("Error", "Session data is invalid");
        return;
      }

      // Generate a valid room ID that won't cause issues
      const safeRoomId = session.roomId
        ? session.roomId.toString().replace(/[^a-zA-Z0-9]/g, "")
        : `session${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

      console.log("Starting session with room ID:", safeRoomId);

      // First update the session document
      const sessionRef = doc(db, "sessionRequests", session.id);
      await updateDoc(sessionRef, {
        roomId: safeRoomId,
        status: "in-progress",
        startTime: new Date(),
      });

      console.log("Session document updated successfully");

      // Then navigate to the video call
      router.push({
        pathname: "/screens/video-call",
        params: {
          roomId: safeRoomId,
          sessionId: session.id,
          isTeacher: true,
          studentName: session.studentName || "Student",
          teacherName: teacherInfo?.name || "Teacher",
          topic: session.topic || "Video Session",
        },
      });
    } catch (error) {
      console.error(
        "Detailed error starting session:",
        error.message,
        error.code,
        error.stack
      );

      // More descriptive error message
      let errorMessage = "Failed to start session";
      if (error.code === "permission-denied") {
        errorMessage = "Permission denied - check your login status";
      } else if (error.code === "not-found") {
        errorMessage = "Session document not found";
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleViewActiveSessions = () => {
    if (activeSession) {
      Alert.alert(
        "Active Session",
        `You have an active session: ${activeSession.topic}`,
        [
          { text: "Close", style: "cancel" },
          {
            text: "Rejoin",
            onPress: () => handleStartSession(activeSession),
          },
        ]
      );
    } else {
      Alert.alert(
        "No Active Sessions",
        "You have no active sessions at the moment."
      );
    }
  };

  const handleCreateSession = () => {
    Alert.prompt("Create New Session", "Enter session topic:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Create",
        onPress: async (topic) => {
          if (!topic) return;

          try {
            const newSession = {
              teacherId: auth.currentUser.uid,
              teacherName: teacherInfo?.name,
              topic: topic,
              status: "pending",
              type: "open",
              createdAt: new Date(),
              maxParticipants: 10,
            };

            await addDoc(collection(db, "sessionRequests"), newSession);
            Alert.alert("Success", "Session created successfully");
            fetchApprovedSessions();
          } catch (error) {
            console.error("Error creating session:", error);
            Alert.alert("Error", "Failed to create session");
          }
        },
      },
    ]);
  };

  const handleQuickNotification = () => {
    Alert.prompt(
      "Send Quick Notification",
      "Enter your message to students",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send",
          onPress: (message) => {
            Alert.alert("Notification Sent", message);
          },
        },
      ],
      "plain-text"
    );
  };

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.id}
      style={styles.actionCard}
      onPress={action.onPress}
    >
      <Ionicons name={action.icon} size={24} color={action.color} />
      <Text style={styles.actionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );

  const renderUpcomingSessions = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      );
    }

    if (approvedSessions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No upcoming sessions</Text>
        </View>
      );
    }

    return (
      <View style={styles.sessionsContainer}>
        {approvedSessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTopic}>
                {session.topic || "Untitled Session"}
              </Text>

              <Text style={styles.sessionSubject}>
                Subject: {session.teacherSubject || "Not specified"}
              </Text>

              {session.description && (
                <Text style={styles.sessionDescription} numberOfLines={2}>
                  {session.description}
                </Text>
              )}

              <Text style={styles.sessionStudent}>
                Student ID: {session.studentId || "No student assigned"}
              </Text>

              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.sessionTime}>
                  {session.requestedDate.toLocaleString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View style={styles.statusContainer}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{session.status}</Text>
                </View>
                {session.roomId && (
                  <Text style={styles.roomId}>Room: {session.roomId}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartSession(session)}
            >
              <Ionicons name="videocam" size={24} color="white" />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
          {activeSession && (
            <View style={styles.activeSessionBanner}>
              <Text style={styles.activeSessionText}>
                Active Session: {activeSession.topic}
              </Text>
              <TouchableOpacity
                onPress={() => handleStartSession(activeSession)}
                style={styles.rejoinButton}
              >
                <Text style={styles.rejoinButtonText}>Rejoin</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Teacher Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{approvedSessions.length}</Text>
            <Text style={styles.statLabel}>Upcoming Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {teacherInfo?.materials?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Materials</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {teacherInfo?.videos?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        {/* Material Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management</Text>
          <View style={styles.materialGrid}>
            {materialActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.materialCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
                <Text style={styles.materialTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          {renderUpcomingSessions()}
        </View>

        {/* Materials and Videos Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Uploads</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {teacherInfo?.recentUploads?.map((upload, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentUploadCard}
                onPress={() =>
                  router.push(
                    upload.type === "video"
                      ? "/teacher/view-videos"
                      : "/teacher/view_materials"
                  )
                }
              >
                <Ionicons
                  name={upload.type === "video" ? "videocam" : "document"}
                  size={24}
                  color="#2196F3"
                />
                <Text style={styles.uploadTitle}>{upload.name}</Text>
                <Text style={styles.uploadDate}>
                  {new Date(upload.uploadedAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleQuickNotification}
        >
          <Ionicons
            name="notifications"
            size={24}
            color="white"
            style={styles.notificationIcon}
          />
          <Text style={styles.notificationButtonText}>
            Send Quick Notification
          </Text>
        </TouchableOpacity>

        <View style={styles.callButtonContainer}>
          <CallButton roomId="optional-custom-room-id" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  activeSessionBanner: {
    backgroundColor: "#E91E63",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeSessionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  rejoinButton: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  rejoinButtonText: {
    color: "#E91E63",
    fontWeight: "600",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  sessionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 10,
  },
  sessionTopic: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  sessionSubject: {
    fontSize: 15,
    color: "#2196F3",
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  sessionStudent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  roomId: {
    fontSize: 12,
    color: "#666",
  },
  startButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  startButtonText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "bold",
  },
  noSessionsText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  actionCard: {
    width: "45%",
    backgroundColor: "white",
    padding: 15,
    margin: 5,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 15,
    justifyContent: "space-around",
    backgroundColor: "white",
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    alignItems: "center",
    padding: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  materialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 10,
  },
  materialCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  materialTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#333",
  },
  recentUploadCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginRight: 15,
    width: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  uploadDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  notificationButton: {
    flexDirection: "row",
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  notificationIcon: {
    marginRight: 10,
  },
  notificationButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  callButtonContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  sessionsContainer: {
    padding: 10,
  },
});

