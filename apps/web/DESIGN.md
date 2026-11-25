---

name: Delivery Metrics
description: "Cloudnonic's internal delivery board: production answers in words first, and every claim points to the deploy row that proves it."
colors:
ink: "#0d1a55"
body: "#3c4366"
muted: "#5f6684"
ground: "#f7f7f7"
panel: "#ffffff"
line: "#e3e5ee"
line-strong: "#c9cddd"
highlight: "#e9ecf6"
previous: "#a8aec6"
clean: "#1d7348"
watch: "#8a5a00"
failed: "#b42318"
typography:
display:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "2.5rem"
fontWeight: 700
lineHeight: 1.1
letterSpacing: "-0.025em"
lead:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "1.0625rem"
fontWeight: 400
lineHeight: 1.625
row-title:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "16px"
fontWeight: 600
lineHeight: 1.5
heading:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "15px"
fontWeight: 600
lineHeight: 1.5
body:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "14px"
fontWeight: 400
lineHeight: 1.5
label:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "13px"
fontWeight: 600
lineHeight: 1.5
meta:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "13px"
fontWeight: 400
lineHeight: 1.5
caption:
fontFamily: '"Manrope Variable", "Manrope", ui-sans-serif, system-ui, sans-serif'
fontSize: "12px"
fontWeight: 400
lineHeight: 1.5
rounded:
panel: "12px"
block: "8px"
control: "6px"
inset: "4px"
spacing:
"1": "4px"
"1.5": "6px"
"2": "8px"
"3": "12px"
"4": "16px"
"5": "20px"
"6": "24px"
"8": "32px"
"10": "40px"
"12": "48px"
components:
header-bar:
backgroundColor: "{colors.panel}"
textColor: "{colors.ink}"
typography: "{typography.heading}"
padding: "12px 16px"
notice-band:
backgroundColor: "{colors.highlight}"
textColor: "{colors.ink}"
typography: "{typography.meta}"
padding: "8px 16px"
segmented-control:
rounded: "{rounded.control}"
padding: "2px"
segment:
textColor: "{colors.body}"
typography: "{typography.label}"
rounded: "{rounded.inset}"
padding: "6px 12px"
segment-hover:
textColor: "{colors.ink}"
segment-selected:
backgroundColor: "{colors.ink}"
textColor: "{colors.panel}"
select:
backgroundColor: "{colors.panel}"
textColor: "{colors.ink}"
typography: "{typography.label}"
rounded: "{rounded.control}"
padding: "6px 32px 6px 10px"
claim:
textColor: "{colors.body}"
typography: "{typography.lead}"
rounded: "{rounded.block}"
padding: "8px 12px"
claim-active:
backgroundColor: "{colors.highlight}"
claim-link:
textColor: "{colors.ink}"
deploy-row:
padding: "16px 12px"
deploy-row-active:
backgroundColor: "{colors.highlight}"
verdict-clean:
textColor: "{colors.clean}"
typography: "{typography.label}"
verdict-watching:
textColor: "{colors.watch}"
typography: "{typography.label}"
verdict-failed:
textColor: "{colors.failed}"
typography: "{typography.label}"
verdict-quiet:
textColor: "{colors.muted}"
typography: "{typography.label}"
watch-window:
height: "12px"
width: "100%"
watch-track:
backgroundColor: "{colors.line-strong}"
height: "1px"
watch-day-mark:
backgroundColor: "{colors.line-strong}"
width: "1px"
height: "8px"
watch-elapsed-watching:
backgroundColor: "{colors.watch}"
height: "3px"
watch-elapsed-clean:
backgroundColor: "{colors.clean}"
height: "2px"
watch-elapsed-failed:
backgroundColor: "{colors.muted}"
height: "2px"
watch-event-mark:
backgroundColor: "{colors.failed}"
width: "2px"
height: "12px"
period-panel:
backgroundColor: "{colors.panel}"
rounded: "{rounded.panel}"
padding: "20px"
period-claim:
textColor: "{colors.body}"
typography: "{typography.heading}"
period-current-mark:
backgroundColor: "{colors.ink}"
rounded: "{rounded.inset}"
width: "20px"
period-previous-mark:
backgroundColor: "{colors.previous}"
rounded: "{rounded.inset}"
width: "20px"
period-active-bucket:
backgroundColor: "{colors.highlight}"
empty-state:
textColor: "{colors.ink}"
rounded: "{rounded.panel}"
padding: "32px 20px"
sign-in-panel:
backgroundColor: "{colors.panel}"
rounded: "{rounded.panel}"
padding: "28px 24px"
width: "23rem"
text-field:
backgroundColor: "{colors.panel}"
textColor: "{colors.ink}"
rounded: "{rounded.control}"
padding: "8px 12px"
field-error:
textColor: "{colors.failed}"
typography: "{typography.label}"
primary-button:
backgroundColor: "{colors.ink}"
textColor: "{colors.panel}"
typography: "{typography.body}"
rounded: "{rounded.control}"
padding: "10px 16px"
secondary-button:
backgroundColor: "{colors.panel}"
textColor: "{colors.ink}"
typography: "{typography.label}"
rounded: "{rounded.control}"
padding: "6px 12px"
conflict-row:
padding: "12px"
---

