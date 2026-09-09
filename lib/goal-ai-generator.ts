import { GoogleGenerativeAI } from '@google/generative-ai';

import { BuddyType } from './buddy';
import { buildGoalAiSignals, GoalAiSignals } from './goal-ai-signals';
import { GoalTask, makeId } from './goals';
import { getUserPreferences } from './preferences';

const API_KEY = process.env.GEMINI_API_KEY || ''; 

if (!API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}
const TARGET_STEP_COUNT = 7;

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

type GoalState =
  | 'fresh_start'
  | 'vague'
  | 'urgent'
  | 'overdue'
  | 'long_term'
  | 'normal';

export type NotificationMoment =
  | 'morning_check'
  | 'evening_nudge'
  | 'lock_in'
  | 'deadline_close'
  | 'deadline_today'
  | 'overdue';

function normalizeBuddy(buddy?: string): BuddyType {
  if (buddy === 'soft' || buddy === 'savage' || buddy === 'hype') {
    return buddy;
  }
  return 'hype';
}

function fallbackSignals(): GoalAiSignals {
  return {
    isFirstGoal: false,
    isInactive: false,
    inactiveDays: 0,
    comeback: false,
    deadlineState: 'none' as const,
  };
}

function getGoalState(
  deadline?: string,
  goalTitle?: string,
  reason?: string
): GoalState {
  const cleanGoal = String(goalTitle ?? '').trim().toLowerCase();
  const cleanReason = String(reason ?? '').trim().toLowerCase();
  const wordCount = cleanGoal.split(/\s+/).filter(Boolean).length;

  if (
    wordCount <= 3 ||
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

  const dueDate = new Date(deadline);
  if (Number.isNaN(dueDate.getTime())) {
    return 'normal';
  }

  const diffInDays = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

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
- steps can sound firm, but never cruel
`;
    case 'soft':
      return `
TONE STYLE: SOFT
- calm, warm, reassuring
- low-pressure but still focused
- make hard things feel less scary to start
- should feel like "let's make this easier"
`;
    case 'hype':
    default:
      return `
TONE STYLE: HYPE
- energetic, alive, motivating
- momentum-heavy
- should feel exciting without sounding cheesy
- should feel like "let's get a win right now"
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

Your job is to turn ANY goal into 7 small, immediate, human-sounding action steps.

DO NOT force goals into rigid categories.
Interpret what the user is really trying to do.

CORE RULES:
- return ONLY a raw JSON array of 7 strings
- no markdown
- no backticks
- no numbering
- no objects
- no extra explanation
- each step must be one short sentence
- each step should feel like it can be done in 5 to 20 minutes
- no vague advice like "stay focused", "be consistent", "work hard", or "believe in yourself"
- no repeated structure across all 7 steps
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
- step 6 should keep the user moving
- step 7 should set up the next move or visible proof

FINAL OUTPUT EXAMPLE:
["step one", "step two", "step three", "step four", "step five", "step six", "step seven"]
`;
}

function safeJsonArrayParse(rawText: string): string[] | null {
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {}

  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {}

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
    .filter(Boolean);
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

function padSteps(steps: string[], goalTitle: string, buddy: BuddyType) {
  const clean = cleanGeneratedSteps(steps);
  const seen = new Set<string>();
  const deduped = clean.filter((step) => {
    const key = step.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const fillers = [
    buddyLine(
      buddy,
      `pick one tiny action that keeps ${goalTitle || 'this goal'} moving today`,
      `do one small move that keeps ${goalTitle || 'this goal'} alive today`,
      `make one real move on ${goalTitle || 'this goal'} today`
    ),
    buddyLine(
      buddy,
      'clear one thing that keeps slowing you down',
      'remove one thing that keeps killing momentum',
      'fix one obvious blocker right now'
    ),
    buddyLine(
      buddy,
      'set yourself up for an easier next session',
      'line up the next move before you disappear',
      'set the next move now so this does not die here'
    ),
  ];

  for (const filler of fillers) {
    if (deduped.length >= TARGET_STEP_COUNT) break;
    if (!seen.has(filler.toLowerCase())) {
      deduped.push(filler);
      seen.add(filler.toLowerCase());
    }
  }

  while (deduped.length < TARGET_STEP_COUNT) {
    deduped.push(`do one honest move for ${goalTitle || 'this goal'} today`);
  }

  return deduped.slice(0, TARGET_STEP_COUNT);
}

function buildFallbackSteps(
  goalTitle: string,
  category: string,
  reason: string,
  goalState: GoalState,
  buddy: BuddyType,
  signals: GoalAiSignals
): string[] {
  const goal = String(goalTitle).trim() || 'this goal';
  const lowerGoal = goal.toLowerCase();
  const lowerCategory = String(category).toLowerCase();

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
    lowerGoal.includes('course') ||
    lowerGoal.includes('exam') ||
    lowerGoal.includes('python');

  const isCareerGoal =
    lowerCategory.includes('career') ||
    lowerGoal.includes('job') ||
    lowerGoal.includes('internship') ||
    lowerGoal.includes('linkedin') ||
    lowerGoal.includes('portfolio');

  const isHealthGoal =
    lowerCategory.includes('health') ||
    lowerGoal.includes('gym') ||
    lowerGoal.includes('sleep') ||
    lowerGoal.includes('workout') ||
    lowerGoal.includes('skin');

  const isCreativeGoal =
    lowerCategory.includes('creative') ||
    lowerGoal.includes('write') ||
    lowerGoal.includes('novel') ||
    lowerGoal.includes('song') ||
    lowerGoal.includes('content') ||
    lowerGoal.includes('tiktok');

  const isNetworkingGoal =
    lowerGoal.includes('meet ') ||
    lowerGoal.includes('mentor') ||
    lowerGoal.includes('network') ||
    lowerGoal.includes('noticed') ||
    lowerGoal.includes('collab') ||
    lowerGoal.includes('celebrity');

  if (signals.comeback) {
    return padSteps([
      buddyLine(buddy, `start gently and touch one tiny part of ${goal} today`, `skip the grand speech and make one small move for ${goal}`, `enough disappearing. touch one real part of ${goal} now`),
      buddyLine(buddy, 'open the actual place where this goal lives and stay there for 10 minutes', 'open the real place this goal lives and lock in for 10 minutes', 'open the actual thing, not your excuses, and sit with it for 10 minutes'),
      buddyLine(buddy, 'do the easiest useful action first', 'grab the easiest useful win first', 'take the easiest useful action and stop waiting for a magical mood'),
      buddyLine(buddy, 'remove one tiny obstacle that keeps making you avoid this', 'clear one thing that keeps slowing this goal down', 'fix one obvious thing that keeps helping you procrastinate'),
      buddyLine(buddy, 'leave yourself one clear next step for tomorrow', 'set up the next move now so tomorrow is easier', 'set tomorrow up now so you do not vanish again'),
      buddyLine(buddy, 'track what you did so the restart feels real', 'log the restart so you can see the comeback', 'keep receipts so this is not another fake restart'),
      buddyLine(buddy, 'decide when you will touch it again', 'pick the next check-in time now', 'set the next touch point now and be serious')
    ], goal, buddy);
  }

  if (isNetworkingGoal) {
    return padSteps([
      buddyLine(buddy, `get clear on why ${goal} matters so your moves stop feeling random`, `get clear on why ${goal} matters so your moves have direction`, `be honest about why ${goal} matters so you stop moving blindly`),
      buddyLine(buddy, 'find 3 spaces where people close to this world already show up', 'find 3 places where the right people already gather', 'find 3 places where access actually happens'),
      buddyLine(buddy, 'study one account or community tied to this goal', 'study one page tied to this goal and clock how people get noticed', 'watch one page tied to this goal and learn how access really works'),
      buddyLine(buddy, 'leave one thoughtful comment or reply that makes you visible', 'make one visible move today instead of lurking again', 'stop lurking and make one visible move today'),
      buddyLine(buddy, 'save one contact, event, or community worth returning to', 'save one circle-closing lead for later', 'keep one useful lead instead of scrolling blindly'),
      buddyLine(buddy, 'write one short message or intro you could use when the time comes', 'draft one simple intro so you are not frozen later', 'write one usable intro so panic does not embarrass you later'),
      buddyLine(buddy, 'pick one strategic move that brings you closer to the room', 'make one proximity move today', 'make one real proximity move today and stop romanticizing the outcome')
    ], goal, buddy);
  }

  if (isMoneyGoal) {
    return padSteps([
      buddyLine(buddy, `write the real number tied to ${goal} so the goal stops feeling foggy`, `write the exact number tied to ${goal} and make it real`, `put the real number for ${goal} in front of your face and stop being vague`),
      buddyLine(buddy, 'check your recent spending and spot one leak you can cut', 'scan your recent spending and find one leak to close today', 'look at your spending and cut one obvious leak today'),
      buddyLine(buddy, 'pick one quick money move you can start today', 'choose one fast money move and call it out clearly', 'pick one money move you can do today and stop pretending you need ten'),
      buddyLine(buddy, 'give that money move 15 focused minutes right now', 'put 15 real minutes into that money move right now', 'spend 15 minutes on the money move now, not later'),
      buddyLine(buddy, 'track what you did today', 'log today’s move so the goal has proof', 'track today’s move so this goal stops living only in your mouth'),
      buddyLine(buddy, 'save one helpful resource, lead, or idea for later', 'keep one useful lead so you do not restart from zero tomorrow', 'save one money lead now so tomorrow is not chaos'),
      buddyLine(buddy, 'decide the next tiny earning or saving move', 'line up the next money move before you leave', 'set the next money move now and keep it moving')
    ], goal, buddy);
  }

  if (isStudyGoal) {
    return padSteps([
      buddyLine(buddy, `pick the exact part of ${goal} you want to focus on first`, `choose the exact part of ${goal} you're hitting first`, `pick one exact part of ${goal} and stop scattering yourself`),
      buddyLine(buddy, 'save one beginner-friendly resource so you stop bouncing around', 'lock in one resource so you stop hopping around', 'choose one resource and quit tab-hopping'),
      buddyLine(buddy, 'study for 15 minutes only and let starting be enough for today', 'do 15 focused minutes and get one clean win', 'do 15 minutes and stop acting like you need a perfect setup'),
      buddyLine(buddy, 'write down one thing you understood', 'write one thing you learned so the session counts', 'note one thing you learned so this was not performative studying'),
      buddyLine(buddy, 'try one tiny practice question or example', 'test yourself with one tiny example', 'do one tiny practice round before you leave'),
      buddyLine(buddy, 'save where you stopped so restarting is easy', 'mark where you stopped so tomorrow is easier', 'bookmark your stopping point so you do not act lost tomorrow'),
      buddyLine(buddy, 'set the next mini study session now', 'set the next mini session now so momentum stays alive', 'line up the next session now so you do not ghost this goal')
    ], goal, buddy);
  }

  if (isCareerGoal) {
    return padSteps([
      buddyLine(buddy, `get specific about what ${goal} actually means for you`, `get specific about what ${goal} actually looks like for you`, `define ${goal} properly so you stop chasing vibes`),
      buddyLine(buddy, 'open your CV, portfolio, or LinkedIn and fix one weak spot', 'open your CV, portfolio, or LinkedIn and upgrade one weak point', 'open your CV, portfolio, or LinkedIn and fix one weak link now'),
      buddyLine(buddy, 'look at 3 people already doing what you want and study what they show', 'check 3 people already where you want to be and see what they show', 'study 3 people already doing it and clock what makes them visible'),
      buddyLine(buddy, 'make one visible career move today', 'make one career move today that puts you on the board', 'make one real career move today instead of endless prep'),
      buddyLine(buddy, 'save one job lead, company, or contact worth revisiting', 'save one useful lead for later', 'keep one useful lead so tomorrow is not a reset'),
      buddyLine(buddy, 'write one line about your value so you can reuse it later', 'draft one short value line you can use later', 'write one usable line about yourself so you stop freezing later'),
      buddyLine(buddy, 'keep proof of today’s effort', 'save proof of today’s move so the goal has receipts', 'keep proof of what you did today so this does not stay imaginary')
    ], goal, buddy);
  }

  if (isHealthGoal) {
    return padSteps([
      buddyLine(buddy, `make ${goal} easier to start by shrinking it to one tiny action`, `shrink ${goal} to one tiny action so you can actually start`, `make ${goal} smaller right now because you keep making it harder than it needs to be`),
      buddyLine(buddy, 'remove one thing that usually makes you avoid it', 'clear one thing that usually slows you down here', 'remove one excuse-helper that keeps getting in your way'),
      buddyLine(buddy, 'do the smallest useful version of the habit for 5 to 15 minutes', 'do the smallest real version of the habit right now', 'do the habit in its smallest useful form right now'),
      buddyLine(buddy, 'set up one cue that makes repeating this easier tomorrow', 'set one cue for tomorrow so this keeps moving', 'set one clear cue for tomorrow so this does not die tonight'),
      buddyLine(buddy, 'notice what made it easier to start today', 'clock what made this easier today', 'notice what helped today so you stop making this harder than it is'),
      buddyLine(buddy, 'prep one tiny thing for the next round', 'prep one tiny thing so the next round feels easier', 'set one tiny piece up so tomorrow has less drama'),
      buddyLine(buddy, 'count today as a win and protect the momentum', 'count today as a win and use that energy', 'good. you started. now keep it from becoming a one-day performance')
    ], goal, buddy);
  }

  if (isCreativeGoal) {
    return padSteps([
      buddyLine(buddy, `open the actual project tied to ${goal} and touch the work itself`, `open the actual project for ${goal} and get your hands on it`, `open the real project for ${goal} and stop circling it`),
      buddyLine(buddy, 'pick one tiny output you can finish instead of trying to do everything', 'choose one tiny output and make that the mission today', 'pick one tiny output and stop acting like the whole thing must happen at once'),
      buddyLine(buddy, 'do 10 to 20 minutes of messy real work on it', 'give it 10 to 20 real minutes and make something exist', 'do 10 to 20 minutes of actual work and stop worshipping inspiration'),
      buddyLine(buddy, 'save or name what you made so progress feels visible', 'save what you did so today leaves proof', 'save the work so today has receipts'),
      buddyLine(buddy, 'write one tiny idea for the next part', 'leave one idea for the next part before you close it', 'write one next-step idea now so you do not ghost it later'),
      buddyLine(buddy, 'share or store one piece that keeps the project alive', 'keep one useful piece visible so the project stays alive', 'save one piece somewhere visible so this does not disappear again'),
      buddyLine(buddy, 'decide the next tiny creative move before you leave', 'set the next tiny creative move before you leave', 'pick the next piece now so you do not ghost the project')
    ], goal, buddy);
  }

  if (goalState === 'vague') {
    return padSteps([
      buddyLine(buddy, `write what ${goal} actually means in one clear sentence`, `define what ${goal} actually means so you stop floating`, `say what ${goal} actually means because right now it is just vibes`),
      buddyLine(buddy, 'pick one part of the goal that would make the biggest difference first', 'choose one part that matters most and focus there', 'pick one part that matters and stop trying to attack the whole cloud'),
      buddyLine(buddy, 'remove one thing making the goal feel confusing', 'clear one confusing part so action feels easier', 'fix one vague part so the goal stops hiding behind pretty words'),
      buddyLine(buddy, 'choose one tiny action you can do today that proves this goal is real', 'pick one move for today that makes this goal real', 'make one move today so this stops being a concept'),
      buddyLine(buddy, 'write one simple definition of done', 'write one simple version of what done looks like', 'define what done means so you stop chasing fog'),
      buddyLine(buddy, 'save one note that keeps the direction clear', 'save one note that keeps this goal grounded', 'keep one note that stops this from turning into fluff again'),
      buddyLine(buddy, 'set the next tiny move now', 'line up the next tiny move before you leave', 'set the next move now and stop being vague with yourself')
    ], goal, buddy);
  }

  const reasonLine = reason
    ? buddyLine(
        buddy,
        `let your reason guide the first move: ${reason}`,
        `use your reason as fuel for the first move: ${reason}`,
        `remember your reason and act like it matters: ${reason}`
      )
    : buddyLine(
        buddy,
        `pick the easiest useful part of ${goal} and start there`,
        `grab the easiest useful part of ${goal} and move`,
        `pick the easiest useful part of ${goal} and stop hovering`
      );

  return padSteps([
    reasonLine,
    buddyLine(buddy, 'clear one thing that would make starting easier', 'remove one blocker so starting feels lighter', 'fix one obvious blocker before it becomes another excuse'),
    buddyLine(buddy, 'do a 10-minute starter session', 'give it a 10-minute starter session', 'do 10 minutes right now and stop negotiating'),
    buddyLine(buddy, 'save proof of what you touched today', 'keep proof of today’s move', 'save receipts so today actually counts'),
    buddyLine(buddy, 'write one thing that still feels unclear', 'note one thing that still needs clarity', 'clock one thing that still needs fixing'),
    buddyLine(buddy, 'set up the next small move before you leave', 'line up the next small move now', 'set the next move now so this does not die here'),
    buddyLine(buddy, 'leave yourself one easy re-entry point for tomorrow', 'make tomorrow’s restart easier right now', 'set a clean re-entry point so tomorrow has no drama')
  ], goal, buddy);
}

