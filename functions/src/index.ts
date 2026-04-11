import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Resend } from 'resend';

initializeApp();

const db = getFirestore();
const resend = new Resend(functions.config().resend.key);

export const sendAfternoonEmails = onSchedule(
  {
    schedule: 'every day 16:10',
    timeZone: 'Africa/Lagos',
  },
  async () => {
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const prefsRef = db
        .collection('users')
        .doc(userDoc.id)
        .collection('profile')
        .doc('preferences');

      const prefsSnap = await prefsRef.get();

      if (!prefsSnap.exists) continue;

      const prefs = prefsSnap.data();

      // ❌ skip if not enabled
      if (
        !prefs?.emailNotificationsEnabled ||
        !prefs?.afternoonEmailEnabled ||
        !prefs?.reminderEmail
      ) {
        continue;
      }

      // get goals
      const goalsSnap = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('goals')
        .get();

      const goals = goalsSnap.docs.map((doc) => doc.data());

      const unfinished = goals.filter((g) => g.progress < 100);

      if (!unfinished.length) continue;

      const goal = unfinished[0];

      // ✉️ send email
      await resend.emails.send({
        from: 'GlowGoal <noreply@yourdomain.com>',
        to: prefs.reminderEmail,
        subject: 'your goal is still waiting 👀',
        html: `
          <div style="font-family:sans-serif;">
            <h2>GlowGoal check-in</h2>
            <p>You said this matters.</p>
            <p><strong>${goal.title}</strong> is still waiting for you.</p>
            <p>Open the app and take one step.</p>
          </div>
        `,
      });

      console.log(`Email sent to ${prefs.reminderEmail}`);
    }
  }
);