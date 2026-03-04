# Internationalization (i18n)

Translation files for 16 supported languages.

## Supported Languages

| Code | Language | RTL |
|------|----------|-----|
| `en` | English | No |
| `fr` | French | No |
| `es` | Spanish | No |
| `de` | German | No |
| `pt` | Portuguese | No |
| `it` | Italian | No |
| `nl` | Dutch | No |
| `ru` | Russian | No |
| `ja` | Japanese | No |
| `ko` | Korean | No |
| `zh` | Chinese | No |
| `ar` | Arabic | Yes |
| `hi` | Hindi | No |
| `tr` | Turkish | No |
| `pl` | Polish | No |
| `ht` | Haitian Creole | No |

## File Format

Each language is a JSON file with flat or nested key-value pairs:

```json
{
  "login.title": "Sign In",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Log In",
  "home.greeting": "Welcome back"
}
```

## Usage

```jsx
import { useT } from "../context/I18nContext";

function MyComponent() {
  const { t, locale, setLocale } = useT();

  return (
    <div>
      <h1>{t("login.title")}</h1>
      <button onClick={() => setLocale("fr")}>Français</button>
    </div>
  );
}
```

## RTL Support

Languages with `RTL: Yes` automatically:
- Set `document.dir = "rtl"` and `document.lang`
- Enable `isRTL` flag in `I18nContext`
- Components can use `isRTL` to flip layouts

## Adding a New Language

1. Create `src/i18n/{code}.json` with all translation keys
2. Add the language code to the `SUPPORTED_LANGUAGES` array in `I18nContext.jsx`
3. If RTL, add the code to the `RTL_LANGUAGES` set in `I18nContext.jsx`
