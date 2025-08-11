import Main from './game/App';
import './style.css';

const audio: any = document.getElementById('bg-audio');

audio.volume = 0.3
audio.play().catch((err: any) => console.error('Audio play blocked:', err));

let Platform: string;

(async () => {
    Platform = await window.api.platform();
    const mainDraw: HTMLDivElement = document.querySelector('#app');
    Main(Platform, mainDraw, document);
})();