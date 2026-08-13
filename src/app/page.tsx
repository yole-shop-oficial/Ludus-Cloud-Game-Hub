'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Wifi,
  Download,
  User,
  X,
  Play,
  Check,
  Trash2,
  HardDrive,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Plus,
  ArrowLeft,
  Database,
  Radio,
  Camera,
  Sliders,
  Palette,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import {
  supabase,
  getGames,
  createSyncSession,
  joinSyncSession,
  updateSessionStatus,
  LOCAL_GAMES,
  Game,
  SyncSession
} from '@/lib/supabase';

const PLAYER_AVATARS = [
  { id: 'av-1', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#06b6d4]"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6 18c0-3 3-4 6-4s6 1 6 4" stroke-linecap="round"/></svg>`, label: 'Cosmic Ranger' },
  { id: 'av-2', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#a855f7]"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/><path d="M8 15h8" stroke-linecap="round"/></svg>`, label: 'Pixel Invader' },
  { id: 'av-3', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#e5b31c]"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M9 16h6M8 10h.01M16 10h.01" stroke-linecap="round" stroke-width="3"/></svg>`, label: 'Cyber Mech' },
  { id: 'av-4', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-emerald-500"><path d="M4.5 16.5c-1.5-1.5-2.5-3.5-2.5-5.5C2 6.5 6.5 2 12 2s10 4.5 10 9c0 2-1 4-2.5 5.5l-1.5-1.5c1-1 1.5-2.5 1.5-4 0-3.5-3.5-7.5-7.5-7.5S4 7 4 11c0 1.5.5 3 1.5 4l-1.5 1.5z"/><path d="M12 7l4 8H8l4-8z" fill="currentColor"/></svg>`, label: 'Star Pilot' }
];

const HUB_THEMES = [
  { id: 'nebula', label: 'Nebula Void', primary: '#06b6d4', secondary: '#a855f7', css: 'from-[#06b6d4]/10 to-[#a855f7]/10' },
  { id: 'maple', label: 'Autumn Maple', primary: '#e5b31c', secondary: '#7c483f', css: 'from-[#e5b31c]/10 to-[#7c483f]/10' },
  { id: 'matrix', label: 'Matrix Forest', primary: '#10b981', secondary: '#047857', css: 'from-[#10b981]/10 to-[#047857]/10' },
  { id: 'synthwave', label: 'Synthwave Glow', primary: '#f43f5e', secondary: '#ec4899', css: 'from-[#f43f5e]/10 to-[#ec4899]/10' }
];

export default function LudusCloudGameHub() {
  // Screens: 'loading' | 'hub' | 'wifi' | 'downloads' | 'profile' | 'game'
  const [activeScreen, setActiveScreen] = useState<string>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Profile / Customization States
  const [gamerTag, setGamerTag] = useState('Gamer_Ludus');
  const [avatar, setAvatar] = useState('av-1');
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('nebula');

  // Supabase Custom Connection Form State
  const [customSupaUrl, setCustomSupaUrl] = useState('');
  const [customSupaKey, setCustomSupaKey] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(true);
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [supaValidationMsg, setSupaValidationMsg] = useState('');

  // Device Unique Identifier
  const [clientId, setClientId] = useState('');

  // Games and Local Storage State
  const [games, setGames] = useState<Game[]>(LOCAL_GAMES);
  const [downloadedGameIds, setDownloadedGames] = useState<string[]>([]);
  const [downloadingGameId, setDownloadingGameId] = useState<string | null>(null);

  // WiFi Zapya-Style Radar Connection State
  const [connectionRole, setConnectionRole] = useState<'none' | 'host' | 'client'>('none');
  const [pairingCode, setPairingCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerGamerTag, setPeerGamerTag] = useState('');
  const [isSearchingPeer, setIsSearchingPeer] = useState(false);
  const [peerConnectionError, setPeerConnectionError] = useState('');

  // Zapya radar sub-state: 'main' | 'radar_host' | 'radar_search'
  const [radarState, setRadarState] = useState<'main' | 'host' | 'search'>('main');
  const [scannedPeers, setScannedPeers] = useState<{ name: string; avatar: string; code: string }[]>([]);

  // Selected game state
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);

  // Search/Filters in Hub
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Broadcast Channel reference
  const syncChannelRef = useRef<any>(null);

  // Load custom values from LocalStorage on mount
  useEffect(() => {
    let id = localStorage.getItem('ludus_client_id');
    if (!id) {
      id = 'client-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('ludus_client_id', id);
    }
    setClientId(id);

    // Fetch games from Supabase
    async function fetchDatabaseGames() {
      const data = await getGames();
      setGames(data);
    }
    fetchDatabaseGames();

    // Simulated progress loader
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setActiveScreen('hub'), 300);
          return 100;
        }
        return prev + 5;
      });
    }, 35);

    // Local Storage configs
    const savedTag = localStorage.getItem('ludus_gamertag');
    if (savedTag) setGamerTag(savedTag);
    const savedAvatar = localStorage.getItem('ludus_avatar');
    if (savedAvatar) setAvatar(savedAvatar);
    const savedTheme = localStorage.getItem('ludus_theme');
    if (savedTheme) setActiveTheme(savedTheme);
    const savedDownloads = localStorage.getItem('ludus_downloaded_ids');
    if (savedDownloads) {
      try { setDownloadedGames(JSON.parse(savedDownloads)); } catch { /* ignore */ }
    }

    // Load custom Supabase details
    const savedSupaUrl = localStorage.getItem('ludus_custom_supa_url');
    if (savedSupaUrl) setCustomSupaUrl(savedSupaUrl);
    const savedSupaKey = localStorage.getItem('ludus_custom_supa_key');
    if (savedSupaKey) setCustomSupaKey(savedSupaKey);

    return () => clearInterval(interval);
  }, []);

  // Play retro beep tones
  const playBeep = (freq = 440, duration = 0.1) => {
    if (!soundsEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  };

  // Installation simulation
  const handleDownloadGame = (gameId: string) => {
    if (downloadedGameIds.includes(gameId)) return;
    setDownloadingGameId(gameId);
    playBeep(650, 0.15);
    
    setTimeout(() => {
      const updated = [...downloadedGameIds, gameId];
      setDownloadedGames(updated);
      localStorage.setItem('ludus_downloaded_ids', JSON.stringify(updated));
      setDownloadingGameId(null);
      playBeep(900, 0.25);
    }, 2000);
  };

  const handleDeleteGame = (gameId: string) => {
    const updated = downloadedGameIds.filter(id => id !== gameId);
    setDownloadedGames(updated);
    localStorage.setItem('ludus_downloaded_ids', JSON.stringify(updated));
    playBeep(220, 0.2);
  };

  // ═══════════════════════════════════════════════
  // ZAPYA-STYLE RADAR SYNC SYSTEM
  // ═══════════════════════════════════════════════

  // Host radar mode
  const startRadarHost = async () => {
    playBeep(440, 0.1);
    setRadarState('host');
    setConnectionRole('host');
    setIsSearchingPeer(true);
    setPeerConnectionError('');

    const session = await createSyncSession(gamerTag, clientId);
    if (session) {
      setPairingCode(session.code);

      // Subscribe to Realtime row updates to find when a client connects
      const channel = supabase
        .channel(`sync-session-${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ludus_sync_sessions',
            filter: `id=eq.${session.id}`
          },
          async (payload: any) => {
            const updatedSession = payload.new as SyncSession;
            if (updatedSession.status === 'connecting' && updatedSession.client_name) {
              setPeerGamerTag(updatedSession.client_name);
              await updateSessionStatus(session.id, 'connected');
              setPeerConnected(true);
              setIsSearchingPeer(false);
              setRadarState('main');
              playBeep(880, 0.35);

              // Initialize broadcast room sync
              setupSyncRoom(session.code);
            }
          }
        )
        .subscribe();
    } else {
      setConnectionRole('none');
      setRadarState('main');
      setIsSearchingPeer(false);
      setPeerConnectionError('Error conectando con Supabase para registrar radar.');
    }
  };

  // Client radar scanning mode
  const startRadarSearch = () => {
    playBeep(440, 0.1);
    setRadarState('search');
    setConnectionRole('client');
    setIsSearchingPeer(true);
    setScannedPeers([]);
    setPeerConnectionError('');

    // Simulate Zapya-style discovery: find local peer signals
    setTimeout(() => {
      setScannedPeers([
        { name: 'Host_Vortex', avatar: 'av-3', code: '4532' },
        { name: 'Pulse_Player', avatar: 'av-2', code: '8810' }
      ]);
      playBeep(700, 0.1);
    }, 2000);
  };

  const handleSelectScannedPeer = async (peer: { name: string; code: string }) => {
    playBeep(520, 0.1);
    setPeerGamerTag(peer.name);
    setIsSearchingPeer(true);

    const session = await joinSyncSession(peer.code, gamerTag, clientId);
    if (session) {
      setPeerConnected(true);
      setIsSearchingPeer(false);
      setRadarState('main');
      playBeep(880, 0.35);

      // Initialize broadcast room sync
      setupSyncRoom(session.code);
    } else {
      setIsSearchingPeer(false);
      setPeerConnectionError('Error de emparejamiento con el peer del radar.');
      playBeep(200, 0.3);
    }
  };

  // Set up low-latency broadcast state sync over Supabase Realtime Channels
  const setupSyncRoom = (code: string) => {
    if (syncChannelRef.current) {
      syncChannelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`ludus-broadcast-${code}`);

    channel
      .on('broadcast', { event: 'game-state' }, (payload: any) => {
        const event = new CustomEvent('ludus-peer-state', { detail: payload.payload });
        window.dispatchEvent(event);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncChannelRef.current = channel;
        }
      });
  };

  const disconnectSync = () => {
    if (syncChannelRef.current) {
      syncChannelRef.current.unsubscribe();
      syncChannelRef.current = null;
    }
    setConnectionRole('none');
    setPeerConnected(false);
    setIsSearchingPeer(false);
    setInputCode('');
    setPairingCode('');
    setRadarState('main');
    playBeep(300, 0.2);
  };

  // Global broadcast trigger that games can call
  useEffect(() => {
    const handleLocalBroadcast = (e: any) => {
      if (syncChannelRef.current) {
        syncChannelRef.current.send({
          type: 'broadcast',
          event: 'game-state',
          payload: e.detail
        });
      }
    };
    window.addEventListener('ludus-local-broadcast', handleLocalBroadcast);
    return () => window.removeEventListener('ludus-local-broadcast', handleLocalBroadcast);
  }, []);

  // Supabase Custom Project Connection Validation
  const handleValidateCustomSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSupa(true);
    setSupaValidationMsg('');
    playBeep(440, 0.1);

    if (!customSupaUrl || !customSupaKey) {
      setSupaValidationMsg('Error: Debes rellenar ambos campos.');
      setIsTestingSupa(false);
      return;
    }

    try {
      // Create transient client
      const testClient = createClient(customSupaUrl, customSupaKey);
      
      // Attempt a lightweight select from any system metadata or table
      const { data, error } = await testClient.from('ludus_games').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If we reach here, connection is valid!
      setSupabaseConnected(true);
      localStorage.setItem('ludus_custom_supa_url', customSupaUrl);
      localStorage.setItem('ludus_custom_supa_key', customSupaKey);
      
      setSupaValidationMsg('¡Conexión validada con éxito! El catálogo y sincronización ahora corren en tu propio Supabase.');
      playBeep(880, 0.35);

      // Re-load games from custom client
      const updatedGames = await getGames();
      setGames(updatedGames);

    } catch (err: any) {
      console.error(err);
      setSupaValidationMsg(`Error de conexión: ${err.message || 'Verifica la URL y Anon Key'}`);
      playBeep(200, 0.3);
    } finally {
      setIsTestingSupa(false);
    }
  };

  // Filter products/games
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            g.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || g.category === activeFilter ||
                            (activeFilter === 'offline' && downloadedGameIds.includes(g.id));
      return matchesSearch && matchesFilter;
    });
  }, [games, searchQuery, activeFilter, downloadedGameIds]);

  const activeAvatarObj = PLAYER_AVATARS.find(av => av.id === avatar) || PLAYER_AVATARS[0];
  const currentThemeObj = HUB_THEMES.find(t => t.id === activeTheme) || HUB_THEMES[0];

  return (
    <div
      className="relative min-h-screen cyber-grid bg-[#09070f] text-white overflow-hidden flex flex-col justify-between select-none scanlines transition-all"
      style={{
        '--primary-glow': `${currentThemeObj.primary}45`,
        '--secondary-glow': `${currentThemeObj.secondary}45`,
      } as React.CSSProperties}
    >
      
      {/* Background ambient light customized to current active palette */}
      <div
        className="absolute top-0 left-1/4 w-[50vw] h-[50vh] bg-gradient-to-b blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${currentThemeObj.primary}15, transparent)`
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[50vw] h-[50vh] bg-gradient-to-t blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{
          backgroundImage: `linear-gradient(to top, ${currentThemeObj.secondary}15, transparent)`
        }}
      />

      <AnimatePresence mode="wait">
        
        {/* ═══════════════════════════════════════════════
           SCREEN 1: CARGA / SPLASH SCREEN
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09070f] z-50 flex flex-col justify-center items-center px-6"
          >
            <div className="text-center space-y-8 max-w-sm w-full">
              {/* Glowing custom vector cyber cloud assembly */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="relative w-28 h-28 mx-auto"
              >
                <div className="absolute inset-0 rounded-full border-4 border-dashed" style={{ borderColor: `${currentThemeObj.primary}40` }} />
                <div className="absolute inset-2.5 rounded-full border-2" style={{ borderColor: `${currentThemeObj.secondary}40` }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-11 h-11" style={{ color: currentThemeObj.primary, filter: `drop-shadow(0 0 8px ${currentThemeObj.primary})` }}>
                    <path d="M12 2a4 4 0 0 0-4 4v4H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-3V6a4 4 0 0 0-4-4z" />
                  </svg>
                </div>
              </motion.div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-widest uppercase font-mono" style={{ color: currentThemeObj.primary, textShadow: `0 0 10px ${currentThemeObj.primary}60` }}>
                  Ludus Cloud
                </h1>
                <p className="text-[9px] uppercase font-bold text-stone-500 tracking-[0.25em]">
                  Realtime Offline-First Hub
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="w-full h-2 rounded-full bg-stone-900 border border-stone-800 p-0.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${loadingProgress}%`,
                      background: `linear-gradient(to right, ${currentThemeObj.primary}, ${currentThemeObj.secondary})`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-stone-500 font-mono font-bold tracking-wider">
                  <span>BOOTING CORES...</span>
                  <span>{loadingProgress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 2: HUB PRINCIPAL (DEFAULT)
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'hub' && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6 pb-24"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-8 h-8" style={{ color: currentThemeObj.primary }}>
                  <path d="M12 2a4 4 0 0 0-4 4v4H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-3V6a4 4 0 0 0-4-4z" />
                </svg>
                <div>
                  <h1 className="text-sm font-black tracking-widest uppercase leading-none" style={{ color: currentThemeObj.primary }}>
                    Ludus Cloud
                  </h1>
                  <p className="text-[8px] font-bold tracking-widest uppercase mt-0.5" style={{ color: currentThemeObj.secondary }}>Game Hub</p>
                </div>
              </div>

              {/* Profile button */}
              <button
                onClick={() => { playBeep(); setActiveScreen('profile'); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full cyber-card border border-stone-800"
              >
                <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-5 h-5" />
                <span className="text-xs font-bold font-mono tracking-tight max-w-[80px] truncate">{gamerTag}</span>
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 gap-2">
              <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                    <Wifi className="w-4 h-4" style={{ color: currentThemeObj.primary }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-stone-500 font-bold uppercase tracking-wide">WiFi local Sync</p>
                    <p className="text-xs font-black truncate">
                      {peerConnected ? peerGamerTag : 'Desconectado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { playBeep(); setActiveScreen('wifi'); }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 text-[9px] font-bold border border-stone-800 shrink-0 hover:border-stone-700"
                >
                  Sync
                </button>
              </div>

              <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" style={{ color: currentThemeObj.secondary }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-stone-500 font-bold uppercase tracking-wide">Juegos Offline</p>
                    <p className="text-xs font-black truncate">{downloadedGameIds.length} guardado(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => { playBeep(); setActiveScreen('downloads'); }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 text-[9px] font-bold border border-stone-800 shrink-0 hover:border-stone-700"
                >
                  Manejar
                </button>
              </div>
            </div>

            {/* Search Engine */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar juegos en Supabase..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-900 focus:outline-none text-xs font-bold"
                  style={{ focusBorderColor: currentThemeObj.primary } as React.CSSProperties}
                />
              </div>

              {/* Filters chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'arcade', label: 'Arcade' },
                  { id: 'action', label: 'Acción' },
                  { id: 'offline', label: 'Offline' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => { playBeep(520, 0.08); setActiveFilter(filter.id); }}
                    className="shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide uppercase transition-all"
                    style={{
                      background: activeFilter === filter.id ? `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` : '#1c1917',
                      border: activeFilter === filter.id ? '1px solid transparent' : '1px solid #292524',
                      color: activeFilter === filter.id ? '#ffffff' : '#a8a29e'
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Grid display */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Catálogo modular</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGames.map((g) => {
                  const isDownloaded = downloadedGameIds.includes(g.id);
                  const isDownloading = downloadingGameId === g.id;

                  return (
                    <div
                      key={g.id}
                      className="cyber-card rounded-[24px] overflow-hidden border border-stone-900 flex flex-col justify-between transition-all"
                      style={{
                        borderColor: isDownloaded ? `${currentThemeObj.secondary}30` : '#1c1917'
                      }}
                    >
                      {/* Image header */}
                      <div className="relative h-32 bg-stone-900">
                        <img
                          src={g.image_url}
                          alt={g.name}
                          className="w-full h-full object-cover opacity-85"
                        />
                        <span className="absolute top-2.5 left-2.5 bg-black/85 border border-stone-800 px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5">
                          <span dangerouslySetInnerHTML={{ __html: g.icon_svg }} className="w-3.5 h-3.5" style={{ color: currentThemeObj.primary }} />
                          <span>{g.category.toUpperCase()}</span>
                        </span>
                      </div>

                      {/* Info block */}
                      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm tracking-tight">{g.name}</h4>
                          <p className="text-[10px] text-stone-400 leading-relaxed font-medium line-clamp-3">
                            {g.description}
                          </p>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 text-[9px] font-bold text-stone-500">
                          {g.offline_support && <span className="text-emerald-500">✓ Offline</span>}
                          {g.multiplayer_support && <span style={{ color: currentThemeObj.primary }}>✓ WiFi Sync</span>}
                          <span className="ml-auto text-stone-600 font-mono">{g.download_size}</span>
                        </div>

                        {/* Trigger button */}
                        <div className="pt-1 flex gap-2">
                          <button
                            onClick={() => {
                              playBeep(520, 0.1);
                              setPlayingGameId(g.id);
                              setActiveScreen('game');
                            }}
                            className="flex-1 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                            style={{
                              background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})`,
                              boxShadow: `0 0 10px ${currentThemeObj.primary}40`
                            }}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Jugar Ahora
                          </button>

                          {!isDownloaded ? (
                            <button
                              onClick={() => handleDownloadGame(g.id)}
                              disabled={isDownloading}
                              className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-bold hover:text-white flex items-center justify-center disabled:opacity-50"
                              style={{ hoverBorderColor: currentThemeObj.secondary } as React.CSSProperties}
                              title="Instalar en local"
                            >
                              {isDownloading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: currentThemeObj.secondary }} />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteGame(g.id)}
                              className="px-3.5 py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 font-bold flex items-center justify-center"
                              title="Desinstalar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 3: CONEXIÓN WIFI (ZAPYA RADAR VIEW)
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'wifi' && (
          <motion.div
            key="wifi"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playBeep(); setActiveScreen('hub'); }}
                className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue">Conexión WiFi Sync</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest font-mono">Simulador Radar Zapya</p>
              </div>
            </div>

            {/* Radar View board */}
            <div className="cyber-card rounded-[28px] p-5 border border-stone-800 text-center space-y-6 relative overflow-hidden">
              
              {radarState === 'main' && !peerConnected && (
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-2xl" style={{ borderColor: currentThemeObj.primary }}>
                    <Wifi className="w-7 h-7" style={{ color: currentThemeObj.primary }} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm">Emparejamiento Estilo Zapya</h3>
                    <p className="text-[10px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                      Sincroniza tus juegos y juega en tiempo real de forma ultra-rápida. Elige si quieres crear un grupo de juego o unirte buscando señales.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={startRadarHost}
                      className="py-3 px-4 rounded-xl font-bold text-xs flex flex-col items-center gap-2 border border-stone-800 hover:border-stone-700 bg-stone-900"
                    >
                      <Radio className="w-5 h-5 text-cyan-400" />
                      <span>Crear Grupo</span>
                    </button>
                    <button
                      onClick={startRadarSearch}
                      className="py-3 px-4 rounded-xl font-bold text-xs flex flex-col items-center gap-2 border border-stone-800 hover:border-stone-700 bg-stone-900"
                    >
                      <Camera className="w-5 h-5 text-purple-400" />
                      <span>Buscar / Escanear</span>
                    </button>
                  </div>

                  {peerConnectionError && (
                    <p className="text-xs text-red-500 font-bold">⚠️ {peerConnectionError}</p>
                  )}
                </div>
              )}

              {/* RADAR HOST MODE (SENDER) */}
              {radarState === 'host' && !peerConnected && (
                <div className="space-y-6 relative py-4">
                  
                  {/* Concentric scanning circles */}
                  <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
                    <div className="absolute inset-4 rounded-full border border-cyan-500/40 animate-pulse" />
                    <div className="absolute inset-8 rounded-full border border-cyan-500/60" />
                    <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center text-stone-950 font-black text-xl animate-bounce">
                      📡
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Transmitiendo señal de grupo</p>
                    <p className="text-3xl font-black text-cyan-400 font-mono tracking-widest">{pairingCode}</p>
                    <p className="text-xs text-stone-400 font-medium">Comparte este código o dile a tus amigos que escaneen el radar.</p>
                  </div>

                  <button
                    onClick={disconnectSync}
                    className="w-full py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-bold"
                  >
                    Detener Transmisión
                  </button>
                </div>
              )}

              {/* RADAR CLIENT SCANNING MODE (ZAPYA RADAR SWEEP) */}
              {radarState === 'search' && !peerConnected && (
                <div className="space-y-6 relative py-4">
                  
                  {/* Sweep radar */}
                  <div className="relative w-44 h-44 mx-auto rounded-full border border-purple-500/20 bg-purple-950/5 overflow-hidden flex items-center justify-center">
                    {/* Sweeping line */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-purple-500/25 origin-center animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-8 rounded-full border border-purple-500/20" />
                    <div className="absolute inset-16 rounded-full border border-purple-500/30" />
                    
                    {/* Client central marker */}
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-lg z-10 shadow-lg shadow-purple-500/40">
                      🔍
                    </div>

                    {/* Discovered peer markers floating */}
                    {scannedPeers.map((peer, i) => (
                      <motion.button
                        key={peer.code}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.5 }}
                        onClick={() => handleSelectScannedPeer(peer)}
                        className="absolute p-1 rounded-xl bg-stone-900 border border-cyan-400 flex flex-col items-center justify-center gap-0.5 z-20 cursor-pointer shadow-lg active:scale-95"
                        style={{
                          top: i === 0 ? '15%' : '70%',
                          left: i === 0 ? '65%' : '20%'
                        }}
                      >
                        <span className="text-xs">👾</span>
                        <span className="text-[7px] font-extrabold max-w-[50px] truncate leading-none text-white">{peer.name}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Escaner de Señal Local</p>
                    {isSearchingPeer && scannedPeers.length === 0 ? (
                      <div className="flex justify-center items-center gap-2 text-xs text-[#a855f7]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="font-bold">Buscando grupos cercanos...</span>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 font-bold">¡Grupos encontrados en tu WiFi! Toca uno para conectarte.</p>
                    )}
                  </div>

                  {scannedPeers.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 text-left max-h-36 overflow-y-auto">
                      {scannedPeers.map(peer => (
                        <button
                          key={peer.code}
                          onClick={() => handleSelectScannedPeer(peer)}
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] transition-all text-xs font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">👾</span>
                            <span>{peer.name} (Pin: {peer.code})</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-500" />
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={disconnectSync}
                    className="w-full py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-bold"
                  >
                    Detener Escaneo
                  </button>
                </div>
              )}

              {/* CONNECTED BOARD */}
              {peerConnected && (
                <div className="space-y-4 py-3">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div className="text-left">
                      <p className="text-[10px] text-stone-500 font-mono font-bold uppercase leading-none">Sync Zapya Activa</p>
                      <p className="text-xs font-black mt-1">Conectado con {peerGamerTag}</p>
                    </div>
                  </div>

                  <div className="text-xs text-stone-400 py-1">
                    🟢 Latencia media WiFi: <span className="font-mono font-bold text-emerald-400">12ms</span>
                  </div>

                  <button
                    onClick={disconnectSync}
                    className="w-full py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-bold"
                  >
                    Desconectar Sincronización
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 4: PERFIL Y AJUSTES PERSONALIZADOS
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6 pb-24"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playBeep(); setActiveScreen('hub'); }}
                className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue">Mi Perfil Gamer</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest font-mono">Personalización & Supabase</p>
              </div>
            </div>

            {/* Profile detail board */}
            <div className="cyber-card rounded-[28px] p-5 border border-stone-800 space-y-5">
              
              {/* Avatar pick */}
              <div className="text-center space-y-2">
                <div dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-14 h-14 mx-auto flex items-center justify-center p-1 border border-stone-800 rounded-2xl" />
                <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Cambia tu Avatar</p>
                
                <div className="flex justify-center gap-2 pt-1">
                  {PLAYER_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => { playBeep(520, 0.08); setAvatar(av.id); }}
                      className="w-11 h-11 rounded-xl bg-stone-900 text-lg flex items-center justify-center border transition-all hover:scale-105"
                      style={{
                        borderColor: avatar === av.id ? currentThemeObj.primary : '#292524',
                        boxShadow: avatar === av.id ? `0 0 10px ${currentThemeObj.primary}40` : 'none'
                      }}
                      dangerouslySetInnerHTML={{ __html: av.icon_svg }}
                    />
                  ))}
                </div>
              </div>

              {/* Tag input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 pl-1">GamerTag</label>
                <input
                  type="text"
                  value={gamerTag}
                  onChange={(e) => {
                    setGamerTag(e.target.value);
                    localStorage.setItem('ludus_gamertag', e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-sm font-bold focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              {/* Theme customizer */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 pl-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Tema de Color Neón
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HUB_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        playBeep(440, 0.1);
                        setActiveTheme(theme.id);
                        localStorage.setItem('ludus_theme', theme.id);
                      }}
                      className="p-2.5 rounded-xl border text-left flex items-center justify-between transition-all"
                      style={{
                        borderColor: activeTheme === theme.id ? theme.primary : '#292524',
                        background: activeTheme === theme.id ? `${theme.primary}12` : 'transparent'
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider">{theme.label}</span>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secondary }} />
                        </div>
                      </div>
                      {activeTheme === theme.id && <Check className="w-4 h-4" style={{ color: theme.primary }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound switch */}
              <div className="flex items-center justify-between py-2 border-t border-stone-900">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {soundsEnabled ? <Volume2 className="w-4 h-4" style={{ color: currentThemeObj.primary }} /> : <VolumeX className="w-4 h-4 text-stone-500" />}
                  <span>Efectos de Sonido</span>
                </div>
                <button
                  onClick={() => {
                    const next = !soundsEnabled;
                    setSoundsEnabled(next);
                    if (next) playBeep(520, 0.08);
                  }}
                  className="w-11 h-6 rounded-full p-1 transition-all"
                  style={{
                    backgroundColor: soundsEnabled ? currentThemeObj.primary : '#292524'
                  }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${
                    soundsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Custom Supabase Settings (The ultimate validation tool for the user!) */}
              <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-900 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentThemeObj.secondary }}>
                    <Database className="w-3.5 h-3.5" /> Supabase Personalizado
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                    supabaseConnected ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/30' : 'bg-stone-900 text-stone-500'
                  }`}>
                    {supabaseConnected ? 'Verificado' : 'Offline'}
                  </span>
                </div>
                
                <p className="text-[9px] text-stone-500 leading-normal font-medium">
                  Introduce las credenciales de tu proyecto de Supabase para cargar juegos reales desde tu base de datos y usar tu propia sincronización de radar.
                </p>

                <form onSubmit={handleValidateCustomSupabase} className="space-y-3">
                  <div>
                    <label className="text-[8px] font-bold text-stone-500 uppercase block mb-1">Project URL</label>
                    <input
                      type="text"
                      value={customSupaUrl}
                      onChange={(e) => setCustomSupaUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-[10px] font-mono font-bold focus:outline-none focus:border-cyan-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-stone-500 uppercase block mb-1">Anon API Key</label>
                    <input
                      type="password"
                      value={customSupaKey}
                      onChange={(e) => setCustomSupaKey(e.target.value)}
                      placeholder="eyJhbGci..."
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-[10px] font-mono font-bold focus:outline-none focus:border-cyan-500 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isTestingSupa}
                    className="w-full py-2 rounded-xl font-bold text-[10px] uppercase text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})`
                    }}
                  >
                    {isTestingSupa ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Validar & Guardar
                  </button>
                </form>

                {supaValidationMsg && (
                  <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 flex gap-2 items-start">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-stone-400 font-bold leading-normal">{supaValidationMsg}</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 5: DESCARGAS (OFFLINE STORAGE)
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'downloads' && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => { playBeep(); setActiveScreen('hub'); }}
                className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue">Descargas Locales</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest font-mono">Almacenamiento Offline</p>
              </div>
            </div>

            {/* Storage space */}
            <div className="cyber-card rounded-[24px] p-4 flex items-center justify-between border border-stone-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" style={{ color: currentThemeObj.secondary }} />
                <div>
                  <p className="text-[9px] text-stone-500 font-bold uppercase">Espacio de Almacenamiento</p>
                  <p className="text-xs font-black">
                    {downloadedGameIds.length * 1.1} MB usados / 512 MB disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {games.filter(g => downloadedGameIds.includes(g.id)).map((p) => (
                <div
                  key={p.id}
                  className="cyber-card rounded-[20px] p-3 flex items-center justify-between gap-3 border border-stone-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span dangerouslySetInnerHTML={{ __html: p.icon_svg }} className="bg-stone-900 w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ color: currentThemeObj.primary }} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold truncate">{p.name}</h4>
                      <p className="text-[9px] text-stone-500 font-bold uppercase">
                        Peso: {p.download_size} · Listo para Offline
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        playBeep(520, 0.1);
                        setPlayingGameId(p.id);
                        setActiveScreen('game');
                      }}
                      className="p-2.5 rounded-xl text-white font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})`
                      }}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => handleDeleteGame(p.id)}
                      className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {downloadedGameIds.length === 0 && (
                <div className="py-16 text-center space-y-3">
                  <p className="text-4xl text-stone-700">💾</p>
                  <div>
                    <h4 className="font-extrabold text-sm">Sin descargas aún</h4>
                    <p className="text-xs text-stone-500 max-w-[200px] mx-auto mt-1">
                      Descarga tus juegos favoritos del catálogo en la portada del Hub.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 6: GAME ACTIVE VIEW
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'game' && playingGameId && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 flex flex-col justify-between"
          >
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 to-transparent flex justify-between items-center z-50">
              <button
                onClick={() => {
                  playBeep(220, 0.15);
                  setPlayingGameId(null);
                  setActiveScreen('hub');
                }}
                className="px-3.5 py-1.5 rounded-full bg-black/60 border border-stone-800 hover:border-stone-700 text-xs font-bold flex items-center gap-1 text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Salir del Hub
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black tracking-wider uppercase bg-stone-900 border border-stone-800 px-3.5 py-1 rounded-full text-white">
                  {playingGameId === 'pong-neo' ? '🏓 Pong Neo' : playingGameId === 'cosmic-snake' ? '🐍 Snake' : '🚀 Meteor Storm'}
                </span>
                {peerConnected && playingGameId === 'pong-neo' && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full text-stone-950 animate-pulse uppercase" style={{ backgroundColor: currentThemeObj.primary }}>
                    👥 WiFi Sync
                  </span>
                )}
              </div>
            </div>

            {/* Game Canvas Container */}
            <div className="flex-1 w-full flex items-center justify-center relative bg-stone-950 overflow-hidden select-none">
              
              {playingGameId === 'pong-neo' && (
                <PongGame peerConnected={peerConnected} peerGamerTag={peerGamerTag} soundsEnabled={soundsEnabled} />
              )}

              {playingGameId === 'cosmic-snake' && (
                <SnakeGame soundsEnabled={soundsEnabled} />
              )}

              {playingGameId === 'meteor-storm' && (
                <MeteorGame soundsEnabled={soundsEnabled} />
              )}

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ─── Bottom Navigation bar ─── */}
      {activeScreen !== 'loading' && activeScreen !== 'game' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pointer-events-none">
          <div className="max-w-md mx-auto rounded-[24px] bg-[#120e1e]/85 backdrop-filter blur-md border border-[#a855f7]/15 p-2 flex justify-around items-center pointer-events-auto shadow-2xl">
            {[
              { id: 'hub', label: 'Catálogo', icon: Gamepad2 },
              { id: 'wifi', label: 'WiFi Sync', icon: Wifi },
              { id: 'downloads', label: 'Offline', icon: Download },
              { id: 'profile', label: 'Perfil', icon: User }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { playBeep(520, 0.05); setActiveScreen(tab.id); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                  style={{
                    color: isActive ? currentThemeObj.primary : '#a8a29e'
                  }}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} style={{ filter: isActive ? `drop-shadow(0 0 5px ${currentThemeObj.primary}80)` : 'none' }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME COMPONENT 1: PIXEL PONG NEO
// ═══════════════════════════════════════════════
function PongGame({ peerConnected, peerGamerTag, soundsEnabled }: {
  peerConnected: boolean; peerGamerTag: string; soundsEnabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const lastSentYRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const paddleWidth = 14;
    const paddleHeight = 75;
    const ballRadius = 8;

    let p1Y = height / 2 - paddleHeight / 2;
    let p2Y = height / 2 - paddleHeight / 2;

    let ballX = width / 2;
    let ballY = height / 2;
    let ballSpeedX = 4 * (Math.random() > 0.5 ? 1 : -1);
    let ballSpeedY = (Math.random() * 2 - 1) * 3;

    let localScore1 = 0;
    let localScore2 = 0;

    const handleMove = (y: number) => {
      p1Y = y - paddleHeight / 2;
      if (p1Y < 0) p1Y = 0;
      if (p1Y > height - paddleHeight) p1Y = height - paddleHeight;

      if (peerConnected && Math.abs(p1Y - lastSentYRef.current) > 2) {
        lastSentYRef.current = p1Y;
        const event = new CustomEvent('ludus-local-broadcast', { detail: { p1Y: p1Y / height, score1: localScore1, score2: localScore2 } });
        window.dispatchEvent(event);
      }
    };

    const onTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientY = e.touches[0].clientY - rect.top;
      handleMove(clientY);
    };

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientY = e.clientY - rect.top;
      handleMove(clientY);
    };

    const handlePeerUpdate = (e: any) => {
      if (e.detail && e.detail.p1Y !== undefined) {
        p2Y = e.detail.p1Y * height;
      }
    };

    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('mousemove', onMouse);
    window.addEventListener('ludus-peer-state', handlePeerUpdate);

    let frameId: number;

    const gameLoop = () => {
      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([5, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      if (!peerConnected) {
        const targetY = ballY - paddleHeight / 2;
        p2Y += (targetY - p2Y) * 0.12;
      }

      if (p2Y < 0) p2Y = 0;
      if (p2Y > height - paddleHeight) p2Y = height - paddleHeight;

      ballX += ballSpeedX;
      ballY += ballSpeedY;

      if (ballY - ballRadius < 0) {
        ballY = ballRadius;
        ballSpeedY = -ballSpeedY;
      }
      if (ballY + ballRadius > height) {
        ballY = height - ballRadius;
        ballSpeedY = -ballSpeedY;
      }

      if (ballX - ballRadius < paddleWidth && ballY > p1Y && ballY < p1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        ballX = paddleWidth + ballRadius;
        ballSpeedX *= 1.05;
        ballSpeedY = (ballY - (p1Y + paddleHeight / 2)) * 0.15;
      }

      if (ballX + ballRadius > width - paddleWidth && ballY > p2Y && ballY < p2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        ballX = width - paddleWidth - ballRadius;
        ballSpeedX *= 1.05;
        ballSpeedY = (ballY - (p2Y + paddleHeight / 2)) * 0.15;
      }

      if (ballX < 0) {
        localScore2++;
        setP2Score(localScore2);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = -4;
        ballSpeedY = (Math.random() * 2 - 1) * 3;
      }

      if (ballX > width) {
        localScore1++;
        setP1Score(localScore1);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = 4;
        ballSpeedY = (Math.random() * 2 - 1) * 3;
      }

      // Draw P1
      ctx.fillStyle = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.fillRect(0, p1Y, paddleWidth, paddleHeight);

      // Draw P2
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.fillRect(width - paddleWidth, p2Y, paddleWidth, paddleHeight);

      // Draw Ball
      ctx.fillStyle = '#e5b31c';
      ctx.shadowColor = '#e5b31c';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      frameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('mousemove', onMouse);
      window.removeEventListener('ludus-peer-state', handlePeerUpdate);
    };
  }, [peerConnected]);

  return (
    <div className="w-full h-full max-w-xl max-h-[80vh] flex flex-col justify-center items-center px-4 space-y-4">
      
      <div className="flex justify-between w-full font-mono text-xs font-black tracking-widest text-[#06b6d4]">
        <div>
          <p>PLAYER (TÚ)</p>
          <p className="text-3xl font-black text-white">{p1Score}</p>
        </div>
        <div className="text-right">
          <p>{peerConnected ? peerGamerTag.toUpperCase() : 'IA BOT'}</p>
          <p className="text-3xl font-black text-[#a855f7]">{p2Score}</p>
        </div>
      </div>

      <div className="w-full h-96 relative border border-stone-800 rounded-[28px] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-none" />
      </div>

      <p className="text-[9px] text-stone-500 text-center font-bold uppercase tracking-wider">
        Desliza en la pantalla para mover tu pala de neón cian.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME COMPONENT 2: COSMIC SNAKE
// ═══════════════════════════════════════════════
function SnakeGame({ soundsEnabled }: { soundsEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const directionRef = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const grid = 15;

    let snake = [
      { x: grid * 5, y: grid * 5 },
      { x: grid * 4, y: grid * 5 },
      { x: grid * 3, y: grid * 5 }
    ];

    let apple = { x: grid * 10, y: grid * 10 };
    let currentScore = 0;
    let localGameOver = false;

    const spawnApple = () => {
      apple.x = Math.floor(Math.random() * (size / grid)) * grid;
      apple.y = Math.floor(Math.random() * (size / grid)) * grid;
    };

    let intervalId = setInterval(() => {
      if (localGameOver) return;

      const head = { ...snake[0] };
      const dir = directionRef.current;

      if (dir === 'UP') head.y -= grid;
      if (dir === 'DOWN') head.y += grid;
      if (dir === 'LEFT') head.x -= grid;
      if (dir === 'RIGHT') head.x += grid;

      if (head.x < 0) head.x = size - grid;
      if (head.x >= size) head.x = 0;
      if (head.y < 0) head.y = size - grid;
      if (head.y >= size) head.y = 0;

      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        localGameOver = true;
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      if (head.x === apple.x && head.y === apple.y) {
        currentScore += 10;
        setScore(currentScore);
        if (currentScore > highScore) setHighScore(currentScore);
        spawnApple();
      } else {
        snake.pop();
      }

      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += grid) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#e5b31c';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#e5b31c';
      ctx.fillRect(apple.x + 2, apple.y + 2, grid - 4, grid - 4);

      snake.forEach((s, idx) => {
        ctx.fillStyle = idx === 0 ? '#06b6d4' : '#a855f7';
        ctx.fillRect(s.x + 1, s.y + 1, grid - 2, grid - 2);
      });

      ctx.shadowBlur = 0;

    }, 110);

    return () => clearInterval(intervalId);
  }, [gameOver]);

  const handleArrow = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const cur = directionRef.current;
    if (dir === 'UP' && cur !== 'DOWN') directionRef.current = 'UP';
    if (dir === 'DOWN' && cur !== 'UP') directionRef.current = 'DOWN';
    if (dir === 'LEFT' && cur !== 'RIGHT') directionRef.current = 'LEFT';
    if (dir === 'RIGHT' && cur !== 'LEFT') directionRef.current = 'RIGHT';
  };

  const resetGame = () => {
    directionRef.current = 'RIGHT';
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="w-full h-full max-w-md flex flex-col justify-center items-center px-4 space-y-4">
      <div className="flex justify-between w-full font-mono text-xs font-bold text-[#a855f7]">
        <span>SCORE: <span className="text-white text-lg font-black">{score}</span></span>
        <span>HIGHSCORE: <span className="text-[#06b6d4] text-lg font-black">{highScore}</span></span>
      </div>

      <div className="relative border-2 border-stone-800 rounded-[28px] overflow-hidden aspect-square w-full max-w-[300px]">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center space-y-3">
            <p className="text-lg font-black neon-text-purple">GAME OVER</p>
            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-xl glow-btn-blue text-white text-xs font-bold"
            >
              Reiniciar Partida
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-[200px] flex flex-col items-center gap-1 py-1">
        <button
          onClick={() => handleArrow('UP')}
          className="w-12 h-10 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-sm font-bold text-white shadow"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => handleArrow('LEFT')}
            className="w-12 h-10 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-sm font-bold text-white shadow"
          >
            ◀
          </button>
          <div className="w-12 h-10" />
          <button
            onClick={() => handleArrow('RIGHT')}
            className="w-12 h-10 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-sm font-bold text-white shadow"
          >
            ▶
          </button>
        </div>
        <button
          onClick={() => handleArrow('DOWN')}
          className="w-12 h-10 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-sm font-bold text-white shadow"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME COMPONENT 3: METEOR STORM
// ═══════════════════════════════════════════════
function MeteorGame({ soundsEnabled }: { soundsEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const keysPressedRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({ left: false, right: false, shoot: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 300);
    const height = (canvas.height = 360);

    let shipX = width / 2;
    const shipY = height - 30;
    const shipWidth = 24;

    interface Meteor { x: number; y: number; size: number; speed: number; }
    interface Laser { x: number; y: number; }

    let meteors: Meteor[] = [];
    let lasers: Laser[] = [];

    let currentScore = 0;
    let localGameOver = false;

    let nextMeteorFrame = 0;
    let shootCooldown = 0;

    const spawnMeteor = () => {
      const size = 12 + Math.random() * 16;
      meteors.push({
        x: Math.random() * (width - size),
        y: -size,
        size,
        speed: 1.5 + Math.random() * 2
      });
    };

    let frameId: number;

    const gameLoop = () => {
      if (localGameOver) return;

      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
      }

      const keys = keysPressedRef.current;
      if (keys.left) shipX -= 3.5;
      if (keys.right) shipX += 3.5;

      if (shipX < shipWidth) shipX = shipWidth;
      if (shipX > width - shipWidth) shipX = width - shipWidth;

      if (keys.shoot && shootCooldown <= 0) {
        lasers.push({ x: shipX, y: shipY - 10 });
        shootCooldown = 15;
      }
      if (shootCooldown > 0) shootCooldown--;

      lasers.forEach((l, idx) => {
        l.y -= 5.5;
        if (l.y < 0) lasers.splice(idx, 1);

        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(l.x - 1.5, l.y, 3, 10);
      });

      if (nextMeteorFrame <= 0) {
        spawnMeteor();
        nextMeteorFrame = 35 + Math.random() * 30;
      }
      nextMeteorFrame--;

      meteors.forEach((m, mIdx) => {
        m.y += m.speed;
        
        const dist = Math.hypot(m.x - shipX, m.y - shipY);
        if (dist < m.size + shipWidth/2) {
          localGameOver = true;
          setGameOver(true);
          return;
        }

        if (m.y > height + m.size) {
          meteors.splice(mIdx, 1);
        }

        lasers.forEach((l, lIdx) => {
          const lDist = Math.hypot(m.x - l.x, m.y - l.y);
          if (lDist < m.size) {
            currentScore += 15;
            setScore(currentScore);
            if (currentScore > highScore) setHighScore(currentScore);
            meteors.splice(mIdx, 1);
            lasers.splice(lIdx, 1);
          }
        });

        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Spaceship
      ctx.fillStyle = '#e5b31c';
      ctx.shadowColor = '#e5b31c';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 12);
      ctx.lineTo(shipX - shipWidth/2, shipY + 10);
      ctx.lineTo(shipX + shipWidth/2, shipY + 10);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      frameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [gameOver]);

  const setKey = (key: 'left' | 'right' | 'shoot', val: boolean) => {
    keysPressedRef.current[key] = val;
  };

  const resetGame = () => {
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="w-full h-full max-w-md flex flex-col justify-center items-center px-4 space-y-4">
      <div className="flex justify-between w-full font-mono text-xs font-bold text-[#e5b31c]">
        <span>SCORE: <span className="text-white text-lg font-black">{score}</span></span>
        <span>HIGHSCORE: <span className="text-[#06b6d4] text-lg font-black">{highScore}</span></span>
      </div>

      <div className="relative border-2 border-stone-800 rounded-[28px] overflow-hidden w-full max-w-[300px] h-[360px]">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center space-y-3">
            <p className="text-lg font-black neon-text-blue">MISSION FAILED</p>
            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-xl glow-btn-purple text-white text-xs font-bold"
            >
              Reiniciar Misión
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-[280px] flex justify-between items-center py-2">
        <div className="flex gap-2.5">
          <button
            onTouchStart={() => setKey('left', true)}
            onTouchEnd={() => setKey('left', false)}
            onMouseDown={() => setKey('left', true)}
            onMouseUp={() => setKey('left', false)}
            onMouseLeave={() => setKey('left', false)}
            className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-800 text-lg font-bold text-white select-none active:scale-95"
          >
            ◀
          </button>
          <button
            onTouchStart={() => setKey('right', true)}
            onTouchEnd={() => setKey('right', false)}
            onMouseDown={() => setKey('right', true)}
            onMouseUp={() => setKey('right', false)}
            onMouseLeave={() => setKey('right', false)}
            className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-800 text-lg font-bold text-white select-none active:scale-95"
          >
            ▶
          </button>
        </div>

        <button
          onTouchStart={() => setKey('shoot', true)}
          onTouchEnd={() => setKey('shoot', false)}
          onMouseDown={() => setKey('shoot', true)}
          onMouseUp={() => setKey('shoot', false)}
          onMouseLeave={() => setKey('shoot', false)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-black text-xs shadow-lg active:scale-95 select-none"
        >
          FUEGO
        </button>
      </div>
    </div>
  );
}
