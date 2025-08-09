export class VElement {
    private el: any;

    constructor(el: any) {
        this.el = el;
    }

    // Set attribute and return this for chaining
    attr(name: string, value: string): this {
        this.el.setAttribute(name, value);
        return this;
    }

    // Get attribute value
    getAttr(name: string): string | null {
        return this.el.getAttribute(name);
    }

    // Add class(es)
    addClass(...classes: string[]): this {
        this.el.classList.add(...classes);
        return this;
    }

    // Remove class(es)
    removeClass(...classes: string[]): this {
        this.el.classList.remove(...classes);
        return this;
    }

    // Toggle class
    toggleClass(className: string): this {
        this.el.classList.toggle(className);
        return this;
    }

    // Set style property
    style(prop: string, value: string): this {
        (this.el.style as any)[prop] = value;
        return this;
    }

    // Get style property
    getStyle(prop: string): string {
        return (this.el.style as any)[prop];
    }

    // Set or get text content
    text(value?: string): this | string {
        if (value === undefined) return this.el.textContent ?? "";
        this.el.textContent = value;
        return this;
    }

    // Append child VElement or HTMLElement
    append(child: VElement | HTMLElement): this {
        if (child instanceof VElement) {
            this.el.appendChild(child.el);
        } else {
            this.el.appendChild(child);
        }
        return this;
    }

    // Remove this element from parent
    remove(): void {
        this.el.remove();
    }

    // Expose the raw HTMLElement
    get element(): HTMLElement {
        return this.el;
    }
}

class VirtualDocument {
    private parser: DOMParser;
    private doc: Document;
    private rootElement: HTMLElement;

    constructor(html: string, rootSelector: string) {
        this.parser = new DOMParser();
        this.doc = this.parser.parseFromString(html, "text/html");
        const root = this.doc.querySelector(rootSelector);
        if (!root) throw new Error(`Root element '${rootSelector}' not found`);
        this.rootElement = root as HTMLElement;
    }

    get innerHTML(): string {
        return this.rootElement.innerHTML;
    }

    setInnerHTML(html: string, append = false): void {
        if (append) {
            const frag = this.doc.createRange().createContextualFragment(html);
            this.rootElement.appendChild(frag);
        } else {
            this.rootElement.innerHTML = html;
        }
    }

    createElement(tagName: string): VElement {
        const el = this.doc.createElement(tagName);
        return new VElement(el);
    }

    appendChild(child: VElement | HTMLElement): void {
        if (child instanceof VElement) {
            this.rootElement.appendChild(child.element);
        } else {
            this.rootElement.appendChild(child);
        }
    }

    removeChild(child: VElement | HTMLElement): void {
        if (child instanceof VElement) {
            this.rootElement.removeChild(child.element);
        } else {
            this.rootElement.removeChild(child);
        }
    }

    querySelector(selector: string): VElement | null {
        const el = this.rootElement.querySelector(selector);
        return el ? new VElement(el) : null;
    }

    mount(realContainer: HTMLElement): void {
        realContainer.innerHTML = "";
        realContainer.appendChild(this.rootElement.cloneNode(true));
    }
}

export default VirtualDocument