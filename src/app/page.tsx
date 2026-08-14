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
  RefreshCw as RefreshIcon,
  ChevronRight,
  MessageSquare
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

  const supabaseConnected = true;
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

  // Zapya states
  const [scannedRadarPeers, setScannedRadarPeers] = useState<{ name: string; avatar: string; clientId: string; x: number; y: number }[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<{ fromTag: string; fromId: string; code: string } | null>(null);
  const [zapyaModal, setZapyaModal] = useState<'none' | 'create_group' | 'join_code'>('none');

  // Selected game
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);

  // Search/Filters in Hub
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const presenceChannelRef = useRef<any>(null);
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

    return () => clearInterval(interval);
  }, []);

  // Simulating discovery of local radar users upon entering the WiFi tab
  useEffect(() => {
    if (activeScreen !== 'wifi' || !clientId) return;

    const presenceChannel = supabase.channel('ludus-radar-lobby', {
      config: {
        presence: {
          key: clientId,
        },
      },
    });

    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        parsePresenceState(state);
      })
      .on('presence', { event: 'join' }, () => {
        playBeep(700, 0.1);
      })
      .on('presence', { event: 'leave' }, () => {
        playBeep(300, 0.1);
      })
      .on('broadcast', { event: 'sync-invite' }, (payload: any) => {
        const data = payload.payload;
        if (data.targetId === clientId) {
          setIncomingInvite({
            fromTag: data.fromTag,
            fromId: data.fromId,
            code: data.code
          });
          playBeep(600, 0.2);
        }
      })
      .on('broadcast', { event: 'sync-response' }, (payload: any) => {
        const data = payload.payload;
        if (data.targetId === clientId && data.accepted) {
          setPeerGamerTag(data.peerTag);
          setPeerAvatar(data.peerAvatar);
          setPeerConnected(true);
          setIsSearchingPeer(false);
          setZapyaModal('none');
          playBeep(880, 0.35);

          setupSyncRoom(data.code);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            gamerTag,
            avatar,
            clientId,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }
    };
  }, [activeScreen, gamerTag, avatar, clientId]);

  const parsePresenceState = (state: Record<string, any[]>) => {
    const peers: any[] = [];
    let count = 0;
    
    Object.entries(state).forEach(([key, value]) => {
      if (key === clientId) return;

      const pInfo = value[0];
      if (pInfo && pInfo.gamerTag) {
        const angle = (count * 135 + 45) * (Math.PI / 180);
        const radius = 35 + (count * 10) % 25;
        
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;

        peers.push({
          name: pInfo.gamerTag,
          avatar: pInfo.avatar || 'av-2',
          clientId: pInfo.clientId,
          x,
          y
        });
        count++;
      }
    });

    setScannedRadarPeers(peers);
  };

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

  const handleCreateZapyaGroup = async () => {
    playBeep(440, 0.1);
    setZapyaModal('create_group');
    setConnectionRole('host');
    setIsSearchingPeer(true);
    setPeerConnectionError('');

    const session = await createSyncSession(gamerTag, clientId);
    if (session) {
      setPairingCode(session.code);

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

  const handleConnectRadarPeer = (peer: { name: string; clientId: string }) => {
    if (!presenceChannelRef.current) return;
    playBeep(440, 0.08);
    setIsSearchingPeer(true);
    setPeerGamerTag(peer.name);

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setPairingCode(code);

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'sync-invite',
      payload: {
        fromTag: gamerTag,
        fromId: clientId,
        targetId: peer.clientId,
        code
      }
    });
  };

  const acceptIncomingInvite = () => {
    if (!incomingInvite || !presenceChannelRef.current) return;
    playBeep(520, 0.15);

    setPeerGamerTag(incomingInvite.fromTag);
    setPeerConnected(true);
    setIncomingInvite(null);

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'sync-response',
      payload: {
        targetId: incomingInvite.fromId,
        accepted: true,
        code: incomingInvite.code,
        peerTag: gamerTag,
        peerAvatar: avatar
      }
    });

    setupSyncRoom(incomingInvite.code);
  };

  const rejectIncomingInvite = () => {
    setIncomingInvite(null);
    playBeep(200, 0.2);
  };

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
      className="fixed inset-0 h-full w-full bg-[#09070f] text-white overflow-hidden flex flex-col justify-between transition-all scanlines"
      style={{
        '--primary-glow': `${currentThemeObj.primary}45`,
        '--secondary-glow': `${currentThemeObj.secondary}45`,
        height: '100dvh'
      } as React.CSSProperties}
    >
      
      {/* Background ambient lights */}
      <div
        className="absolute top-0 left-1/4 w-[50vw] h-[50vh] bg-gradient-to-b blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{ backgroundImage: `linear-gradient(to bottom, ${currentThemeObj.primary}12, transparent)` }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[50vw] h-[50vh] bg-gradient-to-t blur-[120px] pointer-events-none -z-10 transition-all duration-500"
        style={{ backgroundImage: `linear-gradient(to top, ${currentThemeObj.secondary}12, transparent)` }}
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
                <div className="w-full h-2 rounded-full bg-stone-900 border border-stone-850 p-0.5 overflow-hidden">
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 h-full w-full flex flex-col justify-between"
          >
            {/* Strict Header */}
            <div className="w-full px-4 pt-4 pb-2 border-b border-stone-900 flex justify-between items-center bg-[#09070f]/90 z-20">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-7 h-7" style={{ color: currentThemeObj.primary }}>
                  <path d="M12 2a4 4 0 0 0-4 4v4H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-3V6a4 4 0 0 0-4-4z" />
                </svg>
                <div>
                  <h1 className="text-xs font-black tracking-widest uppercase leading-none" style={{ color: currentThemeObj.primary }}>
                    Ludus Cloud
                  </h1>
                  <p className="text-[7px] font-bold tracking-widest uppercase mt-0.5" style={{ color: currentThemeObj.secondary }}>Game Hub</p>
                </div>
              </div>

              <button
                onClick={() => { playBeep(); setActiveScreen('profile'); }}
                className="flex items-center gap-2 px-3 py-1 rounded-full cyber-card border border-stone-850"
              >
                <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-4 h-4" />
                <span className="text-[10px] font-bold font-mono tracking-tight max-w-[80px] truncate">{gamerTag}</span>
              </button>
            </div>

            {/* Immersive Scrollable Catalog Content only */}
            <div className="flex-1 scrollable-y w-full px-4 py-4 space-y-5 pb-24 z-10">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-850">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wifi className="w-4 h-4 shrink-0" style={{ color: currentThemeObj.primary }} />
                    <div className="min-w-0 leading-tight">
                      <p className="text-[7px] text-stone-500 font-bold uppercase font-mono">WiFi Sync</p>
                      <p className="text-[11px] font-black truncate">{peerConnected ? peerGamerTag : 'Desconectado'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { playBeep(); setActiveScreen('wifi'); }}
                    className="px-2 py-0.5 rounded-lg bg-stone-900 text-[8px] font-bold border border-stone-800 hover:border-[#06b6d4]"
                  >
                    Sync
                  </button>
                </div>

                <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-850">
                  <div className="flex items-center gap-2 min-w-0">
                    <Download className="w-4 h-4 shrink-0" style={{ color: currentThemeObj.secondary }} />
                    <div className="min-w-0 leading-tight">
                      <p className="text-[7px] text-stone-500 font-bold uppercase font-mono">Guardados</p>
                      <p className="text-[11px] font-black truncate">{downloadedGameIds.length} juego(s)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { playBeep(); setActiveScreen('downloads'); }}
                    className="px-2 py-0.5 rounded-lg bg-stone-900 text-[8px] font-bold border border-stone-800 hover:border-[#a855f7]"
                  >
                    Ver
                  </button>
                </div>
              </div>

              {/* Search & Filter bar */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar juegos en Supabase..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950/80 border border-stone-900 focus:outline-none text-[11px] font-bold"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'arcade', label: 'Arcade' },
                    { id: 'action', label: 'Acción' },
                    { id: 'offline', label: 'Offline' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => { playBeep(520, 0.08); setActiveFilter(filter.id); }}
                      className="shrink-0 px-3.5 py-1 rounded-full text-[9px] font-black tracking-wide uppercase transition-all"
                      style={{
                        background: activeFilter === filter.id ? `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` : '#16141a',
                        border: activeFilter === filter.id ? '1px solid transparent' : '1px solid #24222a',
                        color: activeFilter === filter.id ? '#ffffff' : '#8c8896'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game list */}
              <div className="space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-wider text-stone-500 font-mono">Listado de juegos</h3>
                <div className="grid grid-cols-1 gap-4">
                  {filteredGames.map((g) => {
                    const isDownloaded = downloadedGameIds.includes(g.id);
                    const isDownloading = downloadingGameId === g.id;

                    return (
                      <div
                        key={g.id}
                        className="cyber-card rounded-[22px] overflow-hidden border border-stone-900 flex flex-col justify-between"
                        style={{ borderColor: isDownloaded ? `${currentThemeObj.secondary}25` : '#1c1917' }}
                      >
                        <div className="relative h-28 bg-stone-900">
                          <img src={g.image_url} alt={g.name} className="w-full h-full object-cover opacity-80" />
                          <span className="absolute top-2 left-2 bg-black/80 border border-stone-850 px-2 py-0.5 rounded-md text-[8px] font-bold flex items-center gap-1">
                            <span dangerouslySetInnerHTML={{ __html: g.icon_svg }} className="w-3 h-3" style={{ color: currentThemeObj.primary }} />
                            <span>{g.category.toUpperCase()}</span>
                          </span>
                        </div>

                        <div className="p-3.5 space-y-2.5">
                          <div>
                            <h4 className="font-extrabold text-xs tracking-tight">{g.name}</h4>
                            <p className="text-[9px] text-stone-400 leading-snug line-clamp-2 mt-0.5">{g.description}</p>
                          </div>

                          <div className="flex gap-2 text-[8px] font-bold text-stone-500 font-mono">
                            {g.offline_support && <span className="text-emerald-500">✓ Offline</span>}
                            {g.multiplayer_support && <span style={{ color: currentThemeObj.primary }}>✓ WiFi Sync</span>}
                            <span className="ml-auto text-stone-600">{g.download_size}</span>
                          </div>

                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              onClick={() => {
                                playBeep(520, 0.1);
                                setPlayingGameId(g.id);
                                setActiveScreen('game');
                              }}
                              className="flex-1 py-2 rounded-xl text-white text-[10px] font-black flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                              style={{ background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` }}
                            >
                              <Play className="w-3 h-3 fill-current" /> Jugar
                            </button>
                            {!isDownloaded ? (
                              <button
                                onClick={() => handleDownloadGame(g.id)}
                                disabled={isDownloading}
                                className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-850 text-stone-400 flex items-center justify-center"
                              >
                                {isDownloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: currentThemeObj.secondary }} /> : <Download className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <button onClick={() => handleDeleteGame(g.id)} className="px-3 py-2 rounded-xl bg-red-950/20 border border-red-900/20 text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
           SCREEN 3: WIFI SYNC (ZAPYA RADAR VIEWPORT - 100% IMMERSIVE)
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'wifi' && (
          <motion.div
            key="wifi"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 h-full w-full flex flex-col justify-between"
          >
            <div className="w-full px-4 pt-4 pb-2 border-b border-stone-900 flex items-center justify-between bg-[#09070f]/90 z-20">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5" style={{ color: currentThemeObj.primary }} />
                <h2 className="text-xs font-black uppercase tracking-wider font-mono">Radar WiFi Direct</h2>
              </div>
            </div>

            {/* Immersive non-scrollable radar sweep viewport */}
            <div className="flex-1 w-full flex flex-col justify-center items-center px-4 space-y-5 no-touch-actions z-10 pb-24">
              <div className="cyber-card rounded-[32px] p-5 border border-stone-850 text-center space-y-4 relative overflow-hidden w-full max-w-sm flex flex-col items-center justify-center min-h-[360px] shadow-2xl">
                
                {!peerConnected && (
                  <>
                    {/* The sweeping circular container */}
                    <div className="relative w-48 h-48 mx-auto rounded-full border border-stone-900 bg-stone-950/30 flex items-center justify-center no-touch-actions">
                      <div className="absolute inset-4 rounded-full border border-stone-900" />
                      <div className="absolute inset-12 rounded-full border border-stone-900/60" />
                      <div className="absolute inset-18 rounded-full border border-stone-900/30" />

                      {/* Infinite sweeping beam */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-cyan-500/10 origin-center animate-[spin_5.5s_linear_infinite]" />

                      {/* CENTRAL AVATAR */}
                      <div className="relative w-14 h-14 rounded-full bg-[#09070f] border-2 flex flex-col items-center justify-center p-1 shadow-lg z-20 animate-pulse"
                           style={{ borderColor: currentThemeObj.primary, boxShadow: `0 0 12px ${currentThemeObj.primary}40` }}>
                        <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-9 h-9" />
                        <span className="absolute -bottom-3 bg-stone-950 border border-stone-850 px-2 py-0.5 rounded-full text-[7px] font-black max-w-[65px] truncate uppercase font-mono text-white">
                          {gamerTag}
                        </span>
                      </div>

                      {/* SCANNING ACTIVE DEVS POPPING UP */}
                      {scannedRadarPeers.map((peer) => {
                        const peerAvatarObj = PLAYER_AVATARS.find(av => av.id === peer.avatar) || PLAYER_AVATARS[1];
                        return (
                          <motion.button
                            key={peer.clientId}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleConnectRadarPeer(peer)}
                            className="absolute p-1.5 rounded-2xl bg-[#09070f] border-2 flex flex-col items-center justify-center cursor-pointer shadow-lg z-20"
                            style={{
                              top: `${peer.y}%`,
                              left: `${peer.x}%`,
                              borderColor: currentThemeObj.secondary,
                              boxShadow: `0 0 8px ${currentThemeObj.secondary}30`
                            }}
                          >
                            <span dangerouslySetInnerHTML={{ __html: peerAvatarObj.icon_svg }} className="w-8 h-8" />
                            <span className="text-[7px] font-black max-w-[50px] truncate mt-1 uppercase text-stone-400 font-mono leading-none">
                              {peer.name}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="text-center space-y-1 z-10 pt-2">
                      {scannedRadarPeers.length === 0 ? (
                        <div className="flex justify-center items-center gap-1.5 text-[10px] text-stone-500 font-bold uppercase tracking-wider animate-pulse">
                          <RefreshIcon className="w-3 h-3 animate-spin" style={{ color: currentThemeObj.primary }} />
                          <span>Buscando peers activos...</span>
                        </div>
                      ) : (
                        <p className="text-[9px] text-cyan-400 font-black uppercase tracking-wider font-mono animate-pulse">
                          🎯 ¡Señales activas encontradas! Toca una para sincronizar.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* CONNECTED PEER INTERFACE */}
                {peerConnected && (
                  <div className="space-y-5 text-center w-full py-4">
                    <div className="flex justify-center items-center gap-5">
                      <div className="w-12 h-14 rounded-full bg-stone-900 border border-stone-850 flex items-center justify-center p-1" style={{ borderColor: currentThemeObj.primary }}>
                        <span dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-9 h-9" />
                      </div>
                      <span className="text-lg animate-pulse text-[#06b6d4]">⚡</span>
                      <div className="w-12 h-14 rounded-full bg-stone-900 border border-stone-850 flex items-center justify-center p-1" style={{ borderColor: currentThemeObj.secondary }}>
                        <span dangerouslySetInnerHTML={{ __html: (PLAYER_AVATARS.find(av => av.id === peerAvatar) || PLAYER_AVATARS[1]).icon_svg }} className="w-9 h-9" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-xs">WiFi Sync Establecido</h4>
                      <p className="text-[10px] text-stone-400">Jugando con: <span className="font-black text-white">{peerGamerTag}</span></p>
                    </div>

                    <div className="py-2 px-3 rounded-xl bg-stone-950 border border-stone-900 max-w-xs mx-auto text-[9px] font-mono font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-2 rounded-full bg-emerald-500 animate-ping" /> Canal Listo
                    </div>

                    <button
                      onClick={disconnectSync}
                      className="w-full max-w-xs py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-[10px] font-black"
                    >
                      Desconectar
                    </button>
                  </div>
                )}
              </div>

              {/* ACTION BOTTON PANEL */}
              {!peerConnected && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  <button
                    onClick={handleCreateZapyaGroup}
                    className="py-3.5 px-4 rounded-[20px] font-black text-xs flex flex-col items-center gap-1.5 border border-stone-800 hover:border-stone-700 bg-stone-950/80 shadow-md active:scale-95 transition-transform"
                  >
                    <Radio className="w-4.5 h-4.5 text-cyan-400" />
                    <span className="font-mono uppercase tracking-wider text-[9px]">Crear Grupo</span>
                  </button>
                  <button
                    onClick={() => { playBeep(520, 0.1); setZapyaModal('join_code'); }}
                    className="py-3.5 px-4 rounded-[20px] font-black text-xs flex flex-col items-center gap-1.5 border border-stone-800 hover:border-stone-700 bg-stone-950/80 shadow-md active:scale-95 transition-transform"
                  >
                    <Smartphone className="w-4.5 h-4.5 text-purple-400" />
                    <span className="font-mono uppercase tracking-wider text-[9px]">Ingresar PIN</span>
                  </button>
                </div>
              )}
            </div>
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
            className="absolute inset-0 h-full w-full flex flex-col justify-between"
          >
            <div className="w-full px-4 pt-4 pb-2 border-b border-stone-900 flex justify-between items-center bg-[#09070f]/90 z-20">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={() => { playBeep(); setActiveScreen('hub'); }} />
                <h2 className="text-xs font-black uppercase tracking-wider font-mono">Ajustes de Perfil</h2>
              </div>
            </div>

            {/* Immersive Scrollable form container */}
            <div className="flex-1 scrollable-y w-full px-4 py-4 space-y-5 pb-24 z-10">
              <div className="cyber-card rounded-[28px] p-5 border border-stone-850 space-y-5">
                
                {/* Avatar selection */}
                <div className="text-center space-y-2">
                  <div dangerouslySetInnerHTML={{ __html: activeAvatarObj.icon_svg }} className="w-14 h-14 mx-auto flex items-center justify-center p-1 border border-stone-900 rounded-2xl" />
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider font-mono">Avatar de juego</p>
                  
                  <div className="flex justify-center gap-2 pt-1">
                    {PLAYER_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => { playBeep(520, 0.08); setAvatar(av.id); }}
                        className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center border transition-all hover:scale-105"
                        style={{
                          borderColor: avatar === av.id ? currentThemeObj.primary : '#292524',
                          boxShadow: avatar === av.id ? `0 0 10px ${currentThemeObj.primary}30` : 'none'
                        }}
                        dangerouslySetInnerHTML={{ __html: av.icon_svg }}
                      />
                    ))}
                  </div>
                </div>

                {/* Nickname */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 pl-1 font-mono">GamerTag</label>
                  <input
                    type="text"
                    value={gamerTag}
                    onChange={(e) => {
                      setGamerTag(e.target.value);
                      localStorage.setItem('ludus_gamertag', e.target.value);
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-stone-950 border border-stone-900 text-xs font-bold font-mono text-white"
                  />
                </div>

                {/* Color themes */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 pl-1 flex items-center gap-1.5 font-mono">
                    <Palette className="w-3.5 h-3.5" /> Tema de Consola
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
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] font-black uppercase tracking-wider font-mono">{theme.label}</span>
                          <div className="flex gap-1 mt-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.secondary }} />
                          </div>
                        </div>
                        {activeTheme === theme.id && <Check className="w-3.5 h-3.5" style={{ color: theme.primary }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio */}
                <div className="flex items-center justify-between py-2 border-t border-stone-900">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono">
                    {soundsEnabled ? <Volume2 className="w-4 h-4" style={{ color: currentThemeObj.primary }} /> : <VolumeX className="w-4 h-4 text-stone-500" />}
                    <span>Efectos de sonido</span>
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

                {/* Static indicator info of Supabase connection */}
                <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-900 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono text-emerald-500">
                    <Database className="w-3.5 h-3.5" /> Supabase Integrado
                  </span>
                  <p className="text-[8px] text-stone-500 leading-normal font-medium">
                    Conectado directamente por variables de entorno del servidor. Toda la red de radar de Zapya y el listado de juegos operan de forma automatizada.
                  </p>
                </div>

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
            className="absolute inset-0 h-full w-full flex flex-col justify-between"
          >
            <div className="w-full px-4 pt-4 pb-2 border-b border-stone-900 flex justify-between items-center bg-[#09070f]/90 z-20">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={() => { playBeep(); setActiveScreen('hub'); }} />
                <h2 className="text-xs font-black uppercase tracking-wider font-mono">Descargas Locales</h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 scrollable-y w-full px-4 py-4 space-y-4 pb-24 z-10">
              <div className="cyber-card rounded-[22px] p-4 flex items-center justify-between border border-stone-850">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5" style={{ color: currentThemeObj.secondary }} />
                  <div className="leading-tight">
                    <p className="text-[8px] text-stone-500 font-bold uppercase font-mono">Espacio de Almacenamiento</p>
                    <p className="text-xs font-black font-mono">
                      {downloadedGameIds.length * 1.1} MB usados / 512 MB disponibles
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {games.filter(g => downloadedGameIds.includes(g.id)).map((p) => (
                  <div
                    key={p.id}
                    className="cyber-card rounded-[20px] p-3 flex items-center justify-between gap-3 border border-stone-900"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span dangerouslySetInnerHTML={{ __html: p.icon_svg }} className="bg-stone-900 w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: currentThemeObj.primary }} />
                      <div className="min-w-0 leading-tight">
                        <h4 className="text-xs font-extrabold truncate">{p.name}</h4>
                        <p className="text-[8px] text-stone-500 font-bold font-mono mt-0.5">
                          Peso: {p.download_size} · Listo Offline
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          playBeep(520, 0.1);
                          setPlayingGameId(p.id);
                          setActiveScreen('game');
                        }}
                        className="p-2 rounded-lg text-white font-bold"
                        style={{ background: `linear-gradient(135deg, ${currentThemeObj.primary}, ${currentThemeObj.secondary})` }}
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button onClick={() => handleDeleteGame(p.id)} className="p-2 rounded-lg bg-red-950/20 border border-red-900/20 text-red-500">
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
                      <p className="text-xs text-stone-500 max-w-[200px] mx-auto mt-1 leading-normal">
                        Descarga tus juegos favoritos del catálogo en la portada del Hub.
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                className="px-3.5 py-1.5 rounded-full bg-black/60 border border-stone-800 hover:border-stone-700 text-xs font-bold flex items-center gap-1 text-white font-mono"
              >
                <ArrowLeft className="w-4 h-4" /> Salir del Hub
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black tracking-wider uppercase bg-stone-900 border border-stone-800 px-3.5 py-1 rounded-full text-white">
                  {playingGameId === 'pong-neo' ? '🏓 Pong Neo' : playingGameId === 'cosmic-snake' ? '🐍 Snake' : '🚀 Meteor Storm'}
                </span>
                {peerConnected && playingGameId === 'pong-neo' && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full text-stone-950 animate-pulse uppercase font-mono" style={{ backgroundColor: currentThemeObj.primary }}>
                    👥 WiFi Sync
                  </span>
                )}
              </div>
            </div>

            {/* Game Canvas Container */}
            <div className="flex-1 w-full flex items-center justify-center relative bg-stone-950 overflow-hidden select-none no-touch-actions">
              
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
        
        {/* INTERACTIVE INCOMING REQUEST POPUP (ZAPYA STYLE ACCEPT INVITATION!) */}
        {incomingInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-touch-actions">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/85" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs bg-[#120e1e] border-2 rounded-[32px] p-6 text-center space-y-4 z-10 shadow-2xl"
              style={{ borderColor: currentThemeObj.primary }}
            >
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-xl animate-bounce">
                🤝
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">Invitación WiFi Sync</h3>
                <p className="text-xs text-stone-300 leading-snug">
                  <span className="font-black text-white">{incomingInvite.fromTag}</span> quiere sincronizar sus juegos y pantallas contigo.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={rejectIncomingInvite}
                  className="flex-1 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-bold text-xs"
                >
                  Rechazar
                </button>
                <button
                  onClick={acceptIncomingInvite}
                  className="flex-1 py-2 rounded-xl text-stone-950 font-black text-xs shadow-md"
                  style={{ backgroundColor: currentThemeObj.primary }}
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL: CREATE GROUP (HOST VIEW WITH QR CODE & PIN) */}
        {zapyaModal === 'create_group' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-touch-actions">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={disconnectSync} className="absolute inset-0 bg-black" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#120e1e] border border-stone-800 rounded-[32px] p-6 text-center space-y-5 z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-900">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">Crear Grupo de Juego</span>
                <button onClick={disconnectSync} className="p-1 rounded-full hover:bg-stone-850"><X className="w-4 h-4 text-stone-500" /></button>
              </div>

              {/* Glowing QR CODE */}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-touch-actions">
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
                    className="w-full max-w-[200px] px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-center text-xl font-black placeholder-stone-700 focus:outline-none focus:border-[#a855f7] font-mono tracking-widest text-white"
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

      {/* Strict Fixed Navigation Bar at the Bottom */}
      {activeScreen !== 'loading' && activeScreen !== 'game' && (
        <div className="w-full px-4 pb-4 pt-1 bg-gradient-to-t from-[#09070f] via-[#09070f]/90 to-transparent z-20">
          <div className="max-w-md mx-auto rounded-[24px] bg-[#120e1e]/85 backdrop-filter blur-md border border-stone-850 p-2 flex justify-around items-center shadow-2xl">
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

// ═══════════════════════════════════════════════
// GAME COMPONENT 1: PIXEL PONG NEO (CRASH-PROOF)
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

    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 300);

    const paddleWidth = 12;
    const paddleHeight = 65;
    const ballRadius = 7;

    let p1Y = height / 2 - paddleHeight / 2;
    let p2Y = height / 2 - paddleHeight / 2;

    let ballX = width / 2;
    let ballY = height / 2;
    let ballSpeedX = 3.5 * (Math.random() > 0.5 ? 1 : -1);
    let ballSpeedY = (Math.random() * 2 - 1) * 2.5;

    let localScore1 = 0;
    let localScore2 = 0;

    const handleMove = (y: number) => {
      p1Y = y - paddleHeight / 2;
      if (p1Y < 0) p1Y = 0;
      if (p1Y > height - paddleHeight) p1Y = height - paddleHeight;

      if (peerConnected && Math.abs(p1Y - lastSentYRef.current) > 2) {
        lastSentYRef.current = p1Y;
        const event = new CustomEvent('ludus-local-broadcast', {
          detail: { p1Y: p1Y / height, score1: localScore1, score2: localScore2 }
        });
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

      // Central line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // AI movement
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
        ballSpeedX *= 1.04;
        ballSpeedY = (ballY - (p1Y + paddleHeight / 2)) * 0.15;
      }

      if (ballX + ballRadius > width - paddleWidth && ballY > p2Y && ballY < p2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        ballX = width - paddleWidth - ballRadius;
        ballSpeedX *= 1.04;
        ballSpeedY = (ballY - (p2Y + paddleHeight / 2)) * 0.15;
      }

      if (ballX < 0) {
        localScore2++;
        setP2Score(localScore2);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = -3.5;
        ballSpeedY = (Math.random() * 2 - 1) * 2.5;
      }

      if (ballX > width) {
        localScore1++;
        setP1Score(localScore1);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = 3.5;
        ballSpeedY = (Math.random() * 2 - 1) * 2.5;
      }

      // Draw paddles with glowing neon
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(0, p1Y, paddleWidth, paddleHeight);

      ctx.fillStyle = '#a855f7';
      ctx.fillRect(width - paddleWidth, p2Y, paddleWidth, paddleHeight);

      // Draw Ball
      ctx.fillStyle = '#e5b31c';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

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
    <div className="w-full h-full max-w-xl max-h-[75vh] flex flex-col justify-center items-center px-4 space-y-3.5 no-touch-actions">
      <div className="flex justify-between w-full font-mono text-[10px] font-black tracking-widest text-[#06b6d4]">
        <div>
          <p>PLAYER (TÚ)</p>
          <p className="text-2xl font-black text-white">{p1Score}</p>
        </div>
        <div className="text-right">
          <p>{peerConnected ? peerGamerTag.toUpperCase() : 'IA BOT'}</p>
          <p className="text-2xl font-black text-[#a855f7]">{p2Score}</p>
        </div>
      </div>

      <div className="w-full h-80 relative border border-stone-850 rounded-[28px] overflow-hidden bg-stone-950/40">
        <canvas ref={canvasRef} className="w-full h-full cursor-none" />
      </div>

      <p className="text-[9px] text-stone-500 text-center font-bold uppercase tracking-wider font-mono">
        Desliza en la pantalla para mover tu pala cian
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME COMPONENT 2: COSMIC SNAKE (CRASH-PROOF)
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

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
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
      ctx.fillRect(apple.x + 2, apple.y + 2, grid - 4, grid - 4);

      snake.forEach((s, idx) => {
        ctx.fillStyle = idx === 0 ? '#06b6d4' : '#a855f7';
        ctx.fillRect(s.x + 1, s.y + 1, grid - 2, grid - 2);
      });

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
    <div className="w-full h-full max-w-md flex flex-col justify-center items-center px-4 space-y-3.5 no-touch-actions">
      <div className="flex justify-between w-full font-mono text-[10px] font-bold text-[#a855f7] tracking-wider">
        <span>SCORE: <span className="text-white text-lg font-black">{score}</span></span>
        <span>HIGHSCORE: <span className="text-[#06b6d4] text-lg font-black">{highScore}</span></span>
      </div>

      <div className="relative border border-stone-850 rounded-[28px] overflow-hidden aspect-square w-full max-w-[280px]">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center space-y-3">
            <p className="text-sm font-black tracking-widest text-[#a855f7] uppercase font-mono">GAME OVER</p>
            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-stone-950 text-[10px] font-black uppercase tracking-wider shadow"
            >
              Reiniciar
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-[180px] flex flex-col items-center gap-1 py-1 shrink-0">
        <button
          onClick={() => handleArrow('UP')}
          className="w-11 h-9 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-xs font-bold text-white shadow"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => handleArrow('LEFT')}
            className="w-11 h-9 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-xs font-bold text-white shadow"
          >
            ◀
          </button>
          <div className="w-11 h-9" />
          <button
            onClick={() => handleArrow('RIGHT')}
            className="w-11 h-9 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-xs font-bold text-white shadow"
          >
            ▶
          </button>
        </div>
        <button
          onClick={() => handleArrow('DOWN')}
          className="w-11 h-9 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#06b6d4] active:scale-95 transition-transform flex items-center justify-center text-xs font-bold text-white shadow"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// GAME COMPONENT 3: METEOR STORM (100% CRASH-PROOF)
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
    const height = (canvas.height = 340);

    let shipX = width / 2;
    const shipY = height - 25;
    const shipWidth = 22;

    interface Meteor { x: number; y: number; size: number; speed: number; }
    interface Laser { x: number; y: number; }

    let meteors: Meteor[] = [];
    let lasers: Laser[] = [];

    let currentScore = 0;
    let localGameOver = false;

    let nextMeteorFrame = 0;
    let shootCooldown = 0;

    const spawnMeteor = () => {
      const size = 10 + Math.random() * 14;
      meteors.push({
        x: Math.random() * (width - size),
        y: -size,
        size,
        speed: 1.4 + Math.random() * 1.8
      });
    };

    let frameId: number;

    const gameLoop = () => {
      if (localGameOver) return;

      // Clear Screen
      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, width, height);

      // Star Particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }

      // Movement
      const keys = keysPressedRef.current;
      if (keys.left) shipX -= 3.2;
      if (keys.right) shipX += 3.2;

      if (shipX < shipWidth) shipX = shipWidth;
      if (shipX > width - shipWidth) shipX = width - shipWidth;

      // Laser Shoot
      if (keys.shoot && shootCooldown <= 0) {
        lasers.push({ x: shipX, y: shipY - 8 });
        shootCooldown = 15;
      }
      if (shootCooldown > 0) shootCooldown--;

      // Move lasers
      lasers.forEach(l => {
        l.y -= 5;
      });

      // Spawn meteors
      if (nextMeteorFrame <= 0) {
        spawnMeteor();
        nextMeteorFrame = 35 + Math.random() * 25;
      }
      nextMeteorFrame--;

      // Move meteors
      meteors.forEach(m => {
        m.y += m.speed;
      });

      // Ship Collision Check
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        const dist = Math.hypot(m.x - shipX, m.y - shipY);
        if (dist < m.size + shipWidth / 2) {
          localGameOver = true;
          setGameOver(true);
          return;
        }
      }

      // CRASH-PROOF COLLISION CHECKING (NO SPLICES INSIDE FOREACH!)
      const hitMeteorIndices = new Set<number>();
      const hitLaserIndices = new Set<number>();

      meteors.forEach((m, mIdx) => {
        lasers.forEach((l, lIdx) => {
          const dist = Math.hypot(m.x - l.x, m.y - l.y);
          if (dist < m.size) {
            hitMeteorIndices.add(mIdx);
            hitLaserIndices.add(lIdx);
            currentScore += 15;
          }
        });
      });

      if (hitMeteorIndices.size > 0) {
        setScore(currentScore);
        if (currentScore > highScore) setHighScore(currentScore);
      }

      // Filter arrays cleanly
      meteors = meteors.filter((m, mIdx) => !hitMeteorIndices.has(mIdx) && m.y <= height + m.size);
      lasers = lasers.filter((l, lIdx) => !hitLaserIndices.has(lIdx) && l.y > 0);

      // Draw Lasers
      ctx.fillStyle = '#06b6d4';
      lasers.forEach(l => {
        ctx.fillRect(l.x - 1, l.y, 2, 8);
      });

      // Draw Meteors
      ctx.fillStyle = '#a855f7';
      meteors.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Spaceship
      ctx.fillStyle = '#e5b31c';
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 10);
      ctx.lineTo(shipX - shipWidth / 2, shipY + 8);
      ctx.lineTo(shipX + shipWidth / 2, shipY + 8);
      ctx.closePath();
      ctx.fill();

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
    <div className="w-full h-full max-w-md flex flex-col justify-center items-center px-4 space-y-3.5 no-touch-actions">
      <div className="flex justify-between w-full font-mono text-[10px] font-bold text-[#e5b31c] tracking-wider">
        <span>SCORE: <span className="text-white text-lg font-black">{score}</span></span>
        <span>HIGHSCORE: <span className="text-[#06b6d4] text-lg font-black">{highScore}</span></span>
      </div>

      <div className="relative border border-stone-850 rounded-[28px] overflow-hidden w-full max-w-[280px] h-[340px] bg-stone-950/40">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center space-y-3">
            <p className="text-sm font-mono font-black text-cyan-400 uppercase tracking-widest">MISSION FAILED</p>
            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#d946ef] text-white text-[10px] font-black uppercase tracking-wider shadow"
            >
              Reiniciar
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-[260px] flex justify-between items-center py-2 shrink-0">
        <div className="flex gap-2">
          <button
            onTouchStart={() => setKey('left', true)}
            onTouchEnd={() => setKey('left', false)}
            onMouseDown={() => setKey('left', true)}
            onMouseUp={() => setKey('left', false)}
            onMouseLeave={() => setKey('left', false)}
            className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-800 text-sm font-bold text-white select-none active:scale-95 transition-transform"
          >
            ◀
          </button>
          <button
            onTouchStart={() => setKey('right', true)}
            onTouchEnd={() => setKey('right', false)}
            onMouseDown={() => setKey('right', true)}
            onMouseUp={() => setKey('right', false)}
            onMouseLeave={() => setKey('right', false)}
            className="w-11 h-11 rounded-xl bg-stone-900 border border-stone-800 text-sm font-bold text-white select-none active:scale-95 transition-transform"
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
          className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-black text-[10px] shadow-lg active:scale-95 select-none font-mono"
        >
          FUEGO
        </button>
      </div>
    </div>
  );
}

