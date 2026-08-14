from pathlib import Path

path = Path('apps/web/app/app/profiles/[childProfileId]/characters/new/type/character-type-step-client.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace('import Link from "next/link";\n', 'import Image from "next/image";\nimport Link from "next/link";\n', 1)
text = text.replace('  icon: string;\n', '  image: string;\n', 1)
text = text.replace('    icon: "face_6",', '    image: "/onboarding/character-types/human.svg",')
text = text.replace('    icon: "pets",', '    image: "/onboarding/character-types/animal.svg",')
text = text.replace('    icon: "auto_awesome",', '    image: "/onboarding/character-types/fantastic.svg",')
text = text.replace('    icon: "smart_toy",', '    image: "/onboarding/character-types/synthetic.svg",')

text = text.replace(
    '            <h1 className="mt-2 text-4xl font-black tracking-tight text-[#34281f] sm:text-5xl">',
    '            <h1 className="mt-2 font-serif text-4xl font-black tracking-tight text-[#34281f] sm:text-5xl">',
)
text = text.replace(
    '<section className="rounded-[32px] border border-[#d8e5dc] bg-[#fffdf7] p-5 shadow-[0_12px_35px_rgba(89,70,45,0.07)] sm:p-7 lg:p-8">',
    '<section className="relative overflow-hidden rounded-[32px] border border-[#cfe0d5] bg-[radial-gradient(circle_at_top_left,#fffdf7_0,#fffdf7_55%,#f7fbf2_100%)] p-5 shadow-[0_16px_42px_rgba(89,70,45,0.09)] sm:p-7 lg:p-8">\n              <span aria-hidden="true" className="pointer-events-none absolute -left-2 top-4 rotate-[-18deg] text-5xl opacity-55">🌿</span>\n              <span aria-hidden="true" className="pointer-events-none absolute -right-3 bottom-3 rotate-[22deg] text-5xl opacity-35">🍃</span>',
)
text = text.replace(
    '<h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">',
    '<h2 className="mt-2 font-serif text-3xl font-black tracking-tight sm:text-4xl">',
    1,
)
old_visual = '''                      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[linear-gradient(145deg,#edf5ea,#fff0d6)] text-[#16786f] shadow-inner">
                        <span
                          className="material-symbols-outlined text-[48px]"
                          aria-hidden="true"
                        >
                          {type.icon}
                        </span>
                      </div>'''
new_visual = '''                      <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-[linear-gradient(145deg,#edf5ea,#fff0d6)] shadow-[0_8px_24px_rgba(69,70,48,0.14)] sm:h-36 sm:w-36">
                        <Image
                          src={type.image}
                          alt={`${type.title} karakter tipi illüstrasyonu`}
                          width={180}
                          height={180}
                          className="h-full w-full object-cover"
                        />
                      </div>'''
if old_visual not in text:
    raise SystemExit('character visual block not found')
text = text.replace(old_visual, new_visual, 1)
text = text.replace('className={`relative min-h-[250px] rounded-[28px] border p-5 text-center transition', 'className={`relative min-h-[330px] rounded-[28px] border p-5 text-center transition', 1)
text = text.replace('"border-[#16786f] bg-[#eef7f1] shadow-[0_10px_30px_rgba(22,120,111,0.13)] ring-2 ring-[#16786f]/20"', '"border-[#16786f] bg-[#f2faf4] shadow-[0_14px_36px_rgba(22,120,111,0.16)] ring-2 ring-[#16786f]/25"', 1)
text = text.replace('className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[#16786f] text-white"', 'className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#16786f] text-white shadow-md"', 1)
text = text.replace('className="mt-5 text-2xl font-black text-[#176d65]"', 'className="mt-5 font-serif text-2xl font-black text-[#176d65]"', 1)

text = text.replace(
    '<section className="rounded-[28px] border border-[#e4d8c7] bg-[#fffdf7] p-6 shadow-[0_10px_30px_rgba(89,70,45,0.06)]">',
    '<section className="relative overflow-hidden rounded-[28px] border border-[#e4d8c7] bg-[#fffdf7] p-6 shadow-[0_12px_34px_rgba(89,70,45,0.08)]">\n                <span aria-hidden="true" className="pointer-events-none absolute -right-3 top-2 rotate-[20deg] text-4xl opacity-45">🌿</span>',
    1,
)
text = text.replace('<h2 className="text-xl font-black">Seçim etkisi</h2>', '<h2 className="font-serif text-xl font-black">Seçim etkisi</h2>', 1)

old_profile = '''              <section className="rounded-[24px] border border-[#e4d8c7] bg-[#fff9ed] p-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a6d28]">
                  Profil
                </p>
                <p className="mt-2 text-lg font-black">
                  {profile?.displayName ?? "Çocuk profili"}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#a06e25]">
                  ✨ Henüz evren seçilmedi
                </p>
              </section>'''
new_profile = '''              <section className="flex items-center gap-4 rounded-[24px] border border-[#e4d8c7] bg-[#fff9ed] p-5 shadow-sm">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#edf5ea] shadow-sm">
                  <Image
                    src="/onboarding/character-types/human.svg"
                    alt="Profil illüstrasyonu"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a6d28]">Profil</p>
                  <p className="mt-1 truncate font-serif text-lg font-black">{profile?.displayName ?? "Çocuk profili"}</p>
                  <p className="mt-1 text-sm font-semibold text-[#a06e25]">✨ Henüz evren seçilmedi</p>
                </div>
              </section>'''
if old_profile not in text:
    raise SystemExit('profile card block not found')
text = text.replace(old_profile, new_profile, 1)

text = text.replace('className="mt-5 flex flex-col-reverse gap-3 rounded-[26px] border border-[#eadfce] bg-[#fffdf7] p-4 sm:flex-row sm:items-center sm:justify-end"', 'className="mt-5 flex flex-col-reverse gap-3 rounded-[26px] border border-[#eadfce] bg-[#fffdf7] p-4 shadow-[0_10px_28px_rgba(89,70,45,0.06)] sm:flex-row sm:items-center sm:justify-end"', 1)
text = text.replace('className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-[#16786f] px-6 font-extrabold text-white shadow-sm transition', 'className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1a8176,#167066)] px-6 font-extrabold text-white shadow-[0_8px_20px_rgba(22,120,111,0.22)] transition', 1)

path.write_text(text, encoding='utf-8')
