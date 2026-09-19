// Generates the three importable n8n workflows in this folder. Run: node build-workflows.mjs
// Everything secret is a placeholder: n8n credentials are referenced by name and the Config node is edited
// inside n8n after import. Nothing here needs Data Tables, Variables or require('crypto').
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const here = (f) => new URL(f, import.meta.url);
const HMAC = readFileSync(here("./hmac-sha256.js"), "utf8");

const id = (name) => {
  const h = createHash("sha1").update(name).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const node = (name, type, typeVersion, position, parameters, extra = {}) => ({
  id: id(name),
  name,
  type,
  typeVersion,
  position,
  parameters,
  ...extra,
});

const code = (name, position, jsCode, extra) =>
  node(name, "n8n-nodes-base.code", 2, position, { jsCode }, extra);

const RETRY = { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };
const cred = (name) => ({ httpHeaderAuth: { id: "", name } });

const http = (name, position, method, url, { body, credential, full, retry = true, headers } = {}) => {
  const parameters = { method, url };
  if (credential) Object.assign(parameters, { authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth" });
  if (headers) {
    parameters.sendHeaders = true;
    parameters.headerParameters = { parameters: headers };
  }
  if (body) Object.assign(parameters, { sendBody: true, specifyBody: "json", jsonBody: body });
  if (full) parameters.options = { response: { response: { fullResponse: true, neverError: true } } };
  return node(name, "n8n-nodes-base.httpRequest", 4.2, position, parameters, {
    ...(credential ? { credentials: cred(credential) } : {}),
    ...(retry ? RETRY : {}),
  });
};

const connect = (pairs) => {
  const out = {};
  for (const [from, to, output = 0] of pairs) {
    out[from] ??= { main: [] };
    while (out[from].main.length <= output) out[from].main.push([]);
    out[from].main[output].push({ node: to, type: "main", index: 0 });
  }
  return out;
};

// ---------------------------------------------------------------- Workflow A: Cal.diy -> Recall bots
const CONFIG_A = `// Edit these values in n8n after importing. Nothing here is committed with real values.
const cfg = {
  calWebhookSecret: 'PASTE_THE_SECRET_YOU_SET_ON_THE_CAL_WEBHOOK',
  recallBaseUrl: 'https://us-east-1.recall.ai',            // region URL shown in the Recall.ai dashboard
  botName: 'Design Innsaeit Notetaker',
  calApiBase: 'https://designinnsaeit-calendar-production.up.railway.app/api/v2',
};
// Pass the trigger's item through untouched (the signature check needs its raw body).
const item = $input.first();
return [{ json: { ...item.json, ...cfg }, binary: item.binary }];
`;

const PICK_URL = `const pickUrl = (p) =>
  [p.videoCallData && p.videoCallData.url, p.metadata && p.metadata.videoCallUrl, p.meetingUrl, p.location]
    .find((u) => typeof u === 'string' && /^https?:\\/\\//.test(u));
// Recall only guarantees a scheduled join when join_at is 10+ minutes ahead; sooner means "join now".
const joinAtFor = (startIso) => (Date.parse(startIso) - Date.now() >= 10 * 60 * 1000 ? new Date(startIso).toISOString() : undefined);
`;

const PLAN_WEBHOOK = `${HMAC}
${PICK_URL}
const cfg = $('Config').first().json;
const item = $input.first();
const raw = await this.helpers.getBinaryDataBuffer(0, 'data');

if (!cfg.calWebhookSecret || cfg.calWebhookSecret.startsWith('PASTE_')) {
  throw new Error('Config node: set calWebhookSecret first');
}
const expected = hmacSha256Hex(cfg.calWebhookSecret, raw);
const given = String((item.json.headers || {})['x-cal-signature-256'] || '');
if (!timingSafeEqualStr(expected, given)) throw new Error('Invalid x-cal-signature-256, ignoring request');

const body = JSON.parse(new TextDecoder().decode(raw));
const p = body.payload || {};
const event = body.triggerEvent;
const store = $getWorkflowStaticData('global');
store.bots = store.bots || {};

const base = { recallBaseUrl: cfg.recallBaseUrl, botName: cfg.botName };
const out = [];
if (event === 'BOOKING_CREATED' || event === 'BOOKING_RESCHEDULED') {
  // cal.diy mints a new uid on reschedule, so the old booking's bot is removed and the new one created.
  const old = p.rescheduleUid && store.bots[p.rescheduleUid];
  if (old) out.push({ json: { ...base, action: 'delete', uid: p.rescheduleUid, botId: old.botId } });
  const url = pickUrl(p);
  if (p.status === 'ACCEPTED' && url && !store.bots[p.uid]) {
    out.push({ json: { ...base, action: 'create', uid: p.uid, meetingUrl: url, joinAt: joinAtFor(p.startTime), title: p.title, startTime: p.startTime, endTime: p.endTime } });
  }
} else if (event === 'BOOKING_CANCELLED') {
  const entry = store.bots[p.uid];
  if (entry) out.push({ json: { ...base, action: 'delete', uid: p.uid, botId: entry.botId } });
}
return out;
`;

const PLAN_SCHEDULE = `${PICK_URL}
const cfg = $('Config').first().json;
const store = $getWorkflowStaticData('global');
store.bots = store.bots || {};
const bookings = ($input.first().json.data || []);
const now = Date.now();
const base = { recallBaseUrl: cfg.recallBaseUrl, botName: cfg.botName };
const out = [];
const seen = {};

for (const b of bookings) {
  seen[b.uid] = b;
  const url = pickUrl(b);
  if (b.status === 'accepted' && url && Date.parse(b.end) > now && !store.bots[b.uid]) {
    out.push({ json: { ...base, action: 'create', uid: b.uid, meetingUrl: url, joinAt: joinAtFor(b.start), title: b.title, startTime: b.start, endTime: b.end } });
  }
}
for (const [uid, entry] of Object.entries(store.bots)) {
  const b = seen[uid];
  // Only remove when Cal says the booking is no longer live; a booking outside the query window is left alone.
  if (b && b.status !== 'accepted') out.push({ json: { ...base, action: 'delete', uid, botId: entry.botId } });
  // Forget finished meetings so the map cannot grow without bound.
  else if (entry.end && Date.parse(entry.end) < now - 24 * 60 * 60 * 1000) delete store.bots[uid];
}
return out;
`;

const REMEMBER = `const plan = $('Route action').item.json;
const store = $getWorkflowStaticData('global');
store.bots = store.bots || {};
store.bots[plan.uid] = { botId: $input.first().json.id, end: plan.endTime };
return [{ json: { uid: plan.uid, botId: store.bots[plan.uid].botId } }];
`;

const FORGET = `const plan = $('Route action').item.json;
const store = $getWorkflowStaticData('global');
if (store.bots) delete store.bots[plan.uid];
return [{ json: { uid: plan.uid, removed: true } }];
`;

const workflowA = {
  name: "Cal.diy booking to Recall.ai bot",
  nodes: [
    node("Cal webhook", "n8n-nodes-base.webhook", 2, [0, 200], {
      httpMethod: "POST",
      path: "cal-recall-CHANGE-ME",
      responseMode: "onReceived",
      options: { rawBody: true },
    }, { notes: "Change the path to a long random string. Use the PRODUCTION url as the Cal.diy webhook subscriber.", notesInFlow: true }),
    node("Daily check", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 460], {
      rule: { interval: [{ field: "days", daysInterval: 1, triggerAtHour: 6 }] },
    }, { notes: "Runs at 06:00 in the workflow timezone (Asia/Kolkata) and repairs any missed webhook.", notesInFlow: true }),
    code("Config", [240, 330], CONFIG_A, { notes: "Edit the values here after import.", notesInFlow: true }),
    node("Which trigger?", "n8n-nodes-base.switch", 3, [480, 330], {
      mode: "expression",
      numberOutputs: 2,
      output: "={{ $('Cal webhook').isExecuted ? 0 : 1 }}",
    }),
    code("Plan from webhook", [480, 200], PLAN_WEBHOOK),
    http("List Cal bookings", [480, 460], "GET",
      "={{ $json.calApiBase }}/bookings?status=upcoming,cancelled&take=100&afterStart={{ $now.minus({ days: 1 }).toISO() }}",
      { credential: "Cal API", headers: [{ name: "cal-api-version", value: "2024-08-13" }] }),
    code("Plan from Cal bookings", [720, 460], PLAN_SCHEDULE),
    node("Route action", "n8n-nodes-base.switch", 3, [960, 330], {
      mode: "expression",
      numberOutputs: 2,
      output: "={{ ['create', 'delete'].indexOf($json.action) }}",
    }),
    http("Create Recall bot", [1200, 200], "POST", "={{ $json.recallBaseUrl }}/api/v1/bot/", {
      credential: "Recall API",
      body: "={{ JSON.stringify({ meeting_url: $json.meetingUrl, bot_name: $json.botName, join_at: $json.joinAt, metadata: { calUid: $json.uid, title: $json.title, startTime: $json.startTime }, recording_config: { transcript: { provider: { recallai_streaming: {} } } } }) }}",
    }),
    code("Remember bot", [1440, 200], REMEMBER),
    http("Delete Recall bot", [1200, 460], "DELETE", "={{ $json.recallBaseUrl }}/api/v1/bot/{{ $json.botId }}/", {
      credential: "Recall API",
      full: true,
    }),
    node("Removed or already gone?", "n8n-nodes-base.switch", 3, [1440, 460], {
      mode: "expression",
      numberOutputs: 2,
      output: "={{ ($json.statusCode >= 200 && $json.statusCode < 300) || $json.statusCode === 404 ? 0 : 1 }}",
    }),
    http("Tell bot to leave call", [1680, 560], "POST",
      "={{ $('Route action').item.json.recallBaseUrl }}/api/v1/bot/{{ $('Route action').item.json.botId }}/leave_call/",
      { credential: "Recall API", full: true }),
    code("Forget bot", [1920, 460], FORGET),
  ],
  connections: connect([
    ["Cal webhook", "Config"],
    ["Daily check", "Config"],
    ["Config", "Which trigger?"],
    ["Which trigger?", "Plan from webhook", 0],
    ["Which trigger?", "List Cal bookings", 1],
    ["List Cal bookings", "Plan from Cal bookings"],
    ["Plan from webhook", "Route action"],
    ["Plan from Cal bookings", "Route action"],
    ["Route action", "Create Recall bot", 0],
    ["Route action", "Delete Recall bot", 1],
    ["Create Recall bot", "Remember bot"],
    ["Delete Recall bot", "Removed or already gone?"],
    ["Removed or already gone?", "Forget bot", 0],
    ["Removed or already gone?", "Tell bot to leave call", 1],
    ["Tell bot to leave call", "Forget bot"],
  ]),
  settings: { executionOrder: "v1", timezone: "Asia/Kolkata" },
};

// ---------------------------------------------------------------- Workflow B: Recall transcript -> Handshake
const CONFIG_B = `// Edit these values in n8n after importing.
const cfg = {
  recallWebhookToken: 'PASTE_A_RANDOM_TOKEN',     // also add ?token=<this> to the endpoint URL in the Recall.ai dashboard
  recallBaseUrl: 'https://us-east-1.recall.ai',    // same region URL as in the booking workflow
  handshakeRecordingsUrl: 'https://handshake.designinnsaeit.com/api/recordings',
};
const item = $input.first();
return [{ json: { ...item.json, ...cfg }, binary: item.binary }];
`;

const ONLY_DONE = `const cfg = $('Config').first().json;
const hook = $input.first().json;
if (!cfg.recallWebhookToken || cfg.recallWebhookToken.startsWith('PASTE_')) throw new Error('Config node: set recallWebhookToken first');
if ((hook.query || {}).token !== cfg.recallWebhookToken) throw new Error('Bad token on the Recall webhook, ignoring request');

const body = hook.body || {};
if (body.event !== 'bot.done') return [];
const bot = (body.data || {}).bot || {};
return [{ json: { botId: bot.id, metadata: bot.metadata || {} } }];
`;

const FIND_TRANSCRIPT = `const bot = $input.first().json;
const rec = (bot.recordings || [])[0];
const url = rec && rec.media_shortcuts && rec.media_shortcuts.transcript && rec.media_shortcuts.transcript.data && rec.media_shortcuts.transcript.data.download_url;
if (!url) throw new Error('No transcript yet for bot ' + bot.id + ', re-run this execution in a few minutes');
const meta = $('Only bot.done').first().json.metadata;
return [{ json: { url, botId: bot.id, title: meta.title, startTime: meta.startTime } }];
`;

const FORMAT = `const prev = $('Find transcript URL').first().json;
const segments = $input.all().map((i) => i.json);
const lines = [];
let last = null;
let lastEnd = 0;
for (const s of segments) {
  const name = (s.participant && s.participant.name) || 'Speaker';
  const words = s.words || [];
  const text = words.map((w) => w.text).join(' ').trim();
  if (!text) continue;
  const end = words.length ? (words[words.length - 1].end_timestamp || {}).relative || 0 : 0;
  if (end > lastEnd) lastEnd = end;
  if (name === last) lines[lines.length - 1] += ' ' + text;
  else lines.push(name + ': ' + text);
  last = name;
}
if (!lines.length) throw new Error('Transcript for bot ' + prev.botId + ' was empty');
return [{ json: {
  clientRef: 'recall:' + prev.botId,
  source: 'recall',
  transcriptSource: 'recall',
  title: prev.title || 'Recall meeting',
  transcript: lines.join('\\n'),
  recordedAt: prev.startTime,
  durationSec: lastEnd ? Math.round(lastEnd) : undefined,
} }];
`;

const workflowB = {
  name: "Recall.ai transcript to Handshake",
  nodes: [
    node("Recall webhook", "n8n-nodes-base.webhook", 2, [0, 200], {
      httpMethod: "POST",
      path: "recall-done-CHANGE-ME",
      responseMode: "onReceived",
      options: {},
    }, { notes: "Change the path to a long random string. In Recall.ai: Webhooks > add endpoint = production URL + ?token=<Config token>, event bot.done.", notesInFlow: true }),
    code("Config", [240, 200], CONFIG_B),
    code("Only bot.done", [480, 200], ONLY_DONE),
    http("Get bot", [720, 200], "GET", "={{ $('Config').first().json.recallBaseUrl }}/api/v1/bot/{{ $json.botId }}/", {
      credential: "Recall API",
    }),
    code("Find transcript URL", [960, 200], FIND_TRANSCRIPT),
    http("Download transcript", [1200, 200], "GET", "={{ $json.url }}"),
    code("Format transcript", [1440, 200], FORMAT),
    http("Send to Handshake", [1680, 200], "POST", "={{ $('Config').first().json.handshakeRecordingsUrl }}", {
      credential: "Handshake Worker",
      body: "={{ JSON.stringify($json) }}",
    }),
  ],
  connections: connect([
    ["Recall webhook", "Config"],
    ["Config", "Only bot.done"],
    ["Only bot.done", "Get bot"],
    ["Get bot", "Find transcript URL"],
    ["Find transcript URL", "Download transcript"],
    ["Download transcript", "Format transcript"],
    ["Format transcript", "Send to Handshake"],
  ]),
  settings: { executionOrder: "v1" },
};

// ---------------------------------------------------------------- Workflow C: error alert
const CONFIG_C = `// Edit after import: any URL that accepts a POST body, for example an ntfy topic URL.
return [{ json: { alertUrl: 'https://ntfy.sh/CHANGE-ME' } }];
`;

const workflowC = {
  name: "Recall.ai automation error alert",
  nodes: [
    node("Error Trigger", "n8n-nodes-base.errorTrigger", 1, [0, 200], {}),
    code("Config", [240, 200], CONFIG_C),
    http("Send alert", [480, 200], "POST", "={{ $json.alertUrl }}", {
      retry: false,
      body: "={{ JSON.stringify({ text: 'n8n workflow failed: ' + $('Error Trigger').first().json.workflow.name + ' - ' + (($('Error Trigger').first().json.execution || {}).error || {}).message }) }}",
    }),
  ],
  connections: connect([
    ["Error Trigger", "Config"],
    ["Config", "Send alert"],
  ]),
  settings: { executionOrder: "v1" },
};

// ---------------------------------------------------------------- validate and write
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Columns by distance from the trigger, rows by order, so the imported canvas is readable.
function layout(wf) {
  const targets = new Set(Object.values(wf.connections).flatMap(({ main }) => main.flat().map((c) => c.node)));
  const depth = new Map(wf.nodes.filter((n) => !targets.has(n.name)).map((n) => [n.name, 0]));
  for (let pass = 0; pass < wf.nodes.length; pass++) {
    for (const [from, { main }] of Object.entries(wf.connections)) {
      for (const c of main.flat()) depth.set(c.node, Math.max(depth.get(c.node) ?? 0, (depth.get(from) ?? 0) + 1));
    }
  }
  const rows = new Map();
  for (const n of wf.nodes) {
    const d = depth.get(n.name) ?? 0;
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    n.position = [d * 240, 200 + row * 140];
  }
}

function validate(wf) {
  const names = new Set(wf.nodes.map((n) => n.name));
  if (names.size !== wf.nodes.length) throw new Error(`${wf.name}: duplicate node names`);
  for (const [from, { main }] of Object.entries(wf.connections)) {
    if (!names.has(from)) throw new Error(`${wf.name}: connection from unknown node ${from}`);
    for (const outs of main) for (const c of outs) {
      if (!names.has(c.node)) throw new Error(`${wf.name}: connection to unknown node ${c.node}`);
    }
  }
  for (const n of wf.nodes) {
    if (n.type === "n8n-nodes-base.code") {
      // Wrapped like n8n does; only syntax is checked here, never executed.
      new AsyncFunction("$", "$input", "$getWorkflowStaticData", "$now", n.parameters.jsCode);
    }
  }
}

const outputs = [
  ["cal-to-recall.json", workflowA],
  ["recall-transcript.json", workflowB],
  ["recall-error-alert.json", workflowC],
];
for (const [file, wf] of outputs) {
  layout(wf);
  validate(wf);
  writeFileSync(here(`./${file}`), `${JSON.stringify(wf, null, 2)}\n`);
  console.log(`wrote ${file}: ${wf.nodes.length} nodes`);
}
