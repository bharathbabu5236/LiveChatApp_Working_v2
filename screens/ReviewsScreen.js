// LiveChatApp/screens/ReviewsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth, appId } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';
import { useTranslation } from '../context/TranslationContext';
import { useTextToSpeech } from '../context/TextToSpeechContext';
import LanguageSelector from '../components/LanguageSelector';
import TTSSettings from '../components/TTSSettings';
import SpeakableText from '../components/SpeakableText';
import { translateText } from '../translationService';

const { width } = Dimensions.get('window');

const ReviewsScreen = () => {
    const navigation = useNavigation();
    const { t, currentLanguage } = useTranslation();
    const { speak, ttsEnabled, ttsRate, ttsPitch, ttsVolume } = useTextToSpeech();
    const typingTimeoutRef = useRef(null);
    const [reviews, setReviews] = useState([]);
    const [translatedReviews, setTranslatedReviews] = useState({});
    const [newReview, setNewReview] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [rating, setRating] = useState(5);
    const [loading, setLoading] = useState(false);
    const [translatingReviews, setTranslatingReviews] = useState(false);

    // Sample reviews data
    const sampleReviews = [
        {
            id: '1',
            name: 'Sarah Johnson',
            rating: 5,
            comment: 'Excellent customer service! The support team was very helpful and resolved my issue quickly.',
            date: '2025-08-08',
            verified: true
        },
        {
            id: '2',
            name: 'Michael Chen',
            rating: 4,
            comment: 'Great experience overall. The chat system is user-friendly and the agents are knowledgeable.',
            date: '2025-08-07',
            verified: true
        },
        {
            id: '3',
            name: 'Emma Williams',
            rating: 5,
            comment: 'I love the multi-language support! Being able to chat in my native language made everything so much easier.',
            date: '2025-08-06',
            verified: true
        },
        {
            id: '4',
            name: 'David Rodriguez',
            rating: 4,
            comment: 'Fast response times and professional service. The department routing feature is very efficient.',
            date: '2025-08-05',
            verified: true
        },
        {
            id: '5',
            name: 'Lisa Thompson',
            rating: 5,
            comment: 'Outstanding support! The agents went above and beyond to help with my payment issues.',
            date: '2025-08-04',
            verified: true
        }
    ];

    useEffect(() => {
        // Load sample reviews initially
        setReviews(sampleReviews);

        // Set up real-time listener for new reviews from Firebase
        try {
            const reviewsRef = collection(db, `artifacts/${appId}/public/data/reviews`);
            const q = query(reviewsRef, orderBy('timestamp', 'desc'), limit(50));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const firebaseReviews = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().timestamp?.toDate().toLocaleDateString() || new Date().toLocaleDateString()
                }));
                
                // Combine sample reviews with Firebase reviews
                setReviews([...firebaseReviews, ...sampleReviews]);
            }, (error) => {
                console.error('Error fetching reviews:', error);
                // If Firebase fails, keep sample reviews
                setReviews(sampleReviews);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error setting up reviews listener:', error);
            // Keep sample reviews if Firebase setup fails
            setReviews(sampleReviews);
        }
    }, []);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // Translate reviews when language changes
    useEffect(() => {
        if (currentLanguage !== 'en' && reviews.length > 0) {
            translateReviewsContent();
        } else {
            setTranslatedReviews({});
        }
    }, [currentLanguage, reviews]);

    const translateReviewsContent = async () => {
        if (currentLanguage === 'en') {
            setTranslatedReviews({});
            return;
        }

        setTranslatingReviews(true);
        const newTranslatedReviews = {};

        try {
            // Translate reviews in batches to optimize API usage
            const batchSize = 5;
            for (let i = 0; i < reviews.length; i += batchSize) {
                const batch = reviews.slice(i, i + batchSize);
                const batchPromises = batch.map(async (review) => {
                    try {
                        const translatedComment = await translateText(review.comment, currentLanguage, 'auto');
                        return {
                            id: review.id,
                            translatedComment: translatedComment.translatedText
                        };
                    } catch (error) {
                        console.error(`Error translating review ${review.id}:`, error);
                        return {
                            id: review.id,
                            translatedComment: review.comment // Fallback to original
                        };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ id, translatedComment }) => {
                    newTranslatedReviews[id] = translatedComment;
                });

                // Small delay between batches to avoid rate limiting
                if (i + batchSize < reviews.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            setTranslatedReviews(newTranslatedReviews);
        } catch (error) {
            console.error('Error translating reviews:', error);
        } finally {
            setTranslatingReviews(false);
        }
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const handleSubmitReview = async () => {
        if (!newReview.trim()) {
            Alert.alert(t('error'), t('review_required'));
            return;
        }

        if (!customerName.trim()) {
            Alert.alert(t('error'), t('name_required'));
            return;
        }

        setLoading(true);

        try {
            // Try to save to Firebase first
            const reviewData = {
                name: customerName.trim(),
                comment: newReview.trim(),
                rating: rating,
                timestamp: serverTimestamp(),
                verified: false,
                userId: auth.currentUser?.uid || 'anonymous'
            };

            await addDoc(collection(db, `artifacts/${appId}/public/data/reviews`), reviewData);
            
            Alert.alert(t('success'), t('review_success'));
        } catch (error) {
            console.error('Error submitting review:', error);
            
            // Fallback: Add review locally if Firebase fails
            const localReview = {
                id: Date.now().toString(),
                name: customerName.trim(),
                comment: newReview.trim(),
                rating: rating,
                date: new Date().toLocaleDateString(),
                verified: false
            };
            
            setReviews(prevReviews => [localReview, ...prevReviews]);
            Alert.alert(t('success'), t('review_added'));
        }

        // Clear form
        setNewReview('');
        setCustomerName('');
        setRating(5);
        setLoading(false);
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <MaterialIcons
                    key={i}
                    name={i <= rating ? 'star' : 'star-border'}
                    size={16}
                    color={i <= rating ? '#f39c12' : '#bdc3c7'}
                />
            );
        }
        return stars;
    };

    const renderRatingSelector = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                    <MaterialIcons
                        name={i <= rating ? 'star' : 'star-border'}
                        size={30}
                        color={i <= rating ? '#f39c12' : '#bdc3c7'}
                        style={{ marginHorizontal: 2 }}
                    />
                </TouchableOpacity>
            );
        }
        return stars;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <SpeakableText style={styles.headerTitle} hoverOptions={{ delay: 300 }}>
                    {t('customer_reviews')}
                </SpeakableText>
                <View style={styles.headerActions}>
                    {currentLanguage !== 'en' && (
                        <TouchableOpacity 
                            onPress={translateReviewsContent} 
                            style={styles.refreshButton}
                            disabled={translatingReviews}
                        >
                            <MaterialIcons 
                                name="refresh" 
                                size={20} 
                                color={translatingReviews ? '#bdc3c7' : '#3498db'} 
                            />
                        </TouchableOpacity>
                    )}
                    <TTSSettings iconSize={18} />
                    <LanguageSelector 
                        buttonStyle={styles.headerLanguageButton}
                        textStyle={styles.headerLanguageText}
                    />
                </View>
            </View>

            <KeyboardAvoidingView 
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    style={styles.content} 
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    scrollIndicatorInsets={{ right: 1 }}
                    indicatorStyle="black"
                    bounces={true}
                    alwaysBounceVertical={true}
                >
                    {/* Add Review Section */}
                    <View style={styles.addReviewSection}>
                        <SpeakableText style={styles.addReviewTitle} hoverOptions={{ delay: 300 }}>
                            {t('share_experience')}
                        </SpeakableText>
                    
                    <TextInput
                        style={styles.nameInput}
                        placeholder={t('your_name')}
                        value={customerName}
                        onChangeText={setCustomerName}
                        maxLength={50}
                    />

                    <View style={styles.ratingSection}>
                        <SpeakableText style={styles.ratingLabel} hoverOptions={{ delay: 200 }}>
                            {t('rate_experience')}
                        </SpeakableText>
                        <View style={styles.ratingStars}>
                            {renderRatingSelector()}
                        </View>
                    </View>

                    <TextInput
                        style={styles.reviewInput}
                        placeholder={t('write_review')}
                        value={newReview}
                        onChangeText={(text) => {
                            setNewReview(text);
                            // Read the typed text aloud with a slight delay
                            if (text.trim() && ttsEnabled) {
                                clearTimeout(typingTimeoutRef.current);
                                typingTimeoutRef.current = setTimeout(() => {
                                    speak(text, { 
                                        rate: ttsRate * 0.8, // Slightly slower for typing
                                        pitch: ttsPitch,
                                        volume: ttsVolume * 0.7 // Slightly quieter for typing
                                    });
                                }, 1500); // Wait 1.5 seconds after user stops typing
                            }
                        }}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmitReview}
                        disabled={loading}
                    >
                        <MaterialIcons 
                            name="send" 
                            size={20} 
                            color="white" 
                            style={{ marginRight: 8 }} 
                        />
                        <SpeakableText style={styles.submitButtonText} hoverOptions={{ delay: 200 }}>
                            {loading ? t('submitting') : t('submit_review')}
                        </SpeakableText>
                    </TouchableOpacity>
                </View>

                {/* Reviews List */}
                <View style={styles.reviewsSection}>
                    <View style={styles.reviewsSectionHeader}>
                        <SpeakableText style={styles.reviewsSectionTitle} hoverOptions={{ delay: 300 }}>
                            {t('customer_reviews')} ({reviews.length})
                        </SpeakableText>
                        {translatingReviews && (
                            <View style={styles.translatingIndicator}>
                                <MaterialIcons name="translate" size={16} color="#3498db" />
                                <SpeakableText style={styles.translatingText} hoverOptions={{ delay: 200 }}>
                                    {t('translating')}...
                                </SpeakableText>
                            </View>
                        )}
                    </View>
                    
                    {reviews.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.reviewerInfo}>
                                    <SpeakableText style={styles.reviewerName} hoverOptions={{ delay: 200 }}>
                                        {review.name}
                                        {review.verified && (
                                            <MaterialIcons 
                                                name="verified" 
                                                size={16} 
                                                color="#2ecc71" 
                                                style={{ marginLeft: 4 }} 
                                            />
                                        )}
                                    </SpeakableText>
                                    <SpeakableText style={styles.reviewDate} hoverOptions={{ delay: 200 }}>
                                        {review.date}
                                    </SpeakableText>
                                </View>
                                <View style={styles.reviewRating}>
                                    {renderStars(review.rating)}
                                </View>
                            </View>
                            <SpeakableText 
                                style={styles.reviewComment}
                                text={currentLanguage !== 'en' && translatedReviews[review.id] 
                                    ? translatedReviews[review.id] 
                                    : review.comment}
                                hoverOptions={{ delay: 400 }}
                            >
                                {currentLanguage !== 'en' && translatedReviews[review.id] 
                                    ? translatedReviews[review.id] 
                                    : review.comment}
                            </SpeakableText>
                            {currentLanguage !== 'en' && translatedReviews[review.id] && (
                                <View style={styles.translationIndicator}>
                                    <MaterialIcons name="translate" size={12} color="#7f8c8d" />
                                    <SpeakableText style={styles.translationIndicatorText} hoverOptions={{ delay: 200 }}>
                                        {t('translated_from_original')}
                                    </SpeakableText>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
                
                    {/* Extra spacing for better scrolling */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    keyboardContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e8ed',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    refreshButton: {
        padding: 8,
        marginRight: 8,
    },
    headerLanguageButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    headerLanguageText: {
        fontSize: 12,
        color: '#2c3e50',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 50,
    },
    addReviewSection: {
        backgroundColor: 'white',
        marginTop: 20,
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addReviewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    nameInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    ratingSection: {
        marginBottom: 15,
    },
    ratingLabel: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 8,
        fontWeight: '500',
    },
    ratingStars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 100,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    submitButton: {
        backgroundColor: '#3498db',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reviewsSection: {
        marginTop: 30,
        marginBottom: 20,
    },
    reviewsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    reviewsSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    translatingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    translatingText: {
        fontSize: 12,
        color: '#3498db',
        marginLeft: 4,
        fontStyle: 'italic',
    },
    reviewCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    reviewerInfo: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewDate: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewComment: {
        fontSize: 14,
        color: '#34495e',
        lineHeight: 20,
    },
    translationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    translationIndicatorText: {
        fontSize: 11,
        color: '#7f8c8d',
        fontStyle: 'italic',
        marginLeft: 4,
    },
});

export default ReviewsScreen;
