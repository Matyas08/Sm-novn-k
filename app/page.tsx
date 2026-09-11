"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ShiftType = "morning" | "afternoon" | "intershift" | "night" | "midnight" | "all_day" | "emergency" | "vacation" | "sick";
type TramRating = "mrdka" | "usla" | "topka";
type Page = "overview" | "shifts" | "events" | "stats" | "settings";
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

const APP_ACCENT = "#6d5dfc";
const APP_ACCENT_SECONDARY = "#8b5cf6";
const DAVID_AUTH_ID = "0989a80c-eaec-425b-a9e9-6ff0173c678d";
const TRAM_REVIEW_EMAILS = new Set(["matejuher15@gmail.com"]);
const TRAM_RATING_LABELS:Record<TramRating,string>={mrdka:"Mrdka",usla:"Ušla",topka:"Topka"};
const TEAM_DESCRIPTIONS:Record<string,string>={
  "jakub.proch145@seznam.cz":"Ten, co rád papá a všechno zničí",
  "dkudlata9@gmail.com":"Ten, co hodně moc kakánkuje a sere Tibího",
  "matejuher15@gmail.com":"Ten, co neustále vymýšlí nové věci a jenom prdí",
  "08matytibi3115@gmail.com":"Ten, co šikanuje Davida a Kubu s Matym",
};

// Doplňková česká jména, která základní svátkové API nevrací.
const EXTRA_CZECH_NAME_DAYS: Record<string, string[]> = {
  "09-03": ["Bronislava"],
  "09-06": ["Boleslava"],
};

const loginUsers = [
  { name: "Tibík", email: "08matytibi3115@gmail.com", color: "#22d3ee", avatar: "T" },
  { name: "Davča", email: "dkudlata9@gmail.com", color: "#a855f7", avatar: "K" },
  { name: "Matýsek", email: "matejuher15@gmail.com", color: "#3b82f6", avatar: "M" },
  { name: "Kuba", email: "jakub.proch145@seznam.cz", color: "#ef4444", avatar: "K" },
] as const;

