(function(document){
    function highlight(event){
        var nodes = document.querySelectorAll('pre code');
        for (var i = 0, l = nodes.length; i < l; i++) {
            var element = nodes[i];
            hljs.highlightBlock(element);
            RevealCodeFocus();
        }
    }

    if(Reveal.isReady()){
        highlight();
    } else {
        Reveal.addEventListener('ready', highlight, false);
    }
})(document);
