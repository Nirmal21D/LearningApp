import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LineChart } from 'react-native-chart-kit';

const timeFilters = [
  { id: 1, label: 'Last 3 Months', value: '3m' },
  { id: 2, label: 'Last 6 Months', value: '6m' },
  { id: 3, label: 'Last Year', value: '1y' },
];

const chartData = {
  '3m': {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ data: [65, 75, 87] }]
  },
  '6m': {
    labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    datasets: [{ data: [60, 65, 70, 75, 80, 87] }]
  },
  '1y': {
    labels: ['Apr', 'Jun', 'Aug', 'Oct', 'Dec', 'Mar'],
    datasets: [{ data: [50, 60, 65, 75, 80, 87] }]
  }
};

export default function ProgressPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('3m');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const getPerformanceLabel = (score) => {
    if (score >= 85) return { label: 'Excellent', color: '#4CAF50' };
    if (score >= 70) return { label: 'Good', color: '#2196F3' };
    return { label: 'Needs Improvement', color: '#F44336' };
  };

  const performance = getPerformanceLabel(87);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </View>
        </TouchableOpacity>
        <Text style={styles.studentName}>Performance</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Header with Filter */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Learning Progress</Text>
          <View style={styles.filterWrapper}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Text style={styles.filterButtonText}>
                {timeFilters.find(f => f.value === selectedFilter)?.label}
              </Text>
              <Ionicons 
                name={showFilterDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#333" 
              />
            </TouchableOpacity>
            
            {showFilterDropdown && (
              <View style={styles.filterDropdown}>
                {timeFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedFilter(filter.value);
                      setShowFilterDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilter === filter.value && styles.filterOptionSelected
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Progress Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData[selectedFilter]}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Progress Cards */}
        <View style={styles.progressGrid}>
          <View style={[styles.progressCard, styles.averageScoreCard]}>
            <View style={[styles.cardIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.cardLabel}>Average Score</Text>
            <Text style={styles.cardValue}>87%</Text>
            <Text style={[styles.performanceLabel, { color: performance.color }]}>
              {performance.label}
            </Text>
          </View>

          <View style={[styles.progressCard, styles.testsCard]}>
            <View style={[styles.cardIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="document-text" size={24} color="#2196F3" />
            </View>
            <Text style={styles.cardLabel}>Tests Completed</Text>
            <Text style={styles.cardValue}>24/30</Text>
            <Text style={styles.completionRate}>80% Complete</Text>
          </View>

          <View style={[styles.progressCard, styles.videosCard]}>
            <View style={[styles.cardIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="play-circle" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.cardLabel}>Videos Watched</Text>
            <Text style={styles.cardValue}>45/60</Text>
            <Text style={styles.completionRate}>75% Complete</Text>
          </View>

          <View style={[styles.progressCard, styles.weakAreasCard]}>
            <View style={[styles.cardIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={24} color="#F44336" />
            </View>
            <Text style={styles.cardLabel}>Weak Areas</Text>
            <Text style={styles.cardValue}>2</Text>
            <Text style={styles.weakAreasText}>Need attention</Text>
          </View>
        </View>

        {/* Recent Tests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Tests</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.testsList}>
            {[
              { name: 'Mathematics Final', date: 'March 15, 2024', score: 92 },
              { name: 'Science Quiz', date: 'March 10, 2024', score: 85 },
              { name: 'English Test', date: 'March 5, 2024', score: 88 },
            ].map((test, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testInfo}>
                  <Text style={styles.testName}>{test.name}</Text>
                  <Text style={styles.testDate}>{test.date}</Text>
                </View>
                <View style={[
                  styles.testScore,
                  { backgroundColor: test.score >= 90 ? '#E8F5E9' : '#E3F2FD' }
                ]}>
                  <Text style={[
                    styles.scoreValue,
                    { color: test.score >= 90 ? '#4CAF50' : '#2196F3' }
                  ]}>{test.score}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  studentName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1, // Add zIndex to ensure filter dropdown appears above other elements
  },
  progressTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  filterWrapper: {
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 5,
  },
  filterButtonText: {
    fontSize: 18,
    color: 'black',
    fontWeight: '500',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 30,
  },
  progressCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 20,
    color: '#666',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  testsList: {
    gap: 15,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  testDate: {
    fontSize: 20,
    color: '#666',
  },
  testScore: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
    minWidth: 150,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterOptionText: {
    fontSize: 18,
    color: '#666',
  },
  filterOptionSelected: {
    color: 'blue',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performanceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  completionRate: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  weakAreasText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    color: '#2196F3',
    fontSize: 20,
    fontWeight: '600',
    bottom: '10px'
  },
}); 