import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    where, 
    deleteDoc,
    doc,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ManageCurriculum() {
    const router = useRouter();
    const [curriculums, setCurriculums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchCurriculums();
    }, []);

    const fetchCurriculums = async () => {
        try {
            setLoading(true);
            const curriculumsRef = collection(db, 'curriculums');
            const curriculumsQuery = query(curriculumsRef, orderBy('createdAt', 'desc'));
            const curriculumsSnapshot = await getDocs(curriculumsQuery);
            
            const curriculumsData = curriculumsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCurriculums(curriculumsData);
        } catch (error) {
            console.error('Error fetching curriculums:', error);
            Alert.alert(
                'Error',
                'Failed to fetch curriculums. Please check your connection and try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCurriculums();
    };

    const handleViewCurriculum = (curriculumId) => {
        router.push(`/admin/manage_curriculum/view_curriculum?curriculumId=${curriculumId}`);
    };

    const handleAddSubject = (curriculumId) => {
        router.push(`/admin/manage_curriculum/add_subject?curriculumId=${curriculumId}`);
    };

    const deleteSubjectsForCurriculum = async (curriculumId) => {
        const subjectsRef = collection(db, 'subjects');
        const subjectsQuery = query(subjectsRef, where('curriculumId', '==', curriculumId));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        
        const batch = writeBatch(db);
        subjectsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    };

    const handleDeleteCurriculum = async (curriculumId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this curriculum? This will also delete all associated subjects and cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setLoading(true);
                                // First delete all subjects associated with this curriculum
                                await deleteSubjectsForCurriculum(curriculumId);
                                
                                // Then delete the curriculum itself
                                const curriculumRef = doc(db, 'curriculums', curriculumId);
                                await deleteDoc(curriculumRef);
                                
                                Alert.alert('Success', 'Curriculum and associated subjects deleted successfully!');
                                fetchCurriculums(); // Refresh the list
                            } catch (error) {
                                console.error('Error during deletion:', error);
                                Alert.alert(
                                    'Error',
                                    'Failed to delete curriculum. Please try again.'
                                );
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error in delete handler:', error);
            Alert.alert('Error', 'Failed to process deletion request');
        }
    };

    const renderCurriculumItem = ({ item, index }) => (
        <Animated.View 
            entering={FadeInDown.delay(index * 100).duration(400).springify()}
            style={styles.curriculumCardContainer}
        >
            <BlurView intensity={Platform.OS === 'ios' ? 50 : 0} tint="light" style={styles.curriculumCard}>
                <View style={styles.curriculumInfo}>
                    <Text style={styles.curriculumName}>{item.name}</Text>
                    <Text style={styles.curriculumDescription}>{item.description}</Text>
                </View>
                
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.glassEffect]}
                        onPress={() => handleViewCurriculum(item.id)}
                    >
                        <Ionicons name="eye-outline" size={22} color="#2196F3" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.glassEffect]}
                        onPress={() => handleAddSubject(item.id)}
                    >
                        <Ionicons name="add-outline" size={22} color="#4CAF50" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.glassEffect]}
                        onPress={() => handleDeleteCurriculum(item.id)}
                    >
                        <Ionicons name="trash-outline" size={22} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Animated.View>
    );

    if (loading && !refreshing) {
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
                
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
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
            
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.topBarContainer}>
                    <BlurView intensity={Platform.OS === 'ios' ? 50 : 0} tint="light" style={[styles.backButton, styles.glassEffect]}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#333"/>
                        </TouchableOpacity>
                    </BlurView>
                    
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Manage Curriculums</Text>
                        <Text style={styles.subtitle}>View, add, or delete curriculum items</Text>
                    </View>
                </View>

                <View style={styles.addButtonContainer}>
                    <TouchableOpacity 
                        style={[styles.addCurriculumButton, styles.glassEffect]}
                        onPress={() => router.push('/admin/manage_curriculum/add_curriculum')}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#2196F3" />
                        <Text style={styles.addButtonText}>Add New</Text>
                    </TouchableOpacity>
                </View>
                
                <Animated.View 
                    entering={FadeInDown.duration(800).springify()}
                    style={styles.content}
                >
                    <FlatList
                        data={curriculums}
                        renderItem={renderCurriculumItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        showsVerticalScrollIndicator={false}
                    />
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    safeArea: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginLeft: 5,
        marginTop: 10,
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonContainer: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 40,
        right: Platform.OS === 'web' ? 20 : 16,
        zIndex: 10,
    },
    addCurriculumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#2196F3',
        fontWeight: '600',
        marginLeft: 6,
    },
    content: {
        flex: 1,
        paddingTop: Platform.OS === 'web' ? 120 : 140,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    curriculumCardContainer: {
        marginBottom: 16,
        borderRadius: 28,
        overflow: 'hidden',
    },
    curriculumCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 28,
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
    curriculumInfo: {
        flex: 1,
        paddingRight: 12,
    },
    curriculumName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A237E',
        marginBottom: 8,
    },
    curriculumDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    glassEffect: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 9,
    },
    // Decorative blur circles
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
});