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
  Info,
  QrCode,
  Smartphone,
  Scan,
  RefreshCw as RefreshIcon
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
  { id: 'av-1', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#06b6d4]"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6 18c0-3 3-4 6-4s6 1 6 4" stroke-linecap="round"/></svg>`, label: 'Cosmic Ranger', emoji: '👽' },
  { id: 'av-2', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#a855f7]"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/><path d="M8 15h8" stroke-linecap="round"/></svg>`, label: 'Pixel Invader', emoji: '👾' },
  { id: 'av-3', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-[#e5b31c]"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M9 16h6M8 10h.01M16 10h.01" stroke-linecap="round" stroke-width="3"/></svg>`, label: 'Cyber Mech', emoji: '🤖' },
  { id: 'av-4', icon_svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-12 h-12 text-emerald-500"><path d="M4.5 16.5c-1.5-1.5-2.5-3.5-2.5-5.5C2 6.5 6.5 2 12 2s10 4.5 10 9c0 2-1 4-2.5 5.5l-1.5-1.5c1-1 1.5-2.5 1.5-4 0-3.5-3.5-7.5-7.5-7.5S4 7 4 11c0 1.5.5 3 1.5 4l-1.5 1.5z"/><path d="M12 7l4 8H8l4-8z" fill="currentColor"/></svg>`, label: 'Star Pilot', emoji: '🚀' }
];

const HUB_THEMES = [
  { id: 'nebula', label: 'Nebula Void', primary: '#06b6d4', secondary: '#a855f7', css: 'from-[#06b6d4]/10 to-[#a855f7]/10' },
  { id: 'maple', label: 'Autumn Maple', primary: '#e5b31c', secondary: '#7c483f', css: 'from-[#e5b31c]/10 to-[#7c483f]/10' },
  { id: 'matrix', label: 'Matrix Forest', primary: '#10b981', secondary: '#047857', css: 'from-[#10b981]/10 to-[#047857]/10' },
  { id: 'synthwave', label: 'Synthwave Glow', primary: '#f43f5e', secondary: '#ec4899', css: 'from-[#f43f5e]/10 to-[#ec4899]/10' }
];

export default function LudusCloudGameHub() {
  const [activeScreen, setActiveScreen] = useState<string>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Profile / Theme States
  const [gamerTag, setGamerTag] = useState('Gamer_Ludus');
  const [avatar, setAvatar] = useState('av-1');
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('nebula');

  // Supabase connection
  const [customSupaUrl, setCustomSupaUrl] = useState('');
  const [customSupaKey, setCustomSupaKey] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(true);
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [supaValidationMsg, setSupaValidationMsg] = useState('');

  const [clientId, setClientId] = useState('');

  // Games State
  const [games, setGames] = useState<Game[]>(LOCAL_GAMES);
  const [downloadedGameIds, setDownloadedGames] = useState<string[]>([]);
  const [downloadingGameId, setDownloadingGameId] = useState<string | null>(null);

  // WiFi Connection (Zapya-Style Radar) States
  const [connectionRole, setConnectionRole] = useState<'none' | 'host' | 'client'>('none');
  const [pairingCode, setPairingCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerGamerTag, setPeerGamerTag] = useState('');
  const [peerAvatar, setPeerAvatar] = useState('av-2');
  const [isSearchingPeer, setIsSearchingPeer] = useState(false);
  const [peerConnectionError, setPeerConnectionError] = useState('');

  // Zapya overlay modal states: 'none' | 'create_group' | 'join_code' | 'scanner'
  const [zapyaModal, setZapyaModal] = useState<'none' | 'create_group' | 'join_code' | 'scanner'>('none');
  const [scannedRadarPeers, setScannedRadarPeers] = useState<{ name: string; avatar: string; code: string; x: number; y: number }[]>([]);

  // Playing game state
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);

  // Catalog Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Broadcast channel
  const syncChannelRef = useRef<any>(null);

  // Load configs
  useEffect(() => {
    let id = localStorage.getItem('ludus_client_id');
    if (!id) {
      id = 'client-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('ludus_client_id', id);
    }
    setClientId(id);

    async function fetchDatabaseGames() {
      const data = await getGames();
      setGames(data);
    }
    fetchDatabaseGames();

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

    const savedSupaUrl = localStorage.getItem('ludus_custom_supa_url');
    if (savedSupaUrl) setCustomSupaUrl(savedSupaUrl);
    const savedSupaKey = localStorage.getItem('ludus_custom_supa_key');
    if (savedSupaKey) setCustomSupaKey(savedSupaKey);

    return () => clearInterval(interval);
  }, []);

  // Simulating discovery of local radar users upon entering the WiFi tab
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (activeScreen === 'wifi' && !peerConnected) {
      setScannedRadarPeers([]);
      t = setTimeout(() => {
        // Mocking Zapya discovering two nearby gamer hosts drifting around on the radar grid
        setScannedRadarPeers([
          { name: 'Host_Vortex', avatar: 'av-3', code: '4532', x: 25, y: 30 },
          { name: 'Pulse_Player', avatar: 'av-2', code: '8810', x: 75, y: 65 }
        ]);
        playBeep(700, 0.12);
      }, 2500);
    }
    return () => clearTimeout(t);
  }, [activeScreen, peerConnected]);

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

  // Installation simulator
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
  // ZAPYA HOST GROUP (CREAR GRUPO)
  // ═══════════════════════════════════════════════
  const handleCreateZapyaGroup = async () => {
    playBeep(440, 0.1);
    setZapyaModal('create_group');
    setConnectionRole('host');
    setIsSearchingPeer(true);
    setPeerConnectionError('');

    const session = await createSyncSession(gamerTag, clientId);
    if (session) {
      setPairingCode(session.code);

      // Listen for client joining this database row
      const channel = supabase
        .channel(`sync-session-${session.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'ludus_sync_sessions', filter: `id=eq.${session.id}` },
          async (payload: any) => {
            const updatedSession = payload.new as SyncSession;
            if (updatedSession.status === 'connecting' && updatedSession.client_name) {
              setPeerGamerTag(updatedSession.client_name);
              await updateSessionStatus(session.id, 'connected');
              setPeerConnected(true);
              setIsSearchingPeer(false);
              setZapyaModal('none');
              playBeep(880, 0.35);

              setupSyncRoom(session.code);
            }
          }
        )
        .subscribe();
    } else {
      setConnectionRole('none');
      setZapyaModal('none');
      setPeerConnectionError('Error conectando con Supabase para registrar grupo.');
    }
  };

  // Client connects directly to peer discovered on Radar
  const handleConnectRadarPeer = async (peer: { name: string; code: string; avatar: string }) => {
    playBeep(520, 0.1);
    setPeerGamerTag(peer.name);
    setPeerAvatar(peer.avatar);
    setIsSearchingPeer(true);
    setConnectionRole('client');

    const session = await joinSyncSession(peer.code, gamerTag, clientId);
    if (session) {
      setPeerConnected(true);
      setIsSearchingPeer(false);
      playBeep(880, 0.35);
      setupSyncRoom(session.code);
    } else {
      setIsSearchingPeer(false);
      setPeerConnectionError('Error conectando con el peer seleccionado en el radar.');
      playBeep(200, 0.3);
    }
  };

  // Client manually inputs join code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.length !== 4) return;
    playBeep(440, 0.1);
    setIsSearchingPeer(true);
    setConnectionRole('client');

    const session = await joinSyncSession(inputCode, gamerTag, clientId);
    if (session) {
      setPeerGamerTag(session.host_name);
      setPeerConnected(true);
      setIsSearchingPeer(false);
      setZapyaModal('none');
      playBeep(880, 0.35);
      setupSyncRoom(session.code);
    } else {
      setIsSearchingPeer(false);
      setPeerConnectionError('Código inválido o sesión inactiva.');
      playBeep(200, 0.3);
    }
  };

  // Setup Low-Latency Realtime Room state sharing
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
    setZapyaModal('none');
    playBeep(300, 0.2);
  };

  // Custom Supabase Validation
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
      const testClient = createClient(customSupaUrl, customSupaKey);
      const { error } = await testClient.from('ludus_games').select('id').limit(1);
      if (error && error.code !== 'PGRST116') throw error;

      setSupabaseConnected(true);
      localStorage.setItem('ludus_custom_supa_url', customSupaUrl);
      localStorage.setItem('ludus_custom_supa_key', customSupaKey);
      setSupaValidationMsg('¡Conexión validada con éxito! Datos cargados en caliente.');
      playBeep(880, 0.35);

      const updatedGames = await getGames();
      setGames(updatedGames);
    } catch (err: any) {
      setSupaValidationMsg(`Error de conexión: ${err.message || 'Credenciales inválidas'}`);
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
      
      {/* Background ambient light */}
      <div
        className="absolute top-0 left-1/4 w-[50vw] h-[50vh] bg-gradient-to-b blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{ backgroundImage: `linear-gradient(to bottom, ${currentThemeObj.primary}15, transparent)` }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[50vw] h-[50vh] bg-gradient-to-t blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{ backgroundImage: `linear-gradient(to top, ${currentThemeObj.secondary}15, transparent)` }}
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

            {/* Quick Stats */}
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-900 focus:outline-none text-xs font-bold font-mono"
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

            {/* Game Grid */}
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
                      style={{ borderColor: isDownloaded ? `${currentThemeObj.secondary}30` : '#1c1917' }}
                    >
                      <div className="relative h-32 bg-stone-900">
                        <img src={g.image_url} alt={g.name} className="w-full h-full object-cover opacity-85" />
                        <span className="absolute top-2.5 left-2.5 bg-black/85 border border-stone-800 px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5">
                          <span dangerouslySetInnerHTML={{ __html: g.icon_svg }} className="w-3.5 h-3.5" style={{ color: currentThemeObj.primary }} />
                          <span>{g.category.toUpperCase()}</span>
                        </span>
                      </div>

                      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm tracking-tight">{g.name}</h4>
                          <p className="text-[10px] text-stone-400 leading-relaxed font-medium line-clamp-3">{g.description}</p>
                        </div>

                        <div className="flex gap-2 text-[9px] font-bold text-stone-500">
                          {g.offline_support && <span className="text-emerald-500">✓ Offline</span>}
                          {g.multiplayer_support && <span style={{ color: currentThemeObj.primary }}>✓ WiFi Sync</span>}
                          <span className="ml-auto text-stone-600 font-mono">{g.download_size}</span>
                        </div>

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
                              className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-bold hover:text-white flex items-center justify-center"
                              title="Descargar para Offline"
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
           SCREEN 3: WIFI SYNC (HYPER ZAPYA-STYLE)
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'wifi' && (
          <motion.div
            key="wifi"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6 pb-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center">
                  <Wifi className="w-5 h-5" style={{ color: currentThemeObj.primary }} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider font-mono">Radar WiFi Direct</h2>
                  <p className="text-[8px] text-stone-500 font-bold uppercase tracking-widest font-mono">Sincronización P2P</p>
                </div>
              </div>
            </div>

            {/* THE ZAPYA RADAR GRID VIEWPORT */}
            <div className="cyber-card rounded-[32px] p-6 border border-stone-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] shadow-2xl">
              
              {!peerConnected && (
                <>
                  {/* Radar Sweeping concentric layout */}
                  <div className="relative w-56 h-54 mx-auto rounded-full border border-[#06b6d4]/10 bg-[#06b6d4]/5 flex items-center justify-center">
                    
                    {/* Concentric waves */}
                    <div className="absolute inset-4 rounded-full border border-stone-850/20" />
                    <div className="absolute inset-12 rounded-full border border-stone-850/30" />
                    <div className="absolute inset-20 rounded-full border border-stone-850/40" />

                    {/* Infinite sweeping ray */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-cyan-500/10 origin-center animate-[spin_5s_linear_infinite] pointer-events-none" />

                    {/* MY CENTRAL PLAYER BUBBLE */}
                    <div className="relative w-16 h-16 rounded-full bg-[#09070f] border-2 flex flex-col items-center justify-center p-1 shadow-xl z-20 transition-all duration-300 animate-pulse"
                         style={{ borderColor: currentThemeObj.primary, boxShadow: `0 0 15px ${currentThemeObj.primary}50` }}>
                      <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-10 h-10" />
                      <span className="absolute -bottom-4 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded-full text-[8px] font-black max-w-[70px] truncate uppercase font-mono">
                        {gamerTag}
                      </span>
                    </div>

                    {/* DISCOVERED PEERS FLOATING AROUND (STYLE ZAPYA) */}
                    {scannedRadarPeers.map((peer, i) => {
                      const peerAvatarObj = PLAYER_AVATARS.find(av => av.id === peer.avatar) || PLAYER_AVATARS[1];
                      return (
                        <motion.button
                          key={peer.code}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', damping: 15, delay: i * 0.4 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleConnectRadarPeer(peer)}
                          className="absolute p-1.5 rounded-2xl bg-[#09070f] border-2 flex flex-col items-center justify-center cursor-pointer shadow-lg z-20"
                          style={{
                            top: `${peer.y}%`,
                            left: `${peer.x}%`,
                            borderColor: i === 0 ? '#a855f7' : '#e5b31c',
                            boxShadow: `0 0 10px ${i === 0 ? '#a855f7' : '#e5b31c'}40`
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: peerAvatarObj.icon_svg }} className="w-8 h-8" />
                          <span className="text-[7px] font-black max-w-[50px] truncate leading-none mt-1 uppercase text-stone-400 font-mono">
                            {peer.name}
                          </span>
                        </motion.button>
                      );
                    })}

                  </div>

                  {/* Scanning State / Info message */}
                  <div className="text-center space-y-1.5 z-10 pt-4">
                    {scannedRadarPeers.length === 0 ? (
                      <div className="flex justify-center items-center gap-1.5 text-xs text-stone-500 font-bold uppercase tracking-wider animate-pulse">
                        <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Escaneando señales de red WiFi...</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-cyan-400 font-black uppercase tracking-wider animate-pulse">
                        🎯 ¡Señales de radar detectadas! Toca un globo para unirte.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* CONNECTED PEER UI */}
              {peerConnected && (
                <div className="space-y-6 text-center w-full py-6">
                  <div className="flex justify-center items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center p-1" style={{ borderColor: currentThemeObj.primary }}>
                      <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-10 h-10" />
                    </div>
                    
                    <div className="flex flex-col items-center gap-0.5 font-bold text-[#06b6d4]">
                      <span className="text-xl animate-pulse">⚡</span>
                      <span className="text-[8px] uppercase tracking-wider text-stone-500">WiFi Sync</span>
                    </div>

                    <div className="w-14 h-14 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center p-1" style={{ borderColor: currentThemeObj.secondary }}>
                      <span dangerouslySetInnerHTML={{ __html: (PLAYER_AVATARS.find(av => av.id === peerAvatar) || PLAYER_AVATARS[1]).icon_svg }} className="w-10 h-10" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Dispositivos Emparejados</h4>
                    <p className="text-xs text-stone-400">Canal de broadcast abierto con <span className="font-black text-white">{peerGamerTag}</span></p>
                  </div>

                  <div className="py-2.5 px-4 rounded-xl bg-stone-950 border border-stone-900 max-w-xs mx-auto text-[10px] font-mono font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Sincronización Lista
                  </div>

                  <button
                    onClick={disconnectSync}
                    className="w-full max-w-xs py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-black"
                  >
                    Desconectar Sincronización
                  </button>
                </div>
              )}

            </div>

            {/* ACTION TRIGGERS PANEL */}
            {!peerConnected && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCreateZapyaGroup}
                  className="py-3.5 px-4 rounded-[20px] font-black text-xs flex flex-col items-center gap-2 border border-stone-800 hover:border-stone-700 bg-stone-950/80 shadow-md"
                >
                  <Radio className="w-5 h-5 text-cyan-400" />
                  <span>Crear Grupo</span>
                </button>
                <button
                  onClick={() => { playBeep(520, 0.1); setZapyaModal('join_code'); }}
                  className="py-3.5 px-4 rounded-[20px] font-black text-xs flex flex-col items-center gap-2 border border-stone-800 hover:border-stone-700 bg-stone-950/80 shadow-md"
                >
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <span>Unirse por Código</span>
                </button>
              </div>
            )}

            {peerConnectionError && (
              <p className="text-xs text-red-500 font-bold text-center">⚠️ {peerConnectionError}</p>
            )}

          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 4: PERFIL Y AJUSTES
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
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue font-mono">Mi Perfil Gamer</h2>
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
                  style={{ backgroundColor: soundsEnabled ? currentThemeObj.primary : '#292524' }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${soundsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Custom Supabase Settings */}
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
                    style={{ background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` }}
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
                      style={{ background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` }}
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

      {/* ─── Immersive Floating Zapya Overlays ─── */}
      <AnimatePresence>
        
        {/* MODAL: CREATE GROUP (HOST VIEW WITH QR CODE & PIN) */}
        {zapyaModal === 'create_group' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={disconnectSync} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#120e1e] border border-stone-800 rounded-[32px] p-6 text-center space-y-5 z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-900">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Crear Grupo de Juego</span>
                <button onClick={disconnectSync} className="p-1 rounded-full hover:bg-stone-850"><X className="w-4 h-4 text-stone-500" /></button>
              </div>

              {/* Glowing Custom Vector QR CODE representation */}
              <div className="w-40 h-40 bg-white p-3.5 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/15 relative">
                <QrCode className="w-full h-full text-stone-950" strokeWidth={1.5} />
                <div className="absolute inset-0 border-2 border-dashed border-cyan-400 rounded-3xl animate-pulse pointer-events-none scale-105" />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest font-mono">PIN de emparejamiento</p>
                <p className="text-4xl font-black tracking-widest text-[#06b6d4] font-mono">{pairingCode}</p>
                <p className="text-[9px] text-stone-400 font-medium leading-relaxed max-w-[240px] mx-auto pt-1">
                  Pídele a tu amigo que escanee tu pantalla en la sección de radar o que digite el PIN directamente en su app.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[9px] text-cyan-400 font-black animate-pulse uppercase tracking-widest">
                <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Esperando jugador en Supabase...</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL: JOIN BY CODE (PIN MANUAL INPUT) */}
        {zapyaModal === 'join_code' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setZapyaModal('none')} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#120e1e] border border-stone-800 rounded-[32px] p-6 text-center space-y-4 z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-900">
                <span className="text-xs font-black uppercase tracking-wider text-purple-400 font-mono">Unirse por PIN</span>
                <button onClick={() => setZapyaModal('none')} className="p-1 rounded-full hover:bg-stone-850"><X className="w-4 h-4 text-stone-500" /></button>
              </div>

              <form onSubmit={handleJoinByCode} className="space-y-4 pt-2">
                <p className="text-[10px] text-stone-400 leading-normal max-w-xs mx-auto">
                  Introduce el PIN de 4 dígitos generado por tu amigo (Host) para unirte a su sala en caliente.
                </p>

                <div className="flex gap-2 justify-center">
                  <input
                    type="number"
                    maxLength={4}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Escribe PIN"
                    className="w-full max-w-[200px] px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-center text-xl font-black placeholder-stone-700 focus:outline-none focus:border-[#a855f7] font-mono tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inputCode.length !== 4 || isSearchingPeer}
                  className="w-full py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-widest"
                  style={{ background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` }}
                >
                  {isSearchingPeer ? (
                    <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Conectar Canal
                </button>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* Bottom Navigation */}
      {activeScreen !== 'loading' && activeScreen !== 'game' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pointer-events-none">
          <div className="max-w-md mx-auto rounded-[24px] bg-[#120e1e]/85 backdrop-filter blur-md border border-stone-800 p-2 flex justify-around items-center pointer-events-auto shadow-2xl">
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
                  style={{ color: isActive ? currentThemeObj.primary : '#a8a29e' }}
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

// Helper
function itemQuantity(item: any): number {
  return item.quantity || 1;
}
