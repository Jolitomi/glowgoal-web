import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Resend } from 'resend';

initializeApp();

const db = getFirestore();
const resend = new Resend(functions.config().resend.key);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] ?? character));
}

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

      const unfinished = goalsSnap.docs.filter((doc) => doc.data().progress < 100);

      if (!unfinished.length) continue;

      const goalDoc = unfinished[0];
      const goal = goalDoc.data();
      const goalId = goalDoc.id;
      const goalUrl = `https://www.glowgoal.com.ng/goal-details?id=${encodeURIComponent(goalId)}`;

      // ✉️ send email
      await resend.emails.send({
        from: 'GlowGoal <noreply@yourdomain.com>',
        to: prefs.reminderEmail,
        subject: 'your goal is still waiting 👀',
        html: `
          <div style="font-family:sans-serif;">
            <h2>GlowGoal check-in</h2>
            <p>You said this matters.</p>
            <p><strong>${escapeHtml(String(goal.title ?? 'Your goal'))}</strong> is still waiting for you.</p>
            <p>Take one small step toward your goal today.</p>
            <p><a href="${goalUrl}" style="display:inline-block;padding:12px 20px;background:#6D4BC3;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Continue your goal in GlowGoal</a></p>
            <p><a href="${goalUrl}">${goalUrl}</a></p>
          </div>
        `,
      });

      console.log(`Email sent to ${prefs.reminderEmail}`);
    }
  }
);