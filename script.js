// ================= 配置区域 =================
const API_BASE = 'https://mi.njuv.pp.ua'; // ⚠️ 必须是 HTTPS，末尾不要带斜杠
let PLAYLIST_ID = '26467411'; // 歌单ID，现在可以动态修改
// ===========================================

const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const cover = document.getElementById('cover');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const progress = document.getElementById('progress');
const progressContainer = document.getElementById('progress-container');
const playerContainer = document.querySelector('.player-container');
// 新增元素
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const playlistBtn = document.getElementById('playlist-btn');
const playlistContent = document.getElementById('playlist-content');
const closePlaylist = document.getElementById('close-playlist');
const playlistSongs = document.getElementById('playlist-songs');
const playlistIdInput = document.getElementById('playlist-id-input');
const switchPlaylistBtn = document.getElementById('switch-playlist-btn');
// 添加缺少的变量定义
const playlistContainer = document.querySelector('.playlist-container');

let songList = [];
let currentIndex = 0;
let isLoading = false; // 防止重复加载

// 1. 初始化：获取歌单数据
async function initPlayer(playlistId = PLAYLIST_ID) {
    if (isLoading) return;
    
    isLoading = true;
    try {
        // 更新UI状态
        title.innerText = "加载中...";
        artist.innerText = "正在获取歌单...";
        
        console.log(`正在请求歌单 ID: ${playlistId}...`);
        const res = await fetch(API_BASE + '/api/playlist?id=' + playlistId);
        const data = await res.json();

        // 解析逻辑：适配标准网易云API结构
        const tracks = data.playlist ? data.playlist.tracks : data.result.tracks;

        if (!tracks || tracks.length === 0) {
            alert("歌单为空或解析失败，请检查歌单ID是否正确");
            return;
        }

        // 更新当前歌单ID
        PLAYLIST_ID = playlistId;
        
        // 提取我们需要的信息
        songList = tracks.map(track => ({
            id: track.id,
            name: track.name,
            // 歌手可能是数组，取第一个
            artist: track.ar ? track.ar[0].name : track.artists[0].name,
            // 封面图
            cover: track.al ? track.al.picUrl : track.album.picUrl
        }));

        console.log(`加载了 ${songList.length} 首歌`);
        currentIndex = 0;
        loadUI(songList[0]); // 加载第一首的UI，但不播放
        
        // 生成歌单列表
        renderPlaylist();
        
        // 如果当前正在播放音乐，停止播放
        if (!audio.paused) {
            pauseMusic();
        }

    } catch (err) {
        console.error("初始化失败:", err);
        title.innerText = "歌单加载失败";
        artist.innerText = "请检查歌单ID和网络连接";
    } finally {
        isLoading = false;
    }
}

// 2. UI 渲染
function loadUI(song) {
    title.innerText = song.name;
    artist.innerText = song.artist;
    cover.src = song.cover;
    
    // 更新歌单中当前播放歌曲的高亮
    updateActiveSongInPlaylist();
}

// 3. 播放核心逻辑
async function playMusic() {
    const song = songList[currentIndex];
    
    try {
        console.log(`正在请求歌曲: ${song.name} (ID: ${song.id})`);
        
        // 发送请求
        const res = await fetch(API_BASE + '/api/song?id=' + song.id);
        const data = await res.json();

        // 获取 MP3 播放链接
        const playUrl = data.url ? data.url.url : null;

        if (!playUrl) {
            console.warn("无法获取播放链接（可能是VIP歌曲或无版权），自动跳下一首");
            nextMusic(); // 自动切歌
            return;
        }

        // 获取更详细的歌曲信息（可选，用于更新高清封面）
        if (data.detail && data.detail.songs && data.detail.songs[0]) {
            const detail = data.detail.songs[0];
            
            // 更新界面显示（使用高清封面）
            title.innerText = detail.name;
            artist.innerText = detail.artists[0].name;
            cover.src = detail.album.picUrl;
            
            // 某些浏览器需要这就话来触发封面旋转动画
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: detail.name,
                    artist: detail.artists[0].name,
                    artwork: [{ src: detail.album.picUrl, sizes: '300x300', type: 'image/jpeg' }]
                });
            }
        }
        
        // 只有当URL改变时才重置src
        if(audio.src !== playUrl) {
            audio.src = playUrl;
        }
        
        // 播放
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // 播放成功
                    playerContainer.classList.add('playing');
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => {
                    console.error("自动播放被浏览器拦截，需要用户点击:", error);
                });
        }

    } catch (err) {
        console.error("播放请求失败:", err);
    }
}

