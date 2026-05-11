# Oferta — Evaluación A-B-C-G para Bryan Zeng

Cuando el candidato paste una oferta (URL o texto JD), evalúa SIEMPRE con los 4 bloques (A, B, C, G) y devuelve un informe markdown estructurado.

---

## Paso 0 — Hard Disqualifiers (verificar ANTES de cualquier análisis)

Lee estas señales en el JD **antes de clasificar el arquetipo**. Si alguna aplica, descalifica inmediatamente.

| Señal | Cómo detectar | Score máximo | Acción |
|-------|---------------|--------------|--------|
| YOE ≥ 5 explícito | "5+ years", "at least 5 years", "minimum 5 years" en el JD | ≤ 2.0 | Clasifica como Senior-leveled, señala en Bloque C |
| YOE ≥ 8 o seniority alto | "8+ years", "10+ years", "Staff", "Principal", "Senior" en título | ≤ 1.0 | Out of Scope |
| Rol no-engineering | "Director", "VP", "Head of", "Manager", "Product Manager", "PM", "Data Scientist", "ML Engineer", "Research" en título | ≤ 1.5 | Out of Scope |
| Track de liderazgo/gestión | "manage a team", "hire and mentor", "people manager", "direct reports" en JD | ≤ 1.5 | Out of Scope |

**Si hay disqualifier:** Indica claramente en Bloque C ("DESCALIFICADO: [razón]") y recomienda no aplicar.

## Paso 1 — Detección de Arquetipo

Clasifica la oferta en UNO de estos arquetipos (el que más aplica):

1. **New Grad / Entry-Level SWE** — Roles explícitamente para nuevos graduados, sin YOE requerido
2. **Junior Backend Engineer** — APIs, bases de datos, cloud, microservicios
3. **Junior Fullstack Engineer** — React/Vue + Node.js/Python, ownership end-to-end
4. **Associate / SWE I** — Título "Associate" o "Engineer I", 0-2 YOE, entrada en ladder
5. **Senior-leveled Misclassification** — Título "SWE II", "Senior", "Staff" etc., O requiere 5+ YOE
6. **Out of Scope** — Rol no-engineering, track PM/Director/Manager, ML/research, embedded, finance, etc.

Esto determina:
- Qué proof points priorizar en Bloque B
- Cómo enmarcar la estrategia en Bloque C
- Cómo evaluar legitimidad en Bloque G

---

## Bloque A — Resumen del Rol

Tabla con:
- **Arquetipo detectado** — (de la lista arriba)
- **Empresa** — Nombre exacto
- **Título** — Job title exacto
- **Seniority** — Entry / Junior / Mid / Senior / Otro
- **YOE Requerido** — Número exacto si está en JD, sino estimar
- **Remote** — Full Remote / Hybrid / Onsite / Flexible
- **Ubicación(es)** — Ciudades/regiones específicas
- **Team Size** — Si se menciona
- **TL;DR** — Una frase de qué hace el rol

---

## Bloque B — Match con CV

Lee `cv.md`. Crea tabla con cada requisito del JD mapeado al CV de Bryan:

| Requisito del JD | Match en CV de Bryan | Fuente |
|---|---|---|
| {req 1} | {match o N/A} | cv.md línea X o "Gap" |
| {req 2} | {match o N/A} | cv.md línea X o "Gap" |

### Stack Key para Bryan

**Tiene experiencia en:**
- Web: Node.js, React
- Mobile: Kotlin, Swift
- Backend: Flask, Spring Boot, Java
- Cloud: AWS
- Databases: DocumentDB, PostgreSQL
- Cryptography: ECDH, key exchange, secure signing
- DevOps: CI/CD, containerization

**No tiene:**
- Go, Rust, Haskell (functional languages)
- ML/Data Science (Numpy, PyTorch, etc.)
- Blockchain/Web3

### Sección de Gaps

Para cada gap (skill que falta en Bryan):

**Gap:** {skill}
- **Tipo:** Hard blocker o nice-to-have?
- **Experiencia adyacente:** ¿Tiene Bryan algo parecido? (ej: "Gap: Kubernetes" → "Adyacente: Docker containerization")
- **Mitigación:** ¿Puede aprender en el rol, o es dealbreaker?

---

## Bloque C — Nivel y Estrategia

### 1. Análisis de Level Mismatch

