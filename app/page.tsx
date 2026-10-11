"use client";

import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ShiftType = "morning" | "afternoon" | "intershift" | "night" | "midnight" | "all_day" | "emergency" | "vacation" | "sick";
type TramRating = "mrdka" | "usla" | "topka";
type Page = "overview" | "shifts" | "events" | "stats" | "updates" | "settings";
type AuthSession = { user?: { email?: string | null } } | null;

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
const APP_VERSION = "2.1";
const DAVID_AUTH_ID = "0989a80c-eaec-425b-a9e9-6ff0173c678d";
const TRAM_REVIEW_EMAILS = new Set(["matejuher15@gmail.com"]);
const TRAM_RATING_LABELS:Record<TramRating,string>={mrdka:"Mrdka",usla:"Ušla",topka:"Topka"};
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

// Doplňková česká jména, která základní svátkové API nevrací.
const EXTRA_CZECH_NAME_DAYS: Record<string, string[]> = {
  "09-03": ["Bronislava"],
  "09-06": ["Boleslava"],
};

const loginUsers = [
  { name: "Tibík", email: "08matytibi3115@gmail.com", color: "#c56b2d", avatar: "T" },
  { name: "Davča", email: "dkudlata9@gmail.com", color: "#8b6548", avatar: "K" },
  { name: "Matýsek", email: "matejuher15@gmail.com", color: "#6f8f72", avatar: "M" },
  { name: "Kuba", email: "jakub.proch145@seznam.cz", color: "#b84a3a", avatar: "K" },
  { name: "Cukr mamča", email: "lucieannapilarova97@gmail.com", color: "#facc15", avatar: "L" },
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
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 12px; background: white; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  h2 { margin: 22px 0 8px; font-size: 16px; }
  .muted { color: #6b7280; }
  .header { border-bottom: 3px solid #f97316; padding-bottom: 10px; margin-bottom: 16px; }
  .summary { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin: 12px 0 18px; }
  .box { border: 1px solid #e5e7eb; border-radius: 9px; padding: 9px; }
  .box strong { display: block; margin-top: 4px; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 7px 8px; vertical-align: top; text-align: left; }
  th { background: #f3f4f6; font-size: 11px; }
  tr { break-inside: avoid; }
  .badge { display: inline-block; border-radius: 999px; background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 2px 7px; font-size: 10px; font-weight: 700; }
  .bar-row { display: grid; grid-template-columns: 120px 1fr 70px; align-items: center; gap: 8px; margin: 7px 0; }
  .bar-track { height: 10px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f97316,#facc15); }
  .foot { margin-top: 18px; font-size: 10px; color: #9ca3af; }
  @media print { .no-print { display:none !important; } }
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
  const [themeMode, setThemeMode] = useState<"autumn" | "classic">("autumn");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showUpdateIntro, setShowUpdateIntro] = useState(false);
  const [showShiftSuccess, setShowShiftSuccess] = useState(false);
  const [practicePresetDate, setPracticePresetDate] = useState("");
  const [nameDay, setNameDay] = useState<string>("");

  const currentPerson = useMemo(() => {
    const email = session?.user?.email;
    return email ? people.find(p => p.email.toLowerCase() === email.toLowerCase()) ?? null : null;
  }, [people, session]);

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
        participants: (e.event_participants ?? [])
          .map(participant => people.find(person => person.authId === participant.user_id)?.id)
          .filter((id): id is string => Boolean(id)),
      }));

      setEvents(mapped);
    })();
  }, [session, people.length]);

  useEffect(() => { if (currentPerson && !statsPersonId) setStatsPersonId(currentPerson.id); }, [currentPerson, statsPersonId]);
  useEffect(() => {
    if (!currentPerson) return;
    const saved = localStorage.getItem(`shift-theme-${currentPerson.email}`);
    const saved2 = localStorage.getItem(`shift-theme2-${currentPerson.email}`);
    const savedMode = localStorage.getItem(`shift-theme-mode-${currentPerson.email}`) as "autumn" | "classic" | null;
    const savedAnimations = localStorage.getItem(`shift-animations-${currentPerson.email}`);
    setThemeColor(saved || APP_ACCENT);
    setThemeColor2(saved2 || APP_ACCENT_SECONDARY);
    setThemeMode(savedMode || "autumn");
    setAnimationsEnabled(savedAnimations !== "off");
    setShowUpdateIntro(localStorage.getItem(`smenovnik-${APP_VERSION}-read-${currentPerson.email}`) !== "yes");
  }, [currentPerson]);

  useEffect(() => {
    if (!currentPerson) return;
    localStorage.setItem(`shift-theme-${currentPerson.email}`, themeColor);
    localStorage.setItem(`shift-theme2-${currentPerson.email}`, themeColor2);
    localStorage.setItem(`shift-theme-mode-${currentPerson.email}`, themeMode);
    localStorage.setItem(`shift-animations-${currentPerson.email}`, animationsEnabled ? "on" : "off");
  }, [currentPerson, themeColor, themeColor2, themeMode, animationsEnabled]);


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
    setEditingShift(null); setShiftDate(selectedDate); setShiftEndDate(selectedDate); setShiftType("morning"); setStartTime("06:00"); setEndTime("14:00"); setNote(""); setShowShiftModal(true);
  };
  const openEditShift = (shift: Shift) => {
    if (!currentPerson || shift.userId !== currentPerson.id) return;
    setEditingShift(shift); setShiftDate(shift.date); setShiftEndDate(shift.endDate || shift.date); setShiftType(shift.type); setStartTime(shift.startTime); setEndTime(shift.endTime); setNote(shift.note || ""); setShowShiftModal(true);
  };
  const saveShift = async () => {
    if (!currentPerson || !shiftDate) return;
    if (shiftType === "vacation" && (!shiftEndDate || shiftEndDate < shiftDate)) {
      alert("Datum konce dovolené musí být stejné nebo pozdější než datum začátku.");
      return;
    }

    setSavingShift(true);
    const isVacation = shiftType === "vacation";
    const payload = {
      user_id: currentPerson.id,
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
    if (!editingShift || !currentPerson || editingShift.userId !== currentPerson.id) return;
    const { error } = await supabase.from("shifts").delete().eq("id", editingShift.id);
    if (error) alert(error.message); else { setShifts(prev=>prev.filter(s=>s.id!==editingShift.id)); setShowShiftModal(false); setEditingShift(null); }
  };

  const saveShiftRating = async (shift: Shift, rating: number, ratingReason: string, tramNumber: string, tramRating: TramRating | null) => {
    if (!currentPerson || shift.userId !== currentPerson.id) return false;
    const availableAt = shiftRatingAvailableAt(shift);
    if (!availableAt || Date.now() < availableAt.getTime() || rating < 0 || rating > 5) return false;

    const ratedAt = new Date().toISOString();
    const { error } = await supabase.rpc("rate_own_shift", {
      p_shift_id: shift.id,
      p_rating: rating,
      p_reason: ratingReason.trim() || null,
      p_tram_number: tramNumber.trim() || null,
      p_tram_rating: tramRating,
    });

    if (error) {
      alert(`Hodnocení se nepodařilo uložit: ${error.message}`);
      return false;
    }

    setShifts(prev => prev.map(item => item.id === shift.id ? { ...item, rating, ratingReason: ratingReason.trim() || null, ratedAt, tramNumber: tramNumber.trim() || null, tramRating } : item));
    return true;
  };

  const savePractice = async (item: PracticeItem) => {
    if (!currentPerson || currentPerson.email !== "dkudlata9@gmail.com") return;

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
    if (!currentPerson || currentPerson.email !== "dkudlata9@gmail.com") return;

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

    const { data, error } = await supabase
      .from("events")
      .insert({
        created_by: currentPerson.authId,
        title: item.title,
        event_date: item.date,
        event_time: item.time,
        location: item.place || null,
        description: item.description || null,
      })
      .select("id,created_by,title,event_date,event_time,location,description")
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
    };

    setEvents(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
    setShowEventModal(false);
  };

  const deleteEvent = async (id: string) => {
    const event = events.find(item => item.id === id);
    if (!event || !currentPerson?.authId || event.createdBy !== currentPerson.authId) return;

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

    return people.map(person => {
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
  }, [people, shifts, statsPeriod]);

  if (authLoading) return <CenterMessage icon="calendar" text="Kontroluji přihlášení…" />;
  if (!session) return <LoginScreen selected={selectedLoginUser} setSelected={setSelectedLoginUser} password={loginPassword} setPassword={setLoginPassword} error={loginError} loading={loginLoading} onLogin={login} />;

  const activeThemeColor = themeMode === "autumn" ? AUTUMN_ACCENT : themeColor;
  const activeThemeColor2 = themeMode === "autumn" ? AUTUMN_ACCENT_SECONDARY : themeColor2;

  return <main
    className={`min-h-screen text-white ${themeMode === "classic" ? "classic-theme" : "autumn-theme"}`}
    style={{
      "--theme": activeThemeColor,
      "--theme2": activeThemeColor2,
      backgroundColor: themeMode === "autumn" ? "#080403" : "#0b0908",
      backgroundImage: themeMode === "autumn"
        ? `radial-gradient(circle at 12% 6%, rgba(255,145,47,.12), transparent 25%),
           radial-gradient(circle at 88% 8%, rgba(205,86,24,.10), transparent 27%),
           radial-gradient(circle at 62% 76%, rgba(132,47,16,.10), transparent 35%),
           radial-gradient(circle at 22% 88%, rgba(214,131,48,.05), transparent 31%),
           linear-gradient(135deg, rgba(148,62,18,.045), transparent 40%),
           linear-gradient(225deg, rgba(184,105,33,.035), transparent 42%),
           linear-gradient(160deg,#0a0503 0%,#130905 24%,#1d0d06 48%,#120805 72%,#070403 100%)`
        : `radial-gradient(circle at 15% 10%, ${themeColor}18, transparent 32%), radial-gradient(circle at 85% 0%, ${themeColor2}16, transparent 30%), linear-gradient(180deg,#050711 0%,#070a12 55%,#05070d 100%)`,
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
    `}</style>
    {themeMode === "autumn" && <AutumnDecor animations={animationsEnabled} />}
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentPerson={currentPerson} onLogout={logout} />
      <section className="w-full lg:ml-[252px]">
        <div className="w-full px-4 pb-28 pt-24 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:pb-16 lg:pt-10">
          {activePage === "overview" && <Overview people={people} shifts={shifts} currentPerson={currentPerson} events={events} nameDay={nameDay} openAddShift={openAddShift} tibiWeek={tibiWeek} setTibiWeek={setTibiWeek} tibiOdd={tibiOdd} tibiEven={tibiEven} davidSchool={davidSchool} davidWeek={davidWeek} setDavidWeek={setDavidWeek} practice={practice} openPractice={(date)=>{setPracticePresetDate(date||"");setShowPracticeModal(true);}} deletePractice={deletePractice} /> }
          {activePage === "shifts" && <ShiftsPage people={people} shifts={shifts} currentPerson={currentPerson} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} month={month} year={year} changeMonth={changeMonth} goToToday={()=>{const n=new Date();setMonth(n.getMonth());setYear(n.getFullYear());}} filter={shiftFilter} setFilter={setShiftFilter} openAddShift={openAddShift} openEditShift={openEditShift} saveShiftRating={saveShiftRating} loading={loadingShifts} autumn={themeMode === "autumn"} /> }
          {activePage === "events" && <EventsPage events={events} people={people} currentPerson={currentPerson} openCreate={()=>setShowEventModal(true)} deleteEvent={deleteEvent} />}
          {activePage === "updates" && <UpdatesPage />}
          {activePage === "stats" && <StatsPage stats={stats} selectedId={statsPersonId} setSelectedId={setStatsPersonId} statsView={statsView} setStatsView={setStatsView} statsMonthKey={statsMonthKey} setStatsMonthKey={setStatsMonthKey} statsWeekStart={statsWeekStart} setStatsWeekStart={setStatsWeekStart} statsPeriod={statsPeriod} />}
          {activePage === "settings" && <SettingsPage currentPerson={currentPerson} setPeople={setPeople} themeColor={themeColor} setThemeColor={setThemeColor} themeColor2={themeColor2} setThemeColor2={setThemeColor2} themeMode={themeMode} setThemeMode={setThemeMode} animationsEnabled={animationsEnabled} setAnimationsEnabled={setAnimationsEnabled} /> }
        </div>
      </section>
    </div>

    {showShiftModal && currentPerson && <ShiftModal person={currentPerson} editing={editingShift} date={shiftDate} setDate={setShiftDate} endDate={shiftEndDate} setEndDate={setShiftEndDate} type={shiftType} setType={setShiftType} start={startTime} setStart={setStartTime} end={endTime} setEnd={setEndTime} note={note} setNote={setNote} saving={savingShift} onClose={()=>setShowShiftModal(false)} onSave={saveShift} onDelete={deleteShift} />}
    {showEventModal && <EventModal people={people} onClose={()=>setShowEventModal(false)} onSave={saveEvent} />}
    {showPracticeModal && currentPerson?.email === "dkudlata9@gmail.com" && <PracticeModal initialDate={practicePresetDate} onClose={()=>setShowPracticeModal(false)} onSave={savePractice} />}
    {showUpdateIntro && currentPerson && <UpdateIntroModal onDone={()=>{localStorage.setItem(`smenovnik-${APP_VERSION}-read-${currentPerson.email}`, "yes");setShowUpdateIntro(false);}} />}
    {showShiftSuccess && <ShiftSavedToast animations={animationsEnabled} />}
  </main>;
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
      {!selected ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{loginUsers.map((u,index)=><button key={u.email} onClick={()=>setSelected(u)} className="group relative overflow-hidden rounded-3xl border border-orange-200/[0.10] bg-[linear-gradient(145deg,rgba(31,24,19,.84),rgba(13,12,10,.90))] p-5 text-left shadow-[0_18px_45px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/25 hover:bg-[linear-gradient(145deg,rgba(48,31,20,.92),rgba(18,14,11,.94))] hover:shadow-[0_20px_50px_rgba(86,38,11,.22)]">
        <div className="pointer-events-none absolute -right-8 -top-8 text-5xl opacity-0 transition group-hover:opacity-[0.07]">{index%2?"🍂":"🍁"}</div>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] font-black text-white shadow-[0_10px_24px_rgba(0,0,0,.22)]" style={{background:`linear-gradient(145deg,${u.color}dd,${u.color}88)`}}>{u.avatar}</div>
        <div className="font-bold text-stone-100">{u.name}</div>
        <div className="mt-1 text-xs text-stone-600 transition group-hover:text-orange-200/60">Přihlásit se</div>
      </button>)}</div>
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
  return <><aside className="app-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[252px] border-r border-white/[0.07] bg-[#0e0b08]/90 px-5 py-6 shadow-[20px_0_60px_rgba(0,0,0,.18)] backdrop-blur-md lg:flex lg:flex-col"><div className="mb-9 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border theme-soft theme-ring"><Icon name="calendar" size={24}/></div><div><div className="text-[15px] font-black tracking-tight">Směnovník <span className="text-[10px] theme-text">v{APP_VERSION}</span></div><div className="text-[11px] text-slate-500">směny, škola & společný čas</div></div></div><nav className="space-y-1.5">{items.map(i=><button key={i.page} onClick={()=>setActivePage(i.page)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${activePage===i.page?"border theme-soft":"border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-white"}`}><Icon name={i.icon} size={19}/>{i.label}{i.page==="updates"&&<span className="ml-auto rounded-full bg-orange-400/15 px-2 py-0.5 text-[9px] font-bold text-orange-300">2.1</span>}</button>)}</nav><div className="mt-auto">{currentPerson&&<div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex items-center gap-3"><Avatar person={currentPerson} size={38}/><div><div className="text-sm font-semibold">{currentPerson.name}</div><div className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Přihlášen</div></div></div></div>}<button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"><Icon name="logout" size={19}/>Odhlásit se</button></div></aside><div className="app-sidebar fixed left-0 right-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#0e0b08]/90 px-4 backdrop-blur-md lg:hidden"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border theme-soft"><Icon name="calendar" size={20}/></div><span className="font-black">Směnovník</span></div><button onClick={onLogout} className="rounded-xl p-2 text-slate-400 hover:text-red-400"><Icon name="logout"/></button></div><nav className="app-sidebar fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-white/[0.07] bg-[#0e0b08]/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">{items.map(i=><button key={`mobile-${i.page}`} onClick={()=>setActivePage(i.page)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[8px] font-semibold transition ${activePage===i.page?"theme-soft":"text-slate-500"}`}><Icon name={i.icon} size={17}/><span className="max-w-full truncate">{i.label}</span></button>)}</nav></>;
}

function PageHeader({ eyebrow,title,description,action }: { eyebrow:string;title:string;description:string;action?:ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 inline-flex rounded-full border theme-soft px-2.5 py-1 text-[9px] font-bold tracking-[.22em]">{eyebrow}</div><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-slate-400">{description}</p></div>{action}</div>; }
function Card({children,className=""}:{children:ReactNode;className?:string}){return <div className={`app-card rounded-3xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(31,24,19,.96),rgba(14,12,10,.94))] shadow-[0_18px_50px_rgba(0,0,0,.22)] ${className}`}>{children}</div>}

function dailyBoost(person: Person | null) {
  const quotesByPerson: Record<string, string[]> = {
    "Tibík": [
      "Pokud ještě nemůžeš dělat velké věci, dělej malé věci velkým způsobem.",
      "Za rok si přeješ, abys začal dnes.",
      "Vzdělání je nejmocnější zbraň, kterou můžeš použít k tomu, abys změnil svět.",
      "Dělej to nejlepší, co můžeš. Nikdo nemůže udělat víc než to.",
      "Žij ze své představivosti, ne ze své historie.",
      "Příležitosti se nestávají, ty je vytváříš.",
      "Stanovení cílů je prvním krokem k tomu, aby se neviditelné stalo viditelným.",
      "Nikdy se nevzdávej snu jen proto, že čas, který bude trvat, je dlouhý. Čas stejně uplyne.",
    ],
    "Davča": [
      "Buď ty, kdo řídí den, nebo den řídí tebe.",
      "Soustřeď všechny své myšlenky na práci, kterou máš před sebou.",
      "Usilovnost poráží talent, když talent nepracuje.",
      "Úspěšný muž se poučí ze svých chyb a zkusí to znovu jiným způsobem.",
      "Když se snažíme stát se lepšími, vše kolem nás se také zlepšuje.",
      "Začni tam, kde jsi. Použij, co máš. Dělej, co můžeš.",
      "Pracuj, dokud tvůj bankovní účet nevypadá jako telefonní číslo.",
      "Každé ráno se musíš probudit s odhodláním, pokud chceš jít spát s uspokojením.",
    ],
    "Matýsek": [
      "Pokud to můžeš snít, můžeš to udělat.",
      "Nedívej se na své nohy, abys zjistil, zda to děláš správně. Jen tancuj.",
      "Někde čeká něco neuvěřitelného, co má být známo.",
      "Nikdy se nebudeš nudit, když zkusíš něco nového.",
      "Získej dobrý nápad a drž se ho. Pracuj na něm, dokud to nebude správně.",
      "Jediný způsob, jak objevit hranice možného, je vyrazit trochu dál do nemožného.",
      "Abychom byli nenahraditelní, musíme být vždy jiní.",
      "Někteří lidé chtějí, aby se to stalo, někteří si přejí, aby se to stalo, jiní to dělají.",
    ],
    "Kuba": [
      "Kdo ovládá sám sebe, je nejsilnějším bojovníkem.",
      "Muž, který udělal chybu a neopraví ji, dělá další chybu.",
      "Drž oči na hvězdách a nohy na zemi.",
      "Dělej, co můžeš, s tím, co máš, kde jsi.",
      "Úspěch je klopýtání od selhání k selhání bez ztráty nadšení.",
      "Pokud opravdu chceš něco udělat, najdeš způsob. Pokud ne, najdeš výmluvu.",
      "Odvaha je jako sval. Posilujeme ji používáním.",
      "Jeden muž s odvahou tvoří většinu.",
    ],
    "Cukr mamča": [
      "Nejsilnějším činem ženy je milovat sebe, být sama sebou a zářit mezi těmi, kteří nikdy nevěřili, že to dokáže.",
      "Když se žena stane svou nejlepší přítelkyní, život je jednodušší.",
      "Rozhodla jsem se udělat zbytek svého života tím nejlepším obdobím mého života.",
      "Nenech, aby názor někoho jiného na tebe stal se tvou realitou.",
      "Když dáváš radost jiným lidem, dostáváš více radosti zpět.",
      "Optimismus je víra, která vede k dosažení. Nic se nedá udělat bez naděje a důvěry.",
      "Neseš pas k vlastnímu štěstí.",
      "Pokud ti nedají místo u stolu, přines si skládací židli.",
    ],
  };

  const fallback = [
    "Začni tam, kde jsi. Použij, co máš. Dělej, co můžeš.",
    "Pokud to můžeš snít, můžeš to udělat.",
    "Jedna malá pozitivní myšlenka ráno může změnit celý tvůj den.",
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
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{people.map(p=>{const todayShifts=todayShiftsByUser.get(p.id)??[];return <div key={p.id} role="button" tabIndex={0} aria-label={`Otevřít informace o směnách: ${p.name}`} onClick={()=>setDetailPerson(p)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setDetailPerson(p);}}} className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(31,24,19,.96),rgba(14,12,10,.94))] p-5 text-left transition hover:-translate-y-1 hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{borderColor:`${p.color}38`}}><div className="autumn-only pointer-events-none absolute right-3 top-2 text-2xl opacity-20">🍂</div><div className="relative flex items-center gap-4"><Avatar person={p} size={54}/><div className="min-w-0 flex-1"><div className="text-[15px] font-black">{p.name}</div></div></div><div className="relative mt-5 flex-1 rounded-2xl border border-white/[0.05] bg-black/20 p-4">{todayShifts.length>0?<div className="space-y-2">{todayShifts.map(s=><div key={s.id} className="rounded-xl border px-3 py-2" style={{borderColor:`${shiftInfo[s.type].color}38`,background:`${shiftInfo[s.type].color}0d`}}><div className="flex items-center gap-2 text-sm font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={16}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-base font-black">{shiftTimeLabel(s)}</div></div>)}</div>:<div className="text-sm font-semibold text-slate-300">Dnes nemá směnu</div>}</div><div className="relative mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.12em] text-slate-600 transition group-hover:text-orange-300"><span>Detail</span><Icon name="right" size={14}/></div></div>})}</section>
    <section className="mb-8 grid gap-5 xl:grid-cols-[1.75fr_.95fr]"><Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Nejbližší směny</h2><p className="mt-1 text-xs text-slate-400">Seřazené podle toho, komu začíná směna nejdřív</p></div><button onClick={()=>openAddShift()} className="flex items-center gap-2 rounded-xl theme-primary px-3 py-2 text-xs font-bold text-white"><Icon name="plus" size={15}/>Přidat</button></div><div className="space-y-2">{upcoming.length===0?<Empty text="Zatím nejsou žádné směny."/>:upcomingGroups.map(group=><div key={group.key} className="space-y-2"><div className="px-1 pt-2 text-[11px] font-black uppercase tracking-[.14em] text-orange-300/80">{dayHeading(group.key,today)}</div>{group.items.map(s=>{const p=peopleById.get(s.userId);if(!p)return null;return <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><Avatar person={p} size={38}/><div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="mt-1 text-xs font-extrabold theme-text">{shiftCountdown(s,clock)}</div></div><div className="text-right"><div className="flex items-center justify-end gap-1 text-xs font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={13}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-xs text-slate-400">{shiftTimeLabel(s)}</div></div></div>})}</div>)}</div></Card><Card className="relative overflow-hidden p-6"><div className="pointer-events-none absolute -right-3 -top-4 text-6xl opacity-10">🍁</div><h2 className="font-bold">Informace</h2><p className="mt-1 text-xs text-slate-400">Dnešní rychlý přehled</p><div className="relative mx-auto mt-6 grid max-w-[390px] grid-cols-2 gap-3"><InfoBubble label="Směn tento měsíc" value={String(monthShiftCount)} icon="calendar"/><InfoBubble label="Směn dnes" value={String(todayShiftCount)} icon="clock"/><div className="col-span-2 mx-auto -my-1 flex h-28 w-28 flex-col items-center justify-center rounded-full border border-orange-300/25 bg-orange-500/10 text-center shadow-[0_0_45px_rgba(249,115,22,.12)]"><div className="text-2xl">🍂</div><div className="mt-1 text-sm font-black capitalize text-orange-200">{dateInfo.weekday}</div><div className="text-xs font-semibold text-orange-300/70">{dateInfo.date}</div></div><InfoBubble label="Událostí dnes" value={String(todayEventCount)} icon="event"/><InfoBubble label="Dnešní svátek" value={nameDay||"Načítám…"} icon="users" small/><div className="col-span-2"><InfoBubble label="Příští společné volno" icon="calendar" small value={commonFreeDay?dayHeading(commonFreeDay,today):"Zatím žádné v rozpisu"}/></div><div className="col-span-2"><InfoBubble label="Nejbližší událost" icon="event" small value={nextEvent?<><div className="truncate">{nextEvent.title}</div><div className="mt-1 text-xs font-semibold text-orange-200/80">{dateCountdown(nextEvent.date,today)} · {formatDate(nextEvent.date)}{nextEvent.time?` · ${nextEvent.time}`:""}</div></>:"Žádná naplánovaná"}/></div><div className="col-span-2"><InfoBubble label="Nejbližší narozeniny" icon="users" small value={nextBirthday?<><div className="truncate">🎂 {nextBirthday.person.name}</div><div className="mt-1 text-xs font-semibold text-orange-200/80">{dateCountdown(nextBirthday.date,today)} · {new Date(`${nextBirthday.date}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})} · {nextBirthday.age}. narozeniny</div></>:"Zatím nikdo nemá zadané datum narození"}/></div></div></Card></section>
    <section><div className="mb-4"><h2 className="text-lg font-bold">Škola a praxe</h2><p className="mt-1 text-xs text-slate-500">Rozvrhy na jednom místě.</p></div><div className="grid gap-6"><SchoolSchedule title="Tibíkův rozvrh" person={people.find(p=>p.email==="08matytibi3115@gmail.com")} schedule={tibiWeek==="odd"?tibiOdd:tibiEven} weekParity={tibiWeek} switcher={<div className="flex gap-2"><SmallToggle active={tibiWeek==="odd"} onClick={()=>setTibiWeek("odd")}>Lichý týden{thisWeekBadge("odd")}</SmallToggle><SmallToggle active={tibiWeek==="even"} onClick={()=>setTibiWeek("even")}>Sudý týden{thisWeekBadge("even")}</SmallToggle></div>}/><div><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-xl opacity-70">🍂</span><div><h3 className="font-bold text-[#f1e7dc]">Davčův rozvrh</h3><p className="text-xs text-[#9f8d7e]">Sudý = škola, lichý = praxe</p></div></div><div className="flex gap-2"><SmallToggle active={davidWeek==="odd"} onClick={()=>setDavidWeek("odd")}>Lichý týden{thisWeekBadge("odd")}</SmallToggle><SmallToggle active={davidWeek==="even"} onClick={()=>setDavidWeek("even")}>Sudý týden{thisWeekBadge("even")}</SmallToggle></div></div>{davidWeek==="even"?<SchoolSchedule title="Davčův školní rozvrh" person={people.find(p=>p.email==="dkudlata9@gmail.com")} schedule={davidSchool} weekParity="even"/>:<DavidPracticeSchedule practice={practice} canEdit={currentPerson?.email==="dkudlata9@gmail.com"} onAdd={openPractice} onDelete={deletePractice}/>}</div></div></section>
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
function AutumnSectionTitle({text}:{text:string}){return <div className="autumn-only mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-orange-300/80"><span className="autumn-leaf-accent text-base">🍂</span>{text}<div className="h-px flex-1 bg-gradient-to-r from-orange-400/45 via-amber-300/18 to-transparent"/><span className="autumn-leaf-accent text-base opacity-70">🍁</span></div>}

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
function subjectColor(short: string) {
  return SUBJECT_COLORS[short.split("/")[0].trim().toUpperCase()] ?? null;
}

function SchoolSchedule({title,person,schedule,switcher,weekParity}:{title:string;person?:Person;schedule:WeekSchedule;switcher?:ReactNode;weekParity?:"odd"|"even"}){
  const now=new Date();
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
  return <div className="relative overflow-hidden rounded-3xl border border-[#5a4637]/55 bg-[linear-gradient(145deg,rgba(30,24,20,.97),rgba(15,13,12,.98))] shadow-[0_18px_50px_rgba(0,0,0,.28)]">
    <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#8a684d]/[0.08] blur-[70px]"/>
    <div className="relative flex flex-col justify-between gap-3 border-b border-[#5a4637]/35 bg-[linear-gradient(90deg,rgba(91,67,49,.12),rgba(255,255,255,.015))] p-5 sm:flex-row sm:items-center sm:p-6">
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
              const color=empty?null:subjectColor(shortSubject(l.subject));
              return <div key={`${day}-${i}`} title={`${l.subject}${l.room?` · ${l.room}`:""}`} style={color?{borderColor:`${color}${isToday?"88":"44"}`,background:`linear-gradient(145deg,${color}22,rgba(30,26,22,.92))`}:undefined} className={`flex min-h-[56px] min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${empty?"border-transparent bg-transparent text-[#4d433c]":"border-[#6e5a49]/45 bg-[linear-gradient(145deg,rgba(53,43,35,.88),rgba(30,26,22,.92))] text-[#efe6dd] hover:brightness-125"} ${isNow?"ring-2 ring-orange-400/80 shadow-[0_0_22px_rgba(251,146,60,.28)]":""} ${isToday&&!empty&&!color?"border-orange-300/30":""}`}>
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
  const octoberAutumn=autumn&&month===9;

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
      `<div class="header"><h1>Směnovník – rozpis směn</h1><div class="muted">${escapePrintHtml(monthName(year,month))} ${year} · ${escapePrintHtml(selectedLabel)} · ${escapePrintHtml(filterLabel)}</div></div>
       <div class="summary"><div class="box">Směn<strong>${printable.length}</strong></div><div class="box">Odpracováno<strong>${escapePrintHtml(formatWorkedMinutes(totalMinutes))}</strong></div><div class="box">Osoby<strong>${visible.length}</strong></div><div class="box">Pauza<strong>Tibík, Kuba, Lucka −30 min / směna</strong></div></div>
       <table><thead><tr><th>Datum</th><th>Osoba</th><th>Typ směny</th><th>Čas</th><th>Odpracováno</th><th>Poznámka</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Pro zvolený měsíc nejsou žádné směny.</td></tr>`}</tbody></table>
       <div class="foot">Vygenerováno ze Směnovníku. Dovolená a nemoc nejsou započítané do odpracovaného času.</div>`
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
      {octoberAutumn&&<><div className="pointer-events-none absolute right-24 top-1 z-10 text-5xl opacity-30 autumn-leaf-accent">🍁</div><div className="pointer-events-none absolute bottom-8 left-3 z-10 text-4xl opacity-20 autumn-leaf-accent">🍂</div><div className="pointer-events-none absolute left-[35%] top-[42%] z-10 text-3xl opacity-[0.08]">🍁</div><div className="pointer-events-none absolute right-[28%] bottom-[18%] z-10 text-3xl opacity-[0.07]">🍂</div></>}
      <div className="calendar-head flex items-center justify-between border-b border-white/[0.06] p-4">
        <button onClick={()=>changeMonth(-1)} aria-label="Předchozí měsíc" className="rounded-xl border border-white/[0.10] bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/[0.10]"><Icon name="left"/></button>
        <div className="text-center"><div className={`text-lg font-bold capitalize ${octoberAutumn?"autumn-neon-title":""}`}>{octoberAutumn&&<span className="mr-2">🍁</span>}{monthName(year,month)}{octoberAutumn&&<span className="ml-2">🍂</span>}</div><div className="text-xs text-slate-400">{year}</div>{!isCurrentMonth&&<button type="button" onClick={goToToday} className="mt-1.5 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-200 hover:bg-orange-400/20">Dnes</button>}</div>
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
    {detailShift&&<ShiftDetailModal shift={detailShift} person={peopleById.get(detailShift.userId) || null} editable={currentPerson?.id===detailShift.userId} onClose={()=>setDetailShift(null)} onEdit={()=>{const shift=detailShift;setDetailShift(null);openEditShift(shift);}} onSaveRating={saveShiftRating}/>}
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

function ShiftDetailModal({shift,person,editable,onClose,onEdit,onSaveRating}:{shift:Shift;person:Person|null;editable:boolean;onClose:()=>void;onEdit:()=>void;onSaveRating:(shift:Shift,rating:number,reason:string,tramNumber:string,tramRating:TramRating|null)=>Promise<boolean>}){
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
  const canRate=editable&&availableAt!==null&&clock>=availableAt.getTime();
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
      {!editable&&<div className="mr-auto flex items-center gap-1.5 text-[11px] text-slate-600"><Icon name="lock" size={13}/>Pouze ke čtení</div>}
      <button type="button" onClick={onClose} className={`${editable?"ml-auto":""} rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-white/[0.04]`}>Zavřít</button>
      {editable&&<button type="button" onClick={onEdit} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white hover:brightness-110">Upravit směnu</button>}
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

function EventsPage({events,people,currentPerson,openCreate,deleteEvent}:{events:EventItem[];people:Person[];currentPerson:Person|null;openCreate:()=>void;deleteEvent:(id:string)=>Promise<void>}){
  const [selectedEvent,setSelectedEvent]=useState<EventItem|null>(null);
  return <div><PageHeader eyebrow="PLÁNY" title="Události" description="Společné akce, výlety a další plány." action={<button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white"><Icon name="plus" size={16}/>Nová událost</button>}/><AutumnSectionTitle text="Podzimní plány"/>{events.length===0?<div className="rounded-3xl border border-dashed border-orange-300/10 bg-orange-300/[0.025] py-16 text-center"><div className="text-5xl">🍂</div><div className="mt-4 text-base font-semibold text-slate-300">Žádná událost</div></div>:<div className="grid gap-4 md:grid-cols-2">{events.map(e=><Card key={e.id} className="group cursor-pointer p-5 transition hover:-translate-y-1 hover:border-orange-300/20" ><div onClick={()=>setSelectedEvent(e)}><div className="flex items-start justify-between"><div><div className="text-xs text-orange-300">{formatDate(e.date)} · {e.time}</div><h3 className="mt-2 text-lg font-bold">{e.title}</h3><p className="mt-1 text-sm text-slate-500">{e.place||"Bez místa"}</p></div><span className="autumn-only text-2xl opacity-30">🍁</span></div><div className="mt-4 text-xs text-slate-500">Klikni pro detail události</div><div className="mt-4 flex -space-x-2">{e.participants.map(id=>{const p=people.find(x=>x.id===id);return p?<Avatar key={id} person={p} size={30}/>:null})}</div></div>{currentPerson?.authId===e.createdBy&&<button type="button" onClick={(event)=>{event.stopPropagation();deleteEvent(e.id)}} className="mt-4 text-xs text-slate-600 hover:text-red-400">Smazat událost</button>}</Card>)}</div>}{selectedEvent&&<EventDetailModal event={selectedEvent} people={people} onClose={()=>setSelectedEvent(null)}/>}</div>
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

function SettingsPage({currentPerson,setPeople,themeColor,setThemeColor,themeColor2,setThemeColor2,themeMode,setThemeMode,animationsEnabled,setAnimationsEnabled}:{currentPerson:Person|null;setPeople:React.Dispatch<React.SetStateAction<Person[]>>;themeColor:string;setThemeColor:(v:string)=>void;themeColor2:string;setThemeColor2:(v:string)=>void;themeMode:"autumn"|"classic";setThemeMode:(v:"autumn"|"classic")=>void;animationsEnabled:boolean;setAnimationsEnabled:(v:boolean)=>void}){
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
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/15 p-4"><div className="flex items-center gap-2 font-semibold"><span>🎂</span>Narozeniny</div><p className="mt-2 text-xs leading-5 text-slate-600">Nastav celé datum narození. Ostatní ho uvidí v kalendáři a v den narozenin se automaticky zobrazí i tvůj aktuální věk.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><div className="flex-1"><Input label="Datum narození" type="date" value={birthday} onChange={setBirthday}/></div><button type="button" onClick={saveBirthday} disabled={birthdaySaving} className="h-[46px] rounded-xl theme-primary px-5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50">{birthdaySaving?"Ukládám…":"Uložit narozeniny"}</button>{birthday&&<button type="button" onClick={()=>setBirthday("")} className="h-[46px] rounded-xl border border-white/[0.08] px-4 text-xs text-slate-400 hover:bg-white/[0.04]">Vymazat</button>}</div>{birthdayMessage&&<div className="mt-3 text-xs text-slate-400">{birthdayMessage}</div>}</div>
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
    <Card className="p-6 xl:col-span-2"><div className="flex items-center gap-2"><Icon name="leaf" size={18}/><h2 className="font-bold">Sezónní vzhled a animace</h2></div><p className="mt-3 text-sm text-slate-400">Přepni mezi podzimním Směnovníkem 2.1 a původním klasickým vzhledem. Animace lze vypnout zvlášť.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>setThemeMode("autumn")} className={`rounded-2xl border p-5 text-left transition ${themeMode==="autumn"?"border-orange-300/35 bg-orange-400/10":"border-white/[0.08] bg-black/15"}`}><div className="text-2xl">🍁</div><div className="mt-2 font-bold">Podzimní motiv</div><div className="mt-1 text-xs text-slate-500">Měděná, oranžová, listí a říjnové prvky.</div></button><button type="button" onClick={()=>setThemeMode("classic")} className={`rounded-2xl border p-5 text-left transition ${themeMode==="classic"?"theme-border theme-soft":"border-white/[0.08] bg-black/15"}`}><div className="text-2xl">✨</div><div className="mt-2 font-bold">Klasický motiv</div><div className="mt-1 text-xs text-slate-500">Původní barevný Směnovník.</div></button></div><button type="button" onClick={()=>setAnimationsEnabled(!animationsEnabled)} className="relative mt-4 flex w-full items-center justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left"><div className="pointer-events-none absolute -left-3 -bottom-6 text-7xl opacity-[0.08]">🍂</div><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/[0.06] text-2xl">🍁</div><div><div className="text-sm font-bold">Animace</div><div className="mt-1 text-xs text-slate-500">Padání listí a další jemné pohyby.</div></div></div><div className={`relative h-7 w-12 rounded-full p-1 transition ${animationsEnabled?"bg-orange-500":"bg-slate-700"}`}><div className={`h-5 w-5 rounded-full bg-white transition ${animationsEnabled?"translate-x-5":""}`}/></div></button></Card>
    <Card className="p-6 xl:col-span-2"><div className="flex items-center gap-2"><Icon name="lock" size={18}/><h2 className="font-bold">Změna hesla</h2></div><div className="mt-5 grid gap-3 md:grid-cols-3"><PasswordInput label="Staré heslo" value={oldPassword} onChange={setOldPassword}/><PasswordInput label="Nové heslo" value={newPassword} onChange={setNewPassword}/><PasswordInput label="Nové heslo znovu" value={newAgain} onChange={setNewAgain}/></div><button onClick={changePassword} className="theme-primary mt-5 rounded-xl px-5 py-3 text-xs font-bold text-white hover:brightness-110">Změnit heslo</button>{message&&<div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-slate-400">{message}</div>}</Card>
  </div></div>
}
function PasswordInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type="password" value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div>}

function ShiftModal({person,editing,date,setDate,endDate,setEndDate,type,setType,start,setStart,end,setEnd,note,setNote,saving,onClose,onSave,onDelete}:{person:Person;editing:Shift|null;date:string;setDate:(v:string)=>void;endDate:string;setEndDate:(v:string)=>void;type:ShiftType;setType:(v:ShiftType)=>void;start:string;setStart:(v:string)=>void;end:string;setEnd:(v:string)=>void;note:string;setNote:(v:string)=>void;saving:boolean;onClose:()=>void;onSave:()=>void;onDelete:()=>void}){return <Modal onClose={onClose}><div className="flex items-center gap-3"><Avatar person={person} size={44}/><div><h2 className="font-bold">{editing?"Upravit směnu":"Přidat směnu"}</h2><p className="text-xs text-slate-500">{person.name}</p></div></div><div className="mt-5 space-y-4"><div><label className="mb-2 block text-xs text-slate-400">{type==="vacation"?"Datum od":"Datum"}</label><input type="date" value={date} onChange={e=>{const value=e.target.value;setDate(value);if(type==="vacation"&&(!endDate||endDate<value))setEndDate(value);}} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div><div><label className="mb-2 block text-xs text-slate-400">Typ směny</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(shiftInfo) as ShiftType[]).map(t=><button key={t} onClick={()=>{setType(t);if(t==="vacation"){setEndDate(endDate||date);setStart("00:00");setEnd("23:59");}else if(t==="all_day"){setStart("00:00");setEnd("23:59");}else if(t==="intershift"){setStart("10:00");setEnd("18:00");}else if(t==="midnight"){setStart("00:00");setEnd("08:00");}}} className="flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold" style={type===t?{borderColor:`${shiftInfo[t].color}70`,background:`${shiftInfo[t].color}12`,color:shiftInfo[t].color}:{borderColor:"rgba(255,255,255,.06)",color:"#94a3b8"}}><Icon name={shiftInfo[t].icon} size={15}/>{shiftInfo[t].short}</button>)}</div></div>{type==="vacation"?<Input label="Datum do" type="date" value={endDate} onChange={setEndDate}/>:<div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div>}<div><label className="mb-2 block text-xs text-slate-400">Poznámka</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div></div><div className="mt-6 flex gap-2">{editing&&<button onClick={onDelete} className="rounded-xl border border-red-500/20 px-4 py-3 text-xs font-semibold text-red-400">Smazat</button>}<button onClick={onClose} className="ml-auto rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400">Zrušit</button><button onClick={onSave} disabled={saving} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110 disabled:opacity-50">{saving?"Ukládám…":"Uložit"}</button></div></Modal>}

function EventModal({people,onClose,onSave}:{people:Person[];onClose:()=>void;onSave:(e:EventItem)=>Promise<void>}){
  const[title,setTitle]=useState("");
  const[date,setDate]=useState("");
  const[time,setTime]=useState("18:00");
  const[place,setPlace]=useState("");
  const[description,setDescription]=useState("");
  const[participants,setParticipants]=useState<string[]>([]);
  const[saving,setSaving]=useState(false);

  const submit=async()=>{
    if(!title.trim()||!date||saving)return;
    setSaving(true);
    await onSave({id:"",title:title.trim(),date,time,place:place.trim(),description:description.trim(),participants});
    setSaving(false);
  };

  return <Modal onClose={onClose}><h2 className="font-bold">Nová událost</h2><div className="mt-5 space-y-4"><Input label="Název" value={title} onChange={setTitle}/><div className="grid grid-cols-2 gap-3"><ModernDateInput label="Datum" value={date} onChange={setDate}/><Input label="Čas" type="time" value={time} onChange={setTime}/></div><Input label="Místo" value={place} onChange={setPlace}/><div><label className="mb-2 block text-xs text-slate-400">Popis</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div><div><label className="mb-2 block text-xs text-slate-400">Účastníci</label><div className="flex flex-wrap gap-2">{people.map(p=><button type="button" key={p.id} onClick={()=>setParticipants(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={participants.includes(p.id)?{borderColor:`${p.color}60`,background:`${p.color}10`}:{borderColor:"rgba(255,255,255,.06)"}}><Avatar person={p} size={22}/>{p.name}</button>)}</div></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400 disabled:opacity-50">Zrušit</button><button type="button" onClick={submit} disabled={saving||!title.trim()||!date} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110 disabled:opacity-50">{saving?"Vytvářím…":"Vytvořit"}</button></div></Modal>
}

function PracticeModal({initialDate,onClose,onSave}:{initialDate?:string;onClose:()=>void;onSave:(p:PracticeItem)=>void}){const[date,setDate]=useState(initialDate||"");const[start,setStart]=useState("07:00");const[end,setEnd]=useState("14:00");const[note,setNote]=useState("");return <Modal onClose={onClose}><div className="flex items-center gap-2"><Icon name="briefcase"/><h2 className="font-bold">Přidat Davčův praxi</h2></div><div className="mt-5 space-y-4"><Input label="Datum" type="date" value={date} onChange={setDate}/><div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div><Input label="Poznámka" value={note} onChange={setNote}/></div><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400">Zrušit</button><button onClick={()=>{if(date)onSave({id:crypto.randomUUID(),date,startTime:start,endTime:end,note})}} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(128,58,18,.22)] hover:brightness-110">Uložit</button></div></Modal>}

function DavidPracticeSchedule({practice,canEdit,onAdd,onDelete}:{practice:PracticeItem[];canEdit:boolean;onAdd:(date?:string)=>void;onDelete:(id:string)=>Promise<void>}){
  const days=nearestOddWeekDays();
  return <div className="relative overflow-hidden rounded-3xl border border-[#5a4637]/55 bg-[linear-gradient(145deg,rgba(30,24,20,.97),rgba(15,13,12,.98))] p-5 shadow-[0_18px_50px_rgba(0,0,0,.28)] sm:p-6"><div className="pointer-events-none absolute -right-16 -top-14 text-7xl opacity-[0.05]">🍂</div><div className="relative mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6e5a49]/40 bg-[#2b241f] text-[#c9b7a7]"><Icon name="briefcase"/></div><div><h3 className="font-bold text-[#f1e7dc]">Davčův lichý týden – praxe</h3><p className="text-xs text-[#9f8d7e]">Klikni na den od pondělí do soboty a nastav čas od–do.</p></div></div><div className="relative grid gap-3 md:grid-cols-3 xl:grid-cols-6">{days.map(({day,date})=>{const item=practice.find(p=>p.date===date);return <button key={date} type="button" disabled={!canEdit} onClick={()=>onAdd(date)} className="min-h-[140px] rounded-2xl border border-[#6e5a49]/40 bg-[linear-gradient(145deg,rgba(53,43,35,.88),rgba(29,25,22,.94))] p-4 text-left transition hover:-translate-y-1 hover:border-[#8b735e]/65 hover:bg-[linear-gradient(145deg,rgba(63,51,41,.94),rgba(35,30,25,.96))] disabled:cursor-default"><div className="text-xs font-black text-[#d8c8b9]">{day}</div><div className="mt-1 text-[11px] text-[#7f7064]">{new Date(`${date}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})}</div>{item?<><div className="mt-5 text-lg font-black text-[#f4ece4]">{item.startTime}–{item.endTime}</div><div className="mt-2 line-clamp-2 text-xs text-[#a89687]">{item.note||"Praxe"}</div>{canEdit&&<span onClick={e=>{e.stopPropagation();onDelete(item.id)}} className="mt-3 inline-block text-[10px] text-red-400">Smazat</span>}</>:<><div className="mt-5 text-2xl text-[#8f7d6f] opacity-60">＋</div><div className="mt-2 text-xs text-[#8f7d6f]">{canEdit?"Nastavit praxi":"Bez zapsané praxe"}</div></>}</button>})}</div></div>
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
  </div>;
}

function UpdateIntroModal({onDone}:{onDone:()=>void}){return <Modal onClose={()=>{}}><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-400/10 text-3xl">🍂</div><div className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Směnovník {APP_VERSION}</div><h2 className="mt-2 text-2xl font-black">Vítej v aktualizaci 2.1</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Přidali jsme tisk, přesnější pracovní dobu a nové denní citáty.</p></div><div className="mt-6 max-h-[42vh] space-y-2 overflow-y-auto pr-1">{UPDATE_ITEMS_21.map(item=><div key={item} className="flex gap-3 rounded-xl bg-white/[0.025] p-3"><span className="text-orange-300">✓</span><span className="text-sm text-slate-300">{item}</span></div>)}</div><button type="button" onClick={onDone} className="mt-6 w-full rounded-2xl theme-primary py-3.5 text-sm font-black text-white">Super, přečetl jsem si to</button></Modal>}

function ShiftSavedToast({animations}:{animations:boolean}){return <div className="pointer-events-none fixed inset-0 z-[140] flex items-start justify-center pt-24">{animations&&<div className="absolute inset-0 overflow-hidden">{Array.from({length:8},(_,i)=><span key={i} className="leaf-fall absolute -top-10 text-2xl" style={{left:`${(i*7)%100}%`,animationDelay:`${(i%6)*.12}s`,animationDuration:`${1.6+(i%4)*.25}s`}}>{i%2?"🍂":"🍁"}</span>)}</div>}<div className="relative rounded-2xl border border-emerald-300/20 bg-[#0b1510]/95 px-5 py-3 shadow-2xl backdrop-blur-xl"><div className="flex items-center gap-3 text-sm font-bold text-emerald-200"><Icon name="check" size={18}/>Směna byla úspěšně uložena</div></div></div>}

const AUTUMN_FALLING_LEAVES = [
  {left:"5%",delay:"-2s",duration:"17s",size:"text-2xl",leaf:"🍂"},
  {left:"21%",delay:"-9s",duration:"20s",size:"text-3xl",leaf:"🍁"},
  {left:"39%",delay:"-5s",duration:"18s",size:"text-xl",leaf:"🍂"},
  {left:"58%",delay:"-13s",duration:"22s",size:"text-2xl",leaf:"🍁"},
  {left:"77%",delay:"-7s",duration:"19s",size:"text-3xl",leaf:"🍂"},
  {left:"94%",delay:"-16s",duration:"23s",size:"text-xl",leaf:"🍁"},
] as const;

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

function EventDetailModal({event,people,onClose}:{event:EventItem;people:Person[];onClose:()=>void}){return <Modal onClose={onClose}><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-orange-300">{formatDate(event.date)} · {event.time}</div><h2 className="mt-2 text-2xl font-black">{event.title}</h2></div><span className="text-3xl">🍁</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><DetailBox label="Místo" value={event.place||"Bez místa"}/><DetailBox label="Čas" value={event.time||"Bez času"}/></div><div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">Poznámka / popis</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{event.description||"Bez poznámky"}</div></div><div className="mt-5"><div className="text-xs font-bold text-slate-400">Účastníci</div><div className="mt-3 flex flex-wrap gap-2">{event.participants.length?event.participants.map(id=>{const p=people.find(x=>x.id===id);return p?<div key={id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs"><Avatar person={p} size={24}/>{p.name}</div>:null}):<span className="text-xs text-slate-600">Nikdo vybraný</span>}</div></div><button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-white/[0.08] py-3 text-xs font-bold text-slate-300">Zavřít</button></Modal>}
function DetailBox({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-600">{label}</div><div className="mt-2 text-sm font-semibold text-slate-200">{value}</div></div>}
function ModernDateInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><div className="relative overflow-hidden rounded-xl border border-orange-300/15 bg-[linear-gradient(135deg,rgba(249,115,22,.07),rgba(0,0,0,.2))]"><div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-300"><Icon name="calendar" size={16}/></div><input type="date" value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-transparent py-3 pl-10 pr-4 text-sm outline-none [color-scheme:dark]"/></div></div>}

function Modal({children,onClose}:{children:ReactNode;onClose:()=>void}){return <div className="app-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm" style={{position:"fixed",inset:0,zIndex:9999,pointerEvents:"auto"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="app-modal my-auto max-h-[calc(100vh-3rem)] w-full max-w-[560px] overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[linear-gradient(145deg,#101522,#090c14)] p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)]" style={{pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>{children}</div></div>}
function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-orange-300/45 focus:ring-2 focus:ring-orange-500/10"/></div>}