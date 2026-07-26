# Worker Observability

İzlenmesi gereken metrikler:

- Pending simulation jobs
- Running jobs
- Failed jobs
- Last 24h completed runs
- Average duration
- Average simulated days
- Frozen run count
- Outbox backlog
- Events per run
- Actions per run
- Memories created per run

## Alarm önerileri

- Failed job oranı yükselirse
- Aynı world için tekrarlı failure oluşursa
- Outbox backlog büyürse
- Simulation duration eşik değerini aşarsa
- Checkpoint yazılamazsa
