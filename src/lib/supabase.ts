import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// SUBSTITUA PELAS SUAS CHAVES DO SUPABASE (Crie um projeto em supabase.com)
const SUPABASE_URL = "https://dwriphuvummxypvrxiow.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8940pbniXvl87sKwFYV43Q_h_VksysF";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
