import { getAuth } from 'firebase/auth';
import { getUserPreferences } from './preferences';

export const sendGoalReminderEmail = async (goal, timeOfDay, forceSend = false) => {
  try {
    const prefs = (await getUserPreferences()) || {};

    // --- Fill missing reminderEmail from Firebase Auth if available ---
    let reminderEmail = prefs.reminderEmail ?? null;
    if (!reminderEmail) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user?.email) {
        reminderEmail = user.email;
        console.log("Auto-filled reminderEmail from Auth:", reminderEmail);
      }
    }

    // --- Set defaults if missing ---
    const emailNotificationsEnabled = prefs.emailNotificationsEnabled ?? true;
    const buddyType = prefs.buddy ?? 'hype';

    // --- Safety check ---
    if ((!emailNotificationsEnabled || !reminderEmail) && !forceSend) {
      console.log("Email not sent due to user preferences:");
      if (!emailNotificationsEnabled) console.log(" - emailNotificationsEnabled is false");
      if (!reminderEmail) console.log(" - reminderEmail is missing and no Auth email available");
      return;
    }

    // --- Prepare payload ---
    const today = new Date();
    const deadlineDate = new Date(goal.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isUrgentWindow = diffDays <= 14 && diffDays > 0;

    const payload = {
      email: reminderEmail ?? 'test@example.com', // fallback for forced send
      goalTitle: goal.title,
      deadline: goal.deadline,
      buddyType,
      timeOfDay, // 'morning' or 'evening'
    };

    console.log("Sending email payload:", payload);

    // --- Send email ---
    const res = await fetch('https://glowgoal-email-service.vercel.app/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Email failed:", data);
    } else {
      console.log("Email sent successfully:", data);
    }

  } catch (error) {
    console.error("Email request error:", error);
  }
};