# دليل النشر · Deployment

كل ما تحتاجه لنقل **تلاوة** من المستودع إلى رابط يعمل — **بتكلفة صفر**.

---

## لماذا هذا التطبيق مجاني الاستضافة فعلاً

التطبيق **تصدير ثابت بالكامل** (`output: 'export'`). لا خادم، ولا قاعدة بيانات،
ولا دوال سحابية، ولا أي شيء يعمل بعد انتهاء البناء:

| ما يفعله القارئ            | أين يُنفَّذ                       | تكلفة الخادم |
| -------------------------- | --------------------------------- | ------------ |
| يقرأ سورة أو جزءاً أو صفحة | ملف HTML مُولَّد مسبقاً           | صفر          |
| يبحث في المصحف             | فهرس في المتصفح (`/data/search/`) | **صفر**      |
| يستمع لتلاوة               | أرشيف الصوت مباشرة                | صفر          |
| يفتح التفسير               | `api.quran.com` مباشرة من المتصفح | صفر          |
| يحفظ إشارة أو يتابع خطته   | `LocalStorage` على جهازه          | صفر          |

الناتج **٥٬٠٩٩ ملفاً** (٨١٩ صفحة HTML مُولَّدة مسبقاً + البيانات)، وأكبر ملف
٢ ميجابايت. هذا يقع داخل الطبقة المجانية لكل مستضيف ثابت تقريباً — وهو قرار
معماري مقصود، لا مصادفة: كل ميزة تُضاف تُقاس بهذا المعيار.

> **قاعدة المشروع:** أي ميزة تحتاج خادماً تحتاج جواباً عن سؤالين — من يدفع
> فاتورته، وماذا يحدث للقارئ يوم لا يوجد من يدفع.

---

## قبل النشر

| #   | الخطوة                          | لماذا                                                                                           |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| ١   | **نطاق (domain)** — اختياري     | العناوين في `sitemap.xml` و Open Graph تُبنى منه. النطاق المجاني الذي يعطيك إياه المستضيف يكفي. |
| ٢   | **اضبط `NEXT_PUBLIC_SITE_URL`** | متغيّر البيئة الوحيد. بلا شرطة مائلة في النهاية.                                                |
| ٣   | **HTTPS**                       | عامل الخدمة والتثبيت كتطبيق لا يعملان بدونه. كل الخيارات أدناه توفّره مجاناً.                   |

> التطبيق يعمل بلا أي متغيّر بيئة. `NEXT_PUBLIC_SITE_URL` يؤثّر على SEO
> والمشاركة فقط، لا على القراءة.

البناء:

```bash
npm ci
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
# الناتج كاملاً في out/
```

---

## الخيار الأول: Cloudflare Pages ✅ الموصى به

**لماذا هو الأفضل لهذا المشروع تحديداً:** الطبقة المجانية بلا سقف على نقل
البيانات (bandwidth). هذا يهمّ هنا أكثر من أي مشروع آخر — تطبيق قرآن ينقل
ملفات JSON وصوتاً، ونجاحه يعني نقل بيانات أكثر. مستضيف يحاسبك على النجاح
هو مستضيف سيقتل المشروع يوم ينجح.

| الحد               | القيمة      | وضعنا                 |
| ------------------ | ----------- | --------------------- |
| نقل البيانات       | **بلا حد**  | ✔                     |
| عدد الملفات        | ٢٠٬٠٠٠      | نستعمل ٥٬٠٩٩ ✔        |
| حجم الملف الواحد   | ٢٥ ميجابايت | أكبر ملف ٢ ميجابايت ✔ |
| عمليات بناء شهرياً | ٥٠٠         | كافٍ جداً ✔           |

### الإعداد

