import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Ensure you're using Expo or install separately
import { app } from "../../lib/firebase"; // Ensure Firebase is configured
import { useRouter, Link } from 'expo-router';
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
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Subjects</Text>
        <TouchableOpacity onPress={() => console.log("See All Pressed")}>
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subjectsGrid}>
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={styles.subjectCard}
            onPress={() =>{
                router.push({
                    pathname: `/labs/EquivalentResistanceofResistors`,
                
                  });
            }}
          >
            <View style={[styles.subjectIconContainer, { backgroundColor: subject.color || "#3498db" }]}>
              <Ionicons name={subject.icon || "book"} size={32} color="white" />
            </View>
            <Text style={styles.subjectName}>{subject.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  seeAllButton: {
    fontSize: 16,
    color: "#007bff",
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  subjectCard: {
    width: "48%",
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
  },
  subjectIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
});

export default Labs;
