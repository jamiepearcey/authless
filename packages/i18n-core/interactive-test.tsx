import { t } from "@i18n-core";import React from "react";

export default function InteractiveTest() {
  return (
    <div>
      <h1>{t("Welcome to the interactive test")}</h1>
      <p>{t("This is a simple test component")}</p>
      <button>{t("Click me to continue")}</button>
      <span>{t("Status: Ready to proceed")}</span>
    </div>);

}