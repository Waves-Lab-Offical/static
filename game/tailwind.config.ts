// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        // include .ts so Tailwind will scan plain TypeScript files for literal class strings
        "./src/**/*.{html,js,ts,jsx,tsx}",
        "./index.html",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};

export default config;