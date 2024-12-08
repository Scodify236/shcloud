// Audio Stream Selection Utility

import { audio, bitrateSelector, playButton } from "../lib/dom";
import { getSaved, store } from "../lib/store";
import { notify } from "../lib/utils";

// Define the audio stream interface for type safety
interface AudioStream {
  codec: string;
  url: string;
  quality: string;
  bitrate: string;
  contentLength: string;
  mimeType: string;
}

export function setAudioStreams(
  audioStreams: AudioStream[], 
  isMusic: boolean = false, 
  isLive: boolean = false
): void {
  // Get preferred codec from store
  const preferedCodec = store.player.codec;
  const noOfBitrates = audioStreams.length;
  let index = -1;

  // Handle no audio streams scenario
  if (!noOfBitrates) {
    notify(
      isLive 
        ? 'Turn on HLS to listen to LiveStreams!' 
        : 'No Audio Streams Found.'
    );
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  // Direct URL handler without proxy
  function directUrlHandler(url: string): string {
    const useProxy = isMusic || getSaved('enforceProxy');
    
    // If proxy is enforced, return original URL
    if (useProxy) return url;

    // Return original URL without modifications
    return url;
  }

  // Clear previous bitrate selector options
  bitrateSelector.innerHTML = '';

  // Populate bitrate selector
  audioStreams.forEach((stream: AudioStream, i: number) => {
    const codec = stream.codec === 'opus' ? 'opus' : 'aac';
    const size = (parseInt(stream.contentLength) / (1024 * 1024)).toFixed(2) + ' MB';

    // Add option to bitrate selector
    bitrateSelector.add(new Option(
      `${stream.quality} ${codec} - ${size}`, 
      directUrlHandler(stream.url)
    ));

    // Set mime type data attribute
    const lastOption = bitrateSelector.lastElementChild as HTMLOptionElement;
    if (lastOption) {
      lastOption.dataset.type = stream.mimeType;
    }

    // Determine preferred bitrate
    const codecPref = preferedCodec ? codec === preferedCodec : true;
    const hqPref = store.player.hq ? noOfBitrates : 0;
    if (codecPref && index < hqPref) index = i;
  });

  // Set selected index and audio source
  bitrateSelector.selectedIndex = index;
  audio.src = bitrateSelector.value;
}