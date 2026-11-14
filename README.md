# Butterfly City

One decision. Two universes. A tiny interactive storybook civilization built with React, TypeScript, Vite, original painted art, and a Node/Express Drex proxy.

## Painted-world presentation

The visual remake uses an original cinematic hand-painted village and four matching painted villagers. The local art is inspired by warm, detailed Japanese animated films, with natural proportions, subtle movement, sunlight, drifting motes, and gently animated butterflies. No image-generation service is called at runtime.

Each new round plays a cancellable visit → supply exchange → funded repair work → return sequence. Activities wait for citizens to arrive; voiced conversations can briefly hold the sequence while a pair meets. Sharing draws citizens into the square; support and trading bring them toward neighbors; contributions and aid send them to civic stores. Successful effects drive resource tokens, pantry stock, treasury pulses, and market light. Empty or failed contributions never invent successful transfers. Civic trust/stability affect social spacing and the decorative garden. Smoke, moving light, foliage, and butterflies provide ambient movement.

“Replay day” repeats only the presentation: no simulation mutation, resource spending, or extra Drex requests. Starting another round cancels the previous sequence cleanly. Reduced-motion preferences skip travel/effects. Characters turn before stepping, accelerate and brake, follow curved ground routes, and pass around neighbors with personal-space avoidance. Four alternating walk poses advance with distance traveled, so the gait stops when the feet stop. Ground depth controls scale and draw order. Talking, listening, giving, working, and worried poses add gestures and subtle posture changes. These are layered 2D sprite animations, not a 3D skeletal rig or phoneme lip sync.

The landscape now animates the painted pixels themselves with a small WebGL renderer: overhead foliage, ivy, foreground flower beds, two fabric awnings, cloud texture, and passing light move independently while the stone buildings and square stay anchored. Wind is stronger during a disaster; a gentle breeze continues on recovery days without advancing the simulation. Rain, spiraling debris, flowing flood currents, floating debris, and blowing snow sit in separate visual layers.

The header’s **Living scenery / Play scenery** control pauses or resumes the scene and saves that preference. OS reduced motion is respected by default; an explicit Play scenery click opts this app into movement. Hidden or offscreen canvases suspend work. Drawing is capped at 30 fps with a bounded resolution; unsupported WebGL retains the original image and CSS scenery effects.

The public pantry selects an empty or stocked village painting. Trust, morale, and stability change atmospheric color; actual recorded transfers animate food and coins. Reaction poses and dialogue remain state-driven, while the generated character faces are fixed illustrations. Profiles opened in either branch show that branch's actual state.

The primary action bar stays fixed at the bottom of the viewport. Desktop scene height adapts to viewport height; narrow screens stack the worlds. Secondary ripple explanations, character profiles, and journals use expandable sections. The timeline transition and reduced-motion preferences are preserved.

Artwork was made with the built-in image-generation tool and saved in `public/art/`:

- `village-painted.png` — 1672×941 stocked village. [Exact prompt](public/art/village-prompt.txt).
- `village-empty.png` — 1671×941 matching empty-pantry variant. [Exact edit prompt](public/art/village-empty-prompt.txt).
- `citizens-painted.png` — 1774×887 transparent four-character atlas for portraits. [Exact prompt](public/art/citizens-prompt.txt).
- `{bob,alice,kevin,mia}-animation.png` — four 1254×1254 transparent pose sheets, each a 4-column × 3-row grid: four orientations, four walking frames, and four social/work gestures. Matching `.prompt.txt` files record the generation prompts.

Saved worlds now use schema version 3. Older campaigns replay their recorded choices as a tornado recovery story, with an explicit migration notice, recalculated resources/outcomes, and old inference receipts cleared. Current disaster saves preserve their scenario, damage, history, and timelines. Reset to choose a different disaster.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend on port 3001. The backend listens on `0.0.0.0` (override with `HOST`); API credentials never enter browser code.

Without a key the game starts in visibly labeled **Demo Mode**, with deterministic personality-based choices. The game saves progress in localStorage. Use the top-right reset button to begin again.

## Railway deployment

