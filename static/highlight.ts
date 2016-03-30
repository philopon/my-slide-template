declare module hljs {
    function highlightBlock(element: Element): void;
}

declare function RevealCodeFocus(): void;


(() => {
    function highlight(): void {
        for (let element of document.querySelectorAll('pre code')) {
            hljs.highlightBlock(element);
        }

        for (let element of document.querySelectorAll('code.highlight')) {
            hljs.highlightBlock(element);
        }

        RevealCodeFocus();
    }

    if ((Reveal as any).isReady()) {
        highlight();
    } else {
        Reveal.addEventListener('ready', highlight, false);
    }
})();
