// ================= 配置区域 =================  
const API_BASE = 'https://mi.njuv.pp.ua'; // ⚠️ 必须是 HTTPS，末尾不要带斜杠  
const PLAYLIST_ID = '26467411'; // 你的歌单ID  
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
  
let songList = [];  
let currentIndex = 0;  
  
// 1. 初始化：获取歌单数据  
async function initPlayer() {  
    try {  
        console.log('正在请求歌单...');  
        const res = await fetch(`$${API_BASE}/api/playlist?id=$${PLAYLIST_ID}`);  
        const data = await res.json();  
  
        // 解析逻辑：适配标准网易云API结构  
        // 如果你的API返回结构不同，请在这里调整  
        // 通常结构是 data.playlist.tracks 或 data.result.tracks  
        const tracks = data.playlist ? data.playlist.tracks : data.result.tracks;  
  
        if (!tracks || tracks.length === 0) {  
            alert("歌单为空或解析失败，请检查控制台");  
            return;  
        }  
  
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
        loadUI(songList[0]); // 加载第一首的UI，但不播放  
  
    } catch (err) {  
        console.error("初始化失败:", err);  
        title.innerText = "API 连接失败";  
        artist.innerText = "请检查 HTTPS 和 CORS";  
    }  
}  
  
// 2. UI 渲染  
function loadUI(song) {  
    title.innerText = song.name;  
    artist.innerText = song.artist;  
    cover.src = song.cover;  
}  
  
// 3. 播放核心逻辑：获取 MP3 链接  
async function playMusic() {  
    const song = songList[currentIndex];  
      
    // UI 切换为加载状态  
    loadUI(song);  
      
    try {  
        // 请求歌曲详情接口获取真实 URL  
        const res = await fetch(`$${API_BASE}/api/song?id=$${song.id}`);  
        const data = await res.json();  
          
        // 通常结构是 data.data[0].url  
        const playUrl = data.data[0].url;  
  
        if (!playUrl) {  
            console.warn("该歌曲无版权或VIP限制，自动跳下一首");  
            nextMusic();  
            return;  
        }  
  
        // 只有当URL改变时才重置src，避免重复加载  
        if(audio.src !== playUrl) {  
            audio.src = playUrl;  
        }  
          
        audio.play();  
        playerContainer.classList.add('playing');  
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';  
  
    } catch (err) {  
        console.error("获取歌曲URL失败:", err);  
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
  
// 启动！  
initPlayer();  
