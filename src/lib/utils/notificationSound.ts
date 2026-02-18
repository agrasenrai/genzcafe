// src/lib/utils/notificationSound.ts

let audio: HTMLAudioElement | null = null;
let continuousNotificationInterval: NodeJS.Timeout | null = null;

function initializeAudio() {
  if (!audio) {
    audio = new Audio('/assets/notification.mp3');
    audio.preload = 'auto';
  }
  return audio;
}

export function playNotificationSound(volume: number = 0.7) {
  try {
    const audioElement = initializeAudio();
    
    // Stop any current playback
    if (!audioElement.paused) {
      audioElement.pause();
    }
    
    audioElement.currentTime = 0;
    audioElement.volume = Math.max(0, Math.min(1, volume)); // Clamp volume between 0-1
    
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // eslint-disable-next-line no-console
          console.debug('Notification sound played successfully');
        })
        .catch((err) => {
          // Autoplay might be blocked by browser
          // eslint-disable-next-line no-console
          console.warn('Notification sound blocked or failed:', err);
        });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to play notification sound:', e);
  }
}

export function setNotificationVolume(vol: number) {
  const audioElement = initializeAudio();
  audioElement.volume = Math.max(0, Math.min(1, vol));
}

export function playContinuousNotification(volume: number = 0.7, intervalMs: number = 3000) {
  // Stop any existing continuous notification
  stopContinuousNotification();

  // Play the sound immediately on first call
  playNotificationSound(volume);

  // Set up interval to play sound repeatedly
  continuousNotificationInterval = setInterval(() => {
    playNotificationSound(volume);
  }, intervalMs);
  
  // eslint-disable-next-line no-console
  console.log(`Continuous notification started with ${intervalMs}ms interval`);
}

export function stopContinuousNotification() {
  if (continuousNotificationInterval) {
    clearInterval(continuousNotificationInterval);
    continuousNotificationInterval = null;
    // eslint-disable-next-line no-console
    console.log('Continuous notification stopped');
  }
  
  // Stop audio playback
  if (audio && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }
}
