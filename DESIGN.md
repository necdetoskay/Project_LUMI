# Project LUMI — Design System & UI Specification

> **Platform:** Web (Next.js 16 App Router + React 19)
> **Styling:** Tailwind CSS v4
> **Language:** Turkish (tr)
> **Target:** Parents (web dashboard) & Children (interactive story experience)
> **Design Tool:** Google Stitch — import this DESIGN.md

---

## 1. Brand Identity

- **Name:** LUMI (Project LUMI)
- **Tagline:** "Yaşayan, etkileşimli çocuk hikâyeleri için LUMI platformu."
- **Tone:** Warm, magical, safe, wonder-driven. Not childish — enchanting.
- **Core Principle:** Hidden systems — children should rarely see numerical values. No XP, no gold, no weapons. Trust, friendship, courage, curiosity remain invisible.
- **Age Range:** 3–12 (with age-adapted experiences: 3-5, 6-8, 9-12)

---

## 2. Design Tokens (Current CSS Custom Properties)

### Colors

| Token                  | Hex       | Usage                                 |
| ---------------------- | --------- | ------------------------------------- |
| `--background`         | `#f7f8fc` | Page background (cool off-white)      |
| `--foreground`         | `#172033` | Primary text (dark navy)              |
| `--muted`              | `#64748b` | Secondary text, labels                |
| `--border`             | `#dbe2ea` | Borders, dividers, card strokes       |
| `--primary`            | `#6d4aff` | Primary purple accent, buttons, links |
| `--primary-foreground` | `#ffffff` | Text on primary backgrounds           |
| `--destructive`        | `#c24141` | Error states, destructive actions     |
| `--destructive-soft`   | `#fbe4e4` | Error message background              |
| `--success`            | `#157347` | Success states                        |
| `--success-soft`       | `#e3f5ea` | Success message background            |

### Sizing

- `--radius`: `1rem` (16px) — default border radius
- Container max-width: `72rem` (1152px)
- Padding inline: `1.5rem`
- Section padding block: `5rem`

### Typography

- Font stack: `Arial, Helvetica, sans-serif` (system fallback — **to be refined with a proper brand font**)
- Eyebrow text: uppercase, 0.08em letter-spacing, primary color, weight 700
- Lead text: 1.125rem, muted color, 1.7 line-height, max-width 44rem
- Button/pill radius: `0.5rem` (8px)

---

## 3. Route Map & Page Specifications

### 3.1 Parent-Facing Routes (Implemented)

#### `/` — Landing Page

- **Type:** Public, Server Component
- **Content:** "PROJECT LUMI" eyebrow, heading "Yaşayan hikâyeler için ebeveyn alanı hazır.", description paragraph, two CTAs side by side
- **CTAs:** "Ebeveyn hesabı oluştur" (primary button-link) → /register, "Giriş yap" (secondary outlined button-link) → /login
- **Layout:** Centered container, large heading (clamp 2.5rem–5rem), muted supporting text

#### `/login` — Login

- **Type:** Public, Server Component
- **Content:** Eyebrow "PROJECT LUMI", heading "Giris yap", lead text, error/success message boxes
- **Form Fields:** email, password, "Beni hatirla" checkbox
- **Error States:** invalid_credentials, invalid_login_input, rate_limited, login_failed
- **Success States:** signed_out, password_reset
- **Links:** "Şifremi unuttum" → /forgot-password, "Kayit ol" → /register
- **Form Action:** POST /api/auth/login

#### `/register` — Parent Registration

- **Type:** Public, Server Component
- **Content:** Eyebrow "PROJECT LUMI", heading "Ebeveyn hesabi olustur", lead text, error message box
- **Form Fields:** displayName ("Ad"), email, password (minLength 10), confirmPassword
- **Error States:** password_mismatch, email_exists, invalid_register_input, rate_limited, register_failed
- **Link:** "Giris yap" → /login
- **Form Action:** POST /api/auth/register

#### `/forgot-password` — Forgot Password

- **Type:** Public, Server Component
- **Content:** Eyebrow, heading, lead text, single email field
- **Success:** Dev preview token link shown
- **Error States:** invalid_email, rate_limited, request_failed

#### `/reset-password` — Password Reset

