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

// DOM Elements
const audioElement = document.getElementById('audioElement');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playerTitle = document.getElementById('playerTitle');
const playerDate = document.getElementById('playerDate');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const progressFill = document.getElementById('progressFill');
const progressBar = document.querySelector('.progress-bar');
const playIcon = document.querySelector('.play-icon');
const pauseIcon = document.querySelector('.pause-icon');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkAudioAvailability();
});

// Event Listeners
function initializeEventListeners() {
    // Play buttons on category cards
    const playButtons = document.querySelectorAll('.play-button');
    playButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = button.dataset.category;
            loadAndPlayAudio(category);
        });
    });

    // Category cards (clicking anywhere on card)
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            loadAndPlayAudio(category);
        });
    });

    // Audio player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    
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

// Load and play audio
async function loadAndPlayAudio(category) {
    try {
        // Show loading state
        const card = document.querySelector(`.category-card[data-category="${category}"]`);
        const playButton = card.querySelector('.play-button');
        const loadingIndicator = card.querySelector('.loading-indicator');
        
        playButton.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');

        // Get audio URL
        const audioUrl = getAudioUrl(category);
        
        // Check if audio file exists
        const response = await fetch(audioUrl, { method: 'HEAD' });
        
        if (!response.ok) {
            throw new Error('Audio dosyası bulunamadı');
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
        audioPlayer.classList.remove('hidden');
        
        // Play audio
        await audioElement.play();
        
        // Hide loading, show play button
        playButton.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');

        // Scroll to player
        audioPlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('Error loading audio:', error);
        
        // Hide loading, show play button
        const card = document.querySelector(`.category-card[data-category="${category}"]`);
        const playButton = card.querySelector('.play-button');
        const loadingIndicator = card.querySelector('.loading-indicator');
        
        playButton.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        
        alert('Bugün için bu kategoride henüz haber yok. Lütfen daha sonra tekrar deneyin.');
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

// Check audio availability (optional feature)
async function checkAudioAvailability() {
    const categories = ['gundem', 'ekonomi', 'spor', 'magazin', 'politika'];
    
    for (const category of categories) {
        try {
            const audioUrl = getAudioUrl(category);
            const response = await fetch(audioUrl, { method: 'HEAD' });
            
            const card = document.querySelector(`.category-card[data-category="${category}"]`);
            
            if (!response.ok) {
                // Optional: Add visual indicator for unavailable content
                // card.style.opacity = '0.6';
            }
        } catch (error) {
            console.log(`Checking ${category}:`, error.message);
        }
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (audioElement.src) {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            togglePlayPause();
        }
        if (e.code === 'ArrowLeft') {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
        }
        if (e.code === 'ArrowRight') {
            audioElement.currentTime = Math.min(audioElement.duration, audioElement.currentTime + 10);
        }
    }
});

