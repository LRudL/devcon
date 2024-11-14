import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

exports.sendMessage = functions.https.onCall(async (request) => {
  console.log("Received request:", request);

  if (!request.auth) {
    console.warn("Unauthenticated request");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {token, data: messageData, notification, apns} = request.data;
  console.log("Message data:", messageData);
  console.log("Notification:", notification);
  console.log("APNS:", apns);
  console.log("FCM Token being used:", token);

  try {
    console.log("Sending message to token:", token);
    const sanitizedData: Record<string, string> = {};

    // Ensure all data values are strings
    if (messageData) {
      Object.entries(messageData).forEach(([key, value]) => {
        sanitizedData[key] = String(value);
      });
    }

    await admin.messaging().send({
      token,
      notification, // Include the notification payload
      data: sanitizedData,
      apns, // Include the APNS configuration
    });

    console.log("Message sent successfully");
    return {success: true};
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
});
