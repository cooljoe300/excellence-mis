const PRINT_PAGE_STYLE_ID = 'timetable-print-page-style';

export function printTimetableDocument(title: string) {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  const previousOverflow = document.body.style.overflow;
  document.title = title;
  document.body.classList.add('print-timetable');
  document.body.style.overflow = 'visible';

  document.getElementById(PRINT_PAGE_STYLE_ID)?.remove();
  const pageStyle = document.createElement('style');
  pageStyle.id = PRINT_PAGE_STYLE_ID;
  pageStyle.textContent = '@page { size: A4 landscape; margin: 8mm 10mm; }';
  document.head.appendChild(pageStyle);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = originalTitle;
    document.body.classList.remove('print-timetable');
    document.body.style.overflow = previousOverflow;
    pageStyle.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}
