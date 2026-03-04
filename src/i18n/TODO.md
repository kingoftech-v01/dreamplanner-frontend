# i18n — TODO

Feature ideas and improvements for internationalization and localization.

---

## Translation Quality

- [ ] **Professional translations** — Replace machine translations with professional human translations for top 5 languages
- [ ] **Community translations** — Crowdsourced translation contributions via Crowdin or Transifex
- [ ] **Translation review** — Review and approval workflow for community translations
- [ ] **Context notes** — Add translator notes for ambiguous keys (e.g., "Submit" as button label vs. noun)
- [ ] **Screenshot context** — Attach screenshots showing where each string appears in the UI

## Features

- [ ] **Pluralization** — Proper ICU MessageFormat pluralization (one, few, many, other)
- [ ] **Interpolation** — Variable interpolation in translations (e.g., "Hello, {name}")
- [ ] **Date/time localization** — Locale-aware date and time formatting using Intl API
- [ ] **Number localization** — Locale-aware number formatting (decimal separators, currency)
- [ ] **Gender-aware translations** — Gender-specific translations where grammatically needed

## New Languages

- [ ] **Indonesian** — Large potential user base in Southeast Asia
- [ ] **Vietnamese** — Growing tech-savvy population
- [ ] **Thai** — Southeast Asian market expansion
- [ ] **Ukrainian** — Ukrainian language support
- [ ] **Bengali** — Large speaker population

## Developer Experience

- [ ] **Missing key detection** — Automated CI check for missing translation keys across all languages
- [ ] **Unused key cleanup** — Script to find and remove unused translation keys
- [ ] **Key naming convention** — Enforce consistent key naming (page.section.element format)
- [ ] **Auto-extract keys** — Automatically extract new translation keys from code changes
- [ ] **Translation file validation** — CI validation that all translation files have matching keys
