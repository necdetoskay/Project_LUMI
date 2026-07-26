# COMMIT_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Commit Standard

## Purpose

Bu standart, tüm kaynak kodu değişikliklerinin izlenebilir, tutarlı ve
anlaşılır commit mesajlarıyla kayıt altına alınmasını sağlar.

## Core Principles

- Her commit tek bir mantıksal değişikliği temsil etmelidir.
- Büyük değişiklikler küçük ve anlamlı commit'lere bölünmelidir.
- Commit mesajları açık, kısa ve açıklayıcı olmalıdır.

## Commit Message Format

<type>(<scope>): <short summary>

Örnekler:

feat(auth): add refresh token support
fix(api): prevent null reference
docs(eos): update delivery workflow
refactor(world): simplify event scheduler
test(engine): add utility evaluator tests

## Standard Types

- feat
- fix
- docs
- refactor
- test
- perf
- style
- build
- ci
- chore
- revert

## Branch Strategy

- main
- develop
- feature/*
- bugfix/*
- hotfix/*
- release/*

Doğrudan main dalına commit yapılmamalıdır.

## Merge Rules

- Review tamamlanmalıdır.
- Testler başarılı olmalıdır.
- Çakışmalar çözülmelidir.
- CI kontrolleri geçmelidir.

## AI Coding Agent Responsibilities

- Standart commit mesajı oluşturur.
- Gereksiz dosyaları commit etmez.
- Geçici veya hassas dosyaları depoya eklemez.

## Completion Checklist

- [ ] Commit mesajı standartlara uygun
- [ ] Tek mantıksal değişiklik içeriyor
- [ ] Review tamamlandı
- [ ] Testler başarılı
- [ ] Merge için hazır

END OF DOCUMENT
