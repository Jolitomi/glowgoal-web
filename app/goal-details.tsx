import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { BUDDY_STORAGE_KEY, buddyConfig, BuddyType } from '../lib/buddy';
import { getBuddyPopup } from '../lib/buddy-engine';
import { scheduleDailyReminders } from '../lib/daily-reminder-engine';
import {
  generateGoalTasks,
  getRegenerationCopy,
  regenerateSingleGoalStep,
} from '../lib/goal-ai-generator';
import {
  getGoalById,
  getGoals,
  GoalItem,
  GoalTask,
  makeId,
  toggleTask,
  updateGoal,
} from '../lib/goals';
import { rebuildGoalNotifications } from '../lib/notification-engine';
import { cancelNotificationsByType } from '../lib/notifications';
import { getUserPreferences } from '../lib/preferences';
import { setLastTaskCompleted } from '../lib/user-progress';

function normalizeGoalId(goalId: string | string[] | undefined): string {
  if (Array.isArray(goalId)) return goalId[0] ?? '';
  return String(goalId ?? '');
}

function calcProgress(tasks: GoalTask[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}


export default function GoalDetailsScreen() {
  const params = useLocalSearchParams<{ goalId?: string | string[] }>();
  const goalId = normalizeGoalId(params.goalId);

  const [goal, setGoal] = useState<GoalItem | null>(null);
  const [buddy, setBuddy] = useState<BuddyType>('hype');

  const [showFeedback, setShowFeedback] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [goBackToDashboardAfterPopup, setGoBackToDashboardAfterPopup] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDeadline, setEditedDeadline] = useState('');
  const [editedReason, setEditedReason] = useState('');
  const [newTask, setNewTask] = useState('');
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const found = await getGoalById(goalId);
    setGoal(found);

    if (found) {
      setEditedTitle(found.title);
      setEditedDeadline(found.deadline || '');
      setEditedReason(found.reason || '');
    }

    const savedBuddy = await AsyncStorage.getItem(BUDDY_STORAGE_KEY);
    if (savedBuddy === 'soft' || savedBuddy === 'savage' || savedBuddy === 'hype') {
      setBuddy(savedBuddy);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const completedCount = useMemo(() => {
    if (!goal) return 0;
    return goal.tasks.filter((task) => task.completed).length;
  }, [goal]);

  const currentBuddyConfig = buddyConfig[buddy];
  const regenerationCopy = getRegenerationCopy(buddy);

  const syncGoalNotifications = useCallback(
    async (updatedGoal: GoalItem, options?: { suppressImmediate?: boolean }) => {
      const goals = await getGoals();
      const prefs = await getUserPreferences();
      const selectedBuddy = prefs?.buddy ?? 'hype';

      await rebuildGoalNotifications({
        goal: updatedGoal,
        goals,
        buddy: selectedBuddy,
        suppressImmediate: options?.suppressImmediate ?? false,
      });
    },
    []
  );


  const maybeShowMilestonePopup = async (updatedGoal: GoalItem) => {
    const goals = await getGoals();
    const prefs = await getUserPreferences();
    const selectedBuddy = prefs?.buddy ?? 'hype';

    const completedTasks = updatedGoal.tasks.filter((task) => task.completed).length;

    let event: 'task_completed' | 'goal_completed' | null = null;

    if (updatedGoal.progress === 100) {
      event = 'goal_completed';
    } else if (completedTasks === 1) {
      event = 'task_completed';
    }

    await rebuildGoalNotifications({
      goal: updatedGoal,
      goals,
      buddy: selectedBuddy,
    });

    if (!event) return;

    const popup = getBuddyPopup({
      event,
      buddy: selectedBuddy,
      goal: updatedGoal,
      goals,
    });

    if (!popup) return;

    setBuddy(selectedBuddy);
    setPopupTitle(popup.title);
    setFeedbackMessage(popup.body);
    setGoBackToDashboardAfterPopup(event === 'goal_completed');
    setShowFeedback(true);
  };

  const handleToggleTask = async (taskId: string) => {
    if (!goal || isEditing) return;

    const previousTask = goal.tasks.find((task) => task.id === taskId);
    const updated = await toggleTask(goal.id, taskId);
    if (!updated) return;

    setGoal(updated);

    const updatedTask = updated.tasks.find((task) => task.id === taskId);
    const wasCompletedBefore = previousTask?.completed ?? false;
    const isCompletedNow = updatedTask?.completed ?? false;

    if (wasCompletedBefore && !isCompletedNow) {
      await syncGoalNotifications(updated);
      return;
    }

   if (!wasCompletedBefore && isCompletedNow) {
  // mark real progress
  await setLastTaskCompleted();

  // cancel reminders that no longer make sense
  await Promise.all([
    cancelNotificationsByType('afternoon_nudge'),
    cancelNotificationsByType('evening_nudge'),
  ]);

  await maybeShowMilestonePopup(updated);
}
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!goal) return;

    const updatedTasks = goal.tasks.filter((task) => task.id !== taskId);
    const updatedGoal = {
      ...goal,
      tasks: updatedTasks,
      progress: calcProgress(updatedTasks),
    };

    await updateGoal(goal.id, {
      tasks: updatedTasks,
      progress: updatedGoal.progress,
    });

    setGoal(updatedGoal);
    await syncGoalNotifications(updatedGoal, { suppressImmediate: true });
  };

  const handleTaskTextChange = (taskId: string, value: string) => {
    if (!goal) return;

    setGoal({
      ...goal,
      tasks: goal.tasks.map((task) =>
        task.id === taskId ? { ...task, title: value } : task
      ),
    });
  };

  const handleAddTask = async () => {
    if (!goal) return;

    const trimmed = newTask.trim();
    if (!trimmed) return;

    const updatedTasks: GoalTask[] = [
      ...goal.tasks,
      {
        id: makeId('task'),
        title: trimmed,
        completed: false,
        completedAt: null,
        source: 'user' as const,
      },
    ];

    const updatedGoal = {
      ...goal,
      tasks: updatedTasks,
      progress: calcProgress(updatedTasks),
    };

    await updateGoal(goal.id, {
      tasks: updatedTasks,
      progress: updatedGoal.progress,
    });

    setGoal(updatedGoal);
    setNewTask('');
    await syncGoalNotifications(updatedGoal, { suppressImmediate: true });
  };

  const handleRegenerateAiSteps = async () => {
    if (!goal) return;

    try {
      setIsRegeneratingAll(true);

      const { tasks, usedFallback, buddy: generatedBuddy } = await generateGoalTasks({
        goalTitle: editedTitle.trim() || goal.title,
        category: goal.category,
        reason: editedReason.trim(),
        deadline: editedDeadline.trim(),
      });

      const userTasks = goal.tasks.filter((task) => task.source === 'user');
      const updatedTasks = [...tasks, ...userTasks];

      const updatedGoal = {
        ...goal,
        title: editedTitle.trim() || goal.title,
        deadline: editedDeadline.trim(),
        reason: editedReason.trim(),
        tasks: updatedTasks,
        progress: calcProgress(updatedTasks),
      };

      await updateGoal(goal.id, {
        title: updatedGoal.title,
        deadline: updatedGoal.deadline,
        reason: updatedGoal.reason,
        tasks: updatedTasks,
        progress: updatedGoal.progress,
      });

      setBuddy(generatedBuddy);
      setGoal(updatedGoal);
      await syncGoalNotifications(updatedGoal, { suppressImmediate: true });

      if (usedFallback) {
        Alert.alert('GlowGoal', regenerationCopy.fallback);
      }
    } catch (error) {
      console.log('handleRegenerateAiSteps error:', error);
      Alert.alert('GlowGoal', 'Could not regenerate the AI steps right now.');
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  const handleRegenerateSingleAiStep = async (taskId: string) => {
    if (!goal) return;

    const aiTasks = goal.tasks.filter((task) => task.source === 'ai');
    const targetTask = goal.tasks.find((task) => task.id === taskId);
    if (!targetTask || targetTask.source !== 'ai') return;

    const aiStepIndex = aiTasks.findIndex((task) => task.id === taskId);
    if (aiStepIndex < 0) return;

    try {
      setRegeneratingTaskId(taskId);

      const { stepTitle, usedFallback, buddy: generatedBuddy } = await regenerateSingleGoalStep({
        goalTitle: editedTitle.trim() || goal.title,
        category: goal.category,
        deadline: editedDeadline.trim(),
        reason: editedReason.trim(),
        currentSteps: aiTasks.map((task) => task.title),
        stepIndex: aiStepIndex,
      });

      const updatedTasks = goal.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: stepTitle,
              completed: false,
              completedAt: null,
            }
          : task
      );

      const updatedGoal = {
        ...goal,
        title: editedTitle.trim() || goal.title,
        deadline: editedDeadline.trim(),
        reason: editedReason.trim(),
        tasks: updatedTasks,
        progress: calcProgress(updatedTasks),
      };

      await updateGoal(goal.id, {
        title: updatedGoal.title,
        deadline: updatedGoal.deadline,
        reason: updatedGoal.reason,
        tasks: updatedTasks,
        progress: updatedGoal.progress,
      });

      setBuddy(generatedBuddy);
      setGoal(updatedGoal);
      await syncGoalNotifications(updatedGoal, { suppressImmediate: true });

      if (usedFallback) {
        Alert.alert('GlowGoal', regenerationCopy.fallback);
      }
    } catch (error) {
      console.log('handleRegenerateSingleAiStep error:', error);
      Alert.alert('GlowGoal', 'Could not regenerate that step right now.');
    } finally {
      setRegeneratingTaskId(null);
    }
  };

  const handleSaveChanges = async () => {
    if (!goal) return;

    const cleanedTasks = goal.tasks
      .map((task) => ({ ...task, title: task.title.trim() }))
      .filter((task) => task.title.length > 0);

    const updatedGoal: GoalItem = {
      ...goal,
      title: editedTitle.trim() || goal.title,
      deadline: editedDeadline.trim(),
      reason: editedReason.trim(),
      tasks: cleanedTasks,
      progress: calcProgress(cleanedTasks),
    };

    await updateGoal(goal.id, {
      title: updatedGoal.title,
      deadline: updatedGoal.deadline,
      reason: updatedGoal.reason,
      tasks: updatedGoal.tasks,
      progress: updatedGoal.progress,
    });

    setGoal(updatedGoal);
    setIsEditing(false);
    await syncGoalNotifications(updatedGoal, { suppressImmediate: true });
  };

  const handleSaveProgress = async () => {
  if (!goal) return;

  try {
   
    await syncGoalNotifications(goal, { suppressImmediate: true });


    const currentGoals = await getGoals();
    const prefs = await getUserPreferences();
    await scheduleDailyReminders(currentGoals, prefs.buddy);
   

    router.replace('/dashboard');
  } catch (error) {
    console.error("Progress save sync failed:", error);
    router.replace('/dashboard'); // Still navigate even if sync fails
  }
};

  if (!goal) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Modal transparent visible={showFeedback} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.celebCard}>
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

            <Text style={styles.celebTitle}>{popupTitle || `${buddy} buddy check-in`}</Text>
            <Text style={styles.celebQuote}>"{feedbackMessage}"</Text>

            <Pressable
              style={[
                styles.celebCloseBtn,
                { backgroundColor: currentBuddyConfig.accent },
              ]}
              onPress={() => {
                setShowFeedback(false);

                if (goBackToDashboardAfterPopup) {
                  setGoBackToDashboardAfterPopup(false);
                  router.replace('/dashboard');
                }
              }}
            >
              <Text style={styles.celebCloseText}>
                {goBackToDashboardAfterPopup ? 'back to board' : 'close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF7EF" />
          </Pressable>

          <Text style={styles.headerTitle}>goal details</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>
            <View style={styles.goalCard}>
              <View style={styles.goalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{goal.category}</Text>
                  </View>
                </View>

                <View style={styles.taskCounterBadge}>
                  <Text style={styles.taskCounterText}>
                    {completedCount} / {goal.tasks.length}
                  </Text>
                </View>
              </View>

              {!!goal.deadline && <Text style={styles.goalMetaText}>deadline: {goal.deadline}</Text>}
              {!!goal.reason && <Text style={styles.goalMetaText}>why: {goal.reason}</Text>}

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{goal.progress}% progress</Text>
            </View>

            {!isEditing ? (
              <Pressable style={styles.primaryEditBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={18} color="#5A3D24" />
                <Text style={styles.primaryEditBtnText}>edit goal</Text>
              </Pressable>
            ) : (
              <View style={styles.editPanel}>
                <View style={styles.editPanelHeader}>
                  <Text style={styles.editPanelTitle}>edit goal</Text>
                  <Pressable
                    style={styles.cancelEditBtn}
                    onPress={() => {
                      setEditedTitle(goal.title);
                      setEditedDeadline(goal.deadline || '');
                      setEditedReason(goal.reason || '');
                      setNewTask('');
                      loadData();
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.cancelEditText}>cancel</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>goal title</Text>
                <TextInput
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="what is the goal?"
                  placeholderTextColor="rgba(90,61,36,0.38)"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>deadline (optional)</Text>
                <TextInput
                  value={editedDeadline}
                  onChangeText={setEditedDeadline}
                  placeholder="use YYYY-MM-DD for testing"
                  placeholderTextColor="rgba(90,61,36,0.38)"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>why it matters</Text>
                <TextInput
                  value={editedReason}
                  onChangeText={setEditedReason}
                  placeholder="give your buddy some context"
                  placeholderTextColor="rgba(90,61,36,0.38)"
                  style={[styles.input, styles.textAreaInput]}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.regenSection}>
                  <Text style={styles.regenSectionTitle}>AI step controls</Text>
                  <Text style={styles.regenHelperText}>Tap <Text style={styles.inlineStrong}>“regen this step”</Text> on any AI step that feels off, or rebuild all 7 AI steps at once.</Text>

                  <Pressable
                    style={[styles.regenBtn, isRegeneratingAll && styles.regenBtnDisabled]}
                    onPress={handleRegenerateAiSteps}
                    disabled={isRegeneratingAll || !!regeneratingTaskId}
                  >
                    {isRegeneratingAll ? (
                      <ActivityIndicator size="small" color="#5A3D24" />
                    ) : (
                      <Ionicons name="sparkles-outline" size={18} color="#5A3D24" />
                    )}
                    <Text style={styles.regenBtnText}>{isRegeneratingAll ? regenerationCopy.allBusy : regenerationCopy.allIdle}</Text>
                  </Pressable>

                  {(isRegeneratingAll || regeneratingTaskId) && (
                    <Text style={styles.regenStatusText}>
                      {isRegeneratingAll ? regenerationCopy.allBusy : regenerationCopy.singleBusy}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{isEditing ? 'edit checklist' : 'checklist'}</Text>
              {isEditing ? (
                <Text style={styles.sectionHint}>
                  Full step text stays visible here. AI steps also have a clear “regen this step” action.
                </Text>
              ) : null}

              {goal.tasks.map((task) => {
                const isCurrentTaskRegenerating = regeneratingTaskId === task.id;
                const canRegenerateThisTask = isEditing && task.source === 'ai';

                return (
                  <View key={task.id} style={[styles.taskRow, task.completed && styles.taskRowDone]}>
                    {!isEditing ? (
                      <Pressable
                        style={styles.taskMainTapArea}
                        onPress={() => handleToggleTask(task.id)}
                      >
                        <Ionicons
                          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={26}
                          color={task.completed ? '#848F73' : '#D1C4B2'}
                        />

                        <View style={styles.taskTextWrap}>
                          <Text style={[styles.taskText, task.completed && styles.taskTextDone]}>
                            {task.title}
                          </Text>
                          <Text style={styles.taskTypeText}>
                            {task.source === 'ai' ? 'AI step' : 'Your step'}
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <>
                        <View style={styles.taskEditHeaderRow}>
                          <View style={styles.taskEditHeaderLeft}>
                            <Ionicons
                              name={task.source === 'ai' ? 'sparkles-outline' : 'create-outline'}
                              size={18}
                              color="#BBA892"
                            />
                            <Text style={styles.taskTypeText}>
                              {task.source === 'ai' ? 'AI step' : 'Your step'}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleDeleteTask(task.id)}
                            style={styles.taskDeleteBtn}
                          >
                            <Ionicons name="trash-outline" size={18} color="#B35B5B" />
                          </Pressable>
                        </View>

                        <TextInput
                          value={task.title}
                          onChangeText={(value) => handleTaskTextChange(task.id, value)}
                          style={styles.taskEditInput}
                          placeholder="task"
                          placeholderTextColor="rgba(90,61,36,0.35)"
                          multiline
                          textAlignVertical="top"
                        />

                        <View style={styles.taskEditActions}>
                          {canRegenerateThisTask ? (
                            <Pressable
                              style={[
                                styles.taskRegenBtn,
                                (isRegeneratingAll || !!regeneratingTaskId) && styles.taskRegenBtnDisabled,
                              ]}
                              disabled={isRegeneratingAll || !!regeneratingTaskId}
                              onPress={() => handleRegenerateSingleAiStep(task.id)}
                            >
                              {isCurrentTaskRegenerating ? (
                                <ActivityIndicator size="small" color="#FFF7EF" />
                              ) : (
                                <Ionicons name="refresh-outline" size={14} color="#FFF7EF" />
                              )}
                              <Text style={styles.taskRegenBtnText}>{isCurrentTaskRegenerating ? regenerationCopy.singleBusy : 'regen this step'}</Text>
                            </Pressable>
                          ) : (
                            <View style={styles.taskManualPill}>
                              <Text style={styles.taskManualPillText}>manual step</Text>
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}

              {isEditing ? (
                <View style={styles.addTaskWrap}>
                  <Text style={styles.fieldLabel}>add your own step</Text>
                  <TextInput
                    value={newTask}
                    onChangeText={setNewTask}
                    placeholder="e.g. study 30 minutes every evening"
                    placeholderTextColor="rgba(90,61,36,0.35)"
                    style={styles.addTaskInput}
                    multiline
                  />
                  <Pressable style={styles.addTaskBtn} onPress={handleAddTask}>
                    <Text style={styles.addTaskBtnText}>add step</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {isEditing ? (
              <Pressable style={styles.saveBtn} onPress={handleSaveChanges}>
                <Text style={styles.saveBtnText}>save changes</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.saveBtn} onPress={handleSaveProgress}>
                <Text style={styles.saveBtnText}>save & update</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#848F73' },
  safeArea: { flex: 1 },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#848F73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#FFF7EF', fontWeight: '700' },

  topBar: {
    height: 80,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF7EF',
    textTransform: 'lowercase',
  },
  headerSpacer: { width: 50 },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  scrollContent: { paddingBottom: 36 },
  contentContainer: { paddingHorizontal: 20, gap: 16 },

  goalCard: {
    backgroundColor: '#FFF7EF',
    borderRadius: 24,
    padding: 18,
    marginTop: 4,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    color: '#3F2B1D',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0E0D0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C4E35',
    textTransform: 'lowercase',
  },
  taskCounterBadge: {
    backgroundColor: '#EFE7DD',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskCounterText: {
    color: '#6C4E35',
    fontWeight: '800',
    fontSize: 12,
  },
  goalMetaText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7F6C5D',
    marginTop: 4,
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    backgroundColor: '#EEE5D9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#848F73',
    borderRadius: 999,
  },
  progressPercent: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#6C4E35',
  },

  primaryEditBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7EF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryEditBtnText: {
    color: '#5A3D24',
    fontWeight: '800',
    textTransform: 'lowercase',
  },

  editPanel: {
    backgroundColor: '#FFF7EF',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  editPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  editPanelTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3F2B1D',
    textTransform: 'lowercase',
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F2E6DA',
  },
  cancelEditText: {
    color: '#7A4B32',
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A4B32',
    textTransform: 'lowercase',
  },
  inlineStrong: {
    color: '#5A3D24',
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#F5EDE4',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#3F2B1D',
    fontSize: 15,
  },
  textAreaInput: {
    minHeight: 94,
  },

  regenSection: {
    marginTop: 6,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#F3EBE1',
    gap: 8,
  },
  regenSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#5A3D24',
    textTransform: 'lowercase',
  },
  regenHelperText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7B6759',
  },
  regenBtn: {
    marginTop: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#EFDCC9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  regenBtnDisabled: {
    opacity: 0.55,
  },
  regenBtnText: {
    color: '#5A3D24',
    fontWeight: '900',
    textTransform: 'lowercase',
  },
  regenStatusText: {
    fontSize: 12,
    color: '#7B6759',
    fontStyle: 'italic',
  },

  sectionCard: {
    backgroundColor: '#FFF7EF',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3F2B1D',
    textTransform: 'lowercase',
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7B6759',
    marginTop: -4,
  },

  taskRow: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#F7F0E7',
    gap: 10,
  },
  taskRowDone: {
    opacity: 0.78,
  },
  taskMainTapArea: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  taskTextWrap: {
    flex: 1,
    gap: 6,
  },
  taskText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3F2B1D',
    fontWeight: '700',
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#8A7B6F',
  },
  taskTypeText: {
    fontSize: 12,
    color: '#9A8472',
    fontWeight: '800',
    textTransform: 'lowercase',
  },

  taskEditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  taskEditHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskEditInput: {
    minHeight: 86,
    borderRadius: 14,
    backgroundColor: '#FFF7EF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#3F2B1D',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  taskEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  taskRegenBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#848F73',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskRegenBtnDisabled: {
    opacity: 0.55,
  },
  taskRegenBtnText: {
    color: '#FFF7EF',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  taskManualPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#E8DDD0',
  },
  taskManualPillText: {
    color: '#7B6759',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  taskDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E7DF',
  },

  addTaskWrap: {
    marginTop: 4,
    gap: 10,
  },
  addTaskInput: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#F5EDE4',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#3F2B1D',
    fontSize: 15,
  },
  addTaskBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EFDCC9',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addTaskBtnText: {
    color: '#5A3D24',
    fontWeight: '900',
    textTransform: 'lowercase',
  },
  saveBtn: {
    backgroundColor: '#3F2B1D',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFF7EF',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'lowercase',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  celebCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#FFF7EF',
    padding: 24,
    alignItems: 'center',
  },
  mascotContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mascotImage: {
    width: 66,
    height: 66,
  },
  celebTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3F2B1D',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  celebQuote: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6C4E35',
    textAlign: 'center',
  },
  celebCloseBtn: {
    marginTop: 20,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  celebCloseText: {
    color: '#FFF7EF',
    fontWeight: '900',
    textTransform: 'lowercase',
  },
});
