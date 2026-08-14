from pathlib import Path

path = Path('apps/web/app/app/profiles/[childProfileId]/characters/new/type/character-type-step-client.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace('import Image from "next/image";\n', '')

text = text.replace('  image: string;\n', '')
text = text.replace('    image: "/onboarding/character-types/human.svg",\n', '')
text = text.replace('    image: "/onboarding/character-types/animal.svg",\n', '')
text = text.replace('    image: "/onboarding/character-types/fantastic.svg",\n', '')
text = text.replace('    image: "/onboarding/character-types/synthetic.svg",\n', '')

old_signature = '''export default function CharacterTypeStepClient({
  childProfileId,
}: {
  childProfileId: string;
}) {'''
new_signature = '''export default function CharacterTypeStepClient({
  childProfileId,
  characterTypeVisuals,
  fallbackCharacterTypeVisuals,
}: {
  childProfileId: string;
  characterTypeVisuals: Record<CharacterKind, string>;
  fallbackCharacterTypeVisuals: Record<CharacterKind, string>;
}) {'''
if old_signature not in text:
    raise SystemExit('signature not found')
text = text.replace(old_signature, new_signature, 1)

old_image = '''                        <Image
                          src={type.image}
                          alt={`${type.title} karakter tipi illüstrasyonu`}
                          width={180}
                          height={180}
                          className="h-full w-full object-cover"
                        />'''
new_image = '''                        <img
                          src={characterTypeVisuals[type.id]}
                          alt={`${type.title} karakter tipi illüstrasyonu`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            const fallback = fallbackCharacterTypeVisuals[type.id];
                            if (event.currentTarget.src !== new URL(fallback, window.location.origin).href) {
                              event.currentTarget.src = fallback;
                            }
                          }}
                        />'''
if old_image not in text:
    raise SystemExit('type image block not found')
text = text.replace(old_image, new_image, 1)

old_profile = '''                  <Image
                    src="/onboarding/character-types/human.svg"
                    alt="Profil illüstrasyonu"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />'''
new_profile = '''                  <img
                    src={characterTypeVisuals.human}
                    alt="Profil illüstrasyonu"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const fallback = fallbackCharacterTypeVisuals.human;
                      if (event.currentTarget.src !== new URL(fallback, window.location.origin).href) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                  />'''
if old_profile not in text:
    raise SystemExit('profile image block not found')
text = text.replace(old_profile, new_profile, 1)

path.write_text(text, encoding='utf-8')
