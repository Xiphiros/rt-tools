/**
 * Hitsound Asset Manifest
 * Maps logical hitsound keys to local file paths.
 * 
 * NOTE: We use the URL constructor to allow Vite to resolve these assets 
 * relative to this file, regardless of where they end up in the build.
 */

export const HITSOUND_FILES = {
    // Normal Set
    'normal-hitnormal': new URL('./normal-hitnormal.wav', import.meta.url).href,
    'normal-hitwhistle': new URL('./normal-hitwhistle.wav', import.meta.url).href,
    'normal-hitfinish': new URL('./normal-hitfinish.wav', import.meta.url).href,
    'normal-hitclap': new URL('./normal-hitclap.wav', import.meta.url).href,

    // Soft Set
    'soft-hitnormal': new URL('./soft-hitnormal.wav', import.meta.url).href,
    'soft-hitwhistle': new URL('./soft-hitwhistle.wav', import.meta.url).href,
    'soft-hitfinish': new URL('./soft-hitfinish.wav', import.meta.url).href,
    'soft-hitclap': new URL('./soft-hitclap.wav', import.meta.url).href,

    // Drum Set
    'drum-hitnormal': new URL('./drum-hitnormal.wav', import.meta.url).href,
    'drum-hitwhistle': new URL('./drum-hitwhistle.wav', import.meta.url).href,
    'drum-hitfinish': new URL('./drum-hitfinish.wav', import.meta.url).href,
    'drum-hitclap': new URL('./drum-hitclap.wav', import.meta.url).href,
};

export type HitsoundKey = keyof typeof HITSOUND_FILES;