// Crisp inline SVG icons (no icon-library dependency).
const I = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IconGrid = (p) => (
  <I {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>
);
export const IconRoute = (p) => (
  <I {...p}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19h7a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7h7" /></I>
);
export const IconTruck = (p) => (
  <I {...p}><path d="M1 8h13v9H1z" /><path d="M14 11h4l3 3v3h-7" /><circle cx="6" cy="19" r="1.8" /><circle cx="17" cy="19" r="1.8" /></I>
);
export const IconUser = (p) => (
  <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></I>
);
export const IconWrench = (p) => (
  <I {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.5 12l-2.5-2.5 2.7-3.2z" /></I>
);
export const IconWallet = (p) => (
  <I {...p}><rect x="2" y="6" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><circle cx="17" cy="15" r="1.3" fill="currentColor" stroke="none" /></I>
);
export const IconChart = (p) => (
  <I {...p}><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M8 16v-5M12 16V8M16 16v-3" /></I>
);
export const IconBell = (p) => (
  <I {...p}><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></I>
);
export const IconSearch = (p) => (
  <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></I>
);
export const IconPlus = (p) => (
  <I {...p}><path d="M12 5v14M5 12h14" /></I>
);
export const IconDownload = (p) => (
  <I {...p}><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></I>
);
export const IconLogout = (p) => (
  <I {...p}><path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" /><path d="M16 17l5-5-5-5M21 12H9" /></I>
);
export const IconMoon = (p) => (
  <I {...p}><path d="M21 13A8.5 8.5 0 1 1 11 3a7 7 0 0 0 10 10z" /></I>
);
export const IconSun = (p) => (
  <I {...p}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></I>
);
export const IconAlert = (p) => (
  <I {...p}><path d="M12 3 1.8 20.2h20.4L12 3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.4" r="0.4" fill="currentColor" /></I>
);
export const IconFuel = (p) => (
  <I {...p}><rect x="4" y="3" width="10" height="18" rx="1.5" /><path d="M4 9h10M14 12h2.5a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0V9.5L18 6" /></I>
);
export const IconCalendar = (p) => (
  <I {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></I>
);
export const IconTrend = (p) => (
  <I {...p}><path d="m3 16 6-6 4 4 8-8" /><path d="M15 6h6v6" /></I>
);
