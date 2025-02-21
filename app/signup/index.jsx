import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { useState , useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { auth, db } from '../../lib/firebase'; // Import Firebase auth and db
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext'; // Adjust the import path as necessary
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    userType: 'student',
    selectedSubject: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [subjects, setSubjects] = useState([]);
  const router = useRouter();
  const authContext = useAuth();
  const user = authContext?.user;

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const db = getFirestore();
        const subjectsCollection = collection(db, "subjects");
        const subjectsSnapshot = await getDocs(subjectsCollection);
        const subjectsList = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsList);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (validateForm()) {
       try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          username: formData.username,
          email: formData.email,
          mobile: formData.mobile,
          userType: formData.userType,
          selectedSubject: formData.userType === 'teacher' ? formData.selectedSubject : null,
        });

        // Redirect based on user type
        if (formData.userType === 'teacher') {
          router.push('/teacher/dashboard'); // Redirect to teacher dashboard
        } else {
          router.push('/home'); // Redirect to home for students
        }
      } catch (error) {
        console.error('Signup error:', error.message);
        Alert.alert('Signup Error', error.message);
      }
    }
  };

  // Redirect if user is already logged in
  if (user) {
    router.push('/home');
    return null; // Prevent rendering the signup form
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <Animated.View 
        entering={FadeInDown.duration(1000).springify()} 
        style={styles.main}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 20, gap: 15 }}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={formData.username}
              onChangeText={(text) => setFormData({...formData, username: text})}
              autoCapitalize="none"
            />
          </View>
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              value={formData.mobile}
              onChangeText={(text) => setFormData({...formData, mobile: text})}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>
          {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              secureTextEntry={!showPassword}
            />
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <View style={styles.pickerContainer}>
            <Ionicons name="person-outline" size={24} color="#666" style={styles.inputIcon} />
            <Picker
              selectedValue={formData.userType}
              style={styles.picker}
              onValueChange={(itemValue) => setFormData({ ...formData, userType: itemValue })}
            >
              <Picker.Item label="Student" value="student" />
              <Picker.Item label="Teacher" value="teacher" />
            </Picker>
          </View>

          {formData.userType === 'teacher' && (
            <View style={styles.pickerContainer}>
              <Ionicons name="book-outline" size={24} color="#666" style={styles.inputIcon} />
              <Picker
                selectedValue={formData.selectedSubject}
                style={styles.picker}
                onValueChange={(itemValue) => setFormData({ ...formData, selectedSubject: itemValue })}
              >
                <Picker.Item label="Select a subject" value="" />
                {subjects.map((subject) => (
                  <Picker.Item key={subject.id} label={subject.name} value={subject.name} />
                ))}
              </Picker>
            </View>
          )}

          <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton}>
            <Ionicons name="logo-google" size={20} color="#666" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },

  headerSection: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 10,
    zIndex: 1,
  },

  headerContainer: {
    marginLeft: 15,
    paddingTop: 8,
  },

  title: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: 'bold',
    color: '#1A237E',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: '#666',
    lineHeight: 24,
  },

  formContainer: {
    marginTop: 20,
    gap: 20,
    padding: Platform.OS === 'web' ? 25 : 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    marginLeft: 12,
  },

  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
    height: 55,
  },

  picker: {
    flex: 1,
    height: 50,
    color: '#333',
    marginLeft: 12,
    backgroundColor: 'transparent',
  },

  errorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: -10,
    marginLeft: 5,
  },

  signupButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.95)',
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },

  signupButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 17 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },

  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },

  googleButtonText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 16,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  loginText: {
    color: '#666',
  },

  loginLink: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 15,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },

  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
  },

  blurCircle1: {
    width: Platform.OS === 'web' ? 300 : 200,
    height: Platform.OS === 'web' ? 300 : 200,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    top: Platform.OS === 'web' ? -50 : -30,
    left: Platform.OS === 'web' ? -150 : -100,
    transform: [{ rotate: '-15deg' }],
  },

  blurCircle2: {
    width: Platform.OS === 'web' ? 200 : 150,
    height: Platform.OS === 'web' ? 200 : 150,
    backgroundColor: 'rgba(100, 181, 246, 0.2)',
    top: '30%',
    right: Platform.OS === 'web' ? -30 : -20,
    transform: [{ rotate: '30deg' }],
  },

  blurCircle3: {
    width: Platform.OS === 'web' ? 300 : 200,
    height: Platform.OS === 'web' ? 300 : 200,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    bottom: Platform.OS === 'web' ? -100 : -50,
    left: Platform.OS === 'web' ? -50 : -30,
    transform: [{ rotate: '15deg' }],
  },
});