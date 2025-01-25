import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { db } from '../components/Shared/firebaseConfig'; // Firebase configuration

const UploadMaterials = ({ subjectId, chapterId }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert("Error", "Please select a file to upload");
            return;
        }
        // Upload logic here (e.g., to Firebase Storage)
        // After uploading, associate the file with the chapter in Firestore
        try {
            await db.collection('chapters').doc(chapterId).update({
                materials: firebase.firestore.FieldValue.arrayUnion(selectedFile.uri)
            });
            Alert.alert("Success", "Material uploaded successfully!");
        } catch (error) {
            Alert.alert("Error", "Failed to upload material: " + error.message);
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({});
        if (result.type === 'success') {
            setSelectedFile(result);
        }
    };

    return (
        <View>
            <Button title="Select File" onPress={pickDocument} />
            <Button title="Upload" onPress={handleUpload} />
        </View>
    );
};

export default UploadMaterials; 