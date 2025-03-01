import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { Link, router } from 'expo-router';
import { useState , useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function Signup() {
  // State declarations and other logic remain unchanged
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
  const colors = {
    primary: '#2196F3',
    background: '#f8f9fa',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    categoryColors: {
      Physics: '#ff6b6b',
      Chemistry: '#4ecdc4',
      Mathematics: '#45b7d1',
      Biology: '#96ceb4',
      'Study Skills': '#ff9f43',
    }
  };

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

        // Create user document with additional fields for teachers
        const userData = {
          username: formData.username,
          email: formData.email,
          mobile: formData.mobile,
          userType: formData.userType,
          createdAt: new Date(),
        };

        // Add teacher-specific fields if user is a teacher
        if (formData.userType === 'teacher') {
          userData.selectedSubject = formData.selectedSubject;
          userData.approved = false;
          userData.status = 'pending';
          userData.submittedAt = new Date();
        }

        await setDoc(doc(db, 'users', user.uid), userData);

        // Redirect based on user type
        if (formData.userType === 'teacher') {
          router.push('/teacher/waiting-approval');
        } else if (formData.userType === 'careerGuider') {
          router.push('/career-guider/dashboard');
        } else {
          router.push('/home');
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
    return null;
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
        {/* Header section with back button and titles */}
        <View style={styles.headerSection}>
        <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>
        </View>

        {/* Form container with proper spacing from the header */}
        <ScrollView 
          style={styles.formContainer} 
          contentContainerStyle={{ paddingBottom: 20, gap: 15 }}
          showsVerticalScrollIndicator={false}
        >
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
              <Picker.Item label="Career Guider" value="careerGuider" />
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

          {/* <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton}>
            <Ionicons name="logo-google" size={20} color="#666" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity> */}

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
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'flex-start',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  // New header section that contains both the back button and titles
  headerSection: {
    width: '100%',
    flexDirection: 'column',
    // alignItems: 'center',
    marginBottom: 16,
    marginTop: Platform.OS === 'web' ? 10 : 20,
  },
  topBarContainer: {
    top: Platform.OS === 'web' ? 20 : 1,
    left: Platform.OS === 'web' ? 20 : 10,
  },
  headerContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 26,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: '#666',
    lineHeight: 24,
  },
  formContainer: {
    gap: 20,
    padding: Platform.OS === 'web' ? 25 : 20,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(3px)' : undefined,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    shadowOpacity: 0.01,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,

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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    height: 55,
  },
  picker: {
    flex: 1,
    height: 55,
    color: '#666',
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: -10,
    marginLeft: 5,
  },
  signupButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.75)',
    padding: Platform.OS === 'web' ? 16 : 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  // googleButton: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   backgroundColor: 'rgba(255, 255, 255, 0.5)',
  //   padding: Platform.OS === 'web' ? 16 : 14,
  //   borderRadius: 16,
  //   borderWidth: 1.5,
  // },
  // googleButtonText: {
  //   marginLeft: 10,
  //   color: '#666',
  //   fontSize: 16,
  // },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    left: 6,
  },
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    // elevation: 3,
  },

  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  blurCircle1: {
    width: Platform.OS === 'web' ? 250 : 200,
    height: Platform.OS === 'web' ? 250 : 200,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 20 : 10,
    left: Platform.OS === 'web' ? -80 : -60,
    transform: [
      { scale: 1.2 },
      { rotate: '-15deg' }
    ],
  },
  blurCircle2: {
    width: Platform.OS === 'web' ? 220 : 180,
    height: Platform.OS === 'web' ? 220 : 180,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    top: Platform.OS === 'web' ? 390 : 320,
    right: Platform.OS === 'web' ? -40 : -30,
    transform: [
      { scale: 1.1 },
      { rotate: '30deg' }
    ],
  },
  blurCircle3: {
    width: Platform.OS === 'web' ? 200 : 160,
    height: Platform.OS === 'web' ? 200 : 160,
    backgroundColor: 'rgba(173, 216, 255, 0.45)',
    bottom: Platform.OS === 'web' ? 30 : 60,
    left: Platform.OS === 'web' ? -60 : -40,
    transform: [
      { scale: 1 },
      { rotate: '15deg' }
    ],
  },
});