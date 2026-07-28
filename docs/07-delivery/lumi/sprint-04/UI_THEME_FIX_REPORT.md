# UI Theme Fix Report (v2 — completed)

## Root Cause

### 1. Missing Tailwind `@theme` tokens

`apps/web/app/globals.css` `@theme` bloğunda kritik token'lar eksikti:

| Token | Durum | Etkilenen utility'ler |
|-------|-------|-----------------------|
| `--color-primary` | **Eksik** | `bg-primary`, `text-primary`, `border-primary` çalışmıyordu |
| `--color-border` | **Eksik** | `border-border` çalışmıyordu |
| `--muted` CSS variable | **Tanımlı değildi** (`:root` içinde) | `text-muted` kırıktı |
| `--color-destructive-soft` | **Yanlış isimlendirme** (`--destructive-soft` yazılmıştı) | `bg-destructive-soft` çalışmıyordu |

**Sonuç:** `bg-primary` üretilmediği için `<a>` etiketindeki "Karakter Başlat" butonu hiç arka plan alamıyordu. `text-on-primary` beyaz yazı verdiği için buton beyaz zemin üzerinde görünmez oluyordu. Hover durumunda `hover:bg-[#4c29cf]` arbitrary değer olarak çalıştığı için sadece hover'da görünür hale geliyordu.

### 2. Global `button` base style tüm butonları primary CTA'ya çeviriyordu

```css
/* ESKİ — her <button>'a primary arka plan veriyor */
button {
  background: var(--primary);
  color: var(--on-primary);
  border: 0;
  border-radius: 0.5rem;
  font-weight: 700;
  padding: 0.85rem 1rem;
}
```

Bu kural Tailwind v4 `@layer utilities` dışında (katmansız) tanımlandığı için CSS cascade layer kuralları gereği Tailwind utility sınıflarını **eziyordu**. Sonuç:
- Seçim kartları (`<button>`) her zaman mor arka plan alıyordu. `bg-white`, `bg-surface-container-low` gibi sınıflar etkisiz kalıyordu.
- Karakter türü seçim kartları mor zeminde koyu (`text-on-surface`) yazı ile okunaksız oluyordu.
- İcon button'lar, secondary button'lar, "Geri" button'ları da primary CTA'ya dönüşüyordu.

### 3. Yanlış token eşleşmeleri

`bg-primary-container text-on-primary` (açık lavanta + beyaz), `bg-primary-container text-white`, `bg-primary-container hover:bg-primary` gibi hatalı renk çiftleri kontrast sorunlarına yol açıyordu. Küresel button override'ı bazılarını yanlışlıkla maskeliyordu.

### 4. Full theme token scan sonucu

Tüm `apps/web/app` ve `apps/web/components` altındaki `.tsx` dosyalarında kullanılan tüm custom semantic color class'lar (`bg-*`, `text-*`, `border-*`, `ring-*`, `outline-*`) taranmış ve `@theme`'deki 52 `--color-*` token ile çapraz kontrol edilmiştir.

**Sonuç:** Token scan temiz. Kullanılan her custom renk utility'sinin karşılığı `@theme`'de mevcut.

Bulunan arbitrary value'lar (`hover:bg-[#4c29cf]`) 15 kez tekrarlanıyor — primary rengin hover koyulaştırması olarak bilinçli kullanılıyor, temel token eksikliğinden kaynaklanmıyor.

## Changed Files

| Dosya | Değişiklik |
|-------|-----------|
| `apps/web/app/globals.css:54` | `:root`'a `--muted: #484556` eklendi |
| `apps/web/app/globals.css:227` | `@theme`'e `--color-primary: var(--primary)` eklendi |
| `apps/web/app/globals.css:266` | `@theme`'e `--color-border: var(--border)` eklendi |
| `apps/web/app/globals.css:277` | `--destructive-soft` → `--color-destructive-soft` düzeltildi (prefix) |
| `apps/web/app/globals.css:177-186` | Global `button` stili minimalize edildi: background, color, border, border-radius, padding, font-weight kaldırıldı |
| `apps/web/app/page.tsx:15` | `bg-primary-container text-on-primary` → `bg-primary text-on-primary hover:bg-[#4c29cf]` (landing CTA) |
| `apps/web/app/login/page.tsx:86` | `bg-primary-container text-on-primary` → `bg-primary text-on-primary hover:bg-[#4c29cf]` |
| `apps/web/app/register/page.tsx:71` | `bg-primary-container text-white` → `bg-primary text-on-primary hover:bg-[#4c29cf]` |
| `apps/web/app/app/onboarding/page.tsx:162` | `hover:bg-primary` → `hover:bg-primary hover:text-on-primary` |
| `apps/web/app/app/onboarding/page.tsx:246` | `hover:bg-primary` → `hover:bg-primary hover:text-on-primary` |
| `apps/web/app/app/onboarding/page.tsx:252` | `hover:bg-primary` → `hover:bg-primary hover:text-on-primary` |
| `apps/web/app/app/onboarding/page.tsx:265` | `hover:bg-primary` → `hover:bg-primary hover:text-on-primary` |
| `apps/web/app/app/page.tsx:17` | `primarySetupHref` kaldırıldı (kullanılmayan değişken) |

