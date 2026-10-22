"use client";

import { memo, useEffect, useMemo, useRef, useState, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

type ShiftType = "morning" | "afternoon" | "intershift" | "night" | "midnight" | "all_day" | "emergency" | "vacation" | "sick";
type TramRating = "mrdka" | "usla" | "topka";
type Page = "overview" | "shifts" | "events" | "stats" | "updates" | "settings" | "inbox" | "reviews";
type AuthSession = { user?: { email?: string | null } } | null;
type EventCategory = "sport" | "trip" | "party" | "food" | "family" | "school" | "other";

type Person = {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar: string;
  authId?: string | null;
  birthday?: string | null;
};

type Shift = {
  id: string;
  userId: string;
  date: string;
  endDate?: string | null;
  type: ShiftType;
  startTime: string;
  endTime: string;
  note: string | null;
  rating: number | null;
  ratingReason: string | null;
  ratedAt: string | null;
  tramNumber: string | null;
  tramRating: TramRating | null;
};

type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  description: string;
  participants: string[];
  createdBy?: string;
  category?: EventCategory;
};

type PracticeItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

type Lesson = { subject: string; room?: string };
type WeekSchedule = Record<string, Lesson[]>;

const APP_ACCENT = "#9a4f2c";
const APP_ACCENT_SECONDARY = "#c47a45";
const AUTUMN_ACCENT = "#ff7a00";
const AUTUMN_ACCENT_SECONDARY = "#ffd21f";
const APP_VERSION = "2.2";
const DAVID_AUTH_ID = "0989a80c-eaec-425b-a9e9-6ff0173c678d";
const TRAM_REVIEW_EMAILS = new Set(["matejuher15@gmail.com"]);
// ADMIN účet. ZMĚŇ na skutečný e-mail admina (stejný jako v admin-setup.sql a v Supabase Authentication).
// Pozor: tohle jen ukazuje/skrývá tlačítka. Skutečná práva hlídá databáze (funkce is_admin() v SQL).
const ADMIN_EMAILS = ["smenovnik@email.cz"];
const isAdminEmail = (email?: string | null) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
const TRAM_RATING_LABELS:Record<TramRating,string>={mrdka:"Mrdka",usla:"Ušla",topka:"Topka"};
const EVENT_CATEGORIES: Record<EventCategory, { label: string; emoji: string; color: string }> = {
  sport:  { label: "Sport",  emoji: "🏃", color: "#4ade80" },
  trip:   { label: "Výlet",  emoji: "🥾", color: "#38bdf8" },
  party:  { label: "Párty",  emoji: "🎉", color: "#f472b6" },
  food:   { label: "Jídlo",  emoji: "🍽️", color: "#fbbf24" },
  family: { label: "Rodina", emoji: "🕯️", color: "#fb923c" },
  school: { label: "Škola",  emoji: "📚", color: "#a78bfa" },
  other:  { label: "Jiné",   emoji: "📌", color: "#a8a29e" },
};
const UPDATE_ITEMS_20 = [
  "Nový podzimní vzhled Směnovníku s možností vrátit klasický motiv.",
  "Přidaná stránka Aktualizace a jednorázové okno s novinkami verze 2.0.",
  "Informace na Přehledu jsou nově v jednom přehledném panelu včetně dnešního svátku.",
  "Nejbližší směny jsou řazené skutečně podle data a času začátku.",
  "Davčův rozvrh má sudý školní týden a lichý týden s praxí Po–So.",
  "Říjen má speciální podzimní kalendář a při uložení směny může spadnout listí.",
  "Události lze rozkliknout do detailu a datum má nový vzhled.",
  "Statistiky se po otevření zobrazují primárně za aktuální týden.",
  "V Nastavení lze vypnout animace a přepnout podzimní/klasický motiv.",
] as const;

const UPDATE_ITEMS_21 = [
  "Nově lze vytisknout přehled směn podle vybraného měsíce, člověka a typu směny.",
  "Statistiky lze nově vytisknout nebo uložit jako PDF včetně přehledu odpracovaných hodin.",
  "U Tibíka, Kuby a Lucky se z každé odpracované směny automaticky odečítá 30 minut za pracovní přestávku.",
  "Pauzy se promítají do celkových hodin, průměru za týden, porovnání členů i tiskových souhrnů.",
  "Původní denní povzbuzení nahradily nové motivační citáty, které se každý den mění.",
  "Každý člen má nově vlastní sadu citátů a vidí povzbuzení připravené přímo pro sebe.",
  "U denního citátu se už nezobrazuje jméno člena ani autor — zůstává jen samotný citát.",
  "Proběhly také další drobné úpravy pro přesnější výpočty a přehlednější používání Směnovníku.",
] as const;

const UPDATE_ITEMS_22 = [
  "Nová Schránka: v horní liště jsou ikony Zpráv a Oznámení s červeným počítadlem nepřečtených.",
  "Zprávy můžeš posílat ostatním členům, vybrat více příjemců najednou nebo všechny a snadno odpovědět.",
  "Oznámení se vytváří automaticky: chybějící směny na dnešek a další 2 dny, zítřejší směna, narozeniny a události dnes či zítra.",
  "Důležitá oznámení jsou zvýrazněná, jde je hromadně označit jako přečtená a starší padají do sekce Proběhlé.",
  "Směny lze po skončení hodnotit 0–5 hvězdičkami i s důvodem. Hodnocení se otevře 5 minut po konci směny.",
  "Hodnocení směny stačí klepnout rovnou v oznámení; kdo chce, může ke hvězdičkám připsat vysvětlení.",
  "Po Směnovníku se prochází pixelová kočička: chvíli chodí, pak si sedne, kouká a mrká. Pokud ti vadí, vypni animace v Nastavení.",
  "Vedle zpráv je nová ikona hvězdy: stránka Recenze se všemi chybějícími hodnoceními směn a přehledem těch ohodnocených včetně průměru.",
  "U Matýska je navíc hodnocení tramvaje: číslo vozu a verdikt Mrdka, Ušla nebo Topka.",
  "Narozeniny: v Nastavení si uložíš datum narození, ostatní ho uvidí v kalendáři a v ten den se ukáže i věk.",
  "Události mají kategorie (Sport, Výlet, Párty, Jídlo, Rodina, Škola, Jiné) s filtrem, měsíčním členěním a sekcí Proběhlé.",
  "Události lze upravovat a nejbližší akce je zvýrazněná velkou kartou s odpočtem.",
  "Administrátor může upravovat jména a data narození členů a opravovat či mazat zprávy.",
  "Přibyly i drobné opravy a vylepšení pro plynulejší chod Směnovníku.",
] as const;

// Doplňková česká jména, která základní svátkové API nevrací.
const EXTRA_CZECH_NAME_DAYS: Record<string, string[]> = {
  "09-03": ["Bronislava"],
  "09-06": ["Boleslava"],
};

type ThemeMode = "autumn" | "halloween" | "classic";
type ThemePref = ThemeMode | "auto";

function autoThemeForDate(d = new Date()): ThemeMode {
  const m = d.getMonth();
  if (m === 10) return "halloween";
  return "autumn";
}

function halloweenLocked(d = new Date()) { return d.getMonth() < 10; }

const ThemeModeCtx = createContext<ThemeMode>("autumn");

const THEME_COLORS: Record<ThemeMode, { c1: string; c2: string }> = {
  autumn: { c1: AUTUMN_ACCENT, c2: AUTUMN_ACCENT_SECONDARY },
  halloween: { c1: "#ff7518", c2: "#9d4edd" },
  classic: { c1: "", c2: "" },
};

function themeBackground(mode: ThemeMode, c1: string, c2: string) {
  if (mode === "halloween") return {
    backgroundColor: "#07030b",
    backgroundImage: `radial-gradient(circle at 12% 6%, rgba(157,78,221,.16), transparent 28%),
      radial-gradient(circle at 88% 8%, rgba(255,117,24,.10), transparent 27%),
      radial-gradient(circle at 60% 80%, rgba(88,28,135,.14), transparent 36%),
      linear-gradient(160deg,#07030b 0%,#0e0716 30%,#140a1d 55%,#0a0510 80%,#050208 100%)`,
  };
  if (mode === "autumn") return {
    backgroundColor: "#080403",
    backgroundImage: `radial-gradient(circle at 12% 6%, rgba(255,145,47,.12), transparent 25%),
      radial-gradient(circle at 88% 8%, rgba(205,86,24,.10), transparent 27%),
      radial-gradient(circle at 62% 76%, rgba(132,47,16,.10), transparent 35%),
      linear-gradient(160deg,#0a0503 0%,#130905 24%,#1d0d06 48%,#120805 72%,#070403 100%)`,
  };
  return {
    backgroundColor: "#0b0908",
    backgroundImage: `radial-gradient(circle at 15% 10%, ${c1}18, transparent 32%), radial-gradient(circle at 85% 0%, ${c2}16, transparent 30%), linear-gradient(180deg,#050711 0%,#070a12 55%,#05070d 100%)`,
  };
}

const SEASON_TITLES: Record<string, string> = {
  "Podzimní přehled": "Halloweenský přehled",
  "Podzimní plány": "Halloweenské plány",
  "Podzimní statistiky": "Halloweenské statistiky",
  "Podzimní nastavení": "Halloweenské nastavení",
};
function seasonTitle(text: string, mode: ThemeMode) {
  if (mode === "halloween") return SEASON_TITLES[text] ?? text;
  return text;
}

const loginUsers = [
  { name: "Tibík", email: "08matytibi3115@gmail.com", color: "#c56b2d", avatar: "T" },
  { name: "Davča", email: "dkudlata9@gmail.com", color: "#8b6548", avatar: "K" },
  { name: "Matýsek", email: "matejuher15@gmail.com", color: "#6f8f72", avatar: "M" },
  { name: "Kuba", email: "jakub.proch145@seznam.cz", color: "#b84a3a", avatar: "K" },
  { name: "Cukr mamča", email: "lucieannapilarova97@gmail.com", color: "#facc15", avatar: "L" },
  { name: "Admin", email: ADMIN_EMAILS[0], color: "#64748b", avatar: "A" },
] as const;

const shiftInfo: Record<ShiftType, { label: string; short: string; color: string; icon: string }> = {
  morning: { label: "Ranní směna", short: "Ranní", color: "#fde047", icon: "sun" },
  afternoon: { label: "Odpolední směna", short: "Odpolední", color: "#fb7185", icon: "sunset" },
  intershift: { label: "Mezisměna", short: "Mezisměna", color: "#5eead4", icon: "clock" },
  night: { label: "Noční směna", short: "Noční", color: "#c084fc", icon: "moon" },
  midnight: { label: "Polonoc směna", short: "Polonoc", color: "#e879f9", icon: "moon" },
  all_day: { label: "Celodenní směna", short: "Celodenní", color: "#34d399", icon: "clock" },
  emergency: { label: "Mimořádná směna", short: "Mimořádná", color: "#f43f5e", icon: "alert" },
  vacation: { label: "Dovolená", short: "Dovolená", color: "#a3e635", icon: "plane" },
  sick: { label: "Nemoc", short: "Nemoc", color: "#a8a29e", icon: "heart" },
};


const SCHOOL_PERIODS = [
  { number: 0, start: "07:00", end: "07:45" },
  { number: 1, start: "07:50", end: "08:35" },
  { number: 2, start: "08:40", end: "09:25" },
  { number: 3, start: "09:40", end: "10:25" },
  { number: 4, start: "10:35", end: "11:20" },
  { number: 5, start: "11:25", end: "12:10" },
  { number: 6, start: "12:25", end: "13:10" },
  { number: 7, start: "13:15", end: "14:00" },
] as const;

const SUBJECT_SHORT: Record<string, string> = {
  "Anglický jazyk": "AJ",
  "Tělesná výchova": "TV",
  "Ekonomika": "EKO",
  "Český jazyk a literatura": "ČJ",
  "Technologie": "TECH",
  "Stolničení": "STO",
  "Základy přírodních věd": "ZPV",
  "Matematika": "MAT",
  "Základy společenských věd": "ZSV",
  "Informatika": "INF",
  "Německý jazyk": "NJ",
  "Potraviny a výživa": "PV",
  "Třídnická hodina": "TH",
  "—": "—",
};

function shortSubject(subject: string) {
  return SUBJECT_SHORT[subject] ?? subject;
}

const blank8 = (): Lesson[] => Array.from({ length: 8 }, () => ({ subject: "—" }));
const makeWeek = (): WeekSchedule => ({ Po: blank8(), Út: blank8(), St: blank8(), Čt: blank8(), Pá: blank8() });

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, ReactNode> = {
    home: <svg {...common}><path d="M3 10.5 12 3l9 7.5v9A1.5 1.5 0 0 1 19.5 21h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z" /></svg>,
    calendar: <svg {...common}><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9h18"/></svg>,
    event: <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M7 11h10M7 15h6"/></svg>,
    chart: <svg {...common}><path d="M4 19V5M4 19h16M7 15l3-4 3 2 5-7"/></svg>,
    settings: <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.3 3h-4L9.8 6a8 8 0 0 0-1.7 1L5.6 6 3.6 9.4l2 1.6a7 7 0 0 0 0 2L3.6 14.6l2 3.4 2.5-1a8 8 0 0 0 1.7 1l.5 3h4l.4-3a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></svg>,
    logout: <svg {...common}><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H9"/></svg>,
    plus: <svg {...common}><path d="M12 5v14M5 12h14"/></svg>,
    left: <svg {...common}><path d="m15 18-6-6 6-6"/></svg>,
    right: <svg {...common}><path d="m9 18 6-6-6-6"/></svg>,
    users: <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 16a5 5 0 0 1 6 4"/></svg>,
    sun: <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
    sunset: <svg {...common}><path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 3v3M4.9 7.9l2.1 2.1M19.1 7.9 17 10"/></svg>,
    moon: <svg {...common}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>,
    plane: <svg {...common}><path d="M22 2 9.5 14.5M22 2l-8 20-4.5-7.5L2 10l20-8Z"/></svg>,
    heart: <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>,
    school: <svg {...common}><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12.3V17c3 2 7 2 10 0v-4.7M21 10v6"/></svg>,
    briefcase: <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18M10 12v2h4v-2"/></svg>,
    clock: <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    palette: <svg {...common}><path d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-11Z"/><circle cx="7.5" cy="10" r=".7" fill="currentColor"/><circle cx="10" cy="7" r=".7" fill="currentColor"/><circle cx="14" cy="7" r=".7" fill="currentColor"/></svg>,
    lock: <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>,
    camera: <svg {...common}><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3"/></svg>,
    alert: <svg {...common}><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/></svg>,
    info: <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
    update: <svg {...common}><path d="M20 6v6h-6"/><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/></svg>,
    leaf: <svg {...common}><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"/><path d="M5 20c3-5 7-8 12-11"/></svg>,
    check: <svg {...common}><path d="m5 12 4 4L19 6"/></svg>,
    mail: <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
    bell: <svg {...common}><path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
    star: <svg {...common}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>,
  };
  return <span style={{ width: size, height: size, display: "inline-flex", flexShrink: 0 }}>{icons[name] ?? icons.info}</span>;
}

function Avatar({ person, size = 42 }: { person: Person; size?: number }) {
  return <div className="flex items-center justify-center overflow-hidden rounded-full font-bold text-white" style={{ width: size, height: size, minWidth: size, background: `linear-gradient(135deg, ${person.color}, ${person.color}66)`, boxShadow: `0 8px 25px ${person.color}25` }}>
    {person.avatar?.startsWith("http") ? <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" /> : (person.avatar || person.name.charAt(0).toUpperCase())}
  </div>;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}
function monthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("cs-CZ", { month: "long" });
}
const CZ_MONTHS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const STATS_START = { year: 2026, month: 8 }; // září 2026 (měsíce jsou 0–11)

function getStatsMonths() {
  const now = new Date();
  const list: { key: string; year: number; month: number }[] = [];
  let y = STATS_START.year, m = STATS_START.month;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    list.push({ key: `${y}-${String(m + 1).padStart(2, "0")}`, year: y, month: m });
    m++; if (m > 11) { m = 0; y++; }
  }
  return list;
}

