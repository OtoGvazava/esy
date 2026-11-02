import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/shop-kit.css';

const pad = (n) => String(n).padStart(2, '0');
const parse = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return { year: m ? Number(m[1]) : '', month: m ? Number(m[2]) : '', day: m ? Number(m[3]) : '' };
};

const chevron = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;

// Birth-date picker: Day / Month / Year dropdowns, as the design draws them
// (B2, D2: the kit's select fields with a chevron, a third, two thirds and the
// rest of the row). Far easier than a native date input for a date decades
// back. Month names come from the locale (storefront.date.months) rather than
// Intl, which prints English ones in a browser without Georgian data. Emits an
// ISO `YYYY-MM-DD` string (or '' until all three are picked) so the backend
// contract is unchanged. Partial picks are held in local state — deriving the
// dropdowns from `value` alone would discard a year/month chosen before the
// others, so no single dropdown could ever "stick".
//
// Drawn with the kit's classes and carries its own .sk root, so it also draws
// on pages outside the shop kit (the sell flow's profile step); without it the
// selects fall back to the browser's and the chevrons grow to fill the row.
export default function DateOfBirthPicker({ value, onChange }) {
  const { t } = useTranslation('storefront');
  const [sel, setSel] = useState(() => parse(value));
  const { year, month, day } = sel;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => thisYear - i);
  const names = t('date.months', { returnObjects: true });
  const months = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, label: Array.isArray(names) ? names[i] : String(i + 1) }));
  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const emit = (y, mo, d) => {
    // Clamp the day to the chosen month (e.g. 31 → Feb) so it stays valid.
    const dd = y && mo && d ? Math.min(d, new Date(y, mo, 0).getDate()) : d;
    setSel({ year: y, month: mo, day: dd });
    onChange(y && mo && dd ? `${y}-${pad(mo)}-${pad(dd)}` : '');
  };

  const box = (filled) => ({ color: filled ? 'var(--k-fg)' : 'var(--k-dim)' });

  return (
    <div className="sk"><div className="row" style={{ gap: 10 }}>
      <span className="sel" style={{ flex: 1 }}>
        <select className="in" aria-label={t('dob.day')} value={day || ''} onChange={(e) => emit(year, month, Number(e.target.value))} style={box(!!day)}>
          <option value="">{t('dob.day')}</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {chevron}
      </span>
      <span className="sel" style={{ flex: 2 }}>
        <select className="in" aria-label={t('dob.month')} value={month || ''} onChange={(e) => emit(year, Number(e.target.value), day)} style={box(!!month)}>
          <option value="">{t('dob.month')}</option>
          {months.map((mo) => <option key={mo.n} value={mo.n}>{mo.label}</option>)}
        </select>
        {chevron}
      </span>
      <span className="sel" style={{ flex: 1.4 }}>
        <select className="in" aria-label={t('dob.year')} value={year || ''} onChange={(e) => emit(Number(e.target.value), month, day)} style={box(!!year)}>
          <option value="">{t('dob.year')}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {chevron}
      </span>
    </div></div>
  );
}
