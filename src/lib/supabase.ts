import { createClient } from '@supabase/supabase-js';

// Reads from standard Vercel environment variables.
// Uses mock placeholders during build/prerendering to prevent build crashes, 
// which are automatically overridden in runtime by real Vercel environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTMxNjV9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Game {
  id: string;
  name: string;
  description: string;
  category: 'arcade' | 'action' | 'puzzle' | 'sports';
  icon_svg: string; // Pure vector SVGs
  image_url: string;
  offline_support: boolean;
  multiplayer_support: boolean;
  download_size: string;
  bundle_js?: string;
  created_at?: string;
}

export interface SyncSession {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  client_id?: string;
  client_name?: string;
  host_signal?: string;
  client_signal?: string;
  status: 'waiting' | 'connecting' | 'connected' | 'closed';
  created_at?: string;
  updated_at?: string;
}

export const LOCAL_GAMES: Game[] = [
  {
    id: 'pong-neo',
    name: 'Pixel Pong Neo',
    description: 'Un Pong retro-futurista con palas de neón y física ultra-fluida. Juega contra la IA o compite contra un amigo sincronizando tus pantallas por WiFi.',
    category: 'arcade',
    icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><rect x="2" y="6" width="4" height="12" rx="1" fill="#06b6d4" stroke="#06b6d4"/><rect x="18" y="6" width="4" height="12" rx="1" fill="#a855f7" stroke="#a855f7"/><circle cx="12" cy="12" r="2.5" fill="#e5b31c"/></svg>`,
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    offline_support: true,
    multiplayer_support: true,
    download_size: '1.2 MB'
  },
  {
    id: 'cosmic-snake',
    name: 'Cosmic Snake',
    description: 'La clásica serpiente de vuelta con impulsos galácticos, portales estelares y estelas de neón. Súper adictivo con joysticks virtuales táctiles.',
    category: 'arcade',
    icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M12 2a4 4 0 0 0-4 4v4H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-3V6a4 4 0 0 0-4-4z" stroke="#a855f7"/><circle cx="12" cy="6" r="1" fill="#06b6d4"/></svg>`,
    image_url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80',
    offline_support: true,
    multiplayer_support: false,
    download_size: '0.8 MB'
  },
  {
    id: 'meteor-storm',
    name: 'Meteor Storm',
    description: 'Vuela una nave de combate espacial de neón en medio de una lluvia de meteoritos y oleadas alienígenas. Destruye meteoros y acumula cristales de plasma.',
    category: 'action',
    icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" class="w-6 h-6"><path d="M12 2L2 22l10-6 10 6L12 2z" stroke="#e5b31c" fill="rgba(229, 179, 28, 0.2)"/><circle cx="12" cy="11" r="2.5" stroke="#06b6d4" fill="#06b6d4"/></svg>`,
    image_url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=600&auto=format&fit=crop&q=80',
    offline_support: true,
    multiplayer_support: false,
    download_size: '1.5 MB'
  }
];

// Helper to query game list from Supabase with LocalStorage fallback
export async function getGames(): Promise<Game[]> {
  // If we are still using placeholders (e.g. build step), skip query and immediately return local games
  if (supabaseUrl.includes('placeholder-project')) {
    return getLocalGames();
  }
  try {
    const { data, error } = await supabase
      .from('ludus_games')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (data && data.length > 0) {
      localStorage.setItem('ludus_cached_games', JSON.stringify(data));
      return data as Game[];
    }
  } catch (err) {
    console.warn('Supabase getGames falló, usando caché local:', err);
  }
  return getLocalGames();
}

function getLocalGames(): Game[] {
  if (typeof window === 'undefined') return LOCAL_GAMES;
  const cached = localStorage.getItem('ludus_cached_games');
  if (cached) {
    try { return JSON.parse(cached); } catch { return LOCAL_GAMES; }
  }
  localStorage.setItem('ludus_cached_games', JSON.stringify(LOCAL_GAMES));
  return LOCAL_GAMES;
}

// ═══════════════════════════════════════════════
// WEBRTC SIGNALING HANDSHAKE OVER SUPABASE
// ═══════════════════════════════════════════════

// 1. Host creates a sync session in Supabase
export async function createSyncSession(hostName: string, hostId: string): Promise<SyncSession | null> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  try {
    await supabase.from('ludus_sync_sessions').delete().eq('code', code);
    
    const { data, error } = await supabase
      .from('ludus_sync_sessions')
      .insert([{
        code,
        host_id: hostId,
        host_name: hostName,
        status: 'waiting',
        host_signal: null,
        client_signal: null
      }])
      .select()
      .single();

    if (error) throw error;
    return data as SyncSession;
  } catch (err) {
    console.error('Error creando sesión en Supabase:', err);
    return null;
  }
}

// 2. Client joins a session using a 4-digit code
export async function joinSyncSession(code: string, clientName: string, clientId: string): Promise<SyncSession | null> {
  try {
    const { data: session, error: fetchError } = await supabase
      .from('ludus_sync_sessions')
      .select('*')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!session) throw new Error('Sesión no encontrada o ya está activa.');

    const { data, error: updateError } = await supabase
      .from('ludus_sync_sessions')
      .update({
        client_id: clientId,
        client_name: clientName,
        status: 'connecting'
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return data as SyncSession;
  } catch (err) {
    console.error('Error uniéndose a sesión:', err);
    return null;
  }
}

// 3. Write WebRTC ICE/SDP handshake signals
export async function updateSessionSignal(
  sessionId: string, 
  field: 'host_signal' | 'client_signal', 
  signalData: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ludus_sync_sessions')
      .update({ [field]: signalData })
      .eq('id', sessionId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error actualizando señal ${field}:`, err);
    return false;
  }
}

// 4. Update session status to connected or closed
export async function updateSessionStatus(sessionId: string, status: 'connected' | 'closed'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ludus_sync_sessions')
      .update({ status })
      .eq('id', sessionId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error actualizando estado de sesión:', err);
    return false;
  }
}
