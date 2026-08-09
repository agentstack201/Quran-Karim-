'use client';

import {
  Button,
  Modal,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  type SegmentOption,
} from '@/components/ui';
import {
  PLAYBACK_RATES,
  QURAN_LEADING,
  QURAN_SCALE,
  RECITERS,
  REPEAT_CHOICES,
  TAFSIR_EDITIONS,
} from '@/constants';
import { BASMALAH } from '@/constants';
import type { BackgroundChoice, MemorizationMask, ThemePreference } from '@/types';
import { toArabicNumerals } from '@/utils';
import { StorageSection } from '@/features/downloads/StorageSection';
import { useSettings } from './SettingsProvider';

const THEME_OPTIONS: readonly SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'نهاري', icon: 'sun' },
  { value: 'dark', label: 'ليلي', icon: 'moon' },
  { value: 'system', label: 'النظام', icon: 'monitor' },
];

const MASK_OPTIONS: readonly SegmentOption<MemorizationMask>[] = [
  { value: 'none', label: 'ظاهر', icon: 'eye' },
  { value: 'firstWord', label: 'أول كلمة', icon: 'textSize' },
  { value: 'hidden', label: 'مخفي', icon: 'eyeOff' },
];

const BACKGROUND_OPTIONS: readonly { value: BackgroundChoice; label: string; swatch: string }[] = [
  { value: 'paper', label: 'ورقي', swatch: 'bg-[#faf6ee] border-[#e6ddcd]' },
  { value: 'beige', label: 'بيج', swatch: 'bg-[#f2e9d8] border-[#ded1b6]' },
  { value: 'white', label: 'أبيض', swatch: 'bg-white border-[#e4e8e6]' },
  { value: 'dark', label: 'داكن', swatch: 'bg-[#0b1210] border-[#24332c]' },
];

/**
 * The settings dialog.
 *
 * Every control writes straight through to persisted state — there is no save
 * button, and no draft to lose. Changes are visible behind the dialog as they
 * are made, which is why the live preview sits at the top rather than being
 * hidden behind a separate step.
 */
