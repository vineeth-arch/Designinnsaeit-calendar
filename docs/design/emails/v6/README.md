# v6 design notes (extracted from design-innsaeit-booking-emails-v6.html)

Source of truth for slots, reading order and decisions. Fixtures in `fixtures/` are the golden HTML.

## 1 Confirmation

The reader is asking
      Did it go through, and when is it in my time?
      Inbox line
      Booked: brand strategy call, Mon 21 Sep, 10:30am UK time
      Add it to your calendar. Here is what the 30 minutes cover.
      Reading order
      The date and time in their timezone, readable in one glance.
One button: add it to the calendar. Nothing competes with it.
A four-card grid of what the call covers. Each card is one strategic question, not a deliverable.
The 5 / 20 / 5 bar, drawn to scale. Two thirds of it is you asking questions.
Below the tear: their details to check, the link, how to move it.
      Cut from the old version
      The event title. They know who they are and who they booked.
The Join button. Nobody joins three days early.
'Appointment time' and 'With: Design Innsæit'. Both said nothing.
The agenda as a list of times. The grid says what gets decided, which is what they care about.
      Slots
      Attendee first name | in your data | 
Date, start, end, attendee timezone | in your data | 
Host local time (3:00pm Mumbai) | derived | 
Starts in N days | in your data | 
Google Calendar link | derived | 
What we cover, four cards | fixed copy | 
Brand, category, website, country | in your data | 
Meeting link | in your data | 
Reschedule cutoff, start minus 24h | derived | 
Booking reference | derived |

## 2 New-booking alert

The reader is asking
      Who is this, are they worth an hour of prep, and when?
      Inbox line
      New booking: Jordan Lee, Acme Studio (UK). Mon 21 Sep, 3:00pm
      Jordan Lee, Acme Studio, United Kingdom. Mon 21 Sep, 3:00pm IST.
      Reading order
      The brand, the category and the person. The lead, not the logistics.
Two actions that start prep: open their site, email them.
Your time beside their time. No arithmetic across timezones.
Why they booked, in their words. This is the positioning symptom you will test.
A three-card prep grid and a PREP line ready to paste.
      Cut from the old version
      The pink band with the event title. You already know it is a strategy call.
Join meeting as the primary button. It is three days away.
Intake answers buried at the bottom. They are now the headline.
      Slots
      Brand, category, attendee name, country, email | in your data | 
Website | in your data | 
Date and time, host timezone | in your data | 
Attendee local time and city | derived | 
Starts in N days | in your data | 
Attendee note (additionalNotes) | in your data | 
Prep grid, three cards | fixed copy | 
PREP line assembled from the fields above | derived | 
Meeting link, booking link, reschedule, cancel | in your data |

## 3 24-hour reminder

The reader is asking
      Is this still happening, and do I need anything?
      Inbox line
      Tomorrow, 10:30am: three things to bring
      10:30am UK time. Three things to have ready.
      Reading order
      The word Tomorrow, then the time. The whole message in two lines.
Three cards, the first one black. Naming the three brands they lose to is the one that changes the call.
The last sensible moment to move it, with one outlined button.
Below the tear: the link, calendar, cancel.
      Cut from the old version
      The Join button. The link is in the stub and arrives again an hour before.
Brand, website and country. They confirmed these yesterday.
'Starts in 1 day' beside a date that already says tomorrow.
      Slots
      Relative day word (Tomorrow) | derived | 
Date, start, attendee timezone | in your data | 
Duration, location | in your data | 
Attendee first name | in your data | 
Bring three things, three cards | fixed copy | 
Reschedule link | in your data | 
Meeting link, calendar link, cancel | in your data | 
Booking reference | derived |

## 4 1-hour reminder

The reader is asking
      Where do I click?
      Inbox line
      Starting in 1 hour: your link to join
      10:30am UK time. One button to join.
      Reading order
      The countdown. The only email where magenta floods, because this is the only urgent one.
One white button, the largest in the set.
The raw link, for a second device or a blocked button.
One line of prep and one promise: you are there two minutes early.
      Cut from the old version
      Everything that is not joining. No date leaf, no grid, no intake answers.
Reschedule and Cancel as buttons. An hour out they are a sentence in the stub.
      Slots
      Attendee first name | in your data | 
Live countdown GIF, 480x110, full width | derived | 
Static start time line, the GIF fallback | in your data | 
Meeting link, button and raw text | in your data | 
Prep line and two-minutes-early promise | fixed copy | 
Reschedule, cancel | in your data | 
Booking reference | derived |

