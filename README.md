# YouTube Playlist Calculator

A web application that analyzes YouTube playlists and calculates total watch time across different playback speeds.

## Features

### Playlist Analysis

* Extract playlist information from a YouTube playlist URL
* Display playlist title and channel name
* Count total videos in the playlist
* Calculate total playlist duration

### Watch Time Calculator

Calculate how long it will take to finish a playlist at:

* 1.25x speed
* 1.5x speed
* 1.75x speed
* 2x speed
* Custom playback speed

### Advanced Features

* Analyze a specific range of videos
* Daily watch plan calculator
* View all playlist videos
* Share playlist analysis
* Export playlist data to Excel

### Smart Handling

* Supports large playlists through pagination
* Error handling for invalid URLs and API failures
* Responsive UI
* Enter key support
* Loading states and validation

---

## Built With

* HTML5
* Tailwind CSS
* Vanilla JavaScript (ES6+)
* YouTube Data API v3
* SheetJS (Excel Export)

---

## Preview

Paste a YouTube playlist URL and instantly see:

* Playlist information
* Total duration
* Watch time at different speeds
* Daily completion estimates
* Full video breakdown

---

## Project Structure

```text
youtube-playlist-calculator/
│
├── index.html
├── script.js
├── README.md
```

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/youtube-playlist-calculator.git
```

### 2. Open the Project

Open the folder in VS Code.

### 3. Configure API Key

Create a YouTube Data API v3 key from Google Cloud Console.

Replace:

```javascript
const API_KEY = "YOUR_API_KEY";
```

with your own API key.

### 4. Run

Use Live Server or any local server.

---

## YouTube API

This project uses the YouTube Data API v3 to:

* Fetch playlist metadata
* Retrieve playlist videos
* Get video duration information

Documentation:

https://developers.google.com/youtube/v3

---

## Learning Outcomes

This project demonstrates:

* Async JavaScript
* Fetch API
* REST APIs
* Pagination handling
* DOM manipulation
* Error handling
* Data transformation
* Time calculations
* Excel export functionality

---

## Future Improvements

* Playlist thumbnail support
* Dark / Light mode toggle
* PDF export
* Watch progress tracking
* Playlist comparison
* Drag-and-drop URL input
