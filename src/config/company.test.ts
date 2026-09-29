import { describe, expect, it } from "vitest";
import { COMPANY } from "./company";

/** GB 32100-2015 check-digit algorithm for the 18-character Unified Social Credit Code. */
function isValidUscc(code: string): boolean {
  const charset = "0123456789ABCDEFGHJKLMNPQRTUWXY";
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
  if (!/^[0-9A-HJ-NP-RT-UW-Y]{18}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += charset.indexOf(code[i]!) * weights[i]!;
  return charset[(31 - (sum % 31)) % 31] === code[17];
}

describe("company registration facts (from the business license)", () => {
  it("has a structurally valid Unified Social Credit Code (check digit verifies the transcription)", () => {
    expect(COMPANY.unifiedSocialCreditCode).toBe("91450100MAKG57TE3Y");
    expect(isValidUscc(COMPANY.unifiedSocialCreditCode)).toBe(true);
  });

  it("uses the Nanning administrative-region prefix (450100) in the USCC", () => {
    expect(COMPANY.unifiedSocialCreditCode.slice(2, 8)).toBe("450100");
  });

  it("states registered capital as RMB 50,000 — 伍万 is fifty thousand, not five million", () => {
    expect(COMPANY.registeredCapital.amount).toBe(50_000);
    expect(COMPANY.registeredCapital.currency).toBe("CNY");
    expect(COMPANY.registeredCapital.zh).toBe("伍万人民币元整");
  });

  it("matches the license names, representative and dates", () => {
    expect(COMPANY.legalNameEn).toBe("GUANGXI SHAHEEN SKY TRADING CO., LTD.");
    expect(COMPANY.legalNameZh).toBe("广西沙欣斯凯商贸有限责任公司");
    expect(COMPANY.legalRepresentative).toBe("AHMED ALI");
    expect(COMPANY.establishedOn).toBe("2026-06-18");
    expect(COMPANY.registeredAddressZh).toBe("南宁市青秀区桂雅路6号4栋1单元603号");
  });

  it("carries no contact details (none have been supplied)", () => {
    const serialised = JSON.stringify(COMPANY).toLowerCase();
    expect(serialised).not.toMatch(/@|whatsapp|\+\d|tel:|mailto:/);
  });
});
