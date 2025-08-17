import type Color from "../../utils/Color";

class Engine {
    private gl: WebGL2RenderingContext;

    public constructor(canvas: HTMLCanvasElement) {
        this.gl = (canvas.getContext('webgl2') as WebGL2RenderingContext);

        if (!this.gl) {
            throw 'WebGL 2.0 not supported!';
        }
    }

    public setBgColor(colors: Color) {
        const { red, green, blue, alpha }: Color = colors;
        this.gl.clearColor(red, green, blue, alpha);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}

export default Engine