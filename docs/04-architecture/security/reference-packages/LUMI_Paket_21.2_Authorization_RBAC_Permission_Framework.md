# Project LUMI -- Paket 21.2

# Authorization, RBAC & Permission Framework

## Amaç

LUMI'de kullanıcıların yalnızca yetkili oldukları kaynaklara
erişebilmesini sağlayan rol ve izin mimarisini tanımlamak.

## RBAC Modeli

Temel roller:

-   Parent (Ebeveyn)
-   Child (Çocuk)
-   Moderator
-   Support
-   Administrator
-   System Service

Her rol varsayılan izinlerle gelir ve gerektiğinde genişletilebilir.

## İzin Modeli

İzin kategorileri:

-   Story
-   Character
-   World
-   Inventory
-   Media
-   User Profile
-   Administration
-   Reporting

İşlem türleri:

-   Read
-   Create
-   Update
-   Delete
-   Execute
-   Approve

## Kaynak Bazlı Erişim

Her istekte doğrulanan bilgiler:

-   Kullanıcı
-   Rol
-   İzin
-   Kaynak sahibi
-   Kaynak durumu

## Yetki Kalıtımı

-   Roller ortak izinleri devralabilir.
-   Özel izinler rol bazında geçersiz kılınabilir.
-   Servis hesapları minimum yetki ile çalışır.

## Güvenlik Kuralları

-   Least Privilege
-   Default Deny
-   Permission Audit
-   Yetki değişikliği loglama

## Denetim

Kaydedilen olaylar:

-   Rol atama
-   Rol kaldırma
-   İzin ekleme
-   İzin kaldırma
-   Yetkisiz erişim denemesi

## Test Senaryoları

-   Yetkili erişim
-   Yetkisiz erişim
-   Rol değişikliği
-   İzin devralma
-   Kaynak sahibi kontrolü

## Çıktılar

-   RBAC Architecture
-   Permission Matrix
-   Authorization Flow
-   Audit Report
-   Authorization Test Report
