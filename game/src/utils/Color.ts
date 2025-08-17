interface ColorArgs {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
}

class Color {
    public readonly red: number;
    public readonly green: number;
    public readonly blue: number;
    public readonly alpha: number;

    /**
     * Create a color
     * - Accepts either an object `{ red, green, blue, alpha }` in 0–255 range
     * - Or separate arguments `red, green, blue, alpha`
     * - Automatically converts to WebGL-friendly 0.0–1.0 floats
     */
    constructor(red: number, green: number, blue: number, alpha?: number);
    constructor(args: ColorArgs);
    constructor(
        rOrArgs: number | ColorArgs,
        g?: number,
        b?: number,
        a?: number
    ) {
        if (typeof rOrArgs === "object") {
            // Object form
            this.red = Color.toGL(rOrArgs.red);
            this.green = Color.toGL(rOrArgs.green);
            this.blue = Color.toGL(rOrArgs.blue);
            this.alpha = Color.toGL(rOrArgs.alpha ?? 255);
        } else {
            // Separate numbers form
            this.red = Color.toGL(rOrArgs);
            this.green = Color.toGL(g ?? 0);
            this.blue = Color.toGL(b ?? 0);
            this.alpha = Color.toGL(a ?? 255);
        }
    }

    /**
     * Convert 0–255 color to 0.0–1.0 WebGL format
     */
    private static toGL(value: number): number {
        return Math.min(Math.max(value / 255, 0), 1);
    }

    /**
     * Get array format for WebGL uniform uploads
     */
    public toArray(): [number, number, number, number] {
        return [this.red, this.green, this.blue, this.alpha];
    }
}

export default Color;