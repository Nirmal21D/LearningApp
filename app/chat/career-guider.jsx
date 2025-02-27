import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { auth } from "@/lib/firebase";
import CareerChatComponent from "@/components/CareerChatComponent";

export default function GuiderCareerChat() {
  const { studentId, studentName, guiderId } = useLocalSearchParams();
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    // If studentId is passed and either current user is the guider or guiderId is passed
    if (studentId && (auth.currentUser?.uid === guiderId || guiderId)) {
      // Create a consistent chat ID by sorting the IDs and joining them
      const guiderActualId = guiderId || auth.currentUser.uid;
      const generatedChatId = [studentId, guiderActualId].sort().join('_');
      setChatId(generatedChatId);
    }
  }, [studentId, guiderId]);

  return (
    <SafeAreaView style={styles.container}>
      <CareerChatComponent
        chatId={chatId}
        otherUserId={studentId}
        otherUserName={studentName || "Student"}
        isGuider={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
});