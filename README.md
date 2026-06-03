# WhatsApp Expense Agent — סוכן הוצאות משפחתי 💸

סוכן הוצאות משפחתי שמתחבר למספר WhatsApp **נפרד** (לא קבוצה). כל בן משפחה
שולח לבוט בפרטי הוצאות / קבלות / חשבוניות / שאלות, והבוט מזהה אותו לפי מספר
הטלפון, מחלץ את ההוצאה, מסווג אותה, שומר אותה, ומאפשר דוחות, תקציבים והתראות.
הדשבורד מציג הכול בעברית (RTL).

הכול נבנה כ‑**פרויקט Next.js (App Router) אחד** — דשבורד, API, שירותים,
דאטאבייס והבוט באותו repo. הבוט עצמו רץ כ‑**תהליך נפרד** (`npm run bot`),
לא כ‑API route, כי Baileys דורש חיבור קבוע.

> ⚠️ **Baileys הוא פתרון WhatsApp לא רשמי.** ראו [מגבלות ידועות](#מגבלות-ידועות).

---

## ✨ יכולות

- זיהוי משתמש לפי מספר טלפון ושיוך למשפחה (כולל הצטרפות בקוד הזמנה).
- חילוץ הוצאה מטקסט חופשי בעברית (OpenAI אם יש מפתח, אחרת fallback מבוסס regex).
- קליטת תמונות/קבצים של קבלות וחשבוניות ושמירתם.
- ניתוח תמונה ב‑OpenAI Vision (אופציונלי) — אחרת מסומן לבדיקה ידנית.
- סיווג אוטומטי לקטגוריות.
- זיהוי הוצאות קבועות/חוזרות.
- דוחות חודשיים + תובנות.
- תקציב חודשי כללי ולפי קטגוריה + התראות חריגה (80% / 100%).
- מחיקה ותיקון של ההוצאה האחרונה דרך WhatsApp.
- דשבורד: סקירה, הוצאות, תקציבים, הוצאות קבועות, משפחה.

---

## 🏗️ ארכיטקטורה

הלוגיקה העסקית **לא** תלויה ב‑Baileys. הכול עובר דרך adapter ומודל הודעה אחיד:

```
Baileys → WhatsApp Adapter → IncomingMessage → Router/Intent →
Core Services → Prisma/PostgreSQL → Reply Template → Adapter.sendText
```

כדי לעבור בעתיד ל‑WhatsApp Cloud API הרשמי — כותבים מחלקה חדשה שמממשת את
`WhatsAppAdapter` ופולטת `IncomingMessage`; שום דבר בשאר המערכת לא משתנה.

מבנה עיקרי:

```
app/                  דשבורד (App Router) + /api routes
components/            רכיבי UI
lib/                  env, prisma, utils, dates, format, categories, redact
server/
  whatsapp/           adapter interface, Baileys client/adapter, parser, templates
  ai/                 חילוץ מטקסט/תמונה, prompts, classify
  commands/           detect-intent + types
  services/           family, user, expense, report, budget, recurring, alert
  storage/            storage interface + local storage
  handlers/           incoming / text / media handlers
scripts/whatsapp-bot.ts   ← תהליך הבוט (npm run bot)
prisma/               schema.prisma + seed.ts
uploads/              קבלות/חשבוניות (לא ב‑git)
auth/                 סשן WhatsApp של Baileys (לא ב‑git)
```

---

## 🔧 התקנה

דרישות: **Node.js 18+** (נבדק על Node 24) ו‑**PostgreSQL**.

```bash
npm install
cp .env.example .env   # ואז ערכו את .env
```

### משתני סביבה (.env)

| משתנה | תיאור |
|------|-------|
| `DATABASE_URL` | מחרוזת חיבור PostgreSQL (חובה) |
| `OPENAI_API_KEY` | מפתח OpenAI (אופציונלי — בלי זה נעשה fallback ל‑regex) |
| `OPENAI_TEXT_MODEL` | מודל לחילוץ טקסט (ברירת מחדל `gpt-4o-mini`) |
| `OPENAI_VISION_MODEL` | מודל לחילוץ מתמונה (ברירת מחדל `gpt-4o-mini`) |
| `OWNER_PHONE` | טלפון הבעלים, ספרות בלבד בפורמט בינלאומי (`972501234567`) |
| `DEFAULT_FAMILY_NAME` | שם המשפחה ב‑seed (`משפחת Levy`) |
| `DEFAULT_INVITE_CODE` | קוד הזמנה ל‑seed (`ABC123`) |
| `DEFAULT_CURRENCY` | מטבע ברירת מחדל (`ILS`) |
| `UPLOADS_DIR` | תיקיית קבצים (`uploads`) |
| `WHATSAPP_AUTH_DIR` | תיקיית סשן Baileys (`auth`) |

---

## 🗄️ הרצת PostgreSQL

**Docker (מקומי):**

```bash
docker run --name wa-expenses-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=whatsapp_expenses -p 5432:5432 -d postgres:16
```

ואז ב‑`.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_expenses?schema=public
```

**Supabase / Neon / Railway:** העתיקו את ה‑connection string שלהם ל‑`DATABASE_URL`.

### Prisma — מיגרציות + seed

```bash
npm run db:migrate    # יוצר את הטבלאות (prisma migrate dev)
npm run db:seed       # יוצר משפחה ראשונית + קטגוריות + משתמש OWNER
npm run db:studio     # (אופציונלי) ממשק לצפייה בנתונים
```

ה‑seed יוצר משפחה בשם `DEFAULT_FAMILY_NAME` עם `DEFAULT_INVITE_CODE`, 15 קטגוריות
ברירת מחדל, ומשתמש OWNER לפי `OWNER_PHONE`.

---

## ▶️ הרצה

**דשבורד (Next.js):**

```bash
npm run dev          # http://localhost:3000  → מפנה ל-/dashboard
```

**בוט WhatsApp (תהליך נפרד):**

```bash
npm run bot
```

### סריקת QR

1. הריצו `npm run bot` — יוצג QR בטרמינל.
2. במכשיר עם מספר ה‑WhatsApp הייעודי: **WhatsApp → הגדרות → מכשירים מקושרים → קישור מכשיר**.
3. סרקו את הקוד. עם החיבור יוצג `✅ WhatsApp connected`.
4. הסשן נשמר ב‑`auth/`. אם תתנתקו לגמרי — מחקו את `auth/` והריצו `npm run bot` שוב לסריקה חדשה.

---

## ✅ בדיקות ידניות

1. `npm run bot` → מופיע QR → סורקים עם ה‑WhatsApp הייעודי → מתחבר.
2. שולחים `שלום` ממספר לא רשום → הבוט מבקש קוד הצטרפות.
3. שולחים `הצטרפות ABC123` → הבוט מצרף למשפחה.
4. שולחים `רמי לוי 342` → נשמרת הוצאה ומתקבל אישור.
5. שולחים `סיכום חודש` → מתקבל סיכום חודשי.
6. שולחים `מחק אחרונה` → ההוצאה האחרונה נמחקת (מחיקה רכה).
7. שולחים תמונה של קבלה → הקובץ נשמר; אם Vision לא מחובר → מסומן "לבדיקה".
8. נכנסים ל‑`http://localhost:3000/dashboard` → רואים את ההוצאות.

בדיקת בריאות: `GET http://localhost:3000/api/health`.

---

## 💬 פקודות WhatsApp נתמכות

| פקודה | דוגמאות |
|------|---------|
| הצטרפות | `הצטרפות ABC123` |
| רישום הוצאה | `רמי לוי 342` · `דלק 280` · `קפה 18` · `שילמתי 120 על תרופות` · `נטפליקס 69 חודשי` |
| דוח חודשי | `סיכום חודש` · `כמה הוצאנו החודש?` · `דוח חודשי` |
| תקציב | `קבע תקציב חודשי 12000` · `תקציב סופר 3500` · `תקציב מסעדות 900` |
| מחיקה | `מחק אחרונה` |
| תיקון | `תקן אחרונה לקטגוריה עסק` · `תקן אחרונה סכום 420` |
| הוצאות קבועות | `הוצאות קבועות` · `מנויים` |
| עזרה | `עזרה` · `מה אפשר לעשות` |

אפשר גם לשלוח **תמונה/PDF** של קבלה או חשבונית.

---

## 🚀 פרודקשן / Hosting

הבוט (Baileys) דורש תהליך רץ קבוע, ולכן **אסור** להריץ אותו כ‑serverless function
של Vercel — חיבור ה‑WebSocket ייסגר וההודעות יאבדו. מומלץ:

- **VPS / Railway / Render / Fly.io / Docker** — הריצו שני תהליכים:
  - `npm run start` (אחרי `npm run build`) — הדשבורד.
  - `npm run bot` — הבוט (למשל תחת `pm2` או systemd).
- את הדשבורד עצמו אפשר לארח גם ב‑Vercel; רק את **הבוט** מריצים על שרת קבוע.
- ודאו ש‑`auth/` ו‑`uploads/` נשמרים על disk קבוע (volume).

---

## 🔁 מעבר עתידי ל‑WhatsApp Cloud API הרשמי

1. צרו מחלקה חדשה, למשל `CloudApiAdapter`, שמממשת את
   `server/whatsapp/whatsapp-adapter.interface.ts` (`start`, `onMessage`, `sendText`).
2. ב‑webhook הרשמי המירו כל הודעה נכנסת ל‑`IncomingMessage` האחיד.
3. החליפו ב‑`scripts/whatsapp-bot.ts` את `BaileysAdapter` ב‑`CloudApiAdapter`.

שאר המערכת (services, handlers, AI, DB, דשבורד) נשארת ללא שינוי.

---

## ⚠️ מגבלות ידועות

- **Baileys הוא פתרון לא רשמי** ואינו נתמך ע"י WhatsApp.
- אין להשתמש במספר האישי — מומלץ **מספר ייעודי**.
- לא מתאים בשלב זה ללקוחות משלמים ללא מעבר ל‑API הרשמי.
- ייתכנו ניתוקים; הבוט מנסה להתחבר מחדש אוטומטית.
- אין לשלוח ספאם.
- אין לשמור פרטי אשראי מלאים — מספרי כרטיס מטושטשים אוטומטית מטקסט לפני שמירה.
- Baileys דורש process קבוע ולכן **לא** מתאים כ‑serverless API route.

---

## 📜 Scripts

```bash
npm run dev          # דשבורד (פיתוח)
npm run build        # build לפרודקשן
npm run start        # הרצת פרודקשן
npm run bot          # תהליך הבוט (Baileys)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # יצירת נתוני בסיס
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```
