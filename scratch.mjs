import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/sameerrajani/FAST-NUCES/swiftbus-manager/.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.from('profiles').select('*');
  const { data: drivers } = await supabase.from('drivers').select('*');
  
  console.log("PROFILES (Users):", users.filter(u => u.email === 'k240820@nu.edu.pk' || u.first_name === 'Minaal'));
  console.log("DRIVERS:", drivers.filter(d => d.first_name === 'Minaal'));
}

run();