- **Type:** Public, Server Component
- **Content:** Token (pre-filled from URL), new password, confirm password
- **Error States:** password_mismatch, invalid_reset_token

#### `/app` — Parent Dashboard (Protected)

- **Type:** Protected, Server Component
- **Auth Check:** Redirects to /login if unauthenticated
- **Onboarding Check:** Redirects to /app/onboarding if no household or no child profiles
- **Content:** Eyebrow "PROJECT LUMI", heading "Ebeveyn alanı", welcome message with parent name, "Profiller" button-link, "Çıkış yap" button
- **Layout:** Minimal dashboard with quick actions

#### `/app/onboarding` — Multi-Step Onboarding Wizard (Protected)

- **Type:** Protected Client Component
- **Steps:** 3-step wizard with pill-style step indicator
  - **Step 1 — "Aile evreni oluştur":** Household name + slug form. Fields: "Evren adı" (text), "Kısa kod" (pattern a-z0-9-). Submit: "Oluştur"/"Oluşturuluyor..."
  - **Step 2 — "Çocuk profilleri":** Inline list of existing profiles, form to add new profile. Fields: "Çocuğun adı" (text), "Yaş grubu" (select: 3–5, 6–8, 9–12). Submit: "Profil ekle"/"Ekleniyor...". Complete: "Kurulumu tamamla →"
  - **Step 3 — "Kurulum tamamlandı!":** Success message, "Profillere git" CTA
- **Sub-components:** StepIndicator (pill bar), CreateHouseholdForm, AddProfilesForm, OnboardingCompleteDisplay, LoadingDisplay, ErrorDisplay

#### `/app/profiles` — Profile Management (Protected)

- **Type:** Protected, Server + Client Component
- **Content:** Eyebrow "PROFILLER", heading "Cocuk profilleri"
- **Features:** Lists all child profiles with displayName, ageBand, creation date, "Arsivle" button per row
- **Empty State:** "Henuz bir profil eklenmemis." with link to onboarding
- **Loading/Error States:** LoadingDisplay, ErrorDisplay sub-components
- **Profile Cards:** Border, rounded, flex layout with name + age badge + date + archive button

### 3.2 Child-Facing Routes (Planned — Not Yet Implemented)

#### (planned) `/c/home` — Child Home / Story Selection

- Dashboard after child selects profile
- Shows recent stories, active characters, world status
- Large touch targets, minimal text, playful illustrations

#### (planned) `/c/stories/[id]` — Story Reader

- Page/flow view with text, image, and choice cards
- Audio narration controls (play/pause, volume)
- Interactive image hotspots (2-5 per image)
- Challenge/puzzle encounters embedded in flow
- Age-adapted font size and reading level
- Bottom: choice cards to continue story

#### (planned) `/c/world` — World Map

- Region cards with current world events
- Rare event markers
- Visit history
- New area discovery

#### (planned) `/c/characters` — Character Panel

- Status, relationships, inventory
- Recent memories
- Active story connections
- No numerical displays — all emotions and relationships shown qualitatively

#### (planned) `/c/inventory` — Inventory

- Items collected during stories
- Visual, not numerical

#### (planned) `/app/characters` — Character Origin Onboarding

- First-run character type selection (Human, Animal, Fantasy, Robot, Sea, Sky)
- Auto path: 3-5 origin package cards with concept, location, NPC, mystery, tone
- Manual path: subtype, name, tone, place selection
- Actions: "Start with this", "Change details", "Refresh"

### 3.3 Shared Layout Components (Implemented)

#### AppHeader

- Top header with bottom border
- Contains "LUMI" bold text
- Container width constrained

#### AppFooter

- Bottom footer with top border
- Contains "Project LUMI · Foundation" small text
- Container width constrained

#### RootLayout

- `<html lang="tr">`
- Skip-link: "Ana içeriğe geç" (accessibility)
- AppHeader → main#main-content → AppFooter
- Metadata: title "Project LUMI"

---

## 4. Story Experience UI Elements (Design-Only — Planned)

### Interactive Image Hotspots

- **Types:** sound (bird/wind/stream), discovery (footprint/key), hint (smoke/light), emotion (sad NPC), choice (cave/bridge)
- **Per image:** 2-5 hotspots
- **Coordinates:** Percentage-based for responsive sizing
- **Audio:** Parent-controlled mute button, no scary sounds
- **Interaction:** Tap → play SFX or reveal detail
- **Limit:** No world state mutation via hotspot alone

### Challenge & Puzzle Encounters

- **Types:** observation, sound, sequence, matching, empathy, inventory, map, rhythm
- **Rule:** Story never hard-locks — every challenge has help path or alternate continuation
- **Age-adapted difficulty**

### Story Choice Cards

- Displayed at story decision points
- 2-4 options per choice
- Each option leads to different story continuation
- Age-appropriate complexity

### Age Adaptation

| Feature              | 3-5               | 6-8                | 9-12               |
| -------------------- | ----------------- | ------------------ | ------------------ |
| Story length         | Short             | Medium             | Longer             |
| Dialogue             | Simple            | Moderate           | Complex            |
| Emotional signals    | Clear, explicit   | Guided             | Subtle             |
| Challenge complexity | Basic observation | Matching, sequence | Empathy, inventory |

---

## 5. Parent Companion System (Design-Only — Planned)

- **Gentle summaries:** friendships, emotional milestones, discoveries, kindness, choices
- **Conversation starters:** suggested parent-child discussion prompts
- **Family memories archive:** favorite stories, characters, discoveries
- **Real-world activity suggestions:** planting, drawing, observing, writing
- **Dashboard view** for parent to see child's journey without numerical analytics

---

## 6. Design Principles for UI

1. **Hidden Systems** — Never show XP, levels, scores, trust values, or numerical mechanics. Progress is emotional and narrative.
2. **No Quest Givers** — Nobody waits with exclamation marks. World moves forward independently.
3. **Slow Change** — Forests grow, buildings decay, friendships deepen. UI reflects a living world.
4. **Emotion Before Mechanics** — Memories, friendships, trust, curiosity, courage, empathy are the real currency.
5. **Safety First** — No scary surprise audio, no sudden animations, no hard locks.
6. **Accessibility** — Large touch targets, no critical text as icons only, color not sole meaning carrier, reduced-motion option, font and line-spacing options for reading difficulties.
7. **Age-Appropriate** — Younger children get shorter stories, simpler choices, clearer emotional signals. LUMI grows with the child.

---

## 7. User Flows

### Flow A: Parent First Visit

```
Landing (/) → Register (/register) → Dashboard (/app) → Onboarding Wizard (/app/onboarding)
  → Step 1: Create Household → Step 2: Add Child Profile(s) → Step 3: Complete
  → Profile Management (/app/profiles)
```

### Flow B: Parent Returning

```
Landing (/) → Login (/login) → Dashboard (/app) → Profile Management (/app/profiles)
  → [Future] Character Setup → [Future] Parent Panel
```

### Flow C: Child Experience (Future)

```
Child selects profile → Character origin onboarding
  → Character type selection → Auto/Manual origin package → Accept
  → World/Home created → First story generated
  → Story reader with choices, hotspots, challenges
  → Story outcome saved → Return to home
```

### Flow D: Password Recovery

```
Login → Forgot Password (/forgot-password)
  → Enter email → Dev preview token → Reset Password (/reset-password)
  → New password → Confirm → Login with new password
```

---

## 8. Visual Design Language

### Mood

- **Parent area:** Clean, trustworthy, professional with warmth. Purple primary conveys creativity and safety.
- **Child area (planned):** Magical, illustrated, wonder-driven. Rich colors, organic shapes, storybook aesthetic.

### Layout Patterns

- **Public pages:** Centered, single-column, max-width ~40rem for forms
- **Dashboard (app):** Container width, flex/grid layouts
- **Onboarding:** Stepped wizard, centered, single-column
- **Story reader (planned):** Split view (image area + text area), bottom choice tray
- **World map (planned):** Card grid, scrollable regions

### Component Patterns

- **Buttons:** Filled primary (#6d4aff), white text, 0.5rem radius, 0.85rem padding
- **Secondary buttons:** Transparent bg, foreground text
- **Form inputs:** 1px border (var(--border)), 0.5rem radius, 0.8rem 0.9rem padding
- **Cards:** 1px border (var(--border)), 8px radius, flex layout
- **Pills (step indicator):** 999px radius, 0.25rem 0.75rem padding
- **Message boxes:** 0.75rem radius, 0.9rem 1rem padding, colored bg

### States

- **Loading:** Simple "Yükleniyor..." / "Yukleniyor..." text
- **Error:** Red message box with semantic error text
- **Success:** Green message box with confirmation text
- **Empty:** Lead text with action link
- **Disabled buttons:** Show "...-iyor" suffix (Oluşturuluyor, Ekleniyor, Arşivleniyor)

---

## 9. Current CSS Class System

| Class                          | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| `.container`                   | Max-width 72rem, centered, 1.5rem padding inline |
| `.page-section` / `.auth-page` | 5rem padding block                               |
| `.eyebrow`                     | Uppercase, primary color, bold, letter-spaced    |
| `.lead`                        | Muted color, 1.125rem, 1.7 line-height           |
| `.auth-page`                   | Grid layout, max-width 40rem                     |
| `.auth-form`                   | Grid layout, 1rem gap                            |
| `.auth-form label`             | Grid, bold, 0.5rem gap                           |
| `.auth-form input`             | Border, radius, padding                          |
| `.auth-checkbox`               | Flex, centered, gap                              |
| `.auth-actions`                | Flex wrap, space-between                         |
| `.auth-links`                  | Grid, muted color                                |
| `.auth-message-error`          | Red bg + text                                    |
| `.auth-message-success`        | Green bg + text                                  |
| `.button-link`                 | Primary button as anchor                         |
| `.button-link-secondary`       | Outlined button style                            |
| `.skip-link`                   | Fixed accessibility skip nav                     |

---

## 10. Responsive Behavior

- **Desktop-first** with responsive breakpoints
- Container uses padding-inline for mobile safety
- Headings use `clamp()` for fluid sizing
- Image hotspot coordinates are percentage-based
- Forms are single-column, full-width on mobile
- Touch targets should be large enough for children (min 44px)

---

## 11. Accessibility Requirements

- Skip navigation link at top of every page
- Semantic HTML (`nav`, `main`, `label`, `button`)
- `aria-label` on navigation elements
- Focus-visible outlines (3px solid primary, 3px offset)
- Color is never the sole meaning carrier
- Reduced-motion option support
- Adequate color contrast ratios
- Keyboard-navigable flows
- Screen-reader friendly error messages

---

## 12. Future UI Areas (Roadmap)

| Area                        | Sprint | Description                                                             |
| --------------------------- | ------ | ----------------------------------------------------------------------- |
| Character Origin Onboarding | S06    | Character type selection cards, origin package cards, auto/manual paths |
| World Bootstrap             | S08    | First world/home creation from accepted origin                          |
| Story Session               | S09    | Story generation, node-based narrative                                  |
| Choice & Consequence        | S10    | Choice cards, outcome persistence                                       |
| Prompt Registry UI          | S11    | Context builder, prompt management                                      |
| Story Generation Pipeline   | S12    | AI model routing, generation controls                                   |
| NPC Intelligence            | S13    | NPC relationship display, interaction                                   |
| Background Simulation       | S14    | World time, seasons, events                                             |
| Media Pipeline              | S15    | Image generation, audio SFX, TTS                                        |
| Story Reader UX             | S16    | Full reader with hotspots, narration, challenges                        |
| World Map & Characters      | S17    | Map view, character/inventory browsing                                  |
| Parent Panel                | S18    | Full child management, safety controls, analytics                       |

---

## 13. Tech Stack for UI

| Technology                | Purpose                         |
| ------------------------- | ------------------------------- |
| Next.js 16                | Framework (App Router)          |
| React 19                  | UI library                      |
| TypeScript 5.9            | Type safety                     |
| Tailwind CSS v4           | Styling                         |
| PostCSS                   | CSS processing                  |
| Playwright                | E2E tests                       |
| Zustand (planned)         | Client-local state only         |
| React Hook Form (planned) | Form management                 |
| Zod (planned)             | Validation                      |
| Shadcn UI (candidate)     | Component library consideration |

---

_This DESIGN.md is the source of truth for all LUMI UI definitions. Import into Google Stitch via DESIGN.md import or use as a natural language prompt to generate the full design system._
