// Supabase Configuration
const SUPABASE_URL = 'https://ocllbrqxdoczugoubdyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbGxicnF4ZG9jenVnb3ViZHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODEwMjcsImV4cCI6MjA3NTY1NzAyN30.haE0t-C9zI9n_2P7eWobcBfNhFz4brG3nnARSXeIMUc';
const BUCKET_NAME = 'audio-bucket';

// Category mapping (UI category -> Supabase folder name)
const CATEGORY_MAPPING = {
    'gundem': 'gunun-mansetleri',
    'ekonomi': 'ekonomi',
    'spor': 'spor',
    'magazin': 'magazin',
    'politika': 'politika'
};

// Audio Player State
let currentAudio = null;
let currentCategory = null;
let isPlaying = false;
let playbackSpeed = 1.0;

// DOM Elements
const audioElement = document.getElementById('audioElement');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const closePlayerBtn = document.getElementById('closePlayerBtn');
const skipBackBtn = document.getElementById('skipBackBtn');
const skipForwardBtn = document.getElementById('skipForwardBtn');
const speedBtn = document.getElementById('speedBtn');
const speedText = document.getElementById('speedText');
const playerTitle = document.getElementById('playerTitle');
const playerDate = document.getElementById('playerDate');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const progressFill = document.getElementById('progressFill');
const progressBar = document.querySelector('.progress-bar');
const playIcon = document.querySelector('.play-icon');
const pauseIcon = document.querySelector('.pause-icon');

// Elements loaded successfully

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkAudioAvailability();
});

// Event Listeners
function initializeEventListeners() {
    // Category cards (clicking anywhere on card)
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            
            if (category) {
                loadAndPlayAudio(category);
            } else if (card.classList.contains('contact-card')) {
                // Handle contact card click - redirect to Instagram
                window.open('https://www.instagram.com/itwo.ai/', '_blank');
            }
        });
    });

    // Audio player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    closePlayerBtn.addEventListener('click', closePlayer);
    skipBackBtn.addEventListener('click', skipBackward);
    skipForwardBtn.addEventListener('click', skipForward);
    speedBtn.addEventListener('click', togglePlaybackSpeed);
    
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateDuration);
    audioElement.addEventListener('ended', onAudioEnded);
    audioElement.addEventListener('play', () => {
        isPlaying = true;
        updatePlayPauseIcon();
    });
    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayPauseIcon();
    });

    // Progress bar click
    progressBar.addEventListener('click', seekAudio);
}

// Get audio URL from Supabase
function getAudioUrl(category) {
    // Map UI category to Supabase folder name
    const folderName = CATEGORY_MAPPING[category];
    
    // Fixed filename for all categories
    const fileName = 'bugun.mp3';
    
    // Construct the audio file path
    const audioPath = `audio/${folderName}/${fileName}`;
    
    // Get public URL from Supabase Storage
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${audioPath}`;
    
    console.log('📁 Kategori:', category, '→', folderName);
    console.log('📁 Aranan dosya yolu:', audioPath);
    console.log('🔗 Tam URL:', url);
    
    return url;
}

// Load and play audio with retry mechanism
async function loadAndPlayAudio(category) {
    try {
        // Show loading state
        showLoadingState(category);
        
        // Get audio URL
        const audioUrl = getAudioUrl(category);
        
        // Try to load audio with retry mechanism
        const success = await loadAudioWithRetry(audioUrl, 3);
        
        if (!success) {
            throw new Error('Audio dosyası yüklenemedi');
        }

        // Set current category
        currentCategory = category;

        // Update player info
        const categoryNames = {
            'gundem': 'Gündem',
            'ekonomi': 'Ekonomi',
            'spor': 'Spor',
            'magazin': 'Magazin',
            'politika': 'Politika'
        };
        
        playerTitle.textContent = categoryNames[category];
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        playerDate.textContent = dateStr;

        // Load and play audio
        audioElement.src = audioUrl;
        audioElement.load();
        
        // Show player
        if (audioPlayer) {
            audioPlayer.classList.remove('hidden');
            document.body.classList.add('player-active');
        } else {
            console.error('Audio player element not found!');
            return;
        }
        
        // Play audio
        await audioElement.play();
        
        // Hide loading state
        hideLoadingState();

    } catch (error) {
        console.error('Error loading audio:', error);
        hideLoadingState();
        
        // Show more helpful error message with retry option
        showErrorWithRetry(category, error);
    }
}

// Load audio with retry mechanism
async function loadAudioWithRetry(audioUrl, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Audio yükleme denemesi ${attempt}/${maxRetries}:`, audioUrl);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
            
            // Try to fetch with timeout
            const response = await fetch(audioUrl, { 
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('✅ Audio dosyası başarıyla bulundu');
                return true;
            } else {
                console.warn(`⚠️ HTTP ${response.status}: ${response.statusText}`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                }
            }
        } catch (error) {
            console.warn(`❌ Deneme ${attempt} başarısız:`, error.message);
            
            if (error.name === 'AbortError') {
                console.warn('⏰ İstek zaman aşımına uğradı');
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            }
        }
    }
    
    return false;
}

