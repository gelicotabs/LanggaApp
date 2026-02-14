import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react';

// YouTube video IDs for your playlist
const PLAYLIST = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'kJQP7kiw5Fk', // Luis Fonsi - Despacito
  'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
];

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const BackgroundMusic: React.FC = () => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const initAttempted = useRef(false);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      window.onYouTubeIframeAPIReady = initPlayer;
      return;
    }

    // Load the API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      // Cleanup
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const initPlayer = () => {
    // Prevent multiple initialization attempts
    if (initAttempted.current || !playerContainerRef.current) return;
    initAttempted.current = true;

    try {
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        height: '0',
        width: '0',
        videoId: PLAYLIST[0],
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          mute: 1,
          playlist: PLAYLIST.slice(1).join(','),
          playsinline: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
      setNeedsInteraction(true);
    }
  };

  const onPlayerReady = (event: any) => {
    setIsReady(true);
    // Try to play
    event.target.playVideo();
    setIsPlaying(true);
    setNeedsInteraction(false);
  };

  const onPlayerStateChange = (event: any) => {
    const { data } = event;
    
    if (data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      setNeedsInteraction(false);
    } else if (data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (data === window.YT.PlayerState.ENDED) {
      // Move to next track
      const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
      setCurrentTrackIndex(nextIndex);
    }
  };

  const onPlayerError = (event: any) => {
    console.log('YouTube player error, skipping to next video...');
    // Skip to next video on error
    nextSong();
  };

  // Handle user interaction to start playback
  useEffect(() => {
    if (!isReady || isPlaying) return;

    const handleInteraction = () => {
      if (playerRef.current && !isPlaying) {
        try {
          playerRef.current.playVideo();
          setIsPlaying(true);
          setNeedsInteraction(false);
        } catch (err) {
          console.log('Play failed:', err);
        }
      }
    };

    // Listen for any user interaction
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [isReady, isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current || !isReady) return;
    
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
        setNeedsInteraction(false);
      }
    } catch (error) {
      console.error('Toggle play error:', error);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current || !isReady) return;
    
    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(50);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Toggle mute error:', error);
    }
  };

  const nextSong = () => {
    if (!playerRef.current || !isReady) return;
    
    try {
      const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
      setCurrentTrackIndex(nextIndex);
      playerRef.current.loadVideoById(PLAYLIST[nextIndex]);
    } catch (error) {
      console.error('Next song error:', error);
    }
  };

  const prevSong = () => {
    if (!playerRef.current || !isReady) return;
    
    try {
      const prevIndex = currentTrackIndex === 0 ? PLAYLIST.length - 1 : currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      playerRef.current.loadVideoById(PLAYLIST[prevIndex]);
    } catch (error) {
      console.error('Previous song error:', error);
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  return (
    <>
      {/* Visual indicator when music needs user interaction */}
      {needsInteraction && !isPlaying && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-pink-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:bg-pink-700 transition">
            <Music size={16} />
            <span className="text-sm font-medium">Click to start music</span>
          </div>
        </div>
      )}

      {/* YouTube player container - hidden but functional */}
      <div 
        ref={playerContainerRef}
        style={{
          position: 'fixed',
          bottom: '-100px',
          left: '-100px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Music controls */}
      <div
        className="fixed bottom-4 right-4 z-50"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {showControls && isReady && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center space-x-2 border border-pink-200 dark:border-gray-700">
            <button 
              onClick={prevSong} 
              className="p-2 text-pink-600 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" 
              title="Previous"
              aria-label="Previous song"
            >
              <SkipBack size={18} />
            </button>
            
            <button 
              onClick={togglePlay} 
              className="p-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors shadow-md" 
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            <button 
              onClick={nextSong} 
              className="p-2 text-pink-600 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" 
              title="Next"
              aria-label="Next song"
            >
              <SkipForward size={18} />
            </button>
            
            <button 
              onClick={toggleMute} 
              className="p-2 text-pink-600 hover:bg-pink-100 dark:hover:bg-gray-700 rounded-full transition-colors" 
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Track indicator */}
            <div className="pl-2 border-l border-pink-200 dark:border-gray-600">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {currentTrackIndex + 1}/{PLAYLIST.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BackgroundMusic;