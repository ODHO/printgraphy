const CATALOG_IMAGES = {
  stationery: "/catalog/business-stationery-v2.png",
  collateral: "/catalog/print-collateral-v2.png",
  apparel: "/catalog/apparel-totes-v2.png",
  packaging: "/catalog/packaging-v2.png",
  labels: "/catalog/stickers-labels-v2.png",
  promo: "/catalog/promo-products-v2.png",
  signage: "/catalog/signs-posters-v2.png",
} as const;

/**
 * Keeps every catalog surface visually consistent even when a product has an
 * older upload, an unavailable S3 object, or no image stored in the database.
 */
export function catalogImageFor(...values: Array<string | undefined | null>) {
  const value = values.filter(Boolean).join(" ").toLowerCase();

  if (/(t-?shirt|shirt|hoodie|sweatshirt|apparel|clothing|tote|bag)/.test(value)) return CATALOG_IMAGES.apparel;
  if (/(mailer|box|packag|shipping|envelope)/.test(value)) return CATALOG_IMAGES.packaging;
  if (/(sticker|label|decal)/.test(value)) return CATALOG_IMAGES.labels;
  if (/(mug|bottle|drinkware|promo|promotional|merch)/.test(value)) return CATALOG_IMAGES.promo;
  if (/(sign|banner|poster|display|yard)/.test(value)) return CATALOG_IMAGES.signage;
  if (/(flyer|leaflet|brochure|postcard|invitation|booklet|book|calendar|catalog)/.test(value)) return CATALOG_IMAGES.collateral;
  return CATALOG_IMAGES.stationery;
}

export { CATALOG_IMAGES };
