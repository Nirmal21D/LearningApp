import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
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

          <View entering={FadeInDown.duration(1000).springify()} style={styles.main}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>User Type</Text>
          <Picker selectedValue={formData.userType} style={styles.picker} onValueChange={(itemValue) => setFormData({ ...formData, userType: itemValue })}>
            <Picker.Item label="Student" value="student" />
            <Picker.Item label="Teacher" value="teacher" />
          </Picker>
        </View>
        {formData.userType === 'teacher' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Subject</Text>
            <Picker selectedValue={formData.selectedSubject} style={styles.picker} onValueChange={(itemValue) => setFormData({ ...formData, selectedSubject: itemValue })}>
              <Picker.Item label="Select a subject" value="" />
              {subjects.map((subject) => (
                <Picker.Item key={subject.id} label={subject.name} value={subject.name} />
              ))}
            </Picker>
          </View>
        )}
      </View>

        
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
    backgroundColor: '#f5f5f5',
  },
  main: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: -10,
    marginLeft: 5,
  },
  signupButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: 'white',
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
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
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
}); 