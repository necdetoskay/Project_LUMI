# Job Architecture

Ana parçalar:
- Job producer
- Queue
- Worker pool
- Job state store
- Retry scheduler
- Dead-letter queue

Job payload küçük tutulur; büyük context DB veya object storage üzerinden okunur.
