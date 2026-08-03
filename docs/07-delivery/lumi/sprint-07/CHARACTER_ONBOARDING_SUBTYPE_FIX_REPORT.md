# Character Onboarding Subtype Fix Report

## Kok Neden

Karakter olusturma akisinda `"Character subtype must be one of: child_avatar, npc"` hatasinin kaynagi:

Repoda iki farkli kavram ayni `subtype` adiyla karismis durumdaydi:

1. **Display/origin subtype**: Yaratci karakter tanimi. Orn. "yildiz kasifi cocuk", "harita perisi".  
2. **Technical characterSubtype**: Domain siniflandirmasi. Sadece `"child_avatar"` veya `"npc"`.

`validateCharacterSubtype()` fonksiyonu teknik subtype icin dogru sekilde `"child_avatar" | "npc"` kontrolu yapiyor. Ancak `character-bootstrap.service.ts` icinde bu fonksiyon yanlislikla **display/origin subtype** degerlerini dogrulamak icin kullaniliyordu (ornegin `subtype: validateCharacterSubtype("yildiz kasifi cocuk")`).

## Subtype vs CharacterSubtype Ayrimi

| Alan | Tip | Ornek Deger | Dogrulama |
|------|-----|-------------|-----------|
| `subtype` (DB, state) | `string` | `"yildiz kasifi cocuk"` | `validateOriginDisplaySubtype()`: 1-80 karakter, trimmed |
| `characterSubtype` (state) | `CharacterSubtype` | `"child_avatar"` | `validateCharacterSubtype()`: yalnizca `child_avatar` veya `npc` |

**DB kolon adi legacy olarak `subtype` kalmistir. Anlami display/origin subtype'tir.**

## Degisen Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `packages/profiles/src/domain/validation.ts` | `validateCharacterSubtype()` -> `validateOriginDisplaySubtype()` olarak yeniden adlandirildi. Mantik ayni: 1-80 karakter, trimmed. |
| `packages/profiles/src/domain/index.ts` | Export: `validateCharacterSubtype as validateDomainCharacterSubtype` -> `validateOriginDisplaySubtype` olarak guncellendi. |
| `packages/profiles/src/application/character-bootstrap.service.ts` | Import `validateCharacterSubtype` -> `validateOriginDisplaySubtype`. `buildCandidatesFromHandoff` ve `consumeHandoffAndCreateCharacter`'deki hatali dogrulamalar duzeltildi. `LumiCharacter.create()` cagrisina `characterSubtype: "child_avatar"` eklendi. Yerel degisken `finalSubtype` -> `finalDisplaySubtype` olarak netlestirildi. |
| `apps/web/app/app/character-onboarding/character-onboarding-client-page.tsx` | UI label "Alt tur (subtype)" -> "Alt tur (gorunen karakter tarzi)" olarak guncellendi. |

## Eklenen Test Senaryolari

### Domain/Application Testleri

Asagidaki senaryolar `validateOriginDisplaySubtype` ile calisir:

1. **Yaratici subtype kabul**: `validateOriginDisplaySubtype("yildiz kasifi cocuk")` basarili
2. **Yaratici subtype kabul**: `validateOriginDisplaySubtype("harita perisi")` basarili
3. **Manual override kabul**: `validateOriginDisplaySubtype("Minik pusula ustasi")` basarili
4. **Bostring red**: `validateOriginDisplaySubtype("")` -> ValidationError firlatir
5. **81+ karakter red**: 81 karakterlik string -> ValidationError firlatir

### Teknik Validator Ayrimi (korunuyor)

- `validateCharacterSubtype("yildiz kasifi cocuk")` -> ValidationError firlatir (teknik validator, display subtype'i kabul etmemeli)

Bu, iki kavram arasindaki ayrimin test tarafindan korundugunu garanti eder.

### E2E Testleri (PostgreSQL gerektirir, su anda atlanmistir)

E2E senaryolari icin `apps/web/tests/e2e/` altina eklenecek:
- Happy path auto mode: karakter turu sec -> onerileri uret -> ilk oneriyi sec -> karakter olustur. `"Character subtype must be one of"` hatasi gorunmez.
- Manual subtype override: "Minik pusula ustasi" override gir -> API'den donen `subtype` degeri kontrol edilir.
- Invalid long subtype: 81+ karakterlik override -> validation error.
- Duplicate bootstrap guard: Ayni profil icin tekrar onboarding -> 409.

## Dogrulama Komutlari ve Sonuclari

```bash
pnpm --filter @lumi/profiles typecheck     # PASS
pnpm --filter @lumi/profiles test          # PASS (179 tests, 59 skipped)
pnpm --filter @lumi/web typecheck          # PASS
pnpm --filter @lumi/web lint               # PASS (0 warnings)
pnpm --filter @lumi/web test               # PASS (85 tests, 12 suites)
pnpm check:encoding                        # PASS
```

## Kalan Riskler

1. **E2E testler**: PostgreSQL gerektiren E2E testleri su anda atlanmistir. CI'da calistirilmasi icin `AUTH_TEST_ENABLE_DESTRUCTIVE=true` ve calisan bir DB gereklidir.
2. **DB kolon adi**: Legacy nedenlerle DB'de `subtype` kolonu display/origin subtype anlaminda kullanilmaktadir. Gelecekte isimlendirme netligi icin migration yapilabilir.
3. **NPC creation**: Bu sprint kapsaminda NPC olusturma akisi yoktur. NPC eklendiginde `characterSubtype: "npc"` kullanilmalidir.

Codex review bekliyor.
