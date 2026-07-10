/** Prime microphone permission while a user gesture is still active (dashboard click). */

export async function primeMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export const AMBIENT_AUTOSTART_KEY = "medexa_ambient_autostart";
