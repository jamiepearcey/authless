"use client";

export function setCookie(key: string, value: string) {
    document.cookie = `${key}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function setLocaleCookie(value: string) {
    setCookie("locale", value)
}