// Show loading state
function showLoadingState(category) {
    const categoryNames = {
        'gundem': 'Gündem',
        'ekonomi': 'Ekonomi',
        'spor': 'Spor',
        'magazin': 'Magazin',
        'politika': 'Politika'
    };
    
    playerTitle.textContent = `${categoryNames[category]} yükleniyor...`;
    playerDate.textContent = 'Lütfen bekleyin';
    
    // Show player immediately with loading state
    if (audioPlayer) {
        audioPlayer.classList.remove('hidden');
        document.body.classList.add('player-active');
    }
}

// Hide loading state
function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Show error with retry option
function showErrorWithRetry(category, error) {
    const categoryNames = {
        'gundem': 'Gündem',
        'ekonomi': 'Ekonomi',
        'spor': 'Spor',
        'magazin': 'Magazin',
        'politika': 'Politika'
    };
    
    const errorMessage = `
        ${categoryNames[category]} kategorisi için ses dosyası yüklenemedi.
        
        Olası nedenler:
        • İnternet bağlantısı sorunu
        • Geçici sunucu sorunu
        • Dosya henüz hazır değil
        
        Tekrar denemek ister misiniz?
    `;
    
    if (confirm(errorMessage)) {
        // Retry loading
        loadAndPlayAudio(category);
    } else {
        // Close player
        closePlayer();
    }
}

// Toggle play/pause
function togglePlayPause() {
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play();
    }
}

// Close player
function closePlayer() {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioPlayer.classList.add('hidden');
    document.body.classList.remove('player-active');
    isPlaying = false;
    updatePlayPauseIcon();
}

// Update play/pause icon
function updatePlayPauseIcon() {
    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

// Update progress bar
function updateProgress() {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(audioElement.currentTime);
    }
}

// Update duration
function updateDuration() {
    if (audioElement.duration) {
        durationEl.textContent = formatTime(audioElement.duration);
    }
}

// Seek audio
function seekAudio(e) {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioElement.currentTime = pos * audioElement.duration;
}

// Format time (seconds to mm:ss)
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// On audio ended
function onAudioEnded() {
    isPlaying = false;
    updatePlayPauseIcon();
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';
}

// Skip backward 15 seconds
function skipBackward() {
    if (audioElement.src) {
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
    }
}

// Skip forward 15 seconds
function skipForward() {
    if (audioElement.src) {
        audioElement.currentTime = Math.min(audioElement.duration, audioElement.currentTime + 15);
    }
}

// Toggle playback speed
function togglePlaybackSpeed() {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    
    playbackSpeed = speeds[nextIndex];
    audioElement.playbackRate = playbackSpeed;
    speedText.textContent = playbackSpeed + 'x';
}

// Check audio availability (optional feature)
async function checkAudioAvailability() {
    const categories = ['gundem', 'ekonomi', 'spor', 'magazin', 'politika'];
    
    console.log('🔍 Audio dosyalarının varlığı kontrol ediliyor...');
    
    for (const category of categories) {
        try {
            const audioUrl = getAudioUrl(category);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout
            
            const response = await fetch(audioUrl, { 
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const card = document.querySelector(`.category-card[data-category="${category}"]`);
            
            if (response.ok) {
                console.log(`✅ ${category}: Audio dosyası mevcut`);
                // Optional: Add visual indicator for available content
                // card.style.opacity = '1';
            } else {
                console.warn(`⚠️ ${category}: Audio dosyası bulunamadı (${response.status})`);
                // Optional: Add visual indicator for unavailable content
                // card.style.opacity = '0.6';
            }
        } catch (error) {
            console.warn(`❌ ${category}: Kontrol edilemedi -`, error.message);
            
            if (error.name === 'AbortError') {
                console.warn(`⏰ ${category}: İstek zaman aşımına uğradı`);
            }
        }
    }
    
    console.log('🔍 Audio kontrolü tamamlandı');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (audioElement.src) {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            togglePlayPause();
        }
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            skipBackward();
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            skipForward();
        }
        if (e.code === 'KeyS' && e.target === document.body) {
            e.preventDefault();
            togglePlaybackSpeed();
        }
    }
});

