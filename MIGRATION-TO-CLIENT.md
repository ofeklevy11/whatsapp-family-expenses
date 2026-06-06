# העברת המערכת ללקוח — Runbook 1:1

מעבר **מהמחשב שלך → מחשב הלקוח (Windows)**, אחד-לאחד, עם כל הנתונים והחיבור הקיים.

**החלטות שננעלו:**
- מספר WhatsApp: **אותו מספר ייעודי** → מעתיקים את `auth/` (בלי QR מחדש).
- נתונים: **dump מלא 1:1** של ה-DB.
- מחשב לקוח: **Windows**.
- DB יעד: **מנוהל בענן** (Supabase / Neon) — גם המחשב המקומי וגם Vercel בעתיד יתחברו אליו.

> כלל זהב: **ברגע נתון, רק מכונה אחת מריצה את הבוט.** שני תהליכים על אותו session = WhatsApp מנתק אחד מהם. לכן בזמן ההעברה מפסיקים את הבוט אצלך, ורק אז מפעילים אצל הלקוח.

---

## מפת המערכת (מה בעצם מעבירים)

| רכיב | מקור | יעד אצל הלקוח |
|---|---|---|
| קוד (Next.js repo) | התיקייה הזו | אותה תיקייה (zip / git) |
| DB (PostgreSQL 16) | Docker מקומי `wa-expenses-db` פורט 5437 | **ענן** Supabase/Neon |
| נתונים (הוצאות/משפחות/תקציבים/BotStatus) | ה-DB המקומי | dump → restore לענן |
| session WhatsApp | `auth/` (לא ב-git) | מעתיקים 1:1 |
| קבצי קבלות | `uploads/` (לא ב-git) | מעתיקים 1:1 |
| סודות | `.env` (לא ב-git) | מעתיקים, משנים רק `DATABASE_URL` |
| תהליכים | `npm run bot` (Baileys) + דשבורד | בוט קבוע אצל הלקוח; דשבורד מקומי/Vercel |

---

## שלב 0 — תנאים מקדימים על מחשב הלקוח (Windows)

1. **Node.js 24** (אותו major כמו אצלך, `v24.x`). מ-https://nodejs.org או nvm-windows. אימות: `node -v`.
2. **Git** (אופציונלי, אם מעבירים דרך repo) — https://git-scm.com.
3. גישה לחשבון ה-DB בענן (Supabase/Neon) — תפתח אתה בשלב 1.
4. *לא צריך Docker* על מחשב הלקוח (ה-DB בענן).

---

## שלב 1 — הקמת ה-DB בענן + העברת הנתונים (אצלך)

### 1.1 פותחים DB בענן
- Supabase: Project → Database → Connection string (**Direct connection**, פורט 5432, לא ה-pooler 6543). ה-DB הדיפולטי נקרא `postgres`.
- Neon: Dashboard → Connection string. ה-DB הדיפולטי בד"כ `neondb`.
- שמור את ה-URL המלא, כולל `?sslmode=require`. נקרא לו להלן `CLOUD_URL`.

### 1.2 מוודאים שה-DB המקומי רץ
```powershell
docker start wa-expenses-db
docker exec wa-expenses-db pg_isready -U postgres
```

### 1.3 Dump של ה-DB המקומי (פורמט custom)
```powershell
docker exec wa-expenses-db pg_dump -U postgres -d whatsapp_expenses `
  --no-owner --no-privileges -Fc -f /tmp/wa.dump
docker cp wa-expenses-db:/tmp/wa.dump .\wa-expenses.dump
```

### 1.4 Restore אל הענן
מריצים את ה-restore **מתוך** הקונטיינר (יש לו pg_restore תואם-PG16 וגישה לאינטרנט). החלף את `CLOUD_URL`:
```powershell
docker exec wa-expenses-db pg_restore `
  --no-owner --no-privileges --clean --if-exists `
  -d "CLOUD_URL" /tmp/wa.dump
