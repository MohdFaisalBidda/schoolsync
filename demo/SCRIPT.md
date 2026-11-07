# SchoolSync — demo video, script, and design reference

Master: `schoolsync-demo.mp4` — 1920×1080, 30 fps, H.264/AAC, 60.0 s final cut, rendered from the 96.0 s source at 1.6× speed. Thumbnail: `thumbnail.jpg` — 1280×720 title frame. Source animation: `index.html`, `styles.css`, `timeline.js`. Record/encode: `NODE_PATH="$PWD/node_modules" node demo/record.js`.

## Design pattern

**The spine: ask → draft → approval card → approve → publish → prove.**

The final video follows one operational loop. A small school request enters through phone chat, Switch routes it to a role agent, the agent drafts, the room posts a one-tap approval card, a person decides, and approved work reaches the classroom display or family/student surface.

### 1. Start with the flow

Open on the repeated work: a worksheet, notice, or activity. The title card shows the final flow: Phone chat → Switch → Approval → Classroom screen. In the first seconds the viewer should know what the product is and where Switch sits.

### 2. Show the real product

Use real SchoolSync screenshots at 1440×1000 inside browser frames. The Telegram panels are a legibility reconstruction, not a second product UI. Never replace the app with an invented mockup.

### 3. Make chat the entry point

The teacher, principal, or coordinator asks where they already work. Switch routes the addressed role agent; the agent drafts; the room posts the approval card; SchoolSync holds the decision.

### 4. Make the approval gate visible

The pivotal shot is the person reviewing the draft. Show the cursor, hotspot, approval card, and confirmation. Nothing publishes until a person approves.

### 5. Prove approved visibility

After approval, the approved worksheet, notice, or activity reaches the read-only classroom display or the family/student surface.

### 6. Earn the architecture

After the loop is proven, show Telegram → Switch → SchoolSync → role agents, with the approval gate and admin console visible at the governance edge.

### 7. Answer dependency, then promise

The close states what breaks without Switch: no shared room, no agent identity, no loop to approve. Then land the promise: “Less admin. More teaching.”

## Final 60-second cut

### Shot list

| Time | Scene | Visual | Beat |
| --- | --- | --- | --- |
| 0:00–0:05 | Title | SchoolSync title; Phone chat → Switch → Approval → Classroom screen; 3 rooms / 3 agents / 1 gate | Name the product, path, and stakes |
| 0:05–0:10 | Problem | Three waiting requests | Small work, human bottleneck |
| 0:10–0:19 | The ask | Teacher chat → agent draft → approval card | Chat starts the work |
| 0:19–0:25 | Approval | Teacher reviews draft; cursor, approval card, toast | A person makes the call |
| 0:25–0:29 | Proof | Approved worksheet on classroom display | Approval creates visibility |
| 0:29–0:39 | Notice | Principal asks; operations agent drafts; approval; approved families see it | The loop repeats for families |
| 0:39–0:48 | Activity | Coordinator asks; activities agent drafts; approval; students and families see it | The loop repeats for activities |
| 0:48–0:56 | Architecture | Telegram → Switch → SchoolSync → agents; approval gate; admin console | Show the platform and governance edge |
| 0:52.8–1:00.0 | Close | “One Switch. Every school loop.”; stats; orbit; dependency; pitch close; “Less admin. More teaching.” | Answer why Switch, then land the impact |

### 60-second voiceover

Read at a measured pace; the cut has room for pauses.

**0:00–0:05 — Title**
Every school day starts with small requests. SchoolSync is one chat, one agent, one human approval, built on Switch.

**0:05–0:10 — Problem**
A worksheet, a notice, an activity. Each needs a draft and a person who signs off. The work is small. The coordination is not.

**0:10–0:19 — The ask**
A teacher asks in Telegram. Switch routes to the teaching agent; it drafts a worksheet; the room posts a one-tap approval card; a person decides.

**0:19–0:25 — Approval**
The draft does not go to students. It waits for a person. The teacher checks the questions and answer key, then approves.

**0:25–0:29 — Proof**
Now it is visible: Grade 5, with the answer key, and only after approval.

**0:29–0:39 — Notice**
The same loop works for families. A principal asks for a notice; the operations agent drafts; a person approves; approved families see it.

**0:39–0:48 — Activity**
The same loop works for activities. A coordinator asks for a plan; the activities agent drafts; a person approves; students and families see it.

**0:48–0:56 — Architecture**
Under the hood, Telegram is the interface. Switch is the message bus and agent runtime. SchoolSync is the governance layer, including the admin console and optional web app for audit; the approval gate remains central.

**0:52.8–1:00.0 — Close**
SchoolSync runs on Switch. Phone chat asks, Switch routes, the room posts the approval card, a person approves, and the classroom screen publishes. Remove Switch and there is no shared room, no agent identity, no loop to approve. Ask in chat. Draft with agent. Approve as a person. Publish to classroom. Less admin. More teaching.

## Two-minute live pitch

Use this when presenting with two minutes and the ability to pause or hold the cut.

**0:00–0:12 — Hook**
Ask the audience to picture the end of a school day: three small requests, different chats, no single place to see what is waiting.

**0:12–0:30 — Problem**
Schools do not lack tools. They lack a safe path from chat request to approved action. The work is small, but coordination is expensive.

**0:30–0:55 — Teaching loop**
In Telegram, a teacher asks for a fractions worksheet. Switch routes it to the teaching agent. The agent drafts it in SchoolSync. The teacher reviews and approves. Only then does the student see it.

**0:55–1:20 — Repeat the loop**
A principal asks for a family notice; an operations agent drafts; a person approves; approved families see it. A coordinator asks for an activity; an activities agent drafts; a person approves; students and families see it. Same loop, different roles, same governance.

**1:20–1:42 — Architecture**
Telegram is the interface. Switch is the message bus and agent runtime. SchoolSync is the governance layer and human approval gate. No outbound message bypasses a person.

**1:42–2:00 — Close**
SchoolSync is built on Switch: chat where people work, agents where they help, and a human decision before anything reaches a student or family. Remove Switch and the loop loses its rooms, identities, and gate. Less admin. More teaching.

## Submission blurb

SchoolSync is a human-approved agentic school office built on Switch. Teachers, principals, and coordinators ask for work in Telegram; role-scoped agents coordinate through Switch rooms; a human approves through the one-tap approval card; approved content reaches the classroom display, family/student surfaces, or staff announcement flow. The demo follows one loop across teaching materials, family notices, and activities, and shows the admin console reviewing exceptions and the audit trail. Switch supplies the shared rooms, agent identities, and routing that make the loop possible. Less admin. More teaching.

## Rebuild

```bash
# The HTML animation needs a local server.
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo

# Record and encode (uses the system ffmpeg through Playwright's expected path).
cd /home/faisal/Gh-Projects/schoolsync
NODE_PATH="$PWD/node_modules" node demo/record.js
```

Playwright video requires `~/.cache/ms-playwright/ffmpeg-1013/ffmpeg-linux` to point at a system ffmpeg on this machine.
