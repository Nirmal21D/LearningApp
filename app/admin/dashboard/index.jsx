import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function AdminDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Welcome to the Admin Dashboard</Text>
        <Text style={styles.description}>
          Here you can manage curriculums, users, and other administrative tasks.
        </Text>
        <Link href="/admin/create_curriculum" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Create Curriculum</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
