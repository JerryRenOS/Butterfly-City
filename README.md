# Butterfly City

One decision. Two universes. A tiny interactive storybook civilization built with React, TypeScript, Vite, original SVG art, and a Node/Express Drex proxy.

## Civilization and game presentation

The village now uses four original humanoid paper adventurers with layered SVG faces, clothes, accessories, expressive poses, and idle/happy/shocked/angry/thinking/walking animation states. Larger buildings, a layered grass-and-earth platform, pantry, mushrooms, flags, butterflies, and interactive signs make the world feel alive.

Recorded successful gifts trigger pizza transfers; action reactions settle back into state-driven expressions. Low trust, morale, or stability cools the atmosphere and separates residents; high trust and morale with stable institutions warms the scene and brightens flowers. Public food determines pantry contents; private hunger affects expressions. These presentation thresholds do not modify the simulation. Profiles opened in either branch show that branch's actual state.

Rewriting reality adds a frozen-town transition, glowing original butterfly, rewind rings, light seam, and animated two-world reveal. Reduced-motion preferences disable decorative motion. Legacy saved choices are replayed under the new rules, with an explicit migration notice and old inference receipts cleared. New civic snapshots persist without replay.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend on port 3001. The backend binds to loopback; API credentials never enter browser code.

Without a key the game starts in visibly labeled **Demo Mode**, with deterministic personality-based choices. The game saves progress in localStorage. Use the top-right reset button to begin again.

## Enable real Drex decisions

```sh
cp .env.example .env
```

Set `NACE_API_KEY` in `.env` to your Nace API key, then restart `npm run dev`. Do not put a key in a VITE-prefixed variable. `.env` is gitignored. The default model is `drex-v2.0`; change `NACE_MODEL` if your account requires another compatible model.

A fresh game detects an available key and selects Live Mode. For an existing saved demo: reset the story, open **Powered by Drex**, and select **Live Drex** before dropping the pizza. Browser login to Nace is not an API key.

Each citizen now chooses among eight actions using personal wealth, persistent traits, directional trust, recent actions, public resources, and recent civic history. Civic outcomes are deterministic classifications after the round, not extra Drex predictions.

One POST to `https://console.nace.ai/v1/systemone` batches four named `choice` questions with a shared world snapshot. The actual returned choices drive consequences. The inspector shows response model, measured latency, evaluated decision count, and selected-choice probabilities when returned. Live errors are recoverable and never silently fall back to demo.

Verified request contract: https://console.nace.ai/docs/drex
Model catalog: https://console.nace.ai/docs/drex/reference/models

## A 60-second demo

1. Click Bob and meet the opportunist. Close his profile.
2. **Drop the last pizza**. Read the residents’ reactions and town journal.
3. **Next day**. Watch the civic headline, public pantry, treasury, trust, morale, and stability evolve.
4. **What if Bob chose differently?** Select another initial action.
5. **Rewrite reality**. See the butterfly transition and two worlds.
6. **Advance both worlds**. Compare actual state changes and subsequent decisions.

## Counterfactual rules

The exact pre-crisis snapshot and all four initial decisions are saved. Branching restores that snapshot twice and overrides **only Bob's initial action** in the alternate world. Both branches immediately receive one new independently evaluated decision round. Subsequent advances evaluate both branches separately, committing neither if either request fails.

Rules are identical and deterministic. Food budgets are fixed before each round; received gifts cannot be spent again that round. Each following day gives everyone the same 2 food from foraging. Each person eats 1 food; a full meal gives +4 mood, hunger gives −12.

- **Share:** give up to 3 private food equally to neighbors; recipients gain 6 mood and 14 trust; giver gains 5 mood, town gains 3 stability.
- **Hoard:** keep supplies; each neighbor loses 9 trust toward the hoarder; +3 mood if supplied, −2 stability.
- **Trade:** sell 1 food to the next resident for 1 coin if their reserved starting budget can pay. Both gain 7 mutual trust; seller gains 5 mood, town gains 2 stability.
- **Influence:** give 1 food to the next resident; recipient gains 12 trust, other neighbors lose 4 trust; giver gains 7 mood.
- **Cooperate:** contribute up to 2 food and 1 coin to public stores; a successful contribution adds 5 stability, 4 personal mood, and 6 trust from each neighbor.
- **Support:** give up to 2 food to the least-fed neighbors, splitting ties; recipients gain 10 mood and 12 trust; giver gains 5 mood, town gains 3 stability.
- **Ask:** public aid fills private food toward 3 (dinner plus a two-food reserve). Supplies are fairly split between requesters; new pantry contributions are available immediately. Successful aid adds 6 mood and 1 stability.
- **Suspicion:** lose 10 trust in each neighbor, and each loses 5 trust in the speaker; −3 personal mood, −4 stability.

Private food and wealth are nonnegative. Mood, directional trust, and stability range 0–100. Incoming private gifts or trade income cannot be spent again in that round. Cooperation tax is reserved before trade. Each hungry citizen costs 4 stability after dinner. On later days, the treasury gives equal grants of up to 1 coin to hungry citizens with less than 1 private coin, limited by available public funds. Each recipient adds 1 stability; grants become spendable next round. No money is created.

The town starts with an empty public pantry and 4 treasury coins; everyone owns 3 private coins. Shared stores are distinct from private supplies. Town trust and morale are derived means; stability persists. Citizens retain fixed personality traits, roles, and their last six actions. Full decision history and structured consequence records persist for both timelines.

Each day receives exactly one civic outcome, in priority order: **Food Panic** (3+ hungry), **Suspicion Wave** (2+ rumor-spreaders or trust below 30), **Divided Town** (competing hoarding/cooperation, trust below 45, or stability below 35), **Trade Boom** (2+ successful trades), **Community Aid Chain** (2+ successful aid actions), **Cooperative Village** (2+ successful cooperative acts and nobody hungry), otherwise **Uneasy Peace**. The headline explains the actual conditions.

The divergence count compares 27 independent values: four private food, four private wealth, four mood, twelve directed trust, public food, treasury, and stability. Town averages are not double-counted. Ripple chains use recorded Bob effects, actual trust deltas, later observed cooperation counts, and civic outcomes. They do not invent motives or claim that every later choice was caused by a specific relationship change. This is a simulated counterfactual, not a real-world causal prediction.

## Validate and serve a production build

```sh
npm test
npm run build
npm start
```

After building, `npm start` serves the game and API at http://localhost:3001.

With the dev server running, `npm run test:smoke` checks the page, proxy, crisis, next day, two-branch civilization evolution, validation, and missing-key error behavior. If a key is configured, it also makes one real four-citizen Drex request and reports the returned model.

The tests cover immutable deterministic rounds, one-action branching, food/wealth conservation, fair scarce public aid, treasury grants, reserved trade/cooperation budgets, all seven civic outcomes, successful-vs-failed cooperation, clamped effect records, save migration, and the documented eight-option Drex response shape. No real live response has been verified without an API key. Browser visual/interaction QA was unavailable in the build environment because the browser-control host was offline.

Fonts load from Google Fonts with local serif/sans-serif fallbacks. All village and character artwork is original inline SVG. No image APIs, database, or external asset packs are required.
