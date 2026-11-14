/** Run on macOS: node --import tsx scripts/generate-voices.ts. No audio is played aloud. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ids } from '../src/engine.js';
import { characterDialogue, voiceProfiles } from '../src/characterDialogue.js';

const folder = mkdtempSync(join(tmpdir(), 'butterfly-voices-'));
const rates = { bob: 165, alice: 170, kevin: 165, mia: 175 };
const clips: Record<string, unknown>[] = [];
try {
  for (const id of ids) {
    const profile = voiceProfiles[id];
    mkdirSync(`public/audio/${id}`, { recursive: true });
    for (const [key, text] of Object.entries(characterDialogue[id])) {
      const aiff = join(folder, `${id}-${key}.aiff`);
      const decoded = join(folder, `${id}-${key}.wav`);
      const target = `public/audio/${id}/${key}.m4a`;
      execFileSync('/usr/bin/say', ['-v', profile.voice, '-r', String(rates[id]), '-o', aiff, '--', text]);
      execFileSync('/usr/bin/afconvert', [aiff, target, '-f', 'm4af', '-d', 'aac ', '-b', '64000', '-q', '127']);
      const info = execFileSync('/usr/bin/afinfo', [target], { encoding: 'utf8' });
      const duration = Number(info.match(/estimated duration:\s*([\d.]+)/)?.[1]);
      if (!Number.isFinite(duration) || duration <= .3 || statSync(target).size < 1024) throw new Error(`Invalid generated audio: ${target}`);
      execFileSync('/usr/bin/afconvert', [target, decoded, '-f', 'WAVE', '-d', 'LEI16']);
      const bytes = readFileSync(decoded);
      let offset = 12, audible = false;
      while (offset + 8 <= bytes.length) {
        const name = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
        if (name === 'data') {
          for (let p = offset + 8; p + 1 < Math.min(bytes.length, offset + 8 + length); p += 2) {
            if (Math.abs(bytes.readInt16LE(p)) > 100) { audible = true; break; }
          }
          break;
        }
        offset += 8 + length + length % 2;
      }
      if (!audible) throw new Error(`Generated audio is silent: ${target}`);
      clips.push({ id, key, text, src: `/audio/${id}/${key}.m4a`, ...profile, rate: rates[id], durationSeconds: duration, bytes: statSync(target).size, sha256: createHash('sha256').update(readFileSync(target)).digest('hex') });
      process.stdout.write(`${id}/${key}: ${duration.toFixed(2)}s\n`);
    }
  }
  writeFileSync('public/audio/manifest.json', JSON.stringify({
    format: 'AAC in MPEG-4 (.m4a)',
    generator: 'macOS say; afconvert AAC encoder',
    source: 'src/characterDialogue.ts',
    note: 'Synthetic prerecorded game dialogue. Voice names and locales identify the installed voices used during generation; playback requires no speech service or browser voice installation.',
    clips,
  }, null, 2) + '\n');
  console.log(`Validated ${clips.length} non-silent decodable clips.`);
} finally { rmSync(folder, { recursive: true, force: true }); }