## 5 Post-call follow-up

The reader is asking
      What happens now, and when?
      Inbox line
      What happens next, and by when
      My read on the brand, by Wednesday 23 September.
      Reading order
      A sentence that points forward. Not a thank you for their time.
The date leaf again, now carrying your deadline rather than theirs.
Three cards: what the page will contain, including whether you are the right fit.
One dated ask that keeps them thinking about the problem.
Below the torn edge: the used ticket. Small, grey, stamped.
      Cut from the old version
      The time of a call that is over, set at 44px.
'Thank you for your time.' It reads as a supplier grateful for an audience.
'Appointment time' and 'Manage booking'. There is nothing left to manage.
      Slots
      Attendee first name | in your data | 
Summary due date, end plus 2 working days | derived | 
Reply-by date, end plus 1 working day | derived | 
Contents of the page, three cards | fixed copy | 
Call record: date, start, end, timezone | in your data | 
Booking reference | derived |

## 6 Summary (host-written)

The reader is asking
      Did he understand us, and is he worth going further with?
      Inbox line
      What I heard, and where I think the brand actually sits
      Correct anything I got wrong, then pick a time before Friday 2 October.
      Reading order
      Their own words, quoted back, so they can correct the record.
The positioning map. Where they sit today and where the listing needs them, in one look.
Four sentences naming the real problem. This is the paragraph they forward to whoever signs off.
The brand stack: two layers redrawn last year, two never settled. It explains the failed refresh without blaming anyone.
What is riding on it, in their figures. Then a plain yes on fit.
One next conversation, with a date and a reason that date exists.
      Cut from the old version
      A price. There is no number in this email and no proposal attached.
A deliverables list. Nothing is scoped until the value conversation has happened.
'Let me know if you have any questions.' It hands the next move back to them.
      Slots
      Three lines they actually said | you write it | 
Their position on the map, and the target | you write it | 
The real problem, 3 to 4 sentences | you write it | 
Which stack layers are settled | you write it | 
What is riding on it, their figures | you write it | 
Fit, yes or no, and why | you write it | 
Next conversation, date and booking link | you write it | 
Call record and booking reference | in your data |

## Handoff, decisions and email 6 template

Your question, answered
    What you have to type
    Five of the six fire on their own, from data the booking already holds. The sixth cannot, and should not. Automate the transport, never the authorship.
      EmailWhen it firesWhat you type
      1 | Confirmation | Automatic, the second they book | Nothing | 
2 | New-booking alert | Automatic, the second they book | Nothing | 
3 | 24-hour reminder | Automatic, 24 hours before | Nothing | 
4 | 1-hour reminder | Automatic, 1 hour before | Nothing | 
5 | Post-call follow-up | Automatic, when the call ends and they showed up | Nothing | 
6 | The summary | You send it, within two working days | Five fields. About 15 minutes. | 
        Why email 6 is not automated
        Email 5 tells the client a summary is coming. If nothing follows it, the broken promise is what they remember. So the summary is a real email you write, and it is the one that decides whether the project happens.
        It is also the only place in the sequence where your thinking shows. Weiss calls it the summation: what you heard, what is at stake and what it is worth, agreed in writing before any proposal. Enns puts the value conversation before the number. That is why email 6 carries no price, no scope and no attachment, and ends with one more conversation rather than a document.
        Fifteen minutes with the template below, sent as a reply to email 5, while the call is still fresh.
        Set once, before it goes live
        Host the mint wordmark at /emails/wordmark-mint.png, exported at 464x70. Everything else is live text.
Set minimum notice to 24 hours on the event type, or delete the cutoff sentence in email 1. Never state a deadline the system will not hold.
Add one booking question: What made you book today? It fills the quote block in email 2 and hands you the first line of email 6.
Gate email 5 on the no-show flag, and wire the no-show copy below to the other branch.
Working-day offsets for the two dates in email 5, so a Friday call does not promise a Sunday summary.
Set reply-to to your own inbox. Three of these emails ask the client to reply.
Attach the .ics to email 1. The copy refers to it.
Save email 6 as a template in your mail client and send it as a reply to email 5, so the thread and the booking reference stay together.
        Email 6, fill-in template
        Copy template
      Subject: What I heard, and where I think the brand actually sits
