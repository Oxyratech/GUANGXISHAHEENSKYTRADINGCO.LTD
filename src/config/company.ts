/**
 * Official registration facts — single source of truth.
 *
 * Every value below was transcribed from the company's Business License (营业执照, duplicate copy)
 * issued 2026-06-18. Do not edit without re-checking the license itself.
 *
 * NOTE: the registered capital on the license reads 伍万人民币元整 = RMB 50,000 (fifty thousand).
 * Do not "round up" or restate it.
 *
 * Contact channels (email, phone, WhatsApp) are deliberately NOT here: none has been supplied.
 * They are configured via SiteSetting / environment variables — see src/lib/site-settings.
 */
export const COMPANY = {
  legalNameEn: "GUANGXI SHAHEEN SKY TRADING CO., LTD.",
  legalNameZh: "广西沙欣斯凯商贸有限责任公司",
  /** Display brand. Text wordmark only — no government seal or emblem is ever used as a logo. */
  brandName: "SHAHEEN SKY",
  legalRepresentative: "AHMED ALI",
  /** As printed on the license. */
  companyTypeZh: "有限责任公司(外国自然人独资)",
  registeredCapital: {
    amount: 50_000,
    currency: "CNY",
    /** As printed on the license: 伍万人民币元整. */
    zh: "伍万人民币元整",
  },
  /** ISO date. */
  establishedOn: "2026-06-18",
  registeredAddressZh: "南宁市青秀区桂雅路6号4栋1单元603号",
  location: { cityEn: "Nanning", regionEn: "Guangxi", countryEn: "China" },
  unifiedSocialCreditCode: "91450100MAKG57TE3Y",
  registrationAuthorityZh: "南宁市市场监督管理局",
  licenseIssuedOn: "2026-06-18",
  licenseTitleZh: "营业执照（副本）",
  /** National Enterprise Credit Information Publicity System, as printed on the license. */
  verificationSystem: { name: "国家企业信用信息公示系统", url: "https://www.gsxt.gov.cn/" },
  /** Coordinates of Nanning (city centre) — used only to place a marker on the decorative map. */
  nanningLatLng: { lat: 22.817, lng: 108.3669 },
} as const;

/** Path (under /public) of the license image. Shown unaltered on /company-information. */
export const LICENSE_IMAGE = {
  src: "/documents/business-license.png",
  width: 1219,
  height: 861,
} as const;

export type Company = typeof COMPANY;
