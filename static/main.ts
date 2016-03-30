const height = 1080;

(Reveal as any).initialize({
    controls: false,
    slideNumber: true,
    history: true,
    center: false,
    transition: 'slide',
    transitionSpeed: 'fast',
    margin: 0,
    width: 1920,
    height: height
});

let sheet = document.styleSheets[0] as any;
sheet.insertRule(
    '.reveal.overview .slides section {height: '+height+'px}',
    sheet.cssRules.length
);
