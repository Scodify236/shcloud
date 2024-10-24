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