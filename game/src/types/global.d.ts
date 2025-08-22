declare global {
    interface Window {
        api: {

            platform: () => Promise<any>,
            exit: () => Promise<any>,
            isdev: () => Promise<any>
        };
    }
}

export { };