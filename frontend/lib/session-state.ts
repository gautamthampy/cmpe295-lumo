import type { LessonSpec, ParentInput, TypedMechanicId } from "./lesson-spec";
import type { StudentProgress } from "./adaptation";
import type { StoryExperienceResponse } from "./story-experience";

const LESSON_KEY = "grade2-poc-lesson";
const PARENT_INPUT_KEY = "grade2-poc-parent-input";
const LESSON_SOURCE_KEY = "grade2-poc-source";
const STUDENT_STATE_KEY = "grade2-poc-student-state";
const STORY_EXPERIENCE_KEY = "grade2-poc-story-experience";

export interface StudentSessionState {
  activeMechanicId: TypedMechanicId;
  progress: StudentProgress;
  hintText: string;
  adaptationReason: string;
  eventLog: string[];
  storyCompleted?: boolean;
}

export function saveGeneratedLesson(params: {
  lesson: LessonSpec;
  parentInput: ParentInput;
  source: "live" | "seed";
}) {
  writeSharedJson(LESSON_KEY, params.lesson);
  writeSharedJson(PARENT_INPUT_KEY, params.parentInput);
  writeSharedJson(LESSON_SOURCE_KEY, params.source);
}

export function readGeneratedLesson(): LessonSpec | null {
  return readSharedJson<LessonSpec>(LESSON_KEY);
}

export function readStoredParentInput(): ParentInput | null {
  return readSharedJson<ParentInput>(PARENT_INPUT_KEY);
}

export function readStoredSource(): "live" | "seed" | null {
  return readSharedJson<"live" | "seed">(LESSON_SOURCE_KEY);
}

export function saveStudentState(state: StudentSessionState) {
  writeSharedJson(STUDENT_STATE_KEY, state);
}

export function readStudentState(): StudentSessionState | null {
  return readSharedJson<StudentSessionState>(STUDENT_STATE_KEY);
}

interface StoredStoryExperience {
  lessonId: string;
  experience: StoryExperienceResponse;
}

function readFromStorage<T>(
  storage: Storage | undefined,
  key: string
): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeToStorage(storage: Storage | undefined, key: string, value: unknown) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and storage errors so the UX still works.
  }
}

function removeFromStorage(storage: Storage | undefined, key: string) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function readSharedJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  return (
    readFromStorage<T>(window.sessionStorage, key) ??
    readFromStorage<T>(window.localStorage, key)
  );
}

function writeSharedJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  writeToStorage(window.sessionStorage, key, value);
  writeToStorage(window.localStorage, key, value);
}

export function saveStoryExperience(lessonId: string, experience: StoryExperienceResponse) {
  if (typeof window === "undefined") return;
  const payload = { lessonId, experience } satisfies StoredStoryExperience;
  writeToStorage(window.sessionStorage, STORY_EXPERIENCE_KEY, payload);
  removeFromStorage(window.localStorage, STORY_EXPERIENCE_KEY);
}

export function readStoryExperience(
  lessonId: string
): StoryExperienceResponse | null {
  if (typeof window === "undefined") return null;
  const stored =
    readFromStorage<StoredStoryExperience>(window.sessionStorage, STORY_EXPERIENCE_KEY) ??
    readFromStorage<StoredStoryExperience>(window.localStorage, STORY_EXPERIENCE_KEY);
  if (!stored || stored.lessonId !== lessonId) return null;
  return stored.experience;
}

export function clearStoryExperience() {
  if (typeof window === "undefined") return;
  removeFromStorage(window.sessionStorage, STORY_EXPERIENCE_KEY);
  removeFromStorage(window.localStorage, STORY_EXPERIENCE_KEY);
}
