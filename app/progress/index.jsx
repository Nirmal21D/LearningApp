import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { auth } from '@/lib/firebase';
import { getUserProgress, getRecentTests, getSubjectVideoProgress } from '@/app/api/progress';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';

const timeFilters = [
  { id: 1, label: 'Last 3 Months', value: '3m' },
  { id: 2, label: 'Last 6 Months', value: '6m' },
  { id: 3, label: 'Last Year', value: '1y' },
];

export default function ProgressPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('3m');
  const [selectedChartType, setSelectedChartType] = useState('monthly');
  const [progressData, setProgressData] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [videoProgressData, setVideoProgressData] = useState({});

  useEffect(() => {
    loadProgressData();
  }, [selectedFilter]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/login');
        return;
      }

      const [progress, tests] = await Promise.all([
        getUserProgress(userId, selectedFilter),
        getRecentTests(userId)
      ]);

      // Load video progress for each subject
      const videoProgress = {};
      const allChapters = [];
      
      if (progress.summary.subjects.length > 0) {
        await Promise.all(
          progress.summary.subjects.map(async (subject) => {
            // Get chapters for this subject
            const chapters = await getSubjectChapters(subject.id);
            allChapters.push(...chapters);

            // Get subject document to count total videos
            const subjectDoc = await getDoc(doc(db, 'subjects', subject.id));
            if (subjectDoc.exists()) {
              const subjectData = subjectDoc.data();
              let totalVideos = 0;
              if (subjectData.videos) {
                Object.values(subjectData.videos).forEach(chapterVideos => {
                  if (Array.isArray(chapterVideos)) {
                    totalVideos += chapterVideos.length;
                  }
                });
              }
              subject.totalVideos = totalVideos;
            }

            const subjectProgress = await getSubjectVideoProgress(userId, subject.id);
            videoProgress[subject.id] = subjectProgress.reduce((acc, curr) => {
              acc[curr.videoId] = curr;
              return acc;
            }, {});
          })
        );
      }
      setVideoProgressData(videoProgress);

      // Update progress data with correct video counts and all chapters
      setProgressData({
        ...progress,
        summary: {
          ...progress.summary,
          subjects: progress.summary.subjects.map(subject => ({
            ...subject,
            totalVideos: subject.totalVideos || 0
          })),
          chapters: allChapters
        }
      });
      setRecentTests(tests);
      if (progress.summary.subjects.length > 0 && !selectedSubject) {
        setSelectedSubject(progress.summary.subjects[0].id);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
      setError('Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceLabel = (score) => {
    if (!score || isNaN(score)) return { label: 'No Data', color: '#666' };
    if (score >= 85) return { label: 'Excellent', color: '#4CAF50' };
    if (score >= 70) return { label: 'Good', color: '#2196F3' };
    if (score >= 50) return { label: 'Fair', color: '#FF9800' };
    return { label: 'Needs Improvement', color: '#F44336' };
  };

  const selectedSubjectData = progressData?.summary.subjects.find(s => s.id === selectedSubject);

  const chartData = {
    labels: progressData?.chartData?.[selectedChartType]?.map(item => item.name) || [],
    datasets: [{
      data: progressData?.chartData?.[selectedChartType]?.map(item => item.total) || []
    }]
  };

  const getSubjectCompletedVideos = (subjectId) => {
    const subjectProgress = videoProgressData[subjectId] || {};
    return Object.values(subjectProgress).filter(p => p.completed).length;
  };

  const getSubjectChapters = async (subjectId) => {
    try {
      const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
      if (!subjectDoc.exists()) return [];

      const subjectData = subjectDoc.data();
      const chapters = subjectData.chapters || [];
      const videos = subjectData.videos || {};

      return chapters.map(chapterName => {
        const chapterKey = `CH${chapters.indexOf(chapterName) + 1}_${subjectData.name.replace(/\s+/g, '')}`;
        const chapterVideos = videos[chapterKey] || [];
        
        return {
          name: chapterName,
          subjectId: subjectId,
          subjectName: subjectData.name,
          totalVideos: chapterVideos.length,
          videos: chapterVideos,
          chapterKey: chapterKey
        };
      });
    } catch (error) {
      console.error('Error getting subject chapters:', error);
      return [];
    }
  };

  const getChapterVideoProgress = (subjectId, chapterName, chapterKey) => {
    try {
      const subjectProgress = videoProgressData[subjectId] || {};
      const chapterProgress = Object.values(subjectProgress).filter(p => 
        p.chapterId === chapterName || // Check direct chapterId match
        p.chapterId === chapterKey || // Check chapter key match
        p.videoDetails?.chapterName === chapterName // Check in video details
      );
      
      return {
        completed: chapterProgress.filter(p => p.completed).length,
        total: chapterProgress.length,
        progress: chapterProgress.map(p => ({
          videoName: p.videoDetails?.name || p.title,
          progress: p.progress || 0,
          completed: p.completed || false,
          lastWatched: p.lastWatched
        }))
      };
    } catch (error) {
      console.error('Error getting chapter progress:', error);
      return { completed: 0, total: 0, progress: [] };
    }
  };

  const renderSubjectDetails = () => {
    if (!selectedSubjectData) return null;

    const subjectProgress = selectedSubjectData.progressPercentage || 0;
    const completedVideos = selectedSubjectData.videosWatched || 0;
    const totalVideos = selectedSubjectData.totalVideos || 0;
    const averageScore = selectedSubjectData.averageScore || 0;

    return (
      <View style={styles.subjectDetailsCard}>
        <Text style={styles.subjectTitle}>{selectedSubjectData.name}</Text>
        {selectedSubjectData.description && (
          <Text style={styles.subjectDescription}>{selectedSubjectData.description}</Text>
        )}
        <View style={styles.subjectStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getPerformanceLabel(averageScore).color }]}>
              {averageScore}%
            </Text>
            <Text style={styles.statLabel}>Average Score</Text>
            {averageScore === 0 && (
              <Text style={styles.noDataText}>No tests taken</Text>
            )}
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {selectedSubjectData.completedChapters}/{selectedSubjectData.totalChapters}
            </Text>
            <Text style={styles.statLabel}>Chapters Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {completedVideos}/{totalVideos}
            </Text>
            <Text style={styles.statLabel}>Videos Completed</Text>
          </View>
        </View>
        <View style={styles.overallProgressContainer}>
          <Text style={styles.overallProgressLabel}>Overall Progress</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${subjectProgress}%`,
                    backgroundColor: getPerformanceLabel(subjectProgress).color
                  }
                ]} 
              />
            </View>
            <Text style={[
              styles.progressPercentage,
              { color: getPerformanceLabel(subjectProgress).color }
            ]}>
              {subjectProgress}%
            </Text>
          </View>
          {subjectProgress === 0 && (
            <Text style={styles.noProgressSubText}>
              Start watching videos and taking tests to track your progress
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSummaryContainer = () => {
    if (!progressData) return null;

    const totalCompletedVideos = progressData.summary.subjects.reduce(
      (total, subject) => total + getSubjectCompletedVideos(subject.id), 
      0
    );

    const averageScore = progressData.summary.averageScore || 0;
    const performanceData = getPerformanceLabel(averageScore);

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overall Progress</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={[styles.summaryScore, { color: performanceData.color }]}>
                {averageScore}%
              </Text>
              <Text style={styles.progressLabel}>Average Score</Text>
            </View>
          </View>
          {averageScore === 0 ? (
            <View style={styles.noProgressContainer}>
              <Text style={styles.noProgressText}>No tests taken yet</Text>
              <Text style={styles.noProgressSubText}>Take tests to see your progress</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.performanceLabel, { color: performanceData.color }]}>
                {performanceData.label}
              </Text>
              <Text style={styles.learningSpeedLabel}>
                Learning Speed: {progressData.summary.learningSpeed}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderSubjectButtons = () => {
    if (!progressData?.summary?.subjects) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.subjectScroll}
        contentContainerStyle={styles.subjectScrollContent}
      >
        {progressData.summary.subjects.map((subject) => {
          const progress = subject.progressPercentage || 0;
          return (
            <TouchableOpacity
              key={subject.id}
              style={[
                styles.subjectButton,
                selectedSubject === subject.id && styles.subjectButtonActive
              ]}
              onPress={() => setSelectedSubject(subject.id)}
            >
              <Text style={[
                styles.subjectButtonText,
                selectedSubject === subject.id && styles.subjectButtonTextActive
              ]}>
                {subject.name}
              </Text>
              <View style={styles.subjectProgress}>
                <Text style={[
                  styles.subjectProgressText,
                  selectedSubject === subject.id && styles.subjectButtonTextActive
                ]}>
                  {subject.videosWatched}/{subject.totalVideos} Videos
                </Text>
                <View style={styles.subjectProgressBar}>
                  <View 
                    style={[
                      styles.subjectProgressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: selectedSubject === subject.id ? '#fff' : '#666'
                      }
                    ]} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadProgressData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header - Outside the main container */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progress Overview</Text>
        </View>
      </View>

      <View style={styles.glassEffectContainer}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Time Filter Section - Horizontally Scrollable */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContainer}
          >
            {timeFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.value && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter.value)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === filter.value && styles.filterButtonTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading your progress...</Text>
            </View>
          ) : (
            <>
              {renderSummaryContainer()}

              {progressData.chartData?.[selectedChartType]?.length > 0 && (
                <View style={styles.chartContainer}>
                  <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Progress Over Time</Text>
                  </View>
                  
                  {/* Chart Type Selection - Centered */}
                  <View style={styles.chartTypeWrapper}>
                    <View style={styles.chartTypeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.chartTypeButton,
                          selectedChartType === 'daily' && styles.chartTypeButtonActive
                        ]}
                        onPress={() => setSelectedChartType('daily')}
                      >
                        <Text style={[
                          styles.chartTypeText,
                          selectedChartType === 'daily' && styles.chartTypeTextActive
                        ]}>Daily</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.chartTypeButton,
                          selectedChartType === 'monthly' && styles.chartTypeButtonActive
                        ]}
                        onPress={() => setSelectedChartType('monthly')}
                      >
                        <Text style={[
                          styles.chartTypeText,
                          selectedChartType === 'monthly' && styles.chartTypeTextActive
                        ]}>Monthly</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.chartWrapper}>
                    <LineChart
                      data={chartData}
                      width={Dimensions.get('window').width - 60}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        propsForDots: {
                          r: "5",
                          strokeWidth: "2",
                          stroke: "#2196F3"
                        },
                        propsForLabels: {
                          fontSize: selectedChartType === 'daily' ? 10 : 11
                        }
                      }}
                      bezier
                      style={styles.chart}
                      getDotColor={(dataPoint, dataPointIndex) => {
                        const score = dataPoint;
                        if (score >= 85) return '#4CAF50';
                        if (score >= 70) return '#2196F3';
                        if (score >= 50) return '#FF9800';
                        return '#F44336';
                      }}
                      renderDotContent={({x, y, index}) => {
                        const item = progressData.chartData[selectedChartType][index];
                        return (
                          <View
                            key={index}
                            style={[
                              styles.tooltipContainer,
                              {
                                left: x - 50,
                                top: y - 40,
                              }
                            ]}
                          >
                            <Text style={styles.tooltipText}>
                              {item.date}
                            </Text>
                            <Text style={styles.tooltipScore}>
                              {item.total}%
                            </Text>
                          </View>
                        );
                      }}
                    />
                  </View>
                </View>
              )}

              <View style={styles.subjectContainer}>
                <Text style={styles.sectionTitle}>Subject Progress</Text>
                {renderSubjectButtons()}
              </View>

              {renderSubjectDetails()}

              {progressData.summary.chapters.length > 0 && (
                <View style={styles.chaptersContainer}>
                  <Text style={styles.sectionTitle}>Chapter Progress</Text>
                  {progressData.summary.chapters
                    .filter(chapter => !selectedSubject || chapter.subjectId === selectedSubject)
                    .map((chapter, index) => {
                      const videoProgress = getChapterVideoProgress(
                        chapter.subjectId, 
                        chapter.name,
                        chapter.chapterKey
                      );
                      const hasNoVideos = chapter.totalVideos === 0;
                      const completionPercentage = hasNoVideos ? 100 : 
                        (videoProgress.total > 0 ? Math.round((videoProgress.completed / videoProgress.total) * 100) : 0);

                      return (
                        <View key={index} style={styles.chapterCard}>
                          <View style={styles.chapterInfo}>
                            <Text style={styles.chapterName}>{chapter.name}</Text>
                            <Text style={styles.chapterSubject}>{chapter.subjectName}</Text>
                            <View style={styles.chapterProgressContainer}>
                              <View style={styles.chapterProgressBar}>
                                <View 
                                  style={[
                                    styles.chapterProgressFill,
                                    { 
                                      width: `${completionPercentage}%`,
                                      backgroundColor: completionPercentage >= 90 ? '#4CAF50' : '#2196F3'
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={styles.chapterProgressText}>
                                {hasNoVideos ? 'No videos to watch' : 
                                  `${videoProgress.completed}/${chapter.totalVideos} Videos Completed`}
                              </Text>
                            </View>

                            {/* Video List */}
                            <View style={styles.videoList}>
                              {chapter.videos.map((video, vIndex) => {
                                const progress = videoProgress.progress.find(p => 
                                  p.videoName === video.name || p.videoName === video.title
                                ) || { progress: 0, completed: false };
                                
                                return (
                                  <View key={vIndex} style={styles.videoItem}>
                                    <View style={styles.videoItemHeader}>
                                      <Ionicons 
                                        name={progress.completed ? "checkmark-circle" : "play-circle-outline"} 
                                        size={20} 
                                        color={progress.completed ? "#4CAF50" : "#666"} 
                                      />
                                      <Text style={[
                                        styles.videoName,
                                        progress.completed && styles.videoCompleted
                                      ]}>
                                        {video.name || video.title || `Video ${vIndex + 1}`}
                                      </Text>
                                    </View>
                                    <View style={styles.videoProgressBar}>
                                      <View 
                                        style={[
                                          styles.videoProgressFill,
                                          { 
                                            width: `${Math.round(progress.progress * 100)}%`,
                                            backgroundColor: progress.completed ? '#4CAF50' : '#2196F3'
                                          }
                                        ]} 
                                      />
                                    </View>
                                    {progress.lastWatched && (
                                      <Text style={styles.lastWatchedText}>
                                        Last watched: {new Date(progress.lastWatched.seconds * 1000).toLocaleDateString()}
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          </View>

                          <View style={[
                            styles.chapterScore,
                            { backgroundColor: getPerformanceLabel(completionPercentage).color + '20' }
                          ]}>
                            <Text style={[
                              styles.scoreValue,
                              { color: getPerformanceLabel(completionPercentage).color }
                            ]}>{completionPercentage}%</Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              <View style={styles.recentTestsContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Tests</Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAllButton}>View All</Text>
                  </TouchableOpacity>
                </View>
                {recentTests.length > 0 ? (
                  <View style={styles.testsList}>
                    {recentTests.map((test, index) => (
                      <View key={test.id || index} style={styles.testItem}>
                        <View style={styles.testInfo}>
                          <Text style={styles.testName} numberOfLines={1}>
                            {test.test_name}
                          </Text>
                          <Text style={styles.testSubject}>{test.subject_name}</Text>
                          <Text style={styles.testDate}>
                            {new Date(test.completed_at.seconds * 1000).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={[
                          styles.testScore,
                          { backgroundColor: getPerformanceLabel(test.score).color + '20' }
                        ]}>
                          <Text style={[
                            styles.scoreValue,
                            { color: getPerformanceLabel(test.score).color }
                          ]}>{test.score}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noTestsContainer}>
                    <Text style={styles.noTestsText}>No recent tests found</Text>
                  </View>
                )}
              </View>
            </>
          )}
          {/* Add bottom padding for scrolling content */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#666',
  },
  headerWrapper: {
    // backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 200, 200, 0.3)',
    paddingTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(240, 240, 240, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  glassEffectContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  filterScrollView: {
    marginVertical: 12,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingRight: 8,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  summaryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 220, 220, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    // elevation: 1,
  },
  summaryLabel: {
    fontSize: 17,
    color: '#666',
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  progressItem: {
    alignItems: 'center',
  },
  summaryScore: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  performanceLabel: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  learningSpeedLabel: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 220, 220, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    // elevation: 1,
  },
  chartHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  chartTypeWrapper: {
    alignItems: 'center',
    marginBottom: 12,
    // backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  chartTypeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 18,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  chartTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  chartTypeButtonActive: {
    backgroundColor: '#2196F3',
  },
  chartTypeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  chartTypeTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  subjectContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // Increased opacity for better visibility
    padding: 10, // Added padding for better spacing
    borderRadius: 10, // Slightly rounded corners for a softer look
  },
  sectionTitle: {
    fontSize: 20, // Increased font size for better readability
    fontWeight: '700', // Bolder font weight for emphasis
    color: '#333', // Darker color for better contrast
    marginBottom: 20, // Increased margin for better spacing
    textAlign: 'center',
  },
  subjectScroll: {
    marginTop: 10, // Adjusted margin for better layout
    paddingVertical: 10, // Added vertical padding to prevent overlap
  },
  subjectButton: {
    paddingVertical: 14, // Increased padding for a larger touch area
    paddingHorizontal: 20, // Increased horizontal padding for better fit
    borderRadius: 25, // More rounded corners for a modern look
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // Increased opacity for better visibility
    marginRight: 12, // Increased margin for better spacing
    minWidth: 160, // Increased minimum width to prevent overlap
  },
  subjectButtonActive: {
    backgroundColor: '#1976D2', // Darker shade for active state
  },
  subjectButtonText: {
    fontSize: 15, // Increased font size for better readability
    color: '#333', // Darker color for better contrast
    textAlign: 'center',
  },
  subjectButtonTextActive: {
    color: '#fff', // White text for active button
    fontWeight: '700', // Bolder font weight for emphasis
  },
  subjectDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // Increased opacity for better visibility
    borderRadius: 15,
    padding: 25, // Increased padding for better spacing
    marginBottom: 20,
  },
  subjectTitle: {
    fontSize: 20, // Increased font size for better readability
    fontWeight: '700', // Bolder font weight for emphasis
    color: '#333',
    marginBottom: 20, // Increased margin for better spacing
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Changed to space-around for better distribution
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    padding: 10, // Added padding for better spacing
  },
  statValue: {
    fontSize: 22, // Increased font size for better readability
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 15, // Increased font size for better readability
    color: '#666',
    textAlign: 'center',
  },
  chaptersContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  chapterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chapterInfo: {
    flex: 1,
    marginRight: 15,
  },
  chapterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  chapterSubject: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  chapterProgressContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  chapterProgressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  chapterProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  chapterProgressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  videoList: {
    marginTop: 8,
  },
  videoItem: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  videoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  videoName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  videoCompleted: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  videoProgressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  lastWatchedText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  chapterScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentTestsContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  viewAllButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  testsList: {
    gap: 10,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testInfo: {
    flex: 1,
    marginRight: 15,
  },
  testName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  testSubject: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  testDate: {
    fontSize: 14,
    color: '#666',
  },
  testScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  noTestsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTestsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectProgress: {
    marginTop: 8,
  },
  subjectProgressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  subjectProgressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tooltipContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    zIndex: 1,
  },
  tooltipText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  tooltipScore: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subjectDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  overallProgressContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  overallProgressLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Glass effect background
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)', // Light border for glass effect
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  noProgressContainer: {
    alignItems: 'center',
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noProgressText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  noProgressSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
}); 