function toTasks(titles: string[]): GoalTask[] {
  return titles.map((title) => ({
    id: makeId('task'),
    title,
    completed: false,
    completedAt: null,
    source: 'ai' as const,
  }));
}

async function getBuddyAndSignals(
  deadline?: string,
  goalTitle?: string,
  reason?: string
) {
  const prefs = await getUserPreferences().catch(() => null);
  const buddy = normalizeBuddy(prefs?.buddy);
  const goalState = getGoalState(deadline, goalTitle, reason);
  const signals = await buildGoalAiSignals(String(deadline ?? '')).catch(() => fallbackSignals());
  return { buddy, goalState, signals };
}

export async function generateGoalTasks(params: {
  goalTitle: string;
  category: string;
  deadline?: string;
  reason?: string;
}): Promise<{ buddy: BuddyType; tasks: GoalTask[]; usedFallback: boolean }> {
  const safeGoalTitle = String(params.goalTitle ?? '').trim();
  const safeCategory = String(params.category ?? '').trim();
  const safeDeadline = String(params.deadline ?? '').trim();
  const safeReason = String(params.reason ?? '').trim();

  const { buddy, goalState, signals } = await getBuddyAndSignals(
    safeDeadline,
    safeGoalTitle,
    safeReason
  );

  if (!safeGoalTitle) {
    return { buddy, tasks: [], usedFallback: true };
  }

  const fallbackSteps = padSteps(
    buildFallbackSteps(safeGoalTitle, safeCategory, safeReason, goalState, buddy, signals),
    safeGoalTitle,
    buddy
  );

  if (!genAI) {
    return { buddy, tasks: toTasks(fallbackSteps), usedFallback: true };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemInstruction(buddy, goalState, signals),
    });

    const prompt = `
Goal title: "${safeGoalTitle}"
Category: "${safeCategory || 'Unspecified'}"
Deadline: "${safeDeadline || 'None'}"
Reason: "${safeReason || 'None provided'}"
Buddy personality: "${buddy}"

Behavior signals:
- First goal: ${signals.isFirstGoal ? 'yes' : 'no'}
- Inactive: ${signals.isInactive ? 'yes' : 'no'}
- Inactive days: ${signals.inactiveDays}
- Comeback state: ${signals.comeback ? 'yes' : 'no'}
- Deadline state: "${signals.deadlineState}"

Generate 7 human, specific, useful micro-steps for this exact goal.
Return only the JSON array.
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = safeJsonArrayParse(raw) ?? [];
    const finalSteps = padSteps(parsed, safeGoalTitle, buddy);

    return {
      buddy,
      tasks: toTasks(finalSteps),
      usedFallback: parsed.length < TARGET_STEP_COUNT,
    };
  } catch (error) {
    console.error('GlowGoal AI generation error:', error);
    return { buddy, tasks: toTasks(fallbackSteps), usedFallback: true };
  }
}

export async function regenerateSingleGoalStep(params: {
  goalTitle: string;
  category: string;
  deadline?: string;
  reason?: string;
  currentSteps: string[];
  stepIndex: number;
}): Promise<{ buddy: BuddyType; stepTitle: string; usedFallback: boolean }> {
  const safeGoalTitle = String(params.goalTitle ?? '').trim();
  const safeCategory = String(params.category ?? '').trim();
  const safeDeadline = String(params.deadline ?? '').trim();
  const safeReason = String(params.reason ?? '').trim();
  const currentSteps = params.currentSteps.map((step) => String(step).trim()).filter(Boolean);

  const { buddy, goalState, signals } = await getBuddyAndSignals(
    safeDeadline,
    safeGoalTitle,
    safeReason
  );

  const fallbackSteps = padSteps(
    buildFallbackSteps(safeGoalTitle, safeCategory, safeReason, goalState, buddy, signals),
    safeGoalTitle,
    buddy
  );

  const safeIndex = Math.max(0, Math.min(params.stepIndex, fallbackSteps.length - 1));
  const fallbackStep = fallbackSteps[safeIndex];

  if (!safeGoalTitle || !genAI) {
    return { buddy, stepTitle: fallbackStep, usedFallback: true };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemInstruction(buddy, goalState, signals),
    });

    const prompt = `