# Design System: Delivery Metrics

## Overview

**Creative North Star: "The Annotated Ledger"**

The system is built for reading evidence. A ledger of production deploys sits on the page, and its annotation is written above it in plain words: one sentence in large navy type gives the answer, short claims give the reasons, and each claim links down to the row that proves it. Figures come after the words, and a period's figures always stand next to the period before. Every device on the page either states a fact or shows where the fact came from.

The material is Cloudnonic's own and deliberately plain: navy on a cool paper grey and white, Manrope for every glyph, 1px navy-tinted hairlines in place of boxes and shadows. The density is that of a well-kept table: one loud line, then a tight ladder from 11 to 17px where the evidence lives. Colour is spent on meaning only: navy for what a reader acts on, green, amber and red for state, a pale navy wash for whatever is linked or has just been reached, and a hatch where data is missing.

It is an internal tool for people who come back after every deploy, so nothing is there to impress. Motion is a 150ms colour change; the one authored moment is the highlight a row plays when a claim's link lands on it. The board holds to WCAG 2.1 AA, never carries state by colour alone and respects reduced motion. Confirmed rejection: the KPI-tile dashboard and its card grids; figures live in rows, and a period's charts are rows of one panel.

**Key Characteristics:**
- Words before numbers: one navy sentence at display size answers the page, and no metric is set above 15px.
- Cloudnonic navy on paper grey and white, with the Cloudnonic cloud mark and Manrope as binding identity.
- A flat ledger: a tone step from ground to white and 1px navy-tinted hairlines, never a shadow.
- Three state colours, each always paired with an icon and words; missing data is hatched and named.
- Watch windows drawn as 72-hour timelines with the 24 h mark at one third: a production deploy fails when a hotfix or a rollback lands inside it.
- Periods answered row by row: a sentence that states the finding, beside the chart that proves it, with this period in navy next to the previous one in grey.
- Tabular figures only where figures stack.
- Motion is colour; the row arrival is the only authored moment.

## Colors

One brand voice, Cloudnonic navy, on a cool paper grey and white ground; a family of navy-tinted greys for text and hairlines; three state colours that never decorate. The theme is light only.

### Primary

- **Cloudnonic Navy** (#0d1a55): the voice of the board and the binding brand colour. It sets the verdict sentence, row titles, section headings, claim subjects, period values, this period's marks in the period charts and the wordmark; it fills the selected segment of a control and the sign-in button (with white text); it draws the focus ring, the text caret and selected text.

### Neutral

- **Paper Grey** (#f7f7f7): the page ground and the browser theme colour. The board sits on grey, not on white.
- **Sheet White** (#ffffff): the header bar, contained panels (the period panel), selects and segmented controls, the halo that lets an average line cut through columns, and text on navy.
- **Deep Slate** (#3c4366): running text: the digest claims, metric labels, versions, unselected segments, the org name in the header, "Sign out" and the terms of the printed rules.
- **Faded Slate** (#5f6684): metadata and secondary figures: when, by whom and via which host a deploy shipped, column headings, the 0/24/72 h scale, previous-period values, the previous period's average line, chart scale and axis labels, the printed rule text, the sync time, the "Deployed" and "Did not deploy" verdicts of environments that are not watched, and the elapsed stroke of a failed window.
- **Navy Hairline** (#e3e5ee): every 1px border and divider: the bottom edges of the header and the notice band, list rules, the period panel's frame and dividers, control frames, the top gridline of each chart, and the release-days track.
- **Navy Rule** (#c9cddd): the firmer line for marks that must read alone: the timeline track and its 24 h tick, the hatch stripes, chart baselines, the resting underline of claim links, the dashed empty-state frame, the scrollbar thumb.
- **Navy Wash** (#e9ecf6): attention without alarm: the highlight a claim and its row share, the arrival highlight, the bucket or bin being read in a period chart, the notice band, text selection.
- **Previous Slate** (#a8aec6): the previous period in every period chart (its columns and bars), and its swatch in the legend. It sits under 3:1 on white by design: every value it draws is also written as a label or in the table.

### State

- **Pine Green** (#1d7348): clean, a deploy that passed its 72-hour watch. Verdict text and icon, and the window's elapsed stroke.
- **Ochre Amber** (#8a5a00): watching, a deploy still inside its window. Verdict text and icon, and the elapsed stroke, drawn 1px heavier than the others (3px).
- **Brick Red** (#b42318): failed, a production deploy that needed a hotfix or a rollback within 72 hours. Verdict text and icon, the event tick on the timeline and the failed ticks of the outcome strip (always counted beside the warning icon and the word failed); also a sign-in error and the frame of the field that caused it.

### Named Rules

**The Navy Voice Rule.** Navy is the only brand colour and there is no second accent. What a reader should act on or remember is navy; everything else is a navy-tinted grey or a state.

**The Three States Rule.** Green, amber and red mean clean, watching and failed, and nothing else. They colour text, icons and timeline strokes on the surface they sit on, always next to an icon and words.

**The Hatched Absence Rule.** Missing data is drawn as a hatch (1px Navy Rule stripes at 135 degrees, every 6px) and named "No data". It is never drawn as zero, an empty track or a grey bar.

## Typography

**Display Font:** Manrope Variable (with Manrope, ui-sans-serif, system-ui, sans-serif)
**Body Font:** Manrope Variable (same stack)
**Label/Mono Font:** none; the system has no monospace.

**Character:** One modern geometric sans at two volumes: bold and tightly tracked for the sentence that answers the page, even and unforced at the 11 to 17px sizes where the evidence lives.

### Hierarchy

- **Display** (700, 2.5rem from 1024px, 2.125rem from 640px, 1.75rem below; line-height 1.1; tracking -0.025em; balanced wrap): the verdict sentence, one per page, in navy.
- **Lead** (400, 1.0625rem, line-height 1.625): the digest claims in Deep Slate; each claim's subject is a navy link at 600.
- **Row title** (600, 16px, line-height 1.5): the service name that opens a deploy row, and the first line of an empty state; navy.
- **Heading** (600, 15px, line-height 1.5): section headings and the period label, in navy. The same size sets a period row's sentence, in Deep Slate at 400 with its finding in navy at 600, and the product name in the wordmark (tracked -0.01em).
- **Body** (400, 14px, line-height 1.5): the explanation in an empty state.
- **Label** (600, 13px, line-height 1.5): control text (segments, the selects, buttons, "Sign out"), verdict labels, a conflict's kind and the sign-in error.
- **Meta** (400, 13px, line-height 1.5): metadata lines, the sync time, the notice band, a conflict's date, the "vs" label of a comparison and the printed rules, which run at line-height 1.625. Versions take this size at 500 in Deep Slate.
- **Caption** (400, 12px, line-height 1.5): column headings and previous-period values.

The watch scale's 0/24/72 h labels, and the scale and axis labels of the period charts, are the one size below Caption (11px, line-height 1).

### Named Rules

**The One Family Rule.** Manrope sets every glyph: the verdict, figures, times and versions (tags or SHAs). There is no monospace; a version is a name, set at 13px medium beside its service.

**The Stacked Figures Rule.** Tabular figures and short units ("68 h", "2.4 d") are only for figures that stack: verdict labels, period values, the 0/24/72 h scale. Inside sentences figures stay proportional, units are spelled out ("68 hours of its watch left") and small counts are words ("two features and one fix").

**The Words Over Numbers Rule.** Display size belongs to a sentence that answers the page's question, never to a number on its own. No metric on the board is set above 15px.

## Layout

Board content sits in one centred container, 1240px wide at most, with a 16px side gutter on phones and 24px from 640px. The header, the notice band and the main column share that container, so their left edges align. The main column opens 32px below the band (48px from 1024px) and leaves 64px at the end.

From 1024px the main column is a 12-column grid; below it everything stacks in one column, in reading order. The overview uses the grid twice: the digest splits 6 and 6 (sentence left, claims right, 40px apart; 24px when stacked) the deploy rows take the full width under it, the period band follows them and the conflicts band closes the page; 48px separate the bands. These splits describe the overview, not a rule for every page. Sign-in and an unreachable API centre one 23rem column on the ground, with no header.

Period rows are a two-track grid from 1024px: the sentence (17rem) and the chart (minmax(0, 1fr)), 40px apart, with 20px of padding; below 1024px the sentence stacks over its chart. Rows are split by hairlines, and each one answers one question: how often production got a deploy, how long a change took to reach it, what broke it, and what shipped.

Deploy rows are a three-track grid from 640px: identity (minmax(0, 2fr)), verdict (10.5rem) and watch window (minmax(0, 1.6fr)), 24px apart and centred vertically, with the column headings on the same tracks. Below 640px the three parts stack 12px apart and the headings reduce to the time scale.

Spacing runs on a 4px base (the Tailwind scale); the recurring steps are 4, 6, 8, 12, 16, 20, 24, 32, 40 and 48px. 12px is the inset of anything that can be highlighted, 16px pads a row vertically and is the phone gutter, 48px separates bands. Breakpoints are 640px and 1024px; no others are used.

### Named Rules

**The Inset Highlight Rule.** Anything that can be highlighted carries 12px of horizontal padding, so the wash never touches its text. Rows sit 12px inside their list; claims pull their padding outward with a negative margin, so their text keeps the column edge.

## Elevation & Depth

The system is flat: nothing casts a shadow. Depth is tonal and linear. The page is Paper Grey; anything that needs to stand apart (the header bar, the period panel) turns Sheet White and takes a 1px Navy Hairline; rows inside a list are separated by hairlines alone. Emphasis is a tint, not a lift: Navy Wash for what is linked or just reached, and a solid navy fill only for a selected segment and the sign-in button. Focus is a 2px solid navy outline, 2px off the element.

### Named Rules

**The Flat Ledger Rule.** No shadows, no lifts. A surface separates from the ground by turning white and taking a 1px navy-tinted hairline, and a row separates from its neighbour by a hairline alone.

## Shapes

Corners are gently and consistently rounded by containment: panels (the period panel, the empty state) at 12px, blocks such as a highlighted claim at 8px, controls (a segmented control's frame, the selects, the password field and the buttons) at 6px, and the smallest shapes at 4px: segments inside a control, the wordmark link's focus shape, the hatch strip. Nested corners are concentric: a 6px frame with 2px of padding holds 4px segments.

Borders are 1px. Solid Navy Hairline frames panels and controls; the empty state alone takes a dashed Navy Rule frame, marking the place where rows will appear. Lists are open: a rule above, a rule below and hairline dividers between rows, with no box around them. The timeline's 2 and 3px strokes and its event ticks have round caps; the hatch runs at 135 degrees.

**The Containment Radius Rule.** Radius follows what an element contains: 12px for panels, 8px for blocks, 6px for controls, 4px for the smallest shapes, including anything inside a control. Round caps belong only to the timeline's strokes and ticks.

## Components

Every component shares one interaction grammar. Hover, selection and the linked highlight change colour in 150ms on the ease-out curve (cubic-bezier(0.23, 1, 0.32, 1)). Focus is always the 2px navy outline at 2px offset. Icons come from Phosphor at bold weight, 16px beside 13px text (12px for the select caret), hidden from assistive technology and always next to words.

**The Colour-Not-Movement Rule.** Interaction changes colour, never position or size. The only movement is a press (0.97 on segments, 0.98 on the sign-in button), and only when the reader has not asked for reduced motion; the only authored moment is the row arrival. Switching environment keeps the previous board on screen at 60% opacity until the next one lands, then fades it back in 150ms.

### Cards / Containers

- **Period panel:** Sheet White, 12px corners, a 1px Navy Hairline frame, no shadow. Its header line names the range (Heading navy, then its dates and grouping in Faded Slate) against a legend of two 10px swatches: navy for this period, Previous Slate for the previous one with its dates. "How we count" follows the panel as a disclosure that prints the rules in Meta at line-height 1.625.
- **Period charts:** hand-drawn SVG; navy is this period and Previous Slate the previous one, everywhere. Marks follow one spec: columns at most 20px wide, never wider than their slot minus 2px, with 4px rounded data-ends on a 1px Navy Rule baseline; labels sit in text colours, never in the mark's colour; buckets before the history are hatched and named "No data".
  - **Deploys:** one column per bucket, the previous period's buckets in grey on the left and this period's in navy on the right, split by a hairline and named under each group. Each group carries its average as a 1.5px line with a white halo and a white label chip ("3.9 a week"); the scale's top value sits in a 36px gutter.
  - **Lead time:** a histogram of changes by time to production (under 4 h up to 4+ weeks), each bin a grey and a navy column side by side with their shares above them, and a Navy Rule bracket under the bins that make a week with the share within a week.
  - **Outcomes:** every deploy of the range as a 2px tick on a time strip: Pine Green clean, Ochre Amber watching and Brick Red failed, drawn taller. Counts with their verdict icons follow, then the failed deploys newest first (service, version, what happened and after how long, and the date), four at a time until "Show all" is pressed.
  - **What shipped:** features and fixes as paired 10px bars, this period over the previous one, each with its count at the end.
- **Reading a bucket:** pointing at a column or bin washes its slot in Navy Wash and opens a tooltip (Sheet White, 1px Navy Hairline, 8px corners) with its numbers. The deploys chart is also a slider for the keyboard: arrows, Home and End move between buckets of both periods, Escape lets go, and its value text reads the bucket aloud. The Table view prints every bucket with its features and fixes, and the range and the previous period as its footer.
- **Empty state:** no fill, a dashed 1px Navy Rule frame, 12px corners, 32px by 20px padding. A Row title line in navy says what is missing; a Body line in Deep Slate, 4px below, says what will appear there and when.
- **Loading and errors:** the first load draws a skeleton in Navy Wash that mirrors the digest (three sentence bars, four claim lines) and three rows, announced as "Loading the history". A history that fails to load takes the empty-state frame: "The history did not load.", the API's own message, and a secondary "Try again" button. An API that does not answer gets the same block under the wordmark, before sign-in.

### Inputs / Fields

- **Segmented control:** a radio group in a fieldset with a hidden legend, used for the grouping and the Chart / Table view. Frame: 1px Navy Hairline, 6px corners, 2px padding. Segments: Label type in Deep Slate, 6px by 12px padding, 4px corners. Hover turns the text navy; the selected segment fills navy with white text; the focus ring draws on the segment itself. Background and colour transition in 150ms, and the press scales to 0.97 behind motion-safe.
- **Filter row:** above the period panel, one wrapping row: the range select, the From and To date fields of a custom range, the week, month and year segments (a grouping that would give fewer than two or more than sixty buckets is disabled) and, pushed right from 640px, the Chart and Table segments. The repo is chosen once, in the header, for the whole board. Selects, segments and date fields share one vocabulary with the header controls.
- **Password field:** Sheet White, a 1px Navy Rule frame that turns navy on focus, 6px corners, 8px by 12px padding, text at 16px so phones do not zoom; its Label sits 6px above it. A wrong password turns the frame Brick Red and prints the API's message 8px below, in Label type and Brick Red after a bold warning icon, announced as an alert.
- **Buttons:** the primary button (sign in) fills navy with white 14px semibold text, 10px by 16px padding, 6px corners, full width of its panel; hover lightens the fill, and while the request runs it reads "Signing in…" and is disabled. The secondary button ("Try again") is Sheet White with a 1px Navy Hairline and navy Label type, 6px by 12px padding; hover washes it.
- **Environment select:** a native select with its own arrow removed. Sheet White, 1px Navy Hairline, 6px corners, padding 6px 32px 6px 10px, Label type in navy, a bold 12px caret in navy 10px from the right edge. A Meta label ("Environment", Faded Slate) sits 8px before it.

### Navigation

- **Board header:** a Sheet White bar with a Navy Hairline bottom edge, 12px vertical padding, wrapping with 24px between items and 12px between lines. Left to right: the wordmark (the Cloudnonic cloud mark, 18px tall in navy, 10px from the product name in Heading type tracked -0.01em), a 1px Navy Rule divider and the org name ("Tensorparc", Label in Deep Slate), the environment select, the repo select ("All repos" or one repo; it scopes the summary, the rows, the period panel and the conflicts), and, pushed to the far right from 640px, the sync time ("Synced 3 hours ago", Meta in Faded Slate after a bold sync icon) and "Sign out" (Label in Deep Slate after a bold icon; hover turns it navy). On phones the header wraps into rows: wordmark and org, the environment and repo, then sync time and sign out.

### Sign-in

- One Sheet White panel, 23rem wide, centred on Paper Grey: 12px corners, 1px Navy Hairline, 28px by 24px padding. The wordmark; 24px below, a 1.5rem bold navy heading ("Tensorparc's deploys, lead time and failures.", tracked -0.02em, balanced); a Body line in Deep Slate ("Sign in with the team's shared password."); the password field and the primary button. There are no accounts, so there is nothing else to fill in.

### Links

- **Claim link:** set inside its claim at 600 in navy, with a 1px Navy Rule underline. Hover deepens the underline to navy in 150ms. The base layer gives every underlined link a 1px line 0.22em below the text.

### Notice Band

- A full-width Navy Wash band under the header with a Navy Hairline bottom edge. Inside the container: a bold 16px info icon and, 8px after it, Meta type in navy, with 8px vertical padding. It names board-wide conditions; today it names the hosts that are not connected yet, whose deploys come from GitHub merges and cannot be checked for conflicts.

### Deploy Digest

The board's answer in words. A Display sentence on the left; beside it (below it on narrower screens) a list of claims in Lead type, 4px apart. Each claim opens with its subject (service and version) as a claim link, then one sentence. A claim is a block with 8px corners and 8px by 12px padding that turns Navy Wash when it is active.

**The Linked Highlight Rule.** A claim and its row are one thing in two places. Pointing at either one, or focusing the claim's link, washes both in Navy Wash; following the link lands on the row with the arrival highlight.

### Evidence Rows

- **List:** an ordered list with a Navy Hairline above, below and between rows, and no box. Column headings ("Deploy", "Verdict" and the time scale, in Caption and Faded Slate) sit on the row tracks, 8px above the first rule.
- **Row:** 16px by 12px padding. Identity: the service in Row title type, its version (Meta size at 500, Deep Slate) and, for a hotfix, a rollback or a dependency update, that kind in Caption at 600 and Faded Slate, on one baseline, 8px apart; then 4px below a Meta line in Faded Slate saying when (a relative time), by whom and via which host, and the pull request it came from as an underlined link. Then the verdict label and the watch window (production only; other environments take two tracks, identity and state).
- **What shipped:** under the row, across all its tracks, a disclosure in Body type: the first titles and the change count ("Penalty carry-over and dates (3 changes)"), opening to every feature and fix (kind in Faded Slate at 600, the title, its Linear ticket and its pull request link) and a line counting the internal changes (refactors, chores, CI and tooling).
- **States:** hover washes the row (and its claim) in Navy Wash in 150ms. A row is a link target: it scrolls in with 24px of air above it and plays the arrival highlight, Navy Wash held for the first 30% of 1.2s, then faded to transparent on the ease-out curve. Under reduced motion the reached row simply stays washed.

### Verdict Label

- An inline icon and text in Label type with tabular figures, 6px apart, on the row's own background: "Clean" (check circle, Pine Green); "Watching, 68 h left" (eye, Ochre Amber); "Failed: hotfix" or "Failed: rollback" (warning circle, Brick Red). Environments that are not watched say only what happened, in Faded Slate: "Deployed" (cloud arrow up) or, for a build that never went live, "Did not deploy" (prohibit sign).

### Watch Window

- The deploy's first 72 hours in production, drawn as one line in a 12px-tall strip across its track and exposed to assistive technology as an image with a sentence ("Watch window: 3 h of 72 h elapsed, no hotfix or rollback").
- **Track:** 1px Navy Rule across the full width, with a 1px by 8px Navy Rule tick at 24 h (one third).
- **Elapsed:** a round-capped stroke from the deploy to now: 3px Ochre Amber while watching, 2px Pine Green when clean, 2px Faded Slate when failed (the failure is told by its red tick).
- **Event:** the hotfix or rollback that failed the deploy is a 2px by 12px Brick Red tick with round caps at the moment it shipped.
- **Scale:** "0 h", "24 h" and "72 h" above the column at 11px, line-height 1, in Faded Slate with tabular figures, pinned to the start, the one-third mark and the end.

**The 72-Hour Window Rule.** Every watch is drawn on the same 72-hour line with its 24 h mark at one third, so windows compare by eye down a column: elapsed time in the state colour, the failure as a red tick.

### Conflicts Band

- "Where the sources disagree": a Heading, then one Body sentence that says who agrees ("GitHub and Forge agree on every production deploy.") or how many records disagree, and which host is not checked yet. Then an open list on hairlines, one row per disagreement on three tracks from 640px (7rem, 12rem, the rest): the date (Meta, Faded Slate, tabular); the kind ("Merged, never deployed", "Deployed, never merged", "Tagged, never deployed", Label in navy) over the repo (Faded Slate); and the detail in Deep Slate, ending with the pull request, commit or release as an underlined link with a 12px external-link icon. Nothing is resolved silently: every row also travels in the CSV.

### Downloads

- On the line of the "By period" heading, pushed right: "CSV, all environments:" in Meta and Faded Slate, then "Every deploy" and "By month" as underlined Label links in navy, each after a bold 14px download icon. They are plain links to the API through the proxy, so the session cookie goes with them.

## Do's and Don'ts

### Do:

- **Do** set pages on Paper Grey (#f7f7f7) and keep Sheet White (#ffffff) for the header bar, contained panels and controls.
- **Do** answer in a sentence first: Display type in navy (700, 2.5rem from 1024px, -0.025em, line-height 1.1, balanced), with every claim linked to the row that proves it.
- **Do** pair every state colour with its Phosphor bold icon and words: check circle for clean, eye for watching, warning circle for failed.
- **Do** draw history the board does not have as the hatch and name it "No data"; an open window reads "Watching, N h left", never zero.
- **Do** use tabular figures and short units only where figures stack: verdict labels, period values, the time scale.
- **Do** keep text at 4.5:1 or better on Paper Grey, Sheet White and Navy Wash; Faded Slate on Navy Wash (4.78:1) is the lowest pair in use.
- **Do** show focus as a 2px solid navy outline at 2px offset.
- **Do** keep transitions to colour, 150ms on the ease-out curve (cubic-bezier(0.23, 1, 0.32, 1)); put any press scale (0.97) behind motion-safe and leave the arrival highlight static under reduced motion.

### Don't:

- **Don't** build KPI tiles or card grids; figures live in rows and in the period panel, where every chart sets this period next to the previous one.
- **Don't** give a number display size; no metric is set above 15px.
- **Don't** introduce a monospace face for versions, SHAs or times.
- **Don't** add shadows; separate with a tone step and a 1px navy-tinted hairline.
- **Don't** add a second accent hue, or use green, amber or red for anything but state.
- **Don't** carry state by colour alone.
- **Don't** draw missing data as zero, an empty track or a blank cell.
- **Don't** move or resize anything on hover or focus; interaction changes colour.
