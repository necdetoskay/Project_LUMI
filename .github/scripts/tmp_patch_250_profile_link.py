from pathlib import Path

path = Path("apps/web/tests/e2e/long-horizon/baseline-onboarding.live.spec.ts")
text = path.read_text()
old = '''      await createdProfileCard
        .getByRole("link", { name: "Profili aç" })
        .click();'''
new = '''      await createdProfileCard
        .getByRole("link", {
          name: "Profili Görüntüle",
          exact: true,
        })
        .click({ timeout: 60_000 });'''
count = text.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one stale profile-link block, found {count}")
path.write_text(text.replace(old, new))
