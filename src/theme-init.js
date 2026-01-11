// Prevent FOUC (Flash of Unstyled Content)
(function () {
  const savedTheme = localStorage.getItem('theme') || 'dark'; // Dark default
  document.documentElement.setAttribute('data-theme', savedTheme);
})();
