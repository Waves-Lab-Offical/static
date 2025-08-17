import Game from "../components/Game";
import GameStart from "../components/GameStart";
import Settings from "../components/Settings";
import GameController from "../controllers/MainController";

class Listeners {
    public mount: HTMLElement;

    constructor(mount: HTMLElement) {
        this.mount = mount
    }

    public GameListen(): void {
        const canvas: HTMLCanvasElement = document.querySelector('.canvas')

        new GameController(canvas)
    }

    public StartScreenListeners(): void {
        const startBtn = document.querySelector('.start-btn');
        const settingsBtn = document.querySelector('.settings-btn');

        startBtn?.addEventListener('click', (): void => {
            GameStart.mount(this.mount);

            const playBtn: HTMLElement = document.querySelector('.play-btn')

            const backBtn: HTMLElement = document.querySelector('.back-btn');

            backBtn?.addEventListener('click', (): void => {
                window.location.reload();
            });

            playBtn?.addEventListener('click', async (): Promise<void> => {
                if (window.confirm('WARNING: CONTENT DISCLAIMER\n\nThis game contains intense horror themes, including graphic violence, blood, and disturbing imagery. It may not be suitable for all players, especially those sensitive to such content. Player discretion is strongly advised.\nBy continuing, you acknowledge that you understand and accept the mature and potentially unsettling nature of this experience.')) {
                    Game.mount(this.mount);

                    this.GameListen();

                    localStorage.setItem('days', '5');
                } else {
                    if (window.confirm('Do you want to exit')) {
                        window.api.exit();
                    } else {
                        return;
                    }
                }
            });
        });

        settingsBtn?.addEventListener('click', (): void => {
            Settings.mount(this.mount);

            const selectEl = document.querySelector('select') as HTMLSelectElement;
            if (selectEl) {
                // Load saved difficulty
                const savedDifficulty: string = localStorage.getItem('difficulty') || 'easy';
                selectEl.value = savedDifficulty;

                // Save on change
                selectEl.addEventListener('change', (): void => {
                    localStorage.setItem('difficulty', selectEl.value);
                });
            } else {
                console.warn("Difficulty select element not found in DOM!");
            }

            const backBtn = document.querySelector('.back-btn');

            backBtn?.addEventListener('click', (): void => {
                window.location.reload()
            });
        });
    }
}

export default Listeners;