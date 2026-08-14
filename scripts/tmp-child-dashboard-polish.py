from pathlib import Path

path = Path('apps/web/app/app/profiles/[childProfileId]/child-dashboard-client-page.tsx')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        '              onOpenCharacters={() => setView("characters")}\n              onOpenStories={() => setView("stories")}',
        '              childProfileId={childProfileId}\n              onOpenCharacters={() => setView("characters")}\n              onOpenStories={() => setView("stories")}',
    ),
    (
        'function HomeView({\n  householdId,\n  primaryCharacter,',
        'function HomeView({\n  childProfileId,\n  householdId,\n  primaryCharacter,',
    ),
    (
        '}: {\n  householdId: string | null;\n  primaryCharacter: CharacterInfo | null;',
        '}: {\n  childProfileId: string;\n  householdId: string | null;\n  primaryCharacter: CharacterInfo | null;',
    ),
    (
        '''            <button\n              type="button"\n              onClick={onOpenCharacters}\n              className="rounded-2xl bg-[#6c42df] px-4 py-3 text-sm font-black text-white"\n            >\n              + Yeni Karakter Oluştur\n            </button>''',
        '''            <Link\n              href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/type`}\n              className="rounded-2xl bg-[#6c42df] px-4 py-3 text-sm font-black text-white"\n            >\n              + Yeni Karakter Oluştur\n            </Link>''',
    ),
    ('                  {primaryCharacter.characterType}', '                  {characterRoleLabel(primaryCharacter)}'),
    ('                  {primaryCharacter.subtype || primaryCharacter.broadKind}', '                  {characterKindLabel(primaryCharacter)}'),
    ('          href={`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`}', '          href={`/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/type`}'),
    ('                  {character.characterType}', '                  {characterRoleLabel(character)}'),
    ('                  {character.subtype || character.broadKind}', '                  {characterKindLabel(character)}'),
    (
        '''                <p className="mt-4 text-xs leading-5 text-[#8a7c70]">\n                  Arşivleme/silme aksiyonu soft-delete PR’ı yeni shell’e\n                  taşındığında bu kartın sağ üstüne bağlanacak.\n                </p>''',
        '''                <p className="mt-4 text-xs leading-5 text-[#8a7c70]">\n                  Birlikte keşfettiğiniz yerler ve maceralar burada birikir.\n                </p>''',
    ),
    (
        '            <h2 className="text-xl font-black">🎒 Çanta Özeti</h2>',
        '''            <h2 className="inline-flex items-center gap-2 text-xl font-black">\n              <span className="material-symbols-outlined text-[#6c42df]">backpack</span>\n              Çanta Özeti\n            </h2>''',
    ),
    (
        '                  <div className="text-2xl">{itemEmoji(item.category)}</div>',
        '''                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3eee6] text-[#6c42df]">\n                    <span className="material-symbols-outlined">{itemIcon(item)}</span>\n                  </div>''',
    ),
    (
        '              <div className="text-4xl">{itemEmoji(item.category)}</div>',
        '''              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f3eee6] text-[#6c42df]">\n                <span className="material-symbols-outlined">{itemIcon(item)}</span>\n              </div>''',
    ),
    ('                {item.category} · {item.quantity} adet', '                {itemCategoryLabel(item.category)} · {item.quantity} adet'),
    (
        '''          <h3 className="mt-1 font-black leading-5">{source.title}</h3>\n          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6e6157]">\n            {source.summary}\n          </p>''',
        '''          <h3 className="mt-1 font-black leading-5">\n            {storySourceTitle(source)}\n          </h3>\n          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6e6157]">\n            {storySourceSummary(source)}\n          </p>''',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'expected dashboard fragment not found: {old[:80]!r}')
    text = text.replace(old, new, 1)

old_helper = '''function itemEmoji(category: string) {\n  const normalized = category.toLocaleLowerCase("tr-TR");\n  if (normalized.includes("compass") || normalized.includes("pusula"))\n    return "🧭";\n  if (normalized.includes("light") || normalized.includes("fener")) return "🏮";\n  if (normalized.includes("leaf") || normalized.includes("yaprak")) return "🍃";\n  if (normalized.includes("book") || normalized.includes("kitap")) return "📖";\n  return "🎒";\n}\n'''

