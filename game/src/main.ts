import Main from './game/App';
import './style.css';

if (!localStorage.getItem('difficulty')) {
    localStorage.setItem('difficulty', 'easy')
    console.log('LocalStorage has no member \'difficulty\' resolving to \'easy\'')
}

const audio: any = document.getElementById('bg-audio');

audio.volume = 0.1
audio.play().catch((err: any) => console.error('Audio play blocked:', err));

let Platform: string;

(async () => {
    const isdev = await window.api.isdev();

    if (!isdev) {
        document.querySelector('.stats_menu').remove()
    }
    
    Platform = await window.api.platform();
    const mainDraw: HTMLDivElement = document.querySelector('#app');
    Main(Platform, mainDraw, document);
})();