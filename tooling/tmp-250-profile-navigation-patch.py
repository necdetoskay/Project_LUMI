from pathlib import Path

path = Path("apps/web/tests/e2e/long-horizon/baseline-onboarding.live.spec.ts")
text = path.read_text()

old = '''      const newChildLink = page
        .locator('a[href="/app/onboarding?addProfile=1"]')
        .first();
      await expect(
        newChildLink,
        "The live parent account must already have a primary household before this persistent pack runs",
      ).toBeVisible({ timeout: 60_000 });
      await newChildLink.click();
'''

new = '''      const emptyDashboardAddProfile = page.getByRole("link", {
        name: "Çocuk Profili Oluştur",
        exact: true,
      });

      if (await emptyDashboardAddProfile.isVisible()) {
        await emptyDashboardAddProfile.click();
      } else {
        const childAreaLink = page.getByRole("link", {
          name: /Çocuğun alanını aç/,
        });
        await expect(
          childAreaLink,
          "The live parent account must already have a primary household and an accessible child-profile path before this persistent pack runs",
        ).toBeVisible({ timeout: 60_000 });
        await childAreaLink.click();

        const profilesLink = page.getByRole("link", {
          name: "Çocuklar",
          exact: true,
        });
        await expect(profilesLink).toBeVisible({ timeout: 60_000 });
        await profilesLink.click();
        await expect(page).toHaveURL(/\\/app\\/profiles\\/?$/, {
          timeout: 60_000,
        });

        const newChildLink = page.getByRole("link", {
          name: "Yeni Profil Ekle",
          exact: true,
        });
        await expect(newChildLink).toBeVisible({ timeout: 60_000 });
        await newChildLink.click();
      }
'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one stale navigation block, found {count}")

path.write_text(text.replace(old, new))
