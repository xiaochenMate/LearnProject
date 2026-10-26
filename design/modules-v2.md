# ExBeam Module Workspaces V2

## Shared Visual And Interaction Contract

- Graphite work surfaces, restrained mint/cyan/coral subject accents, zero letter spacing, thin borders and radii no larger than 8px.
- `ModuleWorkbench` supplies the compact title/tool area, independently scrolling content and persistent storage/status strip. The site header owns navigation, bookmarking, fullscreen and the exploration journal.
- Native labeled selects, numeric fields, sliders and checkboxes configure real state. Lucide icon buttons expose accessible names and tooltips.
- Game boards use stable grid tracks or aspect ratios. Questions, results and reading content are the primary screen, not promotional feature descriptions.
- 26 original local SVG piece assets: 14 Xiangqi engravings and 12 international chess silhouettes. `scripts/build-board-art.mjs` regenerates them; no external image host is required for a chess match.

## Module Inventory

| ID | Workspace | Product Surface |
| --- | --- | --- |
| ent5 | Chinese Chess | Engine-validated moves, local/computer play, three bounded search levels, legal targets, clocks, undo, flip, ten training tasks, piece atlas, full replay, JSON/PGN export and validated import |
| ent6 | International Chess | chess.js legality, four selectable promotions, castling/en passant, clocks and termination, replay, PGN import/export, local/computer play and local piece art |
| ent4 | Gomoku | Local/computer play, difficulty, legal empty-point placement, win/draw detection, clocks, undo, review and recovery |
| ent7 | Go | 9/13/19 boards, Sabaki-backed capture/suicide rules, ko and positional superko, pass/end/scoring flow, group dead-stone review, area scoring with komi and saved matches |
| e3 | Wave Lab | Two-source interference, precise parameter controls and presets, temporal/spatial views, measured task results, notes, actual CSV/SVG exports |
| e2 | Ecology | Habitat-constrained food chains, trophic energy budget, disruption experiments, saved experiments and actual data/chart exports |
| u1 | Art Studio | Touch/pen/mouse drawing, brush/marker/eraser/shape/picker tools, layers, opacity, undo/redo, project save/import and image export |
| e4 | Character Workshop | Component composition, local character dictionary, answer checking and wrong-answer practice |
| e5 | Poetry | Searchable local readings, interpretation, collection, notes, several real exercise types and due-date review |
| e6 | History | Period-specific ordering, exact/approximate dates, explanation, mobile move controls and error review |
| e7 | Time Lab | Clock hand control, numerical time input, 12/24-hour representation, reading/setting challenges and review |
| e18 | Mental Arithmetic | Adjustable range/operations/duration, correct answer validation, pause/resume, deadlines, results and finite wrong-answer retry |
| e20 | Three Character Classic | Curated annotated readings, original text access, notes/collection and exercises with no fabricated mastery |
| e21 | Thousand Character Classic | Curated annotated readings, original text access, notes/collection and exercises with no fabricated mastery |
| ent3 | Reasoning | Local puzzles, answer-first explanations, bookmarks, hints and review |
| u2 | Vocabulary | Local definitions/examples, search, pronunciation capability detection, tests and wrong-word review |
| u3 | Idioms | Local definitions, pinyin and contextual examples, collection, notes, varied exercises and review |
| u4 | Currency | Dated reference rates, explicit provider/cache state, fees, saved quotes and CSV export; not a trading quote |
| ent8 | Jiangnan | Existing full-bleed 3D campaign, upgraded HUD and controls, local checkpoints, paused lifecycle and verified iframe-ready handshake |

## Scientific And Game Boundaries

- The Xiangqi rules implementation is `@weshell/xiangqi.js`; the computer player is a bounded local search, not a rated engine. Training mating tasks are checked by the same engine.
- International chess uses the existing `chess.js` library. Go uses `@sabaki/go-board`; area scoring still requires players to agree on dead groups and termination.
- Simulation labels distinguish simplified models from measured facts. Self-assessment, revealing an answer, visiting a page and independent successful attempts are not interchangeable evidence.
- Speech and audio depend on browser/device capabilities and user permission. An unavailable audio device must never prevent reading or playing.

## Data And Release Boundaries

- New module sessions are local to this browser. Existing legacy keys are retained for migration; do not claim account sync or cross-device recovery for these workspaces.
- Chess/experiment/art exports contain actual state, moves, pixels or measured samples rather than placeholder reports. The global journal backup is not a complete backup of every module's storage or binary artwork.
- The family garden keeps its separate existing sync. This upgrade does not change billing, identity, database privileges or the production deployment.
- Production release still requires deployment/environment checks, account/data policy decisions, dependency security maintenance and affected-device performance checks. Passing a local UI test is not an online release.

## Verification Entry Points

- `npm run test:explorer`: catalog/storage, shared state, rules, question generation, evaluation, scientific calculations, import/export and recovery checks.
- `tests/explorer/modules-browser.mjs`: desktop/mobile module inventory, assets, overflow and canvas dimensions.
- `tests/explorer/xiangqi-browser.mjs`: real computer reply, full-turn undo, local touch moves, saved/replayed match, downloads, invalid import, mating exercise and all 14 Xiangqi designs.
- Category-specific browser checks and Jiangnan campaign tests live next to their corresponding unit suites.
- The astronomy work remains a separate verified system; unchanged astronomy journeys need not be repeated for text-only or board-only changes.

## Integration Acceptance (2026-10-26)

- Final Explorer logic suite: 92 passed, 0 failed, 1 optional browser entry skipped. The separate cultural browser journeys were actually run by the culture owner; the skipped entry is not counted as a pass.
- Jiangnan rules, checkpoint and bridge suite: 28 passed. Its [dedicated verification record](../tests/jiangnan/VERIFICATION.md) separates rendered 3D pixels, movement and simulated multitouch from accelerated chapter-condition checks.
- Eighteen non-3D workspaces were inspected at 1440px and 390px widths for layout, decoded images, canvas dimensions and runtime errors. A transient Gomoku reload was checked again successfully; this inventory is not a substitute for behavioral tests.
- Xiangqi browser acceptance includes real worker replies, full-turn undo, replay, saved matches, valid downloads, rejected imports, a mating exercise, all 14 decoded piece images and a phone-sized touch move.
- Six practice workspaces completed 118 browser assertions across actual answers, wrong-answer review, pause/resume, bookmarks and reload restoration. Culture and science/art owners separately verified their real reading, exercise, drawing and export workflows.
- Go currently supports local two-player matches only. Complete selected originals are available for the two classics, but full-text pinyin and annotations remain incomplete; selected annotated lessons are labeled separately.
- No production release or GitHub push is part of this delivery. Real iOS/Safari hardware performance, long sessions, account-scoped cloud synchronization and dependency security remediation remain release gates. The current audit reports 11 dependency advisories (6 high, 4 moderate, 1 low); no forced major-version upgrade was applied during this UI and behavior change.
