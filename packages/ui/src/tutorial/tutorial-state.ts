export const NEW_USER_TUTORIAL_STORAGE_KEY = "gph.new-user-tutorial";

export type NewUserTutorialState = {
  active: boolean;
  projectId: string | null;
  stepIndex: number;
};

const INITIAL_TUTORIAL_STATE: NewUserTutorialState = {
  active: false,
  projectId: null,
  stepIndex: 0
};

const listeners = new Set<() => void>();

function readStoredTutorialState(): NewUserTutorialState {
  if (typeof sessionStorage === "undefined") return INITIAL_TUTORIAL_STATE;
  try {
    const stored = sessionStorage.getItem(NEW_USER_TUTORIAL_STORAGE_KEY);
    if (!stored) return INITIAL_TUTORIAL_STATE;
    const parsed = JSON.parse(stored) as Partial<NewUserTutorialState>;
    return {
      active: parsed.active === true,
      projectId: typeof parsed.projectId === "string" ? parsed.projectId : null,
      stepIndex: Number.isInteger(parsed.stepIndex) && Number(parsed.stepIndex) >= 0
        ? Number(parsed.stepIndex)
        : 0
    };
  } catch {
    return INITIAL_TUTORIAL_STATE;
  }
}

let tutorialState = readStoredTutorialState();

function publishTutorialState(nextState: NewUserTutorialState): void {
  tutorialState = nextState;
  if (typeof sessionStorage !== "undefined") {
    try {
      if (nextState.active) {
        sessionStorage.setItem(NEW_USER_TUTORIAL_STORAGE_KEY, JSON.stringify(nextState));
      } else {
        sessionStorage.removeItem(NEW_USER_TUTORIAL_STORAGE_KEY);
      }
    } catch {
      // The tutorial remains usable in memory when session storage is unavailable.
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToNewUserTutorial(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNewUserTutorialSnapshot(): NewUserTutorialState {
  return tutorialState;
}

export function startNewUserTutorial(projectId: string): void {
  publishTutorialState({ active: true, projectId, stepIndex: 0 });
}

export function setNewUserTutorialStep(stepIndex: number): void {
  publishTutorialState({
    active: true,
    projectId: tutorialState.projectId,
    stepIndex: Math.max(0, Math.floor(stepIndex))
  });
}

export function endNewUserTutorial(): void {
  publishTutorialState(INITIAL_TUTORIAL_STATE);
}
