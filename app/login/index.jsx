import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  

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

  const handleLogin = async (emailParam, passwordParam) => {
    const loginEmail = emailParam || email;
    const loginPassword = passwordParam || password;

    try {
      // Admin login
      if (loginEmail === 'admin' && loginPassword === 'admin123') {
      
        router.push('/admin/dashboard');
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      console.log('Login successful');

      // Save credentials
    
      // Get user type from Firestore
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userData = userDoc.data();

      if (userData.userType === 'teacher') {
        // Check if teacher is approved
        if (!userData.isApproved) {
          /* Alert.alert(
            'Account Pending Approval',
            'Your account is pending approval from an administrator. Please try again later.',
            [{ text: 'OK' }]
          ); */
          return;
        }
        router.push('/teacher/dashboard');
      } else if (userData.userType === 'careerGuider') {
        router.push('/career-guider/dashboard');
      } else {
        router.push('/home');
      }
    } catch (error) {
     /*  console.error('Login error:', error); */
      let errorMessage = 'Failed to log in. Please check your credentials.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      setError(errorMessage);
    }
  };

  // const handleGoogleLogin = () => {
  //   // Implement Google login logic here
  //   console.log('Google login attempted');
  // };

  const handleForgotPassword = () => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log('Password reset email sent');
        setError('Check your email for password reset instructions.');
      })
      .catch((error) => {
        console.error('Error sending password reset email:', error.message);
        setError('Failed to send password reset email. Please try again.');
      });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E3F2FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />
      <View style={[styles.blurCircle, styles.blurCircle3]} />

      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          {/* Fixed position header */}
          <View style={styles.topBarContainer}>
            <BlurView intensity={0} tint="light" style={[styles.backButton, styles.glassEffect]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333"/>
              </TouchableOpacity>
            </BlurView>
            
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Enter your credentials to access your account</Text>
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeInDown.duration(1000).springify()} 
              style={styles.main}
            >
              {/* Empty space to account for fixed header */}
              <View style={styles.headerSpacer} />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
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

                <View style={styles.optionsContainer}>
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgotPassword}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin()}>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </TouchableOpacity>

                {/* <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>Or continue with</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                  <Ionicons name="logo-google" size={20} color="#666" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity> */}

                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <Link href="/signup" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signupLink}>Sign up</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  // scrollViewContent: {
  //   flexGrow: 1,
  //   paddingBottom: 20,
  // },
  main: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 16,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
    bottom: 80,
  },
  // Fixed position for the header
  topBarContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: Platform.OS === 'web' ? 20 : 16,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  headerContainer: {
    marginLeft: 5,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 17 : 14,
    color: '#666',
    lineHeight: 15,
    marginRight: 25,
  },
  // Spacer to prevent content from being hidden under the fixed header
  headerSpacer: {
    height: Platform.OS === 'web' ? 130 : 260,
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 15,
  },
  loginButton: {
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
  loginButtonText: {
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
    backgroundColor: 'rgba(102, 102, 102, 0.3)',
  },
  dividerText: {
    color: '#666666',
    paddingHorizontal: 10,
  },
  // googleButton: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   backgroundColor: 'rgba(255, 255, 255, 0.6)',
  //   padding: 15,
  //   borderRadius: 25,
  //   borderWidth: 1,
  //   borderColor: 'rgba(255, 255, 255, 0.8)',
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 8,
  // },
  // googleButtonText: {
  //   marginLeft: 10,
  //   color: '#666',
  //   fontSize: 16,
  // },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
  },
  signupLink: {
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