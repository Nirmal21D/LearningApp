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
import { Ionicons } from "@expo/vector-icons";

const ApprovedSessionsSection = ({ sessions, onStartSession }) => {
    if (!sessions || sessions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No upcoming sessions</Text>
        </View>
      );
    }
  
    return (
      <View style={styles.sessionsContainer}>
        {sessions.map((session) => (
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
                Student: {session.studentName || "Pending"}
              </Text>
              
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.sessionTime}>
                  {new Date(session.requestedDate).toLocaleString()}
                </Text>
              </View>
  
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, {
                  backgroundColor: session.status === 'approved' ? '#4CAF50' : '#2196F3'
                }]}>
                  <Text style={styles.statusText}>{session.status}</Text>
                </View>
                {session.roomId && (
                  <Text style={styles.roomId}>Room: {session.roomId}</Text>
                )}
              </View>
            </View>
  
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => onStartSession(session)}
            >
              <Ionicons name="videocam" size={24} color="white" />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };
  
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTopic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ApprovedSessionsSection;