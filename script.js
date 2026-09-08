document.addEventListener("DOMContentLoaded",()=>{
    const form = document.getElementById("playlist-form");
    const inp = document.getElementById("playlist-url");
    const displayres = document.getElementById("results");
    const advanceT= document.getElementById("toggle-advanced");
    const advance= document.getElementById("advanced-options");
    const calculateBtn = document.getElementById("calculate-btn");
    
    const API_KEY="";
    
    // State management
    let isLoading = false;
    let currentVideoIds = [];
    let currentTotalSeconds = 0;
    let currentVideosData = []; // Store video info: {id, title, duration}

    form.addEventListener('submit', async(e)=>{
        e.preventDefault();
        const inputt = inp.value.trim(); 
        if(!inputt) return;

        try {
            setLoading(true);
            
            // Phase 1: Extract playlist ID
            const plid = getPlaylistId(inputt);
            if (!plid) {
                throw new Error("Invalid YouTube playlist URL. Please check the URL and try again.");
            }

            // Phase 1: Fetch playlist metadata
            const { title, channelTitle } = await fetchPlaylistTitle(plid);
            displayPlaylistTitle(title, channelTitle);

            // Phase 2: Fetch all videos with pagination
            currentVideoIds = await fetchAllPlaylistVideos(plid);
            
            if (currentVideoIds.length === 0) {
                throw new Error("No videos found in this playlist.");
            }

            // Apply range filtering
            const rangeStart = parseInt(document.getElementById("range-start").value) || 1;
            const rangeEnd = parseInt(document.getElementById("range-end").value) || currentVideoIds.length;
            
            const filteredVideoIds = applyRangeFilter(currentVideoIds, rangeStart, rangeEnd);
            
            console.log(`Total videos in playlist: ${currentVideoIds.length}`);
            console.log(`Videos after range filter: ${filteredVideoIds.length}`);

            // Phase 3: Fetch video durations
            const durations = await fetchVideosDuration(filteredVideoIds);

            if (durations.length === 0) {
                throw new Error("Could not fetch video information.");
            }

            // Phase 5: Calculate total duration
            currentTotalSeconds = calculateTotalDuration(durations);
            displayTotalDuration(currentTotalSeconds);

            // Phase 6: Calculate watch times at different speeds
            displayWatchTimes(currentTotalSeconds);

            // Phase 8: Calculate daily watch plan
            setupDailyWatchPlanListeners();
            updateDailyWatchPlan();

            // Phase 10: Show results
            displayres.classList.remove("hidden");
            setLoading(false);

        } catch (error) {
            setLoading(false);
            showError(error);
            displayres.classList.add("hidden");
        }
    });

    // ============== PHASE 1: Playlist Metadata ==============
    async function fetchPlaylistTitle(id){
        console.log("Fetching playlist metadata...");
        const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }

        if (!data.items || data.items.length === 0) {
            throw new Error("Playlist not found. It may be private or deleted.");
        }

        return {
            title: data.items[0].snippet.title,
            channelTitle: data.items[0].snippet.channelTitle
        };
    }

    function displayPlaylistTitle(title, channelTitle){
        document.getElementById("playlist-title").textContent = title;
        document.getElementById("artist-name").textContent = channelTitle;
    }

    // ============== PHASE 2: Fetch All Videos with Pagination ==============
    async function fetchAllPlaylistVideos(playlistId) {
        const videoIds = [];
        let nextPageToken = null;

        try {
            do {
                const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
                url.searchParams.append("part", "contentDetails");
                url.searchParams.append("playlistId", playlistId);
                url.searchParams.append("maxResults", "50");
                url.searchParams.append("key", API_KEY);

                if (nextPageToken) {
                    url.searchParams.append("pageToken", nextPageToken);
                }

                console.log(`Fetching videos (page ${videoIds.length / 50 + 1})...`);

                const response = await fetch(url.toString());
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(`API Error: ${data.error.message}`);
                }

                if (data.items && data.items.length > 0) {
                    data.items.forEach(item => {
                        if (item.contentDetails && item.contentDetails.videoId) {
                            videoIds.push(item.contentDetails.videoId);
                        }
                    });
                }

                nextPageToken = data.nextPageToken || null;

            } while (nextPageToken);

            displayVideoCount(videoIds.length);
            return videoIds;

        } catch (error) {
            console.error("Error fetching playlist videos:", error);
            throw error;
        }
    }

    function displayVideoCount(count) {
        document.getElementById("video-count-info").textContent = `${count} videos`;
        document.getElementById("view-all-btn").textContent=`> View all ${count}      videos`;
    }

    // ============== PHASE 9: Range Filtering ==============
    function applyRangeFilter(videoIds, startIndex, endIndex) {
        // Validate range
        if (startIndex < 1) startIndex = 1;
        if (endIndex > videoIds.length) endIndex = videoIds.length;
        if (endIndex < startIndex) endIndex = startIndex;

        // Convert to 0-based indexing
        const start = startIndex - 1;
        const end = endIndex;

        return videoIds.slice(start, end);
    }

    // ============== PHASE 3: Fetch Video Durations & Titles ==============
    async function fetchVideosDuration(videoIds) {
        const videosData = [];

        try {
            // YouTube API allows max 50 video IDs per request
            const chunks = [];
            for (let i = 0; i < videoIds.length; i += 50) {
                chunks.push(videoIds.slice(i, i + 50));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const ids = chunk.join(",");

                console.log(`Fetching video details (batch ${i + 1}/${chunks.length})...`);

                // Fetch both contentDetails (for duration) and snippet (for title)
                const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    throw new Error(`API Error: ${data.error.message}`);
                }

                if (data.items) {
                    data.items.forEach(item => {
                        if (item.contentDetails && item.contentDetails.duration) {
                            videosData.push({
                                id: item.id,
                                title: item.snippet.title,
                                duration: item.contentDetails.duration
                            });
                        }
                    });
                }
            }

            // Store the video data for later use (View All, Share, Export)
            currentVideosData = videosData;

            return videosData.map(v => v.duration);

        } catch (error) {
            console.error("Error fetching video details:", error);
            throw error;
        }
    }

    // ============== PHASE 4: Parse ISO-8601 Duration ==============
    function parseDuration(isoDuration) {
        // Example: PT1H20M30S
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
        const matches = isoDuration.match(regex);

        const hours = parseInt(matches[1] || 0);
        const minutes = parseInt(matches[2] || 0);
        const seconds = parseInt(matches[3] || 0);

        return (hours * 3600) + (minutes * 60) + seconds;
    }

    // ============== PHASE 5: Calculate Total Duration ==============
    function calculateTotalDuration(durations) {
        return durations.reduce((total, duration) => {
            return total + parseDuration(duration);
        }, 0);
    }

    function secondsToHMS(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return `${hours}h ${minutes}m ${seconds}s`;
    }

    function displayTotalDuration(seconds) {
        document.getElementById("total-duration").textContent = secondsToHMS(seconds);
    }

    // ============== PHASE 6: Playback Speed Calculations ==============
    function calculateWatchTime(totalSeconds, speed) {
        if (speed <= 0) return "0h 0m 0s";
        return secondsToHMS(totalSeconds / speed);
    }

    function displayWatchTimes(totalSeconds) {
        document.getElementById("watch-time-125x").textContent = calculateWatchTime(totalSeconds, 1.25);
        document.getElementById("watch-time-15x").textContent = calculateWatchTime(totalSeconds, 1.5);
        document.getElementById("watch-time-175x").textContent = calculateWatchTime(totalSeconds, 1.75);
        document.getElementById("watch-time-2x").textContent = calculateWatchTime(totalSeconds, 2);
    }

    // ============== PHASE 7: Custom Speed (Event Listener) ==============
    document.getElementById("custom-speed").addEventListener("change", () => {
        updateDailyWatchPlan();
    });

    // ============== PHASE 8: Daily Watch Plan ==============
    function setupDailyWatchPlanListeners() {
        document.getElementById("daily-minutes").addEventListener("change", updateDailyWatchPlan);
        document.getElementById("daily-speed").addEventListener("change", updateDailyWatchPlan);
    }

    function calculateDaysToFinish(totalSeconds, minutesPerDay, speed) {
        if (minutesPerDay <= 0 || speed <= 0) return 0;

        const secondsPerDay = (minutesPerDay * 60) * speed;
        return Math.ceil(totalSeconds / secondsPerDay);
    }

    function updateDailyWatchPlan() {
        if (currentTotalSeconds === 0) return;

        const minutesPerDay = parseInt(document.getElementById("daily-minutes").value) || 30;
        const speed = parseFloat(document.getElementById("daily-speed").value) || 1;

        const days = calculateDaysToFinish(currentTotalSeconds, minutesPerDay, speed);
        document.getElementById("finish-days").textContent = days;
    }

    // ============== PHASE 11: Loading State ==============
    function setLoading(loading) {
        isLoading = loading;
        if (loading) {
            calculateBtn.disabled = true;
            calculateBtn.textContent = "Analyzing...";
        } else {
            calculateBtn.disabled = false;
            calculateBtn.textContent = "Analyze";
        }
    }

    // ============== FEATURE 1: View All Videos ==============
    const viewAllBtn = document.getElementById("view-all-btn");
    const videoListContainer = document.getElementById("video-list-container");
    const videoListDiv = document.getElementById("video-list");

    let isVideoListVisible = false;

    viewAllBtn.addEventListener("click", (e) => {
        e.preventDefault();
        isVideoListVisible = !isVideoListVisible;
        
        if (isVideoListVisible) {
            displayVideoList();
            videoListContainer.classList.remove("hidden");
            updateViewAllButtonText(true);
        } else {
            videoListContainer.classList.add("hidden");
            updateViewAllButtonText(false);
        }
    });

    function displayVideoList() {
        videoListDiv.innerHTML = "";

        currentVideosData.forEach((video, index) => {
            const durationFormatted = secondsToHMS(parseDuration(video.duration));
            
            const videoItem = document.createElement("div");
            videoItem.className = "text-xs text-gray-400 py-2 border-b border-gray-800 last:border-b-0";
            videoItem.textContent = `${index + 1}. ${video.title} - ${durationFormatted}`;
            
            videoListDiv.appendChild(videoItem);
        });
    }

    function updateViewAllButtonText(isVisible) {
        const videoCount = currentVideosData.length;
        if (isVisible) {
            viewAllBtn.textContent = `> Hide videos`;
        } else {
            viewAllBtn.textContent = `> View all ${videoCount} videos`;
        }
    }

    // ============== FEATURE 2: Share Results ==============
    const shareBtn = document.getElementById("share-btn");

    shareBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        
        try {
            const summary = generateShareSummary();

            // Try Web Share API first
            if (navigator.share) {
                await navigator.share({
                    title: "YouTube Playlist Calculator",
                    text: summary
                });
                console.log("Results shared successfully!");
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(summary);
                alert("Results copied to clipboard!");
            }
        } catch (error) {
            console.error("Share error:", error);
        }
    });

    function generateShareSummary() {
        const playlistTitle = document.getElementById("playlist-title").textContent;
        const channelName = document.getElementById("artist-name").textContent;
        const videoCount = currentVideosData.length;
        const totalDuration = document.getElementById("total-duration").textContent;
        const time125x = document.getElementById("watch-time-125x").textContent;
        const time15x = document.getElementById("watch-time-15x").textContent;
        const time175x = document.getElementById("watch-time-175x").textContent;
        const time2x = document.getElementById("watch-time-2x").textContent;

        return `Playlist: ${playlistTitle}\nChannel: ${channelName}\n\nVideos: ${videoCount}\nDuration: ${totalDuration}\n\nWatch Time:\n1.25x: ${time125x}\n1.5x: ${time15x}\n1.75x: ${time175x}\n2x: ${time2x}`;
    }

    // ============== FEATURE 3: Export Excel ==============
    const exportBtn = document.getElementById("export-btn");

    exportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        try {
            exportToExcel();
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export. Please try again.");
        }
    });

    function exportToExcel() {
        if (!window.XLSX) {
            alert("Excel export library not loaded. Please refresh the page and try again.");
            return;
        }

        const playlistTitle = document.getElementById("playlist-title").textContent;
        const channelName = document.getElementById("artist-name").textContent;
        const videoCount = currentVideosData.length;
        const totalDuration = document.getElementById("total-duration").textContent;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ["Playlist Analysis Summary"],
            [],
            ["Playlist Name", playlistTitle],
            ["Channel Name", channelName],
            ["Total Videos", videoCount],
            ["Total Duration", totalDuration],
            ["Watch Time @ 1.25x", document.getElementById("watch-time-125x").textContent],
            ["Watch Time @ 1.5x", document.getElementById("watch-time-15x").textContent],
            ["Watch Time @ 1.75x", document.getElementById("watch-time-175x").textContent],
            ["Watch Time @ 2x", document.getElementById("watch-time-2x").textContent],
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

        // Videos sheet
        const videosData = [
            ["Video Number", "Video Title", "Duration", "Video URL"]
        ];

        currentVideosData.forEach((video, index) => {
            const durationFormatted = secondsToHMS(parseDuration(video.duration));
            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
            
            videosData.push([
                index + 1,
                video.title,
                durationFormatted,
                videoUrl
            ]);
        });

        const videosSheet = XLSX.utils.aoa_to_sheet(videosData);
        // Set column widths
        videosSheet["!cols"] = [
            { wch: 12 },
            { wch: 40 },
            { wch: 12 },
            { wch: 50 }
        ];

        XLSX.utils.book_append_sheet(wb, videosSheet, "Videos");

        // Save file
        XLSX.writeFile(wb, "playlist-analysis.xlsx");
        console.log("Excel file exported successfully!");
    }

    // ============== Utility Functions ==============
    function getPlaylistId(url) {
        try {
            const objurl = new URL(url);
            return objurl.searchParams.get("list");
        } catch (error) {
            return null;
        }
    }

    // ============== PHASE 12: Error Handling ==============
    function showError(error) {
        const errorMessage = error.message || "An unexpected error occurred. Please try again.";
        console.error(`Error: ${errorMessage}`);
        alert(`Error: ${errorMessage}`);
    }

    // Toggle advanced options
    advanceT.addEventListener("click", (e)=>{
        e.preventDefault();
        advance.classList.toggle("hidden");
    });
        
});