```
> ה-dump כולל גם את טבלת `_prisma_migrations` → אחרי ה-restore Prisma יראה את הסכמה כמעודכנת, בלי צורך ב-migrate אצל הלקוח.

### 1.5 אימות שהנתונים עברו
```powershell
docker exec wa-expenses-db psql "CLOUD_URL" -c "SELECT count(*) AS expenses FROM \"Expense\";"
docker exec wa-expenses-db psql "CLOUD_URL" -c "SELECT count(*) AS families FROM \"Family\";"
```
המספרים צריכים להתאים למה שיש לך מקומית.

---

## שלב 2 — אריזת הפרויקט (אצלך)

מעבירים את **כל** התיקייה חוץ מהדברים שנבנים מחדש. כוללים את `auth/`, `uploads/`, `.env` (אלה לא ב-git אבל חיוניים ל-1:1).

```powershell
# מתוך תיקיית האב של הפרויקט
Compress-Archive -Path `
  ".\whatsapp-family-expenses\*" `
  -DestinationPath ".\wa-expenses-handoff.zip" -Force
```
לפני הדחיסה מחק כדי להקטין ולהבטיח build נקי (ייווצרו מחדש אצל הלקוח):
```powershell
Remove-Item -Recurse -Force .\whatsapp-family-expenses\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\whatsapp-family-expenses\.next -ErrorAction SilentlyContinue
```

**רשימת חובה שחייבת להיכלל ב-zip:**
- כל הקוד (`app/`, `server/`, `components/`, `lib/`, `prisma/`, `scripts/`, `next.config.mjs`, `package.json`, `package-lock.json`)
- `.env`
- `auth/`  ← session ה-WhatsApp (ראה שלב 5)
- `uploads/`  ← קבלות

> חלופה: `git clone` של הקוד + העברה נפרדת (USB/מוצפן) של `.env`, `auth/`, `uploads/` — כי הם לא ב-git.

---

## שלב 3 — התקנה אצל הלקוח (Windows)

```powershell
# חלץ את ה-zip, ואז מתוך תיקיית הפרויקט:
npm install
npx prisma generate
```

---

## שלב 4 — קובץ `.env` אצל הלקוח

מעתיקים את ה-`.env` שלך כמו שהוא, ומשנים **רק** את חיבור ה-DB:

```
DATABASE_URL=CLOUD_URL        # ה-URL של הענן מ-1.1 (כולל ?sslmode=require)
```

נשארים ללא שינוי (1:1): `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OPENAI_API_KEY`, `OWNER_PHONE`, `DEFAULT_*`, `UPLOADS_DIR`, `WHATSAPP_AUTH_DIR`, `SESSION_DAYS`.

> מומלץ אבטחה (אחרי שמוודאים שהכול עובד): שנה `ADMIN_PASSWORD`, ושקול מפתח `OPENAI_API_KEY` נפרד ללקוח (חיוב נפרד). `AUTH_SECRET` אפשר להשאיר; אם תחליף — כל המשתמשים יצטרכו להתחבר מחדש לדשבורד.

בדיקת חיבור ל-DB הענן מהמחשב של הלקוח:
```powershell
npx prisma migrate status
```
צריך להראות שהמיגרציות מיושמות (up to date).

---

## שלב 5 — העברת session ה-WhatsApp (1:1) — קריטי לסדר

1. **אצלך:** עצור לחלוטין את תהליך הבוט (סגור את חלון `npm run bot` / עצור את ה-service). מרגע זה אתה לא מריץ אותו יותר.
2. ודא ש-`auth/` הועתק לתיקיית הפרויקט אצל הלקוח (אם נכלל ב-zip — כבר שם).
3. **אצל הלקוח:** הפעל את הבוט (שלב 6). הוא יתחבר עם אותו session **בלי QR**.
4. תראה בלוג `✅ WhatsApp connected`. אם במקום זה מופיע QR — הסשן לא נטען (תיקיית `auth/` ריקה/לא הועתקה) — העתק שוב.

> אם אי-פעם יהיה ניתוק מלא: מחק `auth/` אצל הלקוח, הרץ `npm run bot`, וסרוק QR מהטלפון של אותו מספר ייעודי.

---

## שלב 6 — הרצה ואימות אצל הלקוח

**הבוט (חובה, תהליך קבוע):**
```powershell
npm run bot
```

**הדשבורד (אופציונלי מקומית — בעתיד עובר ל-Vercel):**
```powershell
npm run build
npm run start      # http://localhost:3000
```

**אימות לפי בדיקות ה-README:**
1. הבוט מתחבר (`✅ WhatsApp connected`, בלי QR).
2. שליחת `סיכום חודש` מהמספר הרשום → מתקבל סיכום.
3. שליחת `קפה 18` → נשמרת הוצאה ומתקבל אישור.
4. דשבורד → `/dashboard` → רואים את כל ההיסטוריה שעברה.
5. `GET http://localhost:3000/api/health` → תקין.
6. דף **סטטוס הבוט** → `online`.

