import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Premium feature limits
export const PREMIUM_LIMITS = {
    FREE: {
        olabs: 2,
        textExtractor: 2,
        oneToOneSessions: 1,
        resetPeriod: 'monthly' // 'monthly' or 'weekly'
    },
    PREMIUM: {
        olabs: -1, // -1 means unlimited
        textExtractor: -1,
        oneToOneSessions: -1,
        cost: 50 // EduTokens per month
    }
};

// Check if user can use a premium feature
export const canUseFeature = async (userId, feature) => {
    try {
        const userStatsRef = doc(db, 'userStats', userId);
        const userStats = await getDoc(userStatsRef);
        
        if (!userStats.exists()) {
            return { canUse: false, message: 'User stats not found' };
        }
        
        const data = userStats.data();
        const now = new Date();
        const lastReset = new Date(data.premiumFeatures?.lastResetDate || now);
        const isPremium = data.isPremium && new Date(data.premiumExpiryDate) > now;
        
        // Reset usage counts if it's a new month
        if (lastReset.getMonth() !== now.getMonth() || lastReset.getYear() !== now.getYear()) {
            await updateDoc(userStatsRef, {
                premiumFeatures: {
                    olabsUsed: 0,
                    textExtractorUsed: 0,
                    oneToOneSessionsUsed: 0,
                    lastResetDate: now.toISOString()
                }
            });
            data.premiumFeatures = {
                olabsUsed: 0,
                textExtractorUsed: 0,
                oneToOneSessionsUsed: 0,
                lastResetDate: now.toISOString()
            };
        }
        
        // Check usage limits
        const usageKey = `${feature}Used`;
        const currentUsage = data.premiumFeatures?.[usageKey] || 0;
        const limit = isPremium ? PREMIUM_LIMITS.PREMIUM[feature] : PREMIUM_LIMITS.FREE[feature];
        
        if (limit === -1 || currentUsage < limit) {
            return {
                canUse: true,
                isPremium,
                usageLeft: limit === -1 ? 'unlimited' : limit - currentUsage,
                message: limit === -1 ? 
                    'Premium access - Unlimited usage' : 
                    `${limit - currentUsage} uses left this month`
            };
        }
        
        return {
            canUse: false,
            isPremium,
            usageLeft: 0,
            message: `Free limit reached (${limit} per month). Upgrade to Premium for unlimited access!`
        };
    } catch (error) {
        console.error('Error checking feature usage:', error);
        return { canUse: false, message: 'Error checking feature access' };
    }
};

// Record usage of a premium feature
export const recordFeatureUsage = async (userId, feature) => {
    try {
        const userStatsRef = doc(db, 'userStats', userId);
        const userStats = await getDoc(userStatsRef);
        
        if (!userStats.exists()) {
            throw new Error('User stats not found');
        }
        
        const data = userStats.data();
        const usageKey = `${feature}Used`;
        
        await updateDoc(userStatsRef, {
            [`premiumFeatures.${usageKey}`]: (data.premiumFeatures?.[usageKey] || 0) + 1
        });
        
        return true;
    } catch (error) {
        console.error('Error recording feature usage:', error);
        return false;
    }
};

// Purchase premium access with EduTokens
export const purchasePremium = async (userId) => {
    try {
        const userStatsRef = doc(db, 'userStats', userId);
        const userStats = await getDoc(userStatsRef);
        
        if (!userStats.exists()) {
            return { success: false, message: 'User stats not found' };
        }
        
        const data = userStats.data();
        const tokenBalance = data.eduTokens || 0;
        
        if (tokenBalance < PREMIUM_LIMITS.PREMIUM.cost) {
            return {
                success: false,
                message: `Not enough EduTokens. Need ${PREMIUM_LIMITS.PREMIUM.cost} tokens, you have ${tokenBalance}`
            };
        }
        
        // Calculate new expiry date (1 month from now)
        const now = new Date();
        const expiryDate = new Date(now.setMonth(now.getMonth() + 1));
        
        await updateDoc(userStatsRef, {
            eduTokens: tokenBalance - PREMIUM_LIMITS.PREMIUM.cost,
            isPremium: true,
            premiumExpiryDate: expiryDate.toISOString()
        });
        
        return {
            success: true,
            message: 'Premium access activated!',
            expiryDate: expiryDate.toISOString()
        };
    } catch (error) {
        console.error('Error purchasing premium:', error);
        return { success: false, message: 'Error processing purchase' };
    }
};

// Convert XP to EduTokens
export const convertXPToTokens = async (userId, xpAmount) => {
    try {
        const userStatsRef = doc(db, 'userStats', userId);
        const userStats = await getDoc(userStatsRef);
        
        if (!userStats.exists()) {
            return { success: false, message: 'User stats not found' };
        }
        
        const data = userStats.data();
        const currentXP = data.totalXP || 0;
        
        if (xpAmount > currentXP) {
            return { success: false, message: 'Not enough XP' };
        }
        
        const tokensToAdd = Math.floor(xpAmount / 100); // 100 XP = 1 Token
        
        await updateDoc(userStatsRef, {
            totalXP: currentXP - xpAmount,
            eduTokens: (data.eduTokens || 0) + tokensToAdd
        });
        
        return {
            success: true,
            message: `Converted ${xpAmount} XP to ${tokensToAdd} EduTokens!`,
            newTokenBalance: (data.eduTokens || 0) + tokensToAdd
        };
    } catch (error) {
        console.error('Error converting XP to tokens:', error);
        return { success: false, message: 'Error converting XP' };
    }
};

// New function to get user status
export const getUserStatus = async (userId) => {
    try {
        const userStatsRef = doc(db, 'users', userId);
        const userStats = await getDoc(userStatsRef);
        
        if (!userStats.exists()) {
            return { isPremium: false, freeTrialsRemaining: 0, joinedGroups: [], lastAssessmentDate: null };
        }
        
        const data = userStats.data();
        return {
            isPremium: data.isPremium || false,
            freeTrialsRemaining: data.freeTrialsRemaining || 0, // Assuming this field exists
            joinedGroups: data.joinedGroups || [],
            lastAssessmentDate: data.lastAssessmentDate || null,
            username: data.username || '',
            email: data.email || '',
            mobile: data.mobile || ''
        };
    } catch (error) {
        console.error('Error fetching user status:', error);
        return { isPremium: false, freeTrialsRemaining: 0, joinedGroups: [], lastAssessmentDate: null };
    }
}; 