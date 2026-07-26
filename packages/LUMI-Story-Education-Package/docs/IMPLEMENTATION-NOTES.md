# Story + Education Implementation Notes

## Story version immutability

Yayınlanmış story version güncellenmemelidir. Değişiklik gerektiğinde yeni version oluşturulmalıdır.

## Node modeli

Story content hem JSONB dokümanı hem normalize node/choice tabloları ile temsil edilebilir. Runtime traversal için node tabloları, tam üretim çıktısı için content JSONB kullanılabilir.

## Participant snapshot

Karakter adı, tipi ve kritik başlangıç durumu session başlangıcında snapshot olarak tutulur. Böylece karakter daha sonra değişse bile geçmiş hikâye tutarlı kalır.

## Decision history

Session decisions append-only'dir. Bir karar geriye dönük değiştirilmez; düzeltme gerekiyorsa ayrı story event yazılır.

## Education observations

Learning observation alanı tanı/puanlama sistemi değildir. Çocuğun tekil cevaplarından kalıcı kişilik veya sağlık çıkarımı yapılmamalıdır.

## Session outcome

Session başına tek outcome vardır. Çok aşamalı sonuçlar payload içinde veya story_events tablosunda tutulabilir.
