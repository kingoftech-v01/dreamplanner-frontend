// Disable pinch-to-zoom on touch devices
document.addEventListener('touchmove', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Disable double-tap zoom
var lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  var now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

// Disable Ctrl+/Ctrl- and Ctrl+scroll zoom
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) e.preventDefault();
});
document.addEventListener('wheel', function(e) {
  if (e.ctrlKey || e.metaKey) e.preventDefault();
}, { passive: false });
