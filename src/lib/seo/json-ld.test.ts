import { COMPANY } from "@/config/company";
import { LOCALES } from "@/i18n/locales";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  newsArticleJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
  type JsonLdObject,
} from "./json-ld";

const ORIGIN = "https://www.example.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Every property name that appears anywhere in the structure. */
function allKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, keys);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      allKeys(item, keys);
    }
  }
  return keys;
}

/** Claims we cannot back: none of these may ever appear in any structured data we emit. */
const UNSUPPORTED = [
  "sameAs",
  "areaServed",
  "numberOfEmployees",
  "employee",
  "aggregateRating",
  "review",
  "award",
  "revenue",
  "offers",
  "price",
  "priceCurrency",
  "potentialAction",
  "brand",
  "manufacturer",
];

const everyBuilder = (): JsonLdObject[] => [
  organizationJsonLd(),
  organizationJsonLd({ channels: { email: "a@b.test", telephone: "+1 555 0100" } }),
  ...LOCALES.map((locale) => websiteJsonLd(locale)),
  breadcrumbJsonLd("en", [{ name: "Home", path: "/" }]),
  faqPageJsonLd([{ question: "Q?", answer: "A." }]),
  productJsonLd({ locale: "en", path: "/products/consumer-goods/x", name: "X" }),
  newsArticleJsonLd({
    locale: "en",
    path: "/news/x",
    headline: "H",
    description: "D",
    datePublished: "2026-07-01",
  }),
  itemListJsonLd("en", [{ name: "A", path: "/a" }]),
  collectionPageJsonLd({ locale: "en", path: "/news", name: "News", items: [] }),
];

describe("no builder makes a claim we cannot back", () => {
  it.each(UNSUPPORTED)("never emits %s", (property) => {
    for (const data of everyBuilder()) {
      expect(allKeys(data).has(property)).toBe(false);
    }
  });

  it("is plain JSON: survives a round trip unchanged", () => {
    for (const data of everyBuilder()) {
      expect(JSON.parse(JSON.stringify(data))).toEqual(data);
    }
  });
});

describe("organizationJsonLd", () => {
  it("carries the registration facts from the license", () => {
    const organization = organizationJsonLd();
    expect(organization).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      name: "Guangxi Shaheen Sky Trading Co., Ltd.",
      legalName: "GUANGXI SHAHEEN SKY TRADING CO., LTD.",
      url: `${ORIGIN}/en`,
      logo: `${ORIGIN}/brand/logo-mark.svg`,
      foundingDate: "2026-06-18",
      address: {
        "@type": "PostalAddress",
        streetAddress: "南宁市青秀区桂雅路6号4栋1单元603号",
        addressLocality: "Nanning",
        addressRegion: "Guangxi",
        addressCountry: "CN",
      },
      identifier: {
        "@type": "PropertyValue",
        propertyID: "Unified Social Credit Code",
        value: "91450100MAKG57TE3Y",
      },
    });
    expect(organization.alternateName).toContain(COMPANY.legalNameZh);
  });

  it("has no unsupported claims, and exactly these properties", () => {
    const organization = organizationJsonLd();
    for (const property of [
      "sameAs",
      "areaServed",
      "numberOfEmployees",
      "aggregateRating",
      "contactPoint",
    ]) {
      expect(organization).not.toHaveProperty(property);
    }
    expect(Object.keys(organization).sort()).toEqual(
      [
        "@context",
        "@id",
        "@type",
        "address",
        "alternateName",
        "foundingDate",
        "identifier",
        "legalName",
        "logo",
        "name",
        "url",
      ].sort(),
    );
  });

  it("adds a contactPoint only for channels that were actually supplied", () => {
    expect(
      organizationJsonLd({ channels: { email: "sales@example.test", telephone: "+1 555 0100" } })
        .contactPoint,
    ).toEqual({
      "@type": "ContactPoint",
      contactType: "sales",
      email: "sales@example.test",
      telephone: "+1 555 0100",
    });
    expect(organizationJsonLd({ channels: { email: "sales@example.test" } }).contactPoint).toEqual({
      "@type": "ContactPoint",
      contactType: "sales",
      email: "sales@example.test",
    });
  });

  it.each([undefined, {}, { email: null, telephone: null }, { email: "  ", telephone: "" }])(
    "emits no contactPoint for empty channels (%j)",
    (channels) => {
      expect(organizationJsonLd({ channels })).not.toHaveProperty("contactPoint");
    },
  );
});

