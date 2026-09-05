import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const password = process.env.KUBA_PASSWORD;

const { data, error } = await supabase.auth.signInWithPassword({
  email: "jakub.proch145@seznam.cz",
  password,
});

if (error) {
  console.error("❌ LOGIN NEPROŠEL");
  console.error("Chyba:", error.message);
  console.error("Status:", error.status);
  process.exit();
}

console.log("✅ LOGIN FUNGUJE");
console.log("Email:", data.user.email);
console.log("ID:", data.user.id);