# Быстрое применение тем

## Замены для ChatArea.tsx

Замени хардкод цветов на CSS переменные:

```typescript
// Фоны
'#18181b' → 'var(--color-background)'
'#020617' → 'var(--color-chatBackground)'
'#111827' → 'var(--color-chatMessage)'
'#1f2937' → 'var(--color-surfaceHover)'
'#27272f' → 'var(--color-border)'

// Текст
'#e5e7eb' → 'var(--color-text)'
'#9ca3af' → 'var(--color-textSecondary)'
'#6b7280' → 'var(--color-textMuted)'

// Акценты
'#9147ff' → 'var(--color-primary)'
'#22c55e' → 'var(--color-success)'
'#ef4444' → 'var(--color-error)'

// Чат специфичные
'#291415' → 'var(--color-chatMessageDeleted)'
'#bd8700' → 'var(--color-chatMessageMention)'
'#1e3a5f' → 'var(--color-chatMessageRaid)'
'#eab308' → 'var(--color-chatMessageFirst)'

// Кнопки
'#4b5563' → 'var(--color-border)'
'#1f2933' → 'var(--color-buttonSecondary)'
'#166534' → 'var(--color-modActive)'
```

## Автоматическая замена (PowerShell)

```powershell
# В корне проекта
$file = "src\views\ChatArea.tsx"
$content = Get-Content $file -Raw

# Замены
$content = $content -replace "#18181b", "var(--color-background)"
$content = $content -replace "#020617", "var(--color-chatBackground)"
$content = $content -replace "#111827", "var(--color-chatMessage)"
$content = $content -replace "#1f2937", "var(--color-surfaceHover)"
$content = $content -replace "#27272f", "var(--color-border)"
$content = $content -replace "#e5e7eb", "var(--color-text)"
$content = $content -replace "#9ca3af", "var(--color-textSecondary)"
$content = $content -replace "#6b7280", "var(--color-textMuted)"
$content = $content -replace "#9147ff", "var(--color-primary)"
$content = $content -replace "#22c55e", "var(--color-success)"
$content = $content -replace "#ef4444", "var(--color-error)"
$content = $content -replace "#291415", "var(--color-chatMessageDeleted)"
$content = $content -replace "#bd8700", "var(--color-chatMessageMention)"
$content = $content -replace "#1e3a5f", "var(--color-chatMessageRaid)"
$content = $content -replace "#eab308", "var(--color-chatMessageFirst)"
$content = $content -replace "#4b5563", "var(--color-border)"
$content = $content -replace "#166534", "var(--color-modActive)"

Set-Content $file $content
Write-Host "ChatArea.tsx обновлён!"
```

## Для Sidebar.tsx

```powershell
$file = "src\views\Sidebar.tsx"
$content = Get-Content $file -Raw

$content = $content -replace "#18181b", "var(--color-background)"
$content = $content -replace "#111827", "var(--color-surface)"
$content = $content -replace "#27272f", "var(--color-border)"
$content = $content -replace "#e5e7eb", "var(--color-text)"
$content = $content -replace "#9ca3af", "var(--color-textSecondary)"
$content = $content -replace "#9147ff", "var(--color-primary)"
$content = $content -replace "#22c55e", "var(--color-success)"

Set-Content $file $content
Write-Host "Sidebar.tsx обновлён!"
```

## Запуск

1. Открой PowerShell в корне проекта
2. Скопируй и выполни скрипты выше
3. Перезапусти `npm run dev`
4. Темы заработают везде! 🎨
