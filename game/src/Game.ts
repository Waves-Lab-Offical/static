class Game {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.gl = this.canvas.getContext('webgl2') as WebGL2RenderingContext;

        if (!this.gl) {
            throw new Error('WebGL is Not Supported in your Browser or System, Could be due to mofiying the Runtime.');
        }

        this.init();
        this.loop();
    }

    public init(): void {
        // This is Ran Once
    }

    public loop(): never {
        // this ran every frame after init
        while (true) {
            // Code here
        }
    }
}

export default Game;