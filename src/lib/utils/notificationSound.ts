// src/lib/utils/notificationSound.ts

let audio: HTMLAudioElement | null = null;

export function playNotificationSound(volume: number = 0.7) {
  try {
    if (!audio) {
      audio = new Audio('/assets/notification.mp3');
      audio.preload = 'auto';
    }
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch((err) => {
      // Autoplay might be blocked by browser
      // Optionally, show a UI prompt to enable sound
      // eslint-disable-next-line no-console
      console.warn('Notification sound blocked or failed:', err);
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to play notification sound:', e);
  }
}

export function setNotificationVolume(vol: number) {
  if (audio) {
    audio.volume = vol;
  }
}
