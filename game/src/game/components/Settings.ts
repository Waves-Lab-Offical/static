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

const Settings = new VirtualDocument(InitialPoint, RootMain);

// Title
const TitleText = Settings.createElement('h1');
TitleText.addClass('text-white text-4xl font-bold mb-8');
TitleText.text('Static Settings');

// Button styles
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

// Back button
const BackBtn = Settings.createElement('button');
BackBtn.addClass(`back-btn mb-6 ${ButtonStyle['primary']}`);
BackBtn.text('Go Back');

// Difficulty label
const DifficultyLabel = Settings.createElement('label');
DifficultyLabel.addClass('text-white text-lg mt-6 mb-2');
DifficultyLabel.text('Select Difficulty:');

// Difficulty select
const DifficultySelect = Settings.createElement('select');
DifficultySelect.addClass('px-4 py-2 rounded bg-black text-white border border-gray-600');

// Options
['easy', 'hard', 'extreme'].forEach(level => {
    const option: any = Settings.createElement('option');
    option.element.value = level;
    option.text(level.charAt(0).toUpperCase() + level.slice(1));
    DifficultySelect.append(option);
});

// Append elements to virtual doc
Settings.appendChild(BackBtn);
Settings.appendChild(TitleText);
Settings.appendChild(DifficultyLabel);
Settings.appendChild(DifficultySelect);

export default Settings;