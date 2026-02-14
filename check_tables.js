
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const { error: profileError } = await supabase.from('profiles').select('id').limit(1);
    const { error: billingError } = await supabase.from('billing_history').select('id').limit(1);

    console.log('Profiles table exists:', !profileError || profileError.code !== '42P01'); // 42P01 is undefined_table
    console.log('Billing History table exists:', !billingError || billingError.code !== '42P01');
}

checkTables();
