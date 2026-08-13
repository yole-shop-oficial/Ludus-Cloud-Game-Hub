-- ═══════════════════════════════════════════════
-- LUDUS CLOUD — GAME HUB SCHEMA
-- ═══════════════════════════════════════════════

-- 1. Table for modular game catalog
CREATE TABLE IF NOT EXISTS public.ludus_games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('arcade', 'action', 'puzzle', 'sports')),
    icon_svg TEXT NOT NULL, -- Full inline SVG code / path
    image_url TEXT NOT NULL,
    offline_support BOOLEAN DEFAULT TRUE,
    multiplayer_support BOOLEAN DEFAULT FALSE,
    download_size TEXT NOT NULL DEFAULT '1.0 MB',
    bundle_js TEXT, -- Dynamic JavaScript execution payload for offline sandbox
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table for WebRTC Direct WiFi Sync handshake/signaling sessions
CREATE TABLE IF NOT EXISTS public.ludus_sync_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    host_id UUID NOT NULL,
    host_name TEXT NOT NULL,
    client_id UUID,
    client_name TEXT,
    host_signal TEXT, -- WebRTC SDP / ICE signals (JSON format string)
    client_signal TEXT, -- WebRTC SDP / ICE signals (JSON format string)
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'connecting', 'connected', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Trigger to automatically update updated_at on session changes
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_session_update
    BEFORE UPDATE ON public.ludus_sync_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_timestamp();

-- 4. Enable Realtime replication for Sync signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludus_sync_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludus_games;

-- 5. Seed some initial games into the database
INSERT INTO public.ludus_games (id, name, description, category, icon_svg, image_url, offline_support, multiplayer_support, download_size)
VALUES 
(
  'pong-neo', 
  'Pixel Pong Neo', 
  'Un Pong retro-futurista con palas de neón y física ultra-fluida. Juega contra la IA o compite contra un amigo sincronizando tus pantallas por WiFi.', 
  'arcade', 
  '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"w-6 h-6\"><rect x=\"2\" y=\"6\" width=\"4\" height=\"12\" rx=\"1\"/><rect x=\"18\" y=\"6\" width=\"4\" height=\"12\" rx=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"2\" fill=\"currentColor\"/></svg>', 
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80', 
  true, 
  true, 
  '1.2 MB'
),
(
  'cosmic-snake', 
  'Cosmic Snake', 
  'La clásica serpiente de vuelta con impulsos galácticos, portales estelares y estelas de neón. Súper adictivo con joysticks virtuales táctiles.', 
  'arcade', 
  '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"w-6 h-6\"><path d=\"M8.3 10a3.5 3.5 0 0 1 5.4 0l3.6 3.4a3.5 3.5 0 0 0 5.4 0M3 14h3.5a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 3 0V15\"/></svg>', 
  'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80', 
  true, 
  false, 
  '0.8 MB'
),
(
  'meteor-storm', 
  'Meteor Storm', 
  'Vuela una nave de combate espacial de neón en medio de una lluvia de meteoritos y oleadas alienígenas. Destruye meteoros y acumula cristales de plasma.', 
  'action', 
  '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"w-6 h-6\"><path d=\"M12 2L2 22l10-6 10 6L12 2z\"/></svg>', 
  'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=600&auto=format&fit=crop&q=80', 
  true, 
  false, 
  '1.5 MB'
)
ON CONFLICT (id) DO NOTHING;