describe("websiteJsonLd", () => {
  it.each(LOCALES)("names the site and its language for %s, with no search action", (locale) => {
    const site = websiteJsonLd(locale);
    expect(site).toMatchObject({
      "@type": "WebSite",
      name: "Shaheen Sky",
      url: `${ORIGIN}/${locale}`,
      publisher: { "@id": `${ORIGIN}/#organization` },
    });
    expect(site.inLanguage).toBe(locale === "zh" ? "zh-CN" : locale);
    expect(site).not.toHaveProperty("potentialAction");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1 and links every crumb to its locale-prefixed URL", () => {
    expect(
      breadcrumbJsonLd("ar", [
        { name: "Home", path: "/" },
        { name: "Products", path: "/products" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/ar` },
        { "@type": "ListItem", position: 2, name: "Products", item: `${ORIGIN}/ar/products` },
      ],
    });
  });
});

describe("faqPageJsonLd", () => {
  it("maps each entry to a Question with an accepted Answer", () => {
    expect(faqPageJsonLd([{ question: "Who are you?", answer: "A trading company." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Who are you?",
          acceptedAnswer: { "@type": "Answer", text: "A trading company." },
        },
      ],
    });
  });
});

describe("productJsonLd", () => {
  it("contains only what was passed in, with no offers, price or rating", () => {
    const product = productJsonLd({
      locale: "en",
      path: "/products/hardware-products/bolt",
      name: "Bolt",
      description: "A bolt.",
      images: [`${ORIGIN}/media/1`],
      category: "Hardware",
      specifications: [{ label: "Length", value: "40 mm" }],
    });
    expect(product).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Bolt",
      url: `${ORIGIN}/en/products/hardware-products/bolt`,
      inLanguage: "en",
      description: "A bolt.",
      image: [`${ORIGIN}/media/1`],
      category: "Hardware",
      additionalProperty: [{ "@type": "PropertyValue", name: "Length", value: "40 mm" }],
    });
  });

  it("omits every optional field that has no data", () => {
    const product = productJsonLd({ locale: "zh", path: "/products/x/y", name: "Y", images: [] });
    expect(Object.keys(product).sort()).toEqual(
      ["@context", "@type", "inLanguage", "name", "url"].sort(),
    );
    expect(product.inLanguage).toBe("zh-CN");
  });
});

describe("newsArticleJsonLd", () => {
  const input = {
    locale: "en",
    path: "/news/opening",
    headline: "Headline",
    description: "Summary.",
    datePublished: new Date("2026-07-01T08:00:00Z"),
  } as const;

  it("describes the article, crediting a named author as a person", () => {
    expect(
      newsArticleJsonLd({
        ...input,
        authorName: "A. Writer",
        imageUrl: `${ORIGIN}/media/cover`,
        dateModified: "2026-07-02T00:00:00.000Z",
      }),
    ).toMatchObject({
      "@type": "NewsArticle",
      mainEntityOfPage: { "@type": "WebPage", "@id": `${ORIGIN}/en/news/opening` },
      headline: "Headline",
      description: "Summary.",
      inLanguage: "en",
      datePublished: "2026-07-01T08:00:00.000Z",
      dateModified: "2026-07-02T00:00:00.000Z",
      image: [`${ORIGIN}/media/cover`],
      author: { "@type": "Person", name: "A. Writer" },
      publisher: {
        "@type": "Organization",
        "@id": `${ORIGIN}/#organization`,
        logo: { "@type": "ImageObject", url: `${ORIGIN}/brand/logo-mark.svg` },
      },
    });
  });

  it("credits the company when there is no byline, and invents no modification date", () => {
    const article = newsArticleJsonLd(input);
    expect(article.author).toMatchObject({
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
    });
    expect(article).not.toHaveProperty("dateModified");
    expect(article).not.toHaveProperty("image");
  });
});

describe("collectionPageJsonLd / itemListJsonLd", () => {
  const items = [
    { name: "Consumer goods", path: "/products/consumer-goods" },
    { name: "Hardware", path: "/products/hardware-products" },
  ];

  it("lists items in order with locale-prefixed URLs", () => {
    expect(itemListJsonLd("zh", items)).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: 2,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Consumer goods",
          url: `${ORIGIN}/zh/products/consumer-goods`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Hardware",
          url: `${ORIGIN}/zh/products/hardware-products`,
        },
      ],
    });
  });

  it("wraps the list in a CollectionPage that belongs to the locale's website", () => {
    const page = collectionPageJsonLd({ locale: "en", path: "/products", name: "Products", items });
    expect(page).toMatchObject({
      "@type": "CollectionPage",
      name: "Products",
      url: `${ORIGIN}/en/products`,
      isPartOf: { "@id": `${ORIGIN}/en#website` },
      mainEntity: { "@type": "ItemList", numberOfItems: 2 },
    });
    expect(page).not.toHaveProperty("description");
    expect(page.mainEntity).not.toHaveProperty("@context");
  });

  it("is honest about an empty listing", () => {
    expect(itemListJsonLd("en", [])).toMatchObject({ numberOfItems: 0, itemListElement: [] });
  });
});
