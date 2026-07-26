# Görsel ve TTS Pipeline

Medya üretimi asenkron job olarak çalışır.

## Görsel
StoryImageRequested → prompt enrichment → provider → moderation → storage → StoryImageReady

## TTS
TTSGenerationRequested → text normalization → voice selection → provider → audio validation → storage → TTSReady

Kullanıcı hikâye metnini medya üretimi tamamlanmadan okuyabilir.
