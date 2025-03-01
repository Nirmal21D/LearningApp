import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { canUseFeature, recordFeatureUsage } from '@/lib/premium';
import { getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const usePremiumFeature = () => {
    const router = useRouter();

    const checkFeatureAccess = async (feature) => {
        if (!auth.currentUser) {
            router.push('/login');
            return { canProceed: false };
        }

        const userStatus = await getUserStatus(auth.currentUser.uid);
        if (userStatus.isPremium) {
            return { canProceed: true, message: 'Unlimited Access' };
        }

        const result = await canUseFeature(auth.currentUser.uid, feature);
        
        if (result.canUse) {
            await recordFeatureUsage(auth.currentUser.uid, feature);
            return { canProceed: true };
        }

        return { 
            canProceed: false, 
            showUpgrade: true,
            message: result.message,
            usageLeft: result.usageLeft,
            freeTrialsRemaining: userStatus.freeTrialsRemaining
        };
    };

    return { checkFeatureAccess };
};

export const PremiumFeatureModal = ({ 
    visible, 
    onClose, 
    message, 
    usageLeft,
    featureName,
    freeTrialsRemaining,
    isPremium
}) => {
    const router = useRouter();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Ionicons 
                        name="lock-closed" 
                        size={48} 
                        color="#FF5722" 
                    />
                    
                    <Text style={styles.modalTitle}>
                        {usageLeft === 0 ? 'Usage Limit Reached' : 'Premium Feature'}
                    </Text>
                    
                    <Text style={styles.featureName}>{featureName}</Text>
                    
                    <Text style={styles.modalMessage}>
                        {isPremium 
                            ? 'Unlimited Access' 
                            : `Free Trials Remaining: ${freeTrialsRemaining}`}
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.upgradeButton]}
                            onPress={() => {
                                onClose();
                                router.push('/premium');
                            }}
                        >
                            <Text style={styles.upgradeButtonText}>View Premium</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        width: '85%',
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 15,
        marginBottom: 5,
    },
    featureName: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    upgradeButton: {
        backgroundColor: '#4CAF50',
    },
    upgradeButtonText: {
        color: 'white',
        fontWeight: '600',
    },
}); 