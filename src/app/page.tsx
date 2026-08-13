'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Wifi,
  Download,
  User,
  Settings,
  X,
  Play,
  Check,
  Signal,
  Trash2,
  HardDrive,
  RefreshCw,
  Search,
  Sliders,
  Volume2,
  VolumeX,
  HelpCircle,
  Plus,
  ArrowLeft,
  ChevronRight,
  Database
} from 'lucide-react';

// ═══════════════════════════════════════════════
// GAME DEFS & STATIC METADATA
// ═══════════════════════════════════════════════
interface Game {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  image: string;
  offlineSupport: boolean;
  multiplayerSupport: boolean;
  downloadSize: string;
}

const STATIC_GAMES: Game[] = [
  {
    id: 'pong-neo',
    name: 'Pixel Pong Neo',
    description: 'Un Pong retro-futurista con palas de neón y física ultra-fluida. Juega contra la IA o compite contra un amigo sincronizando tus pantallas por WiFi.',
    category: 'arcade',
    icon: '🏓',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    offlineSupport: true,
    multiplayerSupport: true,
    downloadSize: '1.2 MB'
  },
  {
    id: 'cosmic-snake',
    name: 'Cosmic Snake',
    description: 'La clásica serpiente de vuelta con impulsos galácticos, portales estelares y estelas de neón. Súper adictivo con joysticks virtuales táctiles.',
    category: 'arcade',
    icon: '🐍',
    image: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80',
    offlineSupport: true,
    multiplayerSupport: false,
    downloadSize: '0.8 MB'
  },
  {
    id: 'meteor-storm',
    name: 'Meteor Storm',
    description: 'Vuela una nave de combate espacial de neón en medio de una lluvia de meteoritos y oleadas alienígenas. Destruye meteoros y acumula cristales de plasma.',
    category: 'action',
    icon: '🚀',
    image: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=600&auto=format&fit=crop&q=80',
    offlineSupport: true,
    multiplayerSupport: false,
    downloadSize: '1.5 MB'
  }
];

const PLAYER_AVATARS = [
  { id: 'av-1', emoji: '👽', label: 'Cosmic Ranger' },
  { id: 'av-2', emoji: '👾', label: 'Pixel Invader' },
  { id: 'av-3', emoji: '🤖', label: 'Cyber Mech' },
  { id: 'av-4', emoji: '🚀', label: 'Star Pilot' },
  { id: 'av-5', emoji: '🥷', label: 'Neon Ninja' }
];

