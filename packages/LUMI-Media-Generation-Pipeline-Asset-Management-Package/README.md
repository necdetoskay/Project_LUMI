# LUMI — Media Generation Pipeline + Asset Management

Bu paket, Project LUMI'nin görsel ve ses üretim altyapısını, medya varlığı yaşam döngüsünü ve maliyet kontrolünü kurar.

## Kapsam

- Image generation provider abstraction
- Audio/TTS provider abstraction
- Asset request lifecycle
- Cost preview
- Actual cost reconciliation
- Character consistency metadata
- Prompt templates
- Asset moderation
- Retry and fallback
- Storage abstraction
- Thumbnail generation
- Asset status polling
- Story media attachment
- Integration tests

## Ana akış

```text
Story Node / Character / World Request
→ Media Request
→ Cost Preview
→ Parent Approval Check
→ Prompt Rendering
→ Provider Selection
→ Moderation
→ Generation
→ Retry / Fallback
→ Storage
→ Thumbnail
→ Cost Reconciliation
→ Story Attachment
→ Ready Status
```

## Sonraki aşama

Audio Playback + Story Media Experience
