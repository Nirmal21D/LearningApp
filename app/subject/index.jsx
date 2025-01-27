import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function SubjectPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { subjectId, subjectName, subjectColor } = params;

  const [videos, setVideos] = useState([]);
  const [tests, setTests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTests, setUserTests] = useState([]); // State to store user's given tests
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const fetchSubjectData = async () => {
        try {
          // Fetch videos
          const videosRef = collection(db, 'videos');
          console.log(subjectId);
          const videoQuery = query(videosRef, where('subjectId', '==', subjectId));
          const videoSnapshot = await getDocs(videoQuery);
          const videosList = videoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setVideos(videosList);

          // Fetch tests
          const testsRef = collection(db, 'tests');
          const testQuery = query(testsRef, where('subjectId', '==', subjectId));
          const testSnapshot = await getDocs(testQuery);
          const testsList = testSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTests(testsList);

          // Fetch study materials
          const materialsRef = collection(db, 'materials');
          const materialQuery = query(materialsRef, where('subjectId', '==', subjectId));
          const materialSnapshot = await getDocs(materialQuery);
          const materialsList = materialSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMaterials(materialsList);

          // Fetch user's given tests
          const userTestsRef = collection(db, 'userProgress');
          const userTestsQuery = query(userTestsRef, where('userId', '==', currentUser.uid));
          const userTestsSnapshot = await getDocs(userTestsQuery);
          const userTestsList = userTestsSnapshot.docs.map(doc => doc.data().testId);
          setUserTests(userTestsList);

          setLoading(false);
        } catch (error) {
          console.error('Error fetching subject data:', error);
          setLoading(false);
        }
      };

      fetchSubjectData();
    });

    return () => unsubscribe();
  }, [subjectId]);

  const handleOpenPDF = async (pdfUrl) => {
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        console.log("Cannot open URL: " + pdfUrl);
      }
    } catch (error) {
      console.error("Error opening PDF:", error);
    }
  };

  const handleOpenVideo = async (videoUrl) => {
    try {
      const supported = await Linking.canOpenURL(videoUrl);
      if (supported) {
        await Linking.openURL(videoUrl);
      } else {
        console.log("Cannot open URL: " + videoUrl);
      }
    } catch (error) {
      console.error("Error opening video:", error);
    }
  };

  const renderCarouselItem = (item, type) => {
    switch(type) {
      case 'video':
        return (
          <TouchableOpacity key={item.id} style={styles.videoCard} onPress={() => handleOpenVideo(item.url)}>
            <View style={styles.thumbnailContainer}>
              <View style={[styles.thumbnailOverlay, { backgroundColor: subjectColor }]}>
                <Ionicons name="play-circle" size={40} color="blue" />
              </View>
              <Text style={styles.duration}>{item.duration}</Text>
            </View>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          </TouchableOpacity>
        );
      
      case 'test':
        const isTestGiven = userTests.includes(item.id); // Check if the test is given by the user
        return (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.testCard, { borderColor: subjectColor, backgroundColor: isTestGiven ? '#d4edda' : 'white' }]} // Highlight if test is given
            onPress={() => router.push(`/test?testId=${item.id}`)}
          >
            <View style={[styles.testIconContainer, { backgroundColor: subjectColor }]}>
              <Ionicons name="document-text" size={24} color="blue" />
            </View>
            <Text style={styles.testTitle}>{item.title}</Text>
            <View style={styles.testInfo}>
              <Text style={styles.testInfoText}>{item.questions?.length || 0} Questions</Text>
              <Text style={styles.testInfoText}>{item.duration}</Text>
            </View>
          </TouchableOpacity>
        );
      
      case 'pdf':
        return (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.pdfCard, { borderColor: subjectColor }]}
            onPress={() => handleOpenPDF(item.url)}
          >
            <View style={[styles.pdfIconContainer, { backgroundColor: subjectColor }]}>
              <Ionicons name="document" size={24} color="blue" />
            </View>
            <Text style={styles.pdfTitle}>{item.name}</Text>
            <View style={styles.pdfInfo}>
              <Text style={styles.pdfInfoText}>{item.pages} Pages</Text>
              
              <Text style={styles.pdfInfoText}>{item.materialType}</Text>
              <Text style={styles.pdfInfoText}>{item.difficulty}</Text>
            </View>
          </TouchableOpacity>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={{
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
          }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.subjectName, { fontSize: 28 }]}>{subjectName}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Videos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Video Lectures</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllButton, { color: subjectColor }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {videos.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
            >
              {videos.map(video => renderCarouselItem(video, 'video'))}
            </ScrollView>
          ) : (
            <Text style={styles.noVideosText}>No videos available for this subject.</Text>
          )}
        </View>

        {/* Tests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Practice Tests</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllButton, { color: subjectColor }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
          >
            {tests.map(test => renderCarouselItem(test, 'test'))}
          </ScrollView>
        </View>

        {/* PDFs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Study Materials</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllButton, { color: subjectColor }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
          >
            {materials.map(pdf => renderCarouselItem(pdf, 'pdf'))}
          </ScrollView>
        </View>

        {/* Updated Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
            <Ionicons name="arrow-forward-outline" size={20} color="white" />
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  section: {
    marginVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'black',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: 'blue'
  },
  carousel: {
    paddingLeft: 20,
    marginBottom: 10,
  },
  videoCard: {
    width: 300,
    marginRight: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  thumbnailContainer: {
    height: 180,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    padding: 15,
    fontSize: 20,
    fontWeight: '500',
    color: 'black',
  },
  duration: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: 'white',
    fontSize: 16,
  },
  noVideosText: {
    paddingHorizontal: 20,
    fontSize: 16,
    color: 'gray',
  },
  testCard: {
    width: 250,
    marginRight: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  testIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: 'black',
    marginBottom: 10,
  },
  testInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testInfoText: {
    fontSize: 16,
    color: 'black',
  },
  pdfCard: {
    width: 250,
    marginRight: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  pdfIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  pdfTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: 'black',
    marginBottom: 10,
  },
  pdfInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 5
  },
  pdfInfoText: {
    fontSize: 16,
    color: 'black',
  },
  footer: {
    padding: 30,
    backgroundColor: 'white',
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 25,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 25,
    marginBottom: 25,
  },
  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    width: '100%',
    maxWidth: 300,
    elevation: 3,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
