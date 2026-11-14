/**
 * Build-time neural voice generation (macOS validation tools required):
 * python3 -m pip install --target /private/tmp/butterfly-neural-tts -r scripts/voice-requirements.txt
 * PYTHONPATH=/private/tmp/butterfly-neural-tts node --import tsx scripts/generate-voices.ts
 * No user credentials, runtime speech requests, audio playback, or lossy re-encoding.
 * Generation uses edge-tts 7.3.1: https://github.com/rany2/edge-tts
 * The service/model can change; output checksums document this corpus, not bit-identical future synthesis.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync, existsSync, renameSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ids } from '../src/engine.js';
import { characterDialogue } from '../src/characterDialogue.js';
import { voiceCast, voiceAssetVersion } from '../src/voiceCast.js';

const staging = mkdtempSync(join(tmpdir(), 'butterfly-neural-build-'));
const corpus = join(staging, voiceAssetVersion);
const target = `public/audio/${voiceAssetVersion}`;
const rateFor = (key: string) => key === 'concern' ? '-5%' : key === 'unfulfilled' ? '-4%' : key === 'reassure' ? '-3%' : key === 'thanks' ? '+1%' : '+0%';
const plan = ids.flatMap(id => Object.entries(characterDialogue[id]).map(([key, text]) => ({ id, key, text, ...voiceCast[id], rate: rateFor(key) })));
if (plan.length !== 60 || ids.some(id => plan.filter(clip => clip.id === id).length !== 15)) throw new Error('Expected fifteen scripted lines for each of four citizens.');
mkdirSync(corpus, { recursive: true });
writeFileSync(join(staging, 'plan.json'), JSON.stringify(plan));

const clips: Record<string, unknown>[] = [];
try {
  execFileSync(process.env.VOICE_PYTHON || 'python3', ['scripts/render-neural-voices.py', join(staging, 'plan.json'), corpus], { stdio: 'inherit' });
  for (const item of plan) {
    const path = join(corpus, item.id, `${item.key}.mp3`);
    const decoded = join(staging, `${item.id}-${item.key}.wav`);
    const info = execFileSync('/usr/bin/afinfo', [path], { encoding: 'utf8' });
    const duration = Number(info.match(/estimated duration:\s*([\d.]+)/)?.[1]);
    if (!Number.isFinite(duration) || duration <= .3 || duration > 30 || statSync(path).size < 1024) throw new Error(`Invalid speech recording: ${item.id}/${item.key}`);
    execFileSync('/usr/bin/afconvert', [path, decoded, '-f', 'WAVE', '-d', 'LEI16']);
    const pcm = readFileSync(decoded);
    let offset = 12, samples = 0, squareSum = 0, peak = 0;
    while (offset + 8 <= pcm.length) {
      const name = pcm.toString('ascii', offset, offset + 4), length = pcm.readUInt32LE(offset + 4);
      if (name === 'data') {
        for (let p = offset + 8; p + 1 < Math.min(pcm.length, offset + 8 + length); p += 2) {
          const sample = pcm.readInt16LE(p);
          samples++; squareSum += sample * sample; peak = Math.max(peak, Math.abs(sample));
        }
        break;
      }
      offset += 8 + length + length % 2;
    }
    const rms = samples ? Math.sqrt(squareSum / samples) : 0;
    if (!samples || peak < 100 || rms < 15) throw new Error(`Silent or invalid speech recording: ${item.id}/${item.key}`);
    clips.push({ ...item, src: `/audio/${voiceAssetVersion}/${item.id}/${item.key}.mp3`, pitch: '+0Hz', volume: '+0%', durationSeconds: duration, bytes: statSync(path).size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), validation: { decodedPcmSamples: samples, peak, rms: Math.round(rms * 100) / 100 } });
  }
  const manifest = {
    version: voiceAssetVersion,
    format: 'MP3, 24 kHz, 48 kbit/s, mono (original service output; no lossy re-encoding)',
    generator: 'edge-tts 7.3.1',
    sourceUrl: 'https://github.com/rany2/edge-tts',
    provider: 'Microsoft Edge online text-to-speech',
    voiceFamily: 'Standard neural',
    source: 'src/characterDialogue.ts',
    castSource: 'src/voiceCast.ts',
    generatedAt: new Date().toISOString(),
    note: 'Synthetic prerecorded game dialogue. Voice locale was checked against the online catalog. Prosody varies gently using rate only; pitch and volume remain neutral. These are not HD voices or expressive-style SSML. Generation requires network access; game playback uses bundled files only.',
    clips,
  };
  const json = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(join(corpus, 'manifest.json'), json);
  // Validate the entire corpus before anything becomes an active game asset.
  mkdirSync('public/audio', { recursive: true });
  const publication = mkdtempSync('public/audio/.neural-publish-');
  const prepared = join(publication, voiceAssetVersion);
  cpSync(corpus, prepared, { recursive: true });
  const backup = join(publication, 'previous-version');
  const activeManifest = 'public/audio/manifest.json';
  const previousManifest = existsSync(activeManifest) ? readFileSync(activeManifest) : null;
  let movedPrevious = false, publishedNew = false;
  try {
    if (existsSync(target)) { renameSync(target, backup); movedPrevious = true; }
    renameSync(prepared, target); publishedNew = true;
    writeFileSync(join(publication, 'manifest.json'), json);
    renameSync(join(publication, 'manifest.json'), activeManifest);
  } catch (error) {
    if (publishedNew && existsSync(target)) rmSync(target, { recursive: true, force: true });
    if (movedPrevious && existsSync(backup)) renameSync(backup, target);
    if (previousManifest) writeFileSync(activeManifest, previousManifest);
    throw error;
  } finally { rmSync(publication, { recursive: true, force: true }); }
  console.log(`Published ${clips.length} validated neural MP3 clips. Existing legacy .m4a recordings were not modified.`);
} finally { rmSync(staging, { recursive: true, force: true }); }
