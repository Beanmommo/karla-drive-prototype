# Module stages and star ratings

The Home modules card opens a centred four-card stage carousel. Each card shows a centred icon, stage number, title, and stage star total. The carousel uses the full available screen width while cards grow to a maximum of 384 points. Lower-opacity neighbouring cards are fully visible when there is room, with partial previews at the screen edges on smaller displays. The selected card remains centred, including the first and last stages. Swipe, choose a page dot, or tap a neighbouring preview to centre a stage. Selecting the centred card opens that stage's modules; selecting a module opens its details and editable rating. Every stage is available without an unlock requirement.

The catalogue follows the agreed parent-supervisor grouping:

| Stage | Modules | Available stars |
| --- | --- | --- |
| 1 — Car control | Starting, steering & stopping; Mirrors & awareness; Communicating intentions; Starting on a slope; Basic reversing; Spotting & responding to hazards | 18 |
| 2 — Basic drives | Left & right turns; Intersections & stopping; Roundabouts; Speed & lane position; Space around the car; Reverse parallel parking; Three-point turns | 21 |
| 3 — Complex drives | Changing lanes; Gaps & merging; Different roads & conditions | 9 |
| 4 — Rehearsing solo | Everyday drives with less prompting; Managing attention & driving decisions | 6 |

Each module has one current supervisor rating. Stages 3 and 4 remind parents to revisit earlier skills in harder situations and with less prompting. These are not separate assessments of the same module in every stage.

## Ratings and totals

| Stars | Display description | Persisted status key |
| --- | --- | --- |
| 0 | Not yet practised | `not_performed` |
| 1 | Learning | `needs_practice` |
| 2 | Building consistency | `developing` |
| 3 | Consistent | `excellent` |

The star controls select 1, 2, or 3; the explicit 0 control resets the rating. A failed save restores the saved selection and shows an error. Stage totals sum the current ratings in that stage; the total on Home sums all 18 modules, out of 54. Lowering a rating lowers these totals. Unavailable ratings display a dash rather than implying zero progress.

Existing module IDs and persisted status keys remain compatible with previously saved assessments, cached data, and queued practice reviews. No assessment rows or timestamps are rewritten. The new modules begin at zero. Practice reviews use the same four choices; modules below three stars remain eligible for coaching tips when actual tip content is present.

## Database rollout

Apply `20260928000000_module_stages_and_stars.sql` before using the new app with a database. It extends the module and rating constraints and the practice-review RPC validation, retaining ownership checks, timestamp protection, and conflict handling.

For local development:

```sh
npx supabase migration up --local
npm test
npx supabase test db
npm run lint
npx tsc --noEmit
```

No native dependencies were added, so the existing development build can load these changes through Metro.
