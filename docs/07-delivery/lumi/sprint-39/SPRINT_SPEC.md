# Sprint 39 — Canonical Recovery & Discovery Consolidation

Status: IN PROGRESS
Date: 2026-08-09

## Goal

UI/UX Discovery başlangıcından Interactive Story Session tasarımına kadar alınan tüm kabul edilmiş kararları, ULTEF test ailelerini ve gelecekteki implementation sprint eşlemelerini tek ve güvenilir repository source-of-truth yapısında konsolide etmek.

## Problem

Discovery kayıtları repo ve commit history içinde bulunuyor; ancak `decision-register.md` ve `ultef-living-universe-verification-matrix.md` dosyalarının bazı ardışık güncellemeleri append yerine full replace yapıldığı için önceki ayrıntılı satırların bir bölümü current branch görünümünden düşmüştür. Commit history recovery source olarak kullanılacaktır.

## Scope

- UXD-001..181 kararlarını eksiksiz recover et ve güncel master register'a taşı.
- Interactive Story Session / Choice Resolution kararlarını UXD-182+ olarak kanonikleştir.
- ULTEF ailelerini monolitik overwrite-risk dosya yerine family catalog yapısına ayır.
- Master ULTEF index oluştur; her family ve L9 senaryosunu izlenebilir yap.
- UI/UX discovery ana README kapsamını bugünkü son discovery noktasına yükselt.
- Decision -> ULTEF -> implementation sprint traceability oluştur.
- Sprint 40..59 implementation roadmap'ini repository içine kaydet.
- Coverage audit: missing decision/test family = 0 hedefi.

## Non-goals

- Production feature implementation yok.
- Yeni UI kodu yok.
- ULTEF senaryolarını bu sprintte production test koduna dönüştürmek yok; burada canonical recovery/backlog/traceability yapılır.

## Acceptance criteria

1. UXD-001'den son kabul edilmiş decision ID'ye kadar ID gap yok.
2. Her discovery domain'i canonical index'te görünür.
3. Her domain için en az bir ULTEF family veya açık test mapping'i vardır.
4. L9 long-horizon programları master catalog'da kaybolmadan listelenir.
5. Interactive Story Session karar/testleri ilk kez repository source-of-truth'a girer.
6. S40..S59 roadmap ve sprint-domain mapping kaydedilir.
7. Monolitik dosyaların gelecekte replace edilmesi geçmiş family kayıtlarını silemez: split-catalog yapısı canonical kabul edilir.
8. Recovery kaynak commitleri belgelenir.
9. Final S39 closeout dokümanı COMPLETE ve audit sonucu içerir.

## Recovery sources

- `df759c1e4f77b956a0319c8fda8aac1b775efbff` — initial UI/UX discovery + ULTEF baseline.
- Relationships, autonomous NPC, settlement, culture, governance, information-flow, opportunity-selection ve narrative-generation commits on 2026-08-09.

## Delivery sequence

1. Recover canonical decisions.
2. Split/recover ULTEF family catalog.
3. Add Interactive Session decisions/tests.
4. Add roadmap + traceability.
5. Run document coverage audit.
6. Mark Sprint 39 COMPLETE.