// 暂停
function pauseMusic() {
    audio.pause();
    playerContainer.classList.remove('playing');
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
}

// 切歌
function prevMusic() {
    currentIndex--;
    if (currentIndex < 0) currentIndex = songList.length - 1;
    playMusic();
}

function nextMusic() {
    currentIndex++;
    if (currentIndex > songList.length - 1) currentIndex = 0;
    playMusic();
}

// 进度条更新
function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    const percent = (currentTime / duration) * 100;
    progress.style.width = `${percent}%`;
}

// 点击进度条
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
}

// 音量控制
function updateVolume() {
    audio.volume = volumeSlider.value;
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const volume = audio.volume;
    if (volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute volume-icon';
    } else if (volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down volume-icon';
    } else {
        volumeIcon.className = 'fas fa-volume-up volume-icon';
    }
}

// 切换静音
function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.muted) {
        volumeIcon.className = 'fas fa-volume-mute volume-icon';
    } else {
        updateVolumeIcon();
    }
}

// 歌单相关功能
function togglePlaylist() {
    playlistContent.classList.toggle('show');
}

function closePlaylistMenu() {
    playlistContent.classList.remove('show');
}

function renderPlaylist() {
    playlistSongs.innerHTML = '';
    songList.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = `playlist-song ${index === currentIndex ? 'active' : ''}`;
        songElement.innerHTML = `
            <div class="song-info">
                <div class="song-name">${song.name}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <span class="song-index">${index + 1}</span>
        `;
        songElement.addEventListener('click', () => {
            if (index !== currentIndex) {
                currentIndex = index;
                playMusic();
            }
        });
        playlistSongs.appendChild(songElement);
    });
}

function updateActiveSongInPlaylist() {
    const songs = playlistSongs.querySelectorAll('.playlist-song');
    songs.forEach((song, index) => {
        if (index === currentIndex) {
            song.classList.add('active');
        } else {
            song.classList.remove('active');
        }
    });
}

// 切换歌单ID
function switchPlaylist() {
    const newPlaylistId = playlistIdInput.value.trim();
    if (!newPlaylistId || !/^\d+$/.test(newPlaylistId)) {
        alert('请输入有效的歌单ID（数字）');
        return;
    }
    
    // 关闭歌单菜单（如果打开）
    closePlaylistMenu();
    
    // 初始化新的歌单
    initPlayer(newPlaylistId);
}

// 事件监听
playBtn.addEventListener('click', () => {
    const isPlaying = playerContainer.classList.contains('playing');
    isPlaying ? pauseMusic() : playMusic();
});

prevBtn.addEventListener('click', prevMusic);
nextBtn.addEventListener('click', nextMusic);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('ended', nextMusic); // 自动下一首
progressContainer.addEventListener('click', setProgress);

// 音量控制事件
volumeSlider.addEventListener('input', updateVolume);
volumeIcon.addEventListener('click', toggleMute);

// 歌单事件
playlistBtn.addEventListener('click', togglePlaylist);
closePlaylist.addEventListener('click', closePlaylistMenu);

// 切换歌单事件
switchPlaylistBtn.addEventListener('click', switchPlaylist);
playlistIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        switchPlaylist();
    }
});

// 点击歌单外部关闭歌单
// 修复：添加空值检查，防止playlistContainer不存在时出错
document.addEventListener('click', (e) => {
    if (playlistContainer && !playlistContainer.contains(e.target) && !playlistBtn.contains(e.target)) {
        closePlaylistMenu();
    }
});

// 初始化音量
function initVolume() {
    audio.volume = volumeSlider.value;
    updateVolumeIcon();
}

// 启动！
initVolume();
initPlayer();
