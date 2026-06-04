let backendUnavailableForSession = false;
let resetTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(available: boolean) => void>();
const BACKEND_UNAVAILABLE_BACKOFF_MS = 15000;

function notifyListeners() {
  const available = !backendUnavailableForSession;
  listeners.forEach((listener) => listener(available));
}

export function backendAvailableForSession() {
  return !backendUnavailableForSession;
}

export function markBackendUnavailableForSession() {
  if (backendUnavailableForSession) {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
  } else {
    backendUnavailableForSession = true;
    notifyListeners();
  }

  resetTimeout = setTimeout(() => {
    resetTimeout = null;
    resetBackendAvailabilityForSession();
  }, BACKEND_UNAVAILABLE_BACKOFF_MS);
}

export function resetBackendAvailabilityForSession() {
  if (!backendUnavailableForSession) {
    return;
  }

  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
  backendUnavailableForSession = false;
  notifyListeners();
}

export function subscribeToBackendAvailability(listener: (available: boolean) => void) {
  listeners.add(listener);
  listener(!backendUnavailableForSession);

  return () => {
    listeners.delete(listener);
  };
}
