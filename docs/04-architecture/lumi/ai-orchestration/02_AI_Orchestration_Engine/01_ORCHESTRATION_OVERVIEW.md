# AI Orchestration Genel Tasarımı

AI Orchestrator; hikâye metni, seçimler, özet, eğitim soruları, görsel promptları ve TTS işlerini koordine eder. Domain kararlarını LLM’ye bırakmaz; LLM yalnızca kontrollü üretim motorudur.

Ana bileşenler:
- Context Builder
- Prompt Registry
- Story Generation Pipeline
- Provider Router
- Output Validator
- Safety Filter
- Cost Controller
- Retry/Fallback Manager
- Generation Audit Store
