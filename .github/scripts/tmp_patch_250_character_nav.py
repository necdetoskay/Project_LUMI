from pathlib import Path

path = Path("apps/web/tests/e2e/long-horizon/baseline-onboarding.live.spec.ts")
text = path.read_text()
old = '''      await page
        .getByLabel("Çocuk deneyimi")
        .getByRole("link", { name: "Profil", exact: true })
        .click();'''
new = '''      await page
        .getByLabel("Karakter yolu")
        .getByRole("link", { name: "Profil", exact: true })
        .click({ timeout: 60_000 });'''
count = text.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one stale character-nav block, found {count}")
path.write_text(text.replace(old, new))
