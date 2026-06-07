# AI Assistant

AI-чат асистент для магазину техніки. Next.js 15 + Anthropic API з web search.

## Налаштування на Vercel

1. Імпортуй цей репозиторій на vercel.com (New Project)
2. Framework Preset: Next.js (визначиться автоматично)
3. Додай Environment Variable:
   - Name: ANTHROPIC_API_KEY
   - Value: твій ключ sk-ant-...
   - Постав галочки Production, Preview, Development
4. Deploy

## Функції
- Чат з AI українською
- Пошук товарів в інтернеті (web search)
- Пам'ять розмови між сесіями (localStorage)
