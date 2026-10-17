/* ==========================================================
   MARK 40 — shared settings for every page. Edit me.
   Dates are local Saigon dates (YYYY-MM-DD, UTC+7).
   ========================================================== */
window.MARK40 = {
  // Paste your Google Apps Script web app URL here. Empty = preview mode (saves in the browser only).
  API_URL: "",

  // Vote-only mode (no backend yet): votes are sent from the site's own vote box into this Google Form.
  // While API_URL is empty and this is set, RSVPs show "opening soon". Values must match the form's choices exactly.
  VOTE_FORM: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfoNWXEmxFdriKa4mSjj1wkrOzfN9qFL-TuahYKZfnYJEvN-Q/formResponse",
    nameEntry: "entry.312490765",
    pickEntry: "entry.1234952263",
    values: { angkor: "Option 1 - Saigon & Siam Reap", danang: "Option 2 - Saigon & Da Nang" }
  },

  host: "Mark",
  title: "Mark 40",
  tzOffset: "+07:00",
  tzName: "Asia/Ho_Chi_Minh",

  start: "2027-07-18",   // everyone lands in Saigon
  end: "2027-07-26",     // everyone flies home from Saigon
  meet: "Saigon (Ho Chi Minh City), Vietnam",
  rsvpBy: "2027-03-01",

  // Approximate per-person budgets in AUD (flights from Melbourne, stays, food, activities). Subject to change.
  options: {
    angkor: { n: 1, label: "Option 1", name: "Saigon + Siem Reap", page: "angkor.html", budget: [1700, 2400], countries: "Vietnam · Cambodia", blurb: "Temples, markets and nightlife" },
    danang: { n: 2, label: "Option 2", name: "Saigon + Da Nang",   page: "danang.html", budget: [1400, 2500], countries: "Vietnam", blurb: "Beaches, lanterns and coastal vibes" }
  },

  // Rough breakdown per person in AUD: [label, [low, high] for option 1, [low, high] for option 2].
  // Shown in the FAQ with totals worked out automatically.
  breakdown: [
    ["Melbourne ↔ Saigon flights",     [600, 1000], [600, 1000]],
    ["Regional return flights",        [250, 330],  [80, 180]],
    ["Flight baggage allowance",       [60, 90],    [40, 100]],
    ["Visas",                          [110, 130],  [70, 80]],
    ["Accommodation, all 8 nights",    [200, 280],  [200, 400]],
    ["Food and drinks",                [180, 230],  [180, 300]],
    ["Local transport and transfers",  [70, 90],    [50, 110]],
    ["Activities and attractions",     [100, 140],  [80, 200]],
    ["Contingency",                    [100, 110],  [100, 150]]
  ],

  diet: ["No requirements","Vegetarian","Vegan","Pescatarian","Gluten-free","Dairy-free","Nut allergy","Shellfish allergy","Halal","Other"]
};