**Reglas de scoring duras para Level Appropriateness (C):**
- 0-2 YOE requerido → C = 5/5 (ideal fit)
- 3 YOE requerido → C = 4/5 (slight stretch)
- 4 YOE requerido → C = 3/5 (reachable stretch)
- **5+ YOE requerido → C = 2/5 máximo. SIEMPRE.** ⚠️
- **8+ YOE o Staff/Principal/Director → C = 1/5. Descalificado.** ❌

**¿El JD pide 5+ YOE?** Score C ≤ 2/5. Recomendar skip salvo razón específica del usuario.  
**¿Pide 2-3 YOE y dice "new grad OK"?** ✅ Buen fit.  
**¿Pide 8+ YOE o "Staff"?** ❌ Descalificado, score global ≤ 1.5.

### 2. Framing si Bryan postula

Si la oferta es un buen fit, sugiere 1-2 frases para la cover letter:

> "I'm a recent M.S. CS graduate with 2 years of production engineering at OmniTrust and Wolters Kluwer. My experience spans full-stack shipping (Node.js/React, Kotlin mobile, AWS) and systems-level work (32M+ log migration). While new to the industry as a graduate, my track record shows I can ship production code and learn rapidly in collaborative teams."

### 3. Si está overleveled

Si el JD claramente es para Senior o Staff:

> "This role's seniority exceeds entry-level scope (e.g., 'Staff Software Engineer', '8+ YOE'). Bryan should skip unless explicitly open to junior candidates."

---

## Bloque G — Posting Legitimacy

Evalúa si es una oportunidad real, activa, o potencialmente fantasma.

**Señales a revisar:**

1. **Calidad del JD** — ¿Es específico (tecnologías nomeadas, contexto de team, scope claro) o boilerplate genérico?
2. **Transparencia de comp** — ¿Se menciona salario o rango? (JDs legítimos suelen tener esto)
3. **Red flags:**
   - Título dice "Junior" pero requiere 10+ YOE
   - JD es copy-paste genérico (mismo wording que 100 JDs más)
   - Botón Apply roto o redirige a careers page genérica
   - Empresa en news por layoffs en este depto en últimos 3 meses
4. **Green flags:**
   - Tecnologías específicas nomradas (ej: "Node.js 18+, TypeScript, PostgreSQL")
   - Estructura de reporting clara o nombre de team
   - Scope del rol alineado con seniority stated
   - Rango salarial o filosofía de comp mencionada

**Assessment:**
- **High Confidence** — Mayoría de señales positivas, hiring activo probable
- **Proceed with Caution** — Señales mixtas (buen JD pero noticias de layoffs recientes)
- **Suspicious** — Múltiples red flags (genérico, overleveled, posting fantasma indicators)

---

## Score Global

| Dimensión | Ponderación | Scoring |
|-----------|-----------|---------|
| **Fit de Arquetipo** | 35% | 5=New Grad/Junior explícito, 4=encaja, 3=adyacente, 2=stretch, 1=out of scope |
| **Stack Match** | 25% | 5=80%+ skills, 4=60%+, 3=40%+, 2=20%+, 1=<20% |
| **Level apropiado** | 25% | 5=ideal, 4=slight stretch up, 3=aceptable, 2=overleveled, 1=muy senior |
| **Señales posting** | 15% | 5=high confidence, 3=proceed with caution, 1=suspicious |

**Fórmula:** `(A×0.35 + B×0.25 + C×0.25 + D×0.15)` redondeado a 1 decimal.

**Recomendación:**
- **4.5-5.0** → Apply. Muy buen fit.
- **3.5-4.4** → Apply. Buen fit, algunos gaps.
- **2.5-3.4** → Maybe. Workable pero con concerns.
- **1.5-2.4** → Skip. Mucho mismatch.
- **<1.5** → Don't apply. Out of scope.

---

## Context Files Available

Lee cuando sea posible:
- `cv.md` — Resume de Bryan
- `modes/_profile.md` — Target roles y archetypes (opcional)
- `article-digest.md` — Proof points de portfolio (opcional)

Siempre LEER cv.md antes de evaluar. Nunca hardcodear métricas; leerlas en tiempo real.

---

## Output

Devuelve un **markdown report** estructurado con los 4 bloques (A, B, C, G) + Score Global al final.

No uses JSON en modo sequential. El usuario verá el markdown en el chat y puede guardarlo si quiere.
