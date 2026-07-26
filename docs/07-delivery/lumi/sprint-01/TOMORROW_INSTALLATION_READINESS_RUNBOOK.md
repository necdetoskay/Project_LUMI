# Sprint 01 — Yarın Kurulum Hazırlık ve Uygulama Runbook'u

## Belge Kimliği

- Sürüm: **1.0**
- Durum: **Ready for Execution**
- Hazırlanma tarihi: **26 Temmuz 2026**
- Hedef uygulama tarihi: **27 Temmuz 2026**
- Ortam: **Windows 11 / PowerShell / Docker Desktop**

## Amaç

Bu belge, Project LUMI'nin ilk yerel çalıştırmasını karar gerektirmeyen,
kanıtlanabilir ve geri alınabilir bir akışa dönüştürür. Yalnızca repoda bugün
gerçekten bulunan komutları ve uç noktaları kullanır.

## Bugünün Sınırı

26 Temmuz 2026 tarihinde:

- paket kurulmaz;
- Docker servisleri başlatılmaz;
- `.env` oluşturulmaz veya değiştirilmez;
- migration, seed veya veri sıfırlama komutu çalıştırılmaz;
- uygulama kodu ya da mimari kapsam değiştirilmez.

Bugün için hazırlık, bu runbook'un gözden geçirilmesiyle tamamlanır.

## Başarı Tanımı

Kurulum aşağıdakilerin tamamı sağlandığında başarılıdır:

| Kontrol | Beklenen sonuç |
|---|---|
| Kaynak kontrolü | `main` güncel ve çalışma ağacı temiz |
| Node.js | `>=22 <25` |
| pnpm | `11.7.0` |
| Docker | İstemci ve sunucu erişilebilir |
| Portlar | `3000`, `5432`, `6379` kullanılabilir |
| Bağımlılıklar | Kilit dosyası değiştirilmeden kurulur |
| Kalite kapıları | format, lint, typecheck, test ve build başarılı |
| Altyapı | PostgreSQL ve Redis healthy |
| Web | `http://localhost:3000` açılır |
| Sağlık kontrolü | `/api/health` HTTP 200 ve `status: "ok"` döndürür |

## Durma Koşulları

Aşağıdakilerden biri oluşursa ilgili aşamada durulur ve sonraki adıma geçilmez:

- yanlış branch veya temiz olmayan çalışma ağacı;
- Node.js ya da pnpm sürüm uyumsuzluğu;
- Docker daemon'a erişilememesi;
- gerekli portlardan birinin başka süreç tarafından kullanılması;
- `--frozen-lockfile` kurulum hatası;
- herhangi bir kalite kapısının başarısız olması;
- PostgreSQL veya Redis'in healthy olmaması;
- web uygulamasının ya da sağlık uç noktasının açılmaması.

Hata halinde kilit dosyası, Compose dosyası veya port ayarı gelişigüzel
değiştirilmez. Önce hata çıktısı kaydedilir.

## 1. Repo Kontrolü

Repo kökünde çalıştır:

```powershell
git switch main
git pull
git status --short
git log -1 --oneline
```

Beklenen:

- `git status --short` çıktı üretmez;
- branch `main` olur;
- son commit kimliği kurulum kanıtına kaydedilir.

Çıktı varsa kullanıcı değişiklikleri silinmez veya stash edilmez; çalışma
durdurulur.

## 2. Araç Zinciri Kontrolü

```powershell
node --version
corepack --version
pnpm --version
docker version
docker compose version
```

Beklenen:

- Node.js ana sürümü `22`, `23` veya `24`;
- pnpm tam olarak `11.7.0`;
- `docker version`, hem Client hem Server bölümlerini gösterir;
- Compose v2 erişilebilirdir.

`pnpm` bulunamazsa yalnızca o zaman:

```powershell
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
```

Docker yalnızca Client bilgisi gösterirse Docker Desktop açılır ve Server
erişilebilir olana kadar kurulum akışına devam edilmez.

