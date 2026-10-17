/**
 * Mark 40 — RSVP backend (Google Apps Script)
 *
 * Stores every RSVP and vote in one JSON file (rsvps.json) in your Google Drive,
 * runs the option vote (results hidden until you close it from SITE_URL#admin),
 * emails each guest a calendar invite and their deadlines, and sends a daily
 * reminder digest before each due date.
 *
 * Setup: see README.md. In short: paste this file, edit CONFIG, run setup(),
 * then Deploy → New deployment → Web app (Execute as: Me, Access: Anyone).
 */

const CONFIG = {
  EVENT_TITLE: 'Mark 40',
  HOST_NAME: 'Mark',
  SITE_URL: 'https://YOUR-USERNAME.github.io/YOUR-REPO/',   // trailing slash
  ADMIN_KEY: 'change-me-to-a-long-random-phrase',           // used at SITE_URL#admin
  LOCATION: 'Saigon (Ho Chi Minh City), Vietnam',
  TZ: 'Asia/Ho_Chi_Minh',
  START: '2027-07-18',
  END: '2027-07-26',
  RSVP_BY: '2027-03-01',

  // Leave empty while voting is open. Set to 'angkor' or 'danang' once decided,
  // deploy a new version, then run announceChoice() once.
  CHOSEN_OPTION: '',
  OPTIONS: {
    angkor: { label: 'Option 1', name: 'Saigon + Siem Reap', page: 'angkor.html' },
    danang: { label: 'Option 2', name: 'Saigon + Da Nang',   page: 'danang.html' }
  },

  // Keep in sync with the pages. only = which pick it applies to ('either' = undecided guests).
  // remind = days before the due date to email.
  MILESTONES: [
    { id: 'passport',  title: 'Check your passport',                 due: '2027-03-01', remind: [14, 3], detail: "Six months' validity from 18 July, plus blank pages." },
    { id: 'deposit',   title: 'Pay your deposit',                    due: '2027-03-15', remind: [7, 1],  detail: 'Reply to this email if you need the payment details again.' },
    { id: 'flights',   title: 'Book return flights to Saigon (SGN)', due: '2027-04-30', remind: [14, 3], detail: 'Land 18 July, fly home 26 July. Send Mark your flight times.' },
    { id: 'insurance', title: 'Buy travel insurance',                due: '2027-05-15', remind: [7, 1],  detail: 'Make sure it covers medical evacuation.' },
    { id: 'balance',   title: 'Pay the balance',                     due: '2027-06-30', remind: [7, 1],  detail: 'Whatever is left of your share of the accommodation and group activities.' },
    { id: 'vnvisa',    title: 'Apply for a Vietnam e-Visa (multiple entry)', due: '2027-07-01', remind: [14, 3], only: ['angkor'], detail: 'Choose multiple entry, US$50, because we leave Vietnam for Cambodia and come back: https://evisa.xuatnhapcanh.gov.vn/' },
    { id: 'vnvisa',    title: 'Apply for a Vietnam e-Visa',          due: '2027-07-01', remind: [14, 3], only: ['danang'], detail: 'Single entry, US$25, is enough: https://evisa.xuatnhapcanh.gov.vn/' },
    { id: 'vnvisa',    title: 'Apply for a Vietnam e-Visa',          due: '2027-07-01', remind: [14, 3], only: ['either'], detail: 'Multiple entry (US$50) if we go with option 1, single entry (US$25) for option 2: https://evisa.xuatnhapcanh.gov.vn/' },
    { id: 'khvisa',    title: 'Apply for your Cambodia e-Visa',      due: '2027-07-08', remind: [14, 3], only: ['angkor'], detail: 'US$30 on the official site: https://www.evisa.gov.kh/' },
    { id: 'earrival',  title: 'Submit your Cambodia e-Arrival card', due: '2027-07-20', remind: [6, 1],  only: ['angkor'], detail: 'Your window is open now (it opens 7 days before we land in Siem Reap): https://arrival.gov.kh/' }
  ],

  // Optional: invitee emails. Anyone here who hasn't RSVP'd gets a nudge before the deadline.
  INVITEES: [],
  NUDGE_DAYS_BEFORE_RSVP: [14, 3],
  TRIP_HEADS_UP_DAYS: 3,
  LINK_COOLDOWN_MIN: 10
};

