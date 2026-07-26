# Simulation + Memory Implementation Notes

## 10 günlük sınır

Kullanıcı 10 günden uzun süre dönmezse dünya varsayılan olarak kaldığı noktada dondurulur. Bu, geri dönen kullanıcının açıklanamayan büyük değişikliklerle karşılaşmasını önler.

## Azalan yoğunluk

İlk gün tam yoğunlukta, sonraki günler giderek azalan yoğunlukta simülasyon yapılır. Formül başlangıçta lineer tutulmuştur; daha sonra logarithmic veya domain-specific eğri uygulanabilir.

## Entity time profile

Her entity aynı sıklıkta işlenmez. Yaralı NPC, aktif hedefi olan karakter, kritik olay içindeki bölge veya bozulabilir item daha yüksek time-sensitivity alabilir.

## Append-only event modeli

Simulation events, state changes ve memories geçmişi temsil eder. Geçmiş kayıtlar güncellenmez; düzeltmeler yeni kayıt olarak eklenir.

## Polymorphic entity referansı

`entity_type + entity_id` yapısı tüm domain tablolarına foreign key vermez. Bu esneklik sağlar fakat application validation gerektirir.

## Memory embedding

Embedding kaydı opsiyoneldir. Arama optimizasyonudur; asıl memory payload ve subject ilişkilerinin yerine geçmez.

## Privacy

Çocuğun hafıza kayıtlarından sağlık, tanı veya hassas kişilik çıkarımları üretilmemelidir. Learning ve memory verileri ebeveyn kontrolünde tutulmalıdır.
