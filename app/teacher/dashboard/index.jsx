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
  Linking,
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
  onSnapshot,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import CallButton from "@/components/CallButton";
import { ref, push } from 'firebase/database';
import { signOut, getAuth } from "firebase/auth";
import { getDatabase } from 'firebase/database';

export default function TeacherDashboard() {
    const router = useRouter();
    const auth = getAuth();
    const [approvedSessions, setApprovedSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [subjectProgress, setSubjectProgress] = useState({});
    const database = getDatabase();

    useEffect(() => {
        checkTeacherApproval();
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

    const checkTeacherApproval = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                router.replace('/login');
                return;
            }

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                Alert.alert('Error', 'Teacher profile not found');
                router.replace('/login');
                return;
            }

            const userData = userDoc.data();
            
            // Check if user is a teacher first
            if (userData.userType !== 'teacher') {
                Alert.alert('Error', 'Invalid user type');
                router.replace('/login');
                return;
            }

            // Set teacher info regardless of approval status
            setTeacherInfo(userData);

            // Only redirect if not approved
            if (!userData.approved) {
                router.replace('/teacher/waiting-approval');
                return;
            }

            setIsLoading(false);
        } catch (error) {
            console.error('Error checking teacher approval:', error);
            Alert.alert('Error', 'Failed to verify teacher status');
            router.replace('/login');
        }
    };

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
            if (!auth.currentUser) return;
            
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                setTeacherInfo({
                    id: userDoc.id,
                    ...userData,
                    materials: userData.materials || [],
                    videos: userData.videos || []
                });
            }
        } catch (error) {
            console.error("Error fetching teacher info:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth); // Sign out the user
            router.replace("/login"); // Redirect to the login screen
        } catch (error) {
            console.error("Error logging out:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
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

    // Add this useEffect to check the current state
    useEffect(() => {
        console.log("Current approvedSessions state:", approvedSessions);
    }, [approvedSessions]);
    // Add this temporary check in your component
    useEffect(() => {
        const checkSession = async () => {
            const docRef = doc(db, "sessionRequests", "YOUR_SESSION_ID");
            const docSnap = await getDoc(docRef);
            console.log("Direct session check:", docSnap.data());
        };
        checkSession();
    }, []);

    const markSessionInactive = async (sessionId) => {
        try {
            const sessionRef = doc(db, "sessionRequests", sessionId);
            await updateDoc(sessionRef, {
                status: "completed",
                endTime: new Date(),
                duration: 60, // duration in minutes
            });
        } catch (error) {
            console.error("Error marking session inactive:", error);
        }
    };

    const handleStartSession = async (session) => {
        try {
            if (!session || !session.id) {
                console.error("Invalid session data", session);
                Alert.alert("Error", "Session data is invalid");
                return;
            }

            // Generate a safe room ID with teacher prefix
            const safeRoomId = `teacher_${auth.currentUser.uid}_${Date.now()}`;
            const teacherName = encodeURIComponent(auth.currentUser.displayName || auth.currentUser.email || 'Teacher');
            
            // Use meet.jit.si with advanced configuration
            const jitsiUrl = `https://meet.jit.si/${safeRoomId}#config.prejoinPageEnabled=false&userInfo.displayName=${teacherName}&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableModeratorIndicator=false&config.enableLobbyChat=true&config.enableWelcomePage=false&config.enableClosePage=false&config.disableDeepLinking=true&config.p2p.enabled=true&config.resolution=720&config.constraints.video.height.ideal=720&config.constraints.video.width.ideal=1280`;

            const startTime = new Date();
            
            // Update the session document with new meeting details
            const sessionRef = doc(db, "sessionRequests", session.id);
            await updateDoc(sessionRef, {
                roomId: safeRoomId,
                status: "in-progress",
                startTime: startTime,
                meetingUrl: jitsiUrl,
                platform: "meet.jit.si",
                teacherName: auth.currentUser.displayName || auth.currentUser.email
            });

            // Schedule session to be marked as inactive after 1 hour
            setTimeout(() => {
                markSessionInactive(session.id);
            }, 60 * 60 * 1000); // 1 hour in milliseconds

            // Share meeting link with student
            const studentMessageData = {
                text: jitsiUrl,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || auth.currentUser.email,
                senderEmail: auth.currentUser.email,
                isTeacher: true,
                timestamp: Date.now(),
                type: 'meeting',
                platform: 'meet.jit.si',
                sessionId: session.id,
                topic: session.topic || 'Online Session'
            };

            // Create chat ID by sorting and joining IDs
            const chatId = [auth.currentUser.uid, session.studentId].sort().join('_');
            
            // Get reference to the chat messages using the initialized database
            const messagesRef = ref(database, `privateChats/${chatId}/messages`);
            
            // Share the meeting link in chat
            await push(messagesRef, studentMessageData);

            // Open meeting in browser for teacher
            await Linking.openURL(jitsiUrl);

        } catch (error) {
            console.error("Error starting session:", error);
            Alert.alert(
                "Error", 
                "Failed to start session. Please check your internet connection and try again."
            );
        }
    };

    // Add this useEffect to check for expired sessions
    useEffect(() => {
        const checkExpiredSessions = async () => {
            try {
                const sessionsRef = collection(db, "sessionRequests");
                const q = query(
                    sessionsRef,
                    where("teacherId", "==", auth.currentUser.uid),
                    where("status", "==", "in-progress")
                );

                const snapshot = await getDocs(q);
                
                snapshot.docs.forEach(async (doc) => {
                    const sessionData = doc.data();
                    if (sessionData.startTime) {
                        const startTime = sessionData.startTime.toDate();
                        const now = new Date();
                        const diffInHours = (now - startTime) / (1000 * 60 * 60);

                        // If session has been active for more than 1 hour
                        if (diffInHours >= 1) {
                            await markSessionInactive(doc.id);
                        }
                    }
                });
            } catch (error) {
                console.error("Error checking expired sessions:", error);
            }
        };

        // Check for expired sessions when component mounts
        checkExpiredSessions();

        // Set up interval to check every 5 minutes
        const interval = setInterval(checkExpiredSessions, 5 * 60 * 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, []);

    // Add a helper function to check if a session can be started
    const canStartSession = (session) => {
        const sessionTime = new Date(session.requestedDate.seconds * 1000);
        const now = new Date();
        const timeDiff = Math.abs(sessionTime - now) / 1000 / 60; // difference in minutes
        
        return session.status === 'approved' && timeDiff < 30; // Can start within 30 minutes of scheduled time
    };

    const renderSession = ({ item }) => {
        const sessionDate = item.requestedDate 
            ? new Date(item.requestedDate.seconds * 1000) 
            : new Date();

        const canStart = canStartSession(item);

        return (
            <View style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                    <Text style={styles.subject}>
                        {item.teacherSubject || 'No Subject'}
                    </Text>
                    <Text style={[
                        styles.status,
                        { color: item.status === 'approved' ? '#4CAF50' : '#FFA000' }
                    ]}>
                        {item.status || 'Pending'}
                    </Text>
                </View>

                <Text style={styles.topic} numberOfLines={2}>
                    Topic: {item.topic || 'No Topic'}
                </Text>

                {item.description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text style={styles.time}>
                        {sessionDate.toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </Text>
                </View>

                <View style={styles.studentInfo}>
                    <Ionicons name="person-outline" size={20} color="#666" />
                    <Text style={styles.studentText}>
                        Student: {item.studentId || 'No Student ID'}
                    </Text>
                </View>

                {canStart && (
                    <TouchableOpacity 
                        style={[
                            styles.startButton,
                            !canStart && styles.startButtonDisabled
                        ]}
                        onPress={() => handleStartSession(item)}
                        disabled={!canStart}
                    >
                        <Ionicons name="videocam" size={24} color="#fff" />
                        <Text style={styles.buttonText}>
                            {canStart ? 'Start Session' : 'Not Yet Time'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
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
        return (
            <View style={styles.sessionsHeader}>
                <View style={styles.sessionsTitleContainer}>
                    
                    <TouchableOpacity 
                        style={styles.reloadButton}
                        onPress={() => {
                            setLoading(true);
                            fetchApprovedSessions().finally(() => setLoading(false));
                        }}
                    >
                        <Ionicons name="refresh" size={20} color="#2196F3" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text style={styles.loadingText}>Loading sessions...</Text>
                    </View>
                ) : !approvedSessions || approvedSessions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No upcoming sessions</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.sessionsContainer}>
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
                                        <Text style={styles.sessionDescription}>
                                            {session.description}
                                        </Text>
                                    )}

                                    <Text style={styles.sessionTeacher}>
                                        Teacher: {session.teacherName || "Not specified"}
                                    </Text>

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
                                    <Ionicons name="play" size={20} color="white" />
                                    <Text style={styles.startButtonText}>Start</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    useEffect(() => {
        // Set up real-time listener for active sessions
        const listenToActiveSessions = () => {
            if (!auth.currentUser) return;

            const sessionsRef = collection(db, "sessionRequests");
            const q = query(
                sessionsRef,
                where("teacherId", "==", auth.currentUser.uid),
                where("status", "==", "in-progress")
            );

            // Set up real-time listener
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const activeSessionData = {
                        id: snapshot.docs[0].id,
                        ...snapshot.docs[0].data(),
                    };
                    setActiveSession(activeSessionData);
                } else {
                    setActiveSession(null);
                }
            }, (error) => {
                console.error("Error listening to active sessions:", error);
            });

            // Cleanup listener on unmount
            return () => unsubscribe();
        };

        listenToActiveSessions();
    }, []);

    const renderActiveSession = () => {
        if (!activeSession) return null;

        return (
            <View style={styles.activeSessionWrapper}>
                <View style={styles.activeSessionContainer}>
                    <View style={styles.activeSessionHeader}>
                        <View style={styles.activeSessionHeaderLeft}>
                            <Ionicons name="videocam" size={24} color="#fff" />
                            <Text style={styles.activeSessionHeaderText}>Live Session in Progress</Text>
                        </View>
                        <Text style={styles.activeSessionDuration}>
                            Started at {new Date(activeSession.startTime?.seconds * 1000).toLocaleTimeString()}
                        </Text>
                    </View>
                    
                    <View style={styles.activeSessionDetails}>
                        <Text style={styles.activeSessionTopic}>
                            {activeSession.topic || "Untitled Session"}
                        </Text>
                        
                        <View style={styles.activeSessionInfo}>
                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    Student: {activeSession.studentName || activeSession.studentId || "Unknown"}
                                </Text>
                            </View>
                            
                            {activeSession.roomId && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="key-outline" size={16} color="#666" />
                                    <Text style={styles.infoText}>Room: {activeSession.roomId}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.activeSessionActions}>
                            <TouchableOpacity 
                                style={styles.rejoinButton}
                                onPress={() => handleStartSession(activeSession)}
                            >
                                <Ionicons name="enter-outline" size={20} color="#fff" />
                                <Text style={styles.rejoinButtonText}>Rejoin Session</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.endButton}
                                onPress={() => {
                                    Alert.alert(
                                        "End Session",
                                        "Are you sure you want to end this session?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { 
                                                text: "End", 
                                                style: "destructive",
                                                onPress: () => markSessionInactive(activeSession.id)
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                                <Text style={styles.endButtonText}>End Session</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const fetchSubjectProgress = async () => {
        try {
            if (!teacherInfo || !teacherInfo.selectedSubject) return;

            const subjectRef = doc(db, 'subjects', teacherInfo.selectedSubject);
            const subjectDoc = await getDoc(subjectRef);

            if (subjectDoc.exists()) {
                const subjectData = subjectDoc.data();
                const totalVideos = Object.values(subjectData.videos || {}).reduce((acc, videos) => acc + videos.length, 0);
                const totalChapters = subjectData.chapters?.length || 0;
                
                // Get all student progress for this subject
                const progressRef = collection(db, 'userProgress');
                const q = query(progressRef, where('subjectId', '==', teacherInfo.selectedSubject));
                const progressSnapshot = await getDocs(q);
                
                const studentProgress = progressSnapshot.docs.map(doc => doc.data());
                const averageScore = studentProgress.length > 0 
                    ? Math.round(studentProgress.reduce((acc, curr) => acc + (curr.score?.percentage || 0), 0) / studentProgress.length)
                    : 0;

                setSubjectProgress({
                    name: subjectData.name,
                    totalVideos,
                    totalChapters,
                    averageScore,
                    totalStudents: studentProgress.length,
                    chapters: subjectData.chapters || []
                });
            }
        } catch (error) {
            console.error('Error fetching subject progress:', error);
        }
    };

    useEffect(() => {
        if (teacherInfo) {
            fetchSubjectProgress();
        }
    }, [teacherInfo]);

    // Add this component before the Material Management Section
    const renderSubjectProgress = () => {
        if (!subjectProgress.name) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subject Progress - {subjectProgress.name}</Text>
                <View style={styles.subjectProgressCard}>
                    <View style={styles.subjectProgressStats}>
                        <View style={styles.progressStat}>
                            <Text style={styles.progressStatNumber}>{subjectProgress.totalStudents}</Text>
                            <Text style={styles.progressStatLabel}>Active Students</Text>
                        </View>
                        <View style={styles.progressStat}>
                            <Text style={styles.progressStatNumber}>{subjectProgress.averageScore}%</Text>
                            <Text style={styles.progressStatLabel}>Average Score</Text>
                        </View>
                        <View style={styles.progressStat}>
                            <Text style={styles.progressStatNumber}>{subjectProgress.totalVideos}</Text>
                            <Text style={styles.progressStatLabel}>Total Videos</Text>
                        </View>
                    </View>

                    <Text style={styles.chaptersTitle}>Chapters</Text>
                    <ScrollView style={styles.chaptersContainer}>
                        {subjectProgress.chapters.map((chapter, index) => (
                            <View key={index} style={styles.chapterItem}>
                                <Text style={styles.chapterName}>{chapter}</Text>
                                <TouchableOpacity 
                                    style={styles.viewDetailsButton}
                                    onPress={() => router.push(`/teacher/chapter-details/${index}`)}
                                >
                                    <Text style={styles.viewDetailsText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.title}>Teacher Dashboard</Text>
                    <Text style={styles.subtitle}>Welcome back!</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color="#E91E63" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Active Session Section - Moved outside header */}
                {activeSession && (
                    <View style={styles.activeSessionWrapper}>
                        <View style={styles.activeSessionContainer}>
                            <View style={styles.activeSessionHeader}>
                                <View style={styles.activeSessionHeaderLeft}>
                                    <Ionicons name="videocam" size={24} color="#fff" />
                                    <Text style={styles.activeSessionHeaderText}>Live Session in Progress</Text>
                                </View>
                                <Text style={styles.activeSessionDuration}>
                                    Started at {new Date(activeSession.startTime?.seconds * 1000).toLocaleTimeString()}
                                </Text>
                            </View>
                                
                            <View style={styles.activeSessionDetails}>
                                <Text style={styles.activeSessionTopic}>
                                    {activeSession.topic || "Untitled Session"}
                                </Text>
                                    
                                <View style={styles.activeSessionInfo}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="person-outline" size={16} color="#666" />
                                        <Text style={styles.infoText}>
                                            Student: {activeSession.studentName || activeSession.studentId || "Unknown"}
                                        </Text>
                                    </View>
                                        
                                    {activeSession.roomId && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="key-outline" size={16} color="#666" />
                                            <Text style={styles.infoText}>Room: {activeSession.roomId}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.activeSessionActions}>
                                    <TouchableOpacity 
                                        style={styles.rejoinButton}
                                        onPress={() => handleStartSession(activeSession)}
                                    >
                                        <Ionicons name="enter-outline" size={20} color="#fff" />
                                        <Text style={styles.rejoinButtonText}>Rejoin Session</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.endButton}
                                        onPress={() => {
                                            Alert.alert(
                                                "End Session",
                                                "Are you sure you want to end this session?",
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    { 
                                                        text: "End", 
                                                        style: "destructive",
                                                        onPress: () => markSessionInactive(activeSession.id)
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Ionicons name="close-circle-outline" size={20} color="#fff" />
                                        <Text style={styles.endButtonText}>End Session</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

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

                {/* Subject Progress Section */}
                {renderSubjectProgress()}

                {/* Upcoming Sessions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
                    {renderUpcomingSessions()}
                </View>

                {/* Materials and Videos Quick Access */}
                <View style={styles.section}>
                    
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
    activeSessionWrapper: {
        padding: 15,
        backgroundColor: '#f8d7da', // Light red background
        borderBottomWidth: 1,
        borderBottomColor: '#f5c6cb',
    },
    activeSessionContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    activeSessionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    activeSessionDuration: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
    activeSessionHeader: {
        backgroundColor: '#dc3545', // Darker red for header
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    activeSessionHeaderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    activeSessionDetails: {
        padding: 15,
    },
    activeSessionTopic: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    activeSessionInfo: {
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
    },
    activeSessionActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    rejoinButton: {
        flex: 1,
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    rejoinButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    endButton: {
        flex: 1,
        backgroundColor: '#FF5252',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    endButtonText: {
        color: '#fff',
        fontWeight: '600',
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
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
    startButtonDisabled: {
        backgroundColor: '#BDBDBD',
        opacity: 0.7
    },
    logoutButton: {
        position: 'absolute',
        right: 20,
        top: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoutButtonText: {
        marginLeft: 5,
        color: '#E91E63',
        fontWeight: '600',
    },
    sessionsHeader: {
        flex: 1,
    },
    sessionsTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    reloadButton: {
        backgroundColor: '#E3F2FD',
        padding: 8,
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    subjectProgressCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    subjectProgressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    progressStat: {
        alignItems: 'center',
        flex: 1,
    },
    progressStatNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 4,
    },
    progressStatLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    chaptersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    chaptersContainer: {
        maxHeight: 200,
    },
    chapterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    chapterName: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    viewDetailsButton: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    viewDetailsText: {
        color: '#2196F3',
        fontSize: 12,
        fontWeight: '500',
    },
});
