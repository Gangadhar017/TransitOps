import { useMemo, useState } from 'react';

// Client-side pagination matching the reference:
// "Showing 1 to 5 of 12 entries"  ‹ [1] 2 3 ›
export function usePager(items, perPage = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages);
  const slice = useMemo(() => items.slice((current - 1) * perPage, current * perPage), [items, current, perPage]);
  return { slice, page: current, pages, setPage, total: items.length, perPage };
}

export function Pager({ pager }) {
  const { page, pages, setPage, total, perPage, slice } = pager;
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1;
  const to = from + slice.length - 1;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && i > 3 && i < pages - 2 && Math.abs(i - page) > 1) {
      if (nums[nums.length - 1] !== '…') nums.push('…');
    } else nums.push(i);
  }
  return (
    <div className="pager">
      <span className="pager-info">Showing {from} to {to} of {total} entries</span>
      <div className="pager-btns">
        <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="pager-ellipsis">…</span>
          ) : (
            <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
          )
        )}
        <button className="page-btn" disabled={page === pages} onClick={() => setPage(page + 1)}>›</button>
      </div>
    </div>
  );
}