export function SettingsPanel({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}): React.JSX.Element {
  const { settings, update, setTheme, background, setBackground, resetFont, resetAll } =
    useSettings();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الإعدادات"
      description="تُحفظ تفضيلاتك على هذا الجهاز فقط"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" iconStart="reset" onClick={resetAll}>
            استعادة الافتراضي
          </Button>
          <Button size="sm" onClick={onClose}>
            تم
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        <section aria-labelledby="settings-appearance">
          <h3 id="settings-appearance" className="mb-4 text-sm font-bold text-ink">
            المظهر
          </h3>

          <div className="space-y-5">
            <div>
              <span className="mb-2 block text-sm font-medium text-ink">الوضع</span>
              <SegmentedControl
                label="وضع العرض"
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={setTheme}
                className="w-full"
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-ink">خلفية القراءة</span>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="خلفية القراءة">
                {BACKGROUND_OPTIONS.map((option) => {
                  const selected = background === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setBackground(option.value)}
                      className={`flex flex-col items-center gap-2 rounded-md border p-2.5 transition-all duration-200 ease-[var(--ease-out-soft)] ${
                        selected
                          ? 'border-primary bg-primary-soft'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-8 rounded-sm border ${option.swatch}`}
                      />
                      <span
                        className={`text-xs font-medium ${selected ? 'text-primary' : 'text-ink-muted'}`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-typography">
          <div className="mb-4 flex items-center justify-between">
            <h3 id="settings-typography" className="text-sm font-bold text-ink">
              نص المصحف
            </h3>
            <Button variant="ghost" size="sm" iconStart="reset" onClick={resetFont}>
              إعادة الضبط
            </Button>
          </div>

          {/* Live preview — the setting and its effect in the same glance. */}
          <p
            className="quran-text mb-5 overflow-hidden rounded-md border border-border bg-surface-sunken px-4 py-5 text-center"
            aria-hidden="true"
          >
            {BASMALAH}
          </p>

          <div className="space-y-5">
            <Slider
              label="حجم الخط"
              min={QURAN_SCALE.min}
              max={QURAN_SCALE.max}
              step={QURAN_SCALE.step}
              value={settings.quranScale}
              onChange={(value) => update('quranScale', value)}
              hint={`${toArabicNumerals(Math.round(settings.quranScale * 100))}٪`}
              valueText={`${Math.round(settings.quranScale * 100)} بالمئة`}
            />

            <Slider
              label="تباعد الأسطر"
              min={QURAN_LEADING.min}
              max={QURAN_LEADING.max}
              step={QURAN_LEADING.step}
              value={settings.quranLeading}
              onChange={(value) => update('quranLeading', value)}
              hint={toArabicNumerals(settings.quranLeading.toFixed(2))}
              valueText={settings.quranLeading.toFixed(2)}
            />

            <div className="space-y-1 pt-1">
              <Switch
                label="عرض الترجمة"
                description="الترجمة الإنجليزية أسفل كل آية"
                checked={settings.showTranslation}
                onChange={(checked) => update('showTranslation', checked)}
              />
              <Switch
                label="عرض النطق اللاتيني"
                description="كتابة صوتية تساعد غير الناطقين بالعربية"
                checked={settings.showTransliteration}
                onChange={(checked) => update('showTransliteration', checked)}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-audio">
          <h3 id="settings-audio" className="mb-4 text-sm font-bold text-ink">
            التلاوة
          </h3>

          <div className="space-y-5">
            <Select
              label="القارئ"
              value={settings.reciterId}
              onChange={(value) => update('reciterId', value)}
              options={RECITERS.map((reciter) => ({
                value: reciter.id,
                label: reciter.name,
                hint: reciter.style,
              }))}
            />

            <Select
              label="سرعة التلاوة"
              value={String(settings.playbackRate)}
              onChange={(value) => update('playbackRate', Number(value))}
              options={PLAYBACK_RATES.map((rate) => ({
                value: String(rate),
                label: `${toArabicNumerals(rate)}×`,
              }))}
            />

            <Slider
              label="مستوى الصوت"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(value) => update('volume', value)}
              hint={`${toArabicNumerals(Math.round(settings.volume * 100))}٪`}
              valueText={`${Math.round(settings.volume * 100)} بالمئة`}
            />

            <div className="space-y-1 pt-1">
              <Switch
                label="التشغيل المتتابع"
                description="الانتقال تلقائياً إلى الآية التالية"
                checked={settings.continuousPlayback}
                onChange={(checked) => update('continuousPlayback', checked)}
              />
              <Switch
                label="التمرير التلقائي"
                description="إبقاء الآية التي تُتلى في منتصف الشاشة"
                checked={settings.autoScroll}
                onChange={(checked) => update('autoScroll', checked)}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-memorization">
          <h3 id="settings-memorization" className="mb-1.5 text-sm font-bold text-ink">
            الحفظ
          </h3>
          <p className="mb-4 text-xs text-ink-subtle">
            كرّر الآية حتى تستقر، وأخفِ النص تدريجياً حتى تستغني عنه.
          </p>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="تكرار كل آية"
                value={String(settings.repeatEach)}
                onChange={(value) => update('repeatEach', Number(value))}
                options={REPEAT_CHOICES.map((count) => ({
                  value: String(count),
                  label: count === 1 ? 'بدون تكرار' : `${toArabicNumerals(count)} مرات`,
                }))}
              />
              <Select
                label="تكرار المقطع"
                value={String(settings.repeatRange)}
                onChange={(value) => update('repeatRange', Number(value))}
                options={REPEAT_CHOICES.map((count) => ({
                  value: String(count),
                  label: count === 1 ? 'مرة واحدة' : `${toArabicNumerals(count)} مرات`,
                }))}
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-ink">إخفاء النص</span>
              <SegmentedControl
                label="مستوى إخفاء النص"
                options={MASK_OPTIONS}
                value={settings.memorizationMask}
                onChange={(value) => update('memorizationMask', value)}
              />
              <p className="mt-2 text-xs text-ink-subtle">
                الكلمات المخفية تظهر كخطوط، والمسة عليها تكشف الآية.
              </p>
            </div>
          </div>
        </section>

        <StorageSection />

        <section aria-labelledby="settings-tafsir">
          <h3 id="settings-tafsir" className="mb-4 text-sm font-bold text-ink">
            التفسير
          </h3>
          <Select
            label="نسخة التفسير"
            value={String(settings.tafsirId)}
            onChange={(value) => update('tafsirId', Number(value))}
            options={TAFSIR_EDITIONS.map((edition) => ({
              value: String(edition.id),
              label: edition.name,
              hint: edition.author,
            }))}
          />
        </section>
      </div>
    </Modal>
  );
}
