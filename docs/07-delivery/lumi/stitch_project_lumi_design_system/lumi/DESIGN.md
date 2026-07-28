---
name: LUMI
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e6'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1ff'
  surface-container: '#f1ebfa'
  surface-container-high: '#ebe6f5'
  surface-container-highest: '#e5e0ef'
  on-surface: '#1c1a24'
  on-surface-variant: '#484556'
  inverse-surface: '#312f3a'
  inverse-on-surface: '#f4eefd'
  outline: '#797588'
  outline-variant: '#c9c4d9'
  surface-tint: '#5d36ef'
  primary: '#5427e6'
  on-primary: '#ffffff'
  primary-container: '#6d4aff'
  on-primary-container: '#f4eeff'
  inverse-primary: '#c9bfff'
  secondary: '#555e74'
  on-secondary: '#ffffff'
  secondary-container: '#d7dff9'
  on-secondary-container: '#5a6278'
  tertiary: '#8e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b44f00'
  on-tertiary-container: '#ffede5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c9bfff'
  on-primary-fixed: '#1b0063'
  on-primary-fixed-variant: '#4500d8'
  secondary-fixed: '#d9e2fc'
  secondary-fixed-dim: '#bdc6e0'
  on-secondary-fixed: '#121b2e'
  on-secondary-fixed-variant: '#3e475b'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68f'
  on-tertiary-fixed: '#331100'
  on-tertiary-fixed-variant: '#773200'
  background: '#f7f8fc'
  on-background: '#1c1a24'
  surface-variant: '#e5e0ef'
  muted: '#64748b'
  border: '#dbe2ea'
  destructive-soft: '#fbe4e4'
  success-soft: '#e3f5ea'
typography:
  eyebrow:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.08em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  lead:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 72rem
  padding-inline: 1.5rem
  section-block: 5rem
  gutter: 1rem
  form-gap: 1rem
---

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
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#f7f8fc` | Page background (cool off-white) |
| `--foreground` | `#172033` | Primary text (dark navy) |
| `--muted` | `#64748b` | Secondary text, labels |
| `--border` | `#dbe2ea` | Borders, dividers, card strokes |
| `--primary` | `#6d4aff` | Primary purple accent, buttons, links |
| `--primary-foreground` | `#ffffff` | Text on primary backgrounds |
| `--destructive` | `#c24141` | Error states, destructive actions |
| `--destructive-soft` | `#fbe4e4` | Error message background |
| `--success` | `#157347` | Success states |
| `--success-soft` | `#e3f5ea` | Success message background |
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
| Class | Purpose |
|-------|---------|
| `.container` | Max-width 72rem, centered, 1.5rem padding inline |
| `.page-section` / `.auth-page` | 5rem padding block |
| `.eyebrow` | Uppercase, primary color, bold, letter-spaced |
| `.lead` | Muted color, 1.125rem, 1.7 line-height |
| `.auth-page` | Grid layout, max-width 40rem |
| `.auth-form` | Grid layout, 1rem gap |
| `.auth-form label` | Grid, bold, 0.5rem gap |
| `.auth-form input` | Border, radius, padding |
| `.auth-checkbox` | Flex, centered, gap |
| `.auth-actions` | Flex wrap, space-between |
| `.auth-links` | Grid, muted color |
| `.auth-message-error` | Red bg + text |
| `.auth-message-success` | Green bg + text |
| `.button-link` | Primary button as anchor |
| `.button-link-secondary` | Outlined button style |
| `.skip-link` | Fixed accessibility skip nav |
