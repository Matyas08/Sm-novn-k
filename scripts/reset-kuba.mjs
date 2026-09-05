import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const newPassword = process.env.NEW_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !newPassword) {
  console.error("❌ Chybí některá proměnná prostředí.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.updateUserById(
  "cf6aba50-ac95-46be-804c-701896ea2095",
  {
    password: newPassword,
  }
);

if (error) {
  console.error("❌ Heslo se nepodařilo změnit:", error.message);
  process.exit(1);
}

console.log("✅ Kubovo heslo bylo úspěšně změněno.");
console.log("Účet:", data.user.email);