const shiftInfo: Record<ShiftType, { label: string; short: string; color: string; icon: string }> = {
  morning: { label: "Ranní směna", short: "Ranní", color: "#facc15", icon: "sun" },
  afternoon: { label: "Odpolední směna", short: "Odpolední", color: "#fb923c", icon: "sunset" },
  intershift: { label: "Mezisměna", short: "Mezisměna", color: "#22d3ee", icon: "clock" },
  night: { label: "Noční směna", short: "Noční", color: "#a78bfa", icon: "moon" },
  midnight: { label: "Polonoc směna", short: "Polonoc", color: "#f472b6", icon: "moon" },
  all_day: { label: "Celodenní směna", short: "Celodenní", color: "#34d399", icon: "clock" },
  emergency: { label: "Mimořádná směna", short: "Mimořádná směna", color: "#ef4444", icon: "alert" },
  vacation: { label: "Dovolená", short: "Dovolená", color: "#38bdf8", icon: "plane" },
  sick: { label: "Nemoc", short: "Nemoc", color: "#94a3b8", icon: "heart" },
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
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function mondayOffset(year: number, month: number) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
function isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

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

function czechCount(value: number, one: string, few: string, many: string) {
  return `${value} ${value === 1 ? one : value >= 2 && value <= 4 ? few : many}`;
}

function shiftCountdown(shift: Shift, now: number | null) {
  if (now === null) return "Počítám…";
  const start = shiftStartAt(shift).getTime();
  if (now >= start) return now < shiftEndAt(shift).getTime() ? "Směna právě probíhá" : "Směna skončila";
  let minutes = Math.ceil((start - now) / 60000);
  const days = Math.floor(minutes / 1440); minutes -= days * 1440;
  const hours = Math.floor(minutes / 60); minutes -= hours * 60;
  const parts:string[]=[];
  if(days)parts.push(czechCount(days,"den","dny","dní"));
  if(hours)parts.push(czechCount(hours,"hodinu","hodiny","hodin"));
  if(minutes)parts.push(czechCount(minutes,"minutu","minuty","minut"));
  return `Za ${parts.join(" ") || "méně než minutu"}`;
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
  const [tibiWeek, setTibiWeek] = useState<"odd" | "even">("odd");
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
      const mapped: Person[] = (data ?? []).map(p => ({ id: p.id, name: p.name, email: p.email, color: p.color || loginUsers.find(u=>u.email===p.email)?.color || "#64748b", avatar: p.avatar || p.name?.charAt(0)?.toUpperCase() || "?", authId: p.auth_id, birthday: p.birthday || null }));
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
    setThemeColor(saved || APP_ACCENT);
    setThemeColor2(saved2 || APP_ACCENT_SECONDARY);
  }, [currentPerson]);

  useEffect(() => {
    if (!currentPerson) return;
    localStorage.setItem(`shift-theme-${currentPerson.email}`, themeColor);
    localStorage.setItem(`shift-theme2-${currentPerson.email}`, themeColor2);
  }, [currentPerson, themeColor, themeColor2]);

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
      setShowShiftModal(false); setEditingShift(null);
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

  const stats = useMemo(() => people.map(person => {
    const ps = shifts.filter(s=>s.userId===person.id);
    const counts:Record<ShiftType,number>={morning:0,afternoon:0,intershift:0,night:0,midnight:0,all_day:0,emergency:0,vacation:0,sick:0};
    let totalMinutes=0;
    let ratingTotal=0;
    let ratedShifts=0;
    for(const s of ps){
      counts[s.type]++;
      if(s.rating!==null){ratingTotal+=s.rating;ratedShifts++;}
      if(s.type==="vacation"||s.type==="sick")continue;
      const [sh,sm]=s.startTime.split(":").map(Number), [eh,em]=s.endTime.split(":").map(Number);
      let a=sh*60+sm,b=eh*60+em;
      if(b<=a)b+=1440;
      totalMinutes+=b-a;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return {
      person,
      shifts: ps.length,
      hours,
      minutes,
      totalMinutes,
      ratingAverage:ratedShifts?ratingTotal/ratedShifts:null,
      ratedShifts,
      ...counts
    };
  }), [people, shifts]);

  if (authLoading) return <CenterMessage icon="calendar" text="Kontroluji přihlášení…" />;
  if (!session) return <LoginScreen selected={selectedLoginUser} setSelected={setSelectedLoginUser} password={loginPassword} setPassword={setLoginPassword} error={loginError} loading={loginLoading} onLogin={login} />;

  return <main
    className="min-h-screen bg-[#050711] text-white"
    style={{
      "--theme": themeColor,
      "--theme2": themeColor2,
      backgroundImage: `radial-gradient(circle at 15% 10%, ${themeColor}18, transparent 32%), radial-gradient(circle at 85% 0%, ${themeColor2}16, transparent 30%), linear-gradient(180deg,#050711 0%,#070a12 55%,#05070d 100%)`,
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
    `}</style>
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentPerson={currentPerson} onLogout={logout} />
      <section className="w-full lg:ml-[252px]">
        <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-24 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {activePage === "overview" && <Overview people={people} shifts={shifts} currentPerson={currentPerson} events={events} nameDay={nameDay} openAddShift={openAddShift} tibiWeek={tibiWeek} setTibiWeek={setTibiWeek} tibiOdd={tibiOdd} tibiEven={tibiEven} davidSchool={davidSchool} practice={practice} openPractice={()=>setShowPracticeModal(true)} deletePractice={deletePractice} />}
          {activePage === "shifts" && <ShiftsPage people={people} shifts={shifts} currentPerson={currentPerson} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} month={month} year={year} changeMonth={changeMonth} filter={shiftFilter} setFilter={setShiftFilter} openAddShift={openAddShift} openEditShift={openEditShift} saveShiftRating={saveShiftRating} loading={loadingShifts} />}
          {activePage === "events" && <EventsPage events={events} people={people} currentPerson={currentPerson} openCreate={()=>setShowEventModal(true)} deleteEvent={deleteEvent} />}
          {activePage === "stats" && <StatsPage stats={stats} selectedId={statsPersonId} setSelectedId={setStatsPersonId} />}
          {activePage === "settings" && <SettingsPage currentPerson={currentPerson} setPeople={setPeople} themeColor={themeColor} setThemeColor={setThemeColor} themeColor2={themeColor2} setThemeColor2={setThemeColor2} />}
        </div>
      </section>
    </div>

    {showShiftModal && currentPerson && <ShiftModal person={currentPerson} editing={editingShift} date={shiftDate} setDate={setShiftDate} endDate={shiftEndDate} setEndDate={setShiftEndDate} type={shiftType} setType={setShiftType} start={startTime} setStart={setStartTime} end={endTime} setEnd={setEndTime} note={note} setNote={setNote} saving={savingShift} onClose={()=>setShowShiftModal(false)} onSave={saveShift} onDelete={deleteShift} />}
    {showEventModal && <EventModal people={people} onClose={()=>setShowEventModal(false)} onSave={saveEvent} />}
    {showPracticeModal && currentPerson?.email === "dkudlata9@gmail.com" && <PracticeModal onClose={()=>setShowPracticeModal(false)} onSave={savePractice} />}
  </main>;
}

function CenterMessage({ icon, text }: { icon: string; text: string }) { return <div className="flex min-h-screen items-center justify-center bg-[#050711] text-white [background-image:radial-gradient(circle_at_center,rgba(109,93,252,.12),transparent_35%)]"><div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 shadow-[0_0_40px_rgba(99,102,241,.18)]"><Icon name={icon} size={28}/></div><p className="text-sm text-slate-400">{text}</p></div></div>; }

function LoginScreen({ selected, setSelected, password, setPassword, error, loading, onLogin }: { selected: (typeof loginUsers)[number] | null; setSelected: (u:(typeof loginUsers)[number] | null)=>void; password:string; setPassword:(v:string)=>void; error:string; loading:boolean; onLogin:()=>void; }) {
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070b] px-5 text-white">
    <><div className="pointer-events-none absolute left-1/3 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.08] blur-[150px]"/><div className="pointer-events-none absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-violet-500/[0.08] blur-[160px]"/></>
    <div className="relative z-10 w-full max-w-[900px]">
      <div className="mb-10 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-300"><Icon name="calendar" size={31}/></div><h1 className="text-3xl font-bold sm:text-4xl">Kdo jsi?</h1><p className="mt-2 text-sm text-slate-500">Vyber svůj účet a přihlas se</p></div>
      {!selected ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{loginUsers.map(u=><button key={u.email} onClick={()=>setSelected(u)} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:-translate-y-1 hover:bg-white/[0.05]"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl font-bold" style={{background:`linear-gradient(135deg,${u.color},${u.color}55)`}}>{u.avatar}</div><div className="font-bold">{u.name}</div><div className="mt-1 text-xs text-slate-500">Přihlásit se</div></button>)}</div>
      : <div className="mx-auto max-w-[420px] rounded-[30px] border border-white/[0.08] bg-[#0c0f16]/90 p-7 shadow-2xl"><div className="mb-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl font-bold" style={{background:`linear-gradient(135deg,${selected.color},${selected.color}55)`}}>{selected.avatar}</div><div><div className="font-bold">{selected.name}</div><div className="text-xs text-slate-500">{selected.email}</div></div></div><label className="mb-2 block text-xs text-slate-400">Heslo</label><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")onLogin();}} className="w-full rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3.5 text-sm outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10" placeholder="Zadej heslo"/>{error&&<div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">{error}</div>}<button onClick={onLogin} disabled={loading||!password} className="mt-5 w-full rounded-2xl theme-primary py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(99,102,241,.28)] hover:brightness-110 disabled:opacity-50">{loading?"Přihlašuji…":"Přihlásit se"}</button><button onClick={()=>{setSelected(null);setPassword("");}} className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-white"><Icon name="left" size={14}/> Změnit uživatele</button></div>}
    </div>
  </div>;
}

function Sidebar({ activePage, setActivePage, currentPerson, onLogout }: { activePage:Page; setActivePage:(p:Page)=>void; currentPerson:Person|null; onLogout:()=>void; }) {
  const items: {page:Page;icon:string;label:string}[] = [{page:"overview",icon:"home",label:"Přehled"},{page:"shifts",icon:"calendar",label:"Směny"},{page:"events",icon:"event",label:"Události"},{page:"stats",icon:"chart",label:"Statistiky"},{page:"settings",icon:"settings",label:"Nastavení"}];
  return <><aside className="fixed left-0 top-0 z-40 hidden h-screen w-[252px] border-r border-white/[0.07] bg-[#080b13]/90 px-5 py-6 shadow-[20px_0_60px_rgba(0,0,0,.18)] backdrop-blur-2xl lg:flex lg:flex-col"><div className="mb-9 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border theme-soft theme-ring"><Icon name="calendar" size={24}/></div><div><div className="text-[15px] font-black tracking-tight">Směnovník</div><div className="text-[11px] text-slate-500">směny, škola & společný čas</div></div></div><nav className="space-y-1.5">{items.map(i=><button key={i.page} onClick={()=>setActivePage(i.page)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${activePage===i.page?"border theme-soft":"border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-white"}`}><Icon name={i.icon} size={19}/>{i.label}</button>)}</nav><div className="mt-auto">{currentPerson&&<div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 shadow-[0_12px_30px_rgba(0,0,0,.16)]"><div className="flex items-center gap-3"><Avatar person={currentPerson} size={38}/><div><div className="text-sm font-semibold">{currentPerson.name}</div><div className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]"/>Přihlášen</div></div></div></div>}<button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"><Icon name="logout" size={19}/>Odhlásit se</button></div></aside><div className="fixed left-0 right-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#080b13]/90 px-4 backdrop-blur-2xl lg:hidden"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border theme-soft"><Icon name="calendar" size={20}/></div><span className="font-black">Směnovník</span></div><button onClick={onLogout} className="rounded-xl p-2 text-slate-400 hover:text-red-400"><Icon name="logout"/></button></div><nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/[0.07] bg-[#080b13]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_40px_rgba(0,0,0,.28)] backdrop-blur-2xl lg:hidden">{items.map(i=><button key={`mobile-${i.page}`} onClick={()=>setActivePage(i.page)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition ${activePage===i.page?"theme-soft":"text-slate-500 hover:bg-white/[0.03] hover:text-white"}`}><Icon name={i.icon} size={18}/><span className="max-w-full truncate">{i.label}</span></button>)}</nav></>;
}

