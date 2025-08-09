import VirtualDocument from "../utils/Document";
import Listeners from "./Listeners/listener";

/**
 * 
 * @param platform - OS Platform like 'win32', 'linux' & 'darwin'
 * @param main - Main Root to Mout
 * @param Cdocument - Context of Main.ts Document refered
 */

function Main(platform: string, main: HTMLDivElement, Cdocument: typeof document): void {
    const OS = {
        'win32': 'Windows',
        'linux': 'Linux',
        'darwin': 'MacOS'
    }

    // Getting an Title to show the Platform

    const Title: string = `Static ${OS[platform]} Version`;

    Cdocument.querySelector('title')!.innerHTML = Title;

    const InitialPoint = `<div id="root"></div>`;

    const RootMain = '#root';

    const StartScreen = new VirtualDocument(InitialPoint, RootMain);

    const button = StartScreen.createElement('button');

    button.addClass('btn')
    button.text('Click me!')

    StartScreen.appendChild(button)

    // Check if the main exists

    if (!main) {
        throw new Error('Couldn\'t Find the Root to Mount StartScreen App.ts at line 22');
    }

    StartScreen.mount(main);

    const lsnrs = new Listeners(document.querySelector('#root'))

    lsnrs.StartScreen()
}

export default Main;