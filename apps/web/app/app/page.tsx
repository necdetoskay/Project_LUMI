import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export default async function ProtectedAppPage() {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());

  if (!parent) {
    redirect("/login");
  }

  return (
    <section className="container page-section">
      <p className="eyebrow">PROJECT LUMI</p>
      <h1>Ebeveyn alanı hazır.</h1>
      <p className="lead">
        Hoş geldin {parent.displayName}. Bu korunan alan, sonraki adımda çocuk
        profili ve evren başlangıcı akışının bağlanacağı ana yüzey olacak.
      </p>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Çıkış yap</button>
      </form>
    </section>
  );
}
