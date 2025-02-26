import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Platform,  ProgressViewIOS } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    useSharedValue 
} from 'react-native-reanimated';
import { ProgressBar } from 'react-native-paper';


// Reuse your AnimatedPressable component
const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

const InteractiveContainer = ({ children, style, onPress, disabled }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <AnimatedPressable
            onPressIn={() => {
                if (!disabled) scale.value = withSpring(0.98);
            }}
            onPressOut={() => {
                if (!disabled) scale.value = withSpring(1);
            }}
            onPress={disabled ? null : onPress}
            style={[animatedStyle, style, disabled && styles.disabledButton]}
            disabled={disabled}
        >
            {children}
        </AnimatedPressable>
    );
};

// Progress bar component that works on both platforms
const ProgressBarComponent = ({ progress }) => (
    Platform.OS === 'ios' ? (
        <ProgressViewIOS progress={progress} progressTintColor="#2196F3" />
    ) : (
        <ProgressBar progress={progress} color="#2196F3" />
    )
);


const ExcelUpload = ({ onQuestionsLoaded, setSelectedSubject, setSelectedChapter, setTitle, setDescription, setDuration }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);

    const selectFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/octet-stream'
                ],
                copyToCacheDirectory: true
            });
            
            if (result.canceled) {
                return;
            }
            
            setFile(result.assets[0]);
            setUploadStatus('File selected: ' + result.assets[0].name);
        } catch (error) {
            console.error('Error selecting file:', error);
            Alert.alert('Error', 'Failed to select file');
        }
    };

    const processExcel = async () => {
        if (!file) {
            Alert.alert('Error', 'Please select a file first');
            return;
        }

        setLoading(true);
        setShowProgress(true);
        setProgress(0);
        setUploadStatus('Processing file...');

        try {
            // Simulate progress for large files
            // For actual large files, you would update progress as you process chunks of data
            const progressTimer = setInterval(() => {
                setProgress(prevProgress => {
                    const newProgress = prevProgress + 0.05;
                    if (newProgress >= 0.9) {
                        clearInterval(progressTimer);
                        return 0.9; // Save the last 10% for final processing
                    }
                    return newProgress;
                });
            }, 100);

            // Read the file
            const fileUri = file.uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Parse Excel file
            const workbook = XLSX.read(fileContent, { type: 'base64' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Extract test details from metadata sheet if available
            if (workbook.SheetNames.includes('Metadata')) {
                const metadataSheet = workbook.Sheets['Metadata'];
                const metadata = XLSX.utils.sheet_to_json(metadataSheet)[0] || {};
                
                if (metadata.title) setTitle(metadata.title);
                if (metadata.description) setDescription(metadata.description);
                if (metadata.subject) setSelectedSubject(metadata.subject);
                if (metadata.chapter) setSelectedChapter(metadata.chapter);
                if (metadata.duration) setDuration(metadata.duration.toString());
            }

            setProgress(0.95); // Almost done

            // Process questions
            const formattedQuestions = jsonData.map(row => {
                // Detect if it's MCQ or text based on presence of options
                const hasOptions = row.optionA || row.option_a || row['option a'] || row['Option A'];
                
                if (hasOptions) {
                    // Handle MCQ format
                    const options = [];
                    
                    // Try different possible column naming conventions
                    const optionFields = ['A', 'B', 'C', 'D'].map(letter => {
                        return ['option' + letter, 'option_' + letter, 'option ' + letter, 'Option ' + letter, 'Option' + letter];
                    }).flat();
                    
                    // Extract options using various possible column names
                    for (let i = 0; i < 4; i++) {
                        const letter = String.fromCharCode(65 + i); // A, B, C, D
                        const value = row['option' + letter] || row['option_' + letter] || 
                                     row['option ' + letter] || row['Option ' + letter] || 
                                     row['Option' + letter] || '';
                        options.push(value);
                    }
                    
                    // Extract the correct answer
                    let answer = '';
                    const answerValue = row.answer || row.correct_answer || row['correct answer'] || row.correctAnswer || '';
                    
                    // If answer is specified as A, B, C, D, convert to the actual option value
                    if (answerValue && answerValue.length === 1 && 'ABCD'.includes(answerValue)) {
                        const index = answerValue.charCodeAt(0) - 65; // Convert A->0, B->1, etc.
                        if (options[index]) {
                            answer = options[index];
                        }
                    } else {
                        // If answer is the actual text of the option
                        answer = answerValue;
                    }
                    
                    return {
                        type: 'multiple_choice',
                        question: row.question || '',
                        options: options,
                        answer: answer,
                        correctOption: answer
                    };
                } else {
                    // Handle text question format
                    return {
                        type: 'text',
                        question: row.question || '',
                        answer: row.answer || ''
                    };
                }
            });

            clearInterval(progressTimer);
            setProgress(1); // Complete

            // Validate questions
            const validQuestions = formattedQuestions.filter(q => {
                if (!q.question) return false;
                
                if (q.type === 'multiple_choice') {
                    return q.options.some(opt => opt) && q.answer;
                } else {
                    return q.answer;
                }
            });

            if (validQuestions.length === 0) {
                Alert.alert('Error', 'No valid questions found in the Excel file. Please check the format.');
                setLoading(false);
                setShowProgress(false);
                return;
            }

            onQuestionsLoaded(validQuestions);
            setUploadStatus(`Success! Loaded ${validQuestions.length} questions`);
            Alert.alert('Success', `Loaded ${validQuestions.length} questions from Excel file`);
            
            // Hide progress bar after a delay
            setTimeout(() => {
                setShowProgress(false);
            }, 500);
            
        } catch (error) {
            console.error('Error processing Excel:', error);
            Alert.alert('Error', 'Failed to process Excel file. Please check the format.');
            setUploadStatus('Error processing file');
            setShowProgress(false);
        } finally {
            setLoading(false);
        }
    };

    const createAndDownloadTemplate = async () => {
        try {
            setUploadStatus('Creating template...');
            
            // Create workbook with two sheets
            const wb = XLSX.utils.book_new();
            
            // Create Questions sheet with example data
            const questionsData = [
                {
                    question: "What is the capital of France?",
                    optionA: "London",
                    optionB: "Berlin",
                    optionC: "Paris",
                    optionD: "Madrid",
                    answer: "C"  // Can be "C" or "Paris"
                },
                {
                    question: "What is 2+2?",
                    optionA: "3",
                    optionB: "4",
                    optionC: "5",
                    optionD: "6",
                    answer: "4"  // Can be "B" or "4"
                },
                {
                    question: "Name a planet in our solar system.",
                    answer: "Earth"  // Text question example
                }
            ];
            
            const questionsWs = XLSX.utils.json_to_sheet(questionsData);
            XLSX.utils.book_append_sheet(wb, questionsWs, "Questions");
            
            // Create Metadata sheet
            const metadataData = [
                {
                    title: "Sample Quiz",
                    description: "This is a sample quiz created from an Excel template",
                    subject: "",  // This would be your subject ID
                    chapter: "Chapter 1",
                    duration: 30
                }
            ];
            
            const metadataWs = XLSX.utils.json_to_sheet(metadataData);
            XLSX.utils.book_append_sheet(wb, metadataWs, "Metadata");
            
            // Generate Excel file
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            
            // Create a temporary file path
            const templateDir = FileSystem.cacheDirectory + 'templates/';
            const templatePath = templateDir + 'quiz_template.xlsx';
            
            // Ensure directory exists
            await FileSystem.makeDirectoryAsync(templateDir, { intermediates: true }).catch(() => {});
            
            // Write the file
            await FileSystem.writeAsStringAsync(templatePath, wbout, {
                encoding: FileSystem.EncodingType.Base64
            });
            
            // Check if sharing is available
            const isSharingAvailable = await Sharing.isAvailableAsync();
            
            if (isSharingAvailable) {
                // Share the file
                await Sharing.shareAsync(templatePath, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Download Quiz Template',
                    UTI: 'com.microsoft.excel.xlsx'
                });
                setUploadStatus('Template downloaded successfully');
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
                setUploadStatus('Failed to download template');
            }
        } catch (error) {
            console.error('Error creating template:', error);
            Alert.alert('Error', 'Failed to create template');
            setUploadStatus('Error creating template');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Import from Excel</Text>
            
            <Text style={styles.instructions}>
                Upload an Excel file with questions. The file should have columns for 'question', 'answer', 
                and for multiple choice questions: 'optionA', 'optionB', 'optionC', 'optionD'.
            </Text>
            
            <InteractiveContainer
                style={styles.templateButton}
                onPress={createAndDownloadTemplate}
                disabled={loading}
            >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Download Template</Text>
            </InteractiveContainer>
            
            <InteractiveContainer
                style={styles.uploadButton}
                onPress={selectFile}
                disabled={loading}
            >
                <Ionicons name="cloud-upload-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Select Excel File</Text>
            </InteractiveContainer>
            
            {file && (
                <View style={styles.fileInfo}>
                    <Ionicons name="document-outline" size={20} color="#2196F3" />
                    <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                        {file.name}
                    </Text>
                </View>
            )}
            
            {uploadStatus ? (
                <Text style={styles.statusText}>{uploadStatus}</Text>
            ) : null}
            
            {showProgress && (
                <View style={styles.progressContainer}>
                    <ProgressBarComponent progress={progress} />
                    <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                </View>
            )}
            
            <InteractiveContainer 
                style={styles.processButton}
                onPress={processExcel}
                disabled={!file || loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" size="small" />
                ) : (
                    <>
                        <Ionicons name="play-outline" size={24} color="white" />
                        <Text style={styles.buttonText}>Process File</Text>
                    </>
                )}
            </InteractiveContainer>

            <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>Excel File Format:</Text>
                <Text style={styles.exampleText}>
                    • For MCQs: columns for question, optionA, optionB, optionC, optionD, answer{'\n'}
                    • For text questions: columns for question, answer{'\n'}
                    • Optional 'Metadata' sheet with title, description, subject, chapter, duration
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    instructions: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    templateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF9800',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        gap: 8,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        gap: 8,
    },
    processButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        marginVertical: 10,
    },
    fileName: {
        marginLeft: 10,
        color: '#2196F3',
        fontSize: 14,
        flex: 1,
    },
    statusText: {
        color: '#666',
        marginVertical: 10,
        fontSize: 14,
    },
    progressContainer: {
        marginVertical: 10,
    },
    progressText: {
        textAlign: 'right',
        marginTop: 5,
        fontSize: 12,
        color: '#666',
    },
    exampleContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 15,
        marginTop: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    exampleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    exampleText: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default ExcelUpload;