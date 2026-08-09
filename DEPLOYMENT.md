# دليل النشر · Deployment

كل ما تحتاجه لنقل **تلاوة** من المستودع إلى رابط يعمل.

---

## قبل النشر: ما تحتاج تجهيزه

| #   | الخطوة                          | لماذا                                                                                                                           |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ١   | **اختر نطاقاً (domain)**        | العناوين في `sitemap.xml` و Open Graph و JSON-LD تُبنى منه. بدونه ستشير إلى النطاق الافتراضي، وتفهرس محركات البحث المضيف الخطأ. |
| ٢   | **اضبط `NEXT_PUBLIC_SITE_URL`** | متغيّر البيئة الوحيد في المشروع. بلا شرطة مائلة في النهاية.                                                                     |
| ٣   | **تحقّق من HTTPS**              | عامل الخدمة والتثبيت كتطبيق (PWA) لا يعملان إلا على HTTPS — عدا `localhost`.                                                    |

> التطبيق يعمل بلا أي متغيّر بيئة. `NEXT_PUBLIC_SITE_URL` يؤثّر على SEO والمشاركة فقط، لا على القراءة.

---

## الخيار الأول: Vercel (الأسرع)

Next.js من صنع Vercel، فالنشر عليه لا يحتاج تهيئة.

```bash
npm i -g vercel
vercel login
vercel --prod
```

أو من الواجهة: اربط المستودع من [vercel.com/new](https://vercel.com/new) — يكتشف Next.js تلقائياً.

**أضف متغيّر البيئة** في Project Settings ← Environment Variables:

```
NEXT_PUBLIC_SITE_URL = https://your-domain.com
```

ثم أعد النشر ليأخذ المتغيّر مفعوله.

---

## الخيار الثاني: خادم خاص (VPS)

```bash
git clone <repository-url> && cd tilawa
npm ci
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm start   # يستمع على 3000
```

للتشغيل الدائم مع PM2:

```bash
npm i -g pm2
NEXT_PUBLIC_SITE_URL=https://your-domain.com pm2 start npm --name tilawa -- start
pm2 save && pm2 startup
```

### Nginx أمام التطبيق

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}

server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}
```

> **لا تُضِف رؤوس أمان في Nginx.** التطبيق يرسلها بنفسه من `next.config.ts`
> (CSP، HSTS، X-Frame-Options وغيرها)، وتكرارها قد يُضعف السياسة بدل تقويتها.

### Docker

المشروع لا يحتاج `Dockerfile` خاصاً — قالب Next.js الرسمي يكفي:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

---

## ماذا عن الاستضافة الساكنة (Netlify / GitHub Pages)؟

**لا تعمل مباشرة.** المشروع يحتاج خادم Node لمسارين:

- `/api/search` — فهرس البحث ٣ ميغابايت ويبقى على الخادم عمداً؛ إرساله للمتصفح يعني تحميله كاملاً عند كل زيارة
- `/api/tafsir/[verseKey]` — يُنقّي HTML الوارد من مصدر خارجي قبل وصوله للمتصفح، وهو حاجز أمني لا يصح إسقاطه

كل ما عدا ذلك ساكن بالفعل (٨٢٢ صفحة مُصيَّرة مسبقاً). على Netlify استخدم
[`@netlify/plugin-nextjs`](https://docs.netlify.com/frameworks/next-js/overview/)
الذي ينشر هذين المسارين كدوال.

---

## بعد النشر: قائمة التحقق

نفّذها على الرابط الحيّ — بعضها لا يمكن التحقق منه محلياً.

### أساسيات

- [ ] الصفحة الرئيسية تفتح، وآية اليوم تظهر خلال ثوانٍ
- [ ] `/surah/1` تعرض الفاتحة كاملة بالرسم العثماني
- [ ] البحث عن «الصلاة» يُرجع نتائج (يختبر تطبيع الرسم العثماني)
- [ ] `/sitemap.xml` يعرض ٨١٤ رابطاً بنطاقك أنت لا بالنطاق الافتراضي
- [ ] `/robots.txt` يشير إلى خريطة موقعك

### ما لم يُختبر حيّاً بعد ⚠️

هذان يعتمدان على خدمتين خارجيتين لم يكن الوصول إليهما ممكناً أثناء التطوير:

- [ ] **التلاوة** — اضغط ▶ على أي آية. يجلب الصوت من `everyayah.com`
- [ ] **التفسير** — افتح نافذة الآية. يجلب من `api.quran.com` عبر `/api/tafsir`

إن فشل أحدهما، تحقّق أن `connect-src` و `media-src` في CSP داخل `next.config.ts`
يسمحان بالنطاق المستخدم.

### التثبيت كتطبيق (PWA)

- [ ] **أندرويد / Chrome:** قائمة ← «تثبيت التطبيق»
- [ ] **آيفون / Safari:** مشاركة ← «إضافة إلى الشاشة الرئيسية»
- [ ] **ويندوز / ماك:** أيقونة التثبيت في شريط العنوان
- [ ] بعد التثبيت: أغلق الإنترنت وافتح التطبيق — يجب أن تعمل الصفحة الرئيسية
      وفهارس السور والأجزاء والأحزاب وصفحة المحفوظات، وكل سورة زرتها من قبل

### قياس مستقل

شغّل Lighthouse من DevTools على الرابط الحيّ. القيم المرجعية في
[README](README.md#-الجودة--measured-quality) مقيسة على شبكة بطيئة عمداً؛
النتائج على استضافة حقيقية ستكون أعلى.

---

## التحديثات بعد النشر

```bash
git pull
npm ci
npm run verify        # تنسيق ← lint ← أنواع ← اختبارات ← بناء
npm start
```

### عند تعديل عامل الخدمة أو قائمة التخزين المسبق

ارفع `VERSION` في `public/sw.js`. المتصفحات تُبقي العامل القديم فعّالاً حتى
تلاحظ تغيّراً في الملف، وترقيم الإصدار هو ما يحذف الذاكرات القديمة عند التفعيل.

### عند تحديث بيانات المصحف

```bash
npm run data:generate
npm test              # اختبارات سلامة البيانات هي شبكة الأمان هنا
```

---

## استكشاف الأعطال

| العَرَض                           | السبب الأرجح                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| العمل دون اتصال لا يعمل           | الموقع ليس على HTTPS، أو عامل الخدمة لم يُسجَّل. افتح DevTools ← Application ← Service Workers |
| روابط المشاركة تحمل نطاقاً خاطئاً | `NEXT_PUBLIC_SITE_URL` غير مضبوط، أو ضُبط بعد البناء دون إعادة نشر                             |
| التلاوة لا تعمل                   | `media-src` في CSP لا يسمح بنطاق الصوت، أو المصدر الخارجي معطّل                                |
| التفسير يعرض «تعذّر جلب التفسير»  | `api.quran.com` غير متاح. الترجمة ومعلومات الآية تبقى ظاهرة — هذا تدهور مقصود لا عطل           |
| صفحة بيضاء بعد التحديث            | عامل خدمة قديم يخدم قشرة قديمة. ارفع `VERSION` في `public/sw.js`                               |
| البناء يفشل على المضيف            | تحقّق أن إصدار Node ‏`>= 20.9` — الملف `.nvmrc` يثبّت الإصدار ٢٢                               |
