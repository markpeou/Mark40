# Mark 40

Birthday trip site: a cover page and two option pages, static on GitHub Pages, with a free Google Apps Script backend that stores RSVPs and votes as JSON in your Google Drive and does the emailing.

```
index.html               cover: the plan, both options, budget, comparison, RSVP + vote
angkor.html              Option 1: Saigon + Siem Reap
danang.html              Option 2: Saigon + Da Nang
assets/config.js         shared settings: backend URL, dates, budgets, RSVP deadline  ← edit first
assets/mark40.css        all styles
assets/mark40.js         all behaviour: RSVP, vote, calendar, checklist, countdown, host view, monkey engine
assets/scene-angkor.js   Option 1 scenery (Angkor Wat at dawn)
assets/scene-danang.js   Option 2 scenery (Da Nang sunrise, Marble Mountains, lanterns, basket boat)
apps-script/Code.gs      backend: storage, invites, reminders, decision email
apps-script/appsscript.json
```

## What it does

- **Cover:** "Mark 40", the plan (18–26 July 2027, start and finish in Saigon), an animated route map, both options with Mark's pitch, a budget range chart, a side-by-side comparison, RSVP + vote, FAQ.
- **Option pages:** same structure each. Interactive hero scene, destinations (Saigon + the middle leg), getting there with visa steps, two places to stay, known costs, day-by-day week, checklist with due dates, RSVP + vote, FAQ. Switch between them from the header.
- **Vote:** name + Option 1 or Option 2, on every page. One vote per person, final. The backend blocks a second vote from the same device or the same name; you can remove a vote from the host view if someone needs to redo it. Results stay hidden until you close the vote from the host view, then everyone sees the split.
- **RSVP:** yes/no, name, email, dates, dietary needs and allergies, WhatsApp, notes. One RSVP across all three pages. Guests can change it any time.
- **Calendar:** Google and Outlook buttons and an `.ics` for Apple and everything else. The emailed invite covers 18–26 July in Saigon, which is true whichever option wins.
- **Reminders:** emailed digests before each deadline, matched to the guest's vote (or to the chosen option once decided), a "3 days to go" email, and RSVP nudges.
- **Host view:** add `#admin` to any page: live vote tally and who voted (repeated names flagged), a button to close or reopen the vote, heads per night, dietary summary, guest table, JSON download.
- **The jungle:** monkeys swing from the palms and sit on towers and pagodas. Tap them, toss bananas, drop coconuts, ripple the water. Option 2 adds lanterns that light up and a basket boat that spins.

Without the backend connected (`API_URL` empty), the site runs in preview mode and saves RSVPs in the browser only.

## Vote-only mode (no backend yet)

`VOTE_FORM_URL` in `assets/config.js` is set to a Google Form. While `API_URL` is empty, every page shows that form in the vote box (name + pick, saved to the form's Sheet) and the RSVP section says "RSVPs open soon". Once the backend below is set up, paste the `/exec` URL into `API_URL` and the on-site vote, RSVP and host view take over automatically.

## 1. Put the site on GitHub Pages

1. Create a repo, e.g. `mark40`, and add everything except `apps-script/` (it's harmless to include it, but it isn't served).
2. Settings → Pages → Deploy from a branch → `main` / root.
3. Your site is at `https://<username>.github.io/mark40/`.

## 2. Set up the backend (about 10 minutes)

1. Go to <https://script.google.com> → New project. Name it "Mark 40 RSVP".
2. Replace `Code.gs` with `apps-script/Code.gs`.
3. Project Settings → tick "Show appsscript.json manifest file" → paste `apps-script/appsscript.json`.
4. Edit `CONFIG` at the top of `Code.gs`: `SITE_URL` (your Pages URL with trailing slash), `ADMIN_KEY`, and optionally `INVITEES`.
5. Run `setup` from the function dropdown and authorise it. This creates `rsvps.json` in your Drive and a daily 9am reminder job.
6. Optional: run `testConfirmation` to email yourself a sample.
7. Deploy → New deployment → **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy. Copy the `/exec` URL.
8. Paste it into `API_URL` in `assets/config.js`. Commit and push.

**Changing Code.gs later:** Deploy → Manage deployments → pencil → Version: New version → Deploy. The URL stays the same.

## 3. Running the vote

1. Share the site. People vote with just their name, so it takes seconds.
2. Watch the tally at `yoursite/#admin`. Only you can see it while the vote is open.
3. When you're ready, tap **Close the vote and show results** (tap twice to confirm). Everyone now sees the split instead of the form. You can reopen it the same way.

## 4. When you pick the option

1. In `Code.gs` set `CHOSEN_OPTION: 'angkor'` or `'danang'` and deploy a new version.
2. Run `announceChoice` once. Every "yes" guest gets the decision, their deadlines for that option and a link to its page.

From then on, reminders follow the chosen option instead of each guest's vote. On the site, update the cover copy and FAQ to say which one won.

## 5. Edit the content

- Dates, deadline, budgets and backend URL: `assets/config.js`.
- Each page's itinerary, checklist and known costs: the `window.TRIP = {…}` block near the bottom of that page.
- Prose (destinations, stays, FAQ): plain HTML in each page.
- Checklist deadlines are listed twice, once on each page and once in `Code.gs`. Keep the dates in sync.

## Tradeoffs, honestly

- **Name-only voting.** Fast, but names aren't verified. The same device and the same name are blocked, but someone could still vote again from another phone under a different name. The host view lists every voter (with a Remove button) so you can sanity-check.
- **Storage.** One JSON file in your Drive, written under a lock. Fine for tens of guests.
- **Email limits.** A free Gmail account sends about 100 emails a day from Apps Script. Reminder digests combine items, so each guest gets at most one a day. `announceChoice` sends one email per guest, so run it on a quiet day if you have a big list.
- **No passwords.** Each guest's link carries a private token. Good enough for a birthday; don't collect anything sensitive.
- **Checklist ticks** are saved per device and per option page.
- **Facts to recheck before sending** (correct as of Oct 2026): Vietnam e-Visa US$25 single / US$50 multiple entry at evisa.xuatnhapcanh.gov.vn; Cambodia e-Visa US$30 at evisa.gov.kh; e-Arrival card due within 7 days of landing at arrival.gov.kh; Angkor 3-day pass US$62; Dragon Bridge fire show Saturdays and Sundays at 9pm.
