/**
 * Registered business scope (经营范围) — 一般经营项目 (general items) exactly as printed on the license,
 * in license order. `zh` values are verbatim. Nothing may be added here that the license does not list.
 *
 * Each item belongs to exactly one display group. The groups (except `trade-services`) are also the
 * product-category slugs, so categories and scope share one source of truth.
 */
export const SCOPE_GROUPS = [
  "trade-services",
  "consumer-goods",
  "apparel-accessories",
  "food-products",
  "household-products",
  "building-materials",
  "decorative-materials",
  "hardware-products",
  "electrical-products",
  "machinery-equipment",
  "metal-products",
  "minerals-ores",
  "medical-protective-supplies",
] as const;

export type ScopeGroup = (typeof SCOPE_GROUPS)[number];

export interface ScopeItem {
  /** Stable kebab-case id, used as the i18n key under `scope.items.<id>`. */
  readonly id: string;
  /** Verbatim license text for this item. */
  readonly zh: string;
  readonly group: ScopeGroup;
}

export const BUSINESS_SCOPE_ITEMS: readonly ScopeItem[] = [
  { id: "domestic-trade-agency", zh: "国内贸易代理", group: "trade-services" },
  { id: "food-import-export", zh: "食品进出口", group: "food-products" },
  { id: "import-export-agency", zh: "进出口代理", group: "trade-services" },
  { id: "goods-import-export", zh: "货物进出口", group: "trade-services" },
  { id: "toys", zh: "玩具销售", group: "consumer-goods" },
  { id: "moulds", zh: "模具销售", group: "machinery-equipment" },
  { id: "apparel-wholesale", zh: "服装服饰批发", group: "apparel-accessories" },
  { id: "footwear-headwear-wholesale", zh: "鞋帽批发", group: "apparel-accessories" },
  { id: "garment-accessories", zh: "服装辅料销售", group: "apparel-accessories" },
  { id: "apparel-retail", zh: "服装服饰零售", group: "apparel-accessories" },
  { id: "maternal-infant-products", zh: "母婴用品销售", group: "consumer-goods" },
  {
    id: "internet-sales",
    zh: "互联网销售（除销售需要许可的商品）",
    group: "trade-services",
  },
  { id: "jewelry-retail", zh: "珠宝首饰零售", group: "consumer-goods" },
  { id: "jewelry-wholesale", zh: "珠宝首饰批发", group: "consumer-goods" },
  { id: "daily-necessities", zh: "日用品销售", group: "household-products" },
  { id: "bags-luggage", zh: "箱包销售", group: "apparel-accessories" },
  { id: "daily-sundries", zh: "日用杂品销售", group: "household-products" },
  { id: "cosmetics-wholesale", zh: "化妆品批发", group: "consumer-goods" },
  { id: "cosmetics-retail", zh: "化妆品零售", group: "consumer-goods" },
  { id: "building-decoration-materials", zh: "建筑装饰材料销售", group: "decorative-materials" },
  { id: "doors-windows", zh: "门窗销售", group: "building-materials" },
  { id: "hardware-retail", zh: "五金产品零售", group: "hardware-products" },
  { id: "wires-cables", zh: "电线、电缆经营", group: "electrical-products" },
  { id: "thermal-insulation-materials", zh: "保温材料销售", group: "building-materials" },
  { id: "mechanical-parts", zh: "机械零件、零部件销售", group: "machinery-equipment" },
  { id: "building-materials", zh: "建筑材料销售", group: "building-materials" },
  { id: "construction-metal-fittings", zh: "建筑用金属配件销售", group: "building-materials" },
  { id: "power-distribution-switchgear", zh: "配电开关控制设备销售", group: "electrical-products" },
  { id: "fans-blowers", zh: "风机、风扇销售", group: "machinery-equipment" },
  { id: "metal-products", zh: "金属制品销售", group: "metal-products" },
  { id: "lightweight-building-materials", zh: "轻质建筑材料销售", group: "building-materials" },
  { id: "hardware-wholesale", zh: "五金产品批发", group: "hardware-products" },
  { id: "coal-products", zh: "煤炭及制品销售", group: "minerals-ores" },
  { id: "non-metallic-minerals", zh: "非金属矿及制品销售", group: "minerals-ores" },
  { id: "metal-materials", zh: "金属材料销售", group: "metal-products" },
  { id: "medical-ppe-wholesale", zh: "医护人员防护用品批发", group: "medical-protective-supplies" },
  { id: "medical-ppe-retail", zh: "医护人员防护用品零售", group: "medical-protective-supplies" },
  { id: "class-i-medical-devices", zh: "第一类医疗器械销售", group: "medical-protective-supplies" },
  { id: "metal-ores", zh: "金属矿石销售", group: "minerals-ores" },
  { id: "mining-machinery", zh: "矿山机械销售", group: "machinery-equipment" },
] as const;

/** Heading printed before the item list: "General business items". */
export const SCOPE_PREFIX_ZH = "一般经营项目：";

/**
 * Qualifier printed after the item list: "(Except for projects that require approval according to
 * law, operate independently in accordance with the law with the business license)".
 * This applies to the whole scope and must always be displayed with it.
 */
export const SCOPE_SUFFIX_ZH = "（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）";

/** Reassembles the scope exactly as printed on the license. */
export function getFullScopeTextZh(): string {
  return SCOPE_PREFIX_ZH + BUSINESS_SCOPE_ITEMS.map((item) => item.zh).join("；") + SCOPE_SUFFIX_ZH;
}

export function getScopeItemsByGroup(group: ScopeGroup): readonly ScopeItem[] {
  return BUSINESS_SCOPE_ITEMS.filter((item) => item.group === group);
}

export function getScopeItem(id: string): ScopeItem | undefined {
  return BUSINESS_SCOPE_ITEMS.find((item) => item.id === id);
}
