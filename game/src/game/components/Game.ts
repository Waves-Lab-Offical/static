import VirtualDocument, { VElement } from "../../utils/Document";

const InitialPoint: string = `
    <div  id="root" class="bg-black h-screen w-screen flex flex-col justify-center items-center text-center relative overflow-hidden">
    </div>
`;

const RootMain: string = '#root';

const Game: VirtualDocument = new VirtualDocument(InitialPoint, RootMain);

const canvas: VElement = Game.createElement('canvas')

/**
   *@desc So Now Our Canvas has been virtualized
*/

canvas.addClass('canvas w-screen h-screen relative overflow-hidden')

Game.appendChild(canvas)

export default Game