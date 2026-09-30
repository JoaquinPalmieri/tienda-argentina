var lottiePlayerLoaded = false;

function loadElementorLottiePlayer() {
    if(!lottiePlayerLoaded){
        $.getScript("https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js", function(data, textStatus, jqxhr) {
            console.log('Lottie player loaded');
            $.getScript("https://unpkg.com/@lottiefiles/lottie-interactivity@latest/dist/lottie-interactivity.min.js", function(data, textStatus, jqxhr) {
                var event = new CustomEvent("lottieLoaded");
                document.dispatchEvent(event);
            });
        });
    }
    lottiePlayerLoaded = true;
}

