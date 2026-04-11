import { scheduleLocalNotification } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import 'react-native-get-random-values';

import { buddyConfig, BuddyType } from '../lib/buddy';
import { getBuddyPopup } from '../lib/buddy-engine';
import { getBuddyNotificationMessage } from '../lib/buddy-notification-messages';
import { scheduleDailyReminders } from '../lib/daily-reminder-engine';
import { generateGoalTasks } from '../lib/goal-ai-generator';
import { GoalAiSignals } from '../lib/goal-ai-signals';
import { buildGoalAwareLine } from '../lib/goal-message-personalizer';
import { addGoal, getGoals, GoalTask, makeId } from '../lib/goals';
import { getUserPreferences } from '../lib/preferences';

type GoalState =
  | 'fresh_start'
  | 'vague'
  | 'urgent'
  | 'overdue'
  | 'long_term'
  | 'normal';

type PopupMood = 'celebrate' | 'nudge' | 'comfort' | 'drag';

function normalizeBuddy(buddy?: string): BuddyType {
  if (buddy === 'soft' || buddy === 'savage' || buddy === 'hype') {
    return buddy;
  }
  return 'hype';
}

function getGoalState(
  deadline?: string,
  goalTitle?: string,
  reason?: string
): GoalState {
  const cleanGoal = String(goalTitle ?? '').trim().toLowerCase();
  const cleanReason = String(reason ?? '').trim().toLowerCase();
  const goalLength = cleanGoal.split(/\s+/).filter(Boolean).length;

  if (
    goalLength <= 3 ||
    cleanGoal.includes('my life together') ||
    cleanGoal.includes('glow up') ||
    cleanGoal.includes('be that girl') ||
    cleanGoal.includes('do better') ||
    cleanGoal.includes('fix my life')
  ) {
    return 'vague';
  }

  if (!deadline) {
    return cleanReason ? 'normal' : 'fresh_start';
  }

  const today = new Date();
  const dueDate = new Date(deadline);

  if (Number.isNaN(dueDate.getTime())) {
    return 'normal';
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffInDays = Math.ceil((dueDate.getTime() - today.getTime()) / msPerDay);

  if (diffInDays < 0) return 'overdue';
  if (diffInDays <= 7) return 'urgent';
  if (diffInDays >= 90) return 'long_term';

  return 'normal';
}

function buildToneGuide(buddy: BuddyType) {
  switch (buddy) {
    case 'savage':
      return `
TONE STYLE: SAVAGE
- blunt, sharp, tactical
- slightly confrontational in a useful way
- low patience for excuses
- should feel like "be serious and move"
- use direct language
- examples of energy:
  - "stop hovering and do this"
  - "be honest, you've delayed this enough"
  - "quit making it deeper than it is"
- steps can sound firm, but never cruel
`;
    case 'soft':
      return `
TONE STYLE: SOFT
- calm, warm, reassuring
- low-pressure but still focused
- make hard things feel less scary to start
- should feel like "let's make this easier"
- examples of energy:
  - "keep this simple"
  - "start small so your brain doesn't resist"
  - "you do not need to do everything today"
`;
    case 'hype':
    default:
      return `
TONE STYLE: HYPE
- energetic, alive, motivating
- momentum-heavy
- should feel exciting without sounding cheesy
- should feel like "let's get a win right now"
- examples of energy:
  - "open your phone and make a move"
  - "small step, big energy"
  - "let's get something done today"
`;
  }
}

function buildStateGuide(goalState: GoalState, signals: GoalAiSignals) {
  return `
USER STATE:
- interpreted goal state: ${goalState}
- first goal: ${signals.isFirstGoal ? 'yes' : 'no'}
- inactive: ${signals.isInactive ? 'yes' : 'no'}
- inactive days: ${signals.inactiveDays}
- comeback mode: ${signals.comeback ? 'yes' : 'no'}
- deadline state: ${signals.deadlineState}

BEHAVIOR ADAPTATION:
- if first goal, make the steps easier to enter and less intimidating
- if inactive, remove guilt and focus on restarting momentum
- if comeback mode, treat the user like they are returning after disappearing for a bit
- if deadline is close or today, make the steps tighter and more urgent
- if overdue, focus on recovery and re-entry, not shame
- if deadline is far, build early momentum, not lazy someday plans
`;
}

function buildSystemInstruction(
  buddy: BuddyType,
  goalState: GoalState,
  signals: GoalAiSignals
) {
  return `
You are the strategy engine for GlowGoal, an accountability app for people who procrastinate, overthink, get overwhelmed, lose momentum, or struggle to stay consistent.

Your job is to turn ANY goal into 5 small, immediate, human-sounding action steps.

DO NOT force goals into rigid categories.
Interpret what the user is really trying to do.
A goal may involve:
- discipline
- identity change
- money
- visibility
- networking
- healing
- habit change
- social positioning
- skill building
- lifestyle change
- emotional reset
- silly dreams with real-world positioning
- serious life goals

CORE RULES:
- return ONLY a raw JSON array of 5 strings
- no markdown
- no backticks
- no numbering
- no objects
- no extra explanation
- each step must be one short sentence
- each step should feel like it can be done in 5 to 20 minutes
- no vague advice like "stay focused", "be consistent", "work hard", or "believe in yourself"
- no repeated structure across all 5 steps
- no robotic productivity-blog tone
- no impossible fantasy steps
- no long-term plan as a step
- the steps must sound like a real accountability buddy is talking to the user

HUMAN STYLE:
- talk directly to the user
- sound natural, slightly imperfect, and real
- use practical language, not polished consultant language
- make every step feel specific to the actual goal
- the steps should feel doable right now

BUDDY VOICE RULE:
The steps themselves must sound like the selected buddy.
Do not just change the labels around the output.
Make the wording, pressure level, and emotional style match the buddy tone.

${buildToneGuide(buddy)}

${buildStateGuide(goalState, signals)}

STEP QUALITY:
- step 1 should reduce friction fast
- step 2 should create clarity, traction, or setup
- step 3 should push a real move
- step 4 should deepen action
- step 5 should create visible momentum or proof of effort

GOAL HANDLING:
- if the goal is vague, make the first step clarify it
- if the goal is unrealistic, focus on positioning, proximity, visibility, skill, or access
- if the goal is emotional or life-reset based, make the steps grounding and practical
- if the goal is money-related, focus on immediate money moves, tracking, outreach, cost cutting, or earning
- if the goal is habit-related, reduce friction and make starting easier
- if the goal is social or networking-related, focus on visibility, gatekeepers, and positioning

FINAL OUTPUT EXAMPLE:
["step one", "step two", "step three", "step four", "step five"]
`;
}

function safeJsonArrayParse(rawText: string): string[] | null {
  try {
    const direct = JSON.parse(rawText);
    if (Array.isArray(direct)) {
      return direct.filter((item) => typeof item === 'string');
    }
  } catch {}

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;

  try {
    const extracted = JSON.parse(jsonMatch[0]);
    if (Array.isArray(extracted)) {
      return extracted.filter((item) => typeof item === 'string');
    }
  } catch {
    return null;
  }

  return null;
}

function cleanGeneratedSteps(steps: string[]): string[] {
  return steps
    .map((step) =>
      step
        .replace(/^[-*\d.\s"]+/, '')
        .replace(/^step\s*\d+\s*[:.-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^"(.*)"$/, '$1')
    )
    .filter(Boolean)
    .slice(0, 5);
}

function buddyLine(
  buddy: BuddyType,
  soft: string,
  hype: string,
  savage: string
): string {
  if (buddy === 'soft') return soft;
  if (buddy === 'savage') return savage;
  return hype;
}

function getMoodPalette(mood: PopupMood) {
  switch (mood) {
    case 'celebrate':
      return {
        border: '#FFD580',
        glow: 'rgba(255, 213, 128, 0.42)',
        orb: 'rgba(255, 214, 114, 0.30)',
        chipBg: 'rgba(255, 213, 128, 0.18)',
        chipText: '#7A4B32',
      };
    case 'comfort':
      return {
        border: '#A0AB89',
        glow: 'rgba(160, 171, 137, 0.34)',
        orb: 'rgba(160, 171, 137, 0.25)',
        chipBg: 'rgba(160, 171, 137, 0.18)',
        chipText: '#4E5A42',
      };
    case 'drag':
      return {
        border: '#3E3A37',
        glow: 'rgba(62, 58, 55, 0.35)',
        orb: 'rgba(62, 58, 55, 0.22)',
        chipBg: 'rgba(62, 58, 55, 0.12)',
        chipText: '#2E2A27',
      };
    case 'nudge':
    default:
      return {
        border: '#CCBEB1',
        glow: 'rgba(204, 190, 177, 0.35)',
        orb: 'rgba(204, 190, 177, 0.25)',
        chipBg: 'rgba(204, 190, 177, 0.18)',
        chipText: '#6F6257',
      };
  }
}

function getMoodLabel(mood: PopupMood) {
  switch (mood) {
    case 'celebrate':
      return 'little win';
    case 'comfort':
      return 'gentle note';
    case 'drag':
      return 'reality check';
    case 'nudge':
    default:
      return 'quick nudge';
  }
}

function buildFallbackSteps(
  goalTitle: string,
  category: string,
  reason: string,
  goalState: GoalState,
  buddy: BuddyType,
  signals: GoalAiSignals
): string[] {
  const goal = String(goalTitle).trim();
  const lowerGoal = goal.toLowerCase();
  const lowerCategory = String(category).toLowerCase();
  const lowerReason = String(reason).toLowerCase();

  const isMoneyGoal =
    lowerCategory.includes('money') ||
    lowerGoal.includes('save') ||
    lowerGoal.includes('money') ||
    lowerGoal.includes('income') ||
    lowerGoal.includes('earn') ||
    lowerGoal.includes('buy');

  const isStudyGoal =
    lowerCategory.includes('study') ||
    lowerGoal.includes('learn') ||
    lowerGoal.includes('study') ||
    lowerGoal.includes('python') ||
    lowerGoal.includes('course') ||
    lowerGoal.includes('exam');

  const isCareerGoal =
    lowerCategory.includes('career') ||
    lowerGoal.includes('job') ||
    lowerGoal.includes('internship') ||
    lowerGoal.includes('career') ||
    lowerGoal.includes('linkedin') ||
    lowerGoal.includes('portfolio');

  const isHealthGoal =
    lowerCategory.includes('health') ||
    lowerGoal.includes('gym') ||
    lowerGoal.includes('sleep') ||
    lowerGoal.includes('skin') ||
    lowerGoal.includes('workout') ||
    lowerGoal.includes('health');

  const isCreativeGoal =
    lowerCategory.includes('creative') ||
    lowerGoal.includes('write') ||
    lowerGoal.includes('book') ||
    lowerGoal.includes('novel') ||
    lowerGoal.includes('song') ||
    lowerGoal.includes('content') ||
    lowerGoal.includes('tiktok');

  const isNetworkingGoal =
    lowerGoal.includes('meet ') ||
    lowerGoal.includes('mentor') ||
    lowerGoal.includes('celebrity') ||
    lowerGoal.includes('network') ||
    lowerGoal.includes('noticed') ||
    lowerGoal.includes('collab');

  if (signals.comeback) {
    return [
      buddyLine(
        buddy,
        `start gently and pick one tiny piece of ${goal} to touch today`,
        `we're not doing a full comeback speech, just pick one small move for ${goal}`,
        `enough disappearing, touch one real part of ${goal} right now`
      ),
      buddyLine(
        buddy,
        'open your notes or the app tied to this goal and stay there for 10 minutes',
        'open the exact place where this goal lives and lock in for 10 minutes',
        'open the actual thing, not your excuses, and stay there for 10 minutes'
      ),
      buddyLine(
        buddy,
        'do the easiest useful action first so restarting does not feel heavy',
        'grab the easiest win first and get momentum back on the board',
        'take the easiest useful action and stop waiting for a magical mood'
      ),
      buddyLine(
        buddy,
        'remove one little obstacle that keeps making you avoid this goal',
        'clear one thing that keeps slowing you down around this goal',
        'fix one obvious thing that keeps helping you procrastinate'
      ),
      buddyLine(
        buddy,
        'leave yourself one clear next step so coming back tomorrow feels easier',
        'set up the next move now so tomorrow is not another reset',
        'set tomorrow up now so you do not vanish again'
      ),
    ];
  }

  if (isNetworkingGoal) {
    return [
      buddyLine(
        buddy,
        `get clear on why ${goal} matters to you so your moves stop feeling random`,
        `get clear on why ${goal} matters so your moves actually have direction`,
        `be honest about why ${goal} matters so you stop moving blindly`
      ),
      buddyLine(
        buddy,
        'find 3 online spaces where people close to this world already show up and save them',
        'find 3 spaces where the right people already gather and drop them somewhere visible',
        'find 3 places where access actually happens and save them now'
      ),
      buddyLine(
        buddy,
        'study one account, page, or community linked to this goal and notice how access works there',
        'study one page or community tied to this goal and clock how people get noticed there',
        'watch one page or community tied to this goal and learn how access really works'
      ),
      buddyLine(
        buddy,
        'leave one thoughtful comment, reply, or post that makes you visible without forcing it',
        'make one visible move today instead of lurking again',
        'stop lurking and make one visible move today'
      ),
      buddyLine(
        buddy,
        'pick one strategic action that brings you a little closer to the circle and do it now',
        'pick one circle-closing move and do it today',
        'make one real proximity move today and stop romanticizing the outcome'
      ),
    ];
  }

  if (isMoneyGoal) {
    return [
      buddyLine(
        buddy,
        `write the real number tied to ${goal} so the goal stops feeling foggy`,
        `write the exact number tied to ${goal} and make it real`,
        `put the real number for ${goal} in front of your face and stop being vague`
      ),
      buddyLine(
        buddy,
        'check your recent spending and spot one leak you can cut immediately',
        'scan your recent spending and find one leak to close today',
        'look at your spending and cut one obvious leak today'
      ),
      buddyLine(
        buddy,
        'pick one quick money move you can start today and name it clearly',
        'choose one fast money move and call it out clearly',
        'pick one money move you can do today and stop pretending you need ten'
      ),
      buddyLine(
        buddy,
        'give that money move 15 focused minutes right now',
        'put 15 real minutes into that money move right now',
        'spend 15 minutes on the money move now, not later'
      ),
      buddyLine(
        buddy,
        'track what you did today so this goal starts feeling possible',
        'log today’s move so the goal has proof behind it',
        'track today’s move so this goal stops living only in your mouth'
      ),
    ];
  }

  if (isStudyGoal) {
    return [
      buddyLine(
        buddy,
        `pick the exact part of ${goal} you want to focus on first`,
        `choose the exact part of ${goal} you're hitting first`,
        `pick one exact part of ${goal} and stop scattering yourself`
      ),
      buddyLine(
        buddy,
        'save one beginner-friendly resource so you are not bouncing between too many tabs',
        'lock in one resource so you stop hopping around',
        'choose one resource and quit tab-hopping'
      ),
      buddyLine(
        buddy,
        'study for 15 minutes only and let starting be enough for today',
        'do 15 focused minutes and get one clean win',
        'do 15 minutes and stop acting like you need a perfect setup'
      ),
      buddyLine(
        buddy,
        'write down one thing you understood so the session feels real',
        'write one thing you learned so the session actually counts',
        'note one thing you learned so this was not just performative studying'
      ),
      buddyLine(
        buddy,
        'set up the next tiny session before you leave this goal again',
        'set the next mini session now so momentum stays alive',
        'line up the next session now so you do not ghost this goal'
      ),
    ];
  }

  if (isCareerGoal) {
    return [
      buddyLine(
        buddy,
        `get specific about what ${goal} means so you stop chasing a blurry version of it`,
        `get specific about what ${goal} actually looks like for you`,
        `define ${goal} properly so you stop chasing vibes`
      ),
      buddyLine(
        buddy,
        'open your CV, portfolio, or LinkedIn and fix one weak spot right now',
        'open your CV, portfolio, or LinkedIn and upgrade one weak point now',
        'open your CV, portfolio, or LinkedIn and fix one weak link now'
      ),
      buddyLine(
        buddy,
        'look at 3 people already doing what you want and study what they are showing',
        'check 3 people already where you want to be and see what they are showing',
        'study 3 people already doing it and clock what makes them visible'
      ),
      buddyLine(
        buddy,
        'make one visible career move today, even if it feels small',
        'make one career move today that puts you on the board',
        'make one real career move today instead of endless prep'
      ),
      buddyLine(
        buddy,
        'save proof of today’s effort so this goal feels grounded',
        'save proof of today’s move so the goal has receipts',
        'keep proof of what you did today so this does not stay imaginary'
      ),
    ];
  }

  if (isHealthGoal) {
    return [
      buddyLine(
        buddy,
        `make ${goal} easier to start by shrinking it to one tiny action`,
        `shrink ${goal} to one tiny action so you can actually start`,
        `make ${goal} smaller right now because you keep making it harder than it needs to be`
      ),
      buddyLine(
        buddy,
        'remove one thing that usually makes you avoid it',
        'clear one thing that usually slows you down here',
        'remove one excuse-helper that keeps getting in your way'
      ),
      buddyLine(
        buddy,
        'do the smallest useful version of the habit for 5 to 15 minutes',
        'do the smallest real version of the habit right now',
        'do the habit in its smallest useful form right now'
      ),
      buddyLine(
        buddy,
        'set up one cue that makes repeating this easier tomorrow',
        'set one cue for tomorrow so this keeps moving',
        'set one clear cue for tomorrow so this does not die tonight'
      ),
      buddyLine(
        buddy,
        'notice that you started, because that matters more than perfection today',
        'count today as a win and use that energy',
        'good, you started, now keep it from becoming a one-day performance'
      ),
    ];
  }

  if (isCreativeGoal) {
    return [
      buddyLine(
        buddy,
        `open the actual project tied to ${goal} and touch the work itself`,
        `open the actual project for ${goal} and get your hands on it`,
        `open the actual project and touch the work, not just the fantasy of it`
      ),
      buddyLine(
        buddy,
        'pick one small part you can finish without needing the perfect mood',
        'pick one small part you can finish today and go there',
        'pick one tiny part and stop waiting for a perfect mood'
      ),
      buddyLine(
        buddy,
        'give it 15 focused minutes and let messy still count',
        'give it 15 focused minutes and make it move',
        'give it 15 minutes and let messy be good enough for once'
      ),
      buddyLine(
        buddy,
        'save or label what you did so the progress feels visible',
        'save what you did so the progress has proof',
        'save the work so your effort does not disappear into vibes'
      ),
      buddyLine(
        buddy,
        'decide the next tiny creative move before you drift away from it',
        'pick the next creative move now and keep the energy alive',
        'set the next move now so you do not ghost the project again'
      ),
    ];
  }

  if (goalState === 'vague' || lowerReason.includes('get my life together')) {
    return [
      buddyLine(
        buddy,
        'pick one part of your life that feels the most out of control right now',
        'pick the one area that feels the messiest right now',
        'pick one messy area right now instead of saying your whole life is a mess'
      ),
      buddyLine(
        buddy,
        'dump everything stressing you into your notes app and keep it messy',
        'brain-dump everything into your notes app and do not over-edit it',
        'empty your head into your notes app and stop trying to make the chaos look cute'
      ),
      buddyLine(
        buddy,
        'circle one thing from that list you can actually do something about today',
        'choose one thing from that mess that you can act on today',
        'pick one thing from that mess and deal with it today'
      ),
      buddyLine(
        buddy,
        'set a 15-minute timer and deal with just that one thing',
        'set a 15-minute timer and get one clean win',
        'set a 15-minute timer and handle that one thing without spiraling'
      ),
      buddyLine(
        buddy,
        'when you finish, write down what already feels lighter',
        'when you finish, clock what already feels better',
        'when you finish, notice that action helped more than overthinking did'
      ),
    ];
  }

  if (signals.isFirstGoal) {
    return [
      buddyLine(
        buddy,
        `keep ${goal} simple for now and pick the easiest useful place to begin`,
        `first goal energy, keep ${goal} simple and start with the easiest useful move`,
        `this is your first goal here, do not overcomplicate ${goal}`
      ),
      buddyLine(
        buddy,
        'open one note, tab, or app connected to this goal so it feels real',
        'open the one place this goal needs and let’s make it real',
        'open the actual place tied to this goal and stop hovering'
      ),
      buddyLine(
        buddy,
        'do one tiny action that proves you have started',
        'do one tiny action so this goal officially leaves idea mode',
        'do one tiny action so this goal stops being just talk'
      ),
      buddyLine(
        buddy,
        'remove one thing that might make you delay this tomorrow',
        'clear one thing that could slow you down tomorrow',
        'fix one thing that could help you procrastinate tomorrow'
      ),
      buddyLine(
        buddy,
        'leave yourself a very clear next step so restarting feels easy',
        'set the next tiny move now so momentum sticks',
        'set the next step now so you do not make this your first abandoned goal'
      ),
    ];
  }

  return [
    buddyLine(
      buddy,
      `get specific about what ${goal} really means for you`,
      `get clear on what ${goal} actually looks like for you`,
      `define ${goal} properly so you stop hiding behind vagueness`
    ),
    buddyLine(
      buddy,
      'pick one tiny action that would make this feel less abstract today',
      'pick one tiny action that makes this goal real today',
      'pick one small real action and stop floating around the goal'
    ),
    buddyLine(
      buddy,
      'do that action for 10 to 15 minutes without trying to perfect it',
      'give that action 10 to 15 real minutes and move',
      'do it for 10 to 15 minutes and stop overcomplicating the start'
    ),
    buddyLine(
      buddy,
      'remove one thing that keeps slowing you down around this goal',
      'clear one thing that keeps dragging this goal down',
      'fix one thing that keeps making this harder than it should be'
    ),
    buddyLine(
      buddy,
      `do one real thing today so ${goal} starts feeling possible`,
      `get one win on the board today so ${goal} has momentum`,
      `make one real move today so ${goal} stops being a cute idea`
    ),
  ];
}

function Sparkle({
  size,
  top,
  left,
  delay,
  duration,
}: {
  size: number;
  top: number | `${number}%`;
  left: number | `${number}%`;
  delay: number;
  duration: number;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.18,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -6,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.22,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.9,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [delay, duration, opacity, scale, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sparkle,
        {
          width: size,
          height: size,
          top,
          left,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function GoalBreakdownScreen() {
  const {
    goalTitle = '',
    category = '',
    deadline = '',
    reason = '',
  } = useLocalSearchParams<{
    goalTitle: string;
    category: string;
    deadline: string;
    reason: string;
  }>();

  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [customTask, setCustomTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupBody, setPopupBody] = useState('');
  const [popupMood, setPopupMood] = useState<PopupMood>('celebrate');
  const [selectedBuddy, setSelectedBuddy] = useState<BuddyType>('hype');
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.9)).current;
  const orbScale = useRef(new Animated.Value(0.92)).current;
  const orbOpacity = useRef(new Animated.Value(0.35)).current;
  const cardTranslateY = useRef(new Animated.Value(18)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showPopup) {
      backdropOpacity.setValue(0);
      popupOpacity.setValue(0);
      popupScale.setValue(0.9);
      orbScale.setValue(0.92);
      orbOpacity.setValue(0.35);
      cardTranslateY.setValue(18);
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(popupScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.58,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 0.94,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.34,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    orbLoop.start();
    return () => orbLoop.stop();
  }, [
    showPopup,
    backdropOpacity,
    popupOpacity,
    popupScale,
    orbScale,
    orbOpacity,
    cardTranslateY,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadAiSteps = async () => {
      const safeGoalTitle = String(goalTitle ?? '').trim();
      const safeCategory = String(category ?? '').trim();
      const safeDeadline = String(deadline ?? '').trim();
      const safeReason = String(reason ?? '').trim();

      if (!safeGoalTitle) {
        if (mounted) {
          setTasks([]);
          setIsGenerating(false);
        }
        return;
      }

      try {
        setIsGenerating(true);

        const { buddy, tasks: generatedTasks, usedFallback } = await generateGoalTasks({
          goalTitle: safeGoalTitle,
          category: safeCategory,
          deadline: safeDeadline,
          reason: safeReason,
        });

        if (!mounted) return;

        setSelectedBuddy(buddy);
        setTasks(generatedTasks);

        if (usedFallback) {
          Alert.alert(
            'GlowGoal AI',
            'Gemini was unavailable, so GlowGoal used the smart fallback brain for your 7 steps.'
          );
        }
      } catch (error) {
        console.error('AI Error:', error);
        if (!mounted) return;
        setTasks([]);
        Alert.alert(
          'GlowGoal AI',
          'Could not generate steps right now. Try again in a bit.'
        );
      } finally {
        if (mounted) setIsGenerating(false);
      }
    };

    const timer = setTimeout(loadAiSteps, 400);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [goalTitle, category, deadline, reason]);

  const canLockIn = useMemo(() => tasks.length > 0, [tasks]);

  const handleAddCustomTask = () => {
    const trimmed = customTask.trim();
    if (!trimmed) return;

    setTasks((prev) => [
      ...prev,
      {
        id: makeId('task'),
        title: trimmed,
        completed: false,
        completedAt: null,
        source: 'user',
      },
    ]);
    setCustomTask('');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const animateButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const animateButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

const handleLockIn = async () => {
  if (!canLockIn || isSaving) return;

  try {
    setIsSaving(true);

    const newGoalId = makeId('goal');
    const newGoal = {
      id: newGoalId,
      title: String(goalTitle),
      category: String(category),
      deadline: String(deadline),
      reason: String(reason),
      createdAt: new Date().toISOString(),
      progress: 0,
      tasks,
    };

    await addGoal(newGoal);

    // --- APPEND THE EMAIL & REMINDER ENGINE LOGIC HERE ---
    try {
      const prefs = await getUserPreferences();
      const goals = await getGoals();
      // This triggers the 7:30 AM / 8:30 PM Email + 8:00 AM/PM Local Push
      await scheduleDailyReminders(goals, prefs.buddy);
    } catch (error) {
      console.log('Reminder engine failed, but UI continues:', error);
    }
    // ----------------------------------------------------

    let buddy: BuddyType = 'hype';
    try {
      const prefs = await getUserPreferences();
      buddy = normalizeBuddy(prefs?.buddy);
      setSelectedBuddy(buddy);
    } catch (error) {
      console.log('Could not load buddy preferences:', error);
    }

    let popup = null;
    try {
      const goals = await getGoals();
      popup = getBuddyPopup({
        event: 'goal_locked_in',
        buddy,
        goal: newGoal,
        goals,
      });
    } catch (error) {
      console.log('Could not resolve buddy popup:', error);
    }

    if (popup) {
      setPopupTitle(popup.title);
      setPopupBody(
        reason
          ? `"${String(reason)}" is a strong reason. ${popup.body}`
          : popup.body
      );
      setPopupMood(popup.mood);
      setPendingGoalId(newGoalId);
      setShowPopup(true);
    } else {
      router.replace({
        pathname: '/dashboard',
        params: { goalId: newGoalId },
      });
    }

    try {
      const base = getBuddyNotificationMessage(buddy, 'lock_in');
      const customLine = buildGoalAwareLine(newGoal, 'lock_in');

      await scheduleLocalNotification({
        title: base.title,
        body: customLine ? `${base.body} ${customLine}` : base.body,
        secondsFromNow: 3600,
        data: { type: 'lock_in', goalId: newGoal.id },
      });
    } catch (error) {
      console.log('Lock-in notification failed, but UI continues:', error);
    }
  } catch (error) {
    console.log('handleLockIn error:', error);
    Alert.alert('GlowGoal', 'Something went wrong while locking in your goal.');
  } finally {
    setIsSaving(false);
  }
};

  const handleClosePopup = () => {
    const goalId = pendingGoalId;

    setShowPopup(false);
    setPendingGoalId(null);

    if (goalId) {
      router.replace({
        pathname: '/dashboard',
        params: { goalId },
      });
    } else {
      router.replace('/dashboard');
    }
  };

  const currentBuddyConfig = buddyConfig[selectedBuddy];
  const moodPalette = getMoodPalette(popupMood);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Modal transparent visible={showPopup} animationType="none">
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.popupCard,
              {
                borderColor: moodPalette.border,
                shadowColor: moodPalette.glow,
                opacity: popupOpacity,
                transform: [{ translateY: cardTranslateY }, { scale: popupScale }],
              },
            ]}
          >
            <View style={styles.sparkleLayer} pointerEvents="none">
              <Sparkle size={8} top={18} left={26} delay={0} duration={1000} />
              <Sparkle size={6} top={32} left={'78%'} delay={180} duration={1200} />
              <Sparkle size={7} top={110} left={'86%'} delay={120} duration={1100} />
              <Sparkle size={5} top={136} left={20} delay={260} duration={1000} />
              <Sparkle size={6} top={205} left={'18%'} delay={340} duration={1300} />
              <Sparkle size={8} top={225} left={'82%'} delay={100} duration={1200} />
            </View>

            <View
              style={[
                styles.moodChip,
                { backgroundColor: moodPalette.chipBg },
              ]}
            >
              <Text style={[styles.moodChipText, { color: moodPalette.chipText }]}>
                {getMoodLabel(popupMood)}
              </Text>
            </View>

            <View style={styles.heroWrap}>
              <Animated.View
                style={[
                  styles.heroGlow,
                  {
                    backgroundColor: moodPalette.orb,
                    opacity: orbOpacity,
                    transform: [{ scale: orbScale }],
                  },
                ]}
              />
              <View
                style={[
                  styles.mascotContainer,
                  { backgroundColor: currentBuddyConfig.accent },
                ]}
              >
                <Image
                  source={currentBuddyConfig.image}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.popupTitle}>{popupTitle}</Text>
            <Text style={styles.popupBody}>{popupBody}</Text>

            <Animated.View
              style={[
                styles.popupButtonWrap,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <Pressable
                onPressIn={animateButtonPressIn}
                onPressOut={animateButtonPressOut}
                onPress={handleClosePopup}
                style={[
                  styles.popupButton,
                  { backgroundColor: currentBuddyConfig.accent },
                ]}
              >
                <Text style={styles.popupButtonText}>continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#5A3D24" />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#FFF7EF" />
          </Pressable>

          <Text style={styles.headerTitle}>goal breakdown</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>{String(goalTitle)}</Text>

            <View style={styles.goalMetaRow}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{String(category)}</Text>
              </View>
              {!!String(deadline) && (
                <Text style={styles.goalMeta}>• {String(deadline)}</Text>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>suggested steps</Text>
            <Text style={styles.sectionHint}>7 AI steps, built with your buddy voice</Text>

            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#848F73" />
                <Text style={styles.loadingText}>{selectedBuddy} is thinking...</Text>
              </View>
            ) : (
              tasks.map((task, index) => (
                <View
                  key={task.id}
                  style={[styles.taskRow, task.source === 'ai' && styles.aiTaskRow]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>
                      {index + 1}. {task.title}
                    </Text>
                  </View>

                  <Pressable onPress={() => handleDeleteTask(task.id)}>
                    <Ionicons name="trash-outline" size={16} color="#7A4B32" />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <TextInput
              value={customTask}
              onChangeText={setCustomTask}
              placeholder="add your own step..."
              placeholderTextColor="#8B7E73"
              style={styles.mainInput}
            />

            <Pressable onPress={handleAddCustomTask} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>add step</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLockIn}
            disabled={!canLockIn || isSaving}
            style={[styles.lockBtn, (!canLockIn || isSaving) && { opacity: 0.5 }]}
          >
            <Text style={styles.lockBtnText}>
              {isSaving ? 'saving...' : 'lock in'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#848F73' },
  safeArea: { flex: 1 },

  topBar: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF7EF',
  },
  headerSpacer: { width: 40 },

  scrollContent: { padding: 20 },

  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF7EF',
    marginBottom: 8,
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    backgroundColor: '#FFD580',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5A3D24',
  },
  goalMeta: {
    color: '#FFF7EF',
    fontSize: 13,
    opacity: 0.8,
  },

  sectionCard: {
    backgroundColor: '#EFE6D8',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#473C34',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#473C34',
    fontWeight: '600',
    textTransform: 'lowercase',
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF7F1',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    gap: 12,
  },
  aiTaskRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD580',
  },
  taskTitle: {
    color: '#473C34',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },

  mainInput: {
    backgroundColor: '#FBF7F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    color: '#473C34',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(71,60,52,0.1)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#473C34',
    fontWeight: '800',
  },

  lockBtn: {
    backgroundColor: '#FFD580',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  lockBtnText: {
    color: '#5A3D24',
    fontSize: 16,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 15, 14, 0.74)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },

  popupCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF7EF',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1.8,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 20,
    overflow: 'hidden',
  },

  sparkleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sparkle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },

  moodChip: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  moodChipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },

  heroWrap: {
    width: 124,
    height: 124,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  mascotContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.20)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  mascotImage: {
    width: 58,
    height: 58,
  },

  popupTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E2A27',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  popupBody: {
    fontSize: 15,
    color: '#6F6257',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  popupButtonWrap: {
    width: '100%',
  },
  popupButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  popupButtonText: {
    color: '#5A3D24',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'lowercase',
  },
  sectionHint: {
  fontSize: 13,
  color: '#CBBFB3',
  marginBottom: 8,
},
});