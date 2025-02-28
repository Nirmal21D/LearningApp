import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export default function TextExtractor() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageSize, setImageSize] = useState(null);

  // Get your free API key from https://ocr.space/ocrapi
  const OCR_API_KEY = 'K87997681688957';
  
  // API size limit in KB
  const MAX_FILE_SIZE = 1024;

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return false;
      }
    }
    return true;
  };

  const compressImage = async (uri) => {
    try {
      // Get file info to check original size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const originalSizeKB = fileInfo.size / 1024;
      setImageSize({
        original: originalSizeKB.toFixed(2) + ' KB'
      });
      
      // If already under size limit, no need to compress
      if (fileInfo.size <= MAX_FILE_SIZE * 1024) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setImageSize(prev => ({
          ...prev,
          compressed: 'No compression needed',
          status: 'Original image used'
        }));
        return base64;
      }
      
      // Calculate minimal necessary compression
      // Start with high quality to preserve readability
      let quality = 0.9;
      
      // Only use lower quality for significantly oversized images
      if (originalSizeKB > MAX_FILE_SIZE * 2) {
        quality = 0.8;
      }
      if (originalSizeKB > MAX_FILE_SIZE * 4) {
        quality = 0.7;
      }
      
      // Compress the image with minimal compression
      const manipResult = await manipulateAsync(
        uri,
        [], // no resize or other manipulations
        { compress: quality, format: SaveFormat.JPEG }
      );
      
      // Get compressed file info
      const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri);
      const compressedSizeKB = compressedInfo.size / 1024;
      
      // If still too large but not by much, try a bit more compression
      if (compressedInfo.size > MAX_FILE_SIZE * 1024 && compressedInfo.size < MAX_FILE_SIZE * 1.5 * 1024) {
        const slightlyMoreCompressed = await manipulateAsync(
          manipResult.uri,
          [], 
          { compress: quality - 0.1, format: SaveFormat.JPEG }
        );
        
        const finalInfo = await FileSystem.getInfoAsync(slightlyMoreCompressed.uri);
        setImageSize(prev => ({
          ...prev,
          compressed: (finalInfo.size / 1024).toFixed(2) + ' KB',
          status: 'Slight compression applied'
        }));
        
        const base64 = await FileSystem.readAsStringAsync(slightlyMoreCompressed.uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        return base64;
      }
      
      // If still way too large, we need to resize the image
      if (compressedInfo.size > MAX_FILE_SIZE * 1024) {
        // Calculate resize factor based on how much we're over the limit
        const resizeFactor = Math.sqrt(MAX_FILE_SIZE / compressedSizeKB) * 0.9; // 10% buffer
        
        const resizeCompressResult = await manipulateAsync(
          uri,
          [{ resize: { width: Math.floor(fileInfo.width * resizeFactor) } }],
          { compress: quality, format: SaveFormat.JPEG }
        );
        
        const resizedInfo = await FileSystem.getInfoAsync(resizeCompressResult.uri);
        setImageSize(prev => ({
          ...prev,
          compressed: (resizedInfo.size / 1024).toFixed(2) + ' KB',
          status: 'Resized to preserve text quality'
        }));
        
        const base64 = await FileSystem.readAsStringAsync(resizeCompressResult.uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        return base64;
      }
      
      // If first compression was enough
      setImageSize(prev => ({
        ...prev,
        compressed: compressedSizeKB.toFixed(2) + ' KB',
        status: 'Minimal compression applied'
      }));
      
      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      return base64;
    } catch (err) {
      console.error('Compression error:', err);
      throw new Error('Failed to process image: ' + err.message);
    }
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      setLoading(true);
      setError('');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1, // Request highest quality from picker
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        // Process and get base64
        const base64Image = await compressImage(result.assets[0].uri);
        extractText(base64Image);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Error picking image: ' + err.message);
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to make this work!');
        return;
      }

      setLoading(true);
      setError('');
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1, // Request highest quality
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        // Process and get base64
        const base64Image = await compressImage(result.assets[0].uri);
        extractText(base64Image);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Error taking photo: ' + err.message);
      setLoading(false);
    }
  };

  const extractText = async (base64Image) => {
    try {
      // Loading indicator is already set in the picker/camera functions

      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('filetype', 'jpg');
      formData.append('OCREngine', '2');
      formData.append('detectOrientation', 'true');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          apikey: OCR_API_KEY,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.ErrorMessage) {
        throw new Error(data.ErrorMessage[0]);
      }

      if (data.ParsedResults && data.ParsedResults.length > 0) {
        setExtractedText(data.ParsedResults[0].ParsedText);
      } else {
        setExtractedText('No text found in image');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Error extracting text: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(extractedText);
      alert('Text copied to clipboard!');
    } catch (err) {
      setError('Error copying to clipboard: ' + err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Text Extractor</Text>
        <Text style={styles.subtitle}>Extract text from images with smart processing</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Ionicons name="images-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          {imageSize && (
            <View style={styles.sizeInfo}>
              <Text style={styles.sizeText}>Original: {imageSize.original}</Text>
              {imageSize.compressed && (
                <Text style={styles.sizeText}>After processing: {imageSize.compressed}</Text>
              )}
              {imageSize.status && (
                <Text style={styles.sizeStatus}>{imageSize.status}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      )}

      {extractedText ? (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Extracted Text</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={20} color="#0066cc" />
            </TouchableOpacity>
          </View>
          <Text style={styles.extractedText}>{extractedText}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 10,
    width: '45%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    marginVertical: 20,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  sizeInfo: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sizeText: {
    fontSize: 12,
    color: '#666',
  },
  sizeStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0066cc',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  copyButton: {
    padding: 5,
  },
  extractedText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  error: {
    color: '#ff3b30',
    marginVertical: 10,
    textAlign: 'center',
  },
});