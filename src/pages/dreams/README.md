# Dream Pages

Dream creation, editing, AI-powered planning, calibration, templates, vision boards, and sharing.

## Overview

| Screen | Route | Description |
|--------|-------|-------------|
| **DreamCreateScreen** | `/dream/create` | Create new dream with title, category, description, deadline |
| **DreamEditScreen** | `/dream/:id/edit` | Edit existing dream details |
| **DreamDetail** | `/dream/:id` | View dream progress, goals, tasks, obstacles, milestones |
| **DreamTemplatesScreen** | `/dream-templates` | Browse and use dream templates |
| **CalibrationScreen** | `/dream/:id/calibrate` | AI calibration Q&A to refine goal generation |
| **MicroStartScreen** | `/dream/:id/micro-start` | 2-minute starter framework (why/what/how) |
| **VisionBoardScreen** | `/dream/:id/vision` | DALL-E generated motivational images |
| **SharedDreamsScreen** | `/shared-dreams` | Dreams shared by other users |

---

## DreamCreateScreen.jsx

Create a new dream with AI-powered goal generation.

### Fields

| Field | Type | Validation |
|-------|------|-----------|
| `title` | string | Required, min 3 chars, sanitized |
| `category` | select | Required (career, health, finance, hobbies, growth, social) |
| `description` | textarea | Optional, sanitized |
| `deadline` | date | Optional |
| `visibility` | select | public / followers / private |

### Flow

1. User fills form → `POST /api/dreams/dreams/`
2. On success, navigates to dream detail or calibration

---

## DreamDetail.jsx

Comprehensive dream view with progress tracking and actions.

### Sections

- **Progress ring** — Circular progress visualization
- **Goals list** — Nested goals with completion status
- **Tasks** — Per-goal tasks with complete/skip actions
- **Obstacles** — Listed with resolve action
- **Milestones** — 25%, 50%, 75%, 100% progress markers
- **Actions** — Edit, share, export PDF, duplicate, archive, delete

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dreams/dreams/{id}/` | Dream detail with nested data |
| POST | `/api/dreams/tasks/{id}/complete/` | Complete a task (awards XP) |
| POST | `/api/dreams/tasks/{id}/skip/` | Skip a task |
| POST | `/api/dreams/goals/{id}/complete/` | Complete a goal |
| POST | `/api/dreams/obstacles/{id}/resolve/` | Resolve an obstacle |
| POST | `/api/dreams/dreams/{id}/complete/` | Mark dream completed |
| POST | `/api/dreams/dreams/{id}/duplicate/` | Deep-copy dream |
| POST | `/api/dreams/dreams/{id}/share/` | Share with another user |
| GET | `/api/dreams/dreams/{id}/export-pdf/` | Export as PDF |

---

## CalibrationScreen.jsx

AI calibration workflow — 7-15 contextual questions to refine goal generation.

### Flow

1. `POST /api/dreams/dreams/{id}/start_calibration/` — Get first batch of questions
2. User answers each question → `POST /api/dreams/dreams/{id}/answer_calibration/`
3. AI generates follow-up questions based on answers
4. `POST /api/dreams/dreams/{id}/skip_calibration/` — Skip remaining questions
5. `POST /api/dreams/dreams/{id}/generate_plan/` — Generate AI plan using calibration data

---

## MicroStartScreen.jsx

2-minute start framework to overcome procrastination.

### Flow

1. `POST /api/dreams/dreams/{id}/generate_two_minute_start/` — AI generates a micro-action
2. Displays: **Why** (motivation), **What** (specific micro-task), **How** (step-by-step)
3. User can mark as started or generate a new one

---

## VisionBoardScreen.jsx

DALL-E generated motivational images for dream visualization.

### Flow

1. `POST /api/dreams/dreams/{id}/generate_vision/` — Generate vision board image
2. Displays gallery of generated images
3. User can regenerate or save images

---

## DreamTemplatesScreen.jsx

Browse pre-built dream templates organized by category.

### Sections

- **Featured templates** — Curated selection
- **All templates** — Filterable by category
- **Template detail** — Preview goals and tasks before using

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dreams/dreams/templates/` | List templates (filterable by category) |
| GET | `/api/dreams/dreams/templates/featured/` | Featured templates |
| POST | `/api/dreams/dreams/templates/{id}/use/` | Create dream from template |

---

## SharedDreamsScreen.jsx

View dreams that have been shared with the current user.

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dreams/dreams/shared-with-me/` | List dreams shared with current user |

---

## DreamEditScreen.jsx

Edit existing dream details (title, description, category, deadline, visibility).

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/dreams/dreams/{id}/` | Update dream |
