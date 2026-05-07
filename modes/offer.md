# Offer — A-B-C-G Evaluation for Bryan Zeng

When the candidate pastes an offer (URL or JD text), ALWAYS evaluate with the 4 blocks (A, B, C, G) and return a structured markdown report.

---

## Step 0 — Archetype Detection

Classify the offer into ONE of these archetypes (whichever fits best):

1. **New Grad / Entry-Level SWE** — Roles explicitly for recent graduates, no YOE required
2. **Junior Backend Engineer** — APIs, databases, cloud, microservices
3. **Junior Fullstack Engineer** — React/Vue + Node.js/Python, end-to-end ownership
4. **Associate / SWE I** — Title "Associate" or "Engineer I", 0-2 YOE, entry ladder
5. **Overleveled Misclassification** — Titled "SWE II", "Senior", etc. but junior scope
6. **Out of Scope** — Doesn't fit any above (ML, embedded, finance, etc.)

This determines:
- Which proof points to prioritize in Block B
- How to frame strategy in Block C
- How to assess legitimacy in Block G

---

## Block A — Role Summary

Table with:
- **Detected Archetype** — (from list above)
- **Company** — Exact company name
- **Title** — Exact job title
- **Seniority** — Entry / Junior / Mid / Senior / Other
- **YOE Required** — Exact number if stated in JD, otherwise estimate
- **Remote** — Full Remote / Hybrid / Onsite / Flexible
- **Location(s)** — Specific cities/regions
- **Team Size** — If mentioned
- **TL;DR** — One sentence describing what the role does

---

## Block B — CV Match

Read `cv.md`. Create table with each JD requirement mapped to Bryan's CV:

| JD Requirement | Match in Bryan's CV | Source |
|---|---|---|
| {req 1} | {match or N/A} | cv.md line X or "Gap" |
| {req 2} | {match or N/A} | cv.md line X or "Gap" |

### Key Stack for Bryan

**Has experience in:**
- Web: Node.js, React
- Mobile: Kotlin, Swift
- Backend: Flask, Spring Boot, Java
- Cloud: AWS
- Databases: DocumentDB, PostgreSQL
- Cryptography: ECDH, key exchange, secure signing
- DevOps: CI/CD, containerization

**Does NOT have:**
- Go, Rust, Haskell (functional languages)
- ML/Data Science (NumPy, PyTorch, etc.)
- Blockchain/Web3

### Gaps Section

For each gap (skill missing from Bryan):

**Gap:** {skill}
- **Type:** Hard blocker or nice-to-have?
- **Adjacent experience:** Does Bryan have something similar? (e.g., "Gap: Kubernetes" → "Adjacent: Docker containerization")
- **Mitigation:** Can he learn on the job, or is it a dealbreaker?

---

## Block C — Level and Strategy

### 1. Level Mismatch Analysis

**Does the JD ask for 5+ YOE but say "Junior"?** ⚠️ Problem.  
**Asks for 2-3 YOE and says "new grad OK"?** ✅ Good fit.  
**Asks for 8+ YOE or "Staff"?** ❌ Disqualified.

### 2. Framing if Bryan applies

If the offer is a good fit, suggest 1-2 sentences for the cover letter:

> "I'm a recent M.S. CS graduate with 2 years of production engineering at OmniTrust and Wolters Kluwer. My experience spans full-stack shipping (Node.js/React, Kotlin mobile, AWS) and systems-level work (32M+ log migration). While new to the industry as a graduate, my track record shows I can ship production code and learn rapidly in collaborative teams."

### 3. If overleveled

If the JD is clearly for Senior or Staff:

> "This role's seniority exceeds entry-level scope (e.g., 'Staff Software Engineer', '8+ YOE'). Bryan should skip unless explicitly open to junior candidates."

---

## Block G — Posting Legitimacy

Assess if it's a real, active opportunity or potentially a ghost posting.

**Signals to review:**

1. **JD Quality** — Is it specific (named technologies, team context, clear scope) or generic boilerplate?
2. **Compensation Transparency** — Is salary or range mentioned? (Legitimate JDs usually have this)
3. **Red flags:**
   - Title says "Junior" but requires 10+ YOE
   - JD is generic copy-paste (same wording as 100 other JDs)
   - Apply button broken or redirects to generic careers page
   - Company in news for layoffs in this department in last 3 months
4. **Green flags:**
   - Specific technologies named (e.g., "Node.js 18+, TypeScript, PostgreSQL")
   - Clear reporting structure or team name
   - Role scope aligned with stated seniority
   - Salary range or compensation philosophy mentioned

**Assessment:**
- **High Confidence** — Majority of positive signals, likely active hiring
- **Proceed with Caution** — Mixed signals (good JD but recent layoff news)
- **Suspicious** — Multiple red flags (generic, overleveled, ghost posting indicators)

---

## Global Score

| Dimension | Weight | Scoring |
|-----------|--------|---------|
| **Archetype Fit** | 35% | 5=New Grad/Junior explicit, 4=fits, 3=adjacent, 2=stretch, 1=out of scope |
| **Stack Match** | 25% | 5=80%+ skills, 4=60%+, 3=40%+, 2=20%+, 1=<20% |
| **Level Appropriateness** | 25% | 5=ideal, 4=slight stretch up, 3=acceptable, 2=overleveled, 1=very senior |
| **Posting Signals** | 15% | 5=high confidence, 3=proceed with caution, 1=suspicious |

**Formula:** `(A×0.35 + B×0.25 + C×0.25 + D×0.15)` rounded to 1 decimal.

**Recommendation:**
- **4.5-5.0** → Apply. Very good fit.
- **3.5-4.4** → Apply. Good fit, some gaps.
- **2.5-3.4** → Maybe. Workable but with concerns.
- **1.5-2.4** → Skip. Significant mismatch.
- **<1.5** → Don't apply. Out of scope.

---

## Context Files Available

Read when possible:
- `cv.md` — Bryan's resume
- `modes/_profile.md` — Target roles and archetypes (optional)
- `article-digest.md` — Portfolio proof points (optional)

ALWAYS read cv.md before evaluating. Never hardcode metrics; read them in real-time.

---

## Output

Return a **markdown report** structured with the 4 blocks (A, B, C, G) + Global Score at the end.

Do NOT use JSON in sequential mode. The user will see the markdown in chat and can save it if desired.
