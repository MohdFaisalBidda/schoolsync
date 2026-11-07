# SchoolSync

A human-approved agentic school office built for the [Flip the Switch](https://www.wemakedevs.org/hackathons/switch) hackathon.

Teachers, principals, coordinators, and families work in **Telegram**. Role-scoped agents coordinate through **Switch rooms**. Every draft waits for a **human approval**, posted back into the room as a one-tap approval card and decided in SchoolSync before approved work reaches the classroom display or family/student view. The same loop covers classroom materials, school notices, and activities: one chat for every classroom, less admin, one approval gate.

## Standard flow

1. **Phone chat** — staff or a teacher writes the request in the chat they already use, naming the classroom or function.
2. **Switch** — the request lands in the right Switch room and the role-scoped agent drafts the output there.
3. **Approval** — Switch relays the draft and the room posts a one-tap approval card; SchoolSync stores the decision and reviewer.
4. **Publish** — approved work reaches the read-only classroom display, family/student surfaces, or staff announcement flow.

No new staff app is required for routine work. The staff workflow stays in chat, with one human approval and one publish surface.

## What it does

| Role | Request | Agent output | Approval |
| --- | --- | --- | --- |
| Teacher | Worksheet, quiz or lesson plan | Teaching agent draft | Teacher or admin approves; students see it |
| Principal | School-wide notice | Operations agent draft | Principal approves; the notice is distributed to the operations room and families see it |
| Coordinator | Activity or event plan | Activities agent draft | Coordinator approves; the plan is announced in the activities room and students see it |

Agents address the people who linked their chat account to Switch, so only the agent's owner can direct its work. The web app is the governance layer: it stores the source record, shows the room conversation, and keeps the approval gate visible.

## Why Switch is central

Switch is not a notification sidecar in this project. It is the shared workspace where the work happens.

- Each school function is a Switch room: `classroom`, `operations`, and `activities`.
- Each role is a Switch agent with its own identity and owner scope.
- A request from Telegram or the app is posted into the room; the addressed agent replies there, and the draft is stored with the request.
- The app shows the room conversation beside the approval, so a reviewer can see what was asked, what the agent produced, and who is deciding.
- Remove Switch and the loop breaks: there is no shared room for the app and agents to meet, no role-scoped identity to address, and no agent conversation to approve from.

The approval gate itself lives in the SchoolSync web app. Switch is the message bus and agent runtime that make the gate meaningful.

## Architecture

- **`app/`** — Next.js 16 (App Router), React 19, Tailwind v4, Prisma/PostgreSQL. Auth is a signed session cookie; roles are enforced in server actions and pages.
- **Switch** — the message bus and agent runtime. Each purpose has a Switch room (`classroom`, `operations`, `activities`) and an agent identity.
- **Telegram bridge** — one bot fronts the three groups; Switch maps each Telegram group to a room and relays agent replies.
- **Agent host** — a small TypeScript process per role. It speaks the Switch agent protocol and generates drafts through a provider CLI:
  - `opencode` (default when available)
  - `codex`
  - `claude`
  - `gemini`
  - `ollama`
  - `auto` picks OpenCode, then Gemini, then Ollama.

The web app never calls a model directly. It posts an addressed request to the room, waits for the agent's reply, and stores the result with the requester and approval metadata.

## Demo

<video src="demo/schoolsync-demo.mp4" controls width="640" />

- `demo/schoolsync-demo.mp4` — 60-second final cut, rendered from the 96-second source at 1.6× speed, with the Switch loop, the three workflows, the in-chat approval card, the classroom display, the admin console, and the architecture.
- `demo/SCRIPT.md` — shot list, 60-second voiceover, two-minute live pitch, design reference, and submission blurb.
- `demo/` — HTML animation, real app screenshots, and the Playwright/ffmpeg recording script.

## Run locally

Prerequisites: Node 20+, Docker, PostgreSQL, and the Switch stack with its gateway and collaboration bridge.

1. Clone the Switch stack and start local infrastructure:

   ```bash
   git clone <switch-repo>
   cd switch
   just init-env
   just up
   just run
   ```

2. Clone the agent host used by the three Switch agents and start the teaching, operations, and activities agents. The SchoolSync app expects three registered Switch agents and their tokens.

3. Clone SchoolSync and set up its local environment:

   ```bash
   git clone <schoolsync-repo>
   cd schoolsync
   cp .env.example .env.local
   ```

4. Configure the database, Switch connection, agent room ids, agent tokens, approval link secret, display key, and demo password in `.env.local`.

5. Install dependencies, migrate the database, seed demo data, and start the app:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run build
   npm run start -- -p 3100
   ```

6. Start the three agents from the agent host, one per role:

   ```bash
   npm run start:teaching
   npm run start:operations
   npm run start:activities
   ```

## Pitch

SchoolSync keeps the familiar school workflow and adds an agentic first draft behind one human approval.

- **Hook:** Ask for a worksheet, notice, or activity in the chat your staff already uses.
- **Loop:** Switch routes the request to the right role agent; the agent drafts; the room posts a one-tap approval card; a person approves or returns it.
- **Proof:** Approved work reaches the classroom display and family/student surfaces, or the staff announcement flow.
- **Close:** Less admin. More teaching.

The two-minute pitch follows the same spine: hook, problem, teaching loop, repeated loops, architecture, close. The submitted demo uses the 64-second cut.

## Demo accounts

All demo accounts use the password in `DEMO_PASSWORD`.

| Account | Role |
| --- | --- |
| `admin@schoolsync.local` | Admin; sees every approval and can act on any of them |
| `principal@schoolsync.local` | Principal; notices |
| `teacher@schoolsync.local` | Teacher; classroom material |
| `coordinator@schoolsync.local` | Coordinator; activities |
| `student@schoolsync.local` | Student; approved, grade-matched work only |
| `parent@schoolsync.local` | Parent; approved notices and activities |

## Demo flow

1. **Classroom** — a teacher writes a worksheet request in the classroom chat, the teaching agent drafts it, and the room posts a one-tap approval card. A teacher approves it; the approved worksheet appears in the classroom display and student view.
2. **Operations** — a principal writes a notice request, the operations agent drafts it, and the room posts an approval card. The principal approves and distributes it; approved families see it.
3. **Activities** — a coordinator writes an activity plan, the activities agent drafts it, and the room posts an approval card. The coordinator approves it; the approved activity reaches the student and staff announcement surfaces.
4. **Admin console** — the admin console reviews exceptions, distributions, audit history, and room mapping while routine work stays in chat.

## Notes and limits

- The agent is owner-scoped by default. Link the Telegram account to the owner's Switch user, or the agent will refuse the request. In this demo the owner is the admin account.
- Claude Code and Codex are supported providers, but they need working account quota/model access. The demo agents run on OpenCode through an OpenRouter key, with Ollama as a local fallback.
- Telegram privacy mode must be off, or the bot must be an administrator in each group, for it to follow ordinary conversation. Mentions still work without that.
- The web app is a companion, not the primary chat surface. The workflow is designed to run from the Telegram rooms, where the one-tap approval card is posted; SchoolSync stores the decision and publishes approved work to the display or family/student surfaces.
