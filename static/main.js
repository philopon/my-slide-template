(function(){
    var height = 1080;

    Reveal.initialize({
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

    var sheet = window.document.styleSheets[0];
    sheet.insertRule(
        '.reveal.overview .slides section {height: '+height+'px}',
        sheet.cssRules.length
    );
})();