function PageHeader({ eyebrow,title,description,action }: { eyebrow:string;title:string;description:string;action?:ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 inline-flex rounded-full border theme-soft px-2.5 py-1 text-[9px] font-bold tracking-[.22em]">{eyebrow}</div><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-slate-400">{description}</p></div>{action}</div>; }
function Card({children,className=""}:{children:ReactNode;className?:string}){return <div className={`rounded-3xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,20,34,.96),rgba(7,10,18,.94))] shadow-[0_18px_50px_rgba(0,0,0,.22)] ${className}`}>{children}</div>}

function dailyBoost(person: Person | null) {
  const vocative: Record<string,string> = {
    "Tibík": "Tibíku",
    "Davča": "Davča",
    "Matýsek": "Matýsku",
    "Kuba": "Kubo",
  };
  const name = person ? (vocative[person.name] || person.name) : "kámo";
  const messages = [
    `Dneska ti to fakt sluší, ${name}. ✨`,
    `Dneska to zvládneš v klidu, ${name}. 💫`,
    `Tvoje energie dneska stojí za to, ${name}.`,
    `Nezapomeň se dneska taky trochu pochválit, ${name}.`,
    `Dneska je dobrej den udělat něco jen pro sebe, ${name}.`,
    `I malý krok dopředu se počítá. Jen tak dál, ${name}.`,
    `Úsměv ti dneska sedne víc než ranní budík, ${name}. ☀️`,
    `Jsi dál, než sis před časem myslel, ${name}.`,
    `Dneska na sebe netlač. Stačí být svůj, ${name}.`,
    `Někdo dneska určitě ocení, že jsi přesně takový, jaký jsi, ${name}.`,
  ];
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return messages[day % messages.length];
}

function Overview({ people, shifts, currentPerson, events, nameDay, openAddShift, tibiWeek, setTibiWeek, tibiOdd, tibiEven, davidSchool, practice, openPractice, deletePractice }: { people:Person[]; shifts:Shift[]; currentPerson:Person|null; events:EventItem[]; nameDay:string; openAddShift:(date?:string)=>void; tibiWeek:"odd"|"even"; setTibiWeek:(v:"odd"|"even")=>void; tibiOdd:WeekSchedule;tibiEven:WeekSchedule;davidSchool:WeekSchedule;practice:PracticeItem[];openPractice:()=>void;deletePractice:(id:string)=>Promise<void>; }) {
  const [clock,setClock]=useState<number|null>(null);
  useEffect(()=>{
    setClock(Date.now());
    const interval=setInterval(()=>setClock(Date.now()),60000);
    return()=>clearInterval(interval);
  },[]);
  const today=isoToday(); const upcoming=[...shifts].filter(s=>s.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  return <div><PageHeader eyebrow="SMĚNOVNÍK" title="Přehled" description="Všechno důležité na jednom místě." action={<div className="flex max-w-[440px] flex-col gap-2"><div className="rounded-2xl border theme-border bg-white/[0.025] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,.14)]"><div className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-600">Dnešní povzbuzení</div><div className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-200">{dailyBoost(currentPerson)}</div></div><div className="self-end rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-400">🎉 Dnes {nameDay.includes(",") ? "mají" : "má"} svátek <span className="font-semibold text-slate-200">{nameDay || "načítám…"}</span></div></div>}/>
    <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {people.map(p=>{
        const todayShifts=shifts
          .filter(x=>x.userId===p.id&&(x.type==="vacation"?today>=x.date&&today<=(x.endDate||x.date):x.date===today))
          .sort((a,b)=>a.startTime.localeCompare(b.startTime));
        return <div key={p.id} className="group relative overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(15,20,34,.94),rgba(7,10,18,.90))] p-5 shadow-[0_18px_50px_rgba(0,0,0,.25)] transition duration-300 hover:-translate-y-1" style={{borderColor:`${p.color}38`,boxShadow:`0 18px 50px rgba(0,0,0,.25), 0 0 28px ${p.color}10`}}>
          <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-[55px]" style={{background:`${p.color}28`}}/>
          <div className="relative flex items-center gap-4">
            <Avatar person={p} size={54}/>
            <div className="min-w-0 flex-1"><div className="text-[15px] font-black tracking-tight">{p.name}</div><div className="mt-1 text-xs leading-relaxed" style={{color:p.color}}>{TEAM_DESCRIPTIONS[p.email]||"Člen týmu"}</div></div>
          </div>
          <div className="relative mt-5 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
            {todayShifts.length>0?<div className="space-y-2">{todayShifts.map(s=><div key={s.id} className="rounded-xl border px-3 py-2" style={{borderColor:`${shiftInfo[s.type].color}38`,background:`${shiftInfo[s.type].color}0d`}}><div className="flex items-center gap-2 text-sm font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={16}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-base font-black tracking-tight">{s.startTime} – {s.endTime}</div></div>)}</div>:<><div className="text-sm font-semibold text-slate-300">Dnes nemá směnu</div><div className="mt-1 text-xs text-slate-600">Volno</div></>}
          </div>
        </div>
      })}
    </section>
    <section className="mb-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Nejbližší směny</h2><p className="mt-1 text-xs text-slate-500">Co nás čeká dál</p></div><button onClick={()=>openAddShift()} className="flex items-center gap-2 rounded-xl theme-primary px-3 py-2 text-xs font-bold text-white shadow-[0_8px_22px_rgba(99,102,241,.22)] hover:brightness-110"><Icon name="plus" size={15}/>Přidat</button></div><div className="space-y-2">{upcoming.length===0?<Empty text="Zatím nejsou žádné směny."/>:upcoming.map(s=>{const p=people.find(x=>x.id===s.userId);if(!p)return null;return <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><Avatar person={p} size={38}/><div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-slate-500">{formatDate(s.date)}</div><div className="mt-1 text-[10px] font-bold theme-text">{shiftCountdown(s,clock)}</div></div><div className="text-right"><div className="flex items-center justify-end gap-1 text-xs font-semibold" style={{color:shiftInfo[s.type].color}}><Icon name={shiftInfo[s.type].icon} size={13}/>{shiftInfo[s.type].short}</div><div className="mt-1 text-xs text-slate-500">{s.startTime} – {s.endTime}</div></div></div>})}</div></Card><Card className="p-6"><h2 className="font-bold">Rychlé informace</h2><p className="mt-1 text-xs text-slate-500">Aktuální stav</p><div className="mt-5 space-y-3"><MiniStat icon="calendar" label="Směn dnes" value={shifts.filter(s=>s.type==="vacation"?today>=s.date&&today<=(s.endDate||s.date):s.date===today).length}/><MiniStat icon="chart" label="Celkem směn" value={shifts.length}/><MiniStat icon="users" label="Členů" value={people.length}/><MiniStat icon="event" label="Událostí" value={events.length}/></div></Card></section>
    <section><div className="mb-4"><h2 className="text-lg font-bold">Škola a praxe</h2><p className="mt-1 text-xs text-slate-500">Rozvrhy zůstávají jen v Přehledu a nemění barvu celého webu.</p></div><div className="grid gap-6"><SchoolSchedule title="Tibíkův rozvrh" person={people.find(p=>p.email==="08matytibi3115@gmail.com")} schedule={tibiWeek==="odd"?tibiOdd:tibiEven} switcher={<div className="flex gap-2"><SmallToggle active={tibiWeek==="odd"} onClick={()=>setTibiWeek("odd")}>Lichý týden</SmallToggle><SmallToggle active={tibiWeek==="even"} onClick={()=>setTibiWeek("even")}>Sudý týden</SmallToggle></div>}/><SchoolSchedule title="Davčův školní rozvrh" person={people.find(p=>p.email==="dkudlata9@gmail.com")} schedule={davidSchool}/></div><Card className="mt-5 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon name="briefcase"/></div><div><h3 className="font-bold">Davčův praxe</h3><p className="text-xs text-slate-500">Samostatný přehled praxe pouze tady.</p></div></div>{currentPerson?.email==="dkudlata9@gmail.com"?<button onClick={openPractice} className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"><Icon name="plus" size={14}/>Přidat praxi</button>:<div className="flex items-center gap-2 text-[11px] text-slate-600"><Icon name="lock" size={13}/>Praxi upravuje pouze Davča</div>}</div>{practice.length===0?<Empty text="Zatím není zapsaná žádná praxe."/>:<div className="grid gap-2 md:grid-cols-2">{practice.map(p=><div key={p.id} className="flex items-center gap-3 rounded-2xl bg-black/20 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon name="briefcase" size={17}/></div><div className="flex-1"><div className="text-sm font-semibold">{formatDate(p.date)}</div><div className="text-xs text-slate-500">{p.startTime} – {p.endTime}{p.note?` · ${p.note}`:""}</div></div>{currentPerson?.email==="dkudlata9@gmail.com"&&<button onClick={()=>deletePractice(p.id)} className="text-xs text-slate-600 hover:text-red-400">Smazat</button>}</div>)}</div>}</Card></section>
  </div>;
}

function MiniStat({icon,label,value}:{icon:string;label:string;value:number}){return <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.04]"><div className="flex items-center gap-3 text-slate-300"><div className="flex h-8 w-8 items-center justify-center rounded-xl theme-soft"><Icon name={icon} size={16}/></div><span className="text-sm">{label}</span></div><span className="text-lg font-black">{value}</span></div>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-white/[0.10] bg-black/10 py-9 text-center text-sm text-slate-500">{text}</div>}
function SmallToggle({active,onClick,children}:{active:boolean;onClick:()=>void;children:ReactNode}){return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${active?"border theme-soft theme-ring":"border border-white/[0.07] text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"}`}>{children}</button>}

function SchoolSchedule({title,person,schedule,switcher}:{title:string;person?:Person;schedule:WeekSchedule;switcher?:ReactNode}){
  return <div className="relative overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(15,20,34,.92),rgba(7,10,18,.88))] shadow-[0_18px_50px_rgba(0,0,0,.22)]" style={{borderColor:person?`${person.color}26`:"rgba(255,255,255,.08)"}}>
    {person&&<div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-[65px]" style={{background:`${person.color}1f`}}/>}
    <div className="relative flex flex-col justify-between gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex items-center gap-3">{person&&<Avatar person={person} size={42}/>}<div><div className="font-bold">{title}</div><div className="text-[11px] text-slate-500">0.–7. vyučovací hodina</div></div></div>{switcher}
    </div>
    <div className="relative overflow-x-auto p-4 sm:p-6">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[58px_repeat(8,minmax(92px,1fr))] gap-1.5">
          <div/>
          {SCHOOL_PERIODS.map(period=><div key={period.number} title={`${period.number}. hodina · ${period.start}–${period.end}`} className="text-center leading-tight">
            <div className="text-xs font-extrabold text-slate-300">{period.number}.</div>
            <div className="mt-1 text-[9px] font-semibold text-slate-600">{period.start}–{period.end}</div>
          </div>)}
          {Object.entries(schedule).map(([day,lessons])=><div key={day} className="contents">
            <div className="flex min-h-[72px] items-center font-bold text-slate-400">{day}</div>
            {Array.from({length:8},(_,i)=>lessons[i]??{subject:"—"}).map((l,i)=>{const empty=l.subject==="—"; return <div key={`${day}-${i}`} title={`${l.subject}${l.room?` · ${l.room}`:""}`} className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition ${empty?"border-white/[0.035] bg-white/[0.015] text-slate-700":"border-white/[0.06] bg-white/[0.035] text-slate-200 hover:bg-white/[0.06]"}`}>
              <div className="font-bold">{shortSubject(l.subject)}</div>
              {l.room&&l.subject!=="—"&&<div className="mt-1 text-[9px] font-medium text-slate-600">uč. {l.room}</div>}
            </div>})}
          </div>)}
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

