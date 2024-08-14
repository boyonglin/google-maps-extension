// Wrapping in a function to not leak/modify variables if the script
(function() {
    if ( typeof window.TME == "object"){
      if ( typeof window.TME.eject == "function" ){
        window.TME.eject();
      }
    }
  })(); // <-- Invoke function. The return value is passed back to executeScript
