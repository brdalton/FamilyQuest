// preloader.js
import { supabase } from './supabaseClient.js';

export async function preloadAssets({ images = [], sounds = [], json = [], userId }) {
  const loadedImages = {};
  const loadedSounds = {};
  const promises = [];

  // Preload images (filenames only)
  for (const filename of images) {
    const fullUrl = getPublicPhotoUrl(userId, filename);

    promises.push(new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        loadedImages[filename] = img;
        resolve();
      };
      img.onerror = resolve;
      img.src = fullUrl;
    }));
  }

  // Preload sounds
  for (const url of sounds) {
    promises.push(new Promise(resolve => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        loadedSounds[url] = audio;
        resolve();
      };
      audio.onerror = resolve;
      audio.src = url;
      audio.load();
    }));
  }

  // JSON already loaded
  for (const obj of json) {
    promises.push(Promise.resolve(obj));
  }

  await Promise.all(promises);

  return {
    images: loadedImages,
    sounds: loadedSounds,
    json
  };
}

// Build public URL for images/<user-id>/<filename>
function getPublicPhotoUrl(userId, filename) {
  const path = `${userId}/${filename}`;
  const { data } = supabase
    .storage
    .from('images')
    .getPublicUrl(path);

  return data.publicUrl;
}