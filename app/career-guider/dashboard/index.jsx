import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../../lib/AuthContext';

export default function CareerGuiderDashboard() {
  const router = useRouter();
  const authContext = useAuth();
  const user = authContext?.user;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login'); // Redirect to login after logout
    } catch (error) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  const topics = [
    { id: '1', title: 'Resume Building Tips' },
    { id: '2', title: 'How to Ace Job Interviews' },
    { id: '3', title: 'Top Skills for the Future' },
    { id: '4', title: 'Networking Strategies' },
    { id: '5', title: 'Freelancing vs Corporate Jobs' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.displayName || 'Career Guider'}!</Text>
      
      <Text style={styles.subtitle}>Here are some career guidance topics:</Text>
      
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="briefcase-outline" size={24} color="#007AFF" />
            <Text style={styles.cardText}>{item.title}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginVertical: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    marginVertical: 5,
    width: '100%',
    borderRadius: 10,
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardText: {
    marginLeft: 10,
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