/* ===================== HTTP ===================== */

function doPost(e) {
  let out;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = route_(body);
  } catch (err) {
    console.error(err);
    out = { ok: false, error: 'server', message: 'Something went wrong on our side. Try again in a minute.' };
  }
  return json_(out);
}
function doGet() { return json_({ ok: true, service: CONFIG.EVENT_TITLE }); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function route_(b) {
  switch (b.action) {
    case 'upsert':   return withLock_(() => upsert_(b));
    case 'get':      return get_(b);
    case 'sendLink': return withLock_(() => sendLink_(b));
    case 'export':   return export_(b);
    case 'vote':       return withLock_(() => vote_(b));
    case 'voteStatus': return voteStatus_(b);
    case 'removeVote': return withLock_(() => removeVote_(b));
    case 'closeVote':  return setVoteOpen_(b, false);
    case 'reopenVote': return setVoteOpen_(b, true);
    default:         return { ok: false, error: 'unknown_action' };
  }
}

/* ===================== Actions ===================== */

function upsert_(b) {
  const input = b.rsvp || {};
  if (input.website) return { ok: true, rsvp: input, token: 'x' }; // honeypot
  const r = clean_(input);
  const err = validate_(r);
  if (err) return { ok: false, error: 'invalid', message: err };

  const store = loadStore_();
  const prev = store.rsvps[r.email];
  if (prev && b.token !== prev.token) return { ok: false, error: 'exists' };

  const now = new Date().toISOString();
  const rec = Object.assign({}, prev, r, {
    token: prev ? prev.token : Utilities.getUuid(),
    createdAt: prev ? prev.createdAt : now,
    updatedAt: now,
    sequence: prev ? (prev.sequence || 0) + 1 : 0
  });
  store.rsvps[r.email] = rec;
  saveStore_(store);
  try { sendConfirmation_(rec, prev); } catch (e) { console.error('mail failed', e); }
  return { ok: true, rsvp: rec, token: rec.token };
}

function get_(b) {
  const email = String(b.email || '').trim().toLowerCase();
  const r = loadStore_().rsvps[email];
  if (!r || r.token !== b.token) return { ok: false, error: 'not_found' };
  return { ok: true, rsvp: r };
}

function sendLink_(b) {
  const email = String(b.email || '').trim().toLowerCase();
  const store = loadStore_();
  const r = store.rsvps[email];
  if (r) {
    const last = store.linkSent[email] || 0;
    if (Date.now() - last > CONFIG.LINK_COOLDOWN_MIN * 60000) {
      mail_(email, `Your ${CONFIG.EVENT_TITLE} RSVP link`,
        wrap_(`<p>Hi ${esc_(first_(r.name))},</p><p>Here's your private link to view or change your RSVP:</p>${button_(editLink_(r), 'Open my RSVP')}<p style="color:#666;font-size:13px">Didn't ask for this? You can ignore it.</p>`));
      store.linkSent[email] = Date.now();
      saveStore_(store);
    }
  }
  return { ok: true }; // same answer either way, so nobody can probe who's coming
}

function export_(b) {
  if (!b.key || b.key !== CONFIG.ADMIN_KEY) return { ok: false, error: 'forbidden' };
  const store = loadStore_();
  const rsvps = Object.values(store.rsvps).map(r => { const c = Object.assign({}, r); delete c.token; return c; });
  const votes = Object.keys(store.votes).map(id => Object.assign({ voter: id.slice(0, 6) }, store.votes[id]));
  return { ok: true, rsvps: rsvps, votes: votes, voteOpen: voteOpen_() };
}

/* ===================== Vote ===================== */

// One vote per person, final. Blocked two ways: the same device (a random id the browser keeps) and the same
// name (case and spacing ignored). Names aren't verified, so someone could still use another name on another
// device; the host view lists everyone who voted. Mark can remove a vote from #admin if needed.
function vote_(b) {
  if (b.website) return { ok: true }; // honeypot
  if (!voteOpen_()) return { ok: false, error: 'closed', results: tally_(loadStore_().votes) };
  const voter = String(b.voter || '');
  const name = String(b.name || '').trim().slice(0, 60);
  if (!/^[a-f0-9]{16,64}$/.test(voter)) return { ok: false, error: 'invalid', message: 'Something went wrong. Refresh the page and try again.' };
  if (!name) return { ok: false, error: 'invalid', message: 'Add your name so Mark knows who voted.' };
  if (!CONFIG.OPTIONS[b.option]) return { ok: false, error: 'invalid', message: 'Pick option 1 or option 2.' };
  const store = loadStore_();
  if (store.votes[voter]) return { ok: false, error: 'already', mine: { name: store.votes[voter].name, option: store.votes[voter].option } };
  const key = normName_(name);
  const clash = Object.keys(store.votes).some(id => normName_(store.votes[id].name) === key);
  if (clash) return { ok: false, error: 'name_taken', message: 'Someone has already voted with that name. If that was you, you\'re all set. If not, add your surname or message Mark.' };
  if (Object.keys(store.votes).length >= 500) return { ok: false, error: 'full', message: 'The vote is full. Message Mark instead.' };
  store.votes[voter] = { name: name, option: b.option, at: new Date().toISOString() };
  saveStore_(store);
  return { ok: true };
}
function normName_(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
// Host only: remove one vote (by the 6-character id shown in the export) so that person can vote again.
function removeVote_(b) {
  if (!b.key || b.key !== CONFIG.ADMIN_KEY) return { ok: false, error: 'forbidden' };
  const store = loadStore_(), id = String(b.id || '');
  const hits = id.length >= 6 ? Object.keys(store.votes).filter(k => k.indexOf(id) === 0) : [];
  if (hits.length !== 1) return { ok: false, error: 'not_found' };
  delete store.votes[hits[0]]; saveStore_(store);
  return { ok: true };
}
function voteStatus_(b) {
  const store = loadStore_(), open = voteOpen_(), mine = store.votes[String(b.voter || '')] || null;
  return { ok: true, open: open, mine: mine ? { name: mine.name, option: mine.option } : null, results: open ? null : tally_(store.votes) };
}
function setVoteOpen_(b, open) {
  if (!b.key || b.key !== CONFIG.ADMIN_KEY) return { ok: false, error: 'forbidden' };
  PropertiesService.getScriptProperties().setProperty('VOTE_CLOSED', open ? '' : '1');
  return { ok: true, open: open };
}
function voteOpen_() { return !PropertiesService.getScriptProperties().getProperty('VOTE_CLOSED'); }
function tally_(votes) {
  const t = {}; Object.keys(CONFIG.OPTIONS).forEach(k => t[k] = 0);
  Object.keys(votes).forEach(id => { const o = votes[id].option; if (t[o] != null) t[o]++; });
  return t;
}

/* ===================== Validation ===================== */

function clean_(i) {
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const r = {
    name: s(i.name, 80),
    email: s(i.email, 120).toLowerCase(),
    attending: i.attending === 'yes' ? 'yes' : i.attending === 'no' ? 'no' : '',
    preference: ['angkor', 'danang', 'either'].indexOf(i.preference) !== -1 ? i.preference : '',
    arrive: s(i.arrive, 10),
    depart: s(i.depart, 10),
    dietary: (Array.isArray(i.dietary) ? i.dietary : []).slice(0, 12).map(d => s(d, 40)).filter(Boolean),
    dietaryNotes: s(i.dietaryNotes, 500),
    phone: s(i.phone, 30),
    notes: s(i.notes, 500)
  };
  if (r.attending === 'no') { r.arrive = ''; r.depart = ''; r.preference = ''; }
  return r;
}

function validate_(r) {
  if (!r.name) return 'Add your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email)) return 'Check your email address.';
  if (!r.attending) return 'Choose whether you can make it.';
  if (r.attending === 'yes') {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(r.arrive) || !re.test(r.depart)) return 'Add your arrival and leaving dates.';
    if (r.depart <= r.arrive) return 'Your leaving date needs to be after your arrival.';
    if (r.arrive < CONFIG.START || r.depart > CONFIG.END) return 'Pick dates within the trip.';
  }
  return null;
}

/* ===================== Storage (JSON file in Drive) ===================== */

function loadStore_() {
  const s = JSON.parse(storeFile_().getBlob().getDataAsString() || '{}');
  s.rsvps = s.rsvps || {}; s.sent = s.sent || {}; s.linkSent = s.linkSent || {}; s.votes = s.votes || {};
  return s;
}
function saveStore_(s) { storeFile_().setContent(JSON.stringify(s, null, 2)); }
function storeFile_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('STORE_ID');
  if (id) { try { return DriveApp.getFileById(id); } catch (e) { /* recreate below */ } }
  const f = DriveApp.createFile('rsvps.json', JSON.stringify({ rsvps: {}, votes: {}, sent: {}, linkSent: {} }, null, 2), 'application/json');
  props.setProperty('STORE_ID', f.getId());
  return f;
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ===================== Options and deadlines ===================== */

// The option that decides this guest's reminders: the chosen one once decided, else their vote.
function track_(r) { return CONFIG.CHOSEN_OPTION || r.preference || 'either'; }
function milestonesFor_(r) {
  const t = track_(r);
  return CONFIG.MILESTONES.filter(m => !m.only || m.only.indexOf(t) !== -1);
}
function prefName_(p) {
  if (p === 'either') return 'Happy with either';
  const o = CONFIG.OPTIONS[p]; return o ? o.label + ': ' + o.name : '';
}

/* ===================== Email + calendar ===================== */

function sendConfirmation_(r, prev) {
  const yes = r.attending === 'yes';
  const wasYes = prev && prev.attending === 'yes';
  const files = [];
  const organizer = { name: CONFIG.HOST_NAME, email: Session.getEffectiveUser().getEmail() };
  const attendee = { name: r.name, email: r.email };

  if (yes) {
    files.push(Utilities.newBlob(buildICS_('REQUEST', [tripEvent_(r)], organizer, attendee), 'text/calendar; method=REQUEST; charset=UTF-8', 'invite.ics'));
    files.push(Utilities.newBlob(buildICS_('PUBLISH', deadlineEvents_(r)), 'text/calendar; charset=UTF-8', 'trip-deadlines.ics'));
  } else if (wasYes) {
    files.push(Utilities.newBlob(buildICS_('CANCEL', [tripEvent_(Object.assign({}, prev, { sequence: r.sequence }))], organizer, attendee), 'text/calendar; method=CANCEL; charset=UTF-8', 'cancel.ics'));
  }

  const changed = !!prev;
  const subject = yes
    ? (changed ? `Updated: your ${CONFIG.EVENT_TITLE} RSVP` : `You're in: ${CONFIG.EVENT_TITLE}, ${range_(r.arrive, r.depart)}`)
    : 'Thanks for letting us know';

  let body = `<p>Hi ${esc_(first_(r.name))},</p>`;
  if (yes) {
    const vote = CONFIG.CHOSEN_OPTION
      ? `<p><b>We're going with:</b> ${esc_(prefName_(CONFIG.CHOSEN_OPTION))}</p>`
      : `<p>Haven't voted for an option yet? <a href="${CONFIG.SITE_URL}#vote">Vote here</a>. Mark will let everyone know which one wins.</p>`;
    body += `<p>${changed ? 'Your RSVP is updated.' : "You're coming to " + esc_(CONFIG.HOST_NAME) + "'s 40th!"}</p>
      <p><b>Your dates:</b> ${esc_(long_(r.arrive))} to ${esc_(long_(r.depart))}, starting and finishing in Saigon.</p>
      ${vote}
      <p>The attached <b>invite.ics</b> adds the trip to your calendar. <b>trip-deadlines.ics</b> adds each deadline with reminders. Open either attachment on your phone or computer.</p>
      <h3 style="font-family:Georgia,serif;font-weight:normal">Coming up</h3>${upcomingList_(r)}`;
  } else {
    body += `<p>${wasYes ? "We've taken you off the trip and sent a calendar cancellation." : "You'll be missed."} If plans change, you can update your RSVP any time.</p>`;
  }
  body += button_(editLink_(r), 'View or change my RSVP');
  mail_(r.email, subject, wrap_(body), files);
}

function tripEvent_(r) {
  return {
    uid: `trip-${r.token}@mark40`, seq: r.sequence || 0, allDay: true,
    start: r.arrive || CONFIG.START, end: r.depart || CONFIG.END,
    summary: `${CONFIG.EVENT_TITLE} · Saigon`, location: CONFIG.LOCATION,
    description: `${CONFIG.HOST_NAME}'s 40th. Starts and finishes in Saigon.\nYour dates: ${long_(r.arrive)} to ${long_(r.depart)}.\nDetails and changes: ${editLink_(r)}`,
    alarms: ['-P14D', '-PT15H']
  };
}

function deadlineEvents_(r) {
  const page = (CONFIG.OPTIONS[track_(r)] || {}).page || '';
  return milestonesFor_(r).map(m => ({
    uid: `ms-${m.id}-${r.token}@mark40`, allDay: true, start: m.due,
    summary: `${m.title} (${CONFIG.EVENT_TITLE})`, description: m.detail + `\n${CONFIG.SITE_URL}${page}#dates`,
    alarms: ['-P6DT15H', '-PT15H']
  }));
}

function upcomingList_(r) {
  const t = today_();
  const items = milestonesFor_(r).filter(m => daysBetween_(t, m.due) >= 0).sort((a, b) => a.due < b.due ? -1 : 1);
  if (!items.length) return '<p>Nothing due. Just pack!</p>';
  return '<ul style="padding-left:18px">' + items.map(m =>
    `<li style="margin-bottom:6px"><b>${esc_(short_(m.due))}</b> · ${esc_(m.title)}<br><span style="color:#666">${esc_(m.detail)}</span></li>`).join('') + '</ul>';
}

function buildICS_(method, events, organizer, attendee) {
  const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const cn = s => '"' + String(s || '').replace(/"/g, '') + '"';
  const date = d => d.replace(/-/g, '');
  const utc = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const fold = l => { const o = []; while (l.length > 73) { o.push(l.slice(0, 73)); l = ' ' + l.slice(73); } o.push(l); return o.join('\r\n'); };
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mark 40//RSVP//EN', 'CALSCALE:GREGORIAN', 'METHOD:' + method];
  const stamp = utc(Date.now());
  events.forEach(e => {
    L.push('BEGIN:VEVENT', 'UID:' + e.uid, 'DTSTAMP:' + stamp, 'SEQUENCE:' + (e.seq || 0));
    L.push('DTSTART;VALUE=DATE:' + date(e.start), 'DTEND;VALUE=DATE:' + date(addDays_(e.end || e.start, 1)));
    L.push('SUMMARY:' + esc(e.summary));
    if (e.description) L.push('DESCRIPTION:' + esc(e.description));
    if (e.location) L.push('LOCATION:' + esc(e.location));
    if (organizer) L.push('ORGANIZER;CN=' + cn(organizer.name) + ':mailto:' + organizer.email);
    if (attendee) L.push('ATTENDEE;CN=' + cn(attendee.name) + ';ROLE=REQ-PARTICIPANT;PARTSTAT=' + (method === 'CANCEL' ? 'DECLINED' : 'ACCEPTED') + ';RSVP=FALSE:mailto:' + attendee.email);
    L.push('STATUS:' + (method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'));
    if (method !== 'CANCEL') (e.alarms || []).forEach(a => L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.summary), 'TRIGGER:' + a, 'END:VALARM'));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

/* ===================== Daily reminders ===================== */

function dailyReminders() {
  withLock_(() => {
    const store = loadStore_();
    const t = today_();
    const going = Object.values(store.rsvps).filter(r => r.attending === 'yes');
    let sent = 0;

    // 1) Deadline digests: one email per guest per day, listing everything due soon for their option.
    going.forEach(r => {
      const due = [];
      milestonesFor_(r).forEach(m => {
        const n = daysBetween_(t, m.due);
        if ((m.remind || [7, 1]).indexOf(n) === -1) return;
        const key = [m.id, n, r.email, m.due].join('|');
        if (store.sent[key]) return;
        store.sent[key] = t;
        due.push({ m: m, n: n });
      });
      if (!due.length) return;
      const list = '<ul style="padding-left:18px">' + due.map(x =>
        `<li style="margin-bottom:8px"><b>${esc_(x.m.title)}</b>, due ${esc_(long_(x.m.due))} (${x.n === 1 ? 'tomorrow' : 'in ' + x.n + ' days'})<br><span style="color:#666">${esc_(x.m.detail)}</span></li>`).join('') + '</ul>';
      const subj = due.length === 1 ? `Reminder: ${due[0].m.title}` : `${due.length} trip things due soon`;
      const page = (CONFIG.OPTIONS[track_(r)] || {}).page || '';
      mail_(r.email, `${subj} · ${CONFIG.EVENT_TITLE}`,
        wrap_(`<p>Hi ${esc_(first_(r.name))},</p><p>Quick nudge for the trip:</p>${list}<p>Already done? Tick it off on your checklist.</p>${button_(CONFIG.SITE_URL + page + '#dates', 'Open my checklist')}`));
      sent++;
    });

    // 2) "See you soon" before each guest's arrival.
    going.forEach(r => {
      if (daysBetween_(t, r.arrive) !== CONFIG.TRIP_HEADS_UP_DAYS) return;
      const key = ['headsup', r.email, r.arrive].join('|');
      if (store.sent[key]) return;
      store.sent[key] = t;
      const kh = track_(r) === 'angkor' ? '<li>Cambodia e-Visa and e-Arrival card done (<a href="https://arrival.gov.kh/">arrival.gov.kh</a>)</li><li>Small US dollar notes for Cambodia</li>' : '';
      mail_(r.email, `${CONFIG.TRIP_HEADS_UP_DAYS} days to go · ${CONFIG.EVENT_TITLE}`,
        wrap_(`<p>Hi ${esc_(first_(r.name))},</p><p>You land in Saigon on <b>${esc_(long_(r.arrive))}</b>. Last checks:</p>
          <ul><li>Vietnam e-Visa printed or saved offline</li>${kh}<li>Grab app installed for rides</li><li>A light rain jacket, and clothes that cover shoulders and knees for temples</li><li>Your flight times sent to ${esc_(CONFIG.HOST_NAME)}</li></ul>
          ${button_(editLink_(r), 'Trip details')}`));
      sent++;
    });

    // 3) RSVP nudges for invitees who haven't replied.
    const n = daysBetween_(t, CONFIG.RSVP_BY);
    if (CONFIG.NUDGE_DAYS_BEFORE_RSVP.indexOf(n) !== -1) {
      CONFIG.INVITEES.map(e => String(e).trim().toLowerCase()).filter(e => e && !store.rsvps[e]).forEach(e => {
        const key = ['nudge', n, e].join('|');
        if (store.sent[key]) return;
        store.sent[key] = t;
        mail_(e, `Vote, then RSVP by ${short_(CONFIG.RSVP_BY)}: ${CONFIG.EVENT_TITLE}`,
          wrap_(`<p>Hi!</p><p>${esc_(CONFIG.HOST_NAME)}'s 40th is nine days in Southeast Asia, ${esc_(range_(CONFIG.START, CONFIG.END))}, starting and finishing in Saigon. There are two options for the middle of the trip, so please vote, and RSVPs close in ${n} days.</p>${button_(CONFIG.SITE_URL + '#vote', 'Vote and RSVP')}`));
        sent++;
      });
    }

    saveStore_(store);
    console.log('Reminders sent: ' + sent);
  });
}

/* ===================== One-time jobs ===================== */

/** Run once from the editor: creates rsvps.json and the daily 9am reminder trigger. */
function setup() {
  const f = storeFile_();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyReminders').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyReminders').timeBased().everyDays(1).atHour(9).inTimezone(CONFIG.TZ).create();
  console.log('Store: ' + f.getUrl());
  console.log('Daily reminders scheduled for 9am ' + CONFIG.TZ + '. Mail quota left today: ' + MailApp.getRemainingDailyQuota());
}

/**
 * Run once after you set CHOSEN_OPTION and deploy a new version.
 * Emails every "yes" guest the decision, their updated deadlines and a link to the option page.
 */
function announceChoice() {
  const o = CONFIG.OPTIONS[CONFIG.CHOSEN_OPTION];
  if (!o) throw new Error("Set CHOSEN_OPTION to 'angkor' or 'danang' first.");
  withLock_(() => {
    const store = loadStore_();
    let n = 0;
    Object.values(store.rsvps).filter(r => r.attending === 'yes').forEach(r => {
      const ics = buildICS_('PUBLISH', deadlineEvents_(r));
      mail_(r.email, `It's decided: ${o.name} · ${CONFIG.EVENT_TITLE}`,
        wrap_(`<p>Hi ${esc_(first_(r.name))},</p><p>The votes are in. We're going with <b>${esc_(o.label)}: ${esc_(o.name)}</b>.</p>
          <h3 style="font-family:Georgia,serif;font-weight:normal">What to do next</h3>${upcomingList_(r)}
          <p>The attached file adds these deadlines to your calendar.</p>${button_(CONFIG.SITE_URL + o.page, 'See the plan')}`),
        [Utilities.newBlob(ics, 'text/calendar; charset=UTF-8', 'trip-deadlines.ics')]);
      n++;
    });
    console.log('Announced to ' + n + ' guests');
  });
}

/** Optional: email yourself a sample confirmation to check how it looks. */
function testConfirmation() {
  const me = Session.getEffectiveUser().getEmail();
  sendConfirmation_({ name: CONFIG.HOST_NAME + ' (test)', email: me, attending: 'yes', preference: 'either', arrive: CONFIG.START, depart: CONFIG.END, token: 'test-token', sequence: 0 }, null);
}

/* ===================== Helpers ===================== */

function mail_(to, subject, html, attachments) {
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: CONFIG.EVENT_TITLE, attachments: attachments || [] });
}
function editLink_(r) { return CONFIG.SITE_URL + '?e=' + encodeURIComponent(r.email) + '&t=' + encodeURIComponent(r.token); }
function button_(href, label) {
  return `<p style="margin:22px 0"><a href="${href}" style="background:#a5550f;color:#fffaf2;padding:12px 18px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block">${esc_(label)}</a></p>`;
}
function wrap_(inner) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1c261b;max-width:560px">
    <p style="font-family:Georgia,serif;font-size:22px;color:#33502e;margin:0 0 16px">Mark <span style="color:#a5550f">40</span></p>${inner}
    <p style="color:#777;font-size:12px;border-top:1px solid #ddd;padding-top:12px;margin-top:28px">${esc_(range_(CONFIG.START, CONFIG.END))} · Start and finish in Saigon</p></div>`;
}
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function first_(n) { return String(n || '').split(' ')[0]; }
function today_() { return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd'); }
function addDays_(d, n) { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function daysBetween_(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
function asDate_(d) { return new Date(d + 'T12:00:00Z'); }
function short_(d) { return Utilities.formatDate(asDate_(d), 'UTC', 'd MMM'); }
function long_(d) { return d ? Utilities.formatDate(asDate_(d), 'UTC', 'EEE d MMM yyyy') : ''; }
function range_(a, b) { return Utilities.formatDate(asDate_(a), 'UTC', 'd') + '–' + Utilities.formatDate(asDate_(b), 'UTC', 'd MMMM yyyy'); }
