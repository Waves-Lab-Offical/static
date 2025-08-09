import Main from './game/App';
import './style.css';

let Platform: string;

(async () => {
    Platform = await window.api.platform();
    const mainDraw: HTMLDivElement = document.querySelector('#app');
    Main(Platform, mainDraw, document);
})();