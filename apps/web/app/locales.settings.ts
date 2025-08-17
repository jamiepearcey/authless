import "server-only";
import { configureI18n } from "@i18n-core/src/server";
import cfg from "../locales.settings.json";

configureI18n({
  ...cfg
});