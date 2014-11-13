chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create("index.html#/login",
    {  frame: "none",
       id: "mesh1",
       innerBounds: {
         width: screen.width/2,
         height: screen.height/2,
         left: 300,
         minWidth: 220,
         minHeight: 220
      }
    }
  );
});