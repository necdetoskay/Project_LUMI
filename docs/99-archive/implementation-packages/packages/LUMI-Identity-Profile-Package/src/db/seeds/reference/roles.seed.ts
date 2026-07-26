import { db } from "../../client";
import { roles } from "../../schema/identity";

const roleSeed = [
  {
    code: "system_admin",
    name: "Sistem Yöneticisi",
    description: "Tüm sistem yönetim izinleri.",
    isSystem: true,
  },
  {
    code: "parent",
    name: "Ebeveyn",
    description: "Hane ve çocuk profili yönetimi.",
    isSystem: true,
  },
  {
    code: "support_admin",
    name: "Destek Yöneticisi",
    description: "Destek ve operasyon işlemleri.",
    isSystem: true,
  },
  {
    code: "content_reviewer",
    name: "İçerik İnceleyici",
    description: "Hikâye ve medya inceleme işlemleri.",
    isSystem: true,
  },
] as const;

export async function seedRoles(): Promise<void> {
  await db
    .insert(roles)
    .values(roleSeed)
    .onConflictDoUpdate({
      target: roles.code,
      set: {
        name: roles.name,
        description: roles.description,
        isActive: true,
      },
    });
}
