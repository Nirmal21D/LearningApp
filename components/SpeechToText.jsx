import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Voice from "@react-native-voice/voice";

const SpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e) => setText(e.value[0]);
    Voice.onSpeechError = (e) => setError(e.error);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startListening = async () => {
    try {
      setText("");
      setError("");
      await Voice.start("en-US");
    } catch (err) {
      setError(err.message);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Speech to Text</Text>
      <Text style={styles.text}>{text || "Start Speaking..."}</Text>
      {error ? <Text style={styles.error}>Error: {error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.buttonText}>{isListening ? "Stop" : "Start"} Listening</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  text: { fontSize: 18, textAlign: "center", marginBottom: 20 },
  error: { fontSize: 16, color: "red", marginBottom: 10 },
  button: { backgroundColor: "#007bff", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 18 },
});

export default SpeechToText;
