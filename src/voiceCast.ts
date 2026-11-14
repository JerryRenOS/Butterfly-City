import type { Id } from './engine';

/** Shared by the asset generator and the game; standard neural voices, not HD voices. */
export const voiceCast: Record<Id, { accent: string; locale: string; voice: string }> = {
  bob: { accent: 'British', locale: 'en-GB', voice: 'en-GB-RyanNeural' },
  alice: { accent: 'British', locale: 'en-GB', voice: 'en-GB-SoniaNeural' },
  kevin: { accent: 'Indian', locale: 'en-IN', voice: 'en-IN-PrabhatNeural' },
  mia: { accent: 'Indian', locale: 'en-IN', voice: 'en-IN-NeerjaNeural' },
};

export const voiceAssetVersion = 'neural-v1';
