import { useQuery } from '@tanstack/react-query';
import { feeRateQuery } from '../core/query/queries';
import { FEE_PERCENT } from '../core/money';

/**
 * esy's service fee in percent, as the admin has set it (2 for 0.02). The
 * screens that state the fee used to print a hard-coded 2% whatever the rate
 * was. `loading` is true until the rate is known; a screen where someone
 * agrees to the fee waits for it rather than showing the fallback.
 */
export default function useFeePercent() {
  const read = useQuery(feeRateQuery());
  const rate = read.data;
  const known = Number.isFinite(rate) && rate >= 0;
  return {
    percent: known ? Math.round(rate * 1000) / 10 : FEE_PERCENT,
    rate: known ? rate : FEE_PERCENT / 100,
    loading: !known && read.isPending,
  };
}
