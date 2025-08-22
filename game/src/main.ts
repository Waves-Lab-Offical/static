import Game from './Game';
import './style.css';

class Main {
    public static canvas: HTMLCanvasElement;

    public static async main(args: string[]): Promise<void> {
        if (!args || args.length < 1) {
            throw new Error('Could not Determine the Canvas to Context.');
        }

        const Titles = {
            'win32': 'Static Windows Version',
            'linux': 'Static Linux Version',
            'darwin': 'Static MacOS Version'
        };

        const os = await window.api.platform() as keyof typeof Titles;

        const titleElement = document.querySelector('title');

        if (titleElement) {
            titleElement.innerHTML = Titles[os];
        }

        document.querySelector('.play-button')?.addEventListener('click', () => {
            this.startGame();
        });
    }

    public static startGame() {
        document.querySelector('.home-screen')?.remove();
        const canvas = document.querySelector('canvas');

        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            canvas.style.background = '#000';

            this.canvas = canvas;

            const game = new Game(canvas);

            game.init();
        }
    }
}

Main.main(['canvas']);