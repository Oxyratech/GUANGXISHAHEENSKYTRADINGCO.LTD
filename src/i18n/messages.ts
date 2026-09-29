import type common from "../messages/en/common.json";
import type home from "../messages/en/home.json";
import type about from "../messages/en/about.json";
import type business from "../messages/en/business.json";
import type services from "../messages/en/services.json";
import type categories from "../messages/en/categories.json";
import type products from "../messages/en/products.json";
import type globalTrade from "../messages/en/globalTrade.json";
import type companyInfo from "../messages/en/companyInfo.json";
import type scope from "../messages/en/scope.json";
import type news from "../messages/en/news.json";
import type faq from "../messages/en/faq.json";
import type contact from "../messages/en/contact.json";
import type inquiry from "../messages/en/inquiry.json";
import type legal from "../messages/en/legal.json";
import type errors from "../messages/en/errors.json";
import type validation from "../messages/en/validation.json";

/** Message shape, derived from the English source files. */
export type Messages = {
  common: typeof common;
  home: typeof home;
  about: typeof about;
  business: typeof business;
  services: typeof services;
  categories: typeof categories;
  products: typeof products;
  globalTrade: typeof globalTrade;
  companyInfo: typeof companyInfo;
  scope: typeof scope;
  news: typeof news;
  faq: typeof faq;
  contact: typeof contact;
  inquiry: typeof inquiry;
  legal: typeof legal;
  errors: typeof errors;
  validation: typeof validation;
};