function ShiftsPage({people,shifts,currentPerson,selectedPerson,setSelectedPerson,month,year,changeMonth,filter,setFilter,openAddShift,openEditShift,saveShiftRating,loading}:{people:Person[];shifts:Shift[];currentPerson:Person|null;selectedPerson:Person|null;setSelectedPerson:(p:Person|null)=>void;month:number;year:number;changeMonth:(d:number)=>void;filter:ShiftType|"all";setFilter:(f:ShiftType|"all")=>void;openAddShift:(d?:string)=>void;openEditShift:(s:Shift)=>void;saveShiftRating:(shift:Shift,rating:number,reason:string,tramNumber:string,tramRating:TramRating|null)=>Promise<boolean>;loading:boolean;}){
  const [detailShift,setDetailShift]=useState<Shift|null>(null);
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
    for(const person of visible){
      const monthDay=person.birthday?.slice(5);
      if(!monthDay)continue;
      const list=result.get(monthDay) ?? [];
      list.push(person);
      result.set(monthDay,list);
    }
    return result;
  },[visible]);
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
      if(!visibleIds.has(shift.userId)||(filter!=="all"&&shift.type!==filter))continue;
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
  },[shifts,visibleIds,filter,year,month]);
  const peopleById=useMemo(() => new Map(people.map(person=>[person.id,person])),[people]);
  const today=isoToday();
  return <div><PageHeader eyebrow="KALENDÁŘ" title="Směny" description="Přehled směn všech členů." action={<button onClick={()=>openAddShift()} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white hover:brightness-110"><Icon name="plus" size={16}/>Přidat směnu</button>}/><div className="mb-5 flex flex-wrap gap-2"><FilterButton active={filter==="all"} onClick={()=>setFilter("all")} label="Všechny"/>{(Object.keys(shiftInfo) as ShiftType[]).map(t=><FilterButton key={t} active={filter===t} onClick={()=>setFilter(t)} label={shiftInfo[t].short} color={shiftInfo[t].color} icon={shiftInfo[t].icon}/>)}</div><div className="mb-5 flex gap-2 overflow-x-auto"><button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();setSelectedPerson(null);}} aria-pressed={!selectedPerson} className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${!selectedPerson?"border-white/20 bg-white/[0.10] text-white shadow-[0_8px_22px_rgba(0,0,0,.16)]":"border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:text-white"}`}>Všichni</button>{people.map(p=><button type="button" key={p.id} onClick={(e)=>{e.preventDefault();e.stopPropagation();setSelectedPerson(p);}} className="flex items-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2 text-xs transition hover:bg-white/[0.03]" style={selectedPerson?.id===p.id?{borderColor:`${p.color}60`,background:`${p.color}10`}:undefined}><Avatar person={p} size={23}/>{p.name}</button>)}</div><div className="-mx-1 overflow-x-auto pb-2"><div className="min-w-[760px] px-1"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.06] p-4"><button onClick={()=>changeMonth(-1)} className="rounded-xl p-2 text-slate-500 hover:bg-white/[0.05]"><Icon name="left"/></button><div className="text-center"><div className="text-lg font-bold capitalize">{monthName(year,month)}</div><div className="text-xs text-slate-500">{year}</div></div><button onClick={()=>changeMonth(1)} className="rounded-xl p-2 text-slate-500 hover:bg-white/[0.05]"><Icon name="right"/></button></div><div className="grid grid-cols-7 border-b border-white/[0.06]">{["Po","Út","St","Čt","Pá","So","Ne"].map((d,idx)=><div key={d} className={`p-3 text-center text-[10px] font-bold ${idx>=5?"text-slate-500":"text-slate-600"}`}>{d}</div>)}</div><div className="grid grid-cols-7">{cells.map((day,i)=>{if(!day)return <div key={`e${i}`} className="min-h-[105px] border-b border-r border-white/[0.04] bg-black/10"/>; const date=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const isToday=date===today; const weekend=(i%7)>=5; return <div key={date} onClick={()=>{if(!currentPerson)return;openAddShift(date)}} className={`relative min-h-[105px] cursor-pointer border-b border-r border-white/[0.04] p-2 transition hover:bg-white/[0.035] ${weekend?"bg-white/[0.012]":""}`} style={isToday?{background:"color-mix(in srgb, var(--theme) 7%, transparent)",boxShadow:"inset 0 0 0 1px color-mix(in srgb, var(--theme) 28%, transparent)"}:undefined}><div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold ${isToday?"theme-soft":"text-slate-500"}`}>{day}</div>{(birthdaysByMonthDay.get(date.slice(5))?.length??0)>0&&<div className="mb-1.5 space-y-1">{birthdaysByMonthDay.get(date.slice(5))!.map(p=><div key={`birthday-${p.id}`} className="truncate rounded-lg border px-2 py-1 text-[9px] font-bold" style={{borderColor:`${p.color}45`,background:`${p.color}12`,color:p.color}}>🎂 {p.name} — {birthdayAgeOnDate(p.birthday,date)} let</div>)}</div>}<div className="space-y-1">{(shiftsByDate.get(date)??[]).map(s=>{const p=peopleById.get(s.userId);if(!p)return null;return <div key={s.id} onClick={e=>{e.stopPropagation();setDetailShift(s)}} className="rounded-lg px-2 py-1.5 text-[9px] font-semibold transition hover:brightness-110" style={{
  background:`linear-gradient(135deg, ${shiftInfo[s.type].color}55, ${shiftInfo[s.type].color}20)`,
  color:"#fff",
  border:`1px solid ${shiftInfo[s.type].color}88`,
  borderLeft:`3px solid ${shiftInfo[s.type].color}`,
  boxShadow:`inset 0 0 22px ${shiftInfo[s.type].color}20, 0 6px 20px ${shiftInfo[s.type].color}18`,
  cursor:"pointer"
}}><div className="flex min-w-0 items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{background:p.color,boxShadow:`0 0 7px ${p.color}`}}/><span className="truncate text-[10px] font-black" style={{color:p.color}}>{p.name}</span><span className="truncate opacity-75">· {shiftInfo[s.type].short}</span>{s.rating!==null&&<span className="ml-auto shrink-0 text-[9px] text-amber-300">{s.rating}★</span>}</div><div className="mt-0.5 opacity-70">{s.type==="vacation"?`Dovolená do ${new Date(`${s.endDate||s.date}T12:00:00`).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"})}`:`${s.startTime}–${s.endTime}`}</div></div>})}</div></div>})}</div></Card></div></div><div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs text-slate-500"><Icon name="lock" size={15}/>{loading?"Načítám směny…":"Upravovat můžeš pouze svoje směny. Směny ostatních jsou pouze k zobrazení."}</div>{detailShift&&<ShiftDetailModal shift={detailShift} person={peopleById.get(detailShift.userId) || null} editable={currentPerson?.id===detailShift.userId} onClose={()=>setDetailShift(null)} onEdit={()=>{const shift=detailShift;setDetailShift(null);openEditShift(shift);}} onSaveRating={saveShiftRating}/>}</div>;
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
          {canEditTram&&<div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300/70">Hodnocení tramvaje</div><label className="mt-3 block text-xs text-slate-400">Číslo tramvaje</label><input value={tramNumber} onChange={e=>setTramNumber(e.target.value)} placeholder="Například 123" className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-300/40"/><div className="mt-3 grid grid-cols-3 gap-2">{(Object.keys(TRAM_RATING_LABELS) as TramRating[]).map(value=><button type="button" key={value} onClick={()=>setTramRating(value)} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${tramRating===value?"border-cyan-300/60 bg-cyan-400/20 text-cyan-100":"border-white/[0.08] bg-black/20 text-slate-500 hover:text-cyan-300"}`}>{TRAM_RATING_LABELS[value]}</button>)}</div></div>}
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
  return <div><PageHeader eyebrow="PLÁNY" title="Události" description="Společné akce, výlety a další plány." action={<button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl theme-primary px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_22px_rgba(99,102,241,.22)] hover:brightness-110"><Icon name="plus" size={16}/>Nová událost</button>}/>
    {events.length===0?<div className="rounded-3xl border border-dashed border-white/[0.09] bg-white/[0.02] py-16 text-center"><div className="text-5xl">☹️</div><div className="mt-4 text-base font-semibold text-slate-300">Žádná událost</div><div className="mt-1 text-xs text-slate-600">Zatím tu nic naplánovaného není.</div></div>:<div className="grid gap-4 md:grid-cols-2">{events.map(e=><Card key={e.id} className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs text-violet-300">{formatDate(e.date)} · {e.time}</div><h3 className="mt-2 text-lg font-bold">{e.title}</h3><p className="mt-1 text-sm text-slate-500">{e.place||"Bez místa"}</p></div>{currentPerson?.authId===e.createdBy&&<button type="button" onClick={()=>deleteEvent(e.id)} className="text-xs text-slate-600 hover:text-red-400">Smazat</button>}</div>{e.description&&<p className="mt-4 text-sm text-slate-400">{e.description}</p>}<div className="mt-4 flex -space-x-2">{e.participants.map(id=>{const p=people.find(x=>x.id===id);return p?<Avatar key={id} person={p} size={30}/>:null})}</div></Card>)}</div>}</div>}

function StatsPage({stats,selectedId,setSelectedId}:{stats:{person:Person;shifts:number;hours:number;minutes:number;totalMinutes:number;ratingAverage:number|null;ratedShifts:number;morning:number;afternoon:number;intershift:number;night:number;midnight:number;all_day:number;emergency:number;vacation:number;sick:number}[];selectedId:string|null;setSelectedId:(id:string)=>void}){
  const selected=stats.find(s=>s.person.id===selectedId)||stats[0];
  return <div>
    <PageHeader eyebrow="ČÍSLA" title="Statistiky" description="Směny a odpracované hodiny všech členů."/>
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <Card className="p-4"><div className="space-y-2">{stats.map(s=><button key={s.person.id} onClick={()=>setSelectedId(s.person.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selected?.person.id===s.person.id?"bg-white/[0.07]":"hover:bg-white/[0.03]"}`}><Avatar person={s.person} size={38}/><div><div className="text-sm font-semibold">{s.person.name}</div><div className="text-xs text-slate-500">{s.shifts} směn · {s.hours} h {s.minutes} min</div></div></button>)}</div></Card>
      <div className="space-y-5">
        {selected&&<Card className="p-6"><div className="flex items-center gap-4"><Avatar person={selected.person} size={54}/><div><h2 className="text-xl font-bold">{selected.person.name}</h2><p className="text-sm text-slate-500">Osobní statistiky</p></div></div><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"><StatBox label="Směny" value={selected.shifts}/><StatBox label="Čas" value={`${selected.hours} h ${selected.minutes} min`}/><StatBox label="Průměrné hodnocení" value={selected.ratingAverage===null?"—":`${selected.ratingAverage.toFixed(1)}/5 (${selected.ratedShifts}×)`}/><StatBox label="Ranní" value={selected.morning} color={shiftInfo.morning.color}/><StatBox label="Odpolední" value={selected.afternoon} color={shiftInfo.afternoon.color}/><StatBox label="Mezisměna" value={selected.intershift} color={shiftInfo.intershift.color}/><StatBox label="Noční" value={selected.night} color={shiftInfo.night.color}/><StatBox label="Polonoc" value={selected.midnight} color={shiftInfo.midnight.color}/><StatBox label="Celodenní" value={selected.all_day} color={shiftInfo.all_day.color}/><StatBox label="Mimořádná směna" value={selected.emergency} color={shiftInfo.emergency.color}/><StatBox label="Dovolená" value={selected.vacation} color={shiftInfo.vacation.color}/><StatBox label="Nemoc" value={selected.sick} color={shiftInfo.sick.color}/></div></Card>}
        <Card className="p-6"><h2 className="font-bold">Porovnání všech</h2><div className="mt-5 space-y-3">{stats.map(s=><div key={s.person.id} className="flex items-center gap-3"><Avatar person={s.person} size={32}/><div className="w-24 text-sm font-semibold">{s.person.name}</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full" style={{width:`${Math.min(100,(s.totalMinutes/Math.max(1,...stats.map(x=>x.totalMinutes)))*100)}%`,background:`linear-gradient(90deg,${s.person.color},${s.person.color}99)`}}/></div><div className="w-16 text-right text-xs text-slate-500">{s.hours} h {s.minutes} min</div></div>)}</div></Card>
      </div>
    </div>
  </div>
}
function StatBox({label,value,color}:{label:string;value:ReactNode;color?:string}){return <div className="rounded-2xl border bg-white/[0.025] p-4" style={color?{borderColor:`${color}30`,background:`linear-gradient(135deg, ${color}10, rgba(255,255,255,.015))`}:{borderColor:"rgba(255,255,255,.05)"}}><div className="text-xs" style={color?{color}:{color:"#64748b"}}>{label}</div><div className="mt-1 text-2xl font-black text-white">{value}</div></div>}

function SettingsPage({currentPerson,setPeople,themeColor,setThemeColor,themeColor2,setThemeColor2}:{currentPerson:Person|null;setPeople:React.Dispatch<React.SetStateAction<Person[]>>;themeColor:string;setThemeColor:(v:string)=>void;themeColor2:string;setThemeColor2:(v:string)=>void}){
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

  const themePresets=["#6366f1","#8b5cf6","#22d3ee","#3b82f6","#ec4899","#10b981","#f97316","#ef4444"];
  return <div><PageHeader eyebrow="ÚČET" title="Nastavení" description="Profil, vzhled webu a zabezpečení."/><div className="grid gap-5 xl:grid-cols-2">
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
    <Card className="p-6 xl:col-span-2"><div className="flex items-center gap-2"><Icon name="lock" size={18}/><h2 className="font-bold">Změna hesla</h2></div><div className="mt-5 grid gap-3 md:grid-cols-3"><PasswordInput label="Staré heslo" value={oldPassword} onChange={setOldPassword}/><PasswordInput label="Nové heslo" value={newPassword} onChange={setNewPassword}/><PasswordInput label="Nové heslo znovu" value={newAgain} onChange={setNewAgain}/></div><button onClick={changePassword} className="theme-primary mt-5 rounded-xl px-5 py-3 text-xs font-bold text-white hover:brightness-110">Změnit heslo</button>{message&&<div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-slate-400">{message}</div>}</Card>
  </div></div>
}
function PasswordInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type="password" value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10"/></div>}

function ShiftModal({person,editing,date,setDate,endDate,setEndDate,type,setType,start,setStart,end,setEnd,note,setNote,saving,onClose,onSave,onDelete}:{person:Person;editing:Shift|null;date:string;setDate:(v:string)=>void;endDate:string;setEndDate:(v:string)=>void;type:ShiftType;setType:(v:ShiftType)=>void;start:string;setStart:(v:string)=>void;end:string;setEnd:(v:string)=>void;note:string;setNote:(v:string)=>void;saving:boolean;onClose:()=>void;onSave:()=>void;onDelete:()=>void}){return <Modal onClose={onClose}><div className="flex items-center gap-3"><Avatar person={person} size={44}/><div><h2 className="font-bold">{editing?"Upravit směnu":"Přidat směnu"}</h2><p className="text-xs text-slate-500">{person.name}</p></div></div><div className="mt-5 space-y-4"><div><label className="mb-2 block text-xs text-slate-400">{type==="vacation"?"Datum od":"Datum"}</label><input type="date" value={date} onChange={e=>{const value=e.target.value;setDate(value);if(type==="vacation"&&(!endDate||endDate<value))setEndDate(value);}} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10"/></div><div><label className="mb-2 block text-xs text-slate-400">Typ směny</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(shiftInfo) as ShiftType[]).map(t=><button key={t} onClick={()=>{setType(t);if(t==="vacation"){setEndDate(endDate||date);setStart("00:00");setEnd("23:59");}else if(t==="all_day"){setStart("00:00");setEnd("23:59");}else if(t==="intershift"){setStart("10:00");setEnd("18:00");}else if(t==="midnight"){setStart("00:00");setEnd("08:00");}}} className="flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold" style={type===t?{borderColor:`${shiftInfo[t].color}70`,background:`${shiftInfo[t].color}12`,color:shiftInfo[t].color}:{borderColor:"rgba(255,255,255,.06)",color:"#94a3b8"}}><Icon name={shiftInfo[t].icon} size={15}/>{shiftInfo[t].short}</button>)}</div></div>{type==="vacation"?<Input label="Datum do" type="date" value={endDate} onChange={setEndDate}/>:<div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div>}<div><label className="mb-2 block text-xs text-slate-400">Poznámka</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div></div><div className="mt-6 flex gap-2">{editing&&<button onClick={onDelete} className="rounded-xl border border-red-500/20 px-4 py-3 text-xs font-semibold text-red-400">Smazat</button>}<button onClick={onClose} className="ml-auto rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-slate-400">Zrušit</button><button onClick={onSave} disabled={saving} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(99,102,241,.22)] hover:brightness-110 disabled:opacity-50">{saving?"Ukládám…":"Uložit"}</button></div></Modal>}

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

  return <Modal onClose={onClose}><h2 className="font-bold">Nová událost</h2><div className="mt-5 space-y-4"><Input label="Název" value={title} onChange={setTitle}/><div className="grid grid-cols-2 gap-3"><Input label="Datum" type="date" value={date} onChange={setDate}/><Input label="Čas" type="time" value={time} onChange={setTime}/></div><Input label="Místo" value={place} onChange={setPlace}/><div><label className="mb-2 block text-xs text-slate-400">Popis</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/></div><div><label className="mb-2 block text-xs text-slate-400">Účastníci</label><div className="flex flex-wrap gap-2">{people.map(p=><button type="button" key={p.id} onClick={()=>setParticipants(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={participants.includes(p.id)?{borderColor:`${p.color}60`,background:`${p.color}10`}:{borderColor:"rgba(255,255,255,.06)"}}><Avatar person={p} size={22}/>{p.name}</button>)}</div></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400 disabled:opacity-50">Zrušit</button><button type="button" onClick={submit} disabled={saving||!title.trim()||!date} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(99,102,241,.22)] hover:brightness-110 disabled:opacity-50">{saving?"Vytvářím…":"Vytvořit"}</button></div></Modal>
}

function PracticeModal({onClose,onSave}:{onClose:()=>void;onSave:(p:PracticeItem)=>void}){const[date,setDate]=useState("");const[start,setStart]=useState("07:00");const[end,setEnd]=useState("14:00");const[note,setNote]=useState("");return <Modal onClose={onClose}><div className="flex items-center gap-2"><Icon name="briefcase"/><h2 className="font-bold">Přidat Davčův praxi</h2></div><div className="mt-5 space-y-4"><Input label="Datum" type="date" value={date} onChange={setDate}/><div className="grid grid-cols-2 gap-3"><Input label="Od" type="time" value={start} onChange={setStart}/><Input label="Do" type="time" value={end} onChange={setEnd}/></div><Input label="Poznámka" value={note} onChange={setNote}/></div><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-400">Zrušit</button><button onClick={()=>{if(date)onSave({id:crypto.randomUUID(),date,startTime:start,endTime:end,note})}} className="rounded-xl theme-primary px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(99,102,241,.22)] hover:brightness-110">Uložit</button></div></Modal>}

function Modal({children,onClose}:{children:ReactNode;onClose:()=>void}){return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[28px] border border-white/[0.10] bg-[linear-gradient(145deg,#101522,#090c14)] p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)]">{children}</div></div>}
function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <div><label className="mb-2 block text-xs text-slate-400">{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10"/></div>}
