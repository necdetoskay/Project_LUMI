import { relations } from "drizzle-orm";

import { assetVariants } from "./asset-variants";
import { assets } from "./assets";

export const assetsRelations = relations(
  assets,
  ({ many }) => ({
    variants: many(assetVariants),
  }),
);

export const assetVariantsRelations = relations(
  assetVariants,
  ({ one }) => ({
    asset: one(assets, {
      fields: [assetVariants.assetId],
      references: [assets.id],
    }),
  }),
);
