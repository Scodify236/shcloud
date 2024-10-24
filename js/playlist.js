const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');
    const resultsTitle = document.getElementById('resultsTitle');
    const clearSearchButton = document.getElementById('clearSearch');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const artistSection = document.getElementById('artistSection');

    const colorThief = new ColorThief();
    let currentThumbnail = null;
    let isLoading = false;
    let nextPageToken = null;

    function addCacheBuster(url) {
        const cacheBuster = `cache_buster=${Date.now()}`;
        return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    }

    function createArtistElements() {
            const artistContainer = artistSection.querySelector('.artist-section');
            sampleArtists.forEach(artist => {
                const artistElement = document.createElement('div');
                artistElement.className = 'artist-item';
                artistElement.innerHTML = `
                    <img src="${artist.image}" alt="${artist.name}" class="artist-image">
                    <span class="artist-name text-sm font-medium">${artist.name}</span>
                `;
                artistElement.addEventListener('click', () => searchArtist(artist.name));
                artistContainer.appendChild(artistElement);
            });
        }

    function searchArtist(artistName) {
        searchInput.value = artistName;
        performSearch(artistName);
    }

    async function performSearch(query, isNextPage = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        let url;
        if (isNextPage && nextPageToken) {
            url = `https://pipedapi.reallyaweso.me/nextpage/search?q=${encodeURIComponent(query)}&filter=all&nextpage=${encodeURIComponent(nextPageToken)}`;
        } else {
            url = `https://pipedapi.reallyaweso.me/search?q=${encodeURIComponent(query)}&filter=all`;
        }

        const response = await fetch(addCacheBuster(url), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!isNextPage) {
            resultsTitle.textContent = `Search Results for "${query}"`;
            resultsContainer.innerHTML = '';
            artistSection.style.display = 'none';
        }

        displayResults(data.items);
        nextPageToken = data.nextpage;

        // Add a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.textContent = 'Loading more results...';
        loadingIndicator.className = 'text-center text-gray-500 my-4';
        resultsContainer.appendChild(loadingIndicator);
    } catch (error) {
        console.error('Error fetching search results:', error);
        if (!isNextPage) {
            resultsContainer.innerHTML = '<p class="text-center text-red-500">An error occurred while fetching results. Please try again.</p>';
        }
    } finally {
        isLoading = false;
    }
}

// Add an intersection observer to trigger loading more results
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 1.0
};

const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoading && nextPageToken) {
            const query = searchInput.value.trim();
            performSearch(query, true);
        }
    });
}, observerOptions);

    async function fetchTrendingVideos() {
        try {
            const response = await fetch(addCacheBuster('https://pipedapi.kavin.rocks/trending?region=IN&filter=music'), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            displayResults(data);
        } catch (error) {
            console.error('Error fetching trending videos:', error);
            resultsContainer.innerHTML = '<p class="text-center text-red-500">An error occurred while fetching trending videos. Please try again.</p>';
        }
    }

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query === '') return;
        performSearch(query);
    });

    clearSearchButton.addEventListener('click', () => {
    searchInput.value = '';
    resultsTitle.textContent = 'Trending';
    artistSection.style.display = 'block';
    nextPageToken = null; // Reset the nextPageToken
    fetchTrendingVideos();
});

    function setBackgroundColor(color) {
        document.body.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    }

    function getAverageColor(imgEl) {
        return new Promise((resolve) => {
            if (imgEl.complete) {
                resolve(colorThief.getColor(imgEl));
            } else {
                imgEl.addEventListener('load', function() {
                    resolve(colorThief.getColor(this));
                });
            }
        });
    }

    async function updateBackgroundColor(thumbnailUrl) {
        if (thumbnailUrl === currentThumbnail) return;
        currentThumbnail = thumbnailUrl;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = thumbnailUrl;

        try {
            const color = await getAverageColor(img);
            setBackgroundColor(color);
        } catch (error) {
            console.error('Error getting average color:', error);
            setDefaultBackground();
        }
    }

    function setDefaultBackground() {
        setBackgroundColor([30, 15, 0]); // Orangish black
    }

    function displayResults(items) {
    items.forEach(item => {
        if (item.type === 'stream' || item.type === 'video') {
            const videoElement = document.createElement('div');
            videoElement.className = 'video-card';
            videoElement.innerHTML = `
                <div class="video-thumbnail">
                    <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
                </div>
                <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2 line-clamp-2">${item.title}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">${item.uploaderName}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">${item.views} views • ${item.uploadedDate || item.uploaded}</p>
                </div>
            `;
            videoElement.addEventListener('click', () => playAudio(item.url, item.title, item.thumbnail));
            resultsContainer.appendChild(videoElement);
        }
    });

    // Remove the previous loading indicator if it exists
    const oldLoadingIndicator = document.getElementById('loading-indicator');
    if (oldLoadingIndicator) {
        oldLoadingIndicator.remove();
    }

    // Add a new loading indicator and observe it
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.textContent = 'Loading more results...';
    loadingIndicator.className = 'text-center text-gray-500 my-4';
    resultsContainer.appendChild(loadingIndicator);

    intersectionObserver.observe(loadingIndicator);
}