---

## שלב 7 — הרצה קבועה של הבוט (Windows)

הבוט חייב לרוץ 24/7 גם אחרי reboot. שתי דרכים (בחר אחת):

### אופציה A — NSSM כ-Windows Service (הכי יציב, מומלץ)
1. הורד NSSM: https://nssm.cc/download
2. ```powershell
   nssm install WaExpenseBot
   ```
3. בחלון: **Path** = הנתיב ל-`npm.cmd` (`where.exe npm`), **Arguments** = `run bot`, **Startup directory** = תיקיית הפרויקט.
4. Tab **I/O**: כוון stdout/stderr לקובץ לוג (למשל `bot.out.log` / `bot.err.log`).
5. ```powershell
   nssm start WaExpenseBot
   ```
שירות שעולה אוטומטית בכל אתחול, עם restart אוטומטי אם נופל.

### אופציה B — pm2
```powershell
npm i -g pm2
pm2 start npm --name wa-bot -- run bot
pm2 save
pm2 startup       # עקוב אחרי ההוראה שמודפסת כדי שיעלה ב-boot
```

---

## שלב 8 — Vercel (אתה תעשה — לא כתוב כאן)

> רק תזכורת ארכיטקטונית: הדשבורד (Next.js) יכול לעבור ל-Vercel ולהתחבר לאותו `CLOUD_URL`.
> **הבוט (Baileys) לא רץ על Vercel** — נשאר כתהליך קבוע על מחשב הלקוח / שרת (שלב 7).
> השלבים בפועל — תעשה אתה.

---

## נספח — Checklist מהיר

- [ ] DB ענן הוקם, `CLOUD_URL` בידיים (Direct, sslmode=require)
- [ ] `pg_dump` → `pg_restore` לענן הצליח
- [ ] ספירת הוצאות/משפחות בענן = מקומי
- [ ] zip כולל קוד + `.env` + `auth/` + `uploads/` (בלי node_modules/.next)
- [ ] Node 24 מותקן אצל הלקוח
- [ ] `npm install` + `npx prisma generate`
- [ ] `.env` עודכן: `DATABASE_URL=CLOUD_URL` בלבד
- [ ] `npx prisma migrate status` = up to date
- [ ] **הבוט אצלך כבוי**
- [ ] בוט אצל הלקוח מתחבר בלי QR (`✅ WhatsApp connected`)
- [ ] בדיקות WhatsApp + דשבורד עוברות
- [ ] בוט רץ כ-service (NSSM/pm2) + עולה ב-boot

## נספח — Rollback
אם משהו נשבר אצל הלקוח, הנתונים בענן שלמים והמערכת אצלך עדיין שלמה. כדי לחזור להריץ אצלך זמנית: החזר `DATABASE_URL` המקומי ב-`.env` שלך והפעל `npm run bot` — **רק אם הבוט אצל הלקוח כבוי** (כלל המכונה היחידה).

## נספח — Gotchas
- **שני בוטים במקביל** = ניתוק. תמיד מכונה אחת.
- **Supabase pooler (6543)** לא מתאים ל-migrations/Prisma — השתמש ב-Direct (5432).
- **sslmode=require** חובה ל-Supabase/Neon, אחרת החיבור ייכשל.
- `auth/` ו-`uploads/` לא ב-git — אל תשכח אותם בהעברה.
- אם הדשבורד נופל בפיתוח כל כמה שניות — זה תוקן ב-`next.config.mjs` (ה-watcher מתעלם מ-`auth/`,`uploads/`).
