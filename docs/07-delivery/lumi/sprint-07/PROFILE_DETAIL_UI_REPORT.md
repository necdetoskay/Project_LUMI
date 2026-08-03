# Profil Detay UI — Uygulama Raporu

## Değiştirilen Route'lar

| Route | Dosya | Değişiklik |
|-------|-------|------------|
| `/app/profiles` | `apps/web/app/app/profiles/page.tsx` | Değişmedi (server component wrapper) |
| `/app/profiles` | `apps/web/app/app/profiles/profiles-client-page.tsx` | Kartlardan "Karakter Başlat", "Düzenle", "Arşivle" kaldırıldı. Ana CTA "Profili Aç" -> `/app/profiles/[childProfileId]`. Türkçe metinler UTF-8 düzeltildi. |
| `/app/profiles/[childProfileId]` | `apps/web/app/app/profiles/[childProfileId]/page.tsx` | **Yeni route.** Auth-guarded server component, `childProfileId`'yi client component'a aktarır. |
| `/app/profiles/[childProfileId]` | `apps/web/app/app/profiles/[childProfileId]/profile-detail-client-page.tsx` | **Yeni client component.** Header, sekmeli yapı (Genel Bakış, Karakterler, Hikayeler, Tercihler, Güvenlik), profil düzenleme modalı. |

## Değiştirilen API Route'ları

| Route | Değişiklik |
|-------|------------|
| `GET /api/child-profiles/[id]` | **Yeni GET handler.** `findChildProfileForUser` kullanır. `householdId` query param ile çalışır. 403/404/400 döndürür. |
| `GET /api/characters` | **childProfileId desteği eklendi.** Opsiyonel `?childProfileId=` query param ile yalnızca o profile ait karakterleri döndürür. `listCharactersByChildProfile` çağırır. |

## Yeni Backend Servis Fonksiyonu

`packages/profiles/src/application/character-bootstrap.service.ts`:
- `listCharactersByChildProfile(userId, householdId, childProfileId)` — eklendi
  - `householdRepo.findByIdForUser` ile üyelik doğrulaması
  - `characterRepo.findByChildProfile` ile tek karakter sorgusu (child profile başına en fazla 1 karakter)
  - Boş durumda `[]` döner
  - Export `packages/profiles/src/application/index.ts` üzerinden yapılır

## Ana Profil Listesinde Kaldırılan/Eski Aksiyonlar

Eski `profiles-client-page.tsx`'ten kaldırılanlar:
- "Karakter Başlat" linki (`/app/character-onboarding?childProfileId=...`)
- "Düzenle" butonu (inline düzenleme modalı olmadan)
- "Arşivle" butonu
- `householdId` state
- `archivingId` state
- `archiveProfile` callback

Yerine eklenen:
- Tek CTA "Profili Aç" -> `/app/profiles/[childProfileId]`
- Sade kart yapısı: çocuk adı, yaş grubu, locale, oluşturma tarihi

## Çocuk Profil Detay Sayfası Yapısı

### Header
- Avatar (placeholder `face` icon)
- Çocuk adı, yaş grubu, locale
- Varsa ilk karakter adı (characters[0] üzerinden)
- "Profili düzenle" butonu (modal açar)
- "Profiller listesine dön" linki

### Sekmeler
1. **Genel Bakış** — Profil bilgileri kartları (ad, yaş, dil, durum, aile evreni, oluşturma)
2. **Karakterler** — `GET /api/characters?householdId=...&childProfileId=...` endpoint'inden gerçek karakter listesi; boş state'te "İlk karakteri başlat" CTA
3. **Hikayeler** — Empty state; "Yeni hikaye başlat" disabled (henüz route yok)
4. **Tercihler** — Empty state (henüz tanımlanmamış)
5. **Güvenlik** — Policy referansı (ebeveyn paneline yönlendirme)

### Profil Düzenleme Modalı
- Görünen ad (text input)
- Yaş grubu (select: 0-2, 3-5, 6-8, 9-12, 13+)
- Dil (disabled — locale değişikliği desteklenmez)
- Validasyon: boş ad, boş yaş grubu
- Başarılı kayıt: `PATCH /api/child-profiles/[id]` çağrılır, sayfa state'i güncellenir

## Kullanılan Gerçek Backend Endpoint'leri

| Veri | Endpoint | Not |
|------|----------|-----|
| Household bilgisi | `GET /api/onboarding` | householdId almak için |
| Profil detayı | `GET /api/child-profiles/[id]?householdId=...` | Yeni GET handler |
| Karakter listesi (scoped) | `GET /api/characters?householdId=...&childProfileId=...` | **Ana kaynak.** Karakterler sekmesi bu endpoint'i kullanır. |
| Profil güncelleme | `PATCH /api/child-profiles/[id]` | Var olan endpoint (değişmedi) |

**Mock veri kullanılmamıştır.** Tüm veriler gerçek backend/API'den gelir.

## Karakter/Hikaye Veri Durumu

