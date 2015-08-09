chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create("https://cdn.rawgit.com/billou-fr/mesh2/master/app/index.html#/servers",
    {  frame: "chrome",// or "none"
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