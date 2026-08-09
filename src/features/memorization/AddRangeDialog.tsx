'use client';

import { useState } from 'react';
import { JUZ_LIST, getChapter, getPage } from '@/services/quran';
import { TOTAL_PAGES } from '@/constants';
import { Button, Modal, SegmentedControl, Select, useToast } from '@/components/ui';
import { toArabicNumerals } from '@/utils';
import { useMemorization } from './MemorizationProvider';

/**
 * Declaring what you already know.
 *
 * Without this the app is unusable for the readers it is most for. Someone
 * arriving with fifteen juzʾ memorised is not going to tap through three
 * hundred pages, and starting them at zero would bury them under invented
 * review debt on day one — so they would leave, correctly concluding the tool
 * was built for beginners.
 *
 * The honesty constraint: this records a *declaration*, not a review. The
 * engine seeds these units at a stability measured in days-to-weeks rather
 * than years, so the first real review lands soon enough to correct an
 * overestimate while correcting it is still cheap.
 */

type Scope = 'juz' | 'surah' | 'pages';

const SCOPE_OPTIONS: readonly { value: Scope; label: string }[] = [
  { value: 'juz', label: 'جزء' },
  { value: 'surah', label: 'سورة' },
  { value: 'pages', label: 'صفحات' },
];

type Confidence = 'strong' | 'moderate' | 'weak';

const CONFIDENCE_OPTIONS: readonly { value: Confidence; label: string }[] = [
  { value: 'strong', label: 'متقن' },
  { value: 'moderate', label: 'جيد' },
  { value: 'weak', label: 'ضعيف' },
];

export type AddRangeDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export function AddRangeDialog({ open, onClose }: AddRangeDialogProps): React.JSX.Element {
  const { seedRange } = useMemorization();
  const { toast } = useToast();

  const [scope, setScope] = useState<Scope>('juz');
  const [juz, setJuz] = useState(30);
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [confidence, setConfidence] = useState<Confidence>('moderate');

  /** Resolves the current selection to a page range. */
  const range = ((): { from: number; to: number } => {
    if (scope === 'juz') {
      const meta = JUZ_LIST.find((item) => item.id === juz);
      return meta ? { from: meta.startPage, to: meta.endPage } : { from: 1, to: 1 };
    }
    if (scope === 'surah') {
      const meta = getChapter(surah);
      return meta ? { from: meta.startPage, to: meta.endPage } : { from: 1, to: 1 };
    }
    return { from: Math.min(from, to), to: Math.max(from, to) };
  })();

  const pageCount = range.to - range.from + 1;

  const submit = (): void => {
    const added = seedRange(range.from, range.to, confidence);
    toast(
      added === 0
        ? 'كل صفحات هذا النطاق مسجّلة عندك أصلاً'
        : `أُضيفت ${toArabicNumerals(added)} صفحة إلى سجلّ حفظك`,
      { tone: added === 0 ? 'info' : 'success' },
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="أضف ما تحفظه"
      description="سجّل ما حفظته سابقاً حتى تبدأ الخطة من واقعك لا من الصفر."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={submit}>
            أضف {toArabicNumerals(pageCount)} صفحة
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <SegmentedControl
          label="اختر بـ"
          value={scope}
          onChange={setScope}
          options={SCOPE_OPTIONS}
        />

        {scope === 'juz' && (
          <Select
            label="الجزء"
            value={String(juz)}
            onChange={(value) => setJuz(Number(value))}
            options={JUZ_LIST.map((item) => ({
              value: String(item.id),
              label: `${item.name} — صفحة ${toArabicNumerals(item.startPage)}–${toArabicNumerals(item.endPage)}`,
            }))}
          />
        )}

        {scope === 'surah' && (
          <Select
            label="السورة"
            value={String(surah)}
            onChange={(value) => setSurah(Number(value))}
            options={Array.from({ length: 114 }, (_, index) => {
              const chapter = getChapter(index + 1);
              return {
                value: String(index + 1),
                label: `${toArabicNumerals(index + 1)}. ${chapter?.name ?? ''}`,
              };
            })}
          />
        )}

        {scope === 'pages' && (
          <div className="grid grid-cols-2 gap-3">
            <PageNumberField label="من صفحة" value={from} onChange={setFrom} />
            <PageNumberField label="إلى صفحة" value={to} onChange={setTo} />
          </div>
        )}

        <SegmentedControl
          label="مستوى إتقانك له"
          value={confidence}
          onChange={setConfidence}
          options={CONFIDENCE_OPTIONS}
        />

        <p className="rounded-md bg-background-subtle p-3.5 text-xs leading-relaxed text-ink-muted">
          سيضيف هذا{' '}
          <strong className="font-bold text-ink">
            {toArabicNumerals(pageCount)} صفحة ({describeRange(range.from, range.to)})
          </strong>
          . نبدأ بتقدير متحفّظ عن قصد — أول مراجعة حقيقية ستصحّحه، فلا يضرّك أن تبالغ قليلاً.
        </p>
      </div>
    </Modal>
  );
}

/** Names the surahs a page range covers, so the reader can sanity-check it. */
function describeRange(from: number, to: number): string {
  const start = getPage(from)?.surahs[0];
  const end = getPage(to)?.surahs.at(-1);
  const startName = start ? getChapter(start)?.name : null;
  const endName = end ? getChapter(end)?.name : null;

  if (!startName) return `${toArabicNumerals(from)}–${toArabicNumerals(to)}`;
  if (!endName || startName === endName) return startName;
  return `${startName} — ${endName}`;
}

function PageNumberField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={TOTAL_PAGES}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isFinite(next)) return;
          onChange(Math.min(TOTAL_PAGES, Math.max(1, Math.round(next))));
        }}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      />
    </label>
  );
}