## 3. Port Kontrolü

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,5432,6379 -ErrorAction SilentlyContinue
```

Beklenen sonuç çıktı olmamasıdır. Bir port doluysa süreç kimliğini incele:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,5432,6379 -ErrorAction SilentlyContinue |
  Select-Object LocalPort,OwningProcess
```

Süreç otomatik olarak sonlandırılmaz. Önce sahibinin Docker, başka bir geliştirme
sunucusu veya yerel veritabanı olup olmadığı belirlenir.

## 4. Ortam Dosyası

Mevcut `.env` dosyasının üzerine yazmadan:

```powershell
if (Test-Path .env) {
  Write-Host ".env mevcut; üzerine yazılmadı."
} else {
  Copy-Item .env.example .env
}
```

Ardından:

```powershell
git status --short
```

`.env` takip edilen bir dosya olarak görünürse devam edilmez. Yerel geliştirme
değerleri dışındaki gerçek erişim bilgileri repo dosyalarına yazılmaz.

## 5. Bağımlılık Kurulumu

```powershell
pnpm install --frozen-lockfile
git status --short
```

Beklenen:

- kurulum başarıyla biter;
- `pnpm-lock.yaml` değişmez;
- takip edilen dosyalarda beklenmeyen değişiklik oluşmaz.

## 6. Kalite Kapıları

Sırasıyla çalıştır:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Her komutun çıkış kodu başarılı olmalıdır. Bir komut başarısız olursa sonraki
komuta geçilmez; tam hata çıktısı kaydedilir.

## 7. Yerel Altyapı

```powershell
pnpm infra:up
pnpm infra:status
```

Beklenen:

- PostgreSQL healthy;
- Redis healthy.

Sorun halinde:

```powershell
pnpm infra:logs
```

`pnpm infra:reset --confirm` yerel veriyi sildiği için standart kurulum akışının
parçası değildir ve bu runbook kapsamında çalıştırılmaz.

## 8. Web Uygulaması

Birinci PowerShell penceresinde:

```powershell
pnpm dev
```

İkinci PowerShell penceresinde:

```powershell
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
Invoke-RestMethod http://localhost:3000/api/health
```

Beklenen:

- ana sayfa HTTP 200 döndürür;
- sağlık yanıtında `service` değeri `lumi-web`;
- sağlık yanıtında `status` değeri `ok`.

## 9. Kapatma

Geliştirme sunucusu birinci pencerede `Ctrl+C` ile kapatılır. Altyapı:

```powershell
pnpm infra:down
```

Bu komut named volume'ları silmez. `--volumes` veya
`pnpm infra:reset --confirm` kullanılmaz.

## 10. Kanıt Kaydı

Kurulum sonunda aşağıdakiler kaydedilir:

| Kanıt | Kaydedilecek bilgi |
|---|---|
| Kaynak sürümü | `git log -1 --oneline` |
| Ortam | OS, Node.js, pnpm, Docker ve Compose sürümleri |
| Kurulum | `pnpm install --frozen-lockfile` sonucu |
| Kalite | Beş kalite komutunun sonucu |
| Altyapı | `pnpm infra:status` çıktısı |
| Web | Ana sayfa HTTP durumu |
| Sağlık | `/api/health` yanıtı |
| Sapmalar | Hata, geçici çözüm ve alınan kararlar |

Tam teslim kanıtı için
[`spec/Project_LUMI_Sprint_01_Spec_v1.0/08_Handoff/03_Sprint_Completion_Report_Template.md`](spec/Project_LUMI_Sprint_01_Spec_v1.0/08_Handoff/03_Sprint_Completion_Report_Template.md)
şablonu kullanılır.

## Bilinen Kapsam Gerçeği

Bu çalıştırma, mevcut monorepo, web kabuğu, PostgreSQL ve Redis temelini
doğrular. Repoda henüz bulunmayan migration, seed, ayrıntılı readiness/liveness
uç noktaları veya sonraki sprint özellikleri bu kurulumun başarı şartı gibi
gösterilmez. Bunlar ilgili Sprint 01 görevlerinde ayrı ayrı tamamlanıp kabul
edilmelidir.

