import vertex from '../shaders/vertex.glsl?raw'
import fragment from '../shaders/fragments.glsl?raw'
import Sound from './Sound';

class GameController {
    private canvas: HTMLCanvasElement;
    private mode: string;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.main(this.canvas, localStorage.getItem('difficulty'));
    }

    public jumpscare(): Sound {
        const difficulty_sound_map = {
            'easy': 0.3,
            'hard': 0.5,
            'extream': 1.0
        }

        const jump_scare = new Sound('/sounds/jumpscare.mp3', difficulty_sound_map[this.mode])
        jump_scare.play()

        return jump_scare
    }

    public asyncListener(mode: string | null) {
        this.mode = mode
    }

    public main(canvas: HTMLCanvasElement, mode: string | null): void {
        this.render(canvas);
        this.asyncListener(mode);
    }

    public render(canvas: HTMLCanvasElement) {
        //
    }
}

export default GameController;