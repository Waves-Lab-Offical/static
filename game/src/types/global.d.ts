export {};

declare global {
	interface Window {
		api: {
			platform: () => Promise<string>;
			exit: () => never;
		};
	}
}
