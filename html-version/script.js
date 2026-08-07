/**
 * فهرس السور — منطق البحث والترتيب والترشيح بجافاسكريبت خام (بدون أي إطار عمل).
 * يعتمد على مصفوفة CHAPTERS المعرّفة في data.js.
 */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicNumerals(value) {
  return String(value)
    .split('')
    .map((char) => {
      const digit = Number(char);
      return Number.isNaN(digit) ? char : ARABIC_DIGITS[digit];
    })
    .join('');
}

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g;
const TATWEEL = /ـ/g;

function normaliseArabic(text) {
  return text
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

const state = {
  query: '',
  sort: 'mushaf',
  filter: 'all',
};

const grid = document.getElementById('chapter-grid');
const emptyState = document.getElementById('empty-state');
const countLabel = document.getElementById('chapter-count');
const searchInput = document.getElementById('chapter-filter');

function buildDetails(chapter) {
  const details = document.createElement('dl');
  details.className = 'chapter-details';

  const entries = [
    [
      'الجزء',
      chapter.startJuz === chapter.endJuz
        ? toArabicNumerals(chapter.startJuz)
        : `${toArabicNumerals(chapter.startJuz)}–${toArabicNumerals(chapter.endJuz)}`,
    ],
    ['الصفحات', `${toArabicNumerals(chapter.startPage)}–${toArabicNumerals(chapter.endPage)}`],
    ['عدد الأركاع', toArabicNumerals(chapter.rukuCount)],
    ['البسملة', chapter.hasBasmalah ? 'نعم' : 'لا'],
  ];

  entries.forEach(([term, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    details.append(dt, dd);
  });

  return details;
}

function buildCard(chapter) {
  const li = document.createElement('li');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chapter-card';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute(
    'aria-label',
    `سورة ${chapter.nameSimple}، ${toArabicNumerals(chapter.versesCount)} آية — عرض التفاصيل`,
  );

  const number = document.createElement('span');
  number.className = 'chapter-number';
  number.setAttribute('aria-hidden', 'true');
  const numberSpan = document.createElement('span');
  numberSpan.textContent = toArabicNumerals(chapter.id);
  number.appendChild(numberSpan);

  const info = document.createElement('span');
  info.className = 'chapter-info';
  const name = document.createElement('span');
  name.className = 'chapter-name';
  name.textContent = chapter.name;
  const meta = document.createElement('span');
  meta.className = 'chapter-meta';
  meta.textContent = `${chapter.transliteration} · ${chapter.translation}`;
  info.append(name, meta);

  const stats = document.createElement('span');
  stats.className = 'chapter-stats';
  const verses = document.createElement('span');
  verses.className = 'chapter-verses';
  verses.textContent = `${toArabicNumerals(chapter.versesCount)} آية`;
  const revelation = document.createElement('span');
  revelation.className = 'chapter-revelation';
  revelation.textContent = chapter.revelation === 'meccan' ? 'مكية' : 'مدنية';
  stats.append(verses, revelation);

  button.append(number, info, stats);

  const details = buildDetails(chapter);
  details.hidden = true;

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
  });

  li.append(button, details);
  return li;
}

function getFilteredChapters() {
  const needle = normaliseArabic(state.query).toLowerCase();
  const asNumber = Number(state.query.trim());

  const filtered = CHAPTERS.filter((chapter) => {
    if (state.filter !== 'all' && chapter.revelation !== state.filter) return false;
    if (needle.length === 0) return true;

    if (Number.isInteger(asNumber) && asNumber > 0) return chapter.id === asNumber;

    return (
      normaliseArabic(chapter.nameSimple).toLowerCase().includes(needle) ||
      chapter.transliteration.toLowerCase().includes(needle) ||
      chapter.translation.toLowerCase().includes(needle)
    );
  });

  const sorted = filtered.slice();
  switch (state.sort) {
    case 'revelation':
      sorted.sort((a, b) => a.revelationOrder - b.revelationOrder);
      break;
    case 'length':
      sorted.sort((a, b) => b.versesCount - a.versesCount);
      break;
    case 'mushaf':
    default:
      sorted.sort((a, b) => a.id - b.id);
  }

  return sorted;
}

function render() {
  const chapters = getFilteredChapters();

  countLabel.textContent = `${toArabicNumerals(chapters.length)} سورة`;
  grid.innerHTML = '';

  if (chapters.length === 0) {
    emptyState.hidden = false;
    grid.hidden = true;
    return;
  }

  emptyState.hidden = true;
  grid.hidden = false;

  const fragment = document.createDocumentFragment();
  chapters.forEach((chapter) => fragment.appendChild(buildCard(chapter)));
  grid.appendChild(fragment);
}

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    state.sort = button.dataset.sort;
    document
      .querySelectorAll('[data-sort]')
      .forEach((b) => b.classList.toggle('is-active', b === button));
    render();
  });
});

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document
      .querySelectorAll('[data-filter]')
      .forEach((b) => b.classList.toggle('is-active', b === button));
    render();
  });
});

render();
