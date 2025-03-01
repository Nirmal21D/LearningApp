import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageContent() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('materials'); // materials, videos, labs
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchContent();
    }, [activeTab]);

    const fetchContent = async () => {
        try {
            setLoading(true);
            const subjectsRef = collection(db, 'subjects');
            const subjectsSnapshot = await getDocs(subjectsRef);
            let allContent = [];

            for (const subjectDoc of subjectsSnapshot.docs) {
                const subjectData = subjectDoc.data();
                const subjectId = subjectDoc.id;

                if (activeTab === 'materials' && subjectData.materials) {
                    Object.entries(subjectData.materials).forEach(([chapterId, materials]) => {
                        materials.forEach(material => {
                            allContent.push({
                                ...material,
                                subjectId,
                                chapterId,
                                subjectName: subjectData.name,
                                type: 'material'
                            });
                        });
                    });
                }
                else if (activeTab === 'videos' && subjectData.videos) {
                    Object.entries(subjectData.videos).forEach(([chapterId, videos]) => {
                        videos.forEach(video => {
                            allContent.push({
                                ...video,
                                subjectId,
                                chapterId,
                                subjectName: subjectData.name,
                                type: 'video'
                            });
                        });
                    });
                }
            }

            setContent(allContent);
        } catch (error) {
            console.error('Error fetching content:', error);
            Alert.alert('Error', 'Failed to fetch content');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDeleteContent = async (item) => {
        try {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete this ${item.type}?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            const subjectRef = doc(db, 'subjects', item.subjectId);
                            const subjectSnap = await getDoc(subjectRef);
                            
                            if (!subjectSnap.exists()) {
                                throw new Error('Subject not found');
                            }

                            const subjectData = subjectSnap.data();
                            let updateData = {};

                            if (item.type === 'material' && subjectData.materials?.[item.chapterId]) {
                                const updatedMaterials = subjectData.materials[item.chapterId]
                                    .filter(m => m.url !== item.url);
                                updateData[`materials.${item.chapterId}`] = updatedMaterials;
                            }
                            else if (item.type === 'video' && subjectData.videos?.[item.chapterId]) {
                                const updatedVideos = subjectData.videos[item.chapterId]
                                    .filter(v => v.url !== item.url);
                                updateData[`videos.${item.chapterId}`] = updatedVideos;
                            }
                            else if (item.type === 'lab' && subjectData.labs?.[item.chapterId]) {
                                const updatedLabs = subjectData.labs[item.chapterId]
                                    .filter(l => l.url !== item.url);
                                updateData[`labs.${item.chapterId}`] = updatedLabs;
                            }

                            if (Object.keys(updateData).length > 0) {
                                await updateDoc(subjectRef, updateData);
                                setContent(prevContent => prevContent.filter(c => c.url !== item.url));
                                Alert.alert('Success', `${item.type} deleted successfully`);
                            } else {
                                throw new Error(`No ${item.type} found to delete`);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error deleting content:', error);
            Alert.alert('Error', `Failed to delete ${item.type}: ${error.message}`);
        }
    };

    const renderContentItem = ({ item }) => (
        <View style={styles.contentCard}>
            <View style={styles.contentInfo}>
                <Text style={styles.contentName}>{item.name}</Text>
                <Text style={styles.subjectName}>{item.subjectName}</Text>
                <View style={[
                    styles.typeBadge,
                    { backgroundColor: item.type === 'material' ? '#2196F3' : 
                                    item.type === 'video' ? '#4CAF50' : '#FF9800' }
                ]}>
                    <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                </View>
            </View>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteContent(item)}
                >
                    <Ionicons name="trash" size={24} color="#FF5252" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'materials' && styles.activeTab]}
                onPress={() => setActiveTab('materials')}
            >
                <Text style={[styles.tabText, activeTab === 'materials' && styles.activeTabText]}>
                    Materials
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
                onPress={() => setActiveTab('videos')}
            >
                <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
                    Videos
                </Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading content...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Content</Text>
            </View>

            {renderTabs()}

            <FlatList
                data={content}
                renderItem={renderContentItem}
                keyExtractor={(item, index) => item.url || index.toString()}
                contentContainerStyle={styles.contentList}
                refreshing={refreshing}
                onRefresh={fetchContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No {activeTab} found</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2196F3',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#2196F3',
        fontWeight: '600',
    },
    contentList: {
        padding: 15,
    },
    contentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    contentInfo: {
        flex: 1,
    },
    contentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    subjectName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 50,
    },
}); 