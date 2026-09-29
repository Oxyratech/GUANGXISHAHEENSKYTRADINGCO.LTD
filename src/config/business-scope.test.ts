import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_SLUGS, getCategoryScopeItems } from "@/content/categories";
import { SERVICES } from "@/content/services";
import {
  BUSINESS_SCOPE_ITEMS,
  getFullScopeTextZh,
  getScopeItem,
  SCOPE_GROUPS,
} from "./business-scope";

/**
 * Golden copy of the business scope exactly as printed on the license (营业执照, 经营范围).
 * If this test fails, the registry has drifted from the license — fix the registry, not this string,
 * unless the license itself has changed.
 */
const LICENSE_SCOPE_VERBATIM =
  "一般经营项目：国内贸易代理；食品进出口；进出口代理；货物进出口；玩具销售；模具销售；服装服饰批发；鞋帽批发；服装辅料销售；服装服饰零售；母婴用品销售；互联网销售（除销售需要许可的商品）；珠宝首饰零售；珠宝首饰批发；日用品销售；箱包销售；日用杂品销售；化妆品批发；化妆品零售；建筑装饰材料销售；门窗销售；五金产品零售；电线、电缆经营；保温材料销售；机械零件、零部件销售；建筑材料销售；建筑用金属配件销售；配电开关控制设备销售；风机、风扇销售；金属制品销售；轻质建筑材料销售；五金产品批发；煤炭及制品销售；非金属矿及制品销售；金属材料销售；医护人员防护用品批发；医护人员防护用品零售；第一类医疗器械销售；金属矿石销售；矿山机械销售（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）";

describe("registered business scope", () => {
  it("reproduces the license text verbatim", () => {
    expect(getFullScopeTextZh()).toBe(LICENSE_SCOPE_VERBATIM);
  });

  it("has exactly 40 general business items", () => {
    expect(BUSINESS_SCOPE_ITEMS).toHaveLength(40);
  });

  it("has unique ids and unique Chinese texts", () => {
    const ids = new Set(BUSINESS_SCOPE_ITEMS.map((i) => i.id));
    const zh = new Set(BUSINESS_SCOPE_ITEMS.map((i) => i.zh));
    expect(ids.size).toBe(40);
    expect(zh.size).toBe(40);
  });

  it("assigns every item to a known group and uses every group", () => {
    const used = new Set(BUSINESS_SCOPE_ITEMS.map((i) => i.group));
    for (const item of BUSINESS_SCOPE_ITEMS) expect(SCOPE_GROUPS).toContain(item.group);
    for (const group of SCOPE_GROUPS) expect(used.has(group)).toBe(true);
  });

  it("ids are kebab-case (they double as i18n keys)", () => {
    for (const item of BUSINESS_SCOPE_ITEMS)
      expect(item.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
  });
});

describe("product categories derive from the scope", () => {
  it("has one category per non-trade scope group", () => {
    const expected = SCOPE_GROUPS.filter((g) => g !== "trade-services");
    expect([...CATEGORY_SLUGS].sort()).toEqual([...expected].sort());
    expect(CATEGORIES).toHaveLength(12);
  });

  it("backs every category with at least one registered scope item", () => {
    for (const category of CATEGORIES) {
      expect(getCategoryScopeItems(category.slug).length).toBeGreaterThan(0);
    }
  });

  it("flags food, minerals and medical categories as regulated", () => {
    const regulated = CATEGORIES.filter((c) => c.regulated).map((c) => c.slug);
    expect(regulated.sort()).toEqual([
      "food-products",
      "medical-protective-supplies",
      "minerals-ores",
    ]);
  });
});

describe("services reference real scope items", () => {
  it("only lists scope items that exist on the license", () => {
    for (const service of SERVICES) {
      expect(service.scopeItemIds.length).toBeGreaterThan(0);
      for (const id of service.scopeItemIds) expect(getScopeItem(id)).toBeDefined();
    }
  });
});
