# Modo: auto-pipeline — Pipeline Completo Automático

Cuando el usuario pega un JD (texto o URL) sin sub-comando explícito, ejecutar TODO el pipeline en secuencia:

## Paso 0 — Extraer JD

Si el input es una **URL** (no texto de JD pegado), seguir esta estrategia para extraer el contenido:

**Orden de prioridad:**

1. **Playwright (preferido):** La mayoría de portales de empleo (Lever, Ashby, Greenhouse, Workday) son SPAs. Usar `browser_navigate` + `browser_snapshot` para renderizar y leer el JD.
2. **WebFetch (fallback):** Para páginas estáticas (ZipRecruiter, WeLoveProduct, company career pages).
3. **WebSearch (último recurso):** Buscar título del rol + empresa en portales secundarios que indexan el JD en HTML estático.

**Si ningún método funciona:** Pedir al candidato que pegue el JD manualmente o comparta un screenshot.

**Si el input es texto de JD** (no URL): usar directamente, sin necesidad de fetch.

## Paso 1 — Evaluación A, B, C y G
Ejecutar exactamente igual que el modo `oferta` (leer `modes/oferta.md` para los bloques A, B, C y G).

## Paso 2 — Guardar resumen compacto
Append a single row to `data/evaluations.md` with: date, company, role, score, legitimacy, and one-line reason.

This summary is the UI-facing artifact. It is intentionally short so it can later feed a real dashboard or list view.

Do not generate a full report, PDF, draft application answers, or tracker entry unless the user explicitly requests them.

**Si algún paso falla**, continuar con los siguientes y marcar el paso fallido como pendiente en el tracker.