// Modify the searchForm event listener
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query === '') return;
    nextPageToken = null; // Reset the nextPageToken for a new search
    performSearch(query);
});

    async function playAudio(videoUrl, title, thumbnailUrl) {
        const videoId = videoUrl.split('v=')[1];
        nowPlaying.textContent = `Loading audio for: ${title}`;

        try {
            const audioUrl = await fetchAudioUrlWithRetry(videoId);
            audioPlayer.src = audioUrl;
            await audioPlayer.play();
            nowPlaying.textContent = `Now playing: ${title}`;
            updateBackgroundColor(thumbnailUrl);
        } catch (error) {
            console.error('Error fetching or playing audio stream:', error);
            nowPlaying.textContent = 'Error: Could not play audio. Click to retry.';
            nowPlaying.onclick = () => playAudio(videoUrl, title, thumbnailUrl);
        }
    }

    async function fetchAudioUrlWithRetry(videoId, retries = 3) {
        const apis = [
            { name: '1-a', fetch: fetchAceThinkerApiUrl },
            { name: '2-p', fetch: fetchPipedApiUrl },
            { name: '3-p', fetch: fetchSecondPipedApiUrl },
            { name: '4', fetch: fetchNewApiUrl },
            { name: '5', fetch: fetchCobaltApiUrl },
            { name: '6', fetch: fetchYtdlOnlineUrl }
        ];

        for (let attempt = 0; attempt < retries; attempt++) {
            for (const api of apis) {
                try {
                    console.log(`Attempting to fetch from ${api.name} API...`);
                    const url = await api.fetch(videoId);
                    if (url) {
                        console.log(`Success! ${api.name} API returned a valid URL: ${url}`);
                        return url;
                    } else {
                        console.log(`${api.name} API did not return a valid URL.`);
                    }
                } catch (error) {
                    console.error(`Error fetching from ${api.name} API:`, error);
                }
            }
            console.log(`Retrying in ${attempt + 1} seconds...`);
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
        throw new Error('All APIs failed to provide a valid audio URL');
    }

    async function fetchPipedApiUrl(videoId) {
        const response = await fetch(addCacheBuster(`https://pipedapi.reallyaweso.me/streams/${videoId}`), {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const audioStream = data.audioStreams.find(stream => stream.mimeType.startsWith('audio/'));
        return audioStream ? audioStream.url : null;
    }

    async function fetchSecondPipedApiUrl(videoId) {
        const response = await fetch(addCacheBuster(`https://pipedapi.adminforge.de/streams/${videoId}`), {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const audioStream = data.audioStreams.find(stream => stream.mimeType.startsWith('audio/'));
        return audioStream ? audioStream.url : null;
    }

    async function fetchAceThinkerApiUrl(videoId) {
        const encodedVideoId = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
        const apiUrl = `https://www.acethinker.com/downloader/api/video_info.php?url=${encodedVideoId}&israpid=1&ismp3=0`;

        try {
            const response = await fetch(addCacheBuster(apiUrl), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const m4aLink = data.links.flat().find(link => link.ext === 'm4a');
            return m4aLink ? m4aLink.url : null;
        } catch (error) {
            console.error('Error fetching from AceThinker API:', error);
            return null;
        }
    }

    async function fetchNewApiUrl(videoId) {
        const response = await fetch(addCacheBuster(`https://kityune.imput.net/api/json?id=${videoId}`), {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.status === 'stream' && data.url ? data.url : null;
    }

    async function fetchCobaltApiUrl(videoId) {
        const response = await fetch(addCacheBuster('https://api.cobalt.tools/api/json'), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                aFormat: "mp3",
                isAudioOnly: true,
                audioBitrate: 8000 
            }),
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.audio || data.url || null;
    }

    async function fetchYtdlOnlineUrl(videoId) {
        const response = await fetch(addCacheBuster(`https://api.allorigins.win/raw?url=https://ytdlp.online/stream?command=https://www.youtube.com/watch?v=${videoId} --get-url`), {
            timeout: 1000,
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseText = await response.text();
        const urls = responseText.split('\n')
            .filter(line => line.trim().startsWith('data:'))
            .map(line => line.substring(5).trim())
            .filter(url => url.startsWith('http'));
        return urls.length >= 2 ? urls[1] : (urls.length === 1 ? urls[0] : null);
    }

    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio player error:', e);
        nowPlaying.textContent = 'Error: Could not play audio. Click to retry.';
        nowPlaying.onclick = () => {
            const currentSrc = audioPlayer.src;
            const currentTitle = nowPlaying.textContent.replace('Now playing: ', '');
            playAudio(currentSrc, currentTitle);
        };
    });

    darkModeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });

    window.addEventListener('load', () => {
        setDefaultBackground();
        createArtistElements();
        fetchTrendingVideos();
    });

    audioPlayer.addEventListener('ended', setDefaultBackground);