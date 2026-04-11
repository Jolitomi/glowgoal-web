import { AccountabilityContext } from './accountability-types';
import { BuddyType } from './buddy';
import { EscalationLevel } from './buddy-escalation';

type NotificationMessage = {
  title: string;
  body: string;
};

const contextMessages: Record<
  AccountabilityContext,
  Record<BuddyType, NotificationMessage>
> = {
  lock_in: {
    hype: { title: 'Locked in 🔥', body: 'You set it. Good. Let’s see movement soon.' },
    soft: { title: 'A fresh start 🤍', body: 'You do not need to do everything today.' },
    savage: { title: 'Cute plan.', body: 'I’ll know soon if you meant it.' },
  },
  first_goal: {
    hype: { title: 'First goal energy 🔥', body: 'This is where GlowGoal gets real.' },
    soft: { title: 'Your first step 🤍', body: 'Start gently. It still counts.' },
    savage: { title: 'First goal?', body: 'Nice. Let’s see if this becomes a pattern.' },
  },
  inactive: {
    hype: { title: 'Hey, come back 🔥', body: 'You’ve been quiet. Let’s move again.' },
    soft: { title: 'It’s been a while 🤍', body: 'No pressure. Just one small step.' },
    savage: { title: 'Vanished?', body: 'Goals don’t complete themselves.' },
  },
  streak_at_risk: {
    hype: { title: 'Don’t lose the rhythm 🔥', body: 'One small move keeps momentum alive.' },
    soft: { title: 'Almost slipping 🤍', body: 'You can still hold onto this today.' },
    savage: { title: 'Careful.', body: 'Break the rhythm and we start from zero.' },
  },
  deadline_close: {
    hype: { title: 'Clock is ticking ⏰', body: 'This deadline is getting close. Lock in.' },
    soft: { title: 'A gentle reminder 🤍', body: 'Your deadline is close now.' },
    savage: { title: 'Deadline incoming', body: 'This is where “later” starts looking stupid.' },
  },
  deadline_today: {
    hype: { title: 'Today is the day 🔥', body: 'No floating. Focus.' },
    soft: { title: 'Today matters 🤍', body: 'Be kind to yourself, but stay present.' },
    savage: { title: 'Deadline day', body: 'No speech. Move.' },
  },
  overdue: {
    hype: { title: 'Late is not finished 🔥', body: 'Reset and make the next right move.' },
    soft: { title: 'You’re behind, not broken 🤍', body: 'Take a breath and take one step.' },
    savage: { title: 'Overdue.', body: 'Ignoring it won’t fix it.' },
  },
  comeback: {
    hype: { title: 'You came back 🔥', body: 'Restarting still counts.' },
    soft: { title: 'Welcome back 🤍', body: 'No shame. Just begin again.' },
    savage: { title: 'Look who returned', body: 'Good. Stay.' },
  },
  on_fire: {
    hype: { title: 'You’re on fire 🔥', body: 'This is rhythm now.' },
    soft: { title: 'You found your flow 🤍', body: 'Keep protecting this rhythm.' },
    savage: { title: 'Hmm.', body: 'Look at you being disciplined.' },
  },
  daily_nudge: {
    hype: { title: 'Quick win time ✨', body: 'Open the app and make one move.' },
    soft: { title: 'A small step still counts 🤍', body: 'Just an honest day.' },
    savage: { title: 'Enough hovering.', body: 'Open the app and touch the work.' },
  },
};

export function getBuddyNotificationMessage(
  buddy: BuddyType,
  context: AccountabilityContext
): NotificationMessage {
  return contextMessages[context]?.[buddy] ?? contextMessages.daily_nudge.hype;
}

export type NotificationMoment =
  | 'morning_check'
  | 'evening_nudge'
  | 'afternoon_nudge'
  | 'lock_in'
  | 'deadline_close'
  | 'deadline_today'
  | 'overdue';

const momentMessages: Record<
  NotificationMoment,
  Record<BuddyType, Record<EscalationLevel, NotificationMessage[]>>
