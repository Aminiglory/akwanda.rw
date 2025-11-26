# Global Translation System Guide

## Overview
The global translation system automatically translates **ALL** text content in the application without requiring manual wrapping of every component.

## How It Works

### 1. DOM-Level Translation
- Uses `MutationObserver` to watch for new DOM nodes
- Automatically translates all text nodes as they appear
- Skips elements marked with `data-no-translate="true"`

### 2. API Response Translation
- Intercepts fetch requests to `/api/*` endpoints
- Automatically translates JSON response data
- Preserves structure while translating string values

### 3. Component-Level Translation
- Use `<AutoTranslate>` component for specific text
- Use `useAutoTranslate()` hook for programmatic translation
- Use `translateSync()` from `useLocale()` for synchronous translation

## Usage

### Automatic (Recommended)
The system works automatically once `GlobalTranslationProvider` is added to your app (already done in App.jsx).

### Manual Translation
```jsx
import { AutoTranslate } from '../utils/autoTranslate';

// Wrap any text
<AutoTranslate>Hello World</AutoTranslate>

// Skip translation for specific elements
<div data-no-translate="true">
  This text will NOT be translated
</div>
```

### Programmatic Translation
```jsx
import { useAutoTranslate } from '../utils/autoTranslate';

function MyComponent() {
  const { translate } = useAutoTranslate();
  const [text, setText] = useState('Hello');
  
  useEffect(() => {
    translate('Hello').then(setText);
  }, []);
}
```

## Excluding Content from Translation

Add `data-no-translate="true"` to any element:
```jsx
<div data-no-translate="true">
  Code snippets, URLs, emails, etc.
</div>
```

## Supported Languages
- English (en) - Default
- French (fr)
- Kinyarwanda (rw)

## Performance
- Translations are cached for 24 hours
- Batch translations for multiple texts
- Lazy translation (only when language changes)