## Behavior Fixed

### Profil sayfası "Karakter Başlat" CTA
- **Önce:** `<a>` elementi `bg-primary` çalışmadığı için arka plan alamıyor, `text-on-primary` beyaz yazı beyaz zeminde kayboluyordu. Sadece hover'da `hover:bg-[#4c29cf]` ile görünür oluyordu.
- **Sonra:** `--color-primary` token'ı eklendiği için `bg-primary` mor arka plan üretiyor, `text-on-primary` beyaz yazı ile buton normal durumda net görünüyor. Hover sadece ton koyulaştırması yapıyor.

### Character wizard seçim kartları
- **Önce:** Tüm `<button>` elementleri global `button { background: var(--primary) }` kuralıyla mor arka plan alıyordu. `bg-white` ve `bg-primary-fixed/50` sınıfları cascade layer nedeniyle eziliyordu. Kart içindeki `text-on-surface` koyu yazı mor zemin üzerinde okunaksızdı.
- **Sonra:** Global button stili minimalize edildiği için Tailwind sınıfları çalışıyor. Seçili olmayan kartlar `bg-white` ile beyaz, seçili kartlar `bg-primary-fixed/50` ile açık lavanta zemine sahip. Her iki durumda da `text-on-surface` koyu yazı okunabilir.

### Landing page CTA
- **Önce:** `bg-primary-container text-on-primary` — yanlış token eşleşmesi.
- **Sonra:** `bg-primary text-on-primary` ile doğru primary CTA görünümü.

### Onboarding hover kontrastı
- **Önce:** `bg-primary-container text-on-primary-container hover:bg-primary` — hover'da arka plan `#5b35e5` (primary), yazı `#2a176d` (on-primary-container) ile koyu+koyu kontrastsız.
- **Sonra:** `hover:text-on-primary` eklendi — hover'da yazı beyaza dönerek okunabilir kontrast sağlanıyor.

### Global buton davranışı
- **Önce:** Uygulamadaki her `<button>` primary CTA görünümündeydi (mor zemin + beyaz yazı + border-radius + padding).
- **Sonra:** `<button>` sadece `cursor: pointer` ve font mirasını alıyor. Her buton kendi Tailwind sınıflarına göre görünüyor. Icon button'lar, secondary button'lar, kart butonları artık doğru stilleniyor.

### Login/Register submit butonları
- **Önce:** `bg-primary-container text-on-primary` veya `bg-primary-container text-white` — yanlış token eşleşmesi, küresel button override'ı sayesinde yanlışlıkla doğru görünüyordu.
- **Sonra:** Açıkça `bg-primary text-on-primary` ile doğru primary CTA.

### Lint hatası giderildi
- **Önce:** `apps/web/app/app/page.tsx:17` — `primarySetupHref` tanımlanmış ama kullanılmıyor → `pnpm lint` hata veriyordu.
- **Sonra:** Değişken kaldırıldı → `pnpm lint` **PASS** (0 error).

