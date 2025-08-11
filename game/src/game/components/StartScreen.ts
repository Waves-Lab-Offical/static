import VirtualDocument from "../../utils/Document";

const InitialPoint = `
<div 
    id="root"
    class="h-screen w-screen flex flex-col justify-center items-center text-center relative overflow-hidden"
>
    <!-- Video background -->
    <video 
        autoplay 
        loop 
        muted 
        playsinline 
        class="absolute top-0 left-0 w-full h-full object-cover -z-10"
    >
        <source src="/assets/bg.mp4" type="video/mp4">
        Your browser does not support the video tag.
    </video>
</div>
    `;

const RootMain = '#root';

const StartScreen = new VirtualDocument(InitialPoint, RootMain);

const TitleStyle = `
        text-white
        mb-12 font-semibold
        text-[58px]
    `

const ButtonStyle = {
    primary: `
            flex items-center justify-center
            px-6 py-3
            font-bold uppercase tracking-wider
            rounded-md
            bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]
            text-red-500
            border border-red-700
            shadow-lg shadow-red-900/40
            hover:from-[#2a0000] hover:to-[#1a0000]
            hover:text-red-400
            active:scale-95
            transition-all duration-200 ease-in-out
        `,
    secondary: `
            flex items-center justify-center
            px-6 py-3
            font-semibold tracking-wide
            rounded-md
            bg-gradient-to-b from-[#111] to-[#000]
            text-gray-300
            border border-gray-700
            shadow-md shadow-black/50
            hover:from-[#222] hover:to-[#111]
            hover:text-white
            active:scale-95
            transition-all duration-200 ease-in-out
        `
};

const TitleText = StartScreen.createElement('h1')

TitleText.addClass(TitleStyle)
TitleText.text('Static')

const Startbutton = StartScreen.createElement('button');

Startbutton.addClass(`${ButtonStyle['primary']} start-btn`);
Startbutton.text('Start')

const Settingsbutton = StartScreen.createElement('button');

Settingsbutton.addClass(`${ButtonStyle['secondary']} settings-btn`);
Settingsbutton.text('Settings')

const Buttons = StartScreen.createElement('div')

Buttons.addClass('flex justify-center items-center gap-4')

Buttons.append(Startbutton)
Buttons.append(Settingsbutton)

StartScreen.appendChild(TitleText)
StartScreen.appendChild(Buttons)

export default StartScreen