# Apple HIG check: Routine and Nap tabs

October 1, 2026. The user said the custom popups looked bad and asked for every new
screen to follow Apple's Human Interface Guidelines. Sources: Apple's HIG pages for
[sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
[pickers](https://developer.apple.com/design/human-interface-guidelines/pickers),
[lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
and [toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars),
read October 1, 2026.

## Rule: use Apple's controls on iPhone

Popups and pickers on iPhone come from `@expo/ui/swift-ui` (real SwiftUI), not
hand-built React Native. The RN versions stay only as the web preview's stand-ins, in
files without the `.ios` suffix. Shared types live in a third file (`control-types.ts`,
`length-label.ts`), because on iOS `./controls` resolves to `controls.ios.tsx` itself.

## What changed, and which guideline

| Was | Now (iPhone) | HIG |
|---|---|---|
| A custom slide-up sheet with a hand-drawn time wheel for Bedtime and Morning start | The compact date picker sits in the row; a tap opens the system wheels in place | Pickers: "Avoid switching views to show a picker. A picker works well when displayed in context." Use the compact style "when space is constrained." |
| A custom sheet with a checkmark list for Method and Step target | Pull-down menus in the row | Pickers: "If you need to display a fairly short list of choices, consider using a pull-down button." |
| A custom sheet for Nights, with no grabber, no detents and no swipe to dismiss | A system sheet: grabber, medium and large heights, swipe to dismiss, a checkmark list like Clock's Repeat, and the standard Close button | Sheets: "Include a grabber in a resizable sheet." "Support swiping to dismiss a sheet." Toolbars: "Use the standard Back and Close buttons." |
| Done and Cancel in sheets whose edits applied live | Close only. Each tap applies, and the screen's pending note has Undo | Sheets: a Done button must pair with a Cancel, and a Cancel that doesn't undo anything would mislead. |
| Three large custom tiles for nap length | The system segmented control | Segmented controls suit a few mutually exclusive choices. |
| Method details in each row of a sheet | The section footer explains the chosen method and the steps fallback | Lists: the grouped style "uses headers, footers" to explain; keep row text succinct. |

## Left as they are, on purpose

- **Titles in Loc's serif** rather than navigation-bar titles. It's a brand choice the
  whole app shares; revisit if the app moves to native stack headers.
- **The disclosure chevron on Nights.** It opens a sheet with a list, as Settings does.
- **The Apps tab** already opens Apple's own `FamilyActivityPicker`.

## Not verified yet

None of this has run on the iPhone. Linux can only render the web stand-ins, and it
needs a new development build. Check on the phone:

- The compact time button and its wheels in dark mode, and that it refuses a bedtime
  equal to morning start.
- Both menus open, show a checkmark on the current choice, and update the footer.
- The Nights sheet: grabber, both heights, swipe down, Close, and the checkmarks toggling.
- The nap's segmented control.
- VoiceOver and the largest text size on all of the above.