> = {
  morning_check: {
    hype: {
      gentle: [{ title: 'Good morning ☀️', body: 'Check your goals today. Let’s make one move.' }],
      firm: [{ title: 'Morning 👀', body: 'Your goals are still there. Time to move.' }],
      intense: [{ title: 'Up already?', body: 'Cool. Now act like those goals matter.' }],
    },
    soft: {
      gentle: [{ title: 'Good morning 🤍', body: 'Take a look at your goals today.' }],
      firm: [{ title: 'A small reminder 🤍', body: 'Do not drift too far from what matters.' }],
      intense: [{ title: 'Come back to yourself 🤍', body: 'You said this mattered.' }],
    },
    savage: {
      gentle: [{ title: 'Morning.', body: 'Check your goals.' }],
      firm: [{ title: 'Morning.', body: 'Your goals did not disappear overnight.' }],
      intense: [{ title: 'Still here?', body: 'Good. Open the app and prove it.' }],
    },
  },
  afternoon_nudge: {
  hype: {
    gentle: [{ title: 'Still time ✨', body: 'The day is not gone yet. Make one move.' }],
    firm: [{ title: 'Afternoon check 🔥', body: 'Your goal is still waiting on you.' }],
    intense: [{ title: 'Do not lose the day', body: 'You still have time, but not forever.' }],
  },
  soft: {
    gentle: [{ title: 'A little reminder 🤍', body: 'There is still room for one small step.' }],
    firm: [{ title: 'Come back gently 🤍', body: 'Your goal is still here when you are ready.' }],
    intense: [{ title: 'Please do not drift 🤍', body: 'Try not to let the whole day slip away.' }],
  },
  savage: {
    gentle: [{ title: '4PM already.', body: 'Go touch the goal.' }],
    firm: [{ title: 'Still waiting.', body: 'The day is moving faster than you are.' }],
    intense: [{ title: 'So what are we doing?', body: 'Chasing the goal or just thinking about it?' }],
  },
},
  evening_nudge: {
    hype: {
      gentle: [{ title: 'Heyyy 👀', body: 'You’ve been gone all day. Your buddy is waiting.' }],
      firm: [{ title: 'Okay babe 😭', body: 'You really vanished today.' }],
      intense: [{ title: 'We need to talk 🔥', body: 'You cannot keep ghosting your goals.' }],
    },
    soft: {
      gentle: [{ title: 'Checking on you 🤍', body: 'You have been away today.' }],
      firm: [{ title: 'Still waiting 🤍', body: 'Please do not abandon this goal.' }],
      intense: [{ title: 'Come back 🤍', body: 'You are drifting from something important.' }],
    },
    savage: {
      gentle: [{ title: 'So…', body: 'You disappeared today. Interesting.' }],
      firm: [{ title: 'Vanished?', body: 'Your goals are still here.' }],
      intense: [{ title: 'Again?', body: 'Are we serious or just collecting unfinished goals?' }],
    },
  },
  lock_in: {
    hype: {
      gentle: [{ title: 'Lock in 🔥', body: 'You set the goal. Now let’s make it real.' }],
      firm: [{ title: 'You said it 👀', body: 'Now back it up. Lock in.' }],
      intense: [{ title: 'No pretty intentions', body: 'Do not abandon it on day one.' }],
    },
    soft: {
      gentle: [{ title: 'Stay with it 🤍', body: 'You created the goal. Keep close to it.' }],
      firm: [{ title: 'Hold on to this 🤍', body: 'Do not let this become another "meant to do".' }],
      intense: [{ title: 'Be honest with yourself 🤍', body: 'If this matters, stay with it.' }],
    },
    savage: {
      gentle: [{ title: 'Nice goal.', body: 'Now lock in.' }],
      firm: [{ title: 'Pretty plan.', body: 'Shame if it just sits there.' }],
      intense: [{ title: 'Already folding?', body: 'You just set the goal. Stand up.' }],
    },
  },
  deadline_close: {
    hype: {
      gentle: [{ title: 'Clock is ticking ⏰', body: 'Your deadline is getting close.' }],
      firm: [{ title: 'Heads up 🔥', body: 'This deadline is close now.' }],
      intense: [{ title: 'Time is moving', body: 'Lock in before this gets messy.' }],
    },
    soft: {
      gentle: [{ title: 'A gentle reminder 🤍', body: 'One honest step would help.' }],
      firm: [{ title: 'Please stay near this 🤍', body: 'Time is getting shorter.' }],
      intense: [{ title: 'This is getting urgent 🤍', body: 'You do not have much room left.' }],
    },
    savage: {
      gentle: [{ title: 'Deadline incoming', body: 'Act accordingly.' }],
      firm: [{ title: 'Time is shrinking.', body: '“Later” starts looking stupid.' }],
      intense: [{ title: 'Running out of road', body: 'You are close to fumbling this.' }],
    },
  },
  deadline_today: {
    hype: {
      gentle: [{ title: 'Today is the day 🔥', body: 'Final stretch. Focus.' }],
      firm: [{ title: 'Today matters', body: 'No drifting. Lock in.' }],
      intense: [{ title: 'This is it', body: 'Finish strong.' }],
    },
    soft: {
      gentle: [{ title: 'Today matters 🤍', body: 'Your deadline is here.' }],
      firm: [{ title: 'Please stay present 🤍', body: 'Do one honest thing now.' }],
      intense: [{ title: 'Do not disappear now 🤍', body: 'Today is too important for avoidance.' }],
    },
    savage: {
      gentle: [{ title: 'Deadline day.', body: 'Move.' }],
      firm: [{ title: 'Today?', body: 'Oh, so time is real now?' }],
      intense: [{ title: 'No excuses left', body: 'Finish what you started.' }],
    },
  },
  overdue: {
    hype: {
      gentle: [{ title: 'Reset, not ruin 🔥', body: 'You are late, not finished.' }],
      firm: [{ title: 'Okay, enough 👀', body: 'You are overdue. Let’s recover.' }],
      intense: [{ title: 'We need a reset', body: 'This slipped. Now fix it.' }],
    },
    soft: {
      gentle: [{ title: 'You are behind, not broken 🤍', body: 'Take the next honest step.' }],
      firm: [{ title: 'Please face this 🤍', body: 'Avoiding it makes it heavier.' }],
      intense: [{ title: 'Come back to it 🤍', body: 'Be brave and reopen the work.' }],
    },
    savage: {
      gentle: [{ title: 'Overdue.', body: 'Not ideal.' }],
      firm: [{ title: 'Still overdue.', body: "Ignoring it won't reverse the calendar." }],
      intense: [{ title: 'We fumbled it.', body: 'Now what are you going to do?' }],
    },
  },
};

export function getBuddyNotificationMomentMessage(
  buddy: BuddyType,
  moment: NotificationMoment,
  level: EscalationLevel = 'gentle'
): NotificationMessage {
  const buddyOptions = momentMessages[moment]?.[buddy];
  const options =
    buddyOptions?.[level] ??
    buddyOptions?.gentle ??
    momentMessages.morning_check.hype.gentle;

  return options[Math.floor(Math.random() * options.length)];
}