Play: [Butterfly City](https://butterfly-city-production.up.railway.app). Manage the dedicated [Railway project](https://railway.com/project/15e55f2c-3f86-4a90-8dc2-693dd3d38656).

The `develop` branch is the production deployment branch. `railway.json` pins the build, startup command, readiness check, and crash restart policy. Railway builds run the simulation tests, TypeScript check, Vite build, and rendering checks before release. GitHub Actions also exercises the built production server and branching API on pushes and pull requests.

Use Node 22. Railway supplies `PORT`; the server listens on all interfaces. Set `NODE_ENV=production` in the service variables. The frontend and `/api` share one service and origin. Art and prerecorded neural speech ship with the build; deployment does not generate images or voices. No database or volume is required.

Without `NACE_API_KEY`, the hosted release uses Demo Mode and Live requests return an explicit unavailable response. Keep any future key in Railway service variables, never frontend variables or Git. Before enabling paid Live inference for anonymous visitors, add access controls and request limits. Saves belong to each browser and origin, so localhost saves do not automatically appear on the public domain.

After deploying, run `SMOKE_URL=https://YOUR-DOMAIN npm run test:smoke` to exercise all three disasters, independent timelines, API validation, and artwork delivery. This smoke test makes one real inference request if a Live key is configured. Railway's `/api/status` check gates each release; it is not continuous uptime monitoring. To roll back, redeploy a previous successful deployment in Railway and revert the source change before the next push.

## Enable real Drex decisions

```sh
cp .env.example .env
```

Set `NACE_API_KEY` in `.env` to your Nace API key, then restart `npm run dev`. Do not put a key in a VITE-prefixed variable. `.env` is gitignored. The default model is `drex-v2.0`; change `NACE_MODEL` if your account requires another compatible model.

A fresh game detects an available key and selects Live Mode. For an existing saved demo: reset the story, open **Powered by Drex**, and select **Live Drex** before responding to the disaster. Browser login to Nace is not an API key.

Each citizen now chooses among eight actions using the current disaster, damage, next-round weather and gathering forecast, personal wealth, persistent traits, directional trust, recent actions, public resources, and recent civic history. Civic outcomes are deterministic classifications after the round, not extra Drex predictions.

One POST to `https://console.nace.ai/v1/systemone` batches four named `choice` questions with a shared world snapshot. The actual returned choices drive consequences. The inspector shows response model, measured latency, evaluated decision count, and selected-choice probabilities when returned. Live errors are recoverable and never silently fall back to demo.

Verified request contract: https://console.nace.ai/docs/drex
Model catalog: https://console.nace.ai/docs/drex/reference/models

## A 60-second demo

1. Click Bob and meet the opportunist. Close his profile.
2. Choose **Tornado**, **Tsunami**, or **Snowstorm**, then **Respond to disaster**. Read the residents’ reactions and town journal.
3. **Next day**. Watch the civic headline, public pantry, treasury, trust, morale, and stability evolve.
4. **What if Bob chose differently?** Select another initial action.
5. **Rewrite reality**. See the butterfly transition and two worlds.
6. **Advance both worlds**. Compare actual state changes and subsequent decisions.

## Character voices

All four citizens now use prerecorded neural speech in British or Indian English. Conversational scripts and restrained pacing changes replace the older operating-system voices:

| Citizen | Accent | Recorded voice |
| --- | --- | --- |
| Bob | British English | Ryan Neural (`en-GB`) |
| Alice | British English | Sonia Neural (`en-GB`) |
| Kevin | Indian English | Prabhat Neural (`en-IN`) |
| Mia | Indian English | Neerja Neural (`en-IN`) |

Click a resident to hear their introduction or current action. **Hear neighbors** plays four two-way exchanges, with each citizen followed by a neighbor’s reply; profiles also have individual replay buttons. After a day advances, the chosen timeline is narrated automatically if voices are enabled. In split view, each world has its own Hear neighbors control; one shared queue prevents overlapping voices and remembers the most recently selected world for the next day.

The header voice button mutes speech and saves the preference. Stop dialogue cancels the current queue. Ordinary profile clicks respect mute; an explicit Hear/Replay click enables voices. Loading a saved game never starts audio by itself. Hidden tabs, scenario changes, and resets stop playback. If a browser blocks playback, the app asks for a deliberate Hear/Replay click. Speaking highlights follow actual audio playback, and captions remain available with sound off.

The 60 local MP3 clips cover each resident's introduction, eight actions, a failed-action line, and five conversational replies. Successful transfers address an actual recipient; gratitude requires a recorded transfer, and failed actions receive a response that does not invent success. Both people approach stable meeting positions and face each other while bystanders step back to leave a clear view. Once the group has arrived, the scene releases that exact audio turn. The speaker gestures while the listener reacts; replies exchange their roles without swapping positions. Stopping, muting, or replacing a queue invalidates pending arrivals. Captions and audio scripts share `src/characterDialogue.ts`; `public/audio/manifest.json` records exact scripts, accent/voice provenance, durations, and checksums. Playback uses the bundled recordings, with no runtime speech service or regional browser voice dependency. These are fixed game lines, not generated Drex speech. The versioned `/audio/neural-v1/` paths prevent browsers from reusing the old voice recordings.

Rendering uses Microsoft Edge online neural voices through the [edge-tts client](https://github.com/rany2/edge-tts); [Microsoft documents the voice locales](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts). This is a generation-time tool, not an Azure Speech API integration. The generator stages and validates the complete corpus before publishing it, keeps the MP3 output without a second lossy encode, and records exact voice, delivery settings, durations, and file hashes.

To regenerate on macOS (Python 3, network access, and the built-in `afinfo`/`afconvert` tools):

```sh
python3 -m pip install --target /private/tmp/butterfly-neural-tts -r scripts/voice-requirements.txt
PYTHONPATH=/private/tmp/butterfly-neural-tts node --import tsx scripts/generate-voices.ts
```

The client is pinned to `edge-tts==7.3.1`; the online voice models can evolve, so the saved recordings and checksums preserve this rendered version.

## Natural disasters and recovery

Pick one scenario before the first round. Bob begins with eight rescued food supplies; the others need to find help. There are no injuries or deaths in this small social simulation.

| Scenario | Initial damage | Additional damage on days 1–3 | Gathering per person during active weather (after day 1) |
| --- | --- | --- | --- |
| Tornado | 56 | 18, 8, 0 | 1 |
| Tsunami | 70 | 24, 12, 0 | 0.5 |
| Snowstorm | 42 | 10, 16, 10 | 0.5 |

The first round has no gathering. Weather reduces stability by `ceil(intensity / 6)` and adds damage, capped at 100. After the weather clears, damaged routes (50+ damage) allow only 1 food per person; reopening routes restores 2. Weather follows the same calendar in both timelines, while repair choices change each world's access.

After dinner and emergency grants, every **successful cooperate** action can fund up to 1 public coin of repair. Each coin removes 8 damage; spending is capped by available treasury funds and remaining damage. Private donations transfer money; repairs consume it. A failed contribution or an empty treasury cannot repair anything. Damage does not heal merely because an animation plays.

Disasters now use two procedural Canvas2D depth planes over the painted village. Tornadoes have a shaded, noise-textured rotating column, orbiting debris, a ground dust skirt, and wind-driven rain. Tsunamis send successive turbulent surge fronts through deeper moving water, with spray, broken foam, floating debris, and a restrained foreground wash. Blizzards use dense snowfall at multiple depths, blowing mist, irregular snowbanks, and snow settling onto the painted roof/ground textures. The foreground veil never intercepts citizen or HUD clicks.

Storm strength follows the existing shared calendar; repairs reduce lingering debris, flood depth, and snow coverage in each timeline. These effects visualize the existing simulation; they do not add damage or alter its rules. Citizens who actually fund repairs still move to the corresponding work site. Pause freezes both weather planes; reduced motion shows a static storm. Hidden/offscreen weather suspends drawing, rendering is capped at 30 fps and a bounded pixel resolution, and the existing SVG/CSS effects remain as a Canvas2D fallback.

## Counterfactual rules

The exact pre-crisis snapshot and all four initial decisions are saved. Branching restores that snapshot twice and overrides **only Bob's initial action** in the alternate world. Both branches immediately receive one new independently evaluated decision round. Subsequent advances evaluate both branches separately, committing neither if either request fails.

Rules are identical and deterministic. Food budgets are fixed before each round; received gifts cannot be spent again that round. Gathering follows the selected disaster and the town’s recovery; the four residents within a world always receive equal amounts. Each person eats 1 food; a full meal gives +4 mood, hunger gives −12.

- **Share:** give up to 3 private food equally to neighbors; recipients gain 6 mood and 14 trust; giver gains 5 mood, town gains 3 stability.
- **Hoard:** keep supplies; each neighbor loses 9 trust toward the hoarder; +3 mood if supplied, −2 stability.
- **Trade:** sell 1 food to the next resident for 1 coin if their reserved starting budget can pay. Both gain 7 mutual trust; seller gains 5 mood, town gains 2 stability.
- **Influence:** give 1 food to the next resident; recipient gains 12 trust, other neighbors lose 4 trust; giver gains 7 mood.
- **Cooperate / Supply & rebuild:** contribute up to 2 food and 1 coin to public stores; a successful contribution adds 5 stability, 4 personal mood, and 6 trust from each neighbor. It also organizes a repair crew, subject to actual public funding after emergency grants.
- **Support:** give up to 2 food to the least-fed neighbors, splitting ties; recipients gain 10 mood and 12 trust; giver gains 5 mood, town gains 3 stability.
- **Ask:** public aid fills private food toward 3 (dinner plus a two-food reserve). Supplies are fairly split between requesters; new pantry contributions are available immediately. Successful aid adds 6 mood and 1 stability.
- **Suspicion:** lose 10 trust in each neighbor, and each loses 5 trust in the speaker; −3 personal mood, −4 stability.

Private food and wealth are nonnegative. Mood, directional trust, and stability range 0–100. Incoming private gifts or trade income cannot be spent again in that round. Cooperation tax is reserved before trade. Each hungry citizen costs 4 stability after dinner. On later days, the treasury gives equal grants of up to 1 coin to hungry citizens with less than 1 private coin, limited by available public funds. Each recipient adds 1 stability; grants become spendable next round. No money is created.

The town starts with an empty public pantry and 4 treasury coins; everyone owns 3 private coins. Shared stores are distinct from private supplies. Town trust and morale are derived means; stability persists. Citizens retain fixed personality traits, roles, and their last six actions. Full decision history and structured consequence records persist for both timelines.

Each day receives exactly one civic outcome, in priority order: **Food Panic** (3+ hungry), **Suspicion Wave** (2+ rumor-spreaders or trust below 30), **Divided Town** (competing hoarding/cooperation, trust below 45, or stability below 35), **Trade Boom** (2+ successful trades), **Community Aid Chain** (2+ successful aid actions), **Cooperative Village** (2+ successful cooperative acts and nobody hungry), otherwise **Uneasy Peace**. The headline explains the actual conditions.

The divergence count compares 28 independent values: four private food, four private wealth, four mood, twelve directed trust, public food, treasury, stability, and village damage. Town averages are not double-counted. Ripple chains use recorded Bob effects, actual trust deltas, later observed cooperation counts, funded repairs, and civic outcomes. They do not invent motives or claim that every later choice was caused by a specific relationship change. This is a simulated counterfactual, not a real-world causal prediction.

## Validate and serve a production build

```sh
npm test
npm run build
npm start
```

After building, `npm start` serves the game and API at http://localhost:3001.

`npm run test:render` verifies server-rendered scenario choices, disaster scenery, initial and saved split scenes, character controls, the action bar, and expandable details. It is not a browser layout test.

With the dev server running, `npm run test:smoke` checks the page, proxy, crisis, next day, two-branch civilization evolution, validation, and missing-key error behavior. If a key is configured, it also makes one real four-citizen Drex request and reports the returned model.

The tests cover immutable deterministic rounds, one-action branching, food/wealth accounting, three distinct weather calendars, persistent damage, funded repairs, reopened routes, disaster save migration, fair scarce public aid, treasury grants, reserved trade/cooperation budgets, all seven civic outcomes, successful-vs-failed cooperation, clamped effect records, save migration, and the documented eight-option Drex response shape. No real live response has been verified without an API key. Scenery was verified in an isolated headless Chromium browser: clear-day canvas pixels change between frames, pause freezes them, reduced motion defaults to static, explicit Play resumes, and both split timelines render. Desktop/mobile viewport checks also cover the fixed controls and recovery HUD.

Fonts load from Google Fonts with local serif/sans-serif fallbacks. The village and character illustrations are original generated local PNG assets; butterflies and transfer effects are SVG/CSS. No runtime image APIs, database, or external asset packs are required.

Locomotion tests cover turn-before-step, distance-driven gait, bounded routes, collision avoidance, crowded destinations, retargeting, reciprocal facing, reduced motion, and immutable inputs. Browser checks verify eight sequential conversation turns with both participants arrived and facing before audio, one active voice, cancellation/mute, desktop and mobile split views, visible speakers, clickable civic controls, and arrival-gated repair work that returns everyone home.
