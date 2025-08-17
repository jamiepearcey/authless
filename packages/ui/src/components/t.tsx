import React from "react";
import { t as coreT } from "@i18n-core";

type Props = {
  id?: string;
  values?: Record<string, unknown>;
  children: string; // source/seed text
};

export function T({ id, values, children }: Props) {
  const key = id ?? children;
  return <>{coreT(key, children, values)}</>;
}