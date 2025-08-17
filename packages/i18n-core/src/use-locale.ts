import { useEffect, useState } from "react"
import { getActiveLocale, changeLocale, t } from "./runtime-client"
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const useLocale = () => {
    const [locale, setLocale] = useState<string | null>(getActiveLocale())
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === "i18n:active") {
                setLocale(event.newValue)
            }
        }
        window.addEventListener("storage", handleStorageChange)
        return () => {
            window.removeEventListener("storage", handleStorageChange)
        }
    }, [])  

    const switchLocale = (locale: string) => {
        changeLocale(locale)
        setLocale(locale)
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("__lc", `${locale}-${Date.now()}`); // one-shot buster
        const url = `${pathname}?${sp.toString()}`;
        router.replace(url, { scroll: false });
        router.refresh();
    }
    
    return {
        locale,
        switchLocale,
        t
    }
}