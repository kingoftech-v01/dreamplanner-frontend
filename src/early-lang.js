// Early language detection — runs before React to set the correct lang attribute.
(function() {
  try {
    var lang = localStorage.getItem("dp-language");
    if (lang) document.documentElement.lang = lang;
  } catch(e) {}
})();
