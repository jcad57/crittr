# Mobile design refresh

The six-screen website design exploration is now applied to the native app through its existing components and theme. This is an enhancement of the current app, preserving its routes, data access, permissions, and actions.

## Visual changes

- Bundled static Fredoka heading faces and Nunito body faces, generated from the website fonts. OFL licenses are included beside the font files. Older Instrument Sans aliases also resolve to Nunito, so existing forms match without a separate screen rewrite.
- Website orange `#FD8A2D`, cream `#FAF7F1`, peach `#FFE5D5`, sage `#E6ECD7`, and lavender `#ECE1F5`.
- Pet cards use the mockup’s species/arrow row, photo beside the name and breed/age, role badge, and microchip/care-team footer. Owner cards use the actual accepted care-team membership count, including the owner. Shared cards show Shared care because existing permissions only reveal the current co-carer’s membership. Memorial styling is preserved.
- Pastel profile stat tiles, neutral rounded activity and health records, a peach calendar, and a highlighted bottom navigation destination.
- Dashboard progress uses slate blue, plum, olive, and terracotta on one warm ivory track; activity-category colors elsewhere retain their existing meaning.
- Existing orange button press behavior is retained.
- CrittrAI shows a text-only lavender welcome card for a fresh conversation.

There are no decorative marks beside screen titles, no new header or footer taglines, no extra pets-list promotion card, no additional co-carer promotion, and no profile tabs. The pet profile remains one continuous page with all existing sections, edit controls, records, and management links. Dashboard activity **See all** still opens that pet’s activity history.

## Dashboard completion state

The progress container starts peach. It turns green only when every item in the active pet’s nonempty schedule for today is checked off. Empty or loading schedules, another pet, or a different date never produce a completed card. Unchecking a task returns the container to peach.

The individual rings continue to show their actual daily goal counts. Categories with no configured goal are rendered at 42% opacity, with an accessibility label explaining that the category is not tracked. Non-applicable categories do not receive the all-goals-complete ring treatment.

## Activity entry

Dashboard Log an activity / Log another activity opens an animated, species-aware bottom sheet using the existing activity picker and icons. Choosing a type dismisses the sheet before entering the current logging flow with that type and pet selected. The existing scheduled-task matching prompt, validation, multi-pet logging, and save behavior remain in that flow. Direct weigh-in entry is preserved. Dismissing the sheet does not start a flow. Reduced motion and the device safe area are respected.

## Schedule date audit

Past days previously read materialized schedule rows but could omit actual activities logged outside those slots. The schedule now also reads the selected past date’s existing activity-history query. It displays unlinked logs without inventing old planned tasks or writing reconstructed history. Activity IDs already represented by saved schedule entries are excluded, and pet/date boundaries are checked before display.

Selecting a date updates both the highlighted card and the queried local date. A null date choice follows today across midnight; explicitly selected dates stay fixed. The selection is clamped to the signup/history and future planning bounds. Calendar width is measured in its actual container, avoiding viewport-based centering drift. Week arrows retain the same historical/future limits. Pull-to-refresh reloads both the schedule and past-day logs.

## Validation

- `npm run check`: TypeScript, lint, architecture checks.
- `npm test`: existing tests plus focused schedule-history and completion regressions.
- `npx expo export --platform ios`: native JavaScript and bundled font/assets compilation.
- Native iOS preview: verified the updated typography and dashboard, activity-history navigation, and calendar date selection.

The repository has existing lint warnings; no new architecture violations were added. Native review uses the existing development session; it does not create test accounts or change real task completion states.