new_helper = '''function characterRoleLabel(character: CharacterInfo) {\n  const value = `${character.characterType} ${character.subtype}`.toLocaleLowerCase("tr-TR");\n  if (value.includes("explorer") || value.includes("kaşif") || value.includes("kasif")) return "Meraklı Kaşif";\n  if (value.includes("guardian") || value.includes("koruyucu")) return "Cesur Koruyucu";\n  if (value.includes("inventor") || value.includes("mucit")) return "Yaratıcı Mucit";\n  if (value.includes("storyteller") || value.includes("anlatıcı")) return "Hikâye Anlatıcısı";\n  return "Macera Arkadaşı";\n}\n\nfunction characterKindLabel(character: CharacterInfo) {\n  const value = `${character.broadKind} ${character.subtype}`.toLocaleLowerCase("tr-TR");\n  if (value.includes("child")) return "Genç Maceracı";\n  if (value.includes("human") || value.includes("insan")) return "İnsan";\n  if (value.includes("animal") || value.includes("hayvan")) return "Hayvan Dost";\n  if (value.includes("fantasy") || value.includes("fantastic") || value.includes("fantastik")) return "Fantastik Karakter";\n  if (value.includes("robot") || value.includes("synthetic") || value.includes("sentetik")) return "Robot Dost";\n  return "Özel Karakter";\n}\n\nfunction looksTechnical(value: string) {\n  const normalized = value.trim().toLocaleLowerCase("tr-TR");\n  if (!normalized) return true;\n  return normalized.includes("_") || normalized.includes("-") || /\\b(story|direct|inventory|origin|item|hook|child|explorer)\\b/.test(normalized) || /\\b(isik|esya|hikaye|dogrudan|gezgibi)\\b/.test(normalized);\n}\n\nfunction storySourceTitle(source: StorySource) {\n  if (!looksTechnical(source.title)) return source.title;\n  if (source.kind === "inventory") return "Çantandaki eşya seni bir yere çağırıyor";\n  if (source.kind === "origin") return "Geçmişten gelen eski bir iz";\n  return "Dünyada yeni bir iz belirdi";\n}\n\nfunction storySourceSummary(source: StorySource) {\n  if (!looksTechnical(source.summary)) return source.summary;\n  if (source.kind === "inventory") return "Yanındaki eşyalardan biri yeni bir maceranın kapısını aralayabilir.";\n  if (source.kind === "origin") return "Karakterinin geçmişinden gelen küçük bir ipucu yeniden ortaya çıktı.";\n  return "Dünyada olan bir değişiklik seni yeni bir keşfe davet ediyor.";\n}\n\nfunction itemIcon(item: InventoryItem) {\n  const normalized = `${item.category} ${item.displayName}`.toLocaleLowerCase("tr-TR");\n  if (normalized.includes("compass") || normalized.includes("pusula")) return "explore";\n  if (normalized.includes("light") || normalized.includes("fener") || normalized.includes("lantern")) return "flashlight_on";\n  if (normalized.includes("leaf") || normalized.includes("yaprak") || normalized.includes("plant")) return "eco";\n  if (normalized.includes("book") || normalized.includes("kitap") || normalized.includes("scroll")) return "menu_book";\n  if (normalized.includes("key") || normalized.includes("anahtar")) return "key";\n  if (normalized.includes("gem") || normalized.includes("crystal") || normalized.includes("kristal")) return "diamond";\n  if (normalized.includes("toy") || normalized.includes("oyuncak")) return "toys";\n  return "category";\n}\n\nfunction itemCategoryLabel(category: string) {\n  const normalized = category.toLocaleLowerCase("tr-TR");\n  if (normalized.includes("tool")) return "Araç";\n  if (normalized.includes("story") || normalized.includes("quest")) return "Macera Eşyası";\n  if (normalized.includes("book")) return "Kitap";\n  if (normalized.includes("toy")) return "Oyuncak";\n  if (normalized.includes("collect")) return "Koleksiyon";\n  return "Eşya";\n}\n'''

if old_helper not in text:
    raise SystemExit('itemEmoji helper not found')
text = text.replace(old_helper, new_helper, 1)
path.write_text(text, encoding='utf-8')