[First name], here is what I heard.
Correct anything that is wrong. I would rather be corrected now than build on a wrong reading.
YOUR WORDS
1. "[the symptom in their own words]"
2. "[what they already tried, and what it did not change]"
3. "[what is at stake, in their words]"
WHERE I THINK [BRAND] SITS
Today: [the position a buyer actually reads: price level, and how distinctive]
Where [the goal] needs you: [the position that would hold]
The gap between those two is the work.
WHY THE LAST ATTEMPT DID NOT MOVE ANYTHING
Settled already: [identity / packaging / site, whatever they redrew]
Never settled: [position, story, message]
[3 to 4 sentences. Name the contradiction a customer or buyer is resolving for themselves.]
WHAT IS RIDING ON IT
- [the outcome they named]: [their figure]
- [the deadline they named]: [what missing it costs]
- [the cost of a third attempt]
FIT
[Yes, this is work I am the right fit for, because ...]
[or: No, and here is who I would send you to.]
THE NEXT 45 MINUTES
What [the outcome] is worth to [brand]. Before I put a number on anything, we work out what
holding [the price / the listing / the position] is worth and what missing it costs. I write
the proposal after that conversation, not before it.
Pick a time before [date]: [booking link]
I hold [n] slots that week. After [date] I release them.
No price. No deliverables list. No attachment.
    Before this ships
    Eight decisions that are yours, not the template's
    The copy makes promises in your name. Each one is a strength only if it is true.
    The follow-up promises a summary by a named date, and email 6 is that summary.It is the strongest line in the set and it is a debt you take on for every call you hold. If two working days is not realistic, change the offset before launch, not after the first miss.
The follow-up fires when the event ends, whether or not they showed up.'Here is what happens next' sent to a no-show is a mistake. Gate it on the no-show flag and send the alternate below.
The confirmation states a reschedule cutoff 24 hours before.Only keep it if you set the same minimum notice in the event type. A deadline the system does not enforce is a manufactured one.
The 1-hour email says you will be on the call 2 minutes early.A small, checkable promise. Keep it only if you will.
The emails say 'me, Vineeth'. Your data says 'With: Design Innsæit'.I used fixed copy. If anyone else ever takes these calls, make it a field.
The positioning map states a view before the client has agreed to it.That is the point. It gives them something to correct, which is how you find out whether they see their own category clearly. It also means you must actually have a read after 30 minutes. If you do not, send the map empty with the axes and ask them to place themselves.
'Why they booked' uses the booking form's notes field.When it is empty the block is dropped and the PREP line ends at the time. Your three intake questions are thin for a strategy engagement. Ask 'What made you book today?' and you get the symptom in their own words, which is the first line of email 6.
The live countdown GIF is only in the 1-hour email.Your plan put it in three. Days out, a ticking clock is decoration that Apple Mail freezes at delivery time. An hour out, it is the point. The other emails carry the same information as live text that cannot go stale.
      No-show variant of email 5
      Subject: We missed each other today
      Body: Jordan, I was on the call at 10:30am and did not see you. If the repositioning is still live, pick a new time by Friday 25 September. If I have not heard from you by then, I will close the enquiry.
      One button: Pick a new time. Same header, status line MISSED CALL, tracker stays on Join.
    Handoff
    For whoever implements this
      In the code
        Each preview has a Copy email HTML button. The copied markup swaps the embedded wordmark for {{WEBAPP_URL}}/emails/wordmark-mint.png. Export the mint wordmark at 464x70 and host it there. The one embedded here is cropped from your screenshot and is a stand-in.
        The old single TicketEmailHtml skeleton becomes shared blocks (header, tracker, tear, torn edge, stub, leaf, button, card grid, split bar, positioning map, brand stack, barcode, key-value rows, footer) and six small templates that compose them. The map and the stack take their values as props, so email 6 can be assembled from a form rather than hand-written HTML.
        Sample data is Jordan Lee, Acme Studio (home fragrance, UK), Monday 21 September 2026, 10:30am BST, 3:00pm IST. Every slot is tagged in the tables above as already in your data, derived from it, or fixed copy.
      New derived values
        Times are rendered in the recipient's timezone, with the other party's local time as a second line.
        Working-day offsets for the follow-up dates. Skip Saturdays and Sundays.
        The countdown block in email 4 is drawn as live text here. In production it is your signed GIF at 480x110, width 100%, with the start time lines above and below as the fallback. Set the GIF background to #FF006C.
        Square corners and square notches in Outlook desktop are accepted.
  Design Innsæit. Booking emails v6. Sample data only.
Email HTML copied
