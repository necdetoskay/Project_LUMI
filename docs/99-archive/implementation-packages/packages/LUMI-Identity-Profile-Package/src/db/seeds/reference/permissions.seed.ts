import { db } from "../../client";
import { permissions } from "../../schema/identity";

const permissionSeed = [
  ["household.read", "Haneyi Görüntüle"],
  ["household.manage", "Haneyi Yönet"],
  ["child_profile.read", "Çocuk Profilini Görüntüle"],
  ["child_profile.manage", "Çocuk Profilini Yönet"],
  ["world.read", "Dünyayı Görüntüle"],
  ["world.manage", "Dünyayı Yönet"],
  ["story.generate", "Hikâye Üret"],
  ["story.review", "Hikâye İncele"],
  ["media.generate", "Medya Üret"],
  ["audit.read", "Audit Kayıtlarını Görüntüle"],
] as const;

export async function seedPermissions(): Promise<void> {
  await db
    .insert(permissions)
    .values(
      permissionSeed.map(([code, name]) => ({
        code,
        name,
      })),
    )
    .onConflictDoNothing({
      target: permissions.code,
    });
}
