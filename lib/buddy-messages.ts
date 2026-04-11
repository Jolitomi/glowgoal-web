import { BuddyType } from './buddy';
import { BuddyContext } from './buddy-context';
import { UserTrait } from './buddy-profile';

export type BuddyPopup = {
  title: string;
  body: string;
  mood: 'celebrate' | 'nudge' | 'comfort' | 'drag';
};

export type MessageSet = {
  generic: BuddyPopup[];
} & Partial<Record<UserTrait, BuddyPopup[]>>;

export const messageBank: Record<
  BuddyContext,
  Record<BuddyType, MessageSet>
> = {
  first_goal_ever: {
    hype: {
      generic: [
        {
          title: 'Your first move 🔥',
          body: 'This is where GlowGoal really starts.',
          mood: 'celebrate',
        },
        {
          title: 'A beginning worth something ✨',
          body: 'Not just another idea. Your first real move.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'A beginning 🤍',
          body: 'You do not need to be perfect. You just need to begin.',
          mood: 'comfort',
        },
        {
          title: 'Your first step 🤍',
          body: 'This is small now, but it matters already.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'We begin',
          body: 'Alright. First goal. Let’s see if you mean it.',
          mood: 'drag',
        },
        {
          title: 'No excuses yet',
          body: 'Fresh start. No abandoned pattern... yet.',
          mood: 'drag',
        },
      ],
    },
  },

  new_goal: {
    hype: {
      generic: [
        {
          title: 'Locked in 🔥',
          body: 'This one has potential. Let’s move.',
          mood: 'celebrate',
        },
        {
          title: 'New mission ✨',
          body: 'You set it. Now let’s build it.',
          mood: 'celebrate',
        },
      ],
      procrastinates_but_returns: [
        {
          title: 'Back at it 🔥',
          body: 'You always come back to the work. Let this one stick.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'A fresh start 🤍',
          body: 'One step at a time. No pressure, just progress.',
          mood: 'comfort',
        },
        {
          title: 'This can be different 🤍',
          body: 'You do not have to rush it. Just stay with it.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Another goal?',
          body: 'Nice. Let’s try finishing this one.',
          mood: 'drag',
        },
        {
          title: 'Pretty plan',
          body: 'Now do not leave it sitting there.',
          mood: 'drag',
        },
      ],
    },
  },

  first_task: {
    hype: {
      generic: [
        {
          title: 'You moved 🔥',
          body: 'That first step matters more than people admit.',
          mood: 'celebrate',
        },
        {
          title: 'Momentum started ✨',
          body: 'This is how something real begins.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'You started 🤍',
          body: 'That is often the hardest part.',
          mood: 'comfort',
        },
        {
          title: 'A real beginning 🤍',
          body: 'You touched the work. That counts.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Oh?',
          body: 'So you can start. Good to know.',
          mood: 'drag',
        },
        {
          title: 'Look at that',
          body: 'One task down. Miracles happen.',
          mood: 'drag',
        },
      ],
    },
  },

  early_progress: {
    hype: {
      generic: [
        {
          title: 'You are warming up 🔥',
          body: 'Not huge yet, but this is how momentum grows.',
          mood: 'celebrate',
        },
        {
          title: 'Tiny wins count ✨',
          body: 'Keep stacking them. They add up fast.',
          mood: 'celebrate',
        },
      ],
      works_better_in_short_bursts: [
        {
          title: 'There it is ⚡',
          body: 'This is your pattern. One move becomes another.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'You are moving 🤍',
          body: 'Slow progress is still progress.',
          mood: 'comfort',
        },
        {
          title: 'A little further 🤍',
          body: 'You do not need a breakthrough every time.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Fine',
          body: 'Not impressive yet, but at least it is movement.',
          mood: 'drag',
        },
        {
          title: 'Keep going',
          body: 'Do not stop just because you finally did one thing.',
          mood: 'drag',
        },
      ],
    },
  },

  mid_progress: {
    hype: {
      generic: [
        {
          title: 'This is real progress 🔥',
          body: 'You are not just planning anymore.',
          mood: 'celebrate',
        },
        {
          title: 'You are in it now ✨',
          body: 'This is the stretch where discipline starts to show.',
          mood: 'celebrate',
        },
      ],
      works_better_in_short_bursts: [
        {
          title: 'Ride the wave ⚡',
          body: 'When you catch momentum, you really catch it.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Still with it 🤍',
          body: 'This middle stretch matters more than the exciting start.',
          mood: 'comfort',
        },
        {
          title: 'You are holding on 🤍',
          body: 'That quiet consistency is doing more than you think.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Middle of the work',
          body: 'This is where people get bored and quit. Don’t.',
          mood: 'drag',
        },
        {
          title: 'Still here?',
          body: 'Good. Stay annoying and finish it.',
          mood: 'drag',
        },
      ],
    },
  },

  halfway: {
    hype: {
      generic: [
        {
          title: 'Halfway 🔥',
          body: 'You are closer than you were pretending to be.',
          mood: 'celebrate',
        },
        {
          title: 'Now it is serious ✨',
          body: 'You have crossed the lazy maybe zone.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Halfway there 🤍',
          body: 'Pause if you need to, but do not disappear on yourself.',
          mood: 'comfort',
        },
        {
          title: 'You have come far 🤍',
          body: 'There is still work left, but you are not where you started.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: '50%',
          body: 'Do not celebrate like it is done. Finish it.',
          mood: 'drag',
        },
        {
          title: 'Halfway',
          body: 'Cute. The hard part is staying.',
          mood: 'drag',
        },
      ],
    },
  },

  almost_done: {
    hype: {
      generic: [
        {
          title: 'Finish it 🔥',
          body: 'You are right there. Do not loosen your grip now.',
          mood: 'celebrate',
        },
        {
          title: 'Last stretch ✨',
          body: 'This is the part that turns effort into proof.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Nearly there 🤍',
          body: 'A gentle push now could finish this.',
          mood: 'comfort',
        },
        {
          title: 'Last few steps 🤍',
          body: 'Stay with yourself. You are so close.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Do not fumble now',
          body: 'This would be an embarrassing place to stop.',
          mood: 'drag',
        },
        {
          title: 'Almost done',
          body: 'Land the plane.',
          mood: 'drag',
        },
      ],
    },
  },

  goal_completed: {
    hype: {
      generic: [
        {
          title: 'You finished 🔥',
          body: 'That is not talk. That is proof.',
          mood: 'celebrate',
        },
        {
          title: 'Done and dusted ✨',
          body: 'You said it. You did it.',
          mood: 'celebrate',
        },
      ],
      consistent_finisher: [
        {
          title: 'That finisher energy 🔥',
          body: 'You really do know how to close things out.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'You did it 🤍',
          body: 'Take that in. You followed through.',
          mood: 'comfort',
        },
        {
          title: 'Completed 🤍',
          body: 'Let yourself be proud of this one.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Completed',
          body: 'See? Drama was unnecessary. You could do it.',
          mood: 'drag',
        },
        {
          title: 'Finished.',
          body: 'Excellent. More of that, less spiraling.',
          mood: 'drag',
        },
      ],
    },
  },

  comeback: {
    hype: {
      generic: [
        {
          title: 'You came back 🔥',
          body: 'That matters. Restarting is a power move too.',
          mood: 'celebrate',
        },
        {
          title: 'Back in motion ✨',
          body: 'A comeback still counts as progress.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Welcome back 🤍',
          body: 'No shame. Just begin again from here.',
          mood: 'comfort',
        },
        {
          title: 'You returned 🤍',
          body: 'That is enough for today. Keep the door open.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Look who returned',
          body: 'Cute. Now stay.',
          mood: 'drag',
        },
        {
          title: 'Back again?',
          body: 'Good. Try not to vanish after this.',
          mood: 'drag',
        },
      ],
    },
  },

  streak_started: {
    hype: {
      generic: [
        {
          title: 'Streak started 🔥',
          body: 'Ooo, we are building something now.',
          mood: 'celebrate',
        },
        {
          title: 'Two days deep ✨',
          body: 'This is how habits stop being jokes.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'A little rhythm 🤍',
          body: 'You are showing up again. That is beautiful.',
          mood: 'comfort',
        },
        {
          title: 'Consistency is forming 🤍',
          body: 'Keep it gentle. Keep it going.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'A streak?',
          body: 'Well, well. Keep the same energy tomorrow.',
          mood: 'drag',
        },
        {
          title: 'Do not break it',
          body: 'Now that would be annoying.',
          mood: 'drag',
        },
      ],
    },
  },

  on_fire: {
    hype: {
      generic: [
        {
          title: 'You are on fire 🔥',
          body: 'This is not luck anymore. This is rhythm.',
          mood: 'celebrate',
        },
        {
          title: 'Streak monster ✨',
          body: 'You are stacking proof now.',
          mood: 'celebrate',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'You have found your flow 🤍',
          body: 'Keep protecting this rhythm.',
          mood: 'comfort',
        },
        {
          title: 'Steady and strong 🤍',
          body: 'This quiet consistency is powerful.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Hmm.',
          body: 'Look at you being disciplined for once.',
          mood: 'drag',
        },
        {
          title: 'Keep cooking',
          body: 'Do not get cute and ruin the streak.',
          mood: 'drag',
        },
      ],
    },
  },

  deadline_close: {
    hype: {
      generic: [
        {
          title: 'Clock is ticking ⏰',
          body: 'Not panic. Just focus. This deadline is getting closer.',
          mood: 'nudge',
        },
        {
          title: 'Time to tighten up 🔥',
          body: 'You still have room, but not forever.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'A gentle reminder 🤍',
          body: 'Your deadline is close now. One small action would help.',
          mood: 'nudge',
        },
        {
          title: 'Stay near the work 🤍',
          body: 'You do not need a sprint, just honesty.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Deadline incoming',
          body: 'This is where “later” starts looking stupid.',
          mood: 'drag',
        },
        {
          title: 'Heads up',
          body: 'Time is shrinking. Act accordingly.',
          mood: 'drag',
        },
      ],
    },
  },

  deadline_today: {
    hype: {
      generic: [
        {
          title: 'Today is the day 🔥',
          body: 'This is your last stretch. Lock in.',
          mood: 'nudge',
        },
        {
          title: 'Final push ✨',
          body: 'No floating. Focus.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Today matters 🤍',
          body: 'Be kind to yourself, but stay present.',
          mood: 'comfort',
        },
        {
          title: 'One careful push 🤍',
          body: 'Your deadline is here. Let’s not disappear now.',
          mood: 'nudge',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Today?',
          body: 'Oh, so now time is real?',
          mood: 'drag',
        },
        {
          title: 'Deadline day',
          body: 'No monologue. Move.',
          mood: 'drag',
        },
      ],
    },
  },

  inactive: {
    hype: {
      generic: [
        {
          title: 'Hey… 👀',
          body: 'You’ve been quiet. Let’s move again.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'It’s been a while 🤍',
          body: 'No pressure. Just one small step.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Vanished?',
          body: 'Goals don’t complete themselves.',
          mood: 'drag',
        },
      ],
    },
  },

  streak_at_risk: {
    hype: {
      generic: [
        {
          title: 'Don’t lose it 🔥',
          body: 'Just one task keeps the streak alive.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Almost slipping 🤍',
          body: 'You can still keep your streak today.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Careful.',
          body: 'Break this streak and we start from zero.',
          mood: 'drag',
        },
      ],
    },
  },

  rushing: {
    hype: {
      generic: [
        {
          title: 'Time is tight 🔥',
          body: 'Focus. No distractions now.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'Let’s steady this 🤍',
          body: 'Take one clear step at a time.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Now you’re rushing?',
          body: 'This is what procrastination creates.',
          mood: 'drag',
        },
      ],
    },
  },

  overdue: {
    hype: {
      generic: [
        {
          title: 'Past deadline, not past hope 🔥',
          body: 'Still salvageable. Start with the next right move.',
          mood: 'nudge',
        },
        {
          title: 'Okay, reset ✨',
          body: 'We are late. We are not done.',
          mood: 'nudge',
        },
      ],
    },
    soft: {
      generic: [
        {
          title: 'You are behind, not broken 🤍',
          body: 'Take a breath. Then take one honest step.',
          mood: 'comfort',
        },
        {
          title: 'A reset is allowed 🤍',
          body: 'Being overdue hurts. Avoiding it longer hurts more.',
          mood: 'comfort',
        },
      ],
    },
    savage: {
      generic: [
        {
          title: 'Overdue.',
          body: 'Yes, I said it. Now what are we doing about it?',
          mood: 'drag',
        },
        {
          title: 'Time has passed',
          body: 'Ignoring it will not reverse the calendar.',
          mood: 'drag',
        },
      ],
    },
  },
};