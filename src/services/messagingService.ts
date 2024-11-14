import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

export class MessagingService {
  static async sendNotificationToUser(userId: string, notificationData: any) {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists() || !userDoc.data().currentiOSFCM) {
        console.error('No FCM token found for user:', userId);
        return;
      }

      const token = userDoc.data().currentiOSFCM;

      const functions = getFunctions();
      const sendMessage = httpsCallable(functions, 'sendMessage');

      try {
        console.log('Sending message to token:', token);
        await sendMessage({
          token,
          notification: {
            title: notificationData.title || "New Notification",
            body: notificationData.body || "You have a new notification"
          },
          data: {
            type: String(notificationData.type),
            timestamp: String(notificationData.timestamp)
          },
          apns: {
            headers: {
              "apns-priority": "10",
              "apns-push-type": "alert"
            },
            payload: {
              aps: {
                alert: {
                  title: notificationData.title || "New Notification",
                  body: notificationData.body || "You have a new notification"
                },
                sound: "default",
                badge: 1,
                "mutable-content": 1,
                "content-available": 1
              },
              messageData: {
                type: notificationData.type,
                timestamp: notificationData.timestamp
              }
            }
          }
        });
        console.log('Successfully sent message to token:', token);
      } catch (error: any) {
        console.error('Error sending to token:', token, error);
        if (error?.code === 'messaging/invalid-registration-token') {
          // Handle invalid token cleanup
        }
      }
    } catch (error) {
      console.error('Error in sendNotificationToUser:', error);
      throw error;
    }
  }
}
