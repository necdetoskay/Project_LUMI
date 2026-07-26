# Safety Review Rules

- Tüm çocuk hikâyeleri publish öncesi safety review'dan geçer.
- `block` kararı persistence işlemini durdurur.
- `manual_review` kararı kullanıcıya hazır içerik olarak sunulmaz.
- `allow_with_changes` kararında revize edilmiş story persist edilir.
- Safety reasons yapılandırılmış veri olarak saklanır.
- Child-specific kişisel bilgi prompt'a gereksiz şekilde eklenmez.
