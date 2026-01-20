// Call signaling service to manage voice call states and notifications
import { db, appId } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    deleteDoc,
    getDocs
} from 'firebase/firestore';

class CallSignalingService {
    constructor() {
        this.listeners = [];
        this.activeCallId = null;
        this.onIncomingCall = null;
        this.onCallStatusChanged = null;
        this.onCallEnded = null;
    }

    // Listen for incoming calls for a specific user
    startListeningForCalls(userId, callbacks = {}) {
        console.log('CallSignaling: Starting to listen for calls for user:', userId);
        
        // Set callbacks
        this.onIncomingCall = callbacks.onIncomingCall || null;
        this.onCallStatusChanged = callbacks.onCallStatusChanged || null;
        this.onCallEnded = callbacks.onCallEnded || null;

        const callsRef = collection(db, `artifacts/${appId}/public/data/calls`);
        
        // Listen for calls where this user is the recipient
        const incomingCallsQuery = query(
            callsRef,
            where('recipientId', '==', userId),
            where('status', 'in', ['calling', 'accepted']),
            orderBy('createdAt', 'desc')
        );

        // Listen for calls where this user is the caller (to get status updates)
        const outgoingCallsQuery = query(
            callsRef,
            where('callerId', '==', userId),
            where('status', 'in', ['calling', 'accepted', 'rejected']),
            orderBy('createdAt', 'desc')
        );

        const incomingListener = onSnapshot(incomingCallsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const call = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'added' && call.status === 'calling') {
                    console.log('CallSignaling: Incoming call detected:', call);
                    if (this.onIncomingCall) {
                        this.onIncomingCall(call);
                    }
                } else if (change.type === 'modified') {
                    console.log('CallSignaling: Call status changed:', call);
                    if (this.onCallStatusChanged) {
                        this.onCallStatusChanged(call);
                    }
                    
                    if (call.status === 'ended' && this.onCallEnded) {
                        this.onCallEnded(call);
                    }
                }
            });
        });

        const outgoingListener = onSnapshot(outgoingCallsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const call = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'modified' && call.callerId === userId) {
                    console.log('CallSignaling: Outgoing call status changed:', call);
                    if (this.onCallStatusChanged) {
                        this.onCallStatusChanged(call);
                    }
                    
                    if (call.status === 'ended' && this.onCallEnded) {
                        this.onCallEnded(call);
                    }
                }
            });
        });

        this.listeners.push(incomingListener);
        this.listeners.push(outgoingListener);
    }

    // Initiate a call
    async initiateCall(callerId, recipientId, callerName, recipientName, chatId) {
        try {
            console.log('CallSignaling: Initiating call from', callerId, 'to', recipientId);
            
            // First, clean up any existing calls between these users
            await this.cleanupExistingCalls(callerId, recipientId);
            
            const callsRef = collection(db, `artifacts/${appId}/public/data/calls`);
            const callDoc = await addDoc(callsRef, {
                callerId,
                recipientId,
                callerName,
                recipientName,
                chatId,
                status: 'calling',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            this.activeCallId = callDoc.id;
            console.log('CallSignaling: Call initiated with ID:', callDoc.id);
            return callDoc.id;
        } catch (error) {
            console.error('CallSignaling: Error initiating call:', error);
            throw error;
        }
    }

    // Accept an incoming call
    async acceptCall(callId) {
        try {
            console.log('CallSignaling: Accepting call:', callId);
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, callId);
            await updateDoc(callDocRef, {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            this.activeCallId = callId;
            return true;
        } catch (error) {
            console.error('CallSignaling: Error accepting call:', error);
            throw error;
        }
    }

    // Reject an incoming call
    async rejectCall(callId) {
        try {
            console.log('CallSignaling: Rejecting call:', callId);
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, callId);
            await updateDoc(callDocRef, {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            return true;
        } catch (error) {
            console.error('CallSignaling: Error rejecting call:', error);
            throw error;
        }
    }

    // End a call
    async endCall(callId) {
        try {
            console.log('CallSignaling: Ending call:', callId);
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, callId);
            await updateDoc(callDocRef, {
                status: 'ended',
                endedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            this.activeCallId = null;
            return true;
        } catch (error) {
            console.error('CallSignaling: Error ending call:', error);
            throw error;
        }
    }

    // Clean up existing calls between two users
    async cleanupExistingCalls(userId1, userId2) {
        try {
            const callsRef = collection(db, `artifacts/${appId}/public/data/calls`);
            
            // Find existing active calls between these users
            const query1 = query(
                callsRef,
                where('callerId', '==', userId1),
                where('recipientId', '==', userId2),
                where('status', 'in', ['calling', 'accepted'])
            );
            
            const query2 = query(
                callsRef,
                where('callerId', '==', userId2),
                where('recipientId', '==', userId1),
                where('status', 'in', ['calling', 'accepted'])
            );

            const [snapshot1, snapshot2] = await Promise.all([
                getDocs(query1),
                getDocs(query2)
            ]);

            const cleanupPromises = [];
            
            snapshot1.docs.forEach(doc => {
                cleanupPromises.push(updateDoc(doc.ref, {
                    status: 'ended',
                    endedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }));
            });
            
            snapshot2.docs.forEach(doc => {
                cleanupPromises.push(updateDoc(doc.ref, {
                    status: 'ended',
                    endedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }));
            });

            if (cleanupPromises.length > 0) {
                await Promise.all(cleanupPromises);
                console.log('CallSignaling: Cleaned up', cleanupPromises.length, 'existing calls');
            }
        } catch (error) {
            console.error('CallSignaling: Error cleaning up existing calls:', error);
        }
    }

    // Stop listening for calls
    stopListening() {
        console.log('CallSignaling: Stopping call listeners');
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        this.activeCallId = null;
        this.onIncomingCall = null;
        this.onCallStatusChanged = null;
        this.onCallEnded = null;
    }

    // Get current active call ID
    getActiveCallId() {
        return this.activeCallId;
    }

    // Set active call ID (for when joining an existing call)
    setActiveCallId(callId) {
        this.activeCallId = callId;
    }
}

// Create singleton instance
const callSignalingService = new CallSignalingService();
export default callSignalingService;