**Karakterler:**
- Detay sayfasında karakter listesi `GET /api/characters?householdId=...&childProfileId=...` üzerinden gelir (childProfileId'ye göre filtrelenmiş)
- State: `characters: CharacterInfo[]` array (tek karakter state'i yerine)
- Empty state `characters.length === 0` ile çalışır
- `characters.map()` ile render edilir (birden fazla karakter desteklenir)
- Her child profile en fazla 1 karakter barındırabilir (business rule)
- Boş state + "İlk karakteri başlat" CTA mevcut
- Var ise karakter adı, türü, alt türü, oluşturma tarihi gösterilir

**Hikayeler:**
- Backend'de hikaye (story) endpoint'i **yok**
- Detay sayfasında "Hikayeler" sekmesi empty state gösterir
- "Yeni hikaye başlat" butonu **disabled**
- Hikaye özelliği sonraki sprintlerde eklenecek

## Encoding Düzeltmeleri

Codex review sonrası aşağıdaki düzeltmeler yapıldı:

**Her iki dosya Python script ile UTF-8 olarak yeniden yazıldı** (tüm escape sequence'ler `\uXXXX` doğru Unicode karakterlere çözüldü):

| Kodlanan Karakter | Unicode | Dosyalar |
|-------------------|---------|----------|
| Ç | `\u00c7` | profil listesi, detay |
| ç | `\u00e7` | profil listesi, detay |
| ş | `\u015f` | profil listesi, detay |
| ğ | `\u011f` | detay |
| ı | `\u0131` | detay |
| ü | `\u00fc` | profil listesi, detay |
| ö | `\u00f6` | profil listesi, detay |
| İ | `\u0130` | profil listesi, detay |
| Ğ | `\u011e` | detay |
| Ş | `\u015e` | detay |

Eski ASCII yaklaşıklıklar (`Cocuk`, `icin`, `goruntuleyin`, `Yukleniyor`) yerine doğru UTF-8 karakterler kullanıldı.

## Test Sonuçları

```
 Test Files  12 passed (12)
      Tests  86 passed (86)
```

Yeni eklenen testler:
- `tests/mojibake-regression.test.ts` (2 test):
  - `profiles-client-page.tsx` dosyasında mojibake patternleri bulunmamalı
  - `profile-detail-client-page.tsx` dosyasında mojibake pattern'leri bulunmamalı
- `tests/character-api.test.ts` içinde 3 yeni test:
  - `GET /api/characters` childProfileId ile filtreleme
  - childProfileId boş sonuç döndürür
  - cross-family erişim 403 döndürür
- `tests/child-profile-detail-api.test.ts` (4 test):
  - `GET /api/child-profiles/[id]` householdId eksik -> 400
  - Non-existent profile -> 404
  - Cross-family access -> 403
  - Valid household member -> 200 + profil verisi

## Doğrulama Komutları

```bash
pnpm --filter @lumi/web typecheck   # PASS
pnpm --filter @lumi/web lint        # PASS (0 warnings)
pnpm --filter @lumi/web test        # PASS (86 tests, 12 suites)
pnpm --filter @lumi/profiles typecheck  # PASS
pnpm --filter @lumi/profiles test   # PASS (179 tests + 59 skipped)
```

## Bilinen Eksikler

1. **Hikaye endpoint'i yok.** "Hikayeler" sekmesi tamamen empty/disabled state. Story route eklendiğinde güncellenmeli.
2. **Avatar seçimi yok.** Profil detayında avatar placeholder (`face` icon) kullanılır. Avatar asset sistemi eklendiğinde düzenleme modalına eklenmeli.
3. **Profil tercihleri yok.** "Tercihler" ve "Güvenlik" sekmeleri henüz boş state. Backend'de preference/policy endpoint'i olgunlaştığında doldurulmalı.
4. **Profil arşivleme.** Liste sayfasından arşivleme aksiyonu kaldırıldı (detay sayfasına taşınabilir). Şu anda profili arşivlemek için doğrudan API çağrısı gerekiyor.
5. **E2E test eksik.** UI düzeyinde testler (link doğrulama, sayfa içeriği, modal işlemleri) için E2E test framework'ü kurulduğunda playwright testleri eklenmeli.
6. **Dashboard kartları.** `/app` sayfasındaki profil kartları hala "Karakter başlat" ve "Yönet" linklerini kullanıyor. `/app/profiles/[id]` bağlantısına güncellenmemiştir (bu sprint kapsamı dışı).

## Review İçin Notlar

- Codex review bekliyor.
- Tüm Türkçe metinler UTF-8 kodludur. Python byte-level doğrulama ile onaylanmıştır. Bozuk UTF-8 çift kodlama patterni bulunmamaktadır.
- Mojibake regresyon testi (`tests/mojibake-regression.test.ts`) her `vitest run`'da otomatik çalışır.
- Mock veri KESİNLİKLE kullanılmamıştır — her veri gerçek backend'den gelir.
- Karakter listesi kaynağı `GET /api/characters?householdId=...&childProfileId=...` endpoint'idir (bootstrap status DEĞİL).
- "Profili Aç" ve "Profiller listesine dön" linkleri doğru route'lara yönlendirir.
- Yeni profil oluşturma CTA'sı yalnızca `/app/profiles` ana liste sayfasında bulunur, detay sayfasında bulunmaz.
- Backend yeni endpoint'leri mevcut `withParent` auth middleware'ini kullanır, Family Space yetkilendirmesi korunur.
