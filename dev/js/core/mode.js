<!-- partials/header.html -->
<header class="site-header" role="banner">
  <div class="header-row">
    <a class="brand" href="index.html">
      <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/></svg>
      <span class="brand-text">Infektionsdynamiken<span class="tld">.de</span></span>
    </a>

    <div class="header-actions">
      <div class="mode-toggle" id="modeToggle" role="switch" aria-checked="false" aria-label="Modus umschalten">
        <button class="toggle-option" data-mode-target="school" type="button">Schule</button>
        <div class="toggle-knob" aria-hidden="true"></div>
        <button class="toggle-option" data-mode-target="uni" type="button">Uni</button>
      </div>

      <button class="hamburger" id="navOpen" aria-label="Menü öffnen" aria-controls="navMenu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  <!-- optionaler, sachlicher Hinweis -->
  <div class="header-sub">
    <span class="chip"><strong>5</strong> interaktive Modelle</span>
    <span class="tagline">Infektionsdynamiken verstehen</span>
  </div>

  <aside class="overlay-menu" id="navMenu" hidden>
    <nav class="overlay-nav" aria-label="Hauptmenü">
      <a href="index.html">Start</a>
      <a href="modelle.html">Modelle</a>
      <a href="rechtliches.html">Rechtliches</a>
      <a href="repositorium.html">Repositorium</a>
      <a href="kontakt.html">Kontakt</a>
    </nav>
  </aside>
</header>