Goal title: "${safeGoalTitle}"
Category: "${safeCategory || 'Unspecified'}"
Deadline: "${safeDeadline || 'None'}"
Reason: "${safeReason || 'None provided'}"
Buddy personality: "${buddy}"
Current step list:
${currentSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Regenerate only step number ${safeIndex + 1}.
Keep it short, human, useful, and different from the other steps.
Return only the sentence.
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = cleanGeneratedSteps([raw])[0];

    if (!cleaned) {
      return { buddy, stepTitle: fallbackStep, usedFallback: true };
    }

    return { buddy, stepTitle: cleaned, usedFallback: false };
  } catch (error) {
    console.error('GlowGoal single-step regeneration error:', error);
    return { buddy, stepTitle: fallbackStep, usedFallback: true };
  }
}

export function getRegenerationCopy(buddy: BuddyType) {
  if (buddy === 'soft') {
    return {
      allIdle: 'reshape all 7 ai steps',
      allBusy: 'making the steps feel lighter...',
      singleIdle: 'soft reset',
      singleBusy: 'reshaping...',
      success: 'I made the steps feel gentler and easier to start.',
      fallback: 'AI was unavailable, so I rebuilt your steps with the smart backup brain.',
    };
  }

  if (buddy === 'savage') {
    return {
      allIdle: 'rebuild all 7 ai steps',
      allBusy: 'fixing those mid steps...',
      singleIdle: 'redo step',
      singleBusy: 'redoing...',
      success: 'Those steps are sharper now.',
      fallback: 'AI ghosted, so the backup brain stepped in and cleaned it up.',
    };
  }

  return {
    allIdle: 'rebuild all 7 ai steps',
    allBusy: 'glowgoal is cooking better steps...',
    singleIdle: 'refresh step',
    singleBusy: 'refreshing...',
    success: 'Fresh energy. Your steps just got upgraded.',
    fallback: 'Gemini was unavailable, so GlowGoal used the smart fallback brain.',
  };
}
