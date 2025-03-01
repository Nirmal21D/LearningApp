import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PREMIUM_LIMITS, purchasePremium, convertXPToTokens } from '@/lib/premium';

export default function PremiumPage() {
    const router = useRouter();
    const [userStats, setUserStats] = useState(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [xpToConvert, setXpToConvert] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserStats();
    }, []);

    const loadUserStats = async () => {
        try {
            const auth = getAuth();
            if (!auth.currentUser) {
                router.push('/login');
                return;
            }

            const userStatsRef = doc(db, 'userStats', auth.currentUser.uid);
            const userStatsDoc = await getDoc(userStatsRef);

            if (userStatsDoc.exists()) {
                setUserStats(userStatsDoc.data());
            } else {
                setUserStats({
                    totalXP: 0,
                    eduTokens: 0,
                    isPremium: false,
                    premiumFeatures: {
                        olabsUsed: 0,
                        textExtractorUsed: 0,
                        oneToOneSessionsUsed: 0
                    }
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading user stats:', error);
            Alert.alert('Error', 'Failed to load user data');
            setLoading(false);
        }
    };

    const handlePurchasePremium = async () => {
        try {
            const auth = getAuth();
            if (!auth.currentUser) return;

            const result = await purchasePremium(auth.currentUser.uid);
            
            if (result.success) {
                Alert.alert('Success', result.message);
                loadUserStats(); // Reload user stats
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('Error purchasing premium:', error);
            Alert.alert('Error', 'Failed to process purchase');
        }
    };

    const handleConvertXP = async () => {
        try {
            const auth = getAuth();
            if (!auth.currentUser) return;

            const xpAmount = parseInt(xpToConvert);
            if (isNaN(xpAmount) || xpAmount <= 0) {
                Alert.alert('Error', 'Please enter a valid amount of XP');
                return;
            }

            const result = await convertXPToTokens(auth.currentUser.uid, xpAmount);
            
            if (result.success) {
                Alert.alert('Success', result.message);
                setShowConvertModal(false);
                setXpToConvert('');
                loadUserStats(); // Reload user stats
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('Error converting XP:', error);
            Alert.alert('Error', 'Failed to convert XP');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {/* User Stats Section */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Ionicons name="star" size={24} color="#FFD700" />
                        <Text style={styles.statValue}>{userStats.totalXP || 0}</Text>
                        <Text style={styles.statLabel}>Total XP</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Ionicons name="diamond" size={24} color="#9C27B0" />
                        <Text style={styles.statValue}>{userStats.eduTokens || 0}</Text>
                        <Text style={styles.statLabel}>EduTokens</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.convertButton}
                        onPress={() => setShowConvertModal(true)}
                    >
                        <Text style={styles.convertButtonText}>Convert XP</Text>
                    </TouchableOpacity>
                </View>

                {/* Premium Status */}
                <View style={styles.premiumStatusCard}>
                    <Ionicons 
                        name={userStats.isPremium ? "shield-checkmark" : "shield-outline"} 
                        size={32} 
                        color={userStats.isPremium ? "#4CAF50" : "#666"}
                    />
                    <Text style={styles.premiumStatusTitle}>
                        {userStats.isPremium ? "Premium Active" : "Free Plan"}
                    </Text>
                    <Text style={styles.premiumStatusText}>
                        {userStats.isPremium 
                            ? `Premium expires on ${new Date(userStats.premiumExpiryDate).toLocaleDateString()}`
                            : "Upgrade to Premium for unlimited access!"
                        }
                    </Text>
                    {!userStats.isPremium && (
                        <TouchableOpacity 
                            style={styles.upgradeButton}
                            onPress={handlePurchasePremium}
                        >
                            <Text style={styles.upgradeButtonText}>
                                Upgrade Now - {PREMIUM_LIMITS.PREMIUM.cost} EduTokens/month
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Features List */}
                <View style={styles.featuresCard}>
                    <Text style={styles.featuresTitle}>Premium Features</Text>

                    <View style={styles.featureItem}>
                        <Ionicons name="flask" size={24} color="#2196F3" />
                        <View style={styles.featureInfo}>
                            <Text style={styles.featureName}>OLabs Virtual Labs</Text>
                            <Text style={styles.featureLimit}>
                                {userStats.isPremium ? "Unlimited access" : `${PREMIUM_LIMITS.FREE.olabs} free uses per month`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="scan" size={24} color="#4CAF50" />
                        <View style={styles.featureInfo}>
                            <Text style={styles.featureName}>Text Extractor</Text>
                            <Text style={styles.featureLimit}>
                                {userStats.isPremium ? "Unlimited access" : `${PREMIUM_LIMITS.FREE.textExtractor} free uses per month`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Ionicons name="people" size={24} color="#FF5722" />
                        <View style={styles.featureInfo}>
                            <Text style={styles.featureName}>One-to-One Sessions</Text>
                            <Text style={styles.featureLimit}>
                                {userStats.isPremium ? "Unlimited access" : `${PREMIUM_LIMITS.FREE.oneToOneSessions} free session per month`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Usage Stats */}
                <View style={styles.usageCard}>
                    <Text style={styles.usageTitle}>Current Usage</Text>

                    <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>OLabs Used:</Text>
                        <Text style={styles.usageValue}>
                            {userStats.premiumFeatures?.olabsUsed || 0} / 
                            {userStats.isPremium ? "∞" : PREMIUM_LIMITS.FREE.olabs}
                        </Text>
                    </View>

                    <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>Text Extractor Used:</Text>
                        <Text style={styles.usageValue}>
                            {userStats.premiumFeatures?.textExtractorUsed || 0} / 
                            {userStats.isPremium ? "∞" : PREMIUM_LIMITS.FREE.textExtractor}
                        </Text>
                    </View>

                    <View style={styles.usageItem}>
                        <Text style={styles.usageLabel}>One-to-One Sessions Used:</Text>
                        <Text style={styles.usageValue}>
                            {userStats.premiumFeatures?.oneToOneSessionsUsed || 0} / 
                            {userStats.isPremium ? "∞" : PREMIUM_LIMITS.FREE.oneToOneSessions}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Convert XP Modal */}
            <Modal
                visible={showConvertModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowConvertModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Convert XP to EduTokens</Text>
                        <Text style={styles.modalSubtitle}>100 XP = 1 EduToken</Text>

                        <TextInput
                            style={styles.input}
                            value={xpToConvert}
                            onChangeText={setXpToConvert}
                            placeholder="Enter XP amount"
                            keyboardType="numeric"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowConvertModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.modalButton, styles.convertModalButton]}
                                onPress={handleConvertXP}
                            >
                                <Text style={styles.convertModalButtonText}>Convert</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    convertButton: {
        backgroundColor: '#9C27B0',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    convertButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    premiumStatusCard: {
        backgroundColor: 'white',
        margin: 15,
        padding: 20,
        borderRadius: 12,
        elevation: 3,
        alignItems: 'center',
    },
    premiumStatusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 10,
    },
    premiumStatusText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 15,
    },
    upgradeButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 2,
    },
    upgradeButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    featuresCard: {
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    featureInfo: {
        marginLeft: 15,
        flex: 1,
    },
    featureName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    featureLimit: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    usageCard: {
        backgroundColor: 'white',
        margin: 15,
        padding: 15,
        borderRadius: 12,
        elevation: 3,
    },
    usageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    usageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    usageLabel: {
        fontSize: 14,
        color: '#666',
    },
    usageValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        width: '80%',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
    convertModalButton: {
        backgroundColor: '#9C27B0',
    },
    convertModalButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600',
    },
}); 