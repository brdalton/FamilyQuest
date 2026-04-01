// main.js
import { supabase } from './supabaseClient.js';
import { preloadAssets } from './preloader.js';

async function boot() {
  console.log("Bootloader starting…");

  // 1. Determine which user's game to load
  const params = new URLSearchParams(location.search);
  let USER_ID = params.get("user");

  // Fallback: your own user ID (replace with your actual ID)
  // ca537df7-4a0a-409a-bea6-c821cd65c42d
  if (!USER_ID) {
    USER_ID = "ca537df7-4a0a-409a-bea6-c821cd65c42d"; 
    console.warn("No ?user= provided — using default USER_ID:", USER_ID);
  }

  // 2. Load JSON from Supabase Storage
  const familyJson = await loadJsonFromSupabase('json', `${USER_ID}/family.json`);
  const follyJson = await loadJsonFromSupabase('json', `${USER_ID}/folly.json`);

  // 3. Build list of filenames only
  const filenames = familyJson.family.map(p => p.photo);

  // 4. Preload everything
  console.log("Photo filenames:", filenames);
  const assets = await preloadAssets({
    images: filenames,
    sounds: [
      'sounds/correct.mp3',
      'sounds/incorrect.mp3',
      'sounds/Aww.mp3',
      'sounds/shortHarp.mp3'
    ],
    json: [familyJson, follyJson],
    userId: USER_ID
  });

  console.log("Assets preloaded.");

  // 5. Import your game engine AFTER preload
  const gameModule = await import('./script.js');

  // 6. Start the game
  if (gameModule.init) {
    gameModule.init(familyJson, follyJson, assets.images);
  }
}

boot();

// -------------------------------
// Helpers
// -------------------------------

async function loadJsonFromSupabase(bucket, path) {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(path);

  if (error) throw error;

  const text = await data.text();
  return JSON.parse(text);
}