import GameStart from "../components/GameStart";
import Settings from "../components/Settings";

class Listeners {
    public mount: HTMLElement;

    constructor(mount: HTMLElement) {
        this.mount = mount
    }

    public StartScreenListeners(): void {
        const startBtn = document.querySelector('.start-btn');
        const settingsBtn = document.querySelector('.settings-btn');

        startBtn?.addEventListener('click', () => {
            GameStart.mount(this.mount)

            const backBtn = document.querySelector('.back-btn');

            backBtn?.addEventListener('click', () => {
                window.location.reload()
            })
        })

        settingsBtn?.addEventListener('click', () => {
            Settings.mount(this.mount)

            const selectEl = document.querySelector('select') as HTMLSelectElement;
            if (selectEl) {
                // Load saved difficulty
                const savedDifficulty = localStorage.getItem('difficulty') || 'easy';
                selectEl.value = savedDifficulty;

                // Save on change
                selectEl.addEventListener('change', () => {
                    localStorage.setItem('difficulty', selectEl.value);
                    console.log(`Difficulty saved as: ${selectEl.value}`);
                });
            } else {
                console.warn("Difficulty select element not found in DOM!");
            }

            const backBtn = document.querySelector('.back-btn');

            backBtn?.addEventListener('click', () => {
                window.location.reload()
            })
        })
    }
}

export default Listeners