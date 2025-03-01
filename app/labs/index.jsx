import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, Platform } from "react-native";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { app } from "../../lib/firebase";
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

const db = getFirestore(app);

const Labs = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsCollection = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsCollection);
        const subjectsList = subjectsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubjects(subjectsList);
      } catch (err) {
        setError("Failed to load subjects.");
        console.error("Error fetching subjects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <SafeAreaView style={styles.container}>
        <Animated.View 
          entering={FadeInDown.duration(1000).springify()} 
          style={styles.main}
        >
          <View style={styles.topBarContainer}>
            <View style={styles.headerContainer}>
            <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
              <Text style={styles.title}>Virtual Labs</Text>
              <Text style={styles.subtitle}>Explore interactive science experiments</Text>
            </View>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Experiments</Text>
              <TouchableOpacity 
                style={[styles.seeAllButton, styles.glassEffect]}
                onPress={() => console.log("See All Pressed")}
              >
                <Text style={styles.seeAllButtonText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subjectsGrid}>
              <TouchableOpacity
                style={[styles.subjectCard, styles.glassEffect]}
                onPress={() => {
                  router.push({
                    pathname: `/labs/EquivalentResistanceofResistors`,
                  });
                }}
              >
                <View style={[styles.subjectIconContainer, { backgroundColor: "rgba(33, 150, 243, 0.75)" }]}>
                  <Ionicons name="flash-outline" size={32} color="white" />
                </View>
                <Text style={styles.subjectName}>Breadboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subjectCard, styles.glassEffect]}
                onPress={() => {
                  router.push({
                    pathname: `/labs/Magnet`,
                  });
                }}
              >
                <View style={[styles.subjectIconContainer, { backgroundColor: "rgba(33, 150, 243, 0.75)" }]}>
                  <Ionicons name="magnet-outline" size={32} color="white" />
                </View>
                <Text style={styles.subjectName}>Magnet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subjectCard, styles.glassEffect]}
                onPress={() => {
                  router.push({
                    pathname: `/labs/exp3`,
                  });
                }}
              >
                <View style={[styles.subjectIconContainer, { backgroundColor: "rgba(33, 150, 243, 0.75)" }]}>
                  <Ionicons name="hardware-chip-outline" size={32} color="white" />
                </View>
                <Text style={styles.subjectName}>Equivalent Resistance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subjectCard, styles.glassEffect]}
                onPress={() => {
                  router.push({
                    pathname: `/labs/reflection`,
                  });
                }}
              >
                <View style={[styles.subjectIconContainer, { backgroundColor: "rgba(33, 150, 243, 0.75)" }]}>
                  <Ionicons name="prism-outline" size={32} color="white" />
                </View>
                <Text style={styles.subjectName}>Snell's Law</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'flex-start',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  contentContainer: {
    marginTop: Platform.OS === 'web' ? 100 : 160,
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
  },
  topBarContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: Platform.OS === 'web' ? 20 : 16,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    height: Platform.OS === 'web' ? 130 : 260,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 14,
    color: '#666',
    lineHeight: 15,
    marginRight: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: '#1A237E',
  },
  seeAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  seeAllButtonText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: '600',
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  subjectCard: {
    width: "48%",
    padding: 15,
    marginBottom: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  subjectIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: '#333',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 20 : 10,
    left: Platform.OS === 'web' ? -80 : -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: Platform.OS === 'web' ? 220 : 180,
    height: Platform.OS === 'web' ? 220 : 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 390 : 320,
    right: Platform.OS === 'web' ? -40 : -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: Platform.OS === 'web' ? 200 : 160,
    height: Platform.OS === 'web' ? 200 : 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    // elevation: 3,
  },

});

export default Labs;