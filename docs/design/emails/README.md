# Booking emails: design hand-off pack

The five booking emails use the "ticket" layout from the web booking page: paper card on a beige page, pink header band, big time, dotted perforation, Join button, 2x2 actions and a details stub.

| File | What it is |
|---|---|
| `design-spec.json` | Machine-readable spec: colour and type tokens, layout blocks, the five emails (audience, trigger, copy, dynamic fields, joy concept), edge-case states, countdown rules, and the email-client constraints. |
| `gallery.html` | Every email at 600px and 375px, plus edge cases. Generated from the real renderer, so it matches what is sent. Open it through a local web server (for example `python3 -m http.server` in this folder). |
| `emails/*.html` | One rendered HTML file per email and state. |
| `assets/` | The two scalloped-edge PNGs used by the emails. |

## Links

- Figma: https://www.figma.com/design/u6sL8AkQZeWPNIzZxj4eWz (pages: Tokens, Components, Emails; frames at 600 and 375 with slot-named layers)
- Claude Design canvas (private): https://claude.ai/artifact/Ss5rvd1DSSWVCJhdhhksCP (five editable artboards at 600px)

## The five emails

Confirmation (attendee), new-booking alert (host), 24-hour reminder, 1-hour reminder, post-call follow-up. Each has a "joy concept" in the spec: a proposal for its own motif, copy and small animation. All of that is open for you to redesign.

## Redesigning

- **Figma:** open the file linked above. Frames are at 600px and 375px. Layers are named by slot (for example `slot/eventName`); keep those names.
- **Claude Design:** open the private canvas linked above, ask for changes, and send the result back.
- **JSON:** edit `tokens`, `copy` or `joy` in `design-spec.json` and send it back.

## What email can and can't do

Read `constraints` in the spec before designing. In short: tables only, system fonts only, PNG/JPG/GIF images (with alt text), nothing essential inside an image, dark mode forced to light, and the whole email under 100 KB. Figma is the design intent; the HTML here is the source of truth for what email clients support.

## What happens next

Send back the Figma link, the artifact link, or the edited JSON. The design is then read, mapped block by block onto the email components, and built per email, with anything email cannot do reported together with the closest alternative.

## Regenerating

The email HTML is produced by rendering the real templates with sample data at a fixed clock (so the countdown lines match each email's moment). `design-spec.json` colour tokens are checked against the code by `packages/emails/src/components/designSpec.test.ts`.
