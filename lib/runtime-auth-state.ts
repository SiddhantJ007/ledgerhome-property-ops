let runtimeAuthSessionActive = false;

export function setRuntimeAuthSessionActive(isActive: boolean) {
  runtimeAuthSessionActive = isActive;
}

export function runtimeAuthSessionAvailable() {
  return runtimeAuthSessionActive;
}
