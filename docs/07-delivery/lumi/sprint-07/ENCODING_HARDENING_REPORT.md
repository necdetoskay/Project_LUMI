# Encoding Hardening Report

## Kok Neden

Repo genelinde Turkce karakter/mojibake sorununun uc ana kaynagi:

1. **Cift kodlama (double encoding)**: Bazi dosyalar dogru UTF-8 ile yazilmis Turkce metinlerin (`C3 87` = C, `C5 9F` = s, `C4 9F` = g) bir tool tarafindan Latin-1/Windows-1252 olarak tekrar okunup tekrar UTF-8'e kaydedilmesiyle olusmus. Ornegin `IMPLEMENTATION_REPORT.md`'deki 71 adet mojibake em dash.

2. **Windows-1254 kodlu dosyalar**: `sprint-01/README.md` ve `CODING_AGENT_PROMPT.md` Windows-1254 (Turkish) kodlamasiyla kaydedilmis, UTF-8'de gecersiz byte'lar iceriyor.

3. **UTF-8 BOM**: 16 kaynak dosyada UTF-8 BOM (byte order mark `EF BB BF`) bulunuyor. BOM, dosyayi UTF-8 olarak okumayi engellemez ancak bazi tool'lar (Unix araclari, Node.js strict mode) sorun cikarabilir.

4. **Test dosyasinda literal mojibake**: `mojibake-regression.test.ts`'deki yorum satirlari, mojibake pattern'lerini aciklamak icin literal bozuk karakterler iceriyordu. Bu, tarama script'inin false positive vermesine yol acti.

## Eklenen .editorconfig

`.editorconfig` zaten vardi ve dogru yapilandirilmis:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Dosyada degisiklik yapilmadi. Mevcut konfigurasyon UTF-8 standardini zorluyor. Sorun .editorconfig'ten degil, dosyalarin yanlis kodlamayla yazilmasindan kaynaklaniyor.

## Eklenen check:encoding Script'i

`scripts/check-mojibake.mjs` olusturuldu.

### Calisma prensibi:
1. `apps/`, `packages/`, `docs/`, `README.md` klasorlerini rekursif dolasir
2. Binary dosyalari (`.ico`, `.png`, `.jpg`, `.svg`, `.pdf`, `.docx`, vb.) ve build/cache klasorlerini (`node_modules`, `.next`, `.dist`, `.git`, `.turbo`) atlar
3. Her metin dosyasini:
   - UTF-8 olarak decode etmeyi dener (gecersizse `NOT_UTF8` hatasi)
   - BOM varligini kontrol eder (`UTF8_BOM` hatasi)
    - Satir satir mojibake pattern'leri arar:
      - `LITERAL_ATILDE` (U+00C3, mojibake karsiligi C) — C karakterinin bozuk formu
      - `LITERAL_ADIAERESIS` (U+00C4, mojibake karsiligi G) — G karakterinin bozuk formu
      - `LITERAL_ARING` (U+00C5, mojibake karsiligi S/Se) — S/Se karakterlerinin bozuk formu
     - `MOJI_EMDASH` (U+00E2 + U+20AC) — em dash'in cift kodlanmis formu
4. Bulgu varsa non-zero exit code ile cikar
5. `node scripts/check-mojibake.mjs` ile calistirilir

### Root package.json'a eklendi:
```json
"check:encoding": "node scripts/check-mojibake.mjs"
```

## Temizlenen Dosyalar

| Dosya | Sorun | Cozum |
|-------|-------|-------|
| `apps/web/tests/mojibake-regression.test.ts` | 13 literal mojibake karakteri yorum satirlarinda | Escape notation ile degistirildi |
| `packages/profiles/src/application/inventory.service.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/repositories/drizzle/drizzle-inventory.repository.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/repositories/interfaces/inventory.repository.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-domain-events.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-entries.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-idempotency-ledger.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-inventories.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-item-definitions.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-item-instances.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-ownership-history.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-ownerships.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-transfers.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/db/schema/profile/inventory-usages.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/src/domain/inventory.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/tests/domain/inventory.test.ts` | UTF-8 BOM | BOM kaldirildi |
| `packages/profiles/tests/integration/inventory.integration.test.ts` | UTF-8 BOM | BOM kaldirildi |
| `docs/07-delivery/lumi/sprint-07/IMPLEMENTATION_REPORT.md` | UTF-8 BOM + 71 mojibake em-dash | BOM kaldirildi, em-dash'ler duzeltildi |
| `docs/07-delivery/lumi/sprint-01/README.md` | Windows-1254 kodlu, UTF-8'de gecersiz | Windows-1254 -> UTF-8 donusturuldu |
| `docs/07-delivery/lumi/sprint-07/CODING_AGENT_PROMPT.md` | Windows-1254 kodlu, gecersiz byte'lar | Windows-1254 -> UTF-8 donusturuldu |

## Mozibake Pattern Allowlist

**LATIN_ACIRCUMFLEX (U+00C2, Â)**: Bu karakter bilincli olarak allowlist'e alinmistir. Turkcede `mekân`, `hikâye`, `kâr`, `hâlâ` gibi kelimelerde semsiye/a/circumflex olarak kullanilir ve mojibake DEGILDIR. Tarama scripti bu karakteri es gecer.

**Test dosyalarindaki literal mojibake**: `mojibake-regression.test.ts`'deki yorum satirlari escape notation (`\uXXXX`) ile yazilmistir, literal bozuk karakter degildir.

## Guncellenen mojibake-regression Testi

`apps/web/tests/mojibake-regression.test.ts`:
- Eski: sadece iki dosyayi sabit pattern'lerle kontrol ediyordu
- Yeni: `scripts/check-mojibake.mjs`'i calistirarak tum repo taramasini yapar
- `pnpm --filter @lumi/web test` icinde otomatik calisir

## Dogrulama Komutlari ve Sonuclari

```bash
pnpm check:encoding                        # PASS: No mojibake patterns detected
pnpm --filter @lumi/web typecheck          # PASS
pnpm --filter @lumi/web lint               # PASS (0 warnings)
pnpm --filter @lumi/web test               # PASS (85 tests, 12 suites)
pnpm --filter @lumi/profiles typecheck     # PASS
pnpm --filter @lumi/profiles test          # PASS (179 tests + 59 skipped)
```

## Kalan Riskler

1. **Yeni mojibake girisinin engellenmesi**: `pnpm check:encoding` el ile calistirilmali veya CI pipeline'ina eklenmeli. Su anda CI'da otomatik degil.
2. **Docs/99-archive**: Bu klasordeki `.docx` binary dosyalari taranmiyor. Iceriklerinde mojibake olabilir ancak binary format nedeniyle metin bazli tarama mumkun degil.
3. **Narrative engine dokumanlari**: `docs/04-architecture/lumi/narrative/` altindaki dosyalar `Â` karakteri iceriyor (legitimate Turkish circumflex kullanimi). Tarama bunlari false positive olarak algilamiyor.
4. **Node versiyonu**: `scripts/check-mojibake.mjs` ES module syntax'i kullanir. Node >= 16 gerektirir. CI'da dogru Node versiyonu kullanildigindan emin olun.

## Oneriler

- CI pipeline'ina `pnpm check:encoding` adimi eklenmeli (pre-commit hook veya GitHub Actions step'i olarak).
- Dosya yazma araclari (AI code generation, script'ler) icin UTF-8 encoding zorunlulugu dokumentasyona eklenmeli.
- `.editorconfig`'i destekleyen editor'lerin kullanilmasi tesvik edilmeli.

Codex review bekliyor.