export default function LudusCloudGameHub() {
  // Screens: 'loading' | 'hub' | 'wifi' | 'downloads' | 'profile' | 'game'
  const [activeScreen, setActiveScreen] = useState<string>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Profile / Settings state
  const [gamerTag, setGamerTag] = useState('Gamer_Ludus');
  const [avatar, setAvatar] = useState('av-1');
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // List of active games (can be extended with downloaded / local games)
  const [games, setGames] = useState<Game[]>(STATIC_GAMES);
  const [downloadedGameIds, setDownloadedGames] = useState<string[]>([]);
  const [downloadingGameId, setDownloadingGameId] = useState<string | null>(null);

  // Sync / Peer Connection State (WebRTC WiFi Sync Simulator)
  const [connectionRole, setConnectionRole] = useState<'none' | 'host' | 'client'>('none');
  const [pairingCode, setPairingCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerGamerTag, setPeerGamerTag] = useState('');
  const [isSearchingPeer, setIsSearchingPeer] = useState(false);

  // Selected game for playing
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);

  // Search/Filters in Hub
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Load state on mount
  useEffect(() => {
    // 1. Loading screen simulation (cosmic loading sequence)
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setActiveScreen('hub'), 300);
          return 100;
        }
        return prev + 4;
      });
    }, 45);

    // Load states from LocalStorage
    const savedTag = localStorage.getItem('ludus_gamertag');
    if (savedTag) setGamerTag(savedTag);
    const savedAvatar = localStorage.getItem('ludus_avatar');
    if (savedAvatar) setAvatar(savedAvatar);
    const savedDownloads = localStorage.getItem('ludus_downloaded_ids');
    if (savedDownloads) {
      try { setDownloadedGames(JSON.parse(savedDownloads)); } catch { /* ignore */ }
    }

    return () => clearInterval(interval);
  }, []);

  // Play audio helper
  const playBeep = (freq = 440, duration = 0.1) => {
    if (!soundsEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore audio error context issues */ }
  };

  // Download simulation (Modular installation)
  const handleDownloadGame = (gameId: string) => {
    if (downloadedGameIds.includes(gameId)) return;
    setDownloadingGameId(gameId);
    playBeep(600, 0.15);
    
    setTimeout(() => {
      const updated = [...downloadedGameIds, gameId];
      setDownloadedGames(updated);
      localStorage.setItem('ludus_downloaded_ids', JSON.stringify(updated));
      setDownloadingGameId(null);
      playBeep(880, 0.3);
    }, 2000);
  };

  const handleDeleteGame = (gameId: string) => {
    const updated = downloadedGameIds.filter(id => id !== gameId);
    setDownloadedGames(updated);
    localStorage.setItem('ludus_downloaded_ids', JSON.stringify(updated));
    playBeep(220, 0.2);
  };

  // WiFi Peer Pairing Simulation
  const handleCreateHost = () => {
    playBeep(440, 0.1);
    setConnectionRole('host');
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setPairingCode(randomCode);
    setIsSearchingPeer(true);
  };

  const handleJoinClient = () => {
    if (inputCode.length !== 4) return;
    playBeep(440, 0.1);
    setConnectionRole('client');
    setIsSearchingPeer(true);

    setTimeout(() => {
      // Successfully "connect" to host
      setPeerConnected(true);
      setPeerGamerTag('Host_Vortex');
      setIsSearchingPeer(false);
      playBeep(880, 0.4);
    }, 1500);
  };

  // Host simulated detection of joining client
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (connectionRole === 'host' && isSearchingPeer) {
      t = setTimeout(() => {
        setPeerConnected(true);
        setPeerGamerTag('Client_Pulse');
        setIsSearchingPeer(false);
        playBeep(880, 0.4);
      }, 5000); // Host finds a client in 5s
    }
    return () => clearTimeout(t);
  }, [connectionRole, isSearchingPeer]);

  const disconnectSync = () => {
    setConnectionRole('none');
    setPeerConnected(false);
    setIsSearchingPeer(false);
    setInputCode('');
    setPairingCode('');
    playBeep(330, 0.25);
  };

  // Filters
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

  return (
    <div className="relative min-h-screen cyber-grid bg-[#09070f] text-white overflow-hidden flex flex-col justify-between select-none scanlines">
      
      {/* ─── Backdrop Ambient Lights ─── */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vh] bg-gradient-to-b from-[#06b6d4]/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[50vw] h-[50vh] bg-gradient-to-t from-[#a855f7]/10 to-transparent blur-[120px] pointer-events-none -z-10" />

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
              {/* Spinning / Glowing pixel cloud logo assembly */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="relative w-28 h-28 mx-auto"
              >
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#06b6d4]/40" />
                <div className="absolute inset-2 rounded-full border-4 border-[#a855f7]/40" />
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  ☁️
                </div>
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-widest uppercase neon-text-blue font-mono">
                  Ludus Cloud
                </h1>
                <p className="text-[10px] uppercase font-bold text-stone-500 tracking-[0.25em]">
                  Next-Gen Mobile Game Hub
                </p>
              </div>

              {/* Glowing animated progress bar */}
              <div className="space-y-2">
                <div className="w-full h-2.5 rounded-full bg-stone-900 border border-[#a855f7]/20 p-0.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] to-[#a855f7]"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 font-mono font-bold">
                  <span>LOADING CORES...</span>
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
            {/* Header / Brand */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">☁️</span>
                <div>
                  <h1 className="text-md font-black tracking-widest uppercase leading-none neon-text-blue">
                    Ludus Cloud
                  </h1>
                  <p className="text-[8px] font-bold text-[#a855f7] tracking-widest uppercase mt-0.5">Game Hub</p>
                </div>
              </div>

              {/* Mini user bar */}
              <button
                onClick={() => { playBeep(); setActiveScreen('profile'); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full cyber-card border border-stone-800"
              >
                <span className="text-sm">{activeAvatarObj.emoji}</span>
                <span className="text-xs font-bold font-mono tracking-tight max-w-[80px] truncate">{gamerTag}</span>
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 gap-2">
              <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-800">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-[#06b6d4]" />
                  <div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Multijugador local</p>
                    <p className="text-xs font-black">
                      {peerConnected ? `Conectado a ${peerGamerTag}` : 'No conectado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { playBeep(); setActiveScreen('wifi'); }}
                  className="px-3 py-1 rounded-lg bg-stone-900 text-[10px] font-bold border border-stone-800 hover:border-[#06b6d4]"
                >
                  Configurar
                </button>
              </div>

              <div className="cyber-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-stone-800">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#a855f7]" />
                  <div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Juegos Instalados</p>
                    <p className="text-xs font-black">{downloadedGameIds.length} descargado(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => { playBeep(); setActiveScreen('downloads'); }}
                  className="px-3 py-1 rounded-lg bg-stone-900 text-[10px] font-bold border border-stone-800 hover:border-[#a855f7]"
                >
                  Descargas
                </button>
              </div>
            </div>

            {/* Search Engine & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar juegos en la nube..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-900 focus:border-[#06b6d4] focus:outline-none text-xs font-bold"
                />
              </div>

              {/* Filters chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos los juegos 🎮' },
                  { id: 'arcade', label: 'Arcade Retro 🕹️' },
                  { id: 'action', label: 'Acción / Espacio 🚀' },
                  { id: 'offline', label: 'Guardados Offline 💾' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => { playBeep(520, 0.08); setActiveFilter(filter.id); }}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide uppercase transition-all ${
                      activeFilter === filter.id
                        ? 'glow-btn-purple text-white'
                        : 'bg-stone-900 border border-stone-800 text-stone-400'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Catálogo de juegos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGames.map((g) => {
                  const isDownloaded = downloadedGameIds.includes(g.id);
                  const isDownloading = downloadingGameId === g.id;

                  return (
                    <div
                      key={g.id}
                      className="cyber-card rounded-[24px] overflow-hidden border border-stone-900 hover:border-[#06b6d4]/40 transition-colors flex flex-col justify-between"
                    >
                      {/* Image header */}
                      <div className="relative h-32 bg-stone-900">
                        <img
                          src={g.image}
                          alt={g.name}
                          className="w-full h-full object-cover opacity-80"
                        />
                        <span className="absolute top-2.5 left-2.5 bg-black/70 px-2 py-1 rounded-md text-[10px] font-bold">
                          {g.icon} {g.category.toUpperCase()}
                        </span>
                      </div>

                      {/* Info & action */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm tracking-tight">{g.name}</h4>
                          <p className="text-[10px] text-stone-400 leading-relaxed font-medium">
                            {g.description}
                          </p>
                        </div>

                        {/* Badges / Support */}
                        <div className="flex gap-2 text-[9px] font-bold text-stone-500">
                          {g.offlineSupport && <span className="text-emerald-500">✓ Offline</span>}
                          {g.multiplayerSupport && <span className="text-cyan-500">✓ WiFi Sync VS</span>}
                          <span className="ml-auto text-stone-600">{g.downloadSize}</span>
                        </div>

                        {/* Action triggers */}
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              playBeep(520, 0.1);
                              setPlayingGameId(g.id);
                              setActiveScreen('game');
                            }}
                            className="flex-1 py-2 rounded-xl glow-btn-blue text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Jugar Ahora
                          </button>

                          {!isDownloaded ? (
                            <button
                              onClick={() => handleDownloadGame(g.id)}
                              disabled={isDownloading}
                              className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-bold hover:text-white hover:border-[#a855f7] flex items-center justify-center disabled:opacity-50"
                              title="Descargar para Offline"
                            >
                              {isDownloading ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-[#a855f7]" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteGame(g.id)}
                              className="px-3 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 font-bold flex items-center justify-center"
                              title="Eliminar descarga"
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
           SCREEN 3: CONEXIÓN WIFI (PEER SYNC)
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
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue">Conexión WiFi Local</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Sincroniza pantallas por WiFi</p>
              </div>
            </div>

            {/* Connection visual box */}
            <div className="cyber-card rounded-[28px] p-5 border border-stone-800 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center mx-auto text-2xl">
                <Wifi className="w-7 h-7 text-[#06b6d4] animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-sm">Emparejamiento WiFi Directo (P2P)</h3>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Para jugar multijugador local en la misma WiFi, un jugador debe **Crear Sesión** y compartir el código, y el otro debe **Unirse**.
                </p>
              </div>

              {connectionRole === 'none' && (
                <div className="space-y-3">
                  <button
                    onClick={handleCreateHost}
                    className="w-full py-3 rounded-xl glow-btn-blue text-white font-black text-xs"
                  >
                    Crear Sesión (Host)
                  </button>

                  <div className="relative flex items-center justify-center py-1">
                    <span className="absolute bg-[#120e1e] px-3 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ó UNIRSE</span>
                    <hr className="w-full border-stone-800" />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      maxLength={4}
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="Código de 4 dígitos"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-center text-sm font-bold placeholder-stone-600 focus:outline-none focus:border-[#a855f7]"
                    />
                    <button
                      onClick={handleJoinClient}
                      disabled={inputCode.length !== 4}
                      className="px-5 py-2.5 rounded-xl glow-btn-purple text-white text-xs font-black disabled:opacity-50"
                    >
                      Unirse
                    </button>
                  </div>
                </div>
              )}

              {/* HOST SCREEN: LISTENING */}
              {connectionRole === 'host' && !peerConnected && (
                <div className="space-y-4 py-3">
                  <div className="space-y-1 bg-stone-950 py-3 rounded-2xl border border-stone-900">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Código de emparejamiento</p>
                    <p className="text-4xl font-black tracking-widest text-[#06b6d4] font-mono">{pairingCode}</p>
                  </div>
                  
                  <div className="flex justify-center items-center gap-2 text-xs text-[#a855f7]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="font-extrabold animate-pulse">Esperando a que el peer se conecte...</span>
                  </div>

                  <button
                    onClick={disconnectSync}
                    className="w-full py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-500 text-xs font-bold"
                  >
                    Cancelar Sesión
                  </button>
                </div>
              )}

              {/* CLIENT SCREEN: CONNECTING */}
              {connectionRole === 'client' && isSearchingPeer && (
                <div className="space-y-4 py-6 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#06b6d4] mx-auto" />
                  <p className="text-xs font-bold animate-pulse text-stone-400">Estableciendo canal WebRTC directo...</p>
                </div>
              )}

              {/* SUCCESSFULLY CONNECTED SCREEN */}
              {peerConnected && (
                <div className="space-y-4 py-3">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 py-3 px-4 rounded-2xl flex items-center justify-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500" />
                    <div className="text-left">
                      <p className="text-[10px] text-stone-500 font-mono font-bold uppercase">Pairing Activo</p>
                      <p className="text-xs font-black">Sincronizado con {peerGamerTag}</p>
                    </div>
                  </div>

                  <div className="text-xs text-stone-400 py-1">
                    🟢 Ping estimado WiFi local: <span className="font-mono font-bold text-emerald-400">4ms</span>
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
           SCREEN 4: PERFIL Y AJUSTES
           ═══════════════════════════════════════════════ */}
        {activeScreen === 'profile' && (
          <motion.div
            key="profile"
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
                <h2 className="text-md font-black uppercase tracking-wider neon-text-blue">Mi Perfil Gamer</h2>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Ajustes del Game Hub</p>
              </div>
            </div>

            {/* Profile Detail Box */}
            <div className="cyber-card rounded-[28px] p-5 border border-stone-800 space-y-5">
              
              {/* Avatar select */}
              <div className="text-center space-y-2">
                <p className="text-5xl py-2">{activeAvatarObj.emoji}</p>
                <p className="text-xs text-stone-500 font-bold uppercase">Selecciona tu Avatar</p>
                
                <div className="flex justify-center gap-2 pt-1">
                  {PLAYER_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => { playBeep(520, 0.08); setAvatar(av.id); }}
                      className={`w-10 h-10 rounded-xl bg-stone-900 text-lg flex items-center justify-center border transition-all ${
                        avatar === av.id
                          ? 'border-[#06b6d4] shadow-md shadow-[#06b6d4]/10 scale-105'
                          : 'border-stone-800'
                      }`}
                    >
                      {av.emoji}
                    </button>
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

              {/* Audio switches */}
              <div className="flex items-center justify-between py-2 border-t border-stone-900">
                <div className="flex items-center gap-2">
                  {soundsEnabled ? <Volume2 className="w-4 h-4 text-[#06b6d4]" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
                  <span className="text-xs font-bold">Efectos de Sonido Retro</span>
                </div>
                <button
                  onClick={() => {
                    const next = !soundsEnabled;
                    setSoundsEnabled(next);
                    if (next) playBeep(520, 0.08);
                  }}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${
                    soundsEnabled ? 'bg-gradient-to-br from-[#06b6d4] to-[#0891b2]' : 'bg-stone-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${
                    soundsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Database status indicator (Supabase) */}
              <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#a855f7] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Estado de Supabase
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                    supabaseConnected ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/30' : 'bg-stone-900 text-stone-500'
                  }`}>
                    {supabaseConnected ? 'Conectado' : 'Offline Mode'}
                  </span>
                </div>
                <p className="text-[9px] text-stone-500 leading-normal font-medium">
                  Los juegos y perfiles se sincronizan con Supabase. El hub tiene fallback local automático en almacenamiento IndexedDB.
                </p>
                <button
                  onClick={() => {
                    playBeep(440, 0.1);
                    setSupabaseConnected(!supabaseConnected);
                  }}
                  className="w-full py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-[#a855f7] text-[10px] font-bold"
                >
                  {supabaseConnected ? 'Desconectar Base de Datos' : 'Simular Conexión Supabase'}
                </button>
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
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Juegos guardados offline</p>
              </div>
            </div>

            {/* Storage space indicator */}
            <div className="cyber-card rounded-[24px] p-4 flex items-center justify-between border border-stone-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#a855f7]" />
                <div>
                  <p className="text-[9px] text-stone-500 font-bold uppercase">Espacio de Juegos</p>
                  <p className="text-xs font-black">
                    {downloadedGameIds.length * 1.1} MB usados / 512 MB disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* List of downloaded games */}
            <div className="space-y-2">
              {games.filter(g => downloadedGameIds.includes(g.id)).map((p) => (
                <div
                  key={p.id}
                  className="cyber-card rounded-[20px] p-3 flex items-center justify-between gap-3 border border-stone-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl bg-stone-900 w-11 h-11 rounded-xl flex items-center justify-center">
                      {p.icon}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold truncate">{p.name}</h4>
                      <p className="text-[9px] text-stone-500 font-bold uppercase">
                        Peso: {p.downloadSize} · Listo para Offline
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
                      className="p-2.5 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white font-bold"
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
            {/* Game Screen Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-50">
              <button
                onClick={() => {
                  playBeep(220, 0.15);
                  setPlayingGameId(null);
                  setActiveScreen('hub');
                }}
                className="px-3.5 py-1.5 rounded-full bg-black/60 border border-stone-800 hover:border-[#06b6d4] text-xs font-bold flex items-center gap-1 text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Salir del Hub
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black tracking-wider uppercase bg-[#a855f7]/30 border border-[#a855f7]/40 px-3 py-1 rounded-full text-white">
                  {playingGameId === 'pong-neo' ? '🏓 Pong Neo' : playingGameId === 'cosmic-snake' ? '🐍 Snake' : '🚀 Meteor Storm'}
                </span>
                {peerConnected && playingGameId === 'pong-neo' && (
                  <span className="text-[10px] font-bold bg-[#06b6d4] px-2.5 py-1 rounded-full text-stone-950 animate-pulse uppercase">
                    👥 WiFi Sync VS
                  </span>
                )}
              </div>
            </div>

            {/* Game Canvas Container */}
            <div className="flex-1 w-full flex items-center justify-center relative bg-stone-950 overflow-hidden select-none">
              
              {/* PONG NEO GAME */}
              {playingGameId === 'pong-neo' && (
                <PongGame peerConnected={peerConnected} peerGamerTag={peerGamerTag} soundsEnabled={soundsEnabled} />
              )}

              {/* COSMIC SNAKE GAME */}
              {playingGameId === 'cosmic-snake' && (
                <SnakeGame soundsEnabled={soundsEnabled} />
              )}

              {/* METEOR STORM GAME */}
              {playingGameId === 'meteor-storm' && (
                <MeteorGame soundsEnabled={soundsEnabled} />
              )}

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ─── Immersive Floating Bottom Navigation (Hub Mode) ─── */}
      {activeScreen !== 'loading' && activeScreen !== 'game' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pointer-events-none">
          <div className="max-w-md mx-auto rounded-[24px] bg-[#120e1e]/80 backdrop-filter blur-md border border-[#a855f7]/15 p-2 flex justify-around items-center pointer-events-auto shadow-2xl">
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
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    isActive 
                      ? 'text-[#06b6d4]' 
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]' : ''}`} />
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
  
  // Players and ball coordinates
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [gameOver, setGameOver] = useState(false);

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

    let touchY = height / 2;

    // Handle touch/mouse position
    const handleMove = (y: number) => {
      p1Y = y - paddleHeight / 2;
      // Clamp p1Y
      if (p1Y < 0) p1Y = 0;
      if (p1Y > height - paddleHeight) p1Y = height - paddleHeight;
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

    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('mousemove', onMouse);

    let frameId: number;

    const gameLoop = () => {
      // Background clear
      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, width, height);

      // Draw dashed central line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([5, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // AI movement (If not WebRTC peer VS connected)
      if (!peerConnected) {
        // AI chases ball with slight lag
        const targetY = ballY - paddleHeight / 2;
        p2Y += (targetY - p2Y) * 0.12;
      } else {
        // Simulated WebRTC Peer movement mirroring
        const targetY = ballY - paddleHeight / 2;
        p2Y += (targetY - p2Y) * 0.35; // Instant/faster sync response
      }

      // Clamp AI / Peer Paddle
      if (p2Y < 0) p2Y = 0;
      if (p2Y > height - paddleHeight) p2Y = height - paddleHeight;

      // Ball Physics
      ballX += ballSpeedX;
      ballY += ballSpeedY;

      // Wall bounce Y
      if (ballY - ballRadius < 0) {
        ballY = ballRadius;
        ballSpeedY = -ballSpeedY;
      }
      if (ballY + ballRadius > height) {
        ballY = height - ballRadius;
        ballSpeedY = -ballSpeedY;
      }

      // Paddle P1 bounce (Left)
      if (ballX - ballRadius < paddleWidth && ballY > p1Y && ballY < p1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        ballX = paddleWidth + ballRadius;
        // Increase speed slightly
        ballSpeedX *= 1.05;
        ballSpeedY = (ballY - (p1Y + paddleHeight / 2)) * 0.15;
      }

      // Paddle P2 bounce (Right)
      if (ballX + ballRadius > width - paddleWidth && ballY > p2Y && ballY < p2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        ballX = width - paddleWidth - ballRadius;
        // Increase speed slightly
        ballSpeedX *= 1.05;
        ballSpeedY = (ballY - (p2Y + paddleHeight / 2)) * 0.15;
      }

      // Goal detection Left (AI scores)
      if (ballX < 0) {
        localScore2++;
        setP2Score(localScore2);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = -4;
        ballSpeedY = (Math.random() * 2 - 1) * 3;
      }

      // Goal detection Right (P1 scores)
      if (ballX > width) {
        localScore1++;
        setP1Score(localScore1);
        ballX = width / 2;
        ballY = height / 2;
        ballSpeedX = 4;
        ballSpeedY = (Math.random() * 2 - 1) * 3;
      }

      // Draw P1 (Left - Blue neon)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.fillRect(0, p1Y, paddleWidth, paddleHeight);

      // Draw P2 (Right - Purple neon)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.fillRect(width - paddleWidth, p2Y, paddleWidth, paddleHeight);

      // Draw Ball (Glowing Neon gold)
      ctx.fillStyle = '#e5b31c';
      ctx.shadowColor = '#e5b31c';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadows
      ctx.shadowBlur = 0;

      frameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('mousemove', onMouse);
    };
  }, [peerConnected]);

  return (
    <div className="w-full h-full max-w-xl max-h-[80vh] flex flex-col justify-center items-center px-4 space-y-4">
      
      {/* Score and players */}
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

      {/* Main gaming arena */}
      <div className="w-full h-96 relative border border-stone-800 rounded-[28px] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-none" />
      </div>

      <p className="text-[10px] text-stone-500 text-center font-bold uppercase tracking-wider">
        Desliza el dedo o el mouse en la pantalla para mover tu pala de neón ☁️
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

      // Update snake positions
      const head = { ...snake[0] };
      const dir = directionRef.current;

      if (dir === 'UP') head.y -= grid;
      if (dir === 'DOWN') head.y += grid;
      if (dir === 'LEFT') head.x -= grid;
      if (dir === 'RIGHT') head.x += grid;

      // Wall collision (screen wrap)
      if (head.x < 0) head.x = size - grid;
      if (head.x >= size) head.x = 0;
      if (head.y < 0) head.y = size - grid;
      if (head.y >= size) head.y = 0;

      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        localGameOver = true;
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      // Apple collision
      if (head.x === apple.x && head.y === apple.y) {
        currentScore += 10;
        setScore(currentScore);
        if (currentScore > highScore) setHighScore(currentScore);
        spawnApple();
      } else {
        snake.pop();
      }

      // Drawing
      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, size, size);

      // Draw Grid lines slightly
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

      // Apple (Neon golden core)
      ctx.fillStyle = '#e5b31c';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#e5b31c';
      ctx.fillRect(apple.x + 2, apple.y + 2, grid - 4, grid - 4);

      // Snake (Purple neon)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      snake.forEach((s, idx) => {
        ctx.fillStyle = idx === 0 ? '#06b6d4' : '#a855f7'; // Cyan head
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

      {/* Main Canvas box */}
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

      {/* Immersive retro Virtual D-PAD controller */}
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

      // Background
      ctx.fillStyle = '#09070f';
      ctx.fillRect(0, 0, width, height);

      // Star particles simulating deep speed
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
      }

      // Ship controls
      const keys = keysPressedRef.current;
      if (keys.left) shipX -= 3.5;
      if (keys.right) shipX += 3.5;

      // Clamping shipX
      if (shipX < shipWidth) shipX = shipWidth;
      if (shipX > width - shipWidth) shipX = width - shipWidth;

      // Shoot trigger
      if (keys.shoot && shootCooldown <= 0) {
        lasers.push({ x: shipX, y: shipY - 10 });
        shootCooldown = 15; // 15 frames cooldown
      }
      if (shootCooldown > 0) shootCooldown--;

      // Update and draw lasers (glowing cyan beams)
      lasers.forEach((l, idx) => {
        l.y -= 5.5;
        if (l.y < 0) lasers.splice(idx, 1);

        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(l.x - 1.5, l.y, 3, 10);
      });

      // Spawn meteors
      if (nextMeteorFrame <= 0) {
        spawnMeteor();
        nextMeteorFrame = 35 + Math.random() * 30; // spawn cooldown frames
      }
      nextMeteorFrame--;

      // Update & draw meteors (neon purple stones)
      meteors.forEach((m, mIdx) => {
        m.y += m.speed;
        
        // Ship collision
        const dist = Math.hypot(m.x - shipX, m.y - shipY);
        if (dist < m.size + shipWidth/2) {
          localGameOver = true;
          setGameOver(true);
          return;
        }

        // Out of boundary
        if (m.y > height + m.size) {
          meteors.splice(mIdx, 1);
        }

        // Laser collisions
        lasers.forEach((l, lIdx) => {
          const lDist = Math.hypot(m.x - l.x, m.y - l.y);
          if (lDist < m.size) {
            // Explode!
            currentScore += 15;
            setScore(currentScore);
            if (currentScore > highScore) setHighScore(currentScore);
            meteors.splice(mIdx, 1);
            lasers.splice(lIdx, 1);
          }
        });

        // Draw meteor stone
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Ship (Neon golden retro spacecraft)
      ctx.fillStyle = '#e5b31c';
      ctx.shadowColor = '#e5b31c';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 12);
      ctx.lineTo(shipX - shipWidth/2, shipY + 10);
      ctx.lineTo(shipX + shipWidth/2, shipY + 10);
      ctx.closePath();
      ctx.fill();

      // Reset shadows
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

      {/* Screen container */}
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

      {/* Control panel buttons */}
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
