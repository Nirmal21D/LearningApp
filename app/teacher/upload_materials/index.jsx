import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  where,
  query,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase.js";

export default function UploadMaterial() {
  const [curriculums, setCurriculums] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const curriculumQuery = query(collection(db, "curriculums"));
        const curriculumSnapshot = await getDocs(curriculumQuery);

        const curriculumList = curriculumSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCurriculums(curriculumList);
      } catch (error) {
        console.error("Error fetching curriculums:", error);
        Alert.alert("Error", "Could not load curriculums");
      }
    };

    fetchCurriculums();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedCurriculum) {
        setSubjects([]);
        setSelectedSubject("");
        return;
      }

      try {
        const subjectQuery = query(
          collection(db, "subjects"),
          where("curriculumId", "==", selectedCurriculum)
        );
        const subjectSnapshot = await getDocs(subjectQuery);

        const subjectList = subjectSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSubjects(subjectList);
        setSelectedSubject("");
      } catch (error) {
        console.error("Error fetching subjects:", error);
        Alert.alert("Error", "Could not load subjects");
      }
    };

    fetchSubjects();
  }, [selectedCurriculum]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!selectedSubject) {
        setMaterials([]);
        setSelectedChapter("");
        return;
      }

      try {
        const subjectRef = doc(db, "subjects", selectedSubject);
        const subjectSnap = await getDoc(subjectRef);

        if (subjectSnap.exists()) {
          const materialsList = subjectSnap.data().materials || [];
          const chaptersList = subjectSnap.data().chapters || [];
          
          setMaterials([
            ...materialsList.map((material, index) => ({
              id: `material_${index}`,
              name: material,
            })),
            ...chaptersList.map((chapter, index) => ({
              id: `chapter_${index}`,
              name: chapter,
            })),
          ]);
        }
      } catch (error) {
        console.error("Error fetching materials:", error);
        Alert.alert("Error", "Could not load materials");
      }
    };

    fetchMaterials();
  }, [selectedSubject]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
      });

      if (result.type === "success") {
        // Get MIME type from file extension
        const uriParts = result.uri.split(".");
        const fileExtension = uriParts[uriParts.length - 1];
        let mimeType = "application/octet-stream";
        if (fileExtension === "pdf") {
          mimeType = "application/pdf";
        } else if (fileExtension === "doc" || fileExtension === "docx") {
          mimeType = "application/msword";
        } else if (fileExtension === "jpg" || fileExtension === "jpeg" || fileExtension === "png") {
          mimeType = "image/*";
        }
        result.mimeType = mimeType;

        // Validate file size (e.g., max 50MB)
        const fileSize = result.size || 0;
        if (fileSize > 50 * 1024 * 1024) {
          Alert.alert("Error", "File size exceeds 50MB limit");
          return;
        }
        setSelectedFile(result);
      }
    } catch (err) {
      console.error("Document pick error:", err);
      Alert.alert("Error", "Could not pick document");
    }
  };

  const uploadMaterial = async () => {
    if (!selectedFile || !selectedCurriculum || !selectedSubject || !selectedChapter) {
      Alert.alert("Error", "Please select all fields");
      return;
    }

    setIsUploading(true);

    try {
      const { uri, name, size, mimeType } = selectedFile;
      const response = await fetch(uri);
      const blob = await response.blob();

      // Generate unique filename
      const uniqueFileName = `${Date.now()}_${name}`;

      // Upload file to storage
      const storageRef = ref(
        storage,
        `materials/${selectedCurriculum}/${selectedSubject}/${selectedChapter}/${uniqueFileName}`
      );

      const uploadResult = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Save material metadata
      const materialDoc = await addDoc(collection(db, "materials"), {
        name: uniqueFileName,
        originalName: name,
        url: downloadURL,
        subjectId: selectedSubject,
        curriculumId: selectedCurriculum,
        chapterId: selectedChapter,
        uploadedAt: new Date(),
        fileType: mimeType,
        fileSize: size,
        difficulty: "beginner", // Default difficulty
        description: `Study material for ${selectedChapter}`,
      });

      // Update subject document to include material
      const subjectRef = doc(db, "subjects", selectedSubject);
      await updateDoc(subjectRef, {
        materials: arrayUnion(name),
      });

      // Reset form
      setSelectedFile(null);
      setIsUploading(false);

      // Success feedback
      Alert.alert(
        "Upload Successful",
        `${name} has been uploaded to ${selectedChapter}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      Alert.alert(
        "Upload Failed",
        "Please check your internet connection and try again",
        [{ text: "Retry" }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Study Material</Text>

      {/* Curriculum Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Curriculum:</Text>
        <Picker
          selectedValue={selectedCurriculum}
          onValueChange={(itemValue) => setSelectedCurriculum(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select Curriculum" value="" />
          {curriculums.map((curriculum) => (
            <Picker.Item
              key={curriculum.id}
              label={curriculum.title}
              value={curriculum.id}
            />
          ))}
        </Picker>
      </View>

      {/* Subject Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Subject:</Text>
        <Picker
          selectedValue={selectedSubject}
          onValueChange={(itemValue) => setSelectedSubject(itemValue)}
          style={styles.picker}
          enabled={!!selectedCurriculum}
        >
          <Picker.Item label="Select Subject" value="" />
          {subjects.map((subject) => (
            <Picker.Item
              key={subject.id}
              label={subject.name}
              value={subject.id}
            />
          ))}
        </Picker>
      </View>

      {/* Material/Chapter Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Chapter/Material:</Text>
        <Picker
          selectedValue={selectedChapter}
          onValueChange={(itemValue) => setSelectedChapter(itemValue)}
          style={styles.picker}
          enabled={!!selectedSubject}
        >
          <Picker.Item label="Select Chapter/Material" value="" />
          {materials.map((material) => (
            <Picker.Item
              key={material.id}
              label={material.name}
              value={material.name}
            />
          ))}
        </Picker>
      </View>

      {/* Document Picker */}
      <TouchableOpacity 
        style={styles.pickButton} 
        onPress={pickDocument}
        disabled={!selectedCurriculum || !selectedSubject || !selectedChapter}
      >
        <Text style={styles.pickButtonText}>
          {selectedFile ? "Change Document" : "Pick a Document"}
        </Text>
      </TouchableOpacity>

      {/* File Details */}
      {selectedFile && (
        <View style={styles.fileDetailsContainer}>
          <Ionicons 
            name={
              selectedFile.name.toLowerCase().endsWith('.pdf') 
                ? "document-text" 
                : selectedFile.name.toLowerCase().match(/\.(jpg|jpeg|png)$/) 
                  ? "image" 
                  : "document"
            } 
            size={24} 
            color="#007bff" 
          />
          <View style={styles.fileDetailsText}>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedFile(null)}
            style={styles.removeFileButton}
          >
            <Ionicons name="close" size={20} color="red" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.uploadButton,
          (!selectedFile || !selectedCurriculum || !selectedSubject || !selectedChapter) && 
            styles.disabledButton
        ]}
        onPress={uploadMaterial}
        disabled={
          !selectedFile ||
          !selectedCurriculum ||
          !selectedSubject ||
          !selectedChapter ||
          isUploading
        }
      >
        {isUploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.uploadButtonText}>Upload Material</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6f9",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 20,
    padding: 10,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  pickButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  pickButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fileDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  fileDetailsText: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  fileSize: {
    fontSize: 14,
    color: "#666",
  },
  removeFileButton: {
    padding: 5,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
});
