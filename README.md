# Butterfly City

One decision. Two universes. A tiny interactive storybook civilization built with React, TypeScript, Vite, original SVG art, and a Node/Express Drex proxy.

## V2 game presentation

The village now uses four original humanoid paper adventurers with layered SVG faces, clothes, accessories, expressive poses, and idle/happy/shocked/angry/thinking/walking animation states. Larger buildings, a layered grass-and-earth platform, pantry, mushrooms, flags, butterflies, and interactive signs make the world feel alive.

Recorded successful gifts trigger pizza transfers; action reactions settle back into state-driven expressions. Trust below 45 cools the atmosphere and separates residents; trust at or above 55 warms the scene and brightens flowers. Food determines pantry contents and concerned expressions. These presentation thresholds do not modify the simulation. Profiles opened in either branch show that branch's actual state.

Rewriting reality adds a frozen-town transition, glowing original butterfly, rewind rings, light seam, and animated two-world reveal. Reduced-motion preferences disable decorative motion. Progress saved by V1 remains compatible.

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

One POST to `https://console.nace.ai/v1/systemone` batches four named `choice` questions with a shared world snapshot. The actual returned choices drive consequences. The inspector shows response model, measured latency, evaluated decision count, and selected-choice probabilities when returned. Live errors are recoverable and never silently fall back to demo.

Verified request contract: https://console.nace.ai/docs/drex
Model catalog: https://console.nace.ai/docs/drex/reference/models

## A 60-second demo

1. Click Bob and meet the opportunist. Close his profile.
2. **Drop the last pizza**. Read the residents’ reactions and town journal.
3. **Next day**. Watch food, trust, mood, and choices evolve.
4. **What if Bob chose differently?** Select another initial action.
5. **Rewrite reality**. See the butterfly transition and two worlds.
6. **Advance both worlds**. Compare actual state changes and subsequent decisions.

## Counterfactual rules

The exact pre-crisis snapshot and all four initial decisions are saved. Branching restores that snapshot twice and overrides **only Bob's initial action** in the alternate world. Both branches immediately receive one new independently evaluated decision round. Subsequent advances evaluate both branches separately, committing neither if either request fails.

Rules are identical and deterministic. Food budgets are fixed before each round; received gifts cannot be spent again that round. Each following day gives everyone the same 2 food from foraging. Each person eats 1 food; a full meal gives +4 mood, hunger gives −12.

- **Share:** give up to 3 food equally; recipients gain 6 mood and 14 trust toward the giver; giver gains 5 mood.
- **Hoard:** keep supplies; each neighbor loses 9 trust toward the hoarder; having supplies gives +3 mood.
- **Trade:** give 1 food to the next resident for goodwill; both gain 7 mutual trust; giver gains 5 mood.
- **Influence:** give 1 food to the next resident; recipient gains 12 trust, other neighbors lose 4 trust toward the giver; giver gains 7 mood.

Food, mood, and trust are bounded to 0–100. Trust is directional. Displayed trust and mood are town averages. The divergence count compares 4 food values, 4 mood values, and 12 directed trust values; it is not an invented probability. Convergence is shown honestly. This is a simulated counterfactual, not a real-world causal prediction.

## Validate and serve a production build

```sh
npm test
npm run build
npm start
```

After building, `npm start` serves the game and API at http://localhost:3001.

With the dev server running, `npm run test:smoke` checks the page, proxy, crisis, next day, two-branch evolution, validation, and missing-key error behavior.

The tests cover immutable deterministic rounds, one-action branching, resource bounds, simultaneous budgets, and the actual documented Drex response shape. No real live response has been verified without an API key. Browser visual/interaction QA was unavailable in the build environment because the browser-control host was offline.

Fonts load from Google Fonts with local serif/sans-serif fallbacks. All village and character artwork is original inline SVG. No image APIs, database, or external asset packs are required.
