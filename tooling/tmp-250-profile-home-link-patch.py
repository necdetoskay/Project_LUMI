from pathlib import Path

path = Path("apps/web/tests/e2e/long-horizon/baseline-onboarding.live.spec.ts")
text = path.read_text()

old = '''        const profilesLink = page.getByRole("link", {
          name: "Çocuklar",
          exact: true,
        });
        await expect(profilesLink).toBeVisible({ timeout: 60_000 });
        await profilesLink.click();
'''

new = '''        const profilesLink = page
          .locator('a[href="/app/profiles"]')
          .filter({ hasText: "LUMI" })
          .first();
        await expect(profilesLink).toBeVisible({ timeout: 60_000 });
        await profilesLink.click();
'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one stale child-dashboard profiles link block, found {count}")

path.write_text(text.replace(old, new))
