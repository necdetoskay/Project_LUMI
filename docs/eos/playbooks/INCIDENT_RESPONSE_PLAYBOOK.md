# INCIDENT_RESPONSE_PLAYBOOK.md

Version: 1.0.0
Status: Approved
Classification: Playbook

# Incident Response Playbook

## Purpose

Bu playbook, üretim ortamında meydana gelen operasyonel veya güvenlik
olaylarına hızlı, kontrollü ve izlenebilir şekilde müdahale edilmesini sağlar.

## Severity Levels

- Sev1: Kritik servis kesintisi
- Sev2: Yüksek etki
- Sev3: Orta etki
- Sev4: Düşük etki

## Phase 1 - Detection

- Olay doğrulanır.
- Etki alanı belirlenir.
- Olay kaydı oluşturulur.
- Sorumlular bilgilendirilir.

## Phase 2 - Containment

- Etki yayılması engellenir.
- Gerekirse servis izole edilir.
- Geçici önlemler uygulanır.

## Phase 3 - Investigation

- Loglar incelenir.
- Kök neden analizi yapılır.
- Veri bütünlüğü doğrulanır.
- Güvenlik etkisi değerlendirilir.

## Phase 4 - Recovery

- Düzeltme uygulanır.
- Servisler yeniden devreye alınır.
- Kritik iş akışları doğrulanır.
- Sistem izlenir.

## Phase 5 - Post Incident

- Incident raporu hazırlanır.
- Aksiyon maddeleri oluşturulur.
- Dokümantasyon güncellenir.
- Gerekirse yeni Task ve ADR açılır.

## Communication

- Paydaşlar düzenli bilgilendirilir.
- Kritik kararlar kayıt altına alınır.
- Olay kapanışı duyurulur.

## Exit Criteria

- [ ] Servis kararlı
- [ ] Kök neden belirlendi
- [ ] Aksiyonlar oluşturuldu
- [ ] Dokümantasyon güncellendi
- [ ] Olay kapatıldı

END OF PLAYBOOK
