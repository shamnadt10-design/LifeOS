# LifeOS MVP — Android / Acode edition

This is a larger, local-first LifeOS web MVP made with plain HTML, CSS, and JavaScript. It runs without a build step or terminal and can be edited directly in Acode.

## Setup
1. Download and extract `LifeOS-MVP.zip`.
2. In Acode, tap **Open folder** and select the extracted `LifeOS-MVP` folder.
3. Open `index.html` and launch Acode Preview.
4. If the preview does not persist data between reloads, try Acode's local preview server/plugin or open it from a stable local HTTP origin. Browser storage is scoped to the origin.

## Working in this version
- Responsive dashboard, desktop sidebar, mobile bottom navigation.
- Tasks: create/edit/complete/delete, priority, due date, description, project link, filters, sorting.
- Projects: create/edit/delete, status, due date, progress calculated from linked tasks.
- Notes: create/edit/delete, content, folder, comma-separated tags, search.
- Goals: measurable progress, target/unit, due date, progress updates.
- Habits: daily check-in history and streak count.
- Planning: monthly deadline calendar sourced from task due dates.
- Universal search across tasks, projects, notes, goals, and habits.
- Dark/light theme, workspace name, JSON export/import, reset confirmation.
- Browser-local persistence and empty/loading-free local UI states.

## Limitations — please read
- This is a functional local MVP, **not production SaaS**.
- Data lives in this browser's `localStorage`. It is not encrypted, cloud-synced, or backed up. Clearing browser/site data may permanently remove it. Export JSON backups regularly.
- Import replaces current data; export before importing if you need a safety copy.
- No authentication, Supabase, Row Level Security, multi-user permissions, AI provider, push notifications, scheduled time blocks, recurring tasks, attachments, or automated tests are included.
- Local storage is not suitable for sensitive secrets. Never store passwords, recovery codes, or highly sensitive personal information here.
- Google Fonts are optional and require internet; system font fallbacks are included.

## Recommended next milestone
Verify CRUD and export/import on your device. Then move the data layer to a typed, tested architecture. Because Acode alone is an editor and preview environment, the production architecture and deployment path should be chosen based on the available Android workflow before migrating to Next.js/Supabase.
