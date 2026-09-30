import { getHash, getServerHash, itemIdFromHash, replaceHash, subscribeToHash } from "./faq-hash";

const IDS = new Set(["prices", "registered"]);

describe("itemIdFromHash", () => {
  it("names the question a fragment points at", () => {
    expect(itemIdFromHash("#prices", IDS)).toBe("prices");
    expect(itemIdFromHash("#registered", IDS)).toBe("registered");
  });

  it("ignores fragments that name anything else", () => {
    expect(itemIdFromHash("", IDS)).toBeUndefined();
    expect(itemIdFromHash("#", IDS)).toBeUndefined();
    expect(itemIdFromHash("#group-company", IDS)).toBeUndefined();
    expect(itemIdFromHash("#Prices", IDS)).toBeUndefined();
  });

  it("survives a malformed escape sequence", () => {
    expect(itemIdFromHash("#%E0%A4%A", IDS)).toBeUndefined();
  });
});

describe("hash store", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("answers an empty hash on the server", () => {
    expect(getServerHash()).toBe("");
  });

  it("writes the hash without a new history entry and notifies subscribers", () => {
    const before = window.history.length;
    const listener = vi.fn();
    const unsubscribe = subscribeToHash(listener);

    replaceHash("prices");
    expect(getHash()).toBe("#prices");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(window.history.length).toBe(before);

    replaceHash("");
    expect(getHash()).toBe("");
    expect(window.location.pathname).toBe("/");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    replaceHash("registered");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps the query string when it clears the hash", () => {
    window.history.replaceState(null, "", "/faq?ref=nav#prices");
    replaceHash("");
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      "/faq?ref=nav",
    );
  });

  it("notifies subscribers when the browser changes the fragment itself", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToHash(listener);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
