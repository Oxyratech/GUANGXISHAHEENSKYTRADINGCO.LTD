import { COMPANY } from "@/config/company";
import { companyPageJsonLd } from "./page-json-ld";

describe("companyPageJsonLd", () => {
  const input = {
    type: "AboutPage",
    locale: "zh",
    path: "/about",
    name: "关于我们",
    description: "简介",
  } as const;

  it("describes the page in its own language and address", () => {
    const data = companyPageJsonLd(input);
    expect(data["@type"]).toBe("AboutPage");
    expect(data.url).toMatch(/\/zh\/about$/);
    expect(data.inLanguage).toBe("zh-CN");
    expect(data.name).toBe("关于我们");
  });

  it("names the organization only by its registered names", () => {
    const data = companyPageJsonLd({ ...input, type: "WebPage" });
    expect(data.about).toEqual({
      "@type": "Organization",
      name: "Guangxi Shaheen Sky Trading Co., Ltd.",
      legalName: COMPANY.legalNameEn,
    });
  });

  it("claims nothing the company does not have", () => {
    const serialized = JSON.stringify(companyPageJsonLd(input));
    expect(serialized).not.toMatch(/aggregateRating|award|employee|revenue|sameAs|areaServed/);
  });
});
