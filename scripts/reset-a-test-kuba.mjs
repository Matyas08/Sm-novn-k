import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.KUBA_PASSWORD;

if (!supabaseUrl || !anonKey || !serviceRoleKey || !password) {
  console.error("❌ Chybí některá proměnná prostředí.");
  console.log({
    supabaseUrl: !!supabaseUrl,
    anonKey: !!anonKey,
    serviceRoleKey: !!serviceRoleKey,
    password: !!password,
  });
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const client = createClient(supabaseUrl, anonKey);

const userId = "cf6aba50-ac95-46be-804c-701896ea2095";
const email = "jakub.proch145@seznam.cz";

console.log("1) Nastavuji heslo...");

const { error: updateError } =
  await admin.auth.admin.updateUserById(userId, {
    password,
  });

if (updateError) {
  console.error("❌ RESET HESLA SELHAL");
  console.error(updateError.message);
  process.exit(1);
}

console.log("✅ Heslo změněno.");
console.log("2) Testuji přihlášení...");

const { data, error: loginError } =
  await client.auth.signInWithPassword({
    email,
    password,
  });

if (loginError) {
  console.error("❌ LOGIN NEFUNGUJE");
  console.error("Chyba:", loginError.message);
  console.error("Status:", loginError.status);
  process.exit(1);
}

console.log("✅ LOGIN FUNGUJE");
console.log("Email:", data.user.email);
console.log("ID:", data.user.id);