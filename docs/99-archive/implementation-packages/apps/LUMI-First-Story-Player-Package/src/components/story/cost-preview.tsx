import { formatTry } from "@/lib/story/format-currency";
import type { StoryCostEstimate } from "@/lib/story/cost-estimator";

export function CostPreview({
  estimate,
}: {
  estimate: StoryCostEstimate;
}) {
  return (
    <section className="rounded-xl border bg-muted/20 p-5">
      <h2 className="font-medium">
        Tahmini üretim maliyeti
      </h2>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Metin üretimi</dt>
          <dd>{formatTry(estimate.textCostTry)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Görseller</dt>
          <dd>{formatTry(estimate.imageCostTry)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Seslendirme</dt>
          <dd>{formatTry(estimate.ttsCostTry)}</dd>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t pt-3 font-medium">
          <dt>Toplam</dt>
          <dd>{formatTry(estimate.totalCostTry)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Bu değer tahminidir. Gerçek maliyet kullanılan model,
        token miktarı ve üretilen medya sayısına göre değişebilir.
      </p>
    </section>
  );
}
