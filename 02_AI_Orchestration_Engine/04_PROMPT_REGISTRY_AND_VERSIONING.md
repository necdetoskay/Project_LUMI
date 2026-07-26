# Prompt Registry ve Versionlama

Her prompt aşağıdaki metadata ile saklanır:
- prompt_key
- version
- purpose
- supported_age_ranges
- model_preferences
- input_schema
- output_schema
- status
- created_at

Production’da prompt değişikliği doğrudan yapılmaz. Yeni sürüm oluşturulur ve kontrollü rollout uygulanır.
