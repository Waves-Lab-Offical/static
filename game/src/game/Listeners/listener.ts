class Listeners {
    public root: HTMLDivElement;

    constructor(CRoot: HTMLDivElement) {
        this.root = CRoot
    }

    public StartScreen() {
        const btn = document.querySelector('.btn');

        btn?.addEventListener('click', () => {
            alert('Button Clicked!')
        })
    }
}

export default Listeners