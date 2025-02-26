import { db } from '@/lib/firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
    orderBy,
    addDoc,
    updateDoc,
    Timestamp,
    setDoc 
} from 'firebase/firestore';

// Fetch user's recent tests
export async function getRecentTests(userId) {
    try {
        const progressRef = collection(db, 'userProgress');
        const progressQuery = query(
            progressRef,
            where('userId', '==', userId)
        );
        
        const snapshot = await getDocs(progressQuery);
        const recentTests = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(test => test.score && test.timestamp)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5)
            .map(test => ({
                id: test.id,
                test_name: test.title || 'Untitled Test',
                subject_name: test.subjectName || 'Unknown Subject',
                chapter: test.chapter || 'Unknown Chapter',
                score: test.score.percentage || 0,
                completed_at: {
                    seconds: new Date(test.timestamp).getTime() / 1000
                }
            }));

        return recentTests;
    } catch (error) {
        console.error('Error fetching recent tests:', error);
        throw error;
    }
}

// Track video progress
export async function updateVideoProgress(userId, videoData, progress) {
    try {
        if (!userId || !videoData || !videoData.id) {
            throw new Error('Missing required data for video progress update');
        }

        const videoProgressRef = collection(db, 'videoProgress');
        const progressQuery = query(
            videoProgressRef,
            where('userId', '==', userId),
            where('videoId', '==', videoData.id)
        );
        
        const snapshot = await getDocs(progressQuery);
        
        // Extract subject and chapter IDs from the video data
        let subjectId = videoData.subjectId;
        let chapterId = videoData.chapterId;

        // If the IDs are not directly available, try to extract from the URL
        if (!subjectId || !chapterId) {
            try {
                const urlParts = videoData.url.split('/');
                const videoPathIndex = urlParts.indexOf('videos');
                if (videoPathIndex !== -1 && urlParts.length > videoPathIndex + 3) {
                    // URL structure: .../videos/curriculumId/subjectId/chapterId/...
                    subjectId = urlParts[videoPathIndex + 2];
                    chapterId = urlParts[videoPathIndex + 3];
                }
            } catch (error) {
                console.warn('Could not extract IDs from video URL:', error);
            }
        }

        // Calculate completion status
        const isCompleted = progress >= 0.9; // 90% threshold for completion
        const now = Timestamp.now();

        const progressData = {
            userId,
            videoId: videoData.id,
            subjectId: subjectId || null,
            chapterId: chapterId || null,
            progress: progress,
            lastWatched: now,
            completed: isCompleted,
            completedAt: isCompleted ? now : null,
            title: videoData.name || videoData.title,
            updatedAt: now,
            videoDetails: {
                name: videoData.name || videoData.title,
                duration: videoData.duration || null,
                fileSize: videoData.fileSize || null,
                tags: videoData.tags || []
            }
        };

        let docId;
        if (snapshot.empty) {
            // Create new progress entry
            const newDoc = await addDoc(videoProgressRef, {
                ...progressData,
                createdAt: now,
                watchCount: 1
            });
            docId = newDoc.id;
        } else {
            // Update existing progress
            docId = snapshot.docs[0].id;
            const existingData = snapshot.docs[0].data();
            const docRef = doc(db, 'videoProgress', docId);
            
            await updateDoc(docRef, {
                ...progressData,
                watchCount: (existingData.watchCount || 0) + 1,
                // Only update completedAt if newly completed
                completedAt: existingData.completed ? existingData.completedAt : (isCompleted ? now : null)
            });
        }

        // If video is completed, update both video progress and user stats
        if (isCompleted) {
            // Update completion status in subjects collection if the video is there
            if (subjectId && chapterId) {
                try {
                    const subjectRef = doc(db, 'subjects', subjectId);
                    const subjectDoc = await getDoc(subjectRef);
                    
                    if (subjectDoc.exists()) {
                        const subjectData = subjectDoc.data();
                        const videos = subjectData.videos?.[chapterId] || [];
                        
                        // Find and update the video's completion status
                        const videoIndex = videos.findIndex(v => v.id === videoData.id);
                        if (videoIndex !== -1) {
                            const updatedVideos = [...videos];
                            updatedVideos[videoIndex] = {
                                ...updatedVideos[videoIndex],
                                completed: true,
                                completedAt: now
                            };
                            
                            await updateDoc(subjectRef, {
                                [`videos.${chapterId}`]: updatedVideos
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Error updating subject video status:', error);
                }
            }

            // Update user's video stats
            if (subjectId) {
                await updateUserVideoStats(userId, subjectId);
            }
        }

        return { 
            success: true, 
            completed: isCompleted,
            progressId: docId
        };
    } catch (error) {
        console.error('Error updating video progress:', error);
        throw error;
    }
}

// Get video progress for a user
export async function getVideoProgress(userId, videoId) {
    try {
        const videoProgressRef = collection(db, 'videoProgress');
        const progressQuery = query(
            videoProgressRef,
            where('userId', '==', userId),
            where('videoId', '==', videoId)
        );
        
        const snapshot = await getDocs(progressQuery);
        return snapshot.empty ? null : snapshot.docs[0].data();
    } catch (error) {
        console.error('Error fetching video progress:', error);
        throw error;
    }
}

// Get all video progress for a user in a subject
export async function getSubjectVideoProgress(userId, subjectId) {
    try {
        const videoProgressRef = collection(db, 'videoProgress');
        const progressQuery = query(
            videoProgressRef,
            where('userId', '==', userId),
            where('subjectId', '==', subjectId)
        );
        
        const snapshot = await getDocs(progressQuery);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error fetching subject video progress:', error);
        throw error;
    }
}

// Update user's video statistics
async function updateUserVideoStats(userId, subjectId) {
    try {
        if (!userId || !subjectId) {
            console.warn('Missing userId or subjectId for stats update');
            return;
        }

        const userRef = doc(db, 'users', userId);
        const userData = await getDoc(userRef);
        
        if (userData.exists()) {
            const currentStats = userData.data().videoStats || {};
            const subjectStats = currentStats[subjectId] || { completed: 0 };
            
            await updateDoc(userRef, {
                [`videoStats.${subjectId}`]: {
                    ...subjectStats,
                    completed: (subjectStats.completed || 0) + 1,
                    lastUpdated: Timestamp.now()
                }
            });
        }
    } catch (error) {
        console.error('Error updating user video stats:', error);
        // Don't throw the error to prevent blocking video progress update
    }
}

// Get user's overall progress
export async function getUserProgress(userId, timeRange = '3m') {
    try {
        if (!userId) {
            throw new Error('userId is required');
        }

        // Get user document for subject enrollments
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            return getEmptyProgressData();
        }

        const userData = userDoc.data();
        const joinedGroups = userData?.joinedGroups || [];
        
        // Extract subject IDs
        const enrolledSubjects = joinedGroups
            .filter(group => group.startsWith('subject_'))
            .map(group => group.replace('subject_', ''));

        // Get subject data with proper progress calculation
        const subjectsData = {};
        const videosProgress = {};
        
        for (const subjectId of enrolledSubjects) {
            // Get subject details
            const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
            if (subjectDoc.exists()) {
                const subjectData = subjectDoc.data();
                subjectsData[subjectId] = subjectData;
                
                // Calculate total videos and completed videos per chapter
                const chapterProgress = {};
                let totalSubjectVideos = 0;
                let completedSubjectVideos = 0;

                // Process videos by chapter
                if (subjectData.videos) {
                    for (const [chapterKey, chapterVideos] of Object.entries(subjectData.videos)) {
                        if (Array.isArray(chapterVideos)) {
                            totalSubjectVideos += chapterVideos.length;
                            
                            // Get video progress for this chapter
                            const chapterVideoProgress = await Promise.all(
                                chapterVideos.map(async video => {
                                    const progress = await getVideoProgress(userId, video.id);
                                    if (progress) {
                                        videosProgress[video.id] = {
                                            ...progress,
                                            videoData: video
                                        };
                                        return progress.completed ? 1 : 0;
                                    }
                                    return 0;
                                })
                            );
                            
                            const completedInChapter = chapterVideoProgress.reduce((sum, val) => sum + val, 0);
                            completedSubjectVideos += completedInChapter;
                            
                            chapterProgress[chapterKey] = {
                                total: chapterVideos.length,
                                completed: completedInChapter,
                                percentage: (completedInChapter / chapterVideos.length) * 100
                            };
                        }
                    }
                }

                // Update subject data with progress information
                subjectsData[subjectId] = {
                    ...subjectData,
                    progress: {
                        totalVideos: totalSubjectVideos,
                        completedVideos: completedSubjectVideos,
                        percentage: totalSubjectVideos > 0 ? (completedSubjectVideos / totalSubjectVideos) * 100 : 0,
                        chapterProgress
                    }
                };
            }
        }

        // Get test progress
        const progressRef = collection(db, 'userProgress');
        const progressQuery = query(
            progressRef,
            where('userId', '==', userId)
        );
        const progressSnapshot = await getDocs(progressQuery);
        const progressData = progressSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return formatProgressData(
            progressData, 
            userData, 
            subjectsData, 
            videosProgress, 
            timeRange
        );
    } catch (error) {
        console.error('Error fetching user progress:', error);
        throw error;
    }
}

// Helper function to format progress data
function formatProgressData(progressData, userData, subjectsData, videosProgress, timeRange) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const startDate = getDateFromRange(timeRange);
    const filteredData = progressData.filter(item => 
        new Date(item.timestamp) >= startDate
    );

    const subjectProgress = {};
    const chapterProgress = {};
    let totalTests = 0;
    let totalCorrect = 0;
    let totalVideosWatched = 0;
    let totalVideosAvailable = 0;

    // Process video progress
    Object.values(videosProgress).forEach(progress => {
        if (progress.completed) {
            totalVideosWatched++;
        }
        totalVideosAvailable++;
    });

    // Process test results
    filteredData.forEach(test => {
        if (!test.score) return;
        
        const subjectId = test.subjectId;
        const chapter = test.chapter;
        
        if (!subjectProgress[subjectId]) {
            subjectProgress[subjectId] = {
                name: test.subjectName || 'Unknown Subject',
                totalTests: 0,
                totalCorrect: 0,
                totalScore: 0,
                chapters: new Set(),
                videosWatched: 0,
                totalVideos: 0
            };
        }
        
        subjectProgress[subjectId].totalTests++;
        subjectProgress[subjectId].totalCorrect += test.score.correct || 0;
        subjectProgress[subjectId].totalScore += test.score.percentage || 0;
        if (chapter) {
            subjectProgress[subjectId].chapters.add(chapter);
        }

        if (chapter) {
            if (!chapterProgress[chapter]) {
                chapterProgress[chapter] = {
                    name: chapter,
                    subjectId,
                    subjectName: test.subjectName,
                    attempts: 0,
                    totalScore: 0,
                    videosWatched: 0,
                    totalVideos: 0
                };
            }
            chapterProgress[chapter].attempts++;
            chapterProgress[chapter].totalScore += test.score.percentage || 0;
        }

        totalTests++;
        totalCorrect += test.score.correct || 0;
    });

    // Add video progress to subject and chapter data
    Object.entries(videosProgress).forEach(([videoId, progress]) => {
        const video = progress.videoData;
        if (video && video.subjectId && subjectProgress[video.subjectId]) {
            subjectProgress[video.subjectId].totalVideos++;
            if (progress.completed) {
                subjectProgress[video.subjectId].videosWatched++;
            }

            if (video.chapterId && chapterProgress[video.chapterId]) {
                chapterProgress[video.chapterId].totalVideos++;
                if (progress.completed) {
                    chapterProgress[video.chapterId].videosWatched++;
                }
            }
        }
    });

    // Format subjects data
    const subjects = Object.entries(subjectsData).map(([id, data]) => ({
        id,
        name: data.name || 'Untitled Subject',
        description: data.description || '',
        totalChapters: data.totalChapters || data.chapters?.length || 0,
        completedChapters: Object.values(data.progress?.chapterProgress || {})
            .filter(ch => ch.percentage >= 90).length,
        averageScore: Math.round(
            progressData
                .filter(test => test.subjectId === id && test.score?.percentage)
                .reduce((sum, test) => sum + test.score.percentage, 0) / 
            progressData.filter(test => test.subjectId === id && test.score?.percentage).length
        ) || 0,
        videosWatched: data.progress?.completedVideos || 0,
        totalVideos: data.progress?.totalVideos || 0,
        progressPercentage: Math.round(data.progress?.percentage || 0),
        chapterProgress: data.progress?.chapterProgress || {}
    }));

    // Format chapters data
    const chapters = Object.values(chapterProgress).map(chapter => ({
        ...chapter,
        averageScore: Math.round(chapter.totalScore / chapter.attempts)
    }));

    // Prepare daily chart data
    const dailyData = Object.entries(
        filteredData.reduce((acc, item) => {
            if (!item.score?.percentage || !item.timestamp) return acc;
            
            const date = new Date(item.timestamp);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            if (!acc[dateKey]) {
                acc[dateKey] = { total: 0, count: 0 };
            }
            acc[dateKey].total += item.score.percentage;
            acc[dateKey].count++;
            
            return acc;
        }, {})
    ).map(([date, data]) => ({
        name: new Date(date).getDate().toString(), // Day of month
        date: date, // Full date for tooltip
        total: Math.round(data.total / data.count)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare monthly chart data
    const monthlyData = Object.entries(
        filteredData.reduce((acc, item) => {
            if (!item.score?.percentage || !item.timestamp) return acc;
            
            const date = new Date(item.timestamp);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            
            if (!acc[monthKey]) {
                acc[monthKey] = { total: 0, count: 0 };
            }
            acc[monthKey].total += item.score.percentage;
            acc[monthKey].count++;
            
            return acc;
        }, {})
    ).map(([month, data]) => ({
        name: month.split(' ')[0], // Month name
        date: month, // Full month and year for tooltip
        total: Math.round(data.total / data.count)
    }));

    // Calculate summary statistics
    const averageScore = totalTests > 0 
        ? Math.round(subjects.reduce((acc, subj) => acc + subj.averageScore, 0) / subjects.length)
        : 0;

    const weakAreas = subjects
        .filter(subj => subj.averageScore < 70)
        .map(subj => subj.name);

    const totalChaptersCompleted = subjects.reduce((acc, subj) => 
        acc + subj.completedChapters, 0
    );

    const totalChaptersAvailable = subjects.reduce((acc, subj) => 
        acc + subj.totalChapters, 0
    );

    return {
        chartData: {
            daily: dailyData,
            monthly: monthlyData
        },
        summary: {
            averageScore,
            testsCompleted: totalTests,
            totalTests: subjects.reduce((acc, subj) => acc + subj.totalChapters, 0),
            chaptersCompleted: totalChaptersCompleted,
            totalChapters: totalChaptersAvailable,
            videosWatched: totalVideosWatched,
            totalVideos: totalVideosAvailable,
            weakAreas,
            learningSpeed: userData?.learningProfile?.details?.learningSpeed || 'Normal',
            subjects,
            chapters
        }
    };
}

// Helper function to get date from range
function getDateFromRange(timeRange) {
    const now = new Date();
    switch (timeRange) {
        case '3m':
            return new Date(now.setMonth(now.getMonth() - 3));
        case '6m':
            return new Date(now.setMonth(now.getMonth() - 6));
        case '1y':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        default:
            return new Date(now.setMonth(now.getMonth() - 3));
    }
}

// Helper function to get empty progress data
function getEmptyProgressData() {
    return {
        chartData: {
            daily: [],
            monthly: []
        },
        summary: {
            averageScore: 0,
            testsCompleted: 0,
            totalTests: 0,
            chaptersCompleted: 0,
            totalChapters: 0,
            videosWatched: 0,
            totalVideos: 0,
            weakAreas: [],
            learningSpeed: 'Normal',
            subjects: [],
            chapters: []
        }
    };
}