# Sprint 03 — Stitch Prompt: Household & Child Profiles UI

> Kullanım: Google Stitch (stitch.withgoogle.com) Prompt alanına yapıştırın.
> Dil: Türkçe arayüz, İngilizce tasarım açıklaması.

---

## Stitch Prompt

Design a warm, magical, trustworthy parent-facing web dashboard for "Project LUMI" — a children's interactive story platform. The UI is for parents to manage their family space and child profiles. Use a cool off-white background (#f7f8fc), dark navy text (#172033), and a purple primary accent (#6d4aff). Border color is soft blue-gray (#dbe2ea). Border radius is 1rem for the app, 0.5rem for buttons and inputs. Font is a clean sans-serif (Arial, Helvetica). All UI text is in Turkish.

---

### Page 1 — Landing (/)

A centered, single-column welcome screen inside a max-width 72rem container with generous padding (6rem vertical). 

At the top, a small uppercase eyebrow label in purple, bold, letter-spaced: "PROJECT LUMI"

Below it, a large fluid heading (clamp 2.5rem to 5rem): "Yaşayan hikâyeler için ebeveyn alanı hazır." (The parent area for living stories is ready.)

Below the heading, a muted gray paragraph (text color #64748b, 1.125rem, 1.7 line-height, max-width 44rem): "İlk hesabını oluştur, sonra LUMI çalışma alanına giriş yaparak çocuk profilleri ve hikaye evreni akışına devam et."

Below the paragraph, two buttons side by side with a 1rem gap:
- Primary filled button (purple bg #6d4aff, white text, 0.5rem radius, 0.85rem padding): "Ebeveyn hesabı oluştur" (links to /register)
- Secondary outlined button (transparent bg, dark text, 1px border in border color): "Giriş yap" (links to /login)

The page has a top header bar with just the word "LUMI" in bold, and a bottom footer with "Project LUMI · Foundation" in small text.

### Page 2 — Login (/login)

A centered form card, max-width 40rem, 5rem vertical padding. 

Top: Eyebrow "PROJECT LUMI", heading "Giriş yap", lead text "Ebeveyn hesabınla LUMI çalışma alanına dön." in muted gray.

Error message box (if any): soft red background (#fbe4e4), red text (#c24141), 0.75rem radius, 0.9rem 1rem padding.
Success message box (if any): soft green background (#e3f5ea), green text (#157347), same styling.

Form in a grid with 1rem gap. Each field is a label with bold text above an input:
- "E-posta" — email input, autocomplete="email", required
- "Parola" — password input, autocomplete="current-password", required
- Checkbox label "Beni hatirla" (remember me)

Primary submit button: "Giriş yap" (full width of form)

Below form, two links in a grid with 0.75rem gap:
- "Şifremi unuttum" → /forgot-password
- "Hesabın yok mu? Kayit ol" → /register (link styled as text, not button)

### Page 3 — Registration (/register)

Same layout as login. 

Eyebrow "PROJECT LUMI", heading "Ebeveyn hesabi olustur", lead text "İlk hesap, çocuk profili ve hikaye evreni akışının sahibi olacak."

Error message box same styling as login.

Form fields:
- "Ad" — text input, autocomplete="name", required, minLength 2
- "E-posta" — email input, autocomplete="email", required
- "Parola" — password input, autocomplete="new-password", required, minLength 10
- "Parolayi tekrar gir" — password input, same constraints

Submit button: "Hesap olustur"

Below form: "Hesabın var mı? Giriş yap" → /login link

### Page 4 — Parent Dashboard (/app)

Protected route. Top header bar with "LUMI" bold. Main content area with container, 5rem vertical padding.

Eyebrow "PROJECT LUMI", heading "Ebeveyn alanı"

A welcome line in muted gray: "Hoş geldin {parent.displayName}." (where parent name is injected)

Below, a flex row with 1rem gap containing two elements:
- Filled primary button link styling: "Profiller" (links to /app/profiles)
- A form with a submit button styled as secondary/outlined: "Çıkış yap" (POST /api/auth/logout)

If parent has no household or no child profiles, redirect to /app/onboarding.

### Page 5 — Onboarding Wizard (/app/onboarding)

A multi-step wizard inside a container with 5rem padding.

Top: Eyebrow "LUMI KURULUM", heading "Profil ve evren kurulumu"

Step indicator: a horizontal row of 3 pill-shaped badges (0.5rem 0.75rem padding, 999px border-radius, 0.85rem font, bold):
1. "Evren oluştur" (step 1)
2. "Profil ekle" (step 2)
3. "Tamamlandı" (step 3)

Active/completed steps have purple background (#6d4aff) and white text. Inactive steps have transparent bg and muted text.

**Step 1 — Create Household Form:**
A form card, max-width 28rem, flex column with 1rem gap.

Heading: "Aile evreni oluştur" (h2 size)

Two text inputs, each as a label with bold text above:
- "Evren adı" — placeholder "ör. LUMI Ailesi", required
- "Kısa kod" — placeholder "ör. lumi-ailesi", required, pattern a-z0-9-, title "Yalnızca küçük harf, rakam ve tire"

Primary submit button: "Oluştur" (disabled state shows "Oluşturuluyor...")

**Step 2 — Add Child Profiles Form:**
A column flex container with 1.5rem gap.

Heading: "Çocuk profilleri" (h2 size)

If profiles exist, render them as a vertical list (flex column, 0.5rem gap). Each profile is a card (1px border var(--border), 8px border radius, 0.75rem padding, flex with space-between): display name in bold, age band as a muted secondary label.

Below the list, a form to add a new profile (flex column, 1rem gap, max-width 28rem):
- "Çocuğun adı" — text input, required, placeholder "ör. Elif"
- "Yaş grubu" — select dropdown, required, options: "Seçin" (empty), "3–5 yaş", "6–8 yaş", "9–12 yaş"
- Primary submit button: "Profil ekle" (disabled shows "Ekleniyor...")

If there are already profiles, show a primary button-link at the bottom of the form: "Kurulusu tamamla →" (links conceptually to next step)

**Step 3 — Onboarding Complete:**
A centered card (text-align center, 3rem vertical padding).

Heading: "Kurulum tamamlandı!" (h2 size)

Lead text in muted gray: "Artık hikaye akışına başlayabilirsin. Yakında burada cocuk profillerini yönetebilecek ve hikaye evrenini keşfedebileksin."

Primary button link: "Profillere git" (links to /app/profiles), with 1.5rem top margin

Also show loading state ("Yükleniyor...") and error state (red text) as needed.

### Page 6 — Profile Management (/app/profiles)

Container, 5rem padding.

Eyebrow "PROFILLER", heading "Cocuk profilleri"

**Empty state:** If no profiles, show lead text: "Henuz bir profil eklenmemis." with a link in purple to /app/onboarding ("Kurulus sayfasina git")

**Profile list:** If profiles exist, a vertical flex column with 0.75rem gap, 1.5rem top margin.

Each profile card: flex row with space-between, 1rem padding, 1px border var(--border), 8px border radius. Left side: display name in bold (1.1rem font size) + age band as a muted label (0.9rem, left margin 0.75rem). Right side: creation date in small muted text (0.8rem) + an "Arsivle" (Archive) button with loading state ("Arsivleniyor...")

---

## Design Principles for This Sprint

- Turkish-language interface throughout
- Purple primary (#6d4aff) for all primary actions, links, and highlights
- Safe, warm, trustworthy — this is a children's platform for parents
- No numerical scores or gamification — emotional and family-focused
- All forms use semantic HTML with proper labels and accessibility
- Responsive: single column, full-width on mobile, centered on desktop
- Large touch targets (min 44px) for parent comfort
- Error messages are clear, non-technical, in Turkish
- Loading and error states are shown inline with the component
- Archive is soft-delete (profile stays but not in active list)

---

## Future UI Hints (Do NOT design yet — for Stitch context only)

After this sprint, the child will need:
- A character type selection screen (Human, Animal, Fantasy, Robot, Sea creature, Sky creature) as large card choices
- Auto-path origin package cards (3-5 cards showing concept, location, NPC, mystery, tone)
- Manual path form for subtype, name, tone selection
- A story reader page with an image area, text, and bottom choice cards
- A world map with region cards
- An interactive hotspot on story images (tap to hear sound or see detail)

Include these future flows only as subtle design system considerations (consistent card sizing, warm color palette), not as full page designs.
