const TARGET_COUNTRY = "India";

// Cache checked channel URLs to avoid repetitive fetches
const channelCache = new Map();

// Scan for video renderers across feed, search, and home pages
async function scanAndBlockVideos() {
  const videoElements = document.querySelectorAll(
    'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
  );

  for (const video of videoElements) {
    if (video.dataset.blockedChecked) continue;
    video.dataset.blockedChecked = "processing";

    const channelLink = video.querySelector('a[href*="/@"], a[href*="/channel/"]');
    if (!channelLink) continue;

    const href = channelLink.getAttribute('href');
    if (!href) continue;

    // Clean up channel URL string
    const handle = href.split('/')[1] || href.split('/')[2];
    const aboutUrl = `https://www.youtube.com/${handle}/about`;

    if (!channelCache.has(aboutUrl)) {
      try {
        const response = await fetch(aboutUrl);
        const text = await response.text();

        // Search inside raw payload or initial state string for country definitions
        const isTarget = text.includes(`"${TARGET_COUNTRY}"`) || 
                         text.includes(`country":"IN"`) || 
                         text.includes(`>Location<`) && text.includes(TARGET_COUNTRY);

        channelCache.set(aboutUrl, isTarget);
      } catch (e) {
        channelCache.set(aboutUrl, false);
      }
    }

    if (channelCache.get(aboutUrl)) {
      video.style.display = "none";
      video.dataset.blockedChecked = "true";
    } else {
      video.dataset.blockedChecked = "false";
    }
  }
}

// Block dialog view when clicking "More info" directly on a channel page
function hideAboutModalIfTarget() {
  const aboutDialog = document.querySelector('ytd-about-channel-renderer, ytd-channel-about-metadata-renderer');
  if (aboutDialog) {
    const dialogText = aboutDialog.innerText || aboutDialog.textContent;
    if (dialogText.includes(TARGET_COUNTRY)) {
      // Hide the channel trailer, content, or the dialog
      const channelHeader = document.querySelector('ytd-browse');
      if (channelHeader) {
        channelHeader.style.display = 'none';
      }
    }
  }
}

// MutationObserver to watch for newly loaded video cards on scroll
const observer = new MutationObserver(() => {
  scanAndBlockVideos();
  hideAboutModalIfTarget();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run
scanAndBlockVideos();
hideAboutModalIfTarget();