// Týdny (Po–Ne) daného měsíce; první a poslední týden jsou oříznuté hranicí měsíce
function getMonthWeeks(year: number, month: number) {
  const first = new Date(year, month, 1, 12);
  const last = new Date(year, month + 1, 0, 12);
  const firstISO = toLocalDate(first), lastISO = toLocalDate(last);
  const weeks: { start: string; end: string }[] = [];
  let cursor = startOfWeek(first);
  while (cursor <= last) {
    const s = toLocalDate(cursor), e = toLocalDate(addDays(cursor, 6));
    weeks.push({ start: s < firstISO ? firstISO : s, end: e > lastISO ? lastISO : e });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function currentStatsWeekStart() {
  const today = isoToday();
  const [y, m] = today.split("-").map(Number);
  return getMonthWeeks(y, m - 1).find(w => today >= w.start && today <= w.end)?.start ?? null;
}

function formatWeekRange(w: { start: string; end: string }) {
  const d = (iso: string) => Number(iso.slice(8));
  const mo = Number(w.end.slice(5, 7));
  return w.start === w.end ? `${d(w.end)}. ${mo}.` : `${d(w.start)}.–${d(w.end)}. ${mo}.`;
}

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function mondayOffset(year: number, month: number) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
function isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftRatingAvailableAt(shift: Shift) {
  if (shift.type === "vacation" || shift.type === "sick") return null;
  return new Date(shiftEndAt(shift).getTime() + 5 * 60 * 1000);
}

function shiftStartAt(shift: Shift) {
  return new Date(`${shift.date}T${shift.startTime || "00:00"}:00`);
}

function shiftEndAt(shift: Shift) {
  const start = shiftStartAt(shift);
  const end = new Date(`${shift.date}T${shift.endTime || "00:00"}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return end;
}


const BREAK_DEDUCTION_EMAILS = new Set([
  "08matytibi3115@gmail.com", // Tibík
  "jakub.proch145@seznam.cz", // Kuba
  "lucieannapilarova97@gmail.com", // Lucka / Cukr mamča
]);

function shiftWorkedMinutes(shift: Shift, person?: Person | null) {
  if (shift.type === "vacation" || shift.type === "sick") return 0;

  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) endMinutes += 1440;

  let worked = Math.max(0, endMinutes - startMinutes);
  if (person && BREAK_DEDUCTION_EMAILS.has(person.email.toLowerCase())) {
    worked = Math.max(0, worked - 30);
  }
  return worked;
}

function formatWorkedMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
}

function escapePrintHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPrintWindow(title: string, body: string, landscape = false) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) {
    alert("Prohlížeč zablokoval tiskové okno. Povol vyskakovací okna a zkus to znovu.");
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8"/>
<title>${escapePrintHtml(title)}</title>
<style>
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 11mm 10mm 13mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #17212b; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.4; background: #fff; }
  h1 { margin: 0 0 5px; font-size: 25px; letter-spacing: -.55px; font-weight: 800; }
  h2 { margin: 20px 0 8px; font-size: 14px; letter-spacing: -.2px; }
  .muted { color: #64748b; }
  .header { position: relative; border-bottom: 3px solid #e87524; padding: 0 0 12px 13px; margin-bottom: 14px; }
  .header:before { content: ""; position: absolute; left: 0; top: 2px; bottom: 12px; width: 4px; border-radius: 4px; background: #e87524; }
  .header .eyebrow { margin-bottom: 5px; color: #b45309; font-size: 8px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
  .header .doc-meta { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; color: #64748b; font-size: 9px; }
  .summary { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 7px; margin: 12px 0 17px; }
  .box { border: 1px solid #dbe2e8; border-radius: 7px; padding: 9px 10px; background: #fff; color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .45px; }
  .box strong { display: block; margin-top: 5px; color: #17212b; font-size: 16px; line-height: 1.2; letter-spacing: -.3px; text-transform: none; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: auto; }
  thead { display: table-header-group; }
  th, td { border-bottom: 1px solid #dbe2e8; padding: 7px 7px; vertical-align: top; text-align: left; }
  th { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #eef2f6; color: #334155; font-size: 8px; font-weight: 800; letter-spacing: .55px; text-transform: uppercase; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td { overflow-wrap: anywhere; }
  td:nth-child(1), td:nth-child(2), td:nth-child(4), td:nth-child(5) { white-space: nowrap; }
  td:last-child { min-width: 100px; }
  .badge { display: inline-block; border-radius: 4px; background: #fff4e8; border: 1px solid #f3c18f; color: #9a4b12; padding: 3px 6px; font-size: 8px; font-weight: 800; white-space: nowrap; }
  .bar-row { display: grid; grid-template-columns: 120px 1fr 80px; align-items: center; gap: 8px; margin: 7px 0; }
  .bar-track { height: 8px; border-radius: 99px; background: #e8edf2; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; background: #e87524; }
  .foot { margin-top: 16px; padding-top: 8px; border-top: 1px solid #dbe2e8; font-size: 8px; color: #64748b; }
  @media print { .no-print { display:none !important; } }
  @media screen { body { padding: 24px; max-width: 1400px; margin: 0 auto; } }
</style>
</head>
<body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),150)}<\/script></body>
</html>`);
  printWindow.document.close();
}

function czechCount(value: number, one: string, few: string, many: string) {
  return `${value} ${value === 1 ? one : value >= 2 && value <= 4 ? few : many}`;
}

function shiftTimeLabel(s: Shift) {
  if (s.type === "vacation" || s.type === "sick" || s.type === "all_day") {
    const endDate = s.endDate && s.endDate !== s.date ? s.endDate : null;
    return endDate ? `Celý den · do ${new Date(`${endDate}T12:00:00`).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}` : "Celý den";
  }
  return `${s.startTime} – ${s.endTime}`;
}

function dayHeading(iso: string, today: string) {
  const d = new Date(`${iso}T12:00:00`);
  const diff = Math.round((d.getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
  const base = d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
  if (diff === 0) return `Dnes · ${base}`;
  if (diff === 1) return `Zítra · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function dateCountdown(iso: string, today: string) {
  const diff = Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
  return diff <= 0 ? "Dnes" : diff === 1 ? "Zítra" : `Za ${czechCount(diff, "den", "dny", "dní")}`;
}

function shiftCountdown(shift: Shift, now: number | null) {
  if (now === null) return "Počítám…";
  const start = shiftStartAt(shift).getTime();
  if (now >= start) {
    if (now >= shiftEndAt(shift).getTime()) return "Směna skončila";
    return shift.type === "vacation" ? "Dovolená dnes" : shift.type === "sick" ? "Nemoc dnes" : "Směna právě probíhá";
  }
  let minutes = Math.ceil((start - now) / 60000);
  const days = Math.floor(minutes / 1440); minutes -= days * 1440;
  const hours = Math.floor(minutes / 60); minutes -= hours * 60;
  const parts:string[]=[];
  if(days)parts.push(czechCount(days,"den","dny","dní"));
  if(hours)parts.push(czechCount(hours,"hodinu","hodiny","hodin"));
  if(minutes)parts.push(czechCount(minutes,"minutu","minuty","minut"));
  return `Za ${parts.join(" ") || "méně než minutu"}`;
}

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function nearestOddWeekDays() {
  const base = startOfWeek(new Date());
  if (isoWeekNumber(base) % 2 === 0) base.setDate(base.getDate() + 7);
  return ["Po", "Út", "St", "Čt", "Pá", "So"].map((day, index) => ({ day, date: toLocalDate(addDays(base, index)) }));
}

type MessageItem = { id: string; senderId: string; subject: string; body: string; at: string; recipientIds: string[]; readAt: string | null };
type NotificationItem = { id: string; title: string; text: string; at: string; read: boolean; important: boolean; icon: string; showTime: boolean; shiftId?: string; test?: boolean; archived?: boolean };
type SeenAutoNotification = { item: Omit<NotificationItem, "read" | "archived">; seenDay: string };

function whenLabel(iso: string, showTime = true) {
  const d = new Date(iso);
  const sameDay = toLocalDate(d) === isoToday();
  if (!showTime) return sameDay ? "dnes" : `${d.getDate()}. ${d.getMonth() + 1}.`;
  const time = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `dnes ${time}` : `${d.getDate()}. ${d.getMonth() + 1}. ${time}`;
}

type InboxCtxValue = { unreadMessages: number; unreadNotifications: number; pendingReviews: number; openInbox: (tab: "all" | "message" | "notification") => void; openReviews: () => void };
const InboxCtx = createContext<InboxCtxValue>({ unreadMessages: 0, unreadNotifications: 0, pendingReviews: 0, openInbox: () => {}, openReviews: () => {} });

function HeaderActions() {
  const { unreadMessages, unreadNotifications, pendingReviews, openInbox, openReviews } = useContext(InboxCtx);
  const btn = "relative flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/15 bg-black/20 text-slate-300 transition hover:border-orange-300/40 hover:text-orange-200";
  const badge = (n: number) => n > 0 ? <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{n > 9 ? "9+" : n}</span> : null;
  return <div className="flex items-center gap-2">
    <button type="button" aria-label="Zprávy" title="Zprávy" onClick={() => openInbox("message")} className={btn}><Icon name="mail" size={19} />{badge(unreadMessages)}</button>
    <button type="button" aria-label="Recenze směn" title="Recenze směn" onClick={openReviews} className={btn}><Icon name="star" size={19} />{badge(pendingReviews)}</button>
    <button type="button" aria-label="Oznámení" title="Oznámení" onClick={() => openInbox("notification")} className={btn}><Icon name="bell" size={19} />{badge(unreadNotifications)}</button>
  </div>;
}

export default function Home() {
  const [session, setSession] = useState<AuthSession>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedLoginUser, setSelectedLoginUser] = useState<(typeof loginUsers)[number] | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activePage, setActivePage] = useState<Page>("overview");
  const [people, setPeople] = useState<Person[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [shiftFilter, setShiftFilter] = useState<ShiftType | "all">("all");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftDate, setShiftDate] = useState("");
  const [shiftEndDate, setShiftEndDate] = useState("");
  const [shiftType, setShiftType] = useState<ShiftType>("morning");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");
  const [note, setNote] = useState("");
  const [savingShift, setSavingShift] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [statsPersonId, setStatsPersonId] = useState<string | null>(null);
  const [statsView, setStatsView] = useState<"months" | "weeks">("weeks");
  const [statsMonthKey, setStatsMonthKey] = useState<string | null>(() => isoToday().slice(0, 7));
  const [statsWeekStart, setStatsWeekStart] = useState<string | null>(() => currentStatsWeekStart());
  const [tibiWeek, setTibiWeek] = useState<"odd" | "even">("odd");
  const [davidWeek, setDavidWeek] = useState<"odd" | "even">("even");
  const [tibiOdd] = useState<WeekSchedule>(() => ({
    Po: [{ subject: "—" }, { subject: "MAT" }, { subject: "ČJ" }, { subject: "ICT" }, { subject: "SAZ" }, { subject: "AJ" }, { subject: "AEI" }, { subject: "—" }],
    Út: [{ subject: "EK" }, { subject: "AEI" }, { subject: "MV" }, { subject: "AJ" }, { subject: "TV" }, { subject: "TV" }, { subject: "ČJ" }, { subject: "E" }],
    St: [{ subject: "—" }, { subject: "—" }, { subject: "EIM" }, { subject: "TEOV" }, { subject: "AJ" }, { subject: "SAZ" }, { subject: "ČJ / M" }, { subject: "M / ČJ" }],
    Čt: [{ subject: "—" }, { subject: "MV" }, { subject: "AJ" }, { subject: "M" }, { subject: "SAZ" }, { subject: "TEOV" }, { subject: "F" }, { subject: "—" }],
    Pá: [{ subject: "—" }, { subject: "ČJ" }, { subject: "M" }, { subject: "TEOV" }, { subject: "PŘES->" }, { subject: "PRAXE" }, { subject: "PRAXE" }, { subject: "PRAXE" }],
  }));
  const [tibiEven] = useState<WeekSchedule>(() => ({
    Po: [{ subject: "—" }, { subject: "AJ" }, { subject: "TEOV" }, { subject: "AEI" }, { subject: "F" }, { subject: "ICT" }, { subject: "ČJ" }, { subject: "M" }],
    Út: [{ subject: "—" }, { subject: "M" }, { subject: "SAZ" }, { subject: "ČJ" }, { subject: "TV" }, { subject: "TV" }, { subject: "AJ" }, { subject: "MV" }],
    St: [{ subject: "—" }, { subject: "E" }, { subject: "ČJ" }, { subject: "TEOV" }, { subject: "SAZ" }, { subject: "ČJ / M" }, { subject: "M / ČJ" }, { subject: "—" }],
    Čt: [{ subject: "—" }, { subject: "EIM" }, { subject: "EK" }, { subject: "MV" }, { subject: "SAZ" }, { subject: "AJ" }, { subject: "AEI" }, { subject: "—" }],
    Pá: [{ subject: "—" }, { subject: "M" }, { subject: "TEOV" }, { subject: "AJ" }, { subject: "PŘES->" }, { subject: "PRAXE" }, { subject: "PRAXE" }, { subject: "PRAXE" }],
  }));
  const [davidSchool] = useState<WeekSchedule>(() => ({
    Po: [
      { subject: "—" },
      { subject: "Anglický jazyk", room: "343" },
      { subject: "Tělesná výchova", room: "Tv" },
      { subject: "Tělesná výchova", room: "Tv" },
      { subject: "Ekonomika", room: "343" },
      { subject: "Český jazyk a literatura", room: "343" },
      { subject: "Technologie", room: "U2" },
      { subject: "Český jazyk a literatura", room: "343" },
    ],
    Út: [
      { subject: "—" },
      { subject: "Stolničení", room: "343" },
      { subject: "Základy přírodních věd", room: "343" },
      { subject: "Matematika", room: "343" },
      { subject: "Základy společenských věd", room: "343" },
      { subject: "Informatika", room: "409" },
      { subject: "Ekonomika", room: "343" },
      { subject: "—" },
    ],
    St: [
      { subject: "—" },
      { subject: "Německý jazyk", room: "343" },
      { subject: "Stolničení", room: "343" },
      { subject: "Anglický jazyk", room: "343" },
      { subject: "Základy přírodních věd", room: "343" },
      { subject: "Potraviny a výživa", room: "343" },
      { subject: "Informatika", room: "U3" },
      { subject: "—" },
    ],
    Čt: [
      { subject: "—" },
      { subject: "Český jazyk a literatura", room: "343" },
      { subject: "Anglický jazyk", room: "343" },
      { subject: "Stolničení", room: "343" },
      { subject: "Technologie", room: "343" },
      { subject: "Německý jazyk", room: "343" },
      { subject: "Potraviny a výživa", room: "343" },
      { subject: "Matematika", room: "343" },
    ],
    Pá: [
      { subject: "—" },
      { subject: "Anglický jazyk", room: "343" },
      { subject: "Český jazyk a literatura", room: "343" },
      { subject: "Základy společenských věd", room: "343" },
      { subject: "Anglický jazyk", room: "343" },
      { subject: "Stolničení", room: "343" },
      { subject: "Třídnická hodina", room: "343" },
      { subject: "—" },
    ],
  }));
  const [practice, setPractice] = useState<PracticeItem[]>([]);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [themeColor, setThemeColor] = useState(APP_ACCENT);
  const [themeColor2, setThemeColor2] = useState(APP_ACCENT_SECONDARY);
  const [themePref, setThemePref] = useState<ThemePref>("auto");
  const themeMode: ThemeMode = themePref === "auto" ? autoThemeForDate() : themePref === "halloween" && halloweenLocked() ? "autumn" : themePref;
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showUpdateIntro, setShowUpdateIntro] = useState(false);
  const [showShiftSuccess, setShowShiftSuccess] = useState(false);
  const [practicePresetDate, setPracticePresetDate] = useState("");
  const [nameDay, setNameDay] = useState<string>("");

  const currentPerson = useMemo(() => {
    const email = session?.user?.email;
    return email ? people.find(p => p.email.toLowerCase() === email.toLowerCase()) ?? null : null;
  }, [people, session]);

  const isAdmin = isAdminEmail(currentPerson?.email);
  // Členové, kteří pracují na směnách (admin účet se v kalendáři, statistikách ani u událostí neukazuje)
  const members = useMemo(() => people.filter(p => !isAdminEmail(p.email)), [people]);
  const [shiftOwnerId, setShiftOwnerId] = useState("");
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [dbNotifications, setDbNotifications] = useState<NotificationItem[]>([]);
  const [autoSeen, setAutoSeen] = useState<Record<string, SeenAutoNotification>>({});
  const [autoReadIds, setAutoReadIds] = useState<string[]>([]);
  const [inboxTab, setInboxTab] = useState<"all" | "message" | "notification">("message");
  const [inboxTick, setInboxTick] = useState(0);
  const [minuteTick, setMinuteTick] = useState(0);

  useEffect(() => { const i = setInterval(() => setMinuteTick(t => t + 1), 60000); return () => clearInterval(i); }, []);

  // Přesně o půlnoci (a při návratu na kartu) přepočítá motiv, takže "Automaticky" přepne podzim → Halloween 1. 11. ve 00:00.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const n = new Date();
      const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1);
      t = setTimeout(() => { setMinuteTick(x => x + 1); schedule(); }, next.getTime() - n.getTime());
    };
    schedule();
    const onVis = () => setMinuteTick(x => x + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    if (!currentPerson) { setAutoReadIds([]); return; }
    try { setAutoReadIds(JSON.parse(localStorage.getItem(`smenovnik-auto-read-${currentPerson.email}`) || "[]")); } catch { setAutoReadIds([]); }
  }, [currentPerson]);

  useEffect(() => {
    if (!session || !currentPerson) { setMessages([]); setDbNotifications([]); return; }
    let active = true;
    const load = async () => {
      const [msgRes, notRes] = await Promise.all([
        supabase.from("messages").select("id,sender_id,subject,body,created_at,message_recipients(user_id,read_at)").order("created_at", { ascending: false }).limit(200),
        supabase.from("notifications").select("id,kind,title,body,important,created_at,read_at").order("created_at", { ascending: false }).limit(200),
      ]);
      if (!active) return;
      if (msgRes.error) console.error("Chyba při načítání zpráv:", msgRes.error);
      else setMessages((msgRes.data ?? []).map((m: any) => {
        const recipients: { user_id: string; read_at: string | null }[] = m.message_recipients ?? [];
        return { id: m.id, senderId: m.sender_id, subject: m.subject, body: m.body, at: m.created_at, recipientIds: recipients.map(r => r.user_id), readAt: recipients.find(r => r.user_id === currentPerson.id)?.read_at ?? null } as MessageItem;
      }));
      if (notRes.error) console.error("Chyba při načítání oznámení:", notRes.error);
      else setDbNotifications((notRes.data ?? []).map((n: any) => ({ id: n.id, title: n.title, text: n.body, at: n.created_at, read: Boolean(n.read_at), important: Boolean(n.important), icon: n.kind === "shift" ? "calendar" : n.kind === "event" ? "event" : "bell", showTime: true } as NotificationItem)));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [session, currentPerson?.id, inboxTick]);

  // Automatická upozornění počítaná z dat, která už aplikace má
  const autoNotifications = useMemo<NotificationItem[]>(() => {
    if (!currentPerson) return [];
    const list: Omit<NotificationItem, "read">[] = [];
    const today = isoToday();
    const dayIso = (n: number) => toLocalDate(addDays(new Date(`${today}T12:00:00`), n));
    const tomorrow = dayIso(1);
    const nowMs = Date.now();
    const covers = (sh: Shift, iso: string) => sh.type === "vacation" ? iso >= sh.date && iso <= (sh.endDate || sh.date) : sh.date === iso;
    const at = `${today}T00:00:00`;

    // Důležité: já sám nemám zapsané směny na dnešek a další 2 dny (vidí jen dotyčný)
    if (shifts.length > 0 && !loadingShifts && !isAdmin) {
      const hasShift = [0, 1, 2].some(n => shifts.some(sh => sh.userId === currentPerson.id && covers(sh, dayIso(n))));
      if (!hasShift) {
        list.push({ id: `missing-${currentPerson.id}-${today}`, title: "Nemáš zapsané směny", text: "Na dnešek a další 2 dny nemáš zapsanou žádnou směnu. Doplň ji v kalendáři.", at, important: true, icon: "alert", showTime: false });
      }
    }

    // Narozeniny dnes / zítra
    for (const person of members) {
      if (!person.birthday) continue;
      const birthYear = Number(person.birthday.slice(0, 4));
      for (const n of [0, 1]) {
        const iso = dayIso(n);
        if (iso.slice(5) !== person.birthday.slice(5)) continue;
        const me = person.id === currentPerson.id;
        const age = birthYear ? Number(iso.slice(0, 4)) - birthYear : 0;
        list.push({ id: `bday-${person.id}-${iso}`, title: me ? (n === 0 ? "Všechno nejlepší! 🎉" : "Zítra máš narozeniny 🎂") : `${n === 0 ? "Dnes" : "Zítra"} má narozeniny ${person.name} 🎂`, text: age ? `${age}. narozeniny.` : "Nezapomeň pogratulovat.", at, important: false, icon: "heart", showTime: false });
      }
    }

    // Moje směny: připomenutí zítřka a výzva k hodnocení
    for (const sh of shifts) {
      if (sh.userId !== currentPerson.id) continue;
      if (sh.date === tomorrow && sh.type !== "vacation" && sh.type !== "sick") {
        list.push({ id: `tomorrow-${sh.id}`, title: "Zítra máš směnu", text: `${shiftInfo[sh.type].label}${sh.type === "all_day" ? "" : ` · ${sh.startTime}–${sh.endTime}`}.`, at, important: false, icon: shiftInfo[sh.type].icon, showTime: false });
      }
      const avail = shiftRatingAvailableAt(sh);
      if (sh.rating === null && avail && nowMs >= avail.getTime() && nowMs - avail.getTime() < 7 * 86400000) {
        list.push({ id: `rate-${sh.id}`, title: "Jak se ti dařilo na směně?", text: `${shiftInfo[sh.type].label} · ${formatDate(sh.date)}. Stačí jedno klepnutí na hvězdičky.`, at: avail.toISOString(), important: false, icon: "check", showTime: true, shiftId: sh.id });
      }
    }

    // Události, na které jsem pozvaný, dnes / zítra
    for (const ev of events) {
      if (!ev.participants.includes(currentPerson.id) || (ev.date !== today && ev.date !== tomorrow)) continue;
      list.push({ id: `event-${ev.id}-${ev.date}`, title: `${ev.date === today ? "Dnes" : "Zítra"}: ${ev.title}`, text: `${ev.time ? `v ${ev.time}` : "bez udaného času"}${ev.place ? ` · ${ev.place}` : ""}`, at, important: false, icon: "event", showTime: false });
    }

    // Zkušební oznámení jen pro Tibíka (zobrazí se jednou, nic se neukládá)
    if (currentPerson.email.toLowerCase() === "08matytibi3115@gmail.com" && !autoReadIds.includes("test-rate")) {
      list.push({ id: "test-rate", title: "Jak se ti dařilo na směně? (zkouška)", text: "Zkušební oznámení. Takhle bude vypadat hodnocení po skončení směny. Klepni na hvězdičky, nic se neuloží.", at: new Date().toISOString(), important: false, icon: "check", showTime: true, test: true });
    }

    return list.map(item => ({ ...item, read: autoReadIds.includes(item.id) }));
  }, [currentPerson, members, isAdmin, shifts, events, loadingShifts, autoReadIds, minuteTick]);

  // Archiv: automatická upozornění se počítají z dat a po půlnoci by zmizela, proto si je
  // pamatujeme v prohlížeči (pro každý e-mail zvlášť, max. 60 dní). Co přežije do dalšího dne, jde do archivu.
  useEffect(() => {
    if (!currentPerson) { setAutoSeen({}); return; }
    const key = `smenovnik-notif-seen-${currentPerson.email}`;
    let stored: Record<string, SeenAutoNotification> = {};
    try { stored = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { stored = {}; }
    const today = isoToday();
    let changed = false;
    for (const n of autoNotifications) {
      if (n.test || stored[n.id]) continue;
      const { read: _read, archived: _archived, ...item } = n;
      stored[n.id] = { item, seenDay: today };
      changed = true;
    }
    const cutoff = toLocalDate(addDays(new Date(`${today}T12:00:00`), -60));
    for (const id of Object.keys(stored)) {
      if (stored[id].seenDay < cutoff) { delete stored[id]; changed = true; }
    }
    if (changed) { try { localStorage.setItem(key, JSON.stringify(stored)); } catch {} }
    setAutoSeen(stored);
  }, [autoNotifications, currentPerson]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const today = isoToday();
    const liveIds = new Set(autoNotifications.map(n => n.id));
    const fromDb = dbNotifications.map(n => ({ ...n, archived: toLocalDate(new Date(n.at)) < today }));
    const live = autoNotifications.map(n => ({ ...n, archived: !n.test && (autoSeen[n.id]?.seenDay ?? today) < today }));
    const gone = Object.entries(autoSeen)
      .filter(([id, seen]) => !liveIds.has(id) && seen.seenDay < today)
      .map(([id, seen]) => ({ ...seen.item, read: autoReadIds.includes(id), archived: true }));
    return [...fromDb, ...live, ...gone];
  }, [dbNotifications, autoNotifications, autoSeen, autoReadIds, minuteTick]);

  const sendMessage = async (to: string[], subject: string, body: string) => {
    const { error } = await supabase.rpc("send_message", { p_subject: subject, p_body: body, p_recipients: to });
    if (error) { alert(`Zprávu se nepodařilo odeslat: ${error.message}`); return false; }
    setInboxTick(t => t + 1);
    return true;
  };
  // Admin: smazání a úprava jakékoli zprávy
  const deleteMessage = async (id: string) => {
    if (!isAdmin) return false;
    await supabase.from("message_recipients").delete().eq("message_id", id);
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { alert(`Zprávu se nepodařilo smazat: ${error.message}`); return false; }
    setMessages(prev => prev.filter(m => m.id !== id));
    return true;
  };
  const editMessage = async (id: string, subject: string, body: string) => {
    if (!isAdmin) return false;
    const { error } = await supabase.from("messages").update({ subject, body }).eq("id", id);
    if (error) { alert(`Zprávu se nepodařilo upravit: ${error.message}`); return false; }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, subject, body } : m));
    return true;
  };
  const markMessageRead = async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m));
    await supabase.rpc("mark_message_read", { p_message_id: id });
  };
  const markNotificationsRead = async (ids: string[]) => {
    const dbIds = ids.filter(id => dbNotifications.some(n => n.id === id));
    const autoIds = ids.filter(id => !dbIds.includes(id));
    if (dbIds.length > 0) {
      setDbNotifications(prev => prev.map(n => dbIds.includes(n.id) ? { ...n, read: true } : n));
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", dbIds);
    }
    if (autoIds.length > 0 && currentPerson) {
      setAutoReadIds(prev => {
        const next = [...new Set([...prev, ...autoIds])].slice(-300);
        try { localStorage.setItem(`smenovnik-auto-read-${currentPerson.email}`, JSON.stringify(next)); } catch {}
        return next;
      });
    }
  };

  // Moje odpracované směny, které ještě nemají hodnocení (hodnotit lze 5 minut po konci směny)
  const pendingReviews = useMemo(() => {
    if (!currentPerson) return 0;
    const nowMs = Date.now();
    return shifts.filter(sh => {
      if (sh.userId !== currentPerson.id || sh.rating !== null) return false;
      const avail = shiftRatingAvailableAt(sh);
      return avail !== null && nowMs >= avail.getTime();
    }).length;
  }, [shifts, currentPerson, minuteTick]);

  const inboxCtx: InboxCtxValue = {
    pendingReviews,
    openReviews: () => setActivePage("reviews"),
    unreadMessages: currentPerson ? messages.filter(m => m.recipientIds.includes(currentPerson.id) && !m.readAt).length : 0,
    unreadNotifications: notifications.filter(n => !n.read && !n.archived).length,
    openInbox: (tab) => { setInboxTab(tab); setActivePage("inbox"); },
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setPeople([]); return; }
    (async () => {
      const { data, error } = await supabase.from("users").select("id,name,email,color,avatar,auth_id,birthday").order("created_at", { ascending: true });
      if (error) { console.error(error); return; }
      const mapped: Person[] = (data ?? []).map(p => ({ id: p.id, name: p.name, email: p.email, color: loginUsers.find(u=>u.email===p.email)?.color || p.color || "#8b735e", avatar: p.avatar || p.name?.charAt(0)?.toUpperCase() || "?", authId: p.auth_id, birthday: p.birthday || null }));
      setPeople(mapped);
      setSelectedPerson(null);
    })();
  }, [session]);

  useEffect(() => {
    if (!session) { setShifts([]); return; }
    (async () => {
      setLoadingShifts(true);
      const { data, error } = await supabase.from("shifts").select("id,user_id,date,end_date,start_time,end_time,type,note,rating,rating_reason,rated_at,tram_number,tram_rating").order("date", { ascending: true });
      if (!error) setShifts((data ?? []).map(s => ({ id: s.id, userId: s.user_id, date: s.date, endDate: s.end_date || null, type: s.type as ShiftType, startTime: s.start_time?.slice(0,5) || "", endTime: s.end_time?.slice(0,5) || "", note: s.note, rating: s.rating ?? null, ratingReason: s.rating_reason || null, ratedAt: s.rated_at || null, tramNumber: s.tram_number || null, tramRating: (s.tram_rating as TramRating) || null })));
      else console.error(error);
      setLoadingShifts(false);
    })();
  }, [session]);

  useEffect(() => {
    if (!session) { setPractice([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("practices")
        .select("id,date,start_time,end_time,note")
        .order("date", { ascending: true });

      if (error) {
        console.error("Chyba při načítání praxí:", error);
        return;
      }

      setPractice((data ?? []).map(p => ({
        id: p.id,
        date: p.date,
        startTime: p.start_time?.slice(0,5) || "",
        endTime: p.end_time?.slice(0,5) || "",
        note: p.note || "",
      })));
    })();
  }, [session]);

  useEffect(() => {
    if (!session) {
      setEvents([]);
      return;
    }
    if (people.length === 0) return;

    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          created_by,
          title,
          event_date,
          event_time,
          location,
          description,
          category,
          event_participants (
            user_id
          )
        `)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Chyba při načítání událostí:", error);
        return;
      }

      const mapped: EventItem[] = (data ?? []).map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        time: e.event_time?.slice(0, 5) || "",
        place: e.location || "",
        description: e.description || "",
        createdBy: e.created_by,
        category: (e.category as EventCategory) || "other",
        participants: (e.event_participants ?? [])
          .map(participant => people.find(person => person.authId === participant.user_id)?.id)
          .filter((id): id is string => Boolean(id)),
      }));

      setEvents(mapped);
    })();
  }, [session, people.length]);

  useEffect(() => { const first = isAdmin ? members[0] : currentPerson; if (first && !statsPersonId) setStatsPersonId(first.id); }, [currentPerson, isAdmin, members, statsPersonId]);
  useEffect(() => {
    if (!currentPerson) return;
    const saved = localStorage.getItem(`shift-theme-${currentPerson.email}`);
    const saved2 = localStorage.getItem(`shift-theme2-${currentPerson.email}`);
    const savedPref = localStorage.getItem(`shift-theme-pref-${currentPerson.email}`) as ThemePref | null;
    const savedAnimations = localStorage.getItem(`shift-animations-${currentPerson.email}`);
    setThemeColor(saved || APP_ACCENT);
    setThemeColor2(saved2 || APP_ACCENT_SECONDARY);
    setThemePref(savedPref || "auto");
    setAnimationsEnabled(savedAnimations !== "off");
    setShowUpdateIntro(localStorage.getItem(`smenovnik-${APP_VERSION}-read-${currentPerson.email}`) !== "yes");
  }, [currentPerson]);

  useEffect(() => {
    if (!currentPerson) return;
    localStorage.setItem(`shift-theme-${currentPerson.email}`, themeColor);
    localStorage.setItem(`shift-theme2-${currentPerson.email}`, themeColor2);
    localStorage.setItem(`shift-theme-pref-${currentPerson.email}`, themePref);
    localStorage.setItem(`shift-animations-${currentPerson.email}`, animationsEnabled ? "on" : "off");
  }, [currentPerson, themeColor, themeColor2, themePref, animationsEnabled]);


  useEffect(() => {
    if (!showShiftSuccess) return;
    const timeout = setTimeout(() => setShowShiftSuccess(false), 2600);
    return () => clearTimeout(timeout);
  }, [showShiftSuccess]);

  useEffect(() => {
    let active = true;

    const loadNameDay = async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const monthDay = today.slice(5);

      try {
        const response = await fetch(`https://svatkyapi.cz/api/day/${today}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Svátek se nepodařilo načíst");

        const data = await response.json();
        const baseNames = String(data?.name || "")
          .split(/\s+a\s+|,/)
          .map((name: string) => name.trim())
          .filter(Boolean);
        const extraNames = EXTRA_CZECH_NAME_DAYS[monthDay] ?? [];
        const names = [...new Set([...baseNames, ...extraNames])];

        if (active) setNameDay(names.join(", "));
      } catch (error) {
        console.error("Chyba při načítání svátku:", error);
        if (active) setNameDay("");
      }
    };

    loadNameDay();
    const interval = setInterval(loadNameDay, 60 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const login = async () => {
    if (!selectedLoginUser || !loginPassword) return;
    setLoginLoading(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: selectedLoginUser.email, password: loginPassword });
    if (error) setLoginError("Nesprávné heslo. Zkus to znovu.");
    setLoginLoading(false);
  };
  const logout = async () => { await supabase.auth.signOut(); setSelectedLoginUser(null); setLoginPassword(""); setActivePage("overview"); setSelectedPerson(null); };

  const openAddShift = (date?: string) => {
    if (!currentPerson) return;
    const selectedDate = date || `${year}-${String(month+1).padStart(2,"0")}-01`;
    setShiftOwnerId(isAdmin ? (selectedPerson && members.some(m => m.id === selectedPerson.id) ? selectedPerson.id : members[0]?.id ?? "") : currentPerson.id);
    setEditingShift(null); setShiftDate(selectedDate); setShiftEndDate(selectedDate); setShiftType("morning"); setStartTime("06:00"); setEndTime("14:00"); setNote(""); setShowShiftModal(true);
  };
  const openEditShift = (shift: Shift) => {
    if (!currentPerson || (shift.userId !== currentPerson.id && !isAdmin)) return;
    setShiftOwnerId(shift.userId);
    setEditingShift(shift); setShiftDate(shift.date); setShiftEndDate(shift.endDate || shift.date); setShiftType(shift.type); setStartTime(shift.startTime); setEndTime(shift.endTime); setNote(shift.note || ""); setShowShiftModal(true);
  };
  const saveShift = async () => {
    if (!currentPerson || !shiftDate) return;
    const ownerId = isAdmin ? (editingShift?.userId ?? shiftOwnerId) : currentPerson.id;
    if (!ownerId) { alert("Vyber, komu se má směna zapsat."); return; }
    if (shiftType === "vacation" && (!shiftEndDate || shiftEndDate < shiftDate)) {
      alert("Datum konce dovolené musí být stejné nebo pozdější než datum začátku.");
      return;
    }

    setSavingShift(true);
    const isVacation = shiftType === "vacation";
    const payload = {
      user_id: ownerId,
      date: shiftDate,
      end_date: isVacation ? shiftEndDate : null,
      start_time: isVacation ? "00:00" : startTime,
      end_time: isVacation ? "23:59" : endTime,
      type: shiftType,
      note: note || null
    };
    const result = editingShift
      ? await supabase.from("shifts").update(payload).eq("id", editingShift.id).select().single()
      : await supabase.from("shifts").insert(payload).select().single();
    if (result.error) alert(result.error.message);
    else {
      const s = result.data;
      const mapped: Shift = { id: s.id, userId: s.user_id, date: s.date, endDate: s.end_date || null, type: s.type as ShiftType, startTime: s.start_time?.slice(0,5)||"", endTime: s.end_time?.slice(0,5)||"", note: s.note, rating: s.rating ?? editingShift?.rating ?? null, ratingReason: s.rating_reason || editingShift?.ratingReason || null, ratedAt: s.rated_at || editingShift?.ratedAt || null, tramNumber: s.tram_number || editingShift?.tramNumber || null, tramRating: (s.tram_rating as TramRating) || editingShift?.tramRating || null };
      setShifts(prev => [...prev.filter(x => x.id !== mapped.id), mapped].sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
      setShowShiftModal(false); setEditingShift(null); setShowShiftSuccess(true);
    }
    setSavingShift(false);
  };
  const deleteShift = async () => {
    if (!editingShift || !currentPerson || (editingShift.userId !== currentPerson.id && !isAdmin)) return;
    const { error } = await supabase.from("shifts").delete().eq("id", editingShift.id);
    if (error) alert(error.message); else { setShifts(prev=>prev.filter(s=>s.id!==editingShift.id)); setShowShiftModal(false); setEditingShift(null); }
  };

  const saveShiftRating = async (shift: Shift, rating: number, ratingReason: string, tramNumber: string, tramRating: TramRating | null) => {
    if (!currentPerson || (shift.userId !== currentPerson.id && !isAdmin)) return false;
    const availableAt = shiftRatingAvailableAt(shift);
    if (!availableAt || (!isAdmin && Date.now() < availableAt.getTime()) || rating < 0 || rating > 5) return false;

    const ratedAt = new Date().toISOString();
    const { error } = shift.userId === currentPerson.id
      ? await supabase.rpc("rate_own_shift", {
          p_shift_id: shift.id,
          p_rating: rating,
          p_reason: ratingReason.trim() || null,
          p_tram_number: tramNumber.trim() || null,
          p_tram_rating: tramRating,
        })
      // admin upravuje hodnocení někoho jiného přímo (povolují to admin politiky v databázi)
      : await supabase.from("shifts").update({
          rating,
          rating_reason: ratingReason.trim() || null,
          rated_at: ratedAt,
          tram_number: tramNumber.trim() || null,
          tram_rating: tramRating,
        }).eq("id", shift.id);

    if (error) {
      alert(`Hodnocení se nepodařilo uložit: ${error.message}`);
      return false;
    }

    setShifts(prev => prev.map(item => item.id === shift.id ? { ...item, rating, ratingReason: ratingReason.trim() || null, ratedAt, tramNumber: tramNumber.trim() || null, tramRating } : item));
    return true;
  };

  const savePractice = async (item: PracticeItem) => {
    if (!currentPerson || (currentPerson.email !== "dkudlata9@gmail.com" && !isAdmin)) return;

    const { data, error } = await supabase
      .from("practices")
      .insert({
        user_id: DAVID_AUTH_ID,
        date: item.date,
        start_time: item.startTime,
        end_time: item.endTime,
        note: item.note || "",
      })
      .select("id,date,start_time,end_time,note")
      .single();

    if (error) {
      alert(`Praxi se nepodařilo uložit: ${error.message}`);
      return;
    }

    const saved: PracticeItem = {
      id: data.id,
      date: data.date,
      startTime: data.start_time?.slice(0,5) || "",
      endTime: data.end_time?.slice(0,5) || "",
      note: data.note || "",
    };

    setPractice(prev => [...prev, saved].sort((a,b) => a.date.localeCompare(b.date)));
    setShowPracticeModal(false);
  };

  const deletePractice = async (id: string) => {
    if (!currentPerson || (currentPerson.email !== "dkudlata9@gmail.com" && !isAdmin)) return;

    const { error } = await supabase
      .from("practices")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Praxi se nepodařilo smazat: ${error.message}`);
      return;
    }

    setPractice(prev => prev.filter(p => p.id !== id));
  };

  const saveEvent = async (item: EventItem) => {
    if (!currentPerson?.authId) {
      alert("Nepodařilo se zjistit přihlášeného uživatele.");
      return;
    }

    // Admin: úprava existující události
    if (item.id) {
      if (!isAdmin) return;
      const { error: updError } = await supabase.from("events").update({
        title: item.title, event_date: item.date, event_time: item.time,
        location: item.place || null, description: item.description || null, category: item.category ?? "other",
      }).eq("id", item.id);
      if (updError) { alert(`Událost se nepodařilo upravit: ${updError.message}`); return; }
      const { error: delError } = await supabase.from("event_participants").delete().eq("event_id", item.id);
      if (delError) { alert(`Účastníky se nepodařilo upravit: ${delError.message}`); return; }
      const newParticipants = item.participants
        .map(personId => people.find(person => person.id === personId))
        .filter((person): person is Person => Boolean(person?.authId))
        .map(person => ({ event_id: item.id, user_id: person.authId! }));
      if (newParticipants.length > 0) {
        const { error: insError } = await supabase.from("event_participants").insert(newParticipants);
        if (insError) { alert(`Účastníky se nepodařilo uložit: ${insError.message}`); return; }
      }
      setEvents(prev => prev.map(e => e.id === item.id ? { ...e, title: item.title, date: item.date, time: item.time, place: item.place, description: item.description, participants: item.participants, category: item.category ?? "other" } : e).sort((a, b) => a.date.localeCompare(b.date)));
      setEditingEvent(null);
      setShowEventModal(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        created_by: currentPerson.authId,
        title: item.title,
        event_date: item.date,
        event_time: item.time,
        location: item.place || null,
        description: item.description || null,
        category: item.category ?? "other",
      })
      .select("id,created_by,title,event_date,event_time,location,description,category")
      .single();

    if (error) {
      alert(`Událost se nepodařilo vytvořit: ${error.message}`);
      return;
    }

    const participantsPayload = item.participants
      .map(personId => people.find(person => person.id === personId))
      .filter((person): person is Person => Boolean(person?.authId))
      .map(person => ({
        event_id: data.id,
        user_id: person.authId!,
      }));

    if (participantsPayload.length > 0) {
      const { error: participantsError } = await supabase
        .from("event_participants")
        .insert(participantsPayload);

      if (participantsError) {
        await supabase.from("events").delete().eq("id", data.id);
        alert(`Účastníky se nepodařilo uložit: ${participantsError.message}`);
        return;
      }
    }

    const saved: EventItem = {
      id: data.id,
      title: data.title,
      date: data.event_date,
      time: data.event_time?.slice(0, 5) || "",
      place: data.location || "",
      description: data.description || "",
      participants: item.participants,
      createdBy: data.created_by,
      category: (data.category as EventCategory) || "other",
    };

    setEvents(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
    setShowEventModal(false);
  };

  const deleteEvent = async (id: string) => {
    const event = events.find(item => item.id === id);
    if (!event || !currentPerson?.authId || (event.createdBy !== currentPerson.authId && !isAdmin)) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Událost se nepodařilo smazat: ${error.message}`);
      return;
    }

    setEvents(prev => prev.filter(item => item.id !== id));
  };

  const changeMonth = (dir: number) => { let m=month+dir,y=year; if(m<0){m=11;y--;} if(m>11){m=0;y++;} setMonth(m);setYear(y); };

  const statsPeriod = useMemo(() => {
    if (statsMonthKey === null) return null; // Celkem
    const [y, m] = statsMonthKey.split("-").map(Number);
    const week = statsWeekStart ? getMonthWeeks(y, m - 1).find(w => w.start === statsWeekStart) : null;
    if (week) return { start: week.start, end: week.end };
    return { start: `${statsMonthKey}-01`, end: toLocalDate(new Date(y, m, 0)) }; // celý měsíc
  }, [statsMonthKey, statsWeekStart]);

  const stats = useMemo(() => {
    const shiftsByUser = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const list = shiftsByUser.get(shift.userId);
      if (list) list.push(shift);
      else shiftsByUser.set(shift.userId, [shift]);
    }

    return members.map(person => {
      const allPersonShifts = shiftsByUser.get(person.id) ?? [];
      const counts:Record<ShiftType,number>={morning:0,afternoon:0,intershift:0,night:0,midnight:0,all_day:0,emergency:0,vacation:0,sick:0};
      let totalMinutes=0;
      let ratingTotal=0;
      let ratedShifts=0;
      let periodShiftCount=0;
      let firstDate:string|null=null;
      let lastDate:string|null=null;

      for (const shift of allPersonShifts) {
        if (!firstDate || shift.date < firstDate) firstDate = shift.date;
        if (!lastDate || shift.date > lastDate) lastDate = shift.date;
        if (statsPeriod && (shift.date < statsPeriod.start || shift.date > statsPeriod.end)) continue;

        periodShiftCount++;
        counts[shift.type]++;
        if (shift.rating !== null) { ratingTotal += shift.rating; ratedShifts++; }
        if (shift.type !== "vacation" && shift.type !== "sick") totalMinutes += shiftWorkedMinutes(shift, person);
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      let weeksCount: number = 1;
      if (statsPeriod) {
        const days = Math.round((new Date(`${statsPeriod.end}T12:00:00`).getTime() - new Date(`${statsPeriod.start}T12:00:00`).getTime()) / 86400000) + 1;
        weeksCount = Math.max(1, days / 7);
      }
      if (!statsPeriod && firstDate && lastDate) {
        const firstWeek = startOfWeek(new Date(`${firstDate}T12:00:00`));
        const lastWeek = startOfWeek(new Date(`${lastDate}T12:00:00`));
        weeksCount = Math.max(1, Math.round((lastWeek.getTime() - firstWeek.getTime()) / 604800000) + 1);
      }

      return {
        person,
        shifts: periodShiftCount,
        hours,
        minutes,
        totalMinutes,
        averageMinutesPerWeek: totalMinutes / weeksCount,
        ratingAverage:ratedShifts?ratingTotal/ratedShifts:null,
        ratedShifts,
        ...counts
      };
    });
  }, [members, shifts, statsPeriod]);

  if (authLoading) return <CenterMessage icon="calendar" text="Kontroluji přihlášení…" />;
  if (!session) return <LoginScreen selected={selectedLoginUser} setSelected={setSelectedLoginUser} password={loginPassword} setPassword={setLoginPassword} error={loginError} loading={loginLoading} onLogin={login} />;

  const tc = THEME_COLORS[themeMode];
  const activeThemeColor = themeMode === "classic" ? themeColor : tc.c1;
  const bg = themeBackground(themeMode, themeColor, themeColor2);
  const activeThemeColor2 = themeMode === "classic" ? themeColor2 : tc.c2;

  return <InboxCtx.Provider value={inboxCtx}><ThemeModeCtx.Provider value={themeMode}><main
    className={`min-h-screen text-white ${themeMode === "classic" ? "classic-theme" : "autumn-theme"} ${themeMode === "halloween" ? "halloween-theme" : ""}`}
    style={{
      "--theme": activeThemeColor,
      "--theme2": activeThemeColor2,
      backgroundColor: bg.backgroundColor,
      backgroundImage: bg.backgroundImage,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "cover",
      backgroundAttachment: "scroll",
    } as React.CSSProperties}
  >
    <style jsx global>{`
      .theme-primary { background: linear-gradient(135deg, var(--theme), var(--theme2)); box-shadow: 0 8px 24px color-mix(in srgb, var(--theme) 24%, transparent), 0 0 34px color-mix(in srgb, var(--theme2) 12%, transparent); }
      .theme-soft { background: color-mix(in srgb, var(--theme) 14%, transparent) !important; color: color-mix(in srgb, var(--theme) 64%, white) !important; border-color: color-mix(in srgb, var(--theme) 32%, transparent) !important; }
      .theme-text { color: color-mix(in srgb, var(--theme) 65%, white) !important; }
      .theme-ring { box-shadow: 0 0 42px color-mix(in srgb, var(--theme) 20%, transparent) !important; }
      .theme-border { border-color: color-mix(in srgb, var(--theme) 26%, transparent) !important; }
      .theme-glow { box-shadow: 0 0 35px color-mix(in srgb, var(--theme) 18%, transparent) !important; }
      .theme-dot { background: var(--theme) !important; box-shadow: 0 0 16px color-mix(in srgb, var(--theme) 70%, transparent); }
      @keyframes leafFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; } 15% { opacity: .9; } 100% { transform: translateY(105vh) rotate(520deg) translateX(80px); opacity: 0; } }
      @keyframes leafDrift { 0%,100% { transform: translate(0,0) rotate(-8deg); } 50% { transform: translate(18px,24px) rotate(18deg); } }
      @keyframes ambientLeafFall {
        0% { transform: translate3d(0,-14vh,0) rotate(0deg); opacity: 0; }
        8% { opacity: .55; }
        55% { transform: translate3d(42px,52vh,0) rotate(260deg); opacity: .42; }
        100% { transform: translate3d(-26px,112vh,0) rotate(620deg); opacity: 0; }
      }
      .leaf-fall { animation-name: leafFall; animation-timing-function: ease-in; animation-fill-mode: forwards; }
      .leaf-drift { animation: leafDrift 5s ease-in-out infinite; }
      .ambient-leaf { animation-name: ambientLeafFall; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform, opacity; }
      @media (max-width: 768px) { .ambient-leaf:nth-of-type(even) { display:none; } }
      @media (prefers-reduced-motion: reduce) { .ambient-leaf, .leaf-fall, .leaf-drift { animation:none !important; } }
      .app-card, .calendar-cell { contain: layout paint; }
      .classic-theme .autumn-only { display: none !important; }
      .autumn-theme { color-scheme: dark; }
      .autumn-theme > .autumn-decor { position: fixed !important; inset: 0 !important; z-index: 0 !important; }
      .autumn-theme::before {
        content:"";
        position:fixed;
        inset:0;
        pointer-events:none;
        z-index:0;
        background:
          radial-gradient(circle at 18% -6%,rgba(255,190,102,.13),transparent 34%),
          radial-gradient(circle at 82% 4%,rgba(255,112,28,.10),transparent 30%),
          linear-gradient(180deg,rgba(255,173,75,.025) 0%,rgba(0,0,0,.08) 48%,rgba(0,0,0,.28) 100%);
      }
      .autumn-theme > :not(.app-modal-overlay) { position:relative; z-index:1; }
      .autumn-theme > .app-modal-overlay { position:fixed !important; inset:0 !important; z-index:9999 !important; pointer-events:auto !important; }
      .autumn-theme .theme-primary { background: linear-gradient(135deg,#ff6a00 0%,#ff9a00 52%,#ffd21f 100%) !important; color:#170b00 !important; box-shadow: 0 10px 32px rgba(255,111,0,.34), 0 0 42px rgba(255,202,31,.18) !important; }
      .autumn-theme .theme-soft { background: linear-gradient(135deg,rgba(255,122,0,.18),rgba(255,210,31,.08)) !important; color:#ffd56a !important; border-color:rgba(255,151,37,.42) !important; }
      .autumn-theme .theme-text { color:#ffb347 !important; }
      .autumn-theme .theme-border { border-color:rgba(255,140,30,.34) !important; }
      .autumn-theme .app-sidebar { background: linear-gradient(180deg,rgba(35,17,5,.97),rgba(14,9,5,.98)) !important; border-right-color:rgba(255,132,20,.22) !important; box-shadow: 18px 0 60px rgba(72,27,0,.22) !important; }
      .autumn-theme .app-card { background: radial-gradient(circle at 90% 0%,rgba(255,139,28,.08),transparent 36%), linear-gradient(145deg,rgba(30,17,8,.97),rgba(12,10,7,.96)) !important; border-color:rgba(255,139,28,.16) !important; box-shadow: 0 18px 55px rgba(34,13,0,.25), inset 0 1px 0 rgba(255,200,100,.025) !important; }
      .autumn-theme .app-modal { background: radial-gradient(circle at 90% 0%,rgba(255,151,35,.12),transparent 30%), linear-gradient(145deg,#211207,#0e0b08) !important; border-color:rgba(255,146,35,.22) !important; }
      .autumn-theme input, .autumn-theme textarea { caret-color:#ff9a00; }
      .autumn-theme input:focus, .autumn-theme textarea:focus { border-color:rgba(255,157,48,.55) !important; box-shadow:0 0 0 3px rgba(255,122,0,.08) !important; }
      .autumn-theme .october-calendar { background: radial-gradient(circle at 12% 8%,rgba(255,173,42,.13),transparent 22%), radial-gradient(circle at 88% 16%,rgba(197,67,10,.16),transparent 25%), linear-gradient(160deg,rgba(38,20,8,.98),rgba(17,12,8,.98)) !important; border-color:rgba(255,139,28,.30) !important; box-shadow:0 24px 70px rgba(76,28,0,.32),0 0 50px rgba(255,126,0,.07) !important; }
      .autumn-theme .october-calendar .calendar-head { background:linear-gradient(90deg,rgba(255,102,0,.20),rgba(255,190,34,.11),rgba(117,38,4,.16)) !important; }
      .autumn-theme .october-calendar .calendar-weekdays { background:rgba(255,130,20,.05) !important; }
      .autumn-theme .october-calendar .calendar-cell { background:linear-gradient(145deg,rgba(255,139,28,.028),rgba(0,0,0,.05)); border-color:rgba(255,149,42,.09) !important; }
      .autumn-theme .october-calendar .calendar-cell:hover { background:linear-gradient(145deg,rgba(255,135,20,.11),rgba(255,204,52,.04)) !important; }
      .autumn-theme .october-calendar .calendar-empty { background:rgba(70,31,7,.13) !important; border-color:rgba(255,149,42,.07) !important; }
      .autumn-theme .autumn-neon-title { color:#ffc23a; text-shadow:0 0 22px rgba(255,135,0,.28); }
      .autumn-theme .autumn-leaf-accent { filter:drop-shadow(0 0 12px rgba(255,123,0,.35)); }
.halloween-theme .autumn-only:not(.season-title) { display: none !important; }

@keyframes hwBlink { 0%,100% { opacity: 1; } 8% { opacity: .2; } 14% { opacity: 1; } 46% { opacity: .9; } 52% { opacity: .12; } 58% { opacity: 1; } 80% { opacity: .65; } }
@keyframes hwBat { 0% { transform: translate3d(-12vw,0,0); } 25% { transform: translate3d(25vw,-30px,0); } 50% { transform: translate3d(55vw,20px,0); } 75% { transform: translate3d(85vw,-20px,0); } 100% { transform: translate3d(115vw,10px,0); } }
@keyframes hwGhost { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
@keyframes hwEyes { 0%,88%,100% { transform: scaleY(1); } 92% { transform: scaleY(.1); } }
.hw-win { animation: hwBlink 4s linear infinite; }
.hw-bat { position: absolute; left: 0; animation: hwBat 24s linear infinite; opacity: .8; }
.hw-ghost { animation: hwGhost 4s ease-in-out infinite; }
.hw-eyes { animation: hwEyes 5s infinite; transform-box: fill-box; transform-origin: center; }
.hw-skyline { position: absolute; left: 0; bottom: 0; width: 100%; height: 150px; opacity: .85; }
.hw-moon { position: absolute; right: 7%; top: 6%; width: 64px; height: 64px; border-radius: 50%; background: #f6efd9; box-shadow: 0 0 60px rgba(246,239,217,.35); opacity: .85; }
@media (prefers-reduced-motion: reduce) { .hw-win, .hw-bat, .hw-ghost, .hw-eyes { animation: none !important; } }

.halloween-theme::before { background: radial-gradient(circle at 18% -6%,rgba(157,78,221,.16),transparent 34%), radial-gradient(circle at 82% 4%,rgba(255,117,24,.10),transparent 30%), linear-gradient(180deg,rgba(157,78,221,.03) 0%,rgba(0,0,0,.10) 48%,rgba(0,0,0,.30) 100%); }
.halloween-theme .theme-primary { background: linear-gradient(135deg,#ff6a00 0%,#ff9a1f 100%) !important; color: #1a0a00 !important; box-shadow: 0 10px 32px rgba(255,117,24,.30), 0 0 38px rgba(157,78,221,.18) !important; }
.halloween-theme .theme-soft { background: linear-gradient(135deg,rgba(255,117,24,.18),rgba(157,78,221,.12)) !important; color: #ffb066 !important; border-color: rgba(255,117,24,.42) !important; }
.halloween-theme .theme-text { color: #ff9a3d !important; }
.halloween-theme .theme-border { border-color: rgba(157,78,221,.40) !important; }
.halloween-theme .app-sidebar { background: linear-gradient(180deg,rgba(26,13,38,.97),rgba(10,6,15,.98)) !important; border-right-color: rgba(157,78,221,.30) !important; box-shadow: 18px 0 60px rgba(60,20,90,.25) !important; }
.halloween-theme .app-card { background: radial-gradient(circle at 90% 0%,rgba(157,78,221,.12),transparent 36%), linear-gradient(145deg,rgba(26,15,34,.97),rgba(11,7,16,.96)) !important; border-color: rgba(157,78,221,.24) !important; box-shadow: 0 18px 55px rgba(30,8,50,.35) !important; }
.halloween-theme .app-modal { background: radial-gradient(circle at 90% 0%,rgba(157,78,221,.16),transparent 30%), linear-gradient(145deg,#1c0e28,#0b0710) !important; border-color: rgba(157,78,221,.32) !important; }
.halloween-theme input, .halloween-theme textarea { caret-color: #ff9a1f; }
.halloween-theme input:focus, .halloween-theme textarea:focus { border-color: rgba(255,154,31,.55) !important; box-shadow: 0 0 0 3px rgba(157,78,221,.14) !important; }
.halloween-theme .october-calendar { background: radial-gradient(circle at 12% 8%,rgba(157,78,221,.16),transparent 24%), radial-gradient(circle at 88% 16%,rgba(255,117,24,.12),transparent 25%), linear-gradient(160deg,rgba(28,14,40,.98),rgba(12,7,18,.98)) !important; border-color: rgba(157,78,221,.40) !important; box-shadow: 0 24px 70px rgba(50,15,80,.40) !important; }
.halloween-theme .october-calendar .calendar-head { background: linear-gradient(90deg,rgba(157,78,221,.25),rgba(255,117,24,.14),rgba(60,20,90,.20)) !important; }
.halloween-theme .october-calendar .calendar-weekdays { background: rgba(157,78,221,.07) !important; }
.halloween-theme .october-calendar .calendar-cell { background: linear-gradient(145deg,rgba(157,78,221,.04),rgba(0,0,0,.08)); border-color: rgba(157,78,221,.14) !important; }
.halloween-theme .october-calendar .calendar-cell:hover { background: linear-gradient(145deg,rgba(255,117,24,.12),rgba(157,78,221,.06)) !important; }
.halloween-theme .october-calendar .calendar-empty { background: rgba(40,16,60,.20) !important; border-color: rgba(157,78,221,.08) !important; }
.halloween-theme .autumn-neon-title { color: #ff9a3d; text-shadow: 0 0 22px rgba(255,117,24,.35); }
.halloween-theme .person-card { background: radial-gradient(circle at 90% 0%,rgba(157,78,221,.16),transparent 42%), linear-gradient(145deg,rgba(26,15,34,.97),rgba(11,7,16,.96)) !important; border-color: rgba(157,78,221,.38) !important; }
.halloween-theme .person-card:hover { border-color: rgba(255,117,24,.65) !important; box-shadow: 0 12px 36px rgba(255,117,24,.14); }
.halloween-theme .school-card { background: radial-gradient(circle at 92% 0%,rgba(157,78,221,.14),transparent 40%), linear-gradient(145deg,rgba(24,13,33,.97),rgba(10,6,15,.98)) !important; border-color: rgba(157,78,221,.34) !important; box-shadow: 0 18px 50px rgba(30,8,50,.35) !important; }
.halloween-theme .school-head { background: linear-gradient(90deg,rgba(157,78,221,.20),rgba(255,117,24,.08)) !important; border-color: rgba(157,78,221,.28) !important; }
.halloween-theme .school-plain { background: linear-gradient(145deg,rgba(44,24,62,.9),rgba(20,11,28,.94)) !important; border-color: rgba(157,78,221,.36) !important; }
.halloween-theme .school-plain:hover { border-color: rgba(255,117,24,.55) !important; }

    `}</style>
    {themeMode === "autumn" && <AutumnDecor animations={animationsEnabled} />}
    {themeMode === "halloween" && <HalloweenDecor animations={animationsEnabled} />}
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentPerson={currentPerson} onLogout={logout} />
      <section className="w-full lg:ml-[252px]">
        <div className="w-full px-4 pb-28 pt-24 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:pb-16 lg:pt-10">
          {activePage === "overview" && <Overview people={members} shifts={shifts} currentPerson={currentPerson} events={events} nameDay={nameDay} openAddShift={openAddShift} tibiWeek={tibiWeek} setTibiWeek={setTibiWeek} tibiOdd={tibiOdd} tibiEven={tibiEven} davidSchool={davidSchool} davidWeek={davidWeek} setDavidWeek={setDavidWeek} practice={practice} openPractice={(date)=>{setPracticePresetDate(date||"");setShowPracticeModal(true);}} deletePractice={deletePractice} /> }
          {activePage === "shifts" && <ShiftsPage people={members} shifts={shifts} currentPerson={currentPerson} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} month={month} year={year} changeMonth={changeMonth} goToToday={()=>{const n=new Date();setMonth(n.getMonth());setYear(n.getFullYear());}} filter={shiftFilter} setFilter={setShiftFilter} openAddShift={openAddShift} openEditShift={openEditShift} saveShiftRating={saveShiftRating} loading={loadingShifts} autumn={themeMode === "autumn"} /> }
          {activePage === "events" && <EventsPage events={events} people={members} currentPerson={currentPerson} openCreate={()=>{setEditingEvent(null);setShowEventModal(true);}} deleteEvent={deleteEvent} onEditEvent={(e:EventItem)=>{setEditingEvent(e);setShowEventModal(true);}} />}
          {activePage === "updates" && <UpdatesPage />}
          {activePage === "inbox" && <InboxPage messages={messages} notifications={notifications} people={people} currentPerson={currentPerson} tab={inboxTab} shifts={shifts} onRateShift={saveShiftRating} onSend={sendMessage} onMarkMessageRead={markMessageRead} onMarkNotificationsRead={markNotificationsRead} isAdmin={isAdmin} onDeleteMessage={deleteMessage} onEditMessage={editMessage} />}
          {activePage === "reviews" && <ReviewsPage shifts={shifts} people={people} currentPerson={currentPerson} onRateShift={saveShiftRating} />}
          {activePage === "stats" && <StatsPage stats={stats} selectedId={statsPersonId} setSelectedId={setStatsPersonId} statsView={statsView} setStatsView={setStatsView} statsMonthKey={statsMonthKey} setStatsMonthKey={setStatsMonthKey} statsWeekStart={statsWeekStart} setStatsWeekStart={setStatsWeekStart} statsPeriod={statsPeriod} />}
          {activePage === "settings" && <SettingsPage members={members} currentPerson={currentPerson} setPeople={setPeople} themeColor={themeColor} setThemeColor={setThemeColor} themeColor2={themeColor2} setThemeColor2={setThemeColor2} themeMode={themePref} setThemeMode={setThemePref} animationsEnabled={animationsEnabled} setAnimationsEnabled={setAnimationsEnabled} /> }
        </div>
      </section>
    </div>

    {showShiftModal && currentPerson && <ShiftModal person={people.find(p => p.id === (editingShift?.userId ?? shiftOwnerId)) ?? currentPerson} owners={isAdmin ? members : undefined} ownerId={shiftOwnerId} setOwnerId={setShiftOwnerId} editing={editingShift} date={shiftDate} setDate={setShiftDate} endDate={shiftEndDate} setEndDate={setShiftEndDate} type={shiftType} setType={setShiftType} start={startTime} setStart={setStartTime} end={endTime} setEnd={setEndTime} note={note} setNote={setNote} saving={savingShift} onClose={()=>setShowShiftModal(false)} onSave={saveShift} onDelete={deleteShift} />}
    {showEventModal && <EventModal people={members} initial={editingEvent} onClose={()=>{setShowEventModal(false);setEditingEvent(null);}} onSave={saveEvent} />}
    {showPracticeModal && (currentPerson?.email === "dkudlata9@gmail.com" || isAdmin) && <PracticeModal initialDate={practicePresetDate} onClose={()=>setShowPracticeModal(false)} onSave={savePractice} />}
    <WalkingCat enabled={animationsEnabled && !!currentPerson} animal={pixelAnimalFor(currentPerson?.email)} />
    {showUpdateIntro && currentPerson && <UpdateIntroModal onDone={()=>{localStorage.setItem(`smenovnik-${APP_VERSION}-read-${currentPerson.email}`, "yes");setShowUpdateIntro(false);}} />}
    {showShiftSuccess && <ShiftSavedToast animations={animationsEnabled} />}
  </main></ThemeModeCtx.Provider></InboxCtx.Provider>;
}

function CenterMessage({ icon, text }: { icon: string; text: string }) { return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0806] text-white"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(176,91,38,.14),transparent_36%)]"/><div className="pointer-events-none absolute right-[12%] top-[12%] text-6xl opacity-[0.08]">🍁</div><div className="relative text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] text-orange-200 shadow-[0_0_40px_rgba(177,82,24,.18)]"><Icon name={icon} size={28}/></div><p className="text-sm text-stone-400">{text}</p></div></div>; }

function LoginScreen({ selected, setSelected, password, setPassword, error, loading, onLogin }: { selected: (typeof loginUsers)[number] | null; setSelected: (u:(typeof loginUsers)[number] | null)=>void; password:string; setPassword:(v:string)=>void; error:string; loading:boolean; onLogin:()=>void; }) {
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0806] px-5 text-white">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_30%,rgba(193,88,24,.16),transparent_31%),radial-gradient(circle_at_78%_24%,rgba(143,73,42,.13),transparent_30%),linear-gradient(160deg,#080706_0%,#120b07_52%,#080706_100%)]"/>
    <div className="pointer-events-none absolute -left-20 bottom-[-80px] h-[340px] w-[340px] rounded-full bg-orange-900/[0.12] blur-[120px]"/>
    <div className="pointer-events-none absolute right-[-70px] top-[-80px] h-[360px] w-[360px] rounded-full bg-amber-800/[0.10] blur-[120px]"/>
    <div className="pointer-events-none absolute left-[8%] top-[12%] rotate-[-18deg] text-7xl opacity-[0.07]">🍂</div>
    <div className="pointer-events-none absolute right-[10%] top-[17%] rotate-[15deg] text-8xl opacity-[0.08]">🍁</div>
    <div className="pointer-events-none absolute bottom-[8%] left-[18%] rotate-[18deg] text-6xl opacity-[0.05]">🍁</div>
    <div className="relative z-10 w-full max-w-[920px]">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-orange-300/20 bg-[linear-gradient(145deg,rgba(126,60,29,.70),rgba(54,31,20,.75))] text-orange-100 shadow-[0_18px_45px_rgba(88,39,13,.30),0_0_35px_rgba(198,94,28,.12)]"><Icon name="calendar" size={31}/></div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[.28em] text-orange-300/65">Směnovník 2.1</div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Kdo jsi?</h1>
        <p className="mt-2 text-sm text-stone-500">Vyber svůj účet a přihlas se</p>
      </div>
      {!selected ? <><div className="flex flex-wrap justify-center gap-3">{loginUsers.filter(u=>!isAdminEmail(u.email)).map((u,index)=><button key={u.email} onClick={()=>setSelected(u)} className="group relative w-[calc(50%-6px)] overflow-hidden rounded-3xl sm:w-[calc(33.333%-8px)] xl:w-[calc(20%-10px)] border border-orange-200/[0.10] bg-[linear-gradient(145deg,rgba(31,24,19,.84),rgba(13,12,10,.90))] p-5 text-left shadow-[0_18px_45px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/25 hover:bg-[linear-gradient(145deg,rgba(48,31,20,.92),rgba(18,14,11,.94))] hover:shadow-[0_20px_50px_rgba(86,38,11,.22)]">
        <div className="pointer-events-none absolute -right-8 -top-8 text-5xl opacity-0 transition group-hover:opacity-[0.07]">{index%2?"🍂":"🍁"}</div>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] font-black text-white shadow-[0_10px_24px_rgba(0,0,0,.22)]" style={{background:`linear-gradient(145deg,${u.color}dd,${u.color}88)`}}>{u.avatar}</div>
        <div className="font-bold text-stone-100">{u.name}</div>
        <div className="mt-1 text-xs text-stone-600 transition group-hover:text-orange-200/60">Přihlásit se</div>
      </button>)}</div>
        <div className="mt-8 flex justify-center">{loginUsers.filter(u=>isAdminEmail(u.email)).map(u=><button key={u.email} onClick={()=>setSelected(u)} className="flex items-center gap-2 rounded-full border border-white/[0.07] px-4 py-2 text-xs text-stone-600 transition hover:border-orange-300/25 hover:text-orange-200/80"><Icon name="lock" size={13}/>Přihlášení správce</button>)}</div></>
      : <div className="mx-auto max-w-[420px] rounded-[30px] border border-orange-200/[0.12] bg-[linear-gradient(145deg,rgba(31,23,18,.95),rgba(13,11,9,.97))] p-7 shadow-[0_30px_80px_rgba(0,0,0,.42),0_0_45px_rgba(112,48,14,.12)]">
        <div className="mb-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] font-bold text-white" style={{background:`linear-gradient(145deg,${selected.color}dd,${selected.color}88)`}}>{selected.avatar}</div><div><div className="font-bold">{selected.name}</div><div className="text-xs text-stone-500">{selected.email}</div></div></div>
        <label className="mb-2 block text-xs text-stone-400">Heslo</label>
        <input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")onLogin();}} className="w-full rounded-2xl border border-orange-200/[0.10] bg-black/25 px-4 py-3.5 text-sm outline-none transition focus:border-orange-300/40 focus:ring-2 focus:ring-orange-500/10" placeholder="Zadej heslo"/>
        {error&&<div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">{error}</div>}
        <button onClick={onLogin} disabled={loading||!password} className="mt-5 w-full rounded-2xl border border-orange-200/20 bg-[linear-gradient(135deg,#9a4f2c,#c06b35)] py-3.5 text-sm font-black text-[#fff6ee] shadow-[0_12px_30px_rgba(119,49,17,.30)] transition hover:brightness-110 disabled:opacity-50">{loading?"Přihlašuji…":"Přihlásit se"}</button>
        <button onClick={()=>{setSelected(null);setPassword("");}} className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-xs text-stone-500 hover:text-orange-100"><Icon name="left" size={14}/> Změnit uživatele</button>
      </div>}
    </div>
  </div>;
}

function Sidebar({ activePage, setActivePage, currentPerson, onLogout }: { activePage:Page; setActivePage:(p:Page)=>void; currentPerson:Person|null; onLogout:()=>void; }) {
  const items: {page:Page;icon:string;label:string}[] = [
    {page:"overview",icon:"home",label:"Přehled"},
    {page:"shifts",icon:"calendar",label:"Směny"},
    {page:"events",icon:"event",label:"Události"},
    {page:"stats",icon:"chart",label:"Statistiky"},
    {page:"updates",icon:"update",label:"Aktualizace"},
    {page:"settings",icon:"settings",label:"Nastavení"},
  ];
  return <><aside className="app-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[252px] border-r border-white/[0.07] bg-[#0e0b08]/90 px-5 py-6 shadow-[20px_0_60px_rgba(0,0,0,.18)] backdrop-blur-md lg:flex lg:flex-col"><div className="mb-9 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border theme-soft theme-ring"><Icon name="calendar" size={24}/></div><div><div className="text-[15px] font-black tracking-tight">Směnovník <span className="text-[10px] theme-text">v{APP_VERSION}</span></div><div className="text-[11px] text-slate-500">směny, škola & společný čas</div></div></div><nav className="space-y-1.5">{items.map(i=><button key={i.page} onClick={()=>setActivePage(i.page)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${activePage===i.page?"border theme-soft":"border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-white"}`}><Icon name={i.icon} size={19}/>{i.label}{i.page==="updates"&&<span className="ml-auto rounded-full bg-orange-400/15 px-2 py-0.5 text-[9px] font-bold text-orange-300">{APP_VERSION}</span>}</button>)}</nav><div className="mt-auto">{currentPerson&&<div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex items-center gap-3"><Avatar person={currentPerson} size={38}/><div><div className="text-sm font-semibold">{currentPerson.name}</div><div className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{isAdminEmail(currentPerson.email)?"Administrátor":"Přihlášen"}</div></div></div></div>}<button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"><Icon name="logout" size={19}/>Odhlásit se</button></div></aside><div className="app-sidebar fixed left-0 right-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#0e0b08]/90 px-4 backdrop-blur-md lg:hidden"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border theme-soft"><Icon name="calendar" size={20}/></div><span className="font-black">Směnovník</span></div><div className="flex items-center gap-1"><HeaderActions /><button onClick={onLogout} className="rounded-xl p-2 text-slate-400 hover:text-red-400"><Icon name="logout"/></button></div></div><nav className="app-sidebar fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-white/[0.07] bg-[#0e0b08]/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">{items.map(i=><button key={`mobile-${i.page}`} onClick={()=>setActivePage(i.page)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[8px] font-semibold transition ${activePage===i.page?"theme-soft":"text-slate-500"}`}><Icon name={i.icon} size={17}/><span className="max-w-full truncate">{i.label}</span></button>)}</nav></>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
    <div>
      <div className="mb-2 inline-flex rounded-full border theme-soft px-2.5 py-1 text-[9px] font-bold tracking-[.22em]">{eyebrow}</div>
      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="hidden lg:block"><HeaderActions /></div>
      {action}
    </div>
  </div>;
}
function Card({children,className=""}:{children:ReactNode;className?:string}){return <div className={`app-card rounded-3xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(31,24,19,.96),rgba(14,12,10,.94))] shadow-[0_18px_50px_rgba(0,0,0,.22)] ${className}`}>{children}</div>}

function dailyBoost(person: Person | null) {
  const quotesByPerson: Record<string, string[]> = {
    "Tibík": [
      "Každá směna, kterou odvedeš dobře, je cihla do toho, co si právě stavíš.",
      "Nemusíš být dnes dokonalý, stačí být lepší než včera.",
      "Malé kroky každý den jsou tišší než velké skoky, ale dojdou dál.",
      "Disciplína je láska k tomu, kým chceš být.",
      "Když se ti nechce, je to nejlepší chvíle dokázat si, že to zvládneš.",
      "Učení je práce, ze které nejde vzít dovolenou, ale vyplatí se nejvíc.",
      "Klid a pravidelnost porazí nadšení na jeden den.",
      "Dnešek je jediný čas, který opravdu můžeš ovlivnit, tak ho nepromarni.",
    ],
    "Davča": [
      "Dobrý řemeslník se pozná podle detailů, kterých si nikdo nevšimne.",
      "Každá hodina ve škole i na praxi je investice, která se ti jednou vrátí.",
      "Zkušenosti se nekupují, sbírají se den po dni.",
      "Chyba není konec světa, je to lekce, za kterou jsi nemusel platit.",
      "Slušné chování a úsměv otevřou víc dveří než jakýkoli diplom.",
      "Kdo to s prací myslí vážně, nehledá zkratky, ale lepší způsoby.",
      "Trpělivost si trénuješ pokaždé, když to chceš vzdát a neuděláš to.",
      "Být spolehlivý je dnes vzácnější než být talentovaný.",
    ],
    "Matýsek": [
      "Odvaha neznamená nebát se, ale udělat to i se strachem.",
      "Nejlepší plán je ten, který začneš dělat ještě dnes.",
      "Zvědavost tě dovede tam, kam tě rozum sám nepustí.",
      "Že ti něco nejde, ještě neznamená, že to nejde. Jen na to máš zatím málo pokusů.",
      "Za každou dobrou věcí stojí spousta nudných opakování.",
      "Kdo zkouší nové věci, ten se nikdy nepřestane posouvat.",
      "Klid v hlavě je lepší než jakýkoli spěch.",
      "Cestu si neuděláš čekáním, ale tím, že půjdeš.",
    ],
    "Kuba": [
      "Síla není v tom, že nikdy nespadneš, ale že vždycky vstaneš.",
      "Sebekázeň je tichá síla, kterou nikdo nevidí, ale všichni ji poznají na výsledku.",
      "Slib daný sám sobě je ten nejtěžší, a proto nejcennější.",
      "Cíl, který si nenapíšeš, zůstane jen přáním.",
      "Udělej věc pořádně hned napoprvé a ušetříš si půlku práce.",
      "Pevný základ se nestaví rychle, ale vydrží nejdéle.",
      "Nehledej výmluvy, hledej první krok.",
      "Přemýšlej hlavou, jednej srdcem a většina dnů dopadne dobře.",
    ],
    "Cukr mamča": [
      "Starat se o ostatní je krásné, ale nezapomeň se občas postarat i o sebe.",
      "Dobrá nálada je zadarmo a nejlíp se rozdává tím, že ji máš sama.",
      "Nemusíš zvládnout všechno najednou, stačí zvládnout dnešek.",
      "Úsměv je nejlevnější způsob, jak zlepšit někomu den, včetně toho svého.",
      "Jsi silnější, než si myslíš, a dokazuješ to každý den.",
      "Když je den těžký, připomeň si, kolik těžkých dní už jsi zvládla.",
      "Malé radosti, jako dobrá káva nebo klidná chvíle, dělají z obyčejného dne ten hezký.",
      "Věř si, protože nikdo tě nezná líp než ty sama.",
    ],
  };

  const fallback = [
    "Začni tam, kde jsi, s tím, co máš, a udělej, co zvládneš.",
    "Jedna malá dobrá věc udělaná dnes je víc než velký plán na někdy.",
    "Každý den je nová příležitost udělat něco lépe než včera.",
  ];

  const personName = person?.name || "";
  const personQuotes = quotesByPerson[personName] ?? fallback;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);

  // Každý člen vidí pouze citáty připravené přímo pro něj.
  // Citát se každý den posune na další položku v jeho vlastním seznamu.
  return personQuotes[(day - 1) % personQuotes.length];
}

function Overview({ people, shifts, currentPerson, events, nameDay, openAddShift, tibiWeek, setTibiWeek, tibiOdd, tibiEven, davidSchool, davidWeek, setDavidWeek, practice, openPractice, deletePractice }: { people:Person[]; shifts:Shift[]; currentPerson:Person|null; events:EventItem[]; nameDay:string; openAddShift:(date?:string)=>void; tibiWeek:"odd"|"even"; setTibiWeek:(v:"odd"|"even")=>void; tibiOdd:WeekSchedule;tibiEven:WeekSchedule;davidSchool:WeekSchedule;davidWeek:"odd"|"even";setDavidWeek:(v:"odd"|"even")=>void;practice:PracticeItem[];openPractice:(date?:string)=>void;deletePractice:(id:string)=>Promise<void>; }) {
  const [clock,setClock]=useState<number|null>(null);
  const hwO=useContext(ThemeModeCtx)==="halloween";
  const [detailPerson,setDetailPerson]=useState<Person|null>(null);
  useEffect(()=>{setClock(Date.now());const interval=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(interval);},[]);
  const today=isoToday();
  const currentParity=isoWeekNumber(new Date())%2===1?"odd":"even";
  const thisWeekBadge=(parity:"odd"|"even")=>currentParity===parity?<span className="ml-2 rounded-full bg-orange-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-300">tento týden</span>:null;
  const nowValue=clock ?? Date.now();
  const peopleById=useMemo(()=>new Map(people.map(person=>[person.id,person])),[people]);
  const todayShiftsByUser=useMemo(()=>{
    const map=new Map<string,Shift[]>();
    for(const shift of shifts){
      const isToday=shift.type==="vacation" ? today>=shift.date&&today<=(shift.endDate||shift.date) : shift.date===today;
      if(!isToday)continue;
      const list=map.get(shift.userId);
      if(list)list.push(shift);else map.set(shift.userId,[shift]);
    }
    for(const list of map.values())list.sort((a,b)=>a.startTime.localeCompare(b.startTime));
    return map;
  },[shifts,today]);
  const upcoming=useMemo(()=>shifts
    .filter(s=>s.type==="vacation" ? (s.endDate||s.date)>=today : shiftEndAt(s).getTime()>=nowValue)
    .sort((a,b)=>shiftStartAt(a).getTime()-shiftStartAt(b).getTime())
    .slice(0,8),[shifts,today,nowValue]);
  const upcomingGroups=useMemo(()=>{const groups:{key:string;items:Shift[]}[]=[];for(const s of upcoming){const key=s.date<today?today:s.date;const group=groups.find(g=>g.key===key);if(group)group.items.push(s);else groups.push({key,items:[s]});}return groups;},[upcoming,today]);
  const dateInfo=useMemo(()=>{const d=new Date();return {weekday:d.toLocaleDateString("cs-CZ",{weekday:"long"}),date:d.toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})};},[today]);
  const monthShiftCount=useMemo(()=>shifts.reduce((sum,s)=>sum+(s.date.slice(0,7)===today.slice(0,7)?1:0),0),[shifts,today]);
  const todayShiftCount=useMemo(()=>Array.from(todayShiftsByUser.values()).reduce((sum,list)=>sum+list.length,0),[todayShiftsByUser]);
  const todayEventCount=useMemo(()=>events.reduce((sum,event)=>sum+(event.date===today?1:0),0),[events,today]);
  const nextEvent=useMemo(()=>events.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0]??null,[events,today]);
  const nextBirthday=useMemo(()=>{
    let best:{person:Person;date:string;age:number}|null=null;
    const year=Number(today.slice(0,4));
    for(const person of people){
      if(!person.birthday)continue;
      const birthYear=Number(person.birthday.slice(0,4));
      const monthDay=person.birthday.slice(5);
      if(!birthYear||!monthDay)continue;
      let candidateYear=year;
      if(`${year}-${monthDay}`<today)candidateYear=year+1;
      const date=`${candidateYear}-${monthDay}`;
      if(!best||date<best.date)best={person,date,age:candidateYear-birthYear};
    }
    return best;
  },[people,today]);
  const commonFreeDay=useMemo(()=>{
    if(people.length===0||shifts.length===0)return null;
    const busy=new Set<string>();
    let last=today;
    for(const s of shifts){
      const lastDate=s.endDate||s.date;
      if(lastDate>last)last=lastDate;
      if(s.type==="vacation"||s.type==="sick")continue;
      busy.add(s.date);
      busy.add(toLocalDate(new Date(shiftEndAt(s).getTime()-60000)));
    }
    const cursor=new Date(`${today}T12:00:00`);
    for(let i=0;i<120;i++){
      const iso=toLocalDate(cursor);
      if(iso>last)break;
      if(!busy.has(iso))return iso;
      cursor.setDate(cursor.getDate()+1);
    }
    return null;
  },[people.length,shifts,today]);
  return <div><PageHeader eyebrow="SMĚNOVNÍK" title="Přehled" description="Všechno důležité na jednom místě." action={<div className="w-full rounded-2xl border border-orange-400/20 bg-black/20 px-5 py-3.5 backdrop-blur-sm sm:w-auto sm:min-w-[340px] xl:min-w-[390px]"><div className="text-[9px] font-bold uppercase tracking-[.18em] text-orange-300/70">Dnešní povzbuzení</div><div className="mt-1.5 text-sm font-semibold text-slate-200">{dailyBoost(currentPerson)}</div></div>}/><AutumnSectionTitle text="Podzimní přehled"/>
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{people.map(p=>{const todayShifts=todayShiftsByUser.get(p.id)??[];return <div key={p.id} role="button" tabIndex={0} aria-label={`Otevřít informace o směnách: ${p.name}`} onClick={()=>setDetailPerson(p)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setDetailPerson(p);}}} className="person-card group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(31,24,19,.96),rgba(14,12,10,.94))] p-5 text-left transition hover:-translate-y-1 hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{borderColor:`${p.color}38`}}><div className="autumn-only season-title pointer-events-none absolute right-3 top-2 text-2xl opacity-20">{hwO?"🦇":"🍂"}</div><div className="relative flex items-center gap-4"><Avatar person={p} size={54}/><div className="min-w-0 flex-1"><div className="text-[15px] font-black">{p.name}</div></div></div><div className="relative mt-5 flex-1 rounded-2xl border border-white/[0.05] bg-black/20 p-4">{todayShifts.length>0?<div className="space-y-2">{todayShifts.map(s=><div key={s.id} className="rounded-xl border px-3 py-2" style={{borderColor:`${shiftInfo[s.type].color}38`,background:`${shiftInfo[s.type].color}0d`}}><div className="flex items-center gap-2 text-sm font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={16}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-base font-black">{shiftTimeLabel(s)}</div></div>)}</div>:<div className="text-sm font-semibold text-slate-300">Dnes nemá směnu</div>}</div><div className="relative mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.12em] text-slate-600 transition group-hover:text-orange-300"><span>Detail</span><Icon name="right" size={14}/></div></div>})}</section>
    <section className="mb-8 grid gap-5 xl:grid-cols-[1.75fr_.95fr]"><Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Nejbližší směny</h2><p className="mt-1 text-xs text-slate-400">Seřazené podle toho, komu začíná směna nejdřív</p></div><button onClick={()=>openAddShift()} className="flex items-center gap-2 rounded-xl theme-primary px-3 py-2 text-xs font-bold text-white"><Icon name="plus" size={15}/>Přidat</button></div><div className="space-y-2">{upcoming.length===0?<Empty text="Zatím nejsou žádné směny."/>:upcomingGroups.map(group=><div key={group.key} className="space-y-2"><div className="px-1 pt-2 text-[11px] font-black uppercase tracking-[.14em] text-orange-300/80">{dayHeading(group.key,today)}</div>{group.items.map(s=>{const p=peopleById.get(s.userId);if(!p)return null;return <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><Avatar person={p} size={38}/><div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="mt-1 text-xs font-extrabold theme-text">{shiftCountdown(s,clock)}</div></div><div className="text-right"><div className="flex items-center justify-end gap-1 text-xs font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={13}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-xs text-slate-400">{shiftTimeLabel(s)}</div></div></div>})}</div>)}</div></Card><Card className="relative overflow-hidden p-6"><div className="pointer-events-none absolute -right-3 -top-4 text-6xl opacity-10">{hwO?"🎃":"🍁"}</div><h2 className="font-bold">Informace</h2><p className="mt-1 text-xs text-slate-400">Dnešní rychlý přehled</p><div className="relative mx-auto mt-6 grid max-w-[390px] grid-cols-2 gap-3"><InfoBubble label="Směn tento měsíc" value={String(monthShiftCount)} icon="calendar"/><InfoBubble label="Směn dnes" value={String(todayShiftCount)} icon="clock"/><div className="col-span-2 mx-auto -my-1 flex h-28 w-28 flex-col items-center justify-center rounded-full border border-orange-300/25 bg-orange-500/10 text-center shadow-[0_0_45px_rgba(249,115,22,.12)]"><div className="text-2xl">{hwO?"🎃":"🍂"}</div><div className="mt-1 text-sm font-black capitalize text-orange-200">{dateInfo.weekday}</div><div className="text-xs font-semibold text-orange-300/70">{dateInfo.date}</div></div><InfoBubble label="Událostí dnes" value={String(todayEventCount)} icon="event"/><InfoBubble label="Dnešní svátek" value={nameDay||"Načítám…"} icon="users" small/><div className="col-span-2"><InfoBubble label="Příští společné volno" icon="calendar" small value={commonFreeDay?dayHeading(commonFreeDay,today):"Zatím žádné v rozpisu"}/></div><div className="col-span-2"><InfoBubble label="Nejbližší událost" icon="event" small value={nextEvent?<><div className="truncate">{nextEvent.title}</div><div className="mt-1 text-xs font-semibold text-orange-200/80">{dateCountdown(nextEvent.date,today)} · {formatDate(nextEvent.date)}{nextEvent.time?` · ${nextEvent.time}`:""}</div></>:"Žádná naplánovaná"}/></div><div className="col-span-2"><InfoBubble label="Nejbližší narozeniny" icon="users" small value={nextBirthday?<><div className="truncate">🎂 {nextBirthday.person.name}</div><div className="mt-1 text-xs font-semibold text-orange-200/80">{dateCountdown(nextBirthday.date,today)} · {new Date(`${nextBirthday.date}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})} · {nextBirthday.age}. narozeniny</div></>:"Zatím nikdo nemá zadané datum narození"}/></div></div></Card></section>
    <section><div className="mb-4"><h2 className="text-lg font-bold">Škola a praxe</h2><p className="mt-1 text-xs text-slate-500">Rozvrhy na jednom místě.</p></div><div className="grid gap-6"><SchoolSchedule title="Tibíkův rozvrh" person={people.find(p=>p.email==="08matytibi3115@gmail.com")} schedule={tibiWeek==="odd"?tibiOdd:tibiEven} weekParity={tibiWeek} switcher={<div className="flex gap-2"><SmallToggle active={tibiWeek==="odd"} onClick={()=>setTibiWeek("odd")}>Lichý týden{thisWeekBadge("odd")}</SmallToggle><SmallToggle active={tibiWeek==="even"} onClick={()=>setTibiWeek("even")}>Sudý týden{thisWeekBadge("even")}</SmallToggle></div>}/><div><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-xl opacity-70">{hwO?"🦇":"🍂"}</span><div><h3 className="font-bold text-[#f1e7dc]">Davčův rozvrh</h3><p className="text-xs text-[#9f8d7e]">Sudý = škola, lichý = praxe</p></div></div><div className="flex gap-2"><SmallToggle active={davidWeek==="odd"} onClick={()=>setDavidWeek("odd")}>Lichý týden{thisWeekBadge("odd")}</SmallToggle><SmallToggle active={davidWeek==="even"} onClick={()=>setDavidWeek("even")}>Sudý týden{thisWeekBadge("even")}</SmallToggle></div></div>{davidWeek==="even"?<SchoolSchedule title="Davčův školní rozvrh" person={people.find(p=>p.email==="dkudlata9@gmail.com")} schedule={davidSchool} weekParity="even"/>:<DavidPracticeSchedule practice={practice} canEdit={currentPerson?.email==="dkudlata9@gmail.com"||isAdminEmail(currentPerson?.email)} onAdd={openPractice} onDelete={deletePractice}/>}</div></div></section>
    {detailPerson&&(()=>{
      const currentShift=shifts
        .filter(s=>s.userId===detailPerson.id&&s.type!=="vacation"&&s.type!=="sick")
        .find(s=>shiftStartAt(s).getTime()<=nowValue&&shiftEndAt(s).getTime()>nowValue);
      const isTibik=detailPerson.email.toLowerCase()==="08matytibi3115@gmail.com";
      const isMatysek=detailPerson.email.toLowerCase()==="matejuher15@gmail.com";
      const noteValue=(label:string)=>{
        const match=currentShift?.note?.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`,"i"));
        return match?.[1]?.trim()||null;
      };
      const storeLocation=isTibik?noteValue("Prodejna"):null;
      const arrivalInfo=isMatysek?noteValue("nástup"):null;
      const departureInfo=isMatysek?noteValue("odstup"):null;
      const visibleShiftNote=currentShift?.note?.split("\n").filter(line=>!(/^\s*(?:nástup|odstup)\s*:/i).test(line)).join("\n").trim()||"";
      const todayAbsence=shifts.find(s=>s.userId===detailPerson.id&&(s.type==="vacation"||s.type==="sick")&&today>=s.date&&today<=(s.endDate||s.date));
      const nextShift=shifts
        .filter(s=>s.userId===detailPerson.id&&s.type!=="vacation"&&s.type!=="sick"&&shiftStartAt(s).getTime()>nowValue)
        .sort((a,b)=>shiftStartAt(a).getTime()-shiftStartAt(b).getTime())[0];
      return <Modal onClose={()=>setDetailPerson(null)}>
        <div className="flex items-start gap-3">
          <Avatar person={detailPerson} size={50}/>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-300/70">Aktuální stav</div>
            <h2 className="mt-1 text-xl font-black">{detailPerson.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Co právě dělá podle zapsaných směn</p>
          </div>
          <button type="button" onClick={()=>setDetailPerson(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">Zavřít</button>
        </div>
        {currentShift?<div className="mt-5 rounded-2xl border p-4" style={{borderColor:`${shiftInfo[currentShift.type].color}55`,background:`${shiftInfo[currentShift.type].color}0d`}}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{color:shiftInfo[currentShift.type].color}}><span className="h-2 w-2 animate-pulse rounded-full" style={{background:shiftInfo[currentShift.type].color}}/>Právě má směnu</div>
          <h3 className="mt-2 text-xl font-black" style={{color:shiftInfo[currentShift.type].color}}>{shiftInfo[currentShift.type].label}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Datum</div><div className="mt-1 text-sm font-bold text-slate-100">{formatDate(currentShift.date)}</div></div>
            <div className="rounded-xl bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Čas směny</div><div className="mt-1 text-sm font-bold text-slate-100">{currentShift.startTime}–{currentShift.endTime}</div></div>
          </div>
          {(isTibik&&storeLocation||isMatysek&&(arrivalInfo||departureInfo))&&<div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
            {isTibik&&<div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/80"><Icon name="map-pin" size={14}/>Místo směny</div>}
            {isTibik&&storeLocation&&<div><div className="text-[10px] uppercase tracking-wider text-slate-500">Prodejna</div><div className="mt-1 text-sm font-bold text-amber-100">{storeLocation}</div></div>}
            {isMatysek&&<div className="grid grid-cols-2 gap-3">{arrivalInfo&&<div className="rounded-lg bg-black/20 p-2.5"><div className="text-[10px] uppercase tracking-wider text-slate-500">Nástup</div><div className="mt-1 text-sm font-bold text-amber-100">{arrivalInfo}</div></div>}{departureInfo&&<div className="rounded-lg bg-black/20 p-2.5"><div className="text-[10px] uppercase tracking-wider text-slate-500">Odstup</div><div className="mt-1 text-sm font-bold text-amber-100">{departureInfo}</div></div>}</div>}
          </div>}
          {(()=>{const remainingMinutes=Math.max(0,Math.ceil((shiftEndAt(currentShift).getTime()-nowValue)/60000));const hours=Math.floor(remainingMinutes/60);const minutes=remainingMinutes%60;return <div className="mt-3 flex items-center gap-3 rounded-xl border border-orange-300/20 bg-orange-300/[0.06] p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-300/10 text-orange-200"><Icon name="hourglass" size={20}/></div><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-orange-200/65">Do konce směny zbývá</div><div className="mt-0.5 text-lg font-black tabular-nums text-orange-100">{hours>0?`${hours} h `:""}{minutes} min</div></div></div>})()}
          {visibleShiftNote?<div className="mt-3 rounded-xl bg-black/20 p-3"><div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Poznámka ke směně</div><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{visibleShiftNote}</p></div>:<div className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">{currentShift.note?"V poznámce už nejsou další informace.":"Ke směně není zapsaná žádná poznámka."}</div>}
          <div className="mt-3 text-xs text-slate-500">Směna skončí v {currentShift.endTime}{shiftEndAt(currentShift).getDate()!==shiftStartAt(currentShift).getDate()?" následující den":""}.</div>
        </div>:<div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300/10 text-2xl">☕</div>
          <h3 className="mt-3 text-xl font-black text-emerald-200">{todayAbsence?shiftInfo[todayAbsence.type].label:"Teď má volno"}</h3>
          <p className="mt-1 text-sm text-slate-400">{todayAbsence?`Zapsaná nepřítomnost: ${formatDate(todayAbsence.date)}${todayAbsence.endDate&&todayAbsence.endDate!==todayAbsence.date?` – ${formatDate(todayAbsence.endDate)}`:""}.`:"Podle rozpisu mu právě neprobíhá žádná směna."}</p>
          {nextShift&&<div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-left"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Další směna</div><div className="mt-1 text-sm font-bold" style={{color:shiftInfo[nextShift.type].color}}>{shiftInfo[nextShift.type].label}</div><div className="mt-1 text-xs text-slate-300">{formatDate(nextShift.date)} · {nextShift.startTime}–{nextShift.endTime}</div>{nextShift.note&&<div className="mt-2 text-xs text-slate-400">Poznámka: {nextShift.note}</div>}</div>}
        </div>}
      </Modal>;
    })()}
  </div>;
}

function InfoBubble({label,value,icon,small=false}:{label:string;value:ReactNode;icon:string;small?:boolean}){return <div className="rounded-2xl border border-orange-300/10 bg-orange-300/[0.035] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-orange-300/60"><Icon name={icon} size={14}/>{label}</div><div className={`${small?"text-sm":"text-xl"} mt-2 font-black text-slate-100`}>{value}</div></div>}
function AutumnSectionTitle({ text }: { text: string }) {
  const mode = useContext(ThemeModeCtx);
  const [a, b] = mode === "halloween" ? ["🎃", "🦇"] : ["🍂", "🍁"];
  return <div className="autumn-only season-title mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-orange-300/80"><span className="autumn-leaf-accent text-base">{a}</span>{seasonTitle(text, mode)}<div className="h-px flex-1 bg-gradient-to-r from-orange-400/45 via-amber-300/18 to-transparent" /><span className="autumn-leaf-accent text-base opacity-70">{b}</span></div>;
}

function MiniStat({icon,label,value}:{icon:string;label:string;value:number}){return <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.04]"><div className="flex items-center gap-3 text-slate-300"><div className="flex h-8 w-8 items-center justify-center rounded-xl theme-soft"><Icon name={icon} size={16}/></div><span className="text-sm">{label}</span></div><span className="text-lg font-black">{value}</span></div>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-white/[0.10] bg-black/10 py-9 text-center text-sm text-slate-500">{text}</div>}
function SmallToggle({active,onClick,children}:{active:boolean;onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${active?"border theme-soft theme-ring":"border border-white/[0.07] text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"}`}>{children}</button>}

const SUBJECT_COLORS: Record<string, string> = {
  ČJ: "#f59e0b", AJ: "#f59e0b", NJ: "#f59e0b",
  M: "#38bdf8", MAT: "#38bdf8", F: "#38bdf8", ZPV: "#38bdf8",
  ICT: "#a78bfa", INF: "#a78bfa",
  TV: "#4ade80",
  PRAXE: "#fb923c",
  EK: "#2dd4bf", EKO: "#2dd4bf", EIM: "#2dd4bf", AEI: "#2dd4bf", SAZ: "#2dd4bf", TEOV: "#2dd4bf", MV: "#2dd4bf", ZSV: "#2dd4bf", STO: "#2dd4bf", PV: "#2dd4bf", TECH: "#2dd4bf",
};
const HW_SUBJECT_COLORS: Record<string, string> = {
  ČJ: "#ff9a3d", AJ: "#ff9a3d", NJ: "#ff9a3d",
  M: "#b57bff", MAT: "#b57bff", F: "#b57bff", ZPV: "#b57bff",
  ICT: "#7bd34a", INF: "#7bd34a", TV: "#a3e635", PRAXE: "#ff6a00",
  EK: "#e879f9", EKO: "#e879f9", EIM: "#e879f9", AEI: "#e879f9", SAZ: "#e879f9", TEOV: "#e879f9", MV: "#e879f9", ZSV: "#e879f9", STO: "#e879f9", PV: "#e879f9", TECH: "#e879f9",
};
function subjectColor(short: string, hw = false) {
  const key = short.split("/")[0].trim().toUpperCase();
  return (hw ? HW_SUBJECT_COLORS : SUBJECT_COLORS)[key] ?? null;
}

function SchoolSchedule({title,person,schedule,switcher,weekParity}:{title:string;person?:Person;schedule:WeekSchedule;switcher?:ReactNode;weekParity?:"odd"|"even"}){
  const now=new Date();
  const hw=useContext(ThemeModeCtx)==="halloween";
  const todayKey=["Ne","Po","Út","St","Čt","Pá","So"][now.getDay()];
  const isCurrentWeek=weekParity!==undefined&&(isoWeekNumber(now)%2===1?"odd":"even")===weekParity;
  const nowMinutes=now.getHours()*60+now.getMinutes();
  const toMinutes=(value:string)=>{const [h,m]=value.split(":").map(Number);return h*60+m;};
  const currentPeriod=isCurrentWeek?SCHOOL_PERIODS.findIndex(pd=>nowMinutes>=toMinutes(pd.start)&&nowMinutes<=toMinutes(pd.end)):-1;
  const todayInSchedule=isCurrentWeek&&todayKey in schedule;
  const filledCols=SCHOOL_PERIODS.map((_,i)=>Object.values(schedule).some(lessons=>(lessons[i]?.subject??"—")!=="—"));
  const firstCol=filledCols.indexOf(true);
  const lastCol=filledCols.lastIndexOf(true);
  const cols=SCHOOL_PERIODS.map((_,i)=>i).filter(i=>firstCol===-1||(i>=firstCol&&i<=lastCol));
  return <div className="relative overflow-hidden rounded-3xl school-card border border-[#5a4637]/55 bg-[linear-gradient(145deg,rgba(30,24,20,.97),rgba(15,13,12,.98))] shadow-[0_18px_50px_rgba(0,0,0,.28)]">
    <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#8a684d]/[0.08] blur-[70px]"/>
    <div className="relative flex flex-col justify-between gap-3 school-head border-b border-[#5a4637]/35 bg-[linear-gradient(90deg,rgba(91,67,49,.12),rgba(255,255,255,.015))] p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex items-center gap-3">{person&&<Avatar person={person} size={42}/>}<div><div className="font-bold text-[#f1e7dc]">{title}</div><div className="text-[11px] text-[#9f8d7e]">0.–7. vyučovací hodina</div></div></div>{switcher}
    </div>
    <div className="relative overflow-x-auto p-4 sm:p-6">
      <div style={{minWidth:`${58+cols.length*100}px`}}>
        <div className="grid gap-1" style={{gridTemplateColumns:`58px repeat(${cols.length},minmax(92px,1fr))`}}>
          <div/>
          {cols.map(i=>{const period=SCHOOL_PERIODS[i];const activeCol=todayInSchedule&&i===currentPeriod;return <div key={period.number} title={`${period.number}. hodina · ${period.start}–${period.end}`} className="text-center leading-tight">
            <div className={`text-xs font-extrabold ${activeCol?"text-orange-300":"text-[#d8c8b9]"}`}>{period.number}.</div>
            <div className={`mt-1 text-[10px] font-semibold ${activeCol?"text-orange-300/80":"text-[#a39080]"}`}>{period.start}–{period.end}</div>
          </div>})}
          {Object.entries(schedule).map(([day,lessons])=>{const isToday=isCurrentWeek&&day===todayKey;return <div key={day} className="contents">
            <div className={`flex min-h-[56px] items-center gap-1.5 font-bold ${isToday?"text-orange-300":"text-[#b9a89a]"}`}>{isToday&&<span className="h-1.5 w-1.5 rounded-full bg-orange-400"/>}{day}</div>
            {cols.map(i=>{const l=lessons[i]??{subject:"—"};
              const empty=l.subject==="—";
              const isNow=isToday&&i===currentPeriod&&!empty;
              const color=empty?null:subjectColor(shortSubject(l.subject),hw);
              return <div key={`${day}-${i}`} title={`${l.subject}${l.room?` · ${l.room}`:""}`} style={color?{borderColor:`${color}${isToday?"88":"44"}`,background:`linear-gradient(145deg,${color}22,${hw?"rgba(20,11,28,.92)":"rgba(30,26,22,.92)"})`}:undefined} className={`flex min-h-[56px] min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${empty?"border-transparent bg-transparent text-[#4d433c]":"border-[#6e5a49]/45 bg-[linear-gradient(145deg,rgba(53,43,35,.88),rgba(30,26,22,.92))] text-[#efe6dd] hover:brightness-125"} ${isNow?"ring-2 ring-orange-400/80 shadow-[0_0_22px_rgba(251,146,60,.28)]":""} ${isToday&&!empty&&!color?"border-orange-300/30":""} ${!empty&&!color?"school-plain":""}`}>
                <div className="font-bold">{shortSubject(l.subject)}</div>
                {l.room&&l.subject!=="—"&&<div className="mt-1 text-[10px] font-medium text-[#b3a090]">uč. {l.room}</div>}
              </div>})}
          </div>})}
        </div>
      </div>
    </div>
  </div>
}

function birthdayAgeOnDate(birthday:string | null | undefined, date:string){
  if(!birthday)return null;
  const birthYear=Number(birthday.slice(0,4));
  const targetYear=Number(date.slice(0,4));
  if(!birthYear||!targetYear)return null;
  return targetYear-birthYear;
}


function ShiftsPage({people,shifts,currentPerson,selectedPerson,setSelectedPerson,month,year,changeMonth,filter,setFilter,openAddShift,openEditShift,saveShiftRating,loading,autumn,goToToday}:{people:Person[];shifts:Shift[];currentPerson:Person|null;selectedPerson:Person|null;setSelectedPerson:(p:Person|null)=>void;month:number;year:number;changeMonth:(d:number)=>void;filter:ShiftType|"all";setFilter:(f:ShiftType|"all")=>void;openAddShift:(d?:string)=>void;openEditShift:(s:Shift)=>void;saveShiftRating:(shift:Shift,rating:number,reason:string,tramNumber:string,tramRating:TramRating|null)=>Promise<boolean>;loading:boolean;autumn:boolean;goToToday:()=>void;}){
  const [detailShift,setDetailShift]=useState<Shift|null>(null);
  const [dayDetail,setDayDetail]=useState<string|null>(null);
  const themeMode=useContext(ThemeModeCtx);
  const halloween=themeMode==="halloween";
  const leafA=halloween?"🎃":"🍁";
  const leafB=halloween?"🦇":"🍂";
  const cells=useMemo(() => {
    const result:(number|null)[]=[];
    for(let i=0;i<mondayOffset(year,month);i++)result.push(null);
    for(let d=1;d<=daysInMonth(year,month);d++)result.push(d);
    return result;
  },[year,month]);
  const visible=useMemo(() => selectedPerson?[selectedPerson]:people,[selectedPerson,people]);
  const visibleIds=useMemo(() => new Set(visible.map(person=>person.id)),[visible]);
  const birthdaysByMonthDay=useMemo(() => {
    const result=new Map<string,Person[]>();
    for(const person of people){
      const monthDay=person.birthday?.slice(5);
      if(!monthDay)continue;
      const list=result.get(monthDay) ?? [];
      list.push(person);
      result.set(monthDay,list);
    }
    return result;
  },[people]);
  const allIds=useMemo(() => new Set(people.map(person=>person.id)),[people]);
  const shiftsByDate=useMemo(() => {
    const result=new Map<string,Shift[]>();
    const monthStart=`${year}-${String(month+1).padStart(2,"0")}-01`;
    const monthEnd=`${year}-${String(month+1).padStart(2,"0")}-${String(daysInMonth(year,month)).padStart(2,"0")}`;
    const add=(date:string,shift:Shift)=>{
      const list=result.get(date) ?? [];
      list.push(shift);
      result.set(date,list);
    };
    for(const shift of shifts){
      if(!allIds.has(shift.userId)||(filter!=="all"&&shift.type!==filter))continue;
      if(shift.type!=="vacation"){
        if(shift.date>=monthStart&&shift.date<=monthEnd)add(shift.date,shift);
        continue;
      }
      const start=shift.date>monthStart?shift.date:monthStart;
      const end=(shift.endDate||shift.date)<monthEnd?(shift.endDate||shift.date):monthEnd;
      if(start>end)continue;
      const cursor=new Date(`${start}T12:00:00`);
      const last=new Date(`${end}T12:00:00`);
      while(cursor<=last){
        const date=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
        add(date,shift);
        cursor.setDate(cursor.getDate()+1);
      }
    }
    for(const list of result.values())list.sort((a,b)=>a.startTime.localeCompare(b.startTime));
    return result;
  },[shifts,allIds,filter,year,month]);
  const peopleById=useMemo(() => new Map(people.map(person=>[person.id,person])),[people]);
  const today=isoToday();
  const octoberAutumn=(autumn&&month===9)||halloween;

  const printShifts = () => {
    const monthStart=`${year}-${String(month+1).padStart(2,"0")}-01`;
    const monthEnd=`${year}-${String(month+1).padStart(2,"0")}-${String(daysInMonth(year,month)).padStart(2,"0")}`;
    const printable = shifts
      .filter(s => visibleIds.has(s.userId))
      .filter(s => filter === "all" || s.type === filter)
      .filter(s => s.type === "vacation" ? (s.endDate || s.date) >= monthStart && s.date <= monthEnd : s.date >= monthStart && s.date <= monthEnd)
      .sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));

    const rows = printable.map(s => {
      const person = peopleById.get(s.userId);
      if (!person) return "";
      const worked = shiftWorkedMinutes(s, person);
      const dateLabel = s.type === "vacation" && s.endDate && s.endDate !== s.date
        ? `${formatDate(s.date)} – ${formatDate(s.endDate)}`
        : formatDate(s.date);
      const timeLabel = s.type === "vacation" || s.type === "sick" ? "—" : `${s.startTime}–${s.endTime}`;
      const workedLabel = s.type === "vacation" || s.type === "sick" ? "—" : formatWorkedMinutes(worked);
      const breakLabel = BREAK_DEDUCTION_EMAILS.has(person.email.toLowerCase()) && s.type !== "vacation" && s.type !== "sick" ? " (po odečtení 30 min pauzy)" : "";
      return `<tr><td>${escapePrintHtml(dateLabel)}</td><td><strong>${escapePrintHtml(person.name)}</strong></td><td><span class="badge">${escapePrintHtml(shiftInfo[s.type].label)}</span></td><td>${escapePrintHtml(timeLabel)}</td><td>${escapePrintHtml(workedLabel + breakLabel)}</td><td>${escapePrintHtml(s.note || "")}</td></tr>`;
    }).join("");

    const totalMinutes = printable.reduce((sum,s)=>{
      const person=peopleById.get(s.userId);
      return sum + shiftWorkedMinutes(s,person);
    },0);

    const selectedLabel = selectedPerson ? selectedPerson.name : "Všichni";
    const filterLabel = filter === "all" ? "Všechny typy" : shiftInfo[filter].label;
    openPrintWindow(
      `Směnovník – ${monthName(year,month)} ${year}`,
      `<div class="header"><div class="eyebrow">Směnovník · Provozní dokument</div><h1>Měsíční přehled směn</h1><div class="doc-meta"><span>Období: <strong>${escapePrintHtml(monthName(year,month))} ${year}</strong></span><span>Osoba: <strong>${escapePrintHtml(selectedLabel)}</strong></span><span>Filtr: <strong>${escapePrintHtml(filterLabel)}</strong></span><span>Vygenerováno: <strong>${new Date().toLocaleDateString("cs-CZ")}</strong></span></div></div>
       <div class="summary"><div class="box">Celkem směn<strong>${printable.length}</strong></div><div class="box">Odpracovaný čas<strong>${escapePrintHtml(formatWorkedMinutes(totalMinutes))}</strong></div><div class="box">Počet osob<strong>${visible.length}</strong></div><div class="box">Přestávky<strong>−30 min u vybraných osob</strong></div></div>
       <table><thead><tr><th>Datum</th><th>Osoba</th><th>Typ směny</th><th>Čas</th><th>Odpracováno</th><th>Poznámka / místo výkonu</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Pro zvolené období nejsou evidovány žádné směny.</td></tr>`}</tbody></table>
       <div class="foot"><strong>SMĚNOVNÍK</strong> · Interní provozní přehled · Odpracovaný čas je uveden po odečtení příslušných přestávek. Dovolená a nemoc se do odpracovaného času nezapočítávají.</div>`
    );
  };
  const now=new Date();
  const isCurrentMonth=year===now.getFullYear()&&month===now.getMonth();
  const dimmed=(s:Shift)=>Boolean(selectedPerson&&s.userId!==selectedPerson.id);
  const renderChips=(date:string,list:Shift[])=>list.map(s=>{const person=peopleById.get(s.userId);if(!person)return null;return <ShiftChip key={s.id} shift={s} person={person} date={date} dim={dimmed(s)} onClick={e=>{e.stopPropagation();setDetailShift(s);}}/>;});
  const birthdayStrips=(date:string)=>(birthdaysByMonthDay.get(date.slice(5))??[]).map(person=><div key={`birthday-${person.id}`} className="mb-1.5 truncate rounded-lg border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-200">🎂 {person.name} — {birthdayAgeOnDate(person.birthday,date)} let</div>);
  const monthDays=Array.from({length:daysInMonth(year,month)},(_,k)=>k+1).map(day=>`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  const mobileDays=monthDays.filter(date=>date===today||(shiftsByDate.get(date)?.length??0)>0||(birthdaysByMonthDay.get(date.slice(5))?.length??0)>0);
  return <div><PageHeader eyebrow="KALENDÁŘ" title="Směny" description="Přehled směn všech členů." action={<div className="flex flex-wrap gap-2"><button type="button" onClick={printShifts} className="flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"><Icon name="calendar" size={16}/>Vytisknout rozpis</button><button onClick={()=>openAddShift()} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white hover:brightness-110"><Icon name="plus" size={16}/>Přidat směnu</button></div>}/>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <FilterButton active={filter==="all"} onClick={()=>setFilter("all")} label="Všechny"/>
      {(Object.keys(shiftInfo) as ShiftType[]).map(t=><FilterButton key={t} active={filter===t} onClick={()=>setFilter(t)} label={shiftInfo[t].short} color={shiftInfo[t].color} icon={shiftInfo[t].icon}/>)}
      <span className="mx-1 hidden h-7 w-px bg-white/10 sm:block"/>
      <button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();setSelectedPerson(null);}} aria-pressed={!selectedPerson} className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${!selectedPerson?"border-white/20 bg-white/[0.10] text-white shadow-[0_8px_22px_rgba(0,0,0,.16)]":"border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:text-white"}`}>Všichni</button>
      {people.map(p=><button type="button" key={p.id} title={p.name} aria-label={p.name} aria-pressed={selectedPerson?.id===p.id} onClick={(e)=>{e.preventDefault();e.stopPropagation();setSelectedPerson(selectedPerson?.id===p.id?null:p);}} className={`rounded-full transition ${selectedPerson&&selectedPerson.id!==p.id?"opacity-50 hover:opacity-100":""}`} style={selectedPerson?.id===p.id?{boxShadow:`0 0 0 2px #1a0f08, 0 0 0 4px ${p.color}`}:undefined}><Avatar person={p} size={34}/></button>)}
    </div>
    <Card className={`relative overflow-hidden ${octoberAutumn?"october-calendar":""}`}>
      {octoberAutumn&&<><div className="pointer-events-none absolute right-24 top-1 z-10 text-5xl opacity-30 autumn-leaf-accent">{leafA}</div><div className="pointer-events-none absolute bottom-8 left-3 z-10 text-4xl opacity-20 autumn-leaf-accent">{leafB}</div><div className="pointer-events-none absolute left-[35%] top-[42%] z-10 text-3xl opacity-[0.08]">{leafA}</div><div className="pointer-events-none absolute right-[28%] bottom-[18%] z-10 text-3xl opacity-[0.07]">{leafB}</div></>}
      <div className="calendar-head flex items-center justify-between border-b border-white/[0.06] p-4">
        <button onClick={()=>changeMonth(-1)} aria-label="Předchozí měsíc" className="rounded-xl border border-white/[0.10] bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/[0.10]"><Icon name="left"/></button>
        <div className="text-center"><div className={`text-lg font-bold capitalize ${octoberAutumn?"autumn-neon-title":""}`}>{octoberAutumn&&<span className="mr-2">{leafA}</span>}{monthName(year,month)}{octoberAutumn&&<span className="ml-2">{leafB}</span>}</div><div className="text-xs text-slate-400">{year}</div>{!isCurrentMonth&&<button type="button" onClick={goToToday} className="mt-1.5 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-200 hover:bg-orange-400/20">Dnes</button>}</div>
        <button onClick={()=>changeMonth(1)} aria-label="Další měsíc" className="relative z-20 rounded-xl border border-white/[0.10] bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/[0.10]"><Icon name="right"/></button>
      </div>
      <div className="hidden md:block">
        <div className="calendar-weekdays grid grid-cols-7 border-b border-white/[0.06]">{["Po","Út","St","Čt","Pá","So","Ne"].map((d,idx)=><div key={d} className={`p-3 text-center text-[11px] font-bold ${idx>=5?"text-orange-300/70":"text-slate-300"}`}>{d}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map((day,i)=>{
          if(!day)return <div key={`e${i}`} className="calendar-empty min-h-[105px] border-b border-r border-white/[0.04] bg-black/10"/>;
          const date=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday=date===today;
          const isPast=date<today;
          const weekend=(i%7)>=5;
          const dayShifts=shiftsByDate.get(date)??[];
          const crowded=dayShifts.length>3;
          return <div key={date} onClick={()=>{if(!currentPerson)return;openAddShift(date)}} className={`calendar-cell relative min-h-[105px] cursor-pointer border-b border-r border-white/[0.04] p-2 transition hover:bg-white/[0.035] ${weekend?"bg-white/[0.03]":""}`} style={isToday?{background:"color-mix(in srgb, var(--theme) 12%, transparent)",boxShadow:"inset 0 0 0 2px color-mix(in srgb, var(--theme) 55%, transparent)"}:undefined}>
            <div className={isPast?"opacity-60 transition hover:opacity-100":""}>
              <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${isToday?"theme-primary text-white":"text-slate-400"}`}>{day}</div>
              {birthdayStrips(date)}
              {crowded
                ?<div onClick={e=>{e.stopPropagation();setDayDetail(date);}} className="cursor-pointer rounded-lg bg-white/[0.045] p-2 transition hover:bg-white/[0.09]">
                  <div className="flex items-center -space-x-2">{dayShifts.slice(0,4).map(s=>{const person=peopleById.get(s.userId);return person?<div key={s.id} className={`rounded-full ${dimmed(s)?"opacity-25 grayscale":""}`} style={{boxShadow:`0 0 0 2px ${shiftInfo[s.type].color}`}}><Avatar person={person} size={26}/></div>:null;})}{dayShifts.length>4&&<div className="pl-3 text-[11px] font-black text-slate-200">+{dayShifts.length-4}</div>}</div>
                  <div className="mt-1.5 text-[10px] font-semibold text-slate-300">{czechCount(dayShifts.length,"směna","směny","směn")} · detail</div>
                </div>
                :<div className="space-y-1">{renderChips(date,dayShifts)}</div>}
            </div>
          </div>;
        })}</div>
      </div>
      <div className="space-y-4 p-4 md:hidden">
        {mobileDays.length===0?<Empty text="V tomto měsíci nejsou žádné směny."/>:mobileDays.map(date=>{const isToday=date===today;return <div key={date} className={`rounded-2xl border p-3 ${isToday?"border-orange-300/40 bg-orange-400/[0.07]":"border-white/[0.06] bg-white/[0.02]"} ${date<today?"opacity-70":""}`}>
          <div className={`mb-2 text-xs font-black uppercase tracking-wider ${isToday?"text-orange-300":"text-slate-400"}`}>{isToday&&"Dnes · "}{new Date(`${date}T12:00:00`).toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"numeric"})}</div>
          {birthdayStrips(date)}
          <div className="space-y-1.5">{renderChips(date,shiftsByDate.get(date)??[])}</div>
        </div>;})}
      </div>
    </Card>
    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs text-slate-400"><Icon name="lock" size={15}/>{loading?"Načítám směny…":"Upravovat můžeš pouze svoje směny. Směny ostatních jsou pouze k zobrazení."}</div>
    {dayDetail&&<Modal onClose={()=>setDayDetail(null)}>
      <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-300/70">Směny dne</div><h2 className="mt-1 text-xl font-black capitalize">{new Date(`${dayDetail}T12:00:00`).toLocaleDateString("cs-CZ",{weekday:"long",day:"numeric",month:"long"})}</h2></div><button type="button" onClick={()=>setDayDetail(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">Zavřít</button></div>
      <div className="mt-5 space-y-2">{(shiftsByDate.get(dayDetail)??[]).map(s=>{const person=peopleById.get(s.userId);if(!person)return null;return <ShiftChip key={s.id} shift={s} person={person} date={dayDetail} dim={false} onClick={()=>{setDayDetail(null);setDetailShift(s);}}/>;})}</div>
      {currentPerson&&<button type="button" onClick={()=>{const d=dayDetail;setDayDetail(null);openAddShift(d);}} className="mt-5 w-full rounded-xl theme-primary py-3 text-xs font-bold text-white hover:brightness-110">Přidat směnu na tento den</button>}
    </Modal>}
    {detailShift&&<ShiftDetailModal shift={detailShift} person={peopleById.get(detailShift.userId) || null} editable={currentPerson?.id===detailShift.userId||isAdminEmail(currentPerson?.email)} isAdmin={isAdminEmail(currentPerson?.email)} canManage={isAdminEmail(currentPerson?.email)} onClose={()=>setDetailShift(null)} onEdit={()=>{const shift=detailShift;setDetailShift(null);openEditShift(shift);}} onSaveRating={saveShiftRating}/>}
  </div>;
}

function ShiftChip({shift,person,date,dim,onClick}:{shift:Shift;person:Person;date:string;dim:boolean;onClick:(e:React.MouseEvent)=>void}){
  const info=shiftInfo[shift.type];
  const isAbsence=shift.type==="vacation"||shift.type==="sick";
  const endDate=shift.endDate||shift.date;
  const shortDate=(iso:string)=>new Date(`${iso}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"});
  let note="";
  if(shift.type==="vacation"&&endDate>shift.date){
    if(date===shift.date)note=`→ do ${shortDate(endDate)}`;
    else if(date===endDate)note="· poslední den";
    else note="· pokračuje";
  }
  const timeText=isAbsence?"":shift.type==="all_day"?"Celý den":`${shift.startTime}–${shift.endTime}`;
  return <div onClick={onClick} className={`cursor-pointer rounded-lg border-l-[3px] bg-white/[0.045] px-2 py-1.5 transition hover:bg-white/[0.09] ${dim?"opacity-25 grayscale":""}`} style={{borderLeftColor:info.color,backgroundImage:`linear-gradient(90deg,${info.color}14,transparent 65%)`}}>
    <div className="flex min-w-0 items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{background:person.color}}/><span className="truncate text-[11px] font-black text-white">{person.name}</span></div>
    <div className="mt-0.5 flex items-baseline gap-1.5 text-[11px]">{timeText&&<span className="whitespace-nowrap font-semibold text-slate-100">{timeText}</span>}<span className="truncate text-[10px] font-bold" style={{color:info.color}}>{info.short}{note?` ${note}`:""}</span></div>
  </div>;
}

function ShiftDetailModal({shift,person,editable,canManage,isAdmin,onClose,onEdit,onSaveRating}:{isAdmin?:boolean;canManage?:boolean;shift:Shift;person:Person|null;editable:boolean;onClose:()=>void;onEdit:()=>void;onSaveRating:(shift:Shift,rating:number,reason:string,tramNumber:string,tramRating:TramRating|null)=>Promise<boolean>}){
  const info=shiftInfo[shift.type];
  const [clock,setClock]=useState(()=>Date.now());
  const [rating,setRating]=useState<number|null>(shift.rating);
  const [ratingReason,setRatingReason]=useState(shift.ratingReason || "");
  const [tramNumber,setTramNumber]=useState(shift.tramNumber || "");
  const [tramRating,setTramRating]=useState<TramRating|null>(shift.tramRating);
  const [savingRating,setSavingRating]=useState(false);
  const [ratingMessage,setRatingMessage]=useState("");
  useEffect(()=>{
    const interval=setInterval(()=>setClock(Date.now()),30000);
    return()=>clearInterval(interval);
  },[]);
  const availableAt=shiftRatingAvailableAt(shift);
  const canRate=editable&&availableAt!==null&&(Boolean(isAdmin)||clock>=availableAt.getTime());
  const minutesUntilRating=availableAt?Math.max(1,Math.ceil((availableAt.getTime()-clock)/60000)):0;
  const submitRating=async()=>{
    if(rating===null||!canRate)return;
    setSavingRating(true);
    setRatingMessage("");
    const saved=await onSaveRating(shift,rating,ratingReason,tramNumber,tramRating);
    setRatingMessage(saved?"Hodnocení bylo uloženo.":"Hodnocení se nepodařilo uložit.");
    setSavingRating(false);
  };
  const canEditTram=editable&&Boolean(person?.email&&TRAM_REVIEW_EMAILS.has(person.email));
  return <Modal onClose={onClose}>
    <div className="flex items-center gap-3">
      {person?<Avatar person={person} size={46}/>:<div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/[0.06]"><Icon name="users" size={20}/></div>}
      <div>
        <div className="flex items-center gap-2">
          <span style={{color:info.color}}><Icon name={info.icon} size={17}/></span>
          <h2 className="font-bold">Detail směny</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">{person?.name || "Neznámý uživatel"}</p>
      </div>
    </div>

    <div className="mt-6 space-y-3">
      <div className="rounded-2xl border p-4" style={{borderColor:`${info.color}35`,background:`${info.color}0d`}}>
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Typ směny</div>
        <div className="mt-2 flex items-center gap-2 text-base font-bold" style={{color:info.color}}>
          <Icon name={info.icon} size={18}/>{info.label}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">{shift.type==="vacation"?"Datum od":"Datum"}</div>
          <div className="mt-1.5 text-sm font-semibold text-slate-200">{formatDate(shift.date)}</div>
        </div>
        {shift.type==="vacation"?<div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">Datum do</div>
          <div className="mt-1.5 text-sm font-semibold text-slate-200">{formatDate(shift.endDate || shift.date)}</div>
        </div>:<div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">Čas</div>
          <div className="mt-1.5 text-sm font-semibold text-slate-200">{shift.startTime} – {shift.endTime}</div>
        </div>}
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">Poznámka</div>
        <div className="mt-1.5 whitespace-pre-wrap text-sm text-slate-300">{shift.note?.trim() || "Bez poznámky"}</div>
      </div>

      {availableAt!==null&&<div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-300/70">Hodnocení směny</div>
        {!editable&&rating===null&&<div className="mt-2 text-sm text-slate-500">Směna zatím nebyla ohodnocena.</div>}
        {!editable&&rating!==null&&<><div className="mt-2 text-xl tracking-wider text-amber-300">{"★".repeat(rating)}{"☆".repeat(5-rating)} <span className="text-sm font-bold">{rating}/5</span></div>{ratingReason&&<div className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{ratingReason}</div>}</>}
        {!canEditTram&&(tramNumber||tramRating)&&<div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-sm text-slate-300"><span className="font-bold text-slate-100">Tramvaj {tramNumber||"—"}</span>{tramRating&&<span className="ml-2 text-slate-400">· {TRAM_RATING_LABELS[tramRating]}</span>}</div>}
        {editable&&!canRate&&<div className="mt-2 text-sm text-slate-400">Hodnocení se zpřístupní 5 minut po skončení směny{availableAt.getTime()>clock?` (přibližně za ${minutesUntilRating} min)`:""}.</div>}
        {canRate&&<>
          <div className="mt-3 flex flex-wrap gap-2">{[0,1,2,3,4,5].map(value=><button type="button" key={value} onClick={()=>setRating(value)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${rating===value?"border-amber-300/60 bg-amber-400/20 text-amber-200":"border-white/[0.08] bg-black/20 text-slate-500 hover:text-amber-300"}`}>{value===0?"0★":"★".repeat(value)}</button>)}</div>
          <label className="mt-4 block text-xs text-slate-400">Proč dáváš právě tolik hvězdiček?</label>
          <textarea value={ratingReason} onChange={e=>setRatingReason(e.target.value)} rows={3} placeholder="Například: směna rychle utekla…" className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-amber-300/40"/>
          {canEditTram&&<div className="mt-4 rounded-2xl border border-orange-300/15 bg-orange-400/[0.04] p-4"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-200/70">Hodnocení tramvaje</div><label className="mt-3 block text-xs text-slate-400">Číslo tramvaje</label><input value={tramNumber} onChange={e=>setTramNumber(e.target.value)} placeholder="Například 123" className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/40"/><div className="mt-3 grid grid-cols-3 gap-2">{(Object.keys(TRAM_RATING_LABELS) as TramRating[]).map(value=><button type="button" key={value} onClick={()=>setTramRating(value)} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${tramRating===value?"border-orange-300/60 bg-orange-400/20 text-orange-100":"border-white/[0.08] bg-black/20 text-slate-500 hover:text-orange-200"}`}>{TRAM_RATING_LABELS[value]}</button>)}</div></div>}
          <div className="mt-3 flex items-center justify-between gap-3">{ratingMessage?<span className="text-xs text-emerald-300">{ratingMessage}</span>:<span/>}<button type="button" onClick={submitRating} disabled={rating===null||savingRating||(canEditTram&&(!tramNumber.trim()||tramRating===null))} className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{savingRating?"Ukládám…":shift.rating===null?"Uložit hodnocení":"Upravit hodnocení"}</button></div>
        </>}
      </div>}
    </div>

    <div className="mt-6 flex items-center gap-2">
      {!editable&&!canManage&&<div className="mr-auto flex items-center gap-1.5 text-[11px] text-slate-600"><Icon name="lock" size={13}/>Pouze ke čtení</div>}
      <button type="button" onClick={onClose} className={`${editable||canManage?"ml-auto":""} rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-white/[0.04]`}>Zavřít</button>
      {(editable||canManage)&&<button type="button" onClick={onEdit} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white hover:brightness-110">Upravit směnu</button>}
    </div>
  </Modal>
}

function FilterButton({active,onClick,label,color,icon}:{active:boolean;onClick:()=>void;label:string;color?:string;icon?:string}){
  return <button onClick={onClick} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5" style={color?{
    borderColor:`${color}${active?"88":"38"}`,
    background:`linear-gradient(135deg, ${color}${active?"40":"1c"}, ${color}${active?"18":"0d"})`,
    color:active?"#fff":color,
    boxShadow:active?`0 8px 24px ${color}28`:"none"
  }:{borderColor:"rgba(255,255,255,.08)",background:active?"rgba(255,255,255,.08)":"rgba(255,255,255,.025)",color:active?"#fff":"#94a3b8"}}>
    {icon&&<Icon name={icon} size={14}/>} {label}
  </button>
}

function EventHero({event:e,people,today,onOpen}:{event:EventItem;people:Person[];today:string;onOpen:()=>void}){
  const cat=EVENT_CATEGORIES[e.category??"other"];
  const d=new Date(`${e.date}T12:00:00`);
  return <div onClick={onOpen} className="app-card group relative mb-8 cursor-pointer overflow-hidden rounded-3xl border p-6 transition hover:-translate-y-0.5 sm:p-7" style={{borderColor:`${cat.color}40`,background:`radial-gradient(circle at 90% 0%,${cat.color}26,transparent 45%),linear-gradient(145deg,rgba(31,24,19,.97),rgba(14,12,10,.96))`}}>
    <div className="pointer-events-none absolute -right-3 -top-5 text-[120px] opacity-[0.07]">{cat.emoji}</div>
    <div className="relative text-[10px] font-black uppercase tracking-[.2em]" style={{color:cat.color}}>Nejbližší událost</div>
    <div className="relative mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex h-[104px] w-[88px] shrink-0 flex-col items-center justify-center rounded-3xl border" style={{borderColor:`${cat.color}55`,background:`linear-gradient(145deg,${cat.color}30,${cat.color}0c)`}}>
        <div className="text-xs font-black uppercase tracking-wider" style={{color:cat.color}}>{d.toLocaleDateString("cs-CZ",{month:"short"}).replace(".","")}</div>
        <div className="text-5xl font-black leading-none text-white">{d.getDate()}</div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase text-slate-300">{d.toLocaleDateString("cs-CZ",{weekday:"short"})}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{borderColor:`${cat.color}50`,background:`${cat.color}18`,color:cat.color}}>{cat.emoji} {cat.label}</span>
          <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-black text-white">{dateCountdown(e.date,today)}</span>
        </div>
        <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{e.title}</h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
          {e.time&&<span className="flex items-center gap-1.5"><Icon name="clock" size={15}/>{e.time}</span>}
          <span className="flex items-center gap-1.5">📍 {e.place||"Bez místa"}</span>
        </div>
        {e.description&&<p className="mt-3 line-clamp-2 max-w-2xl text-sm text-slate-400">{e.description}</p>}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex -space-x-2">{e.participants.slice(0,6).map(id=>{const p=people.find(x=>x.id===id);return p?<div key={id} className="rounded-full ring-2 ring-[#16100b]"><Avatar person={p} size={30}/></div>:null;})}</div>
          <span className="text-xs text-slate-500">{e.participants.length?czechCount(e.participants.length,"účastník","účastníci","účastníků"):"Bez účastníků"}</span>
        </div>
      </div>
    </div>
  </div>;
}

function EventCard({event:e,people,currentPerson,today,past=false,onOpen,onDelete}:{event:EventItem;people:Person[];currentPerson:Person|null;today:string;past?:boolean;onOpen:()=>void;onDelete:()=>void}){
  const cat=EVENT_CATEGORIES[e.category??"other"];
  const d=new Date(`${e.date}T12:00:00`);
  return <div onClick={onOpen} className={`app-card group relative cursor-pointer overflow-hidden rounded-2xl border p-4 pl-5 transition hover:-translate-y-0.5 ${past?"opacity-60 hover:opacity-100":""}`} style={{borderColor:`${cat.color}28`}}>
    <div className="absolute inset-y-0 left-0 w-1" style={{background:cat.color}}/>
    <div className="flex items-center gap-3">
      <div className="flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl border" style={{borderColor:`${cat.color}40`,background:`${cat.color}14`}}>
        <div className="text-[9px] font-black uppercase tracking-wider" style={{color:cat.color}}>{d.toLocaleDateString("cs-CZ",{month:"short"}).replace(".","")}</div>
        <div className="text-2xl font-black leading-none text-white">{d.getDate()}</div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase text-slate-400">{d.toLocaleDateString("cs-CZ",{weekday:"short"})}</div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold">{e.title}</h3>
        <div className="mt-1 truncate text-xs text-slate-400">{cat.emoji} {cat.label}{e.time?` · ${e.time}`:""}{e.place?` · ${e.place}`:""}</div>
        <div className={`mt-1 text-[10px] font-black uppercase tracking-wider ${past?"text-slate-500":e.date===today?"text-emerald-300":"theme-text"}`}>{past?"Proběhlo":dateCountdown(e.date,today)}</div>
      </div>
      <div className="flex -space-x-2">{e.participants.slice(0,3).map(id=>{const p=people.find(x=>x.id===id);return p?<div key={id} className="rounded-full ring-2 ring-[#16100b]"><Avatar person={p} size={26}/></div>:null;})}{e.participants.length>3&&<div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold ring-2 ring-[#16100b]">+{e.participants.length-3}</div>}</div>
    </div>
    {(currentPerson?.authId===e.createdBy||isAdminEmail(currentPerson?.email))&&<button type="button" onClick={ev=>{ev.stopPropagation();onDelete();}} className="absolute right-3 top-2 text-[10px] text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100">Smazat</button>}
  </div>;
}

function EventsPage({events,people,currentPerson,openCreate,deleteEvent,onEditEvent}:{onEditEvent:(e:EventItem)=>void;events:EventItem[];people:Person[];currentPerson:Person|null;openCreate:()=>void;deleteEvent:(id:string)=>Promise<void>}){
  const [selectedEvent,setSelectedEvent]=useState<EventItem|null>(null);
  const [category,setCategory]=useState<EventCategory|"all">("all");
  const [showPast,setShowPast]=useState(false);
  const today=isoToday();
  const monthKey=today.slice(0,7);

  const filtered=events.filter(e=>category==="all"||(e.category??"other")===category);
  const upcoming=filtered.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const past=filtered.filter(e=>e.date<today).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
  const hero=upcoming[0]??null;
  const rest=upcoming.slice(1);

  const groups:{key:string;items:EventItem[]}[]=[];
  for(const e of rest){const key=e.date.slice(0,7);const g=groups.find(x=>x.key===key);if(g)g.items.push(e);else groups.push({key,items:[e]});}

  const allUpcoming=events.filter(e=>e.date>=today);
  const usedCategories=new Set(events.map(e=>e.category??"other"));
  const countByCat=(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map(c=>({c,count:allUpcoming.filter(e=>(e.category??"other")===c).length})).filter(x=>x.count>0);
  const maxCat=Math.max(1,...countByCat.map(x=>x.count));

  const confirmDelete=(e:EventItem)=>{if(confirm(`Opravdu smazat událost „${e.title}“?`))deleteEvent(e.id);};
  const card=(e:EventItem,isPast=false)=><EventCard key={e.id} event={e} people={people} currentPerson={currentPerson} today={today} past={isPast} onOpen={()=>setSelectedEvent(e)} onDelete={()=>confirmDelete(e)}/>;

  return <div>
    <PageHeader eyebrow="PLÁNY" title="Události" description="Společné akce, výlety, sport a další plány." action={<button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white"><Icon name="plus" size={16}/>Nová událost</button>}/>
    <AutumnSectionTitle text="Podzimní plány"/>

    <div className="mb-6 flex flex-wrap gap-2">
      <FilterButton active={category==="all"} onClick={()=>setCategory("all")} label={`Vše (${events.length})`}/>
      {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).filter(c=>usedCategories.has(c)).map(c=>{const cat=EVENT_CATEGORIES[c];return <FilterButton key={c} active={category===c} onClick={()=>setCategory(c)} label={`${cat.emoji} ${cat.label}`} color={cat.color}/>;})}
    </div>

    {events.length===0
      ?<div className="rounded-3xl border border-dashed border-orange-300/10 bg-orange-300/[0.025] py-16 text-center"><div className="text-5xl">🍂</div><div className="mt-4 text-base font-semibold text-slate-300">Zatím žádná událost</div><p className="mt-1 text-xs text-slate-500">Naplánuj sport, výlet nebo cokoli jiného.</p></div>
      :<div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {hero?<EventHero event={hero} people={people} today={today} onOpen={()=>setSelectedEvent(hero)}/>:<div className="mb-8"><Empty text="Žádné nadcházející události v téhle kategorii."/></div>}

          {groups.map(g=><section key={g.key} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xs font-black uppercase tracking-[.16em] text-orange-300/80">{new Date(`${g.key}-01T12:00:00`).toLocaleDateString("cs-CZ",{month:"long",year:"numeric"})}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-orange-400/30 to-transparent"/>
              <span className="text-[10px] font-bold text-slate-500">{g.items.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">{g.items.map(e=>card(e))}</div>
          </section>)}

          {past.length>0&&<section>
            <button type="button" onClick={()=>setShowPast(v=>!v)} className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-slate-500 transition hover:text-slate-300">Proběhlé<span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{past.length}</span><span className="text-[10px]">{showPast?"▲ skrýt":"▼ zobrazit"}</span></button>
            {showPast&&<div className="grid gap-3 md:grid-cols-2">{past.map(e=>card(e,true))}</div>}
          </section>}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <Card className="p-5">
            <h2 className="font-bold">Přehled</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-black/20 p-3 text-center"><div className="text-2xl font-black">{allUpcoming.length}</div><div className="mt-0.5 text-[10px] text-slate-500">nadcházející</div></div>
              <div className="rounded-xl bg-black/20 p-3 text-center"><div className="text-2xl font-black">{events.filter(e=>e.date.slice(0,7)===monthKey).length}</div><div className="mt-0.5 text-[10px] text-slate-500">tento měsíc</div></div>
              <div className="rounded-xl bg-black/20 p-3 text-center"><div className="text-2xl font-black">{events.filter(e=>e.date===today).length}</div><div className="mt-0.5 text-[10px] text-slate-500">dnes</div></div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Podle kategorie</h2>
            <p className="mt-1 text-xs text-slate-500">Nadcházející události</p>
            <div className="mt-4 space-y-3">
              {countByCat.length===0?<div className="text-xs text-slate-600">Zatím nic.</div>:countByCat.map(({c,count})=>{const cat=EVENT_CATEGORIES[c];return <button type="button" key={c} onClick={()=>setCategory(category===c?"all":c)} className="block w-full text-left">
                <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-slate-200">{cat.emoji} {cat.label}</span><span className="font-black" style={{color:cat.color}}>{count}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full" style={{width:`${(count/maxCat)*100}%`,background:cat.color}}/></div>
              </button>;})}
            </div>
          </Card>
        </aside>
      </div>}
    {selectedEvent&&<EventDetailModal event={selectedEvent} people={people} onClose={()=>setSelectedEvent(null)} onEdit={isAdminEmail(currentPerson?.email)?()=>{const ev=selectedEvent;setSelectedEvent(null);onEditEvent(ev);}:undefined}/>}
  </div>
}

function StatsPage({stats,selectedId,setSelectedId,statsView,setStatsView,statsMonthKey,setStatsMonthKey,statsWeekStart,setStatsWeekStart,statsPeriod}:{stats:{person:Person;shifts:number;hours:number;minutes:number;totalMinutes:number;averageMinutesPerWeek:number;ratingAverage:number|null;ratedShifts:number;morning:number;afternoon:number;intershift:number;night:number;midnight:number;all_day:number;emergency:number;vacation:number;sick:number}[];selectedId:string|null;setSelectedId:(id:string)=>void;statsView:"months"|"weeks";setStatsView:(v:"months"|"weeks")=>void;statsMonthKey:string|null;setStatsMonthKey:(v:string|null)=>void;statsWeekStart:string|null;setStatsWeekStart:(v:string|null)=>void;statsPeriod:{start:string;end:string}|null}){
  const selected=stats.find(s=>s.person.id===selectedId)||stats[0];
  const monthParts=statsMonthKey?statsMonthKey.split("-").map(Number):null;
  const monthWeeks=monthParts?getMonthWeeks(monthParts[0],monthParts[1]-1):[];
  const pill=(active:boolean)=>`rounded-xl border px-4 py-2 text-xs font-semibold transition ${active?"theme-soft theme-border text-white":"border-white/[0.08] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-white"}`;
  const [statsYear,setStatsYear]=useState(new Date().getFullYear());
  const allMonths=getStatsMonths();
  const minYear=allMonths[0]?.year??new Date().getFullYear();
  const maxYear=allMonths[allMonths.length-1]?.year??minYear;
  const yearShown=monthParts?monthParts[0]:statsYear;
  const changeYear=(dir:number)=>{
    const year=yearShown+dir;
    const list=allMonths.filter(m=>m.year===year);
    if(!list.length) return;
    setStatsYear(year);
    setStatsWeekStart(null);
    setStatsView("months");
    if(monthParts){
      const wanted=monthParts[1]-1;
      const target=list.find(m=>m.month===wanted)??(wanted<list[0].month?list[0]:list[list.length-1]);
      setStatsMonthKey(target.key);
    }
  };
  const periodLabel=statsPeriod?`${new Date(`${statsPeriod.start}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric",year:"numeric"})} – ${new Date(`${statsPeriod.end}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric",year:"numeric"})}`:"Všechny uložené směny";

  const printStats = () => {
    const maxMinutes = Math.max(1, ...stats.map(s => s.totalMinutes));
    const rows = stats.map(s => `<tr><td><strong>${escapePrintHtml(s.person.name)}</strong></td><td>${s.shifts}</td><td>${escapePrintHtml(formatWorkedMinutes(s.totalMinutes))}</td><td>${escapePrintHtml((s.averageMinutesPerWeek/60).toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1}) + " h")}</td><td>${s.ratingAverage===null?"—":escapePrintHtml(`${s.ratingAverage.toFixed(1)}/5 (${s.ratedShifts}×)`)}</td></tr>`).join("");
    const bars = stats.map(s => `<div class="bar-row"><strong>${escapePrintHtml(s.person.name)}</strong><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,(s.totalMinutes/maxMinutes)*100)}%"></div></div><div>${escapePrintHtml(formatWorkedMinutes(s.totalMinutes))}</div></div>`).join("");
    const selectedDetail = selected ? `<h2>Detail – ${escapePrintHtml(selected.person.name)}</h2><div class="summary"><div class="box">Směny<strong>${selected.shifts}</strong></div><div class="box">Čas<strong>${escapePrintHtml(formatWorkedMinutes(selected.totalMinutes))}</strong></div><div class="box">Průměr / týden<strong>${escapePrintHtml((selected.averageMinutesPerWeek/60).toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1}) + " h")}</strong></div><div class="box">Hodnocení<strong>${selected.ratingAverage===null?"—":escapePrintHtml(selected.ratingAverage.toFixed(1)+"/5")}</strong></div></div><table><thead><tr><th>Ranní</th><th>Odpolední</th><th>Mezisměna</th><th>Noční</th><th>Polonoc</th><th>Celodenní</th><th>Mimořádná</th><th>Dovolená</th><th>Nemoc</th></tr></thead><tbody><tr><td>${selected.morning}</td><td>${selected.afternoon}</td><td>${selected.intershift}</td><td>${selected.night}</td><td>${selected.midnight}</td><td>${selected.all_day}</td><td>${selected.emergency}</td><td>${selected.vacation}</td><td>${selected.sick}</td></tr></tbody></table>` : "";

    openPrintWindow(
      "Směnovník – statistiky",
      `<div class="header"><h1>Směnovník – statistiky</h1><div class="muted">Období: ${escapePrintHtml(periodLabel)}</div></div>
       <table><thead><tr><th>Osoba</th><th>Počet směn</th><th>Odpracováno</th><th>Průměr za týden</th><th>Hodnocení</th></tr></thead><tbody>${rows}</tbody></table>
       <h2>Porovnání odpracovaných hodin</h2>${bars}
       ${selectedDetail}
       <div class="foot">U Tibíka, Kuby a Lucky se z každé odpracované směny automaticky odečítá 30 minut neplacené pauzy. Dovolená a nemoc se do odpracovaného času nezapočítávají.</div>`,
      true
    );
  };
  return <div>
    <PageHeader eyebrow="ČÍSLA" title="Statistiky" description="Směny a odpracované hodiny všech členů." action={<button type="button" onClick={printStats} className="flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"><Icon name="chart" size={16}/>Vytisknout report</button>}/>
    <AutumnSectionTitle text="Podzimní statistiky"/>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex flex-wrap gap-2">
        {statsView==="months"
          ? <>
              <button onClick={()=>{setStatsMonthKey(null);setStatsWeekStart(null);}} className={pill(statsMonthKey===null)}>Celkem</button>
              {allMonths.filter(m=>m.year===yearShown).map(m=><button key={m.key} onClick={()=>{setStatsMonthKey(m.key);setStatsWeekStart(null);setStatsView("weeks");}} className={pill(statsMonthKey===m.key)}>{CZ_MONTHS[m.month]}</button>)}
            </>
          : <>
              <button onClick={()=>{setStatsWeekStart(null);setStatsView("months");}} className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05] hover:text-white"><Icon name="left" size={14}/>Měsíce</button>
              <button onClick={()=>setStatsWeekStart(null)} className={pill(statsWeekStart===null)}>Celý měsíc</button>
              {monthWeeks.map(w=><button key={w.start} onClick={()=>setStatsWeekStart(w.start)} className={pill(statsWeekStart===w.start)}>{formatWeekRange(w)}</button>)}
            </>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={()=>changeYear(-1)} disabled={yearShown<=minYear} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.025]" aria-label="Předchozí rok"><Icon name="left" size={17}/></button>
        <div className="min-w-[76px] rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-center text-xs font-semibold text-slate-300">{yearShown}</div>
        <button onClick={()=>changeYear(1)} disabled={yearShown>=maxYear} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.025]" aria-label="Další rok"><Icon name="right" size={17}/></button>
      </div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <Card className="p-4"><div className="space-y-2">{stats.map(s=><button key={s.person.id} onClick={()=>setSelectedId(s.person.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selected?.person.id===s.person.id?"bg-white/[0.07]":"hover:bg-white/[0.03]"}`}><Avatar person={s.person} size={38}/><div><div className="text-sm font-semibold">{s.person.name}</div><div className="text-xs text-slate-500">{s.shifts} směn · {s.hours} h {s.minutes} min</div></div></button>)}</div></Card>
      <div className="space-y-5">
        {selected&&<Card className="p-6"><div className="flex items-center gap-4"><Avatar person={selected.person} size={54}/><div><h2 className="text-xl font-bold">{selected.person.name}</h2><p className="text-sm text-slate-500">Osobní statistiky · {periodLabel}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"><StatBox label="Směny" value={selected.shifts}/><StatBox label="Čas" value={`${selected.hours} h ${selected.minutes} min`}/><StatBox label="Průměr za týden" value={`${(selected.averageMinutesPerWeek/60).toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1})} h`}/><StatBox label="Průměrné hodnocení" value={selected.ratingAverage===null?"—":`${selected.ratingAverage.toFixed(1)}/5 (${selected.ratedShifts}×)`}/><StatBox label="Ranní" value={selected.morning} color={shiftInfo.morning.color}/><StatBox label="Odpolední" value={selected.afternoon} color={shiftInfo.afternoon.color}/><StatBox label="Mezisměna" value={selected.intershift} color={shiftInfo.intershift.color}/><StatBox label="Noční" value={selected.night} color={shiftInfo.night.color}/><StatBox label="Polonoc" value={selected.midnight} color={shiftInfo.midnight.color}/><StatBox label="Celodenní" value={selected.all_day} color={shiftInfo.all_day.color}/><StatBox label="Mimořádná směna" value={selected.emergency} color={shiftInfo.emergency.color}/><StatBox label="Dovolená" value={selected.vacation} color={shiftInfo.vacation.color}/><StatBox label="Nemoc" value={selected.sick} color={shiftInfo.sick.color}/></div></Card>}
        <Card className="p-6"><h2 className="font-bold">Porovnání všech</h2><div className="mt-5 space-y-3">{stats.map(s=><div key={s.person.id} className="flex items-center gap-3"><Avatar person={s.person} size={32}/><div className="w-24 text-sm font-semibold">{s.person.name}</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full" style={{width:`${Math.min(100,(s.totalMinutes/Math.max(1,...stats.map(x=>x.totalMinutes)))*100)}%`,background:`linear-gradient(90deg,${s.person.color},${s.person.color}99)`}}/></div><div className="w-16 text-right text-xs text-slate-500">{s.hours} h {s.minutes} min</div></div>)}</div></Card>
      </div>
    </div>
  </div>
}
function StatBox({label,value,color}:{label:string;value:ReactNode;color?:string}){return <div className="rounded-2xl border bg-white/[0.025] p-4" style={color?{borderColor:`${color}30`,background:`linear-gradient(135deg, ${color}10, rgba(255,255,255,.015))`}:{borderColor:"rgba(255,255,255,.05)"}}><div className="text-xs" style={color?{color}:{color:"#64748b"}}>{label}</div><div className="mt-1 text-2xl font-black text-white">{value}</div></div>}

function AdminMembersPanel({members,setPeople}:{members:Person[];setPeople:React.Dispatch<React.SetStateAction<Person[]>>}){
  const[drafts,setDrafts]=useState<Record<string,{name:string;birthday:string}>>({});
  const[msg,setMsg]=useState("");
  const get=(p:Person)=>drafts[p.id]??{name:p.name,birthday:p.birthday||""};
  const save=async(p:Person)=>{
    const d=get(p);
    if(!d.name.trim()){setMsg("Jméno nesmí být prázdné.");return;}
    const{error}=await supabase.from("users").update({name:d.name.trim(),birthday:d.birthday||null}).eq("id",p.id);
    if(error){setMsg(`Nepodařilo se uložit: ${error.message}`);return;}
    setPeople(prev=>prev.map(x=>x.id===p.id?{...x,name:d.name.trim(),birthday:d.birthday||null}:x));
    setDrafts(prev=>{const n={...prev};delete n[p.id];return n;});
    setMsg(`Uloženo: ${d.name.trim()}.`);
  };
  const field="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm outline-none focus:border-orange-300/40";
  return <div className="mt-5 rounded-2xl border border-orange-300/15 bg-orange-400/[0.04] p-4"><div className="flex items-center gap-2 font-semibold"><span>🛡️</span>Správa členů (admin)</div><p className="mt-2 text-xs leading-5 text-slate-500">Uprav jméno a datum narození kohokoli.</p><div className="mt-3 space-y-2">{members.map(p=>{const d=get(p);const changed=d.name!==p.name||d.birthday!==(p.birthday||"");return <div key={p.id} className="flex flex-wrap items-center gap-2"><Avatar person={p} size={30}/><input value={d.name} onChange={e=>setDrafts(prev=>({...prev,[p.id]:{...d,name:e.target.value}}))} className={`${field} min-w-[120px] flex-1`}/><input type="date" value={d.birthday} onChange={e=>setDrafts(prev=>({...prev,[p.id]:{...d,birthday:e.target.value}}))} className={field}/><button type="button" disabled={!changed} onClick={()=>save(p)} className="rounded-xl theme-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-30">Uložit</button></div>;})}</div>{msg&&<div className="mt-3 text-xs text-emerald-300">{msg}</div>}</div>;
}

function SettingsPage({currentPerson,setPeople,members,themeColor,setThemeColor,themeColor2,setThemeColor2,themeMode,setThemeMode,animationsEnabled,setAnimationsEnabled}:{members?:Person[];currentPerson:Person|null;setPeople:React.Dispatch<React.SetStateAction<Person[]>>;themeColor:string;setThemeColor:(v:string)=>void;themeColor2:string;setThemeColor2:(v:string)=>void;themeMode:ThemePref;setThemeMode:(v:ThemePref)=>void;animationsEnabled:boolean;setAnimationsEnabled:(v:boolean)=>void}){
  const [oldPassword,setOldPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [newAgain,setNewAgain]=useState("");
  const [message,setMessage]=useState("");
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const [birthday,setBirthday]=useState(currentPerson?.birthday || "");
  const [birthdaySaving,setBirthdaySaving]=useState(false);
  const [birthdayMessage,setBirthdayMessage]=useState("");
  useEffect(()=>{setBirthday(currentPerson?.birthday || "");setBirthdayMessage("");},[currentPerson?.id,currentPerson?.birthday]);
  const saveBirthday=async()=>{
    if(!currentPerson)return;
    setBirthdaySaving(true);setBirthdayMessage("");
    const value=birthday || null;
    const {error}=await supabase.from("users").update({birthday:value}).eq("id",currentPerson.id);
    if(error)setBirthdayMessage(`Nepodařilo se uložit: ${error.message}`);
    else{setPeople(prev=>prev.map(p=>p.id===currentPerson.id?{...p,birthday:value}:p));setBirthdayMessage(value?"Datum narození bylo uloženo. 🎂":"Datum narození bylo odebráno.");}
    setBirthdaySaving(false);
  };
  const uploadAvatar=async(file?:File)=>{if(!currentPerson||!file)return;setUploadingAvatar(true);setMessage("");const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";const path=`${currentPerson.id}/avatar.${ext}`;const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type||undefined});if(uploadError){setMessage(`Fotku se nepodařilo nahrát: ${uploadError.message}`);setUploadingAvatar(false);return;}const {data}=supabase.storage.from("avatars").getPublicUrl(path);const url=`${data.publicUrl}?v=${Date.now()}`;const {error}=await supabase.from("users").update({avatar:url}).eq("id",currentPerson.id);if(error)setMessage(`Fotka se nahrála, ale neuložila k profilu: ${error.message}`);else{setPeople(prev=>prev.map(p=>p.id===currentPerson.id?{...p,avatar:url}:p));setMessage("Profilová fotka byla uložena.");}setUploadingAvatar(false);};
  const changePassword=async()=>{if(!currentPerson)return;if(newPassword!==newAgain){setMessage("Nová hesla se neshodují.");return;}if(newPassword.length<6){setMessage("Nové heslo musí mít alespoň 6 znaků.");return;}const {error:loginErr}=await supabase.auth.signInWithPassword({email:currentPerson.email,password:oldPassword});if(loginErr){setMessage("Staré heslo není správně.");return;}const {error}=await supabase.auth.updateUser({password:newPassword});if(error)setMessage(error.message);else{setMessage("Heslo bylo úspěšně změněno.");setOldPassword("");setNewPassword("");setNewAgain("");}};

  const themePresets=["#8b4a2f","#9a4f2c","#ad633f","#c47a45","#7b5b47","#8f6b4f","#6f8f72","#b84a3a"];
  return <div><PageHeader eyebrow="ÚČET" title="Nastavení" description="Profil, vzhled webu a zabezpečení."/><AutumnSectionTitle text="Podzimní nastavení"/><div className="grid gap-5 xl:grid-cols-2">
    <Card className="p-6"><div className="flex items-center gap-2"><Icon name="camera" size={18}/><h2 className="font-bold">Profil</h2></div>{currentPerson&&<>
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-black/20 p-4"><Avatar person={currentPerson} size={68}/><div><div className="font-bold">{currentPerson.name}</div><div className="text-xs text-slate-500">{currentPerson.email}</div><div className="mt-1 text-[11px] text-slate-600">Profilová barva je pevná; vzhled webu nastavíš vedle.</div></div></div>
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/15 p-4"><div className="flex items-center gap-2 font-semibold"><Icon name="camera" size={17}/>Profilová fotka</div><p className="mt-2 text-xs text-slate-600">JPG, PNG nebo WEBP.</p><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-xs font-semibold hover:bg-white/[0.07]"><Icon name="camera" size={15}/>{uploadingAvatar?"Nahrávám…":"Vybrat a uložit fotku"}<input disabled={uploadingAvatar} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>uploadAvatar(e.target.files?.[0])}/></label></div>
      {isAdminEmail(currentPerson?.email)&&members&&<AdminMembersPanel members={members} setPeople={setPeople}/>}<div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/15 p-4"><div className="flex items-center gap-2 font-semibold"><span>🎂</span>Narozeniny</div><p className="mt-2 text-xs leading-5 text-slate-600">Nastav celé datum narození. Ostatní ho uvidí v kalendáři a v den narozenin se automaticky zobrazí i tvůj aktuální věk.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><div className="flex-1"><Input label="Datum narození" type="date" value={birthday} onChange={setBirthday}/></div><button type="button" onClick={saveBirthday} disabled={birthdaySaving} className="h-[46px] rounded-xl theme-primary px-5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50">{birthdaySaving?"Ukládám…":"Uložit narozeniny"}</button>{birthday&&<button type="button" onClick={()=>setBirthday("")} className="h-[46px] rounded-xl border border-white/[0.08] px-4 text-xs text-slate-400 hover:bg-white/[0.04]">Vymazat</button>}</div>{birthdayMessage&&<div className="mt-3 text-xs text-slate-400">{birthdayMessage}</div>}</div>
    </>}</Card>
    <Card className="p-6"><div className="flex items-center gap-2"><Icon name="palette" size={18}/><h2 className="font-bold">Vzhled webu</h2></div><p className="mt-4 text-sm text-slate-400">Namíchej si vlastní kombinaci dvou barev. Použije se na pozadí, tlačítka, aktivní navigaci, zvýraznění a glow efekty.</p>
      <div className="mt-5 rounded-2xl border theme-border bg-black/20 p-4">
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/[0.07] p-4" style={{background:`radial-gradient(circle at 20% 20%, ${themeColor}33, transparent 38%), radial-gradient(circle at 80% 20%, ${themeColor2}2e, transparent 42%), linear-gradient(135deg,#0a0d16,#070911)`}}>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Náhled kombinace</div>
          <div className="mt-3 h-11 rounded-xl shadow-lg" style={{background:`linear-gradient(135deg,${themeColor},${themeColor2})`}}/>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 hover:bg-white/[0.04]">
            <input type="color" value={themeColor} onChange={e=>setThemeColor(e.target.value)} className="h-12 w-12 cursor-pointer rounded-full border-0 bg-transparent p-0"/>
            <div><div className="text-xs font-semibold text-slate-300">První barva</div><div className="mt-0.5 text-[11px] text-slate-600">{themeColor.toUpperCase()}</div></div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 hover:bg-white/[0.04]">
            <input type="color" value={themeColor2} onChange={e=>setThemeColor2(e.target.value)} className="h-12 w-12 cursor-pointer rounded-full border-0 bg-transparent p-0"/>
            <div><div className="text-xs font-semibold text-slate-300">Druhá barva</div><div className="mt-0.5 text-[11px] text-slate-600">{themeColor2.toUpperCase()}</div></div>
          </label>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold text-slate-500">Rychlé první barvy</div>
          <div className="flex flex-wrap gap-2">{themePresets.map(c=><button key={c} onClick={()=>setThemeColor(c)} className="h-8 w-8 rounded-full border transition hover:scale-110" style={{background:c,borderColor:themeColor===c?"white":"rgba(255,255,255,.12)",boxShadow:themeColor===c?`0 0 20px ${c}55`:"none"}} aria-label={`Nastavit první barvu ${c}`}/>)}</div>
        </div>
        <div className="mt-4 text-[11px] text-slate-600">Kombinace se ukládá automaticky pro tvůj účet v tomto prohlížeči.</div>
        <button onClick={()=>{setThemeColor(APP_ACCENT);setThemeColor2(APP_ACCENT_SECONDARY);}} className="mt-4 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-white">Vrátit výchozí vzhled</button>
      </div>
    </Card>
    <Card className="p-6 xl:col-span-2"><div className="flex items-center gap-2"><Icon name="leaf" size={18}/><h2 className="font-bold">Sezónní vzhled a animace</h2></div><p className="mt-3 text-sm text-slate-400">Přepni mezi podzimním Směnovníkem {APP_VERSION} a původním klasickým vzhledem. Animace lze vypnout zvlášť.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([
  ["auto", "🗓️", "Automaticky", "Listopad Halloween, ostatní měsíce podzim."],
  ["autumn", "🍁", "Podzimní", "Měděná, oranžová, listí."],
  ["classic", "✨", "Klasický", "Původní barevný Směnovník."],
  ["halloween", "🎃", "Halloween", "Dýně, netopýři, blikající strašidelné domky."],
] as [ThemePref, string, string, string][]).map(([key, emoji, label, desc]) => {
  const locked = key === "halloween" && halloweenLocked();
  return <button type="button" key={key} disabled={locked} aria-disabled={locked} onClick={() => { if (!locked) setThemeMode(key); }} className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${locked ? "cursor-not-allowed border-white/[0.08] bg-black/15" : themeMode === key ? "theme-border theme-soft" : "border-white/[0.08] bg-black/15"}`}>
    <div className={locked ? "opacity-40" : ""}><div className="text-2xl">{emoji}</div><div className="mt-2 font-bold">{label}</div><div className="mt-1 text-xs text-slate-500">{desc}</div></div>
    {locked && <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="100" stroke="#f87171" strokeWidth="2" vectorEffect="non-scaling-stroke" /><line x1="100" y1="0" x2="0" y2="100" stroke="#f87171" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
      <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/80 px-2 py-1.5 text-center text-[11px] font-bold text-red-300">Ještě si počkej, 31. 10. se to přepne</div>
    </>}
  </button>;
})}</div><button type="button" onClick={()=>setAnimationsEnabled(!animationsEnabled)} className="relative mt-4 flex w-full items-center justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left"><div className="pointer-events-none absolute -left-3 -bottom-6 text-7xl opacity-[0.08]">🍂</div><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/[0.06] text-2xl">🍁</div><div><div className="text-sm font-bold">Animace</div><div className="mt-1 text-xs text-slate-500">Padání listí a další jemné pohyby.</div></div></div><div className={`relative h-7 w-12 rounded-full p-1 transition ${animationsEnabled?"bg-orange-500":"bg-slate-700"}`}><div className={`h-5 w-5 rounded-full bg-white transition ${animationsEnabled?"translate-x-5":""}`}/></div></button></Card>
    <Card className="p-6 xl:col-span-2"><div className="flex items-center gap-2"><Icon name="lock" size={18}/><h2 className="font-bold">Změna hesla</h2></div><div className="mt-5 grid gap-3 md:grid-cols-3"><PasswordInput label="Staré heslo" value={oldPassword} onChange={setOldPassword}/><PasswordInput label="Nové heslo" value={newPassword} onChange={setNewPassword}/><PasswordInput label="Nové heslo znovu" value={newAgain} onChange={setNewAgain}/></div><button onClick={changePassword} className="theme-primary mt-5 rounded-xl px-5 py-3 text-xs font-bold text-white hover:brightness-110">Změnit heslo</button>{message&&<div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-slate-400">{message}</div>}</Card>
  </div></div>
}
function PasswordInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type="password" value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div>}

function ShiftModal({person,editing,date,setDate,endDate,setEndDate,type,setType,start,setStart,end,setEnd,note,setNote,saving,onClose,onSave,onDelete,owners,ownerId,setOwnerId}:{owners?:Person[];ownerId?:string;setOwnerId?:(id:string)=>void;person:Person;editing:Shift|null;date:string;setDate:(v:string)=>void;endDate:string;setEndDate:(v:string)=>void;type:ShiftType;setType:(v:ShiftType)=>void;start:string;setStart:(v:string)=>void;end:string;setEnd:(v:string)=>void;note:string;setNote:(v:string)=>void;saving:boolean;onClose:()=>void;onSave:()=>void;onDelete:()=>void}){return <Modal onClose={onClose}><div className="flex items-center gap-3"><Avatar person={person} size={44}/><div><h2 className="font-bold">{editing?"Upravit směnu":"Přidat směnu"}</h2><p className="text-xs text-slate-500">{person.name}</p></div></div><div className="mt-5 space-y-4">{owners&&!editing&&<div><label className="mb-2 block text-xs text-slate-400">Pro koho (admin)</label><select value={ownerId??""} onChange={e=>setOwnerId?.(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45">{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>}<div><label className="mb-2 block text-xs text-slate-400">{type==="vacation"?"Datum od":"Datum"}</label><input type="date" value={date} onChange={e=>{const value=e.target.value;setDate(value);if(type==="vacation"&&(!endDate||endDate<value))setEndDate(value);}} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div><div><label className="mb-2 block text-xs text-slate-400">Typ směny</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(shiftInfo) as ShiftType[]).map(t=><button key={t} onClick={()=>{setType(t);if(t==="vacation"){setEndDate(endDate||date);setStart("00:00");setEnd("23:59");}else if(t==="all_day"){setStart("00:00");setEnd("23:59");}else if(t==="intershift"){setStart("10:00");setEnd("18:00");}else if(t==="midnight"){setStart("00:00");setEnd("08:00");}}} className="flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold" style={type===t?{borderColor:`${shiftInfo[t].color}70`,background:`${shiftInfo[t].color}12`,color:shiftInfo[t].color}:{borderColor:"rgba(255,255,255,.06)",color:"#94a3b8"}}><Icon name={shiftInfo[t].icon} size={15}/>{shiftInfo[t].short}</button>)}</div></div>{type==="vacation"?<Input label="Datum do" type="date" value={endDate} onChange={setEndDate}/>:<div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div>}<div><label className="mb-2 block text-xs text-slate-400">Poznámka</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div></div><div className="mt-6 flex gap-2">{editing&&<button onClick={onDelete} className="rounded-xl border border-red-500/20 px-4 py-3 text-xs font-semibold text-red-400">Smazat</button>}<button onClick={onClose} className="ml-auto rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400">Zrušit</button><button onClick={onSave} disabled={saving} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110 disabled:opacity-50">{saving?"Ukládám…":"Uložit"}</button></div></Modal>}

function EventModal({people,onClose,onSave,initial}:{people:Person[];onClose:()=>void;onSave:(e:EventItem)=>Promise<void>;initial?:EventItem|null}){
  const[title,setTitle]=useState(initial?.title??"");
  const[date,setDate]=useState(initial?.date??"");
  const[time,setTime]=useState(initial?.time||"18:00");
  const[place,setPlace]=useState(initial?.place??"");
  const[description,setDescription]=useState(initial?.description??"");
  const[participants,setParticipants]=useState<string[]>(initial?.participants??[]);
  const[category,setCategory]=useState<EventCategory>(initial?.category??"sport");
  const[saving,setSaving]=useState(false);

  const submit=async()=>{
    if(!title.trim()||!date||saving)return;
    setSaving(true);
    await onSave({id:initial?.id??"",createdBy:initial?.createdBy,title:title.trim(),date,time,place:place.trim(),description:description.trim(),participants,category});
    setSaving(false);
  };

  return <Modal onClose={onClose}><h2 className="font-bold">{initial?"Upravit událost":"Nová událost"}</h2><div className="mt-5 space-y-4">
    <div>
      <label className="mb-2 block text-xs text-slate-400">Kategorie</label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map(c=>{const cat=EVENT_CATEGORIES[c];const active=category===c;return <button type="button" key={c} onClick={()=>setCategory(c)} className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition hover:-translate-y-0.5" style={active?{borderColor:`${cat.color}80`,background:`${cat.color}1c`,color:cat.color}:{borderColor:"rgba(255,255,255,.07)",color:"#94a3b8"}}><span className="text-xl">{cat.emoji}</span>{cat.label}</button>;})}
      </div>
    </div>
    <Input label="Název" value={title} onChange={setTitle}/><div className="grid grid-cols-2 gap-3"><ModernDateInput label="Datum" value={date} onChange={setDate}/><Input label="Čas" type="time" value={time} onChange={setTime}/></div><Input label="Místo" value={place} onChange={setPlace}/><div><label className="mb-2 block text-xs text-slate-400">Popis</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div><div><label className="mb-2 block text-xs text-slate-400">Účastníci</label><div className="flex flex-wrap gap-2">{people.map(p=><button type="button" key={p.id} onClick={()=>setParticipants(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={participants.includes(p.id)?{borderColor:`${p.color}60`,background:`${p.color}10`}:{borderColor:"rgba(255,255,255,.06)"}}><Avatar person={p} size={22}/>{p.name}</button>)}</div></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400 disabled:opacity-50">Zrušit</button><button type="button" onClick={submit} disabled={saving||!title.trim()||!date} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110 disabled:opacity-50">{saving?(initial?"Ukládám…":"Vytvářím…"):(initial?"Uložit změny":"Vytvořit")}</button></div></Modal>
}

function PracticeModal({initialDate,onClose,onSave}:{initialDate?:string;onClose:()=>void;onSave:(p:PracticeItem)=>void}){const[date,setDate]=useState(initialDate||"");const[start,setStart]=useState("07:00");const[end,setEnd]=useState("14:00");const[note,setNote]=useState("");return <Modal onClose={onClose}><div className="flex items-center gap-2"><Icon name="briefcase"/><h2 className="font-bold">Přidat Davčův praxi</h2></div><div className="mt-5 space-y-4"><Input label="Datum" type="date" value={date} onChange={setDate}/><div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div><Input label="Poznámka" value={note} onChange={setNote}/></div><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400">Zrušit</button><button onClick={()=>{if(date)onSave({id:crypto.randomUUID(),date,startTime:start,endTime:end,note})}} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110">Uložit</button></div></Modal>}

function DavidPracticeSchedule({practice,canEdit,onAdd,onDelete}:{practice:PracticeItem[];canEdit:boolean;onAdd:(date?:string)=>void;onDelete:(id:string)=>Promise<void>}){
  const days=nearestOddWeekDays();
  return <div className="relative overflow-hidden rounded-3xl school-card border border-[#5a4637]/55 bg-[linear-gradient(145deg,rgba(30,24,20,.97),rgba(15,13,12,.98))] p-5 shadow-[0_18px_50px_rgba(0,0,0,.28)] sm:p-6"><div className="pointer-events-none absolute -right-16 -top-14 text-7xl opacity-[0.05]">🍂</div><div className="relative mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6e5a49]/40 bg-[#2b241f] text-[#c9b7a7]"><Icon name="briefcase"/></div><div><h3 className="font-bold text-[#f1e7dc]">Davčův lichý týden – praxe</h3><p className="text-xs text-[#9f8d7e]">Klikni na den od pondělí do soboty a nastav čas od–do.</p></div></div><div className="relative grid gap-3 md:grid-cols-3 xl:grid-cols-6">{days.map(({day,date})=>{const item=practice.find(p=>p.date===date);return <button key={date} type="button" disabled={!canEdit} onClick={()=>onAdd(date)} className="school-plain min-h-[140px] rounded-2xl border border-[#6e5a49]/40 bg-[linear-gradient(145deg,rgba(53,43,35,.88),rgba(29,25,22,.94))] p-4 text-left transition hover:-translate-y-1 hover:border-[#8b735e]/65 hover:bg-[linear-gradient(145deg,rgba(63,51,41,.94),rgba(35,30,25,.96))] disabled:cursor-default"><div className="text-xs font-black text-[#d8c8b9]">{day}</div><div className="mt-1 text-[11px] text-[#7f7064]">{new Date(`${date}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})}</div>{item?<><div className="mt-5 text-lg font-black text-[#f4ece4]">{item.startTime}–{item.endTime}</div><div className="mt-2 line-clamp-2 text-xs text-[#a89687]">{item.note||"Praxe"}</div>{canEdit&&<span onClick={e=>{e.stopPropagation();onDelete(item.id)}} className="mt-3 inline-block text-[10px] text-red-400">Smazat</span>}</>:<><div className="mt-5 text-2xl text-[#8f7d6f] opacity-60">＋</div><div className="mt-2 text-xs text-[#8f7d6f]">{canEdit?"Nastavit praxi":"Bez zapsané praxe"}</div></>}</button>})}</div></div>
}

function ReviewsPage({ shifts, people, currentPerson, onRateShift }: { shifts: Shift[]; people: Person[]; currentPerson: Person | null; onRateShift: (shift: Shift, rating: number, reason: string, tramNumber: string, tramRating: TramRating | null) => Promise<boolean> }) {
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [showAllRated, setShowAllRated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const mine = useMemo(() => currentPerson ? shifts.filter(s => s.userId === currentPerson.id && shiftRatingAvailableAt(s) !== null) : [], [shifts, currentPerson]);
  const byNewest = (a: Shift, b: Shift) => shiftStartAt(b).getTime() - shiftStartAt(a).getTime();
  const missing = useMemo(() => mine.filter(s => s.rating === null && now >= shiftRatingAvailableAt(s)!.getTime()).sort(byNewest), [mine, now]);
  const rated = useMemo(() => mine.filter(s => s.rating !== null).sort(byNewest), [mine]);
  const average = rated.length > 0 ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length : null;
  const visibleRated = showAllRated ? rated : rated.slice(0, 10);
  const person = currentPerson;

  const rowHead = (s: Shift) => {
    const info = shiftInfo[s.type];
    return <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: `${info.color}40`, background: `${info.color}14`, color: info.color }}><Icon name={info.icon} size={18} /></div>
      <div className="min-w-0"><div className="truncate text-sm font-bold">{info.label}</div><div className="text-[11px] text-slate-500">{formatDate(s.date)} · {shiftTimeLabel(s)}</div></div>
    </div>;
  };

  return <div>
    <PageHeader eyebrow="SMĚNY" title="Recenze" description="Ohodnoť své odpracované směny. Tady najdeš ty, které ti ještě chybí." />
    {toast && <div className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm font-semibold text-emerald-200">{toast}</div>}

    <Card className="p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[.16em] text-amber-300/80">Čeká na ohodnocení<span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">{missing.length}</span></div>
      {missing.length === 0
        ? <Empty text="Všechno ohodnoceno. Chybějící recenze tu nemáš žádné. ⭐" />
        : <div className="space-y-2">{missing.map(s => <div key={s.id} role="button" tabIndex={0} onClick={() => setDetailShift(s)} onKeyDown={e => { if (e.key === "Enter") setDetailShift(s); }} className="cursor-pointer rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4 transition hover:bg-amber-400/[0.09]">
          {rowHead(s)}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(v => <button type="button" key={v} disabled={busy === s.id} onClick={async e => { e.stopPropagation(); setBusy(s.id); const ok = await onRateShift(s, v, "", s.tramNumber ?? "", s.tramRating); setBusy(null); if (ok) setToast("Hodnocení uloženo, díky!"); }} className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-50">{v === 0 ? "0★" : "★".repeat(v)}</button>)}
            <span className="ml-1 text-[11px] text-slate-500">nebo klepni na kartu a napiš proč</span>
          </div>
        </div>)}</div>}
    </Card>

    <Card className="mt-5 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-xs font-black uppercase tracking-[.16em] text-slate-500">Ohodnocené<span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{rated.length}</span>{average !== null && <span className="ml-auto text-[11px] normal-case tracking-normal text-amber-300">průměr {average.toFixed(1).replace(".", ",")} / 5 ★</span>}</div>
      {rated.length === 0
        ? <Empty text="Zatím žádná ohodnocená směna." />
        : <div className="space-y-2">{visibleRated.map(s => <button type="button" key={s.id} onClick={() => setDetailShift(s)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-black/10 p-4 text-left transition hover:bg-white/[0.04]">
          {rowHead(s)}
          <div className="text-right"><div className="text-base tracking-wider text-amber-300">{"★".repeat(s.rating ?? 0)}{"☆".repeat(5 - (s.rating ?? 0))}</div>{s.ratingReason && <div className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-500">{s.ratingReason}</div>}</div>
        </button>)}
          {rated.length > 10 && <button type="button" onClick={() => setShowAllRated(v => !v)} className="w-full rounded-xl border border-white/[0.08] py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/[0.04]">{showAllRated ? "Zobrazit méně" : `Zobrazit všech ${rated.length}`}</button>}
        </div>}
    </Card>

    {detailShift && <ShiftDetailModal shift={detailShift} person={person ? (people.find(x => x.id === detailShift.userId) ?? person) : null} editable onClose={() => setDetailShift(null)} onEdit={() => setDetailShift(null)} onSaveRating={onRateShift} />}
  </div>;
}

function UpdatesPage(){
  const UpdateList=({items}:{items:readonly string[]})=><div className="mt-5 space-y-3">{items.map((item,index)=><div key={item} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-4"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300"><Icon name="check" size={15}/></div><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-600">Změna {index+1}</div><div className="mt-1 text-sm text-slate-300">{item}</div></div></div>)}</div>;
  return <div>
    <PageHeader eyebrow="SMĚNOVNÍK" title="Aktualizace" description="Co je nového a co se změnilo."/>

    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <Card className="relative overflow-hidden p-6"><div className="text-5xl">🍁</div><div className="mt-5 text-3xl font-black">Aktualizace 2.0</div><div className="mt-2 text-sm text-slate-500">Podzimní aktualizace</div><div className="mt-6 rounded-2xl border border-orange-300/10 bg-orange-300/[0.04] p-4 text-sm leading-6 text-slate-300">Nový vzhled, přehlednější informace, lepší praxe, detail událostí a nové možnosti nastavení.</div></Card>
      <Card className="p-6"><h2 className="font-bold">Co přinesla verze 2.0</h2><UpdateList items={UPDATE_ITEMS_20}/></Card>
    </div>

    <div className="my-8 flex items-center gap-3"><div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-300/20 to-orange-300/40"/><div className="rounded-full border border-orange-300/20 bg-orange-400/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-orange-300">Aktualizace 2.1</div><div className="h-px flex-1 bg-gradient-to-l from-transparent via-orange-300/20 to-orange-300/40"/></div>

    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <Card className="relative overflow-hidden p-6"><div className="text-5xl">🖨️</div><div className="mt-5 text-3xl font-black">Aktualizace 2.1</div><div className="mt-2 text-sm text-slate-500">Tisk, přesnější čas a nové citáty</div><div className="mt-6 rounded-2xl border border-orange-300/10 bg-orange-300/[0.04] p-4 text-sm leading-6 text-slate-300">Přidali jsme tisk směn a statistik, přesnější počítání pracovní doby a nové denní motivační citáty.</div></Card>
      <Card className="p-6"><h2 className="font-bold">Co je nového ve verzi 2.1</h2><UpdateList items={UPDATE_ITEMS_21}/></Card>
    </div>

    <div className="my-8 flex items-center gap-3"><div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-300/20 to-orange-300/40"/><div className="rounded-full border border-orange-300/20 bg-orange-400/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-orange-300">Aktualizace 2.2</div><div className="h-px flex-1 bg-gradient-to-l from-transparent via-orange-300/20 to-orange-300/40"/></div>

    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <Card className="relative overflow-hidden p-6"><div className="text-5xl">📬</div><div className="mt-5 text-3xl font-black">Aktualizace 2.2</div><div className="mt-2 text-sm text-slate-500">Schránka, hodnocení směn a narozeniny</div><div className="mt-6 rounded-2xl border border-orange-300/10 bg-orange-300/[0.04] p-4 text-sm leading-6 text-slate-300">Přidali jsme zprávy a oznámení, hodnocení směn hvězdičkami, narozeniny členů a chytřejší události s kategoriemi.</div></Card>
      <Card className="p-6"><h2 className="font-bold">Co je nového ve verzi 2.2</h2><UpdateList items={UPDATE_ITEMS_22}/></Card>
    </div>
  </div>;
}

function UpdateIntroModal({onDone}:{onDone:()=>void}){return <Modal onClose={()=>{}}><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-400/10 text-3xl">🍂</div><div className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Směnovník {APP_VERSION}</div><h2 className="mt-2 text-2xl font-black">Vítej v aktualizaci {APP_VERSION}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Přidali jsme zprávy a oznámení, hodnocení směn, narozeniny a lepší události.</p></div><div className="mt-6 max-h-[42vh] space-y-2 overflow-y-auto pr-1">{UPDATE_ITEMS_22.map(item=><div key={item} className="flex gap-3 rounded-xl bg-white/[0.025] p-3"><span className="text-orange-300">✓</span><span className="text-sm text-slate-300">{item}</span></div>)}</div><button type="button" onClick={onDone} className="mt-6 w-full rounded-2xl theme-primary py-3.5 text-sm font-black text-white">Super, přečetl jsem si to</button></Modal>}

// Pixelová zvířátka, která občas přeběhnou (nebo přeletí) po obrazovce – každý člen má svoje.
// Mřížky „kostiček“; písmena odkazují do palety daného zvířete. Všechna zvířata hledí doprava (při chůzi doleva se zrcadlí).
type PixelAnimalKey = "cat_orange" | "cat_black" | "dog_black" | "dog_brown" | "parrot";
type PixelAnimal = {
  colors: Record<string, string>;
  fly: boolean;
  body: string[];            // 24×14 – chůze nebo let (tělo)
  bodyEyes?: [number, number][];  // oči nakreslené navíc přes tělo
  legsA?: string[]; legsB?: string[];   // chůze: dvě fáze nožiček (od řádku 11)
  wingUp?: string[]; wingDown?: string[]; // let: dvě fáze křídel
  eyeColor: string;
  sit: string[];             // 14×14 – sedí
  sitEyes: [number, number][];
};

const CAT_BODY = [
  ".................O....O.",
  ".................O....O.",
  ".O...............OOOOOO.",
  ".O...............OOWWOO.",
  ".O...............OEWWEO.",
  ".oO..............WWPPWW.",
  "..oOOOoOoOOWWWWWWBBBBBB.",
  "...OOoOoOOWWWWWWWWWSS...",
  "...OOOOWWWWWWWWWWWWWWW..",
  "....WWWWWWWWWWWWWWWWWW..",
  ".....WWWWWWWWWWWWWWW....",
];
const CAT_LEGS_A = [
  ".....WW..WW...WW.WW.....",
  ".....WW..WW...WW.WW.....",
  ".....WW..........WW.....",
];
const CAT_LEGS_B = [
  ".....WW..WW...WW.WW.....",
  ".....WW..WW...WW.WW.....",
  ".........WW...WW........",
];
const CAT_SIT = [
  "..............",
  "...O......O...",
  "...OOOOOOOO...",
  "...OOOWWOOO...",
  "...OOOWWOOO...",
  "...WWWWWWWW...",
  "...WWWPPWWW...",
  "....BBBBBB....",
  "...WWWSSWWW...",
  "..OOWWWWWWWW..",
  "..OOWWWWWWWWO.",
  "..OOWWWWWWWWOO",
  "..WWWWWWWWWW.O",
  "...WWW..WWW...",
];
const DOG_BODY = [
  "................D...D...",
  "...............DD..DD...",
  ".D.............DDDDDDD..",
  ".D.............DbDDDDb..",
  "DD.............DDMMMMMN.",
  ".DD.DDDDDDDDDDDDDDDDMMM.",
  "..DDDDDDDDDDDDDDDCCCCC..",
  "..DDDDDDDDDDDDDDDWWWWW..",
  "...DDDDDDDDDDDDDWWWWWW..",
  "...DDDDDDDDDDDDDWWWWW...",
  "....DDDDDDDDDDDDDDD.....",
];
const DOG_LEGS_A = [
  ".....DD..DD....DD.DD....",
  ".....DD..DD....DD.DD....",
  ".....WW...........WW....",
];
const DOG_LEGS_B = [
  ".....DD..DD....DD.DD....",
  ".....DD..DD....DD.DD....",
  ".........WW....WW.......",
];
const DOG_SIT = [
  "...D......D...",
  "...DD....DD...",
  "...DDDDDDDD...",
  "...DbDDDDbD...",
  "...DDMMMMDD...",
  "...DDMNNMDD...",
  "....CCCCCC....",
  "...DDWWWWDD...",
  "..DDDWWWWDDD..",
  "..DDDWWWWDDDD.",
  "..DDDWWWWDDD.D",
  "..DDDWWWWDDDDD",
  "..DDDWWWWDDD..",
  "..WWWWWWWWWW..",
];
const BIRD_BODY = [
  "........................",
  "........................",
  "........................",
  "........................",
  "...............RRRRR....",
  "..............RRRRRRKK..",
  "..........RRRRRRbbRRK...",
  ".....rRRRRRRRRRRbbRK....",
  "....rrRRRRRRRRRRRR......",
  ".....BrrRRRRRRRRR.......",
  "......BBBrRRRRR.........",
  ".........BBB.FF.........",
  "..........BB............",
  "..........B.............",
];
const BIRD_WING_UP = [
  "........................",
  "..........bb............",
  ".........bBB............",
  "........bBBBb...........",
  ".......bBBBBBb..........",
  "........BBBBBB..........",
];
const BIRD_WING_DOWN = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........rBBBBBBb........",
  "........BBBBBBBB........",
  ".........BBBBBBb........",
  "..........bBBBB.........",
  "...........bbb..........",
];
const BIRD_SIT = [
  "..............",
  "....RRRRRR....",
  "...RRRRRRRR...",
  "...RRRRRRRR...",
  "...RbRRRRbR...",
  "...RbbKKbbR...",
  "....bbKKbb....",
  "...RRRKKRRR...",
  "..BRRRRRRRRB..",
  ".BBRRrRRrRRBB.",
  ".BBRRRRRRRRBB.",
  ".BBRrRRRRrRBB.",
  "..BBRRRRRRBB..",
  "....FF..FF....",
];

const PIXEL_ANIMALS: Record<PixelAnimalKey, PixelAnimal> = {
  cat_orange: { colors: {"W": "#fffaf2", "O": "#e8923a", "o": "#c9712a", "B": "#1e2a44", "S": "#c9ced6", "E": "#2b1b10", "P": "#f4a6b0"}, fly: false, body: CAT_BODY, legsA: CAT_LEGS_A, legsB: CAT_LEGS_B, eyeColor: "#2b1b10", sit: CAT_SIT, sitEyes: [[4, 4], [9, 4]] },
  cat_black: { colors: {"W": "#2a2a31", "O": "#17171c", "o": "#222228", "B": "#b8344a", "S": "#e6c14a", "E": "#f2d03b", "P": "#7a4a58"}, fly: false, body: CAT_BODY, legsA: CAT_LEGS_A, legsB: CAT_LEGS_B, eyeColor: "#f2d03b", sit: CAT_SIT, sitEyes: [[4, 4], [9, 4]] },
  dog_black: { colors: {"D": "#1e1b1f", "b": "#b98a55", "M": "#b98a55", "N": "#0b0b0b", "C": "#c0392b", "W": "#efe8dc", "E": "#f1e4c8"}, fly: false, body: DOG_BODY, bodyEyes: [[18, 3], [21, 3]], legsA: DOG_LEGS_A, legsB: DOG_LEGS_B, eyeColor: "#f1e4c8", sit: DOG_SIT, sitEyes: [[5, 3], [8, 3]] },
  dog_brown: { colors: {"D": "#8a5a3c", "b": "#6e452b", "M": "#a8714c", "N": "#2a1a12", "C": "#d6e23a", "W": "#8a5a3c", "E": "#1a0f08"}, fly: false, body: DOG_BODY, bodyEyes: [[18, 3], [21, 3]], legsA: DOG_LEGS_A, legsB: DOG_LEGS_B, eyeColor: "#1a0f08", sit: DOG_SIT, sitEyes: [[5, 3], [8, 3]] },
  parrot: { colors: {"R": "#d4202c", "r": "#a8141f", "B": "#2f56c9", "b": "#6d94ee", "K": "#ece6d8", "F": "#a89f93", "E": "#14110f"}, fly: true, body: BIRD_BODY, bodyEyes: [[17, 5]], wingUp: BIRD_WING_UP, wingDown: BIRD_WING_DOWN, eyeColor: "#14110f", sit: BIRD_SIT, sitEyes: [[4, 3], [9, 3]] },
};

// Kdo má které zvíře (podle e-mailu přihlášeného člena). Ostatní (např. Admin) dostanou oranžovou kočku.
const PIXEL_ANIMAL_BY_EMAIL: Record<string, PixelAnimalKey> = {
  "jakub.proch145@seznam.cz": "cat_orange",
  "lucieannapilarova97@gmail.com": "cat_black",
  "dkudlata9@gmail.com": "dog_black",
  "08matytibi3115@gmail.com": "dog_brown",
  "matejuher15@gmail.com": "parrot",
};
function pixelAnimalFor(email?: string | null): PixelAnimalKey {
  return PIXEL_ANIMAL_BY_EMAIL[(email || "").toLowerCase()] ?? "cat_orange";
}

function pixelRects(rows: string[], y0: number, colors: Record<string, string>) {
  const out: ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || !colors[c]) { x++; continue; }
      let end = x;
      while (end + 1 < row.length && row[end + 1] === c) end++;
      out.push(<rect key={`${y0 + y}-${x}`} x={x} y={y0 + y} width={end - x + 1} height={1} fill={colors[c]} />);
      x = end + 1;
    }
  });
  return out;
}

function WalkingCat({ enabled, animal = "cat_orange" }: { enabled: boolean; animal?: PixelAnimalKey }) {
  // Zvíře chodí (papoušek létá) pořád: dojde na náhodné místo, chvíli sedí, kouká a mrká, a zase vyrazí.
  // Pohyb je jen přes CSS transform (řeší ho grafika), takže nelaguje; vsedě se nehýbe nic kromě mrknutí.
  const A = PIXEL_ANIMALS[animal] ?? PIXEL_ANIMALS.cat_orange;
  const CAT_W = 120;
  const [x, setX] = useState(-CAT_W - 20);
  const [mode, setMode] = useState<"walk" | "sit">("sit");
  const [dir, setDir] = useState<1 | -1>(1);
  const [dur, setDur] = useState(0);
  const xRef = useRef(-CAT_W - 20);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyRef = useRef(A.fly);
  flyRef.current = A.fly;

  const startWalk = () => {
    const vw = window.innerWidth;
    const desktop = vw >= 1024;
    // na počítači se vyhýbá postrannímu menu vlevo a ikonám zpráv/hvězdy/zvonku vpravo
    let min = desktop ? 270 : 8;
    let max = desktop ? vw - 330 : vw - CAT_W - 8;
    if (max - min < 160) { min = 8; max = Math.max(min + 160, vw - CAT_W - 8); }
    let target = min + Math.random() * (max - min);
    for (let i = 0; i < 6 && Math.abs(target - xRef.current) < 180; i++) target = min + Math.random() * (max - min);
    const distance = Math.abs(target - xRef.current);
    const speed = flyRef.current ? 120 + Math.random() * 40 : 55 + Math.random() * 20; // px za sekundu (pták letí rychleji)
    setDir(target >= xRef.current ? 1 : -1);
    setDur(distance / speed);
    setMode("walk");
    xRef.current = target;
    setX(target);
  };

  const onArrived = () => {
    setMode("sit");
    setDur(0);
    timer.current = setTimeout(startWalk, 4000 + Math.random() * 8000);
  };

  useEffect(() => {
    if (!enabled) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setTimeout(startWalk, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled || typeof document === "undefined") return null;
  const walking = mode === "walk";
  const eyeRects = (list: [number, number][]) => list.map(([ex, ey]) => <rect key={`${ex}-${ey}`} x={ex} y={ey} width={1} height={1} fill={A.eyeColor} />);
  // Vykresleno přímo do <body> (portál): téma ".autumn-theme > *" jinak přepíše position:fixed na relative
  // a zvíře by skončilo nulově vysoké na konci stránky.
  return createPortal(<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[35] overflow-hidden" style={{ position: "fixed", inset: 0, zIndex: 35, overflow: "hidden", contain: "paint" }}>
    <style>{`
      .cat-walker { top: calc(env(safe-area-inset-top, 0px) + 72px); bottom: auto; will-change: transform; }
      @media (min-width: 1024px) { .cat-walker { top: 6px; } }
      @keyframes catStepA { 0%, 49.9% { opacity: 1; } 50%, 100% { opacity: 0; } }
      @keyframes catStepB { 0%, 49.9% { opacity: 0; } 50%, 100% { opacity: 1; } }
      @keyframes catBlink { 0%, 93%, 100% { opacity: 1; } 94%, 98% { opacity: 0; } }
      @keyframes birdBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(9px); } }
      .cat-step-a { animation: catStepA .4s linear infinite; }
      .cat-step-b { animation: catStepB .4s linear infinite; }
      .bird-flap-a { animation: catStepA .26s linear infinite; }
      .bird-flap-b { animation: catStepB .26s linear infinite; }
      .cat-eyes { animation: catBlink 3.8s linear infinite; }
      .bird-bob { animation: birdBob .8s ease-in-out infinite; }
    `}</style>
    <div className="cat-walker absolute left-0" onTransitionEnd={e => { if (e.target === e.currentTarget && e.propertyName === "transform" && mode === "walk") onArrived(); }} style={{ width: CAT_W, height: 70, transform: `translateX(${x}px)`, transition: walking ? `transform ${dur}s linear` : "none" }}>
      {walking
        ? <div className={A.fly ? "bird-bob" : undefined}>
            <svg width={120} height={70} viewBox="0 0 24 14" shapeRendering="crispEdges" style={{ display: "block", transform: dir === -1 ? "scaleX(-1)" : undefined }}>
              <g>{pixelRects(A.body, 0, A.colors)}</g>
              {A.bodyEyes && <g>{eyeRects(A.bodyEyes)}</g>}
              {A.fly
                ? <>
                    <g className="bird-flap-a">{pixelRects(A.wingUp ?? [], 0, A.colors)}</g>
                    <g className="bird-flap-b">{pixelRects(A.wingDown ?? [], 0, A.colors)}</g>
                  </>
                : <>
                    <g className="cat-step-a">{pixelRects(A.legsA ?? [], 11, A.colors)}</g>
                    <g className="cat-step-b">{pixelRects(A.legsB ?? [], 11, A.colors)}</g>
                  </>}
            </svg>
          </div>
        : <svg width={70} height={70} viewBox="0 0 14 14" shapeRendering="crispEdges" style={{ display: "block", margin: "0 auto" }}>
            <g>{pixelRects(A.sit, 0, A.colors)}</g>
            <g className="cat-eyes">{eyeRects(A.sitEyes)}</g>
          </svg>}
    </div>
  </div>, document.body);
}

function ShiftSavedToast({animations}:{animations:boolean}){const mode=useContext(ThemeModeCtx);const pair=mode==="halloween"?["🎃","🦇"]:["🍂","🍁"];return <div className="pointer-events-none fixed inset-0 z-[140] flex items-start justify-center pt-24">{animations&&<div className="absolute inset-0 overflow-hidden">{Array.from({length:8},(_,i)=><span key={i} className="leaf-fall absolute -top-10 text-2xl" style={{left:`${(i*7)%100}%`,animationDelay:`${(i%6)*.12}s`,animationDuration:`${1.6+(i%4)*.25}s`}}>{i%2?pair[0]:pair[1]}</span>)}</div>}<div className="relative rounded-2xl border border-emerald-300/20 bg-[#0b1510]/95 px-5 py-3 shadow-2xl backdrop-blur-xl"><div className="flex items-center gap-3 text-sm font-bold text-emerald-200"><Icon name="check" size={18}/>Směna byla úspěšně uložena</div></div></div>}

const AUTUMN_FALLING_LEAVES = [
  {left:"5%",delay:"-2s",duration:"17s",size:"text-2xl",leaf:"🍂"},
  {left:"21%",delay:"-9s",duration:"20s",size:"text-3xl",leaf:"🍁"},
  {left:"39%",delay:"-5s",duration:"18s",size:"text-xl",leaf:"🍂"},
  {left:"58%",delay:"-13s",duration:"22s",size:"text-2xl",leaf:"🍁"},
  {left:"77%",delay:"-7s",duration:"19s",size:"text-3xl",leaf:"🍂"},
  {left:"94%",delay:"-16s",duration:"23s",size:"text-xl",leaf:"🍁"},
] as const;

const HW_FALLING = [
  { left: "6%", delay: "-3s", duration: "19s", size: "text-2xl", icon: "🎃" },
  { left: "22%", delay: "-10s", duration: "22s", size: "text-2xl", icon: "🦇" },
  { left: "40%", delay: "-6s", duration: "20s", size: "text-xl", icon: "🕸️" },
  { left: "58%", delay: "-14s", duration: "24s", size: "text-2xl", icon: "👻" },
  { left: "76%", delay: "-8s", duration: "21s", size: "text-xl", icon: "🍬" },
  { left: "93%", delay: "-17s", duration: "25s", size: "text-2xl", icon: "🦇" },
] as const;

const HOUSES = [
  { x: 20, w: 84, h: 62, r: 34, d: 0 },
  { x: 130, w: 64, h: 90, r: 38, d: 1.3 },
  { x: 225, w: 96, h: 70, r: 36, d: 2.1 },
  { x: 380, w: 70, h: 80, r: 40, d: 0.7 },
  { x: 520, w: 90, h: 58, r: 32, d: 2.8 },
  { x: 660, w: 66, h: 96, r: 42, d: 1.8 },
  { x: 790, w: 94, h: 68, r: 36, d: 0.4 },
  { x: 930, w: 72, h: 84, r: 38, d: 3.1 },
  { x: 1040, w: 88, h: 64, r: 34, d: 1.1 },
];

function Skyline({ winter = false, animate = true }: { winter?: boolean; animate?: boolean }) {
  const G = 146;
  const body = winter ? "#0f1c30" : "#1a0f26";
  const roof = winter ? "#dbeafe" : "#120a1b";
  const stroke = winter ? "#2a4468" : "#3a2150";
  const light = winter ? "#ffd27a" : "#ffb02e";
  const win = animate ? "hw-win" : "";
  return <svg className="hw-skyline" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect x="0" y={G} width="1200" height="14" fill={winter ? "#e8f1ff" : "#0a0510"} opacity={winter ? 0.9 : 1} />
    {HOUSES.map((h, i) => {
      const top = G - h.h;
      return <g key={i} stroke={stroke} strokeWidth="1">
        <rect x={h.x + h.w * 0.7} y={top - h.r * 0.75} width="9" height={h.r * 0.6} fill={body} />
        <rect x={h.x} y={top} width={h.w} height={h.h} fill={body} />
        <polygon points={`${h.x - 6},${top} ${h.x + h.w / 2},${top - h.r} ${h.x + h.w + 6},${top}`} fill={roof} />
        <rect className={win} x={h.x + h.w * 0.14} y={top + h.h * 0.24} width={h.w * 0.22} height={h.h * 0.22} fill={light} style={{ animationDelay: `${h.d}s` }} stroke="none" />
        <rect className={win} x={h.x + h.w * 0.62} y={top + h.h * 0.24} width={h.w * 0.22} height={h.h * 0.22} fill={light} style={{ animationDelay: `${h.d + 1.4}s` }} stroke="none" />
        <rect x={h.x + h.w * 0.4} y={G - h.h * 0.34} width={h.w * 0.2} height={h.h * 0.34} fill="#0b0610" stroke="none" />
        {i % 3 === 0 && <rect className={win} x={h.x + h.w * 0.4} y={top + h.h * 0.55} width={h.w * 0.2} height={h.h * 0.14} fill={light} style={{ animationDelay: `${h.d + 0.7}s` }} stroke="none" />}
      </g>;
    })}
    {!winter && [310, 690, 1010].map((x, i) => <g key={x}>
      <ellipse cx={x} cy={G - 9} rx="17" ry="13" fill="#3b1a05" />
      <polygon className={win} points={`${x - 9},${G - 15} ${x - 4},${G - 15} ${x - 6.5},${G - 20}`} fill="#ffcc33" style={{ animationDelay: `${i * 0.9}s` }} />
      <polygon className={win} points={`${x + 4},${G - 15} ${x + 9},${G - 15} ${x + 6.5},${G - 20}`} fill="#ffcc33" style={{ animationDelay: `${i * 0.9}s` }} />
      <path className={win} d={`M${x - 9} ${G - 7} q9 7 18 0 l-3 -3 -3 2 -3 -2 -3 2z`} fill="#ffcc33" style={{ animationDelay: `${i * 0.9}s` }} />
    </g>)}
    {!winter && <g>
      <ellipse cx="465" cy={G - 5} rx="16" ry="9" fill="#120a1b" />
      <circle className={animate ? "hw-eyes" : ""} cx="460" cy={G - 8} r="2.2" fill="#7bd34a" />
      <circle className={animate ? "hw-eyes" : ""} cx="469" cy={G - 8} r="2.2" fill="#7bd34a" />
    </g>}
    <path d={`M1175 ${G} V92 M1175 112 L1153 94 M1175 102 L1196 86 M1175 124 L1160 112`} stroke={winter ? "#2a4468" : "#241033"} strokeWidth="5" fill="none" strokeLinecap="round" />
  </svg>;
}

const HalloweenDecor = memo(function HalloweenDecor({ animations }: { animations: boolean }) {
  return <div className="autumn-decor hw-decor pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-purple-700/[0.10] blur-[130px]" />
    <div className="absolute -right-20 top-[14%] h-[360px] w-[360px] rounded-full bg-orange-700/[0.07] blur-[130px]" />
    <div className="hw-moon" />
    <div className="absolute left-[12%] top-[40%] text-6xl opacity-[0.07]">🕸️</div>
    <div className="absolute right-[16%] bottom-[22%] text-5xl opacity-[0.07]">🎃</div>
    <Skyline animate={animations} />
    {animations && <>
      <span className="hw-bat text-2xl" style={{ top: "14%", animationDuration: "24s" }}>🦇</span>
      <span className="hw-bat text-xl" style={{ top: "26%", animationDuration: "31s", animationDelay: "-11s" }}>🦇</span>
      <span className="hw-bat text-3xl" style={{ top: "8%", animationDuration: "38s", animationDelay: "-20s" }}>🦇</span>
      <span className="hw-ghost absolute left-[8%] top-[62%] text-4xl opacity-40">👻</span>
      {HW_FALLING.map((item, i) => <span key={i} className={`ambient-leaf absolute -top-16 ${item.size} opacity-0`} style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration }}>{item.icon}</span>)}
    </>}
  </div>;
});


const AutumnDecor = memo(function AutumnDecor({animations}:{animations:boolean}){

  return <div className="autumn-decor autumn-only pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-orange-700/[0.055] blur-[130px]"/>
    <div className="absolute -right-20 top-[12%] h-[360px] w-[360px] rounded-full bg-amber-700/[0.035] blur-[130px]"/>
    <div className="absolute bottom-[-120px] left-[38%] h-[360px] w-[520px] rounded-full bg-orange-950/[0.12] blur-[140px]"/>
    <div className="absolute right-[4%] top-[9%] text-7xl opacity-[0.08] autumn-leaf-accent">🍁</div>
    <div className="absolute left-[14%] top-[43%] text-6xl opacity-[0.07] autumn-leaf-accent">🍂</div>
    <div className="absolute right-[18%] bottom-[12%] text-5xl opacity-[0.06]">🍁</div>
    <div className="absolute left-[39%] bottom-[8%] text-4xl opacity-[0.05]">🍂</div>
    {animations && AUTUMN_FALLING_LEAVES.map((item,index)=><span key={index} className={`ambient-leaf absolute -top-16 ${item.size} opacity-0`} style={{left:item.left,animationDelay:item.delay,animationDuration:item.duration}}>{item.leaf}</span>)}
  </div>;
});

function EventDetailModal({event,people,onClose,onEdit}:{event:EventItem;people:Person[];onClose:()=>void;onEdit?:()=>void}){return <Modal onClose={onClose}><div className="flex items-start justify-between gap-4"><div>{(()=>{const cat=EVENT_CATEGORIES[event.category??"other"];return <span className="mb-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold" style={{borderColor:`${cat.color}45`,background:`${cat.color}14`,color:cat.color}}>{cat.emoji} {cat.label}</span>;})()}<div className="text-xs font-bold text-orange-300">{formatDate(event.date)} · {event.time}</div><h2 className="mt-2 text-2xl font-black">{event.title}</h2></div><span className="text-3xl">{EVENT_CATEGORIES[event.category??"other"].emoji}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><DetailBox label="Místo" value={event.place||"Bez místa"}/><DetailBox label="Čas" value={event.time||"Bez času"}/></div><div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">Poznámka / popis</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{event.description||"Bez poznámky"}</div></div><div className="mt-5"><div className="text-xs font-bold text-slate-400">Účastníci</div><div className="mt-3 flex flex-wrap gap-2">{event.participants.length?event.participants.map(id=>{const p=people.find(x=>x.id===id);return p?<div key={id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs"><Avatar person={p} size={24}/>{p.name}</div>:null}):<span className="text-xs text-slate-600">Nikdo vybraný</span>}</div></div><button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-white/[0.08] py-3 text-xs font-bold text-slate-300">Zavřít</button>{onEdit&&<button type="button" onClick={onEdit} className="mt-2 w-full rounded-xl theme-primary py-3 text-xs font-bold text-white">Upravit událost</button>}</Modal>}
function DetailBox({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">{label}</div><div className="mt-2 text-sm font-semibold text-slate-200">{value}</div></div>}
function ModernDateInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><div className="relative overflow-hidden rounded-xl border border-orange-300/15 bg-[linear-gradient(135deg,rgba(249,115,22,.07),rgba(0,0,0,.2))]"><div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-300"><Icon name="calendar" size={16}/></div><input type="date" value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-transparent py-3 pl-10 pr-4 text-sm outline-none [color-scheme:dark]"/></div></div>}

function Modal({children,onClose}:{children:ReactNode;onClose:()=>void}){return <div className="app-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm" style={{position:"fixed",inset:0,zIndex:9999,pointerEvents:"auto"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="app-modal my-auto max-h-[calc(100vh-3rem)] w-full max-w-[560px] overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[linear-gradient(145deg,#101522,#090c14)] p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)]" style={{pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>{children}</div></div>}
function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div>}


function InboxPage({ messages, notifications, people, currentPerson, tab, shifts, onRateShift, onSend, onMarkMessageRead, onMarkNotificationsRead, isAdmin = false, onDeleteMessage, onEditMessage }: {
  isAdmin?: boolean; onDeleteMessage?: (id: string) => Promise<boolean>; onEditMessage?: (id: string, subject: string, body: string) => Promise<boolean>;
  shifts: Shift[]; onRateShift: (shift: Shift, rating: number, reason: string, tramNumber: string, tramRating: TramRating | null) => Promise<boolean>;
  messages: MessageItem[]; notifications: NotificationItem[]; people: Person[]; currentPerson: Person | null; tab: "all" | "message" | "notification";
  onSend: (to: string[], subject: string, body: string) => Promise<boolean>; onMarkMessageRead: (id: string) => void; onMarkNotificationsRead: (ids: string[]) => void;
}) {
  const kind = tab === "notification" ? "notification" : "message";
  const [composeOpen, setComposeOpen] = useState(false);
  const [preset, setPreset] = useState<{ to: string[]; subject: string }>({ to: [], subject: "" });
  const [openMessage, setOpenMessage] = useState<MessageItem | null>(null);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [ratingBusy, setRatingBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); }, [toast]);
  const peopleById = useMemo(() => new Map(people.map(person => [person.id, person])), [people]);
  const meId = currentPerson?.id ?? "";
  const isReceived = (m: MessageItem) => m.recipientIds.includes(meId);
  const names = (ids: string[]) => ids.map(id => peopleById.get(id)?.name ?? "?").join(", ");
  const unreadMessageIds = messages.filter(m => isReceived(m) && !m.readAt).map(m => m.id);
  const [showArchive, setShowArchive] = useState(false);
  const [msgEdit, setMsgEdit] = useState<{ subject: string; body: string } | null>(null);
  const activeNotifications = notifications.filter(n => !n.archived);
  const archivedNotifications = notifications.filter(n => n.archived);
  const rank = (n: NotificationItem) => (!n.archived && !n.read && n.important ? 0 : 1);
  const sortedNotifications = [...activeNotifications].sort((a, b) => rank(a) - rank(b) || b.at.localeCompare(a.at));
  const sortedArchived = [...archivedNotifications].sort((a, b) => b.at.localeCompare(a.at));
  const unreadNotificationIds = activeNotifications.filter(n => !n.read).map(n => n.id);
  const openCompose = (to: string[] = [], subject = "") => { setPreset({ to, subject }); setComposeOpen(true); };
  const showMessage = (m: MessageItem) => { setOpenMessage(m); if (isReceived(m) && !m.readAt) onMarkMessageRead(m.id); };
  const dot = <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />;
  const markAllBtn = (n: number, onClick: () => void) => n > 0 ? <button type="button" onClick={onClick} className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">Označit vše jako přečtené</button> : null;

  const renderNotification = (n: NotificationItem) => {
            const urgent = n.important && !n.read && !n.archived;
            const rateShift = n.shiftId ? shifts.find(x => x.id === n.shiftId) : undefined;
            return <div role="button" tabIndex={0} key={n.id} onClick={() => { if (!n.read) onMarkNotificationsRead([n.id]); if (rateShift) setDetailShift(rateShift); }} onKeyDown={e => { if (e.key === "Enter") { if (!n.read) onMarkNotificationsRead([n.id]); if (rateShift) setDetailShift(rateShift); } }} className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition hover:bg-white/[0.04] ${n.archived ? "border-white/[0.05] bg-black/10 opacity-70" : urgent ? "border-red-400/40 bg-red-500/[0.08]" : n.read ? "border-white/[0.05] bg-black/10" : "border-orange-300/25 bg-orange-400/[0.06]"}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${urgent ? "border-red-400/40 bg-red-500/10 text-red-300" : "theme-soft"}`}><Icon name={n.icon} size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{n.title}</span>{n.important && !n.archived && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-300">Důležité</span>}{!n.read && !n.archived && dot}</div>
                <div className="mt-1 text-sm text-slate-300">{n.text}</div>
                <div className="mt-1.5 text-[11px] text-slate-500">{whenLabel(n.at, n.showTime)}</div>
                {!n.archived && (rateShift || n.test) && <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map(v => <button type="button" key={v} disabled={ratingBusy === n.id} onClick={async e => { e.stopPropagation(); if (!rateShift) { onMarkNotificationsRead([n.id]); setToast("Díky! Tohle byla jen zkouška, nic se neuložilo."); return; } setRatingBusy(n.id); await onRateShift(rateShift, v, "", rateShift.tramNumber ?? "", rateShift.tramRating); setRatingBusy(null); }} className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-50">{v === 0 ? "0★" : "★".repeat(v)}</button>)}
                  {rateShift && <span className="ml-1 text-[11px] text-slate-500">nebo klepni na kartu a napiš proč</span>}
                </div>}
              </div>
            </div>;
  };

  return <div>
    <PageHeader eyebrow="SCHRÁNKA" title={kind === "message" ? "Zprávy" : "Oznámení"} description={kind === "message" ? "Posílej zprávy ostatním členům Směnovníku." : "Co se nového stalo a na co nezapomenout."}
      action={kind === "message"
        ? <div className="flex flex-wrap gap-2">{markAllBtn(unreadMessageIds.length, () => unreadMessageIds.forEach(onMarkMessageRead))}<button type="button" onClick={() => openCompose()} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white hover:brightness-110"><Icon name="plus" size={16} />Nová zpráva</button></div>
        : markAllBtn(unreadNotificationIds.length, () => onMarkNotificationsRead(unreadNotificationIds)) ?? undefined} />
    {toast && <div className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm font-semibold text-emerald-200">{toast}</div>}
    <Card className="p-3 sm:p-4">
      <div className="space-y-2">
        {kind === "message"
          ? (messages.length === 0 ? <Empty text="Zatím žádné zprávy. Napiš první přes „Nová zpráva“." /> : messages.map(m => {
            const received = isReceived(m);
            const sender = peopleById.get(m.senderId);
            const unread = received && !m.readAt;
            return <button type="button" key={m.id} onClick={() => showMessage(m)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:bg-white/[0.04] ${unread ? "border-orange-300/25 bg-orange-400/[0.06]" : "border-white/[0.05] bg-black/10"}`}>
              {sender ? <Avatar person={sender} size={40} /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"><Icon name="mail" size={18} /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate text-sm font-bold">{received ? (sender?.name ?? "Neznámý") : m.senderId === meId ? `Ty → ${names(m.recipientIds)}` : `${sender?.name ?? "Neznámý"} → ${names(m.recipientIds)}`}</span>{unread && dot}<span className="ml-auto shrink-0 text-[11px] text-slate-500">{whenLabel(m.at)}</span></div>
                <div className={`mt-0.5 truncate text-sm ${unread ? "font-black text-white" : "font-semibold text-slate-200"}`}>{m.subject}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{m.body}</div>
              </div>
            </button>;
          }))
          : <>
            {activeNotifications.length === 0 ? <Empty text={archivedNotifications.length > 0 ? "Žádná aktuální oznámení." : "Zatím žádná oznámení."} /> : sortedNotifications.map(renderNotification)}
            {sortedArchived.length > 0 && <div className="pt-4">
              <button type="button" onClick={() => setShowArchive(v => !v)} className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-slate-500 transition hover:text-slate-300">Proběhlé<span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{sortedArchived.length}</span><span className="text-[10px]">{showArchive ? "▲ skrýt" : "▼ zobrazit"}</span></button>
              {showArchive && <div className="space-y-2">{sortedArchived.map(renderNotification)}</div>}
            </div>}
          </>}
      </div>
    </Card>
    {detailShift && <ShiftDetailModal shift={detailShift} person={peopleById.get(detailShift.userId) || null} editable onClose={() => setDetailShift(null)} onEdit={() => setDetailShift(null)} onSaveRating={onRateShift} />}
    {composeOpen && <ComposeModal people={people} currentPerson={currentPerson} preset={preset} onClose={() => setComposeOpen(false)} onSend={onSend} />}
    {openMessage && (() => {
      const m = openMessage;
      const sender = peopleById.get(m.senderId);
      return <Modal onClose={() => { setOpenMessage(null); setMsgEdit(null); }}>
        <div className="flex items-start gap-3">
          {sender && <Avatar person={sender} size={46} />}
          <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-300/70">Zpráva</div>{msgEdit ? <input value={msgEdit.subject} onChange={e => setMsgEdit({ ...msgEdit, subject: e.target.value })} className="mt-1 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-lg font-black outline-none focus:border-orange-300/40" /> : <h2 className="mt-1 break-words text-xl font-black">{m.subject}</h2>}<p className="mt-1 text-xs text-slate-500">Od: {sender?.name ?? "Neznámý"} · {whenLabel(m.at)}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>Komu:</span>{m.recipientIds.map(id => { const person = peopleById.get(id); return person ? <span key={id} className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5"><Avatar person={person} size={20} />{person.name}</span> : null; })}</div>
        {msgEdit ? <textarea value={msgEdit.body} onChange={e => setMsgEdit({ ...msgEdit, body: e.target.value })} rows={6} className="mt-4 w-full rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-6 outline-none focus:border-orange-300/40" /> : <div className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-sm leading-6 text-slate-200">{m.body}</div>}
        <div className="mt-6 flex justify-end gap-2">
          {isAdmin && !msgEdit && <button type="button" onClick={async () => { if (!confirm("Opravdu smazat tuto zprávu všem?")) return; if (await onDeleteMessage?.(m.id)) setOpenMessage(null); }} className="mr-auto rounded-xl border border-red-400/30 px-4 py-3 text-xs font-semibold text-red-300 hover:bg-red-500/10">Smazat</button>}
          {isAdmin && !msgEdit && <button type="button" onClick={() => setMsgEdit({ subject: m.subject, body: m.body })} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.04]">Upravit</button>}
          {msgEdit && <button type="button" onClick={async () => { if (!msgEdit.subject.trim() || !msgEdit.body.trim()) return; if (await onEditMessage?.(m.id, msgEdit.subject.trim(), msgEdit.body.trim())) { setOpenMessage({ ...m, subject: msgEdit.subject.trim(), body: msgEdit.body.trim() }); setMsgEdit(null); } }} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white hover:brightness-110">Uložit změny</button>}
          <button type="button" onClick={() => { if (msgEdit) setMsgEdit(null); else setOpenMessage(null); }} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-white/[0.04]">{msgEdit ? "Zrušit" : "Zavřít"}</button>
          {isReceived(m) && <button type="button" onClick={() => { setOpenMessage(null); openCompose([m.senderId], m.subject.startsWith("Re: ") ? m.subject : `Re: ${m.subject}`); }} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white hover:brightness-110">Odpovědět</button>}
        </div>
      </Modal>;
    })()}
  </div>;
}

function ComposeModal({ people, currentPerson, preset, onClose, onSend }: { people: Person[]; currentPerson: Person | null; preset: { to: string[]; subject: string }; onClose: () => void; onSend: (to: string[], subject: string, body: string) => Promise<boolean> }) {
  const others = people.filter(person => person.id !== currentPerson?.id);
  const [to, setTo] = useState<string[]>(preset.to);
  const [subject, setSubject] = useState(preset.subject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const allSelected = others.length > 0 && others.every(person => to.includes(person.id));
  const submit = async () => {
    if (to.length === 0 || !body.trim() || sending) return;
    setSending(true);
    const ok = await onSend(to, subject.trim(), body.trim());
    setSending(false);
    if (ok) onClose();
  };
  return <Modal onClose={onClose}>
    <h2 className="font-bold">Nová zpráva</h2>
    <div className="mt-5 space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between"><label className="text-xs text-slate-400">Komu</label><button type="button" onClick={() => setTo(allSelected ? [] : others.map(person => person.id))} className="text-[11px] font-semibold text-orange-300 hover:text-orange-200">{allSelected ? "Zrušit výběr" : "Vybrat všechny"}</button></div>
        <div className="flex flex-wrap gap-2">{others.map(person => <button type="button" key={person.id} onClick={() => setTo(prev => prev.includes(person.id) ? prev.filter(x => x !== person.id) : [...prev, person.id])} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={to.includes(person.id) ? { borderColor: `${person.color}80`, background: `${person.color}1c` } : { borderColor: "rgba(255,255,255,.06)" }}><Avatar person={person} size={22} />{person.name}</button>)}</div>
      </div>
      <Input label="Předmět" value={subject} onChange={setSubject} />
      <div><label className="mb-2 block text-xs text-slate-400">Zpráva</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Napiš zprávu…" className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none" /></div>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" onClick={onClose} disabled={sending} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400 disabled:opacity-50">Zrušit</button>
      <button type="button" onClick={submit} disabled={sending || to.length === 0 || !body.trim()} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50">{sending ? "Odesílám…" : "Odeslat"}</button>
    </div>
  </Modal>;
}