### Border, muted, destructive-soft token'ları
- `border-border` artık çalışıyor (register/onboarding input'ları).
- `text-muted` artık çalışıyor (login icon button, onboarding metinleri).
- `bg-destructive-soft` artık çalışıyor.

## Verification

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm --filter @lumi/web typecheck` | **PASS** |  |
| `pnpm --filter @lumi/web test` | **29/29 PASS** | Vitest unit tests |
| `pnpm --filter @lumi/web lint` | **PASS** | 0 errors, 0 warnings |
| `pnpm exec playwright test` | **16/16 PASS** | Full E2E: auth + profiles flows |

### Playwright E2E test detayı

```
  ✓ auth smoke › register via API, get session cookie, then access /me
  ✓ auth smoke › login via API, then access /me and logout
  ✓ auth smoke › invalid credentials return consistent 401
  ✓ auth smoke › protected /app redirects unauthenticated users to login
  ✓ auth smoke › /api/auth/me returns 401 for unauthenticated requests
  ✓ auth smoke › forgot-password and reset-password flow via API
  ✓ Profile API › unauthenticated requests return 401
  ✓ Profile API › create household returns 400 for missing fields
  ✓ Profile API › full flow: register → create household → create child profile → list → archive
  ✓ Profile API › create household duplicate returns 409
  ✓ Profile API › update child profile
  ✓ Profile API › cross-family access is rejected
  ✓ Profile API › parent policy get and update
  ✓ Profile API › child profile validation rejects invalid payloads
  ✓ Profile API › onboarding state reflects household and profile count
  ✓ Profile UI › unauthenticated /app/profiles redirects to login
```

### Full theme token scan

Tüm `apps/web/app` ve `apps/web/components` altındaki custom Tailwind semantic color class'lar taranmış, 52 `--color-*` token ile çapraz kontrol edilmiş, **eksik token bulunamamıştır**.

#### Kullanılan tüm custom semantic color'lar ve @theme durumu:

| Renk | Kullanılan utility'ler | @theme'de var mı? |
|------|----------------------|-------------------|
| `primary` | bg-, text-, border-, ring- | ✅ |
| `on-primary` | bg-, text- | ✅ |
| `primary-container` | bg-, ring-, border- | ✅ |
| `on-primary-container` | text- | ✅ |
| `primary-fixed` | bg- | ✅ |
| `on-background` | text- | ✅ |
| `on-surface` | text- | ✅ |
| `on-surface-variant` | text- | ✅ |
| `surface` | bg- | ✅ |
| `surface-container-lowest` | bg- | ✅ |
| `surface-container-low` | bg- | ✅ |
| `surface-container` | bg- | ✅ |
| `surface-bright` | bg- | ✅ |
| `secondary` | bg-, text- | ✅ |
| `on-secondary-fixed-variant` | text- | ✅ |
| `muted` | text- | ✅ |
| `border` | border- | ✅ |
| `outline` | text- | ✅ |
| `outline-variant` | bg-, border-, text- | ✅ |
| `destructive-soft` | bg- | ✅ |
| `error` | border-, text- | ✅ |
| `error-container` | border- | ✅ |
| `on-error-container` | text- | ✅ |
| `success` | text- | ✅ |
| `success-soft` | bg- | ✅ |
| `tertiary` | text- | ✅ |
| `tertiary-container` | bg- | ✅ |

### Beklenen computed style değerleri

| Element | Property | Expected | Status |
|---------|----------|----------|--------|
| Landing "Ebeveyn hesabı oluştur" `<a>` | `background-color` | `#5b35e5` (primary) | ✅ token fix |
| Landing "Ebeveyn hesabı oluştur" hover | `background-color` | `#4c29cf` | ✅ arbitrary value |
| Profil "Karakter Başlat" `<a>` | `background-color` | `#5b35e5` (primary) | ✅ token fix |
| Profil "Karakter Başlat" `<a>` hover | `background-color` | `#4c29cf` | ✅ arbitrary value |
| Seçili olmayan wizard `<button>` | `background-color` | `#ffffff` (white) | ✅ button fix |
| Seçili wizard `<button>` | `background-color` | `rgba(229, 222, 255, 0.5)` (primary-fixed/50) | ✅ button fix |
| Login submit `<button>` | `background-color` | `#5b35e5` (primary) | ✅ token fix |
| Login password toggle `<button>` | `background-color` | transparent (no bg) | ✅ button fix |
| Onboarding "Oluştur" normal | `background-color` | `#ece6ff` (primary-container) | ✅ button fix |
| Onboarding "Oluştur" hover | `background-color` / `color` | `#5b35e5` / `#ffffff` | ✅ hover fix |
| Register input | `border-color` | `#dbe2ea` (border) | ✅ token fix |
| Auth pages `text-muted` | `color` | `#484556` | ✅ muted fix |

## Remaining Risks

1. **Story/world UI henüz scope dışı**: Sprint 04 sonrası karakter bootstrap foundation tamamlandı ama story/world UI'si henüz uygulanmadı. Yeni UI bileşenleri eklenirken bu rapordaki token kurallarına uyulmalı.

2. **`.button-link` ve `.button-link-secondary` class'ları**: `globals.css` içinde tanımlı ama şu an kullanılmıyor (`grep` ile teyit edildi). Gelecekte kullanılırlarsa Tailwind utility'leri ile değiştirilmeleri önerilir.

3. **`hover:bg-[#4c29cf]` arbitrary value'ları**: 15 yerde tekrarlanıyor. Gelecekte `hover:bg-primary-dim` gibi bir token eklenerek standardize edilebilir, ancak şu an için arbitrary value'lar sorunsuz çalışıyor.
