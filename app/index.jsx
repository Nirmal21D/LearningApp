import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { auth } from '../lib/firebase'; // Import Firebase auth
import { useEffect } from 'react';
import AdminDashboard from './admin/dashboard';


export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        router.push('/home'); // Redirect to home if user exists
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        entering={FadeInDown.duration(1000).springify()}
        style={styles.main}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Welcome to Learning</Text>
          <Text style={styles.titleSecondLine}>App!</Text>
          <Text style={styles.subtitle}>Your gateway to effortless learning</Text>
        </View>

        {/* Icon Section */}
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={260} color="#2196F3" />
        </View>

        {/* Bottom Text */}
        <Text style={styles.bottomText}>Please log in or sign up to continue</Text>

        {/* Buttons Container */}
        <View style={styles.buttonContainer}>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.loginButton}>
              <Ionicons name="log-in-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/signup" asChild>
            <TouchableOpacity style={styles.signupButton}>
              <Ionicons name="person-add-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  titleSecondLine: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  signupButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
});