من [dash.cloudflare.com](https://dash.cloudflare.com) ← **Workers & Pages** ←
**Create** ← **Pages** ← **Connect to Git**، ثم:

| الحقل                  | القيمة                              |
| ---------------------- | ----------------------------------- |
| Framework preset       | `Next.js (Static HTML Export)`      |
| Build command          | `npm run build`                     |
| Build output directory | `out`                               |
| Environment variable   | `NEXT_PUBLIC_SITE_URL` = رابط موقعك |

أو من الطرفية:

```bash
npm i -g wrangler
wrangler pages deploy out --project-name tilawa
```

**رؤوس الأمان تعمل تلقائياً**: ملف `public/_headers` يُنسخ إلى `out/` ويقرؤه
Cloudflare مباشرة.

---

## الخيار الثاني: Netlify

طبقة مجانية بـ **١٠٠ جيجابايت نقل بيانات شهرياً**. كافية للبداية، لكنها سقف
حقيقي يمكن بلوغه.

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"
```

يقرأ `_headers` بنفس الصيغة، فرؤوس الأمان تعمل كما هي.

---

## الخيار الثالث: GitHub Pages

مجاني تماماً، لكن **بتحفّظ مهم**.

> ⚠️ **GitHub Pages لا يدعم رؤوس HTTP مخصّصة إطلاقاً.** يعني أن
> `Content-Security-Policy` و`Strict-Transport-Security` و`X-Frame-Options`
> **لن تُرسل**. الموقع يعمل، لكنه يفقد طبقة الحماية التي بُنيت له.
>
> إن نشرت هنا، فاعلم أنك تتنازل عن ذلك عن قصد. Cloudflare Pages مجاني بنفس
> القدر ويحتفظ بالرؤوس — لا سبب وجيه لاختيار Pages على حسابها.

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SITE_URL: https://<user>.github.io/<repo>
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

> إن نشرت على مسار فرعي (`<user>.github.io/<repo>`) فستحتاج ضبط `basePath`
> في `next.config.ts` — وإلا كُسرت كل الروابط والأصول. النشر على نطاق جذر
> (نطاق مخصّص أو `<user>.github.io`) يتجنّب هذا كلياً، وهو الأبسط.

---

## أي خادم ثابت آخر

`out/` مجلّد ملفات عادية. انسخه وحسب:

```bash
rsync -av --delete out/ user@host:/var/www/tilawa/
```

نموذج Nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  root /var/www/tilawa;

  # التصدير الثابت يكتب /surah/1.html — يجب أن يخدمه على /surah/1
  location / {
    try_files $uri $uri.html $uri/index.html /404.html;
  }

  # حمولات الآيات وفهرس البحث لا تتغيّر أبداً
  location /data/  { expires 1y; add_header Cache-Control "public, immutable"; }
  location /fonts/ { expires 1y; add_header Cache-Control "public, immutable"; }

  # عامل الخدمة يجب ألا يُخزَّن — وإلا عَلِق القارئ على نسخة قديمة بلا مخرج
  location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Service-Worker-Allowed "/";
  }
}
```

> **رؤوس الأمان على خادم خاص:** انسخها من `public/_headers` — ذلك الملف
> مُولَّد من `config/security-headers.mjs`، وهو مصدر الحقيقة الوحيد للسياسة.
> لا تكتبها يدوياً في مكانين.

---

## بعد النشر: تحقّق من هذه الخمسة

```bash
# ١. الرؤوس تصل فعلاً (فارغة على GitHub Pages — هذا متوقّع هناك)
curl -sI https://your-domain.com | grep -i "content-security-policy\|strict-transport"

# ٢. صفحة عميقة تُخدم بلا خطأ
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/page/604

# ٣. فهرس البحث في متناول المتصفح
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://your-domain.com/data/search/ar.json

# ٤. عامل الخدمة لا يُخزَّن
curl -sI https://your-domain.com/sw.js | grep -i cache-control

# ٥. خريطة الموقع مبنية على نطاقك الصحيح
curl -s https://your-domain.com/sitemap.xml | head -3
```

ثم يدوياً:

- افتح الموقع، اقرأ سورة، ابحث عن آية.
- **اقطع الإنترنت** وأعد التحميل — يجب أن يعمل كل ما زرته، **والبحث معه**
  (الفهرس يُخزَّن عند أول بحث).
- ثبّت التطبيق من شريط المتصفح وتأكّد أنه يفتح باسمه وأيقونته.

---

## التكلفة الشهرية المتوقّعة

| البند            | Cloudflare Pages                    |
| ---------------- | ----------------------------------- |
| الاستضافة والنقل | **٠ $**                             |
| النطاق (اختياري) | ~١٠ $ سنوياً، أو ٠ $ بنطاق المستضيف |
| **الإجمالي**     | **٠ $ / شهر**                       |

هذا لا يتغيّر بعدد القرّاء. عشرة قرّاء أو مئة ألف — نفس الفاتورة، لأن لا شيء
يعمل على خادم بينهم وبين المصحف.

**البند الوحيد الذي يكبر مع النجاح هو الصوت**، وهو اليوم يُخدم من أرشيف
`everyayah.com` لا من عندنا. إن استضفت الصوت بنفسك يوماً فاستعمل
**Cloudflare R2** (خروج البيانات مجاني) لا S3 — الفرق بينهما آلاف الدولارات
شهرياً عند الحجم نفسه. التفصيل في
[`docs/PRODUCT_AUDIT.md`](docs/PRODUCT_AUDIT.md) § ٢٥.
