export type LocaleEntry = { locale: string; url: string; hash: string };

export type LocaleDict = { [key: string]: LocaleEntry }

export type LocaleContent = { [key: string]: string }

export type LocaleEntries = { [key: string]: LocaleContent }