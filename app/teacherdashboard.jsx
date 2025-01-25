import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  Avatar,
  Card,
  Title,
  Paragraph,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const StatCard = ({ title, value, icon }) => (
  <Card style={styles.statCard}>
    <Card.Content>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color="#666" />
        <Title>{title}</Title>
      </View>
      <Paragraph style={styles.statValue}>{value}</Paragraph>
    </Card.Content>
  </Card>
);

const ScheduleItem = ({ time, subject, className }) => (
  <Card style={styles.scheduleCard}>
    <Card.Content>
      <View style={styles.scheduleItem}>
        <Text style={styles.scheduleTime}>{time}</Text>
        <View>
          <Text style={styles.scheduleSubject}>{subject}</Text>
          <Text style={styles.scheduleClass}>{className}</Text>
        </View>
      </View>
    </Card.Content>
  </Card>
);

const ActionButton = ({ title, icon, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Icon name={icon} size={24} color="white" />
    <Text style={styles.actionButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default function TeacherDashboard() {
  const attendanceData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        data: [25, 26, 25, 24, 25],
        color: () => '#4CAF50',
        strokeWidth: 2,
      },
      {
        data: [2, 3, 2, 4, 3],
        color: () => '#FF5252',
        strokeWidth: 2,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Avatar.Text size={40} label="MJ" />
          <View style={styles.headerText}>
            <Text style={styles.teacherName}>Ms. Johnson</Text>
            <Text style={styles.department}>Science Department</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Today's Classes" value="5" icon="calendar-today" />
          <StatCard title="Total Students" value="150" icon="account-group" />
          <StatCard title="Assignments" value="12" icon="file-document" />
          <StatCard title="Average Score" value="82%" icon="chart-line" />
        </View>

        <Card style={styles.chartCard}>
          <Card.Content>
            <Title>Weekly Attendance</Title>
            <LineChart
              data={attendanceData}
              width={Dimensions.get('window').width - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        <View style={styles.scheduleSection}>
          <Title>Today's Schedule</Title>
          <ScheduleItem
            time="09:00 AM"
            subject="Mathematics - Trigonometry"
            className="Class 10A"
          />
          <ScheduleItem
            time="11:00 AM"
            subject="Physics - Newton's Laws"
            className="Class 9B"
          />
          <ScheduleItem
            time="02:00 PM"
            subject="Mathematics - Calculus"
            className="Class 10A"
          />
        </View>

        <View style={styles.actionButtons}>
          <ActionButton 
            title="Take Attendance" 
            icon="clipboard-check" 
            onPress={() => console.log('Take Attendance')}
          />
          <ActionButton 
            title="Add Assignment" 
            icon="plus-circle" 
            onPress={() => console.log('Add Assignment')}
          />
          <ActionButton 
            title="Schedule Test" 
            icon="clock" 
            onPress={() => console.log('Schedule Test')}
          />
          <ActionButton 
            title="Send Notice" 
            icon="bell" 
            onPress={() => console.log('Send Notice')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  menuButton: {
    padding: 8,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  department: {
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chartCard: {
    margin: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  scheduleSection: {
    padding: 16,
  },
  scheduleCard: {
    marginVertical: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTime: {
    width: 80,
    fontWeight: 'bold',
  },
  scheduleSubject: {
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleClass: {
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#1a237e',
    width: '48%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
});