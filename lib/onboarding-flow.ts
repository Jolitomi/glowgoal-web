import { BuddyType } from './buddy';
import { GoalItem, GoalTask, makeId } from './goals';

export type OnboardingFriction =
  | 'procrastination'
  | 'overwhelm'
  | 'dropoff'
  | 'forgetting';

export type CuratedGoalOption = {
  id: string;
  title: string;
  category: 'health' | 'career' | 'study' | 'creative' | 'personal';
  icon: string;
  microWinTitle: string;
  fullSteps: string[];
};

export const CURATED_GOALS: CuratedGoalOption[] = [
  {
    id: 'fitness',
    title: 'Work out or run 3x a week',
    category: 'health',
    icon: '🏃',
    microWinTitle: 'Lay out workout clothes and drink 1 glass of water',
    fullSteps: [
      'Lay out workout clothes and drink 1 glass of water',
      'Do a 5-minute warm-up or quick jog today',
      'Log workout #1 in your calendar',
      'Prepare healthy post-workout snack',
      'Complete workout #2 (20 mins)',
      'Rest and hydrate with intention',
      'Complete workout #3 and review weekly streak',
    ],
  },
  {
    id: 'side_project',
    title: 'Ship MVP of my side project',
    category: 'career',
    icon: '💻',
    microWinTitle: 'Write down the single core feature on paper and create project repo',
    fullSteps: [
      'Write down the single core feature on paper and create project repo',
      'Set up basic project scaffolding and run initial build',
      'Build the primary user flow wireframe',
      'Implement the main action button and core function',
      'Fix first batch of obvious UI bugs',
      'Deploy first test link to Vercel/staging',
      'Share demo link with 1 friend for honest feedback',
    ],
  },
  {
    id: 'reading',
    title: 'Read 20 pages every single day',
    category: 'study',
    icon: '📚',
    microWinTitle: 'Put book on your bedside table and read exactly 2 pages right now',
    fullSteps: [
      'Put book on your bedside table and read exactly 2 pages right now',
      'Set a recurring 15-minute quiet reading slot for tomorrow',
      'Read 10 pages without checking your phone',
      'Underline or highlight 1 inspiring sentence',
      'Hit your 20-page milestone for Day 3',
      'Write a 1-sentence takeaway of the chapter',
      'Celebrate a full 5-day reading streak',
    ],
  },
  {
    id: 'mindfulness',
    title: '10 minutes daily meditation & calm',
    category: 'personal',
    icon: '🧘',
    microWinTitle: 'Sit comfortably, close your eyes, and take 5 deep belly breaths',
    fullSteps: [
      'Sit comfortably, close your eyes, and take 5 deep belly breaths',
      'Set up a quiet corner with zero distractions',
      'Complete a 5-minute guided breath session',
      'Notice when your mind wanders without judging yourself',
      'Try a 10-minute morning session before checking phone notifications',
      'Do an evening wind-down breathwork check',
      'Reflect on how your focus felt across the week',
    ],
  },
  {
    id: 'creative_writing',
    title: 'Publish 1 creative piece or post weekly',
    category: 'creative',
    icon: '✍️',
    microWinTitle: 'Brainstorm 3 raw headline ideas in a blank note (no editing allowed)',
    fullSteps: [
      'Brainstorm 3 raw headline ideas in a blank note (no editing allowed)',
      'Pick the best headline and write an unfiltered 100-word draft',
      'Outline the beginning, middle, and conclusion in bullet points',
      'Polish draft and eliminate 3 unnecessary sentences',
      'Add an engaging hook and call-to-action',
      'Hit publish or schedule for tomorrow morning',
      'Celebrate shipping instead of perfection',
    ],
  },
];

export const FRICTION_OPTIONS: {
  key: OnboardingFriction;
  title: string;
  subtitle: string;
  emoji: string;
}[] = [
  {
    key: 'procrastination',
    title: 'Procrastination',
    subtitle: 'Waiting for the "perfect mood" or starting tomorrow',
    emoji: '⏳',
  },
  {
    key: 'overwhelm',
    title: 'Overwhelm',
    subtitle: 'Steps feel too big, so I freeze and do nothing',
    emoji: '🌪️',
  },
  {
    key: 'dropoff',
    title: 'The 3-Day Drop-Off',
    subtitle: 'I start with 100% hype, then ghost after a few days',
    emoji: '📉',
  },
  {
    key: 'forgetting',
    title: 'Life Gets in the Way',
    subtitle: 'Out of sight, out of mind when my routine gets busy',
    emoji: '🔔',
  },
];

export function getBuddyBanter(params: {
  buddy: BuddyType;
  goalTitle: string;
  friction: OnboardingFriction;
}): { speech: string; tag: string } {
  const { buddy, goalTitle, friction } = params;
  const shortGoal = goalTitle.length > 25 ? `${goalTitle.slice(0, 22)}...` : goalTitle;

  if (buddy === 'hype') {
    switch (friction) {
      case 'procrastination':
        return {
          speech: `No more waiting for the "right time"! We're tackling "${shortGoal}" with a tiny 3-minute starter today. Momentum starts RIGHT NOW 🔥`,
          tag: 'Energy Unlocked',
        };
      case 'overwhelm':
        return {
          speech: `Forget the giant mountain! We're breaking "${shortGoal}" into microscopic wins. You don't have to conquer it all today—just win the next 3 minutes! ✨`,
          tag: 'Micro-Wins Only',
        };
      case 'dropoff':
        return {
          speech: `Day 1 is easy, but you and I are going all the way with "${shortGoal}". When motivation dips, I'll be in your ear cheering you on! Let's GO! 🚀`,
          tag: 'Streak Locked In',
        };
      case 'forgetting':
        return {
          speech: `Don't worry about memory—I've got your back on "${shortGoal}"! We're anchoring your habit into your day so it becomes second nature! 🎯`,
          tag: 'Daily Radar On',
        };
    }
  }

  if (buddy === 'savage') {
    switch (friction) {
      case 'procrastination':
        return {
          speech: `Let's be completely serious: how many months have you been "about to start" "${shortGoal}"? Enough brainstorming. Open the task and do 3 minutes right now 😌`,
          tag: 'Tough Love Mode',
        };
      case 'overwhelm':
        return {
          speech: `Step away from the 40-step master plan. You're overcomplicating "${shortGoal}" to avoid doing actual work. Do ONE tiny step today. That's it 💅`,
          tag: 'Reality Check',
        };
      case 'dropoff':
        return {
          speech: `The classic "start Monday, disappear by Thursday" special? Not on my watch. If you ghost "${shortGoal}", I will be here to remind you of your own promises 💀`,
          tag: 'No Ghosting Allowed',
        };
      case 'forgetting':
        return {
          speech: `You didn't "forget" "${shortGoal}", you scrolled social media for 2 hours. Let's make the first step so easy you literally have zero excuses 😌`,
          tag: 'Receipts Kept',
        };
    }
  }

  // Soft buddy
  switch (friction) {
    case 'procrastination':
      return {
        speech: `It's completely okay to feel hesitant about "${shortGoal}". Take a slow breath. We don't need perfection today, just the smallest gentle start 💙`,
        tag: 'Gentle Pace',
      };
    case 'overwhelm':
      return {
        speech: `You don't need to carry the whole weight of "${shortGoal}" all at once. Even touching it for 3 minutes today counts. You are doing enough 🤍`,
        tag: 'Zero Pressure',
      };
    case 'dropoff':
      return {
        speech: `If you miss a day, there is no guilt or shame here. We just pick up gently the next morning. Consistency is about returning, not being flawless 🌸`,
        tag: 'Safe Space',
      };
    case 'forgetting':
      return {
        speech: `Life is full and messy. I'll hold the space for "${shortGoal}" so you don't have to stress about keeping it all in your head 🌿`,
        tag: 'Mindful Ease',
      };
  }
}

export function buildOnboardingGoal(params: {
  title: string;
  category: 'health' | 'career' | 'study' | 'creative' | 'personal';
  customMicroWin?: string;
  curatedId?: string;
}): GoalItem {
  const curated = CURATED_GOALS.find((c) => c.id === params.curatedId || c.title.toLowerCase() === params.title.toLowerCase());

  let tasks: GoalTask[] = [];

  if (curated) {
    tasks = curated.fullSteps.map((step, idx) => ({
      id: makeId(`task_${idx + 1}`),
      title: idx === 0 && params.customMicroWin ? params.customMicroWin : step,
      completed: false,
      completedAt: null,
      source: 'user',
    }));
  } else {
    const firstStep = params.customMicroWin || `Do a 3-minute starter session on ${params.title}`;
    tasks = [
      { id: makeId('task_1'), title: firstStep, completed: false, completedAt: null, source: 'user' },
      { id: makeId('task_2'), title: `Define one specific milestone for ${params.title}`, completed: false, completedAt: null, source: 'ai' },
      { id: makeId('task_3'), title: 'Clear one blocker or obstacle that might slow you down', completed: false, completedAt: null, source: 'ai' },
      { id: makeId('task_4'), title: 'Spend 15 focused minutes on the core work', completed: false, completedAt: null, source: 'ai' },
      { id: makeId('task_5'), title: 'Check in with your accountability buddy and celebrate momentum', completed: false, completedAt: null, source: 'ai' },
    ];
  }

  // Set default deadline 14 days from now
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 14);

  return {
    id: makeId('goal'),
    title: params.title.trim(),
    category: params.category,
    deadline: deadlineDate.toISOString().split('T')[0],
    reason: 'To build consistency and make real daily progress with my accountability buddy',
    createdAt: new Date().toISOString(),
    progress: 0,
    tasks,
  };
}
