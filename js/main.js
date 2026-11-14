/* ============================================================
   Nicolás Reyes — Chef privado
   Interacciones: intro, reveals, menú móvil, tabs, lightbox,
   testimonios, formulario y microinteracciones.
   ============================================================ */

(function () {
  'use strict';

  var docEl = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ----------------------------------------------------------
     Bloqueo de scroll compartido (menú móvil y lightbox)
     ---------------------------------------------------------- */

  var locks = new Set();

  function lockScroll(key) {
    locks.add(key);
    body.classList.add('is-locked');
  }

  function unlockScroll(key) {
    locks.delete(key);
    if (!locks.size) body.classList.remove('is-locked');
  }

  /* ----------------------------------------------------------
     Intro cinematográfica
     ---------------------------------------------------------- */

  var intro = $('#intro');
  var introDone = false;
  var introTimer = null;
  var revealStarted = false;

  function onIntroKey() { finishIntro(); }

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    if (introTimer) clearTimeout(introTimer);

    document.removeEventListener('keydown', onIntroKey);
    if (intro) {
      intro.removeEventListener('wheel', finishIntro);
      intro.removeEventListener('touchmove', finishIntro);
      intro.removeEventListener('click', onIntroClick);
      intro.classList.add('is-leaving');
    }

    body.classList.remove('is-intro');

    window.setTimeout(startReveals, 220);
    window.setTimeout(function () {
      if (intro) intro.style.display = 'none';
    }, 1000);
  }

  function onIntroClick(e) {
    if (e.target.closest('.intro__skip')) return;
    finishIntro();
  }

  if (intro) {
    body.classList.remove('is-locked');
    body.classList.add('is-intro');

    intro.addEventListener('click', onIntroClick);
    intro.addEventListener('wheel', finishIntro, { passive: true });
    intro.addEventListener('touchmove', finishIntro, { passive: true });
    document.addEventListener('keydown', onIntroKey);

    var skip = $('#introSkip');
    if (skip) skip.addEventListener('click', finishIntro);

    introTimer = window.setTimeout(finishIntro, reduceMotion ? 600 : 2800);

    // Red de seguridad: nunca dejar la portada bloqueada.
    window.setTimeout(function () {
      body.classList.remove('is-locked');
      if (!introDone) finishIntro();
    }, 6000);
  } else {
    body.classList.remove('is-locked');
    window.setTimeout(startReveals, 60);
  }

  /* ----------------------------------------------------------
     Header, progreso y navegación activa
     ---------------------------------------------------------- */

  var header = $('#header');
  var progress = $('#progress');
  var navLinks = $$('.nav__link');
  var sectionIds = ['inicio', 'sobre-mi', 'experiencias', 'menu', 'galeria', 'contacto'];
  var lastY = window.pageYOffset;
  var scrollTicking = false;

  function onScrollFrame() {
    var y = window.pageYOffset;
    var docHeight = docEl.scrollHeight - window.innerHeight;

    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      var goingDown = y > lastY + 2;
      var goingUp = y < lastY - 2;
      var menuOpen = body.classList.contains('is-locked');

      if (goingDown && y > 420 && !menuOpen) {
        header.classList.add('is-hidden');
      } else if (goingUp || y < 420) {
        header.classList.remove('is-hidden');
      }
    }

    if (progress) {
      var pct = docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0;
      progress.style.width = (pct * 100).toFixed(2) + '%';
      progress.classList.toggle('is-visible', y > 80);
    }

    if (navLinks.length) {
      var current = '';
      for (var i = 0; i < sectionIds.length; i++) {
        var section = document.getElementById(sectionIds[i]);
        if (section && section.getBoundingClientRect().top <= 140) {
          current = sectionIds[i];
        }
      }
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + current);
      });
    }

    // Parallax suave del hero (solo escritorio y sin movimiento reducido).
    if (heroMedia && !reduceMotion && window.innerWidth > 900) {
      var offset = Math.min(y, window.innerHeight) * 0.18;
      heroMedia.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    }

    lastY = y;
    scrollTicking = false;
  }

  var heroMedia = $('#heroMedia');

  function requestScrollFrame() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(onScrollFrame);
  }

  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  window.addEventListener('resize', requestScrollFrame);

  /* ----------------------------------------------------------
     Menú móvil
     ---------------------------------------------------------- */

  var burger = $('#burger');
  var mobileNav = $('#mobileNav');
  var mobileOpen = false;

  function setMobileNav(open) {
    if (!burger || !mobileNav) return;
    mobileOpen = open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mobileNav.classList.toggle('is-open', open);
    mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      lockScroll('mobile');
      header && header.classList.remove('is-hidden');
    } else {
      unlockScroll('mobile');
    }
  }

  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      setMobileNav(!mobileOpen);
    });

    $$('a', mobileNav).forEach(function (link) {
      link.addEventListener('click', function () {
        setMobileNav(false);
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && mobileOpen) setMobileNav(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileNav(false);
        burger.focus();
      }
    });
  }

  /* ----------------------------------------------------------
     Reveals al hacer scroll + contadores
     ---------------------------------------------------------- */

  var revealEls = $$('.reveal');
  var numberFmt = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el) {
    if (el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';

    var target = Number(el.getAttribute('data-count')) || 0;
    if (reduceMotion || target <= 0) {
      el.textContent = numberFmt.format(target);
      return;
    }

    var duration = 1500;
    var start = null;

    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      el.textContent = numberFmt.format(Math.round(target * easeOutCubic(t)));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = numberFmt.format(target);
      }
    }

    window.requestAnimationFrame(step);
  }

  function startReveals() {
    if (revealStarted) return;
    revealStarted = true;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
      $$('[data-count]').forEach(animateCount);
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });

    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    $$('[data-count]').forEach(function (el) { countObserver.observe(el); });
  }

  /* ----------------------------------------------------------
     Botones magnéticos
     ---------------------------------------------------------- */

  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();
        var dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        var dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        var max = 7;
        el.style.transform = 'translate(' + (dx * max).toFixed(2) + 'px,' + (dy * max).toFixed(2) + 'px)';
      });

      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ----------------------------------------------------------
     Tabs del menú
     ---------------------------------------------------------- */

  var tabs = $$('.tab');
  var panels = $$('.menu__list');

  function activateTab(tab, focus) {
    if (!tab) return;
    var target = tab.getAttribute('data-tab');

    tabs.forEach(function (t) {
      var active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });

    panels.forEach(function (panel) {
      var active = panel.id === 'panel-' + target;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activateTab(tab); });

    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        activateTab(next, true);
      }
    });
  });

  /* ----------------------------------------------------------
     Galería / Lightbox
     ---------------------------------------------------------- */

  var shots = $$('.shot');
  var lightbox = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCaption = $('#lbCaption');
  var lbClose = $('#lbClose');
  var lbPrev = $('#lbPrev');
  var lbNext = $('#lbNext');
  var lbIndex = 0;
  var lbOpen = false;
  var lastFocused = null;
  var touchStartX = 0;
  var touchStartY = 0;

  function renderLightbox(index) {
    if (!shots.length || !lbImg) return;
    lbIndex = (index + shots.length) % shots.length;
    var shot = shots[lbIndex];
    var img = $('img', shot);
    var full = shot.getAttribute('data-full') || (img ? img.src : '');
    var caption = shot.getAttribute('data-caption') || (img ? img.alt : '');

    lbImg.src = full;
    lbImg.alt = img ? img.alt : caption;
    if (lbCaption) lbCaption.textContent = caption ? caption + ' · ' + (lbIndex + 1) + '/' + shots.length : '';
  }

  function openLightbox(index) {
    if (!lightbox) return;
    lastFocused = document.activeElement;
    renderLightbox(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lbOpen = true;
    lockScroll('lightbox');
    if (lbClose) window.setTimeout(function () { lbClose.focus(); }, 60);
  }

  function closeLightbox() {
    if (!lightbox || !lbOpen) return;
    lbOpen = false;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    unlockScroll('lightbox');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  shots.forEach(function (shot, index) {
    shot.addEventListener('click', function () { openLightbox(index); });
  });

  if (lightbox) {
    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbPrev) lbPrev.addEventListener('click', function () { renderLightbox(lbIndex - 1); });
    if (lbNext) lbNext.addEventListener('click', function () { renderLightbox(lbIndex + 1); });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (!lbOpen) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') renderLightbox(lbIndex - 1);
      else if (e.key === 'ArrowRight') renderLightbox(lbIndex + 1);
    });

    lightbox.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - touchStartX;
      var dy = t.clientY - touchStartY;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy)) {
        renderLightbox(lbIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Slider de testimonios
     ---------------------------------------------------------- */

  var quotes = $$('.quote');
  var quotePrev = $('#quotePrev');
  var quoteNext = $('#quoteNext');
  var quoteDots = $('#quoteDots');
  var quotesStage = $('#quotes');
  var quoteIndex = 0;
  var quoteTimer = null;
  var quoteDotsEls = [];

  function renderQuote(index) {
    if (!quotes.length) return;
    quoteIndex = (index + quotes.length) % quotes.length;
    quotes.forEach(function (quote, i) {
      quote.classList.toggle('is-active', i === quoteIndex);
      quote.setAttribute('aria-hidden', i === quoteIndex ? 'false' : 'true');
    });
    quoteDotsEls.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === quoteIndex);
      dot.setAttribute('aria-current', i === quoteIndex ? 'true' : 'false');
    });
  }

  function stopQuoteTimer() {
    if (quoteTimer) {
      window.clearInterval(quoteTimer);
      quoteTimer = null;
    }
  }

  function startQuoteTimer() {
    if (reduceMotion || quotes.length < 2) return;
    stopQuoteTimer();
    quoteTimer = window.setInterval(function () {
      if (document.hidden) return;
      renderQuote(quoteIndex + 1);
    }, 7000);
  }

  if (quotes.length) {
    if (quoteDots) {
      quotes.forEach(function (quote, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'quote-dot';
        dot.setAttribute('aria-label', 'Ver testimonio ' + (i + 1));
        dot.addEventListener('click', function () {
          renderQuote(i);
          startQuoteTimer();
        });
        quoteDots.appendChild(dot);
        quoteDotsEls.push(dot);
      });
    }

    renderQuote(0);

    if (quotePrev) quotePrev.addEventListener('click', function () {
      renderQuote(quoteIndex - 1);
      startQuoteTimer();
    });

    if (quoteNext) quoteNext.addEventListener('click', function () {
      renderQuote(quoteIndex + 1);
      startQuoteTimer();
    });

    if (quotesStage) {
      quotesStage.addEventListener('pointerenter', stopQuoteTimer);
      quotesStage.addEventListener('pointerleave', startQuoteTimer);
      quotesStage.addEventListener('focusin', stopQuoteTimer);
      quotesStage.addEventListener('focusout', startQuoteTimer);

      quotesStage.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
      }, { passive: true });

      quotesStage.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
          renderQuote(quoteIndex + (dx < 0 ? 1 : -1));
          startQuoteTimer();
        }
      }, { passive: true });
    }

    startQuoteTimer();
  }

  /* ----------------------------------------------------------
     Formulario → WhatsApp
     ---------------------------------------------------------- */

  var form = $('#bookingForm');
  var formStatus = $('#formStatus');
  var dateInput = $('#date');

  function todayISO() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  if (dateInput) dateInput.min = todayISO();

  function fieldOf(input) { return input.closest('.field'); }

  function setFieldError(input, message) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.add('has-error');
    var slot = $('[data-error]', field);
    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'field__error';
      slot.setAttribute('data-error', '');
      field.appendChild(slot);
    }
    slot.textContent = message;
  }

  function clearFieldError(input) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.remove('has-error');
    var slot = $('[data-error]', field);
    if (slot) slot.textContent = '';
  }

  function validateForm() {
    var errors = [];
    var name = $('#name');
    var email = $('#email');
    var type = $('#type');
    var message = $('#message');
    var guests = $('#guests');

    if (!name.value.trim() || name.value.trim().length < 2) {
      setFieldError(name, 'Escribe tu nombre.');
      errors.push(name);
    }

    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.value.trim())) {
      setFieldError(email, 'Introduce un email válido.');
      errors.push(email);
    }

    if (!type.value) {
      setFieldError(type, 'Elige el tipo de experiencia.');
      errors.push(type);
    }

    if (!message.value.trim() || message.value.trim().length < 10) {
      setFieldError(message, 'Cuéntame un poco más (mínimo 10 caracteres).');
      errors.push(message);
    }

    if (guests.value) {
      var n = Number(guests.value);
      if (!n || n < 1 || n > 200) {
        setFieldError(guests, 'Indica entre 1 y 200 comensales.');
        errors.push(guests);
      }
    }

    if (dateInput && dateInput.value && dateInput.value < todayISO()) {
      setFieldError(dateInput, 'Elige una fecha a partir de hoy.');
      errors.push(dateInput);
    }

    return errors;
  }

  if (form) {
    $$('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('input', function () { clearFieldError(input); });
      input.addEventListener('change', function () { clearFieldError(input); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (formStatus) formStatus.textContent = '';

      var errors = validateForm();
      if (errors.length) {
        if (formStatus) formStatus.textContent = 'Revisa los campos marcados para continuar.';
        errors[0].focus();
        return;
      }

      var name = $('#name').value.trim();
      var email = $('#email').value.trim();
      var type = $('#type').value;
      var date = dateInput && dateInput.value ? dateInput.value : 'por confirmar';
      var guestsInput = $('#guests');
      var guests = guestsInput && guestsInput.value ? guestsInput.value : 'por confirmar';
      var city = $('#city') && $('#city').value.trim() ? $('#city').value.trim() : 'por confirmar';
      var message = $('#message').value.trim();

      var text =
        'Hola Nicolás, soy ' + name + '.\n\n' +
        'Me gustaría reservar: ' + type + '.\n' +
        'Fecha tentativa: ' + date + '\n' +
        'Comensales: ' + guests + '\n' +
        'Ciudad / lugar: ' + city + '\n\n' +
        message + '\n\n' +
        'Mi email: ' + email;

      var waLink = $('.wa');
      var href = (waLink && waLink.getAttribute('href')) || 'https://wa.me/34600000000';
      var number = href.replace(/[^\d]/g, '');
      var url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);

      var win = window.open(url, '_blank');
      if (win) win.opener = null;

      if (formStatus) {
        formStatus.textContent = win
          ? 'Abriendo WhatsApp con tu solicitud preparada…'
          : 'No se pudo abrir WhatsApp. Escríbeme a hola@nicolasreyes.com.';
      }
    });
  }

  /* ----------------------------------------------------------
     Varios
     ---------------------------------------------------------- */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Cierra el menú móvil si se navega con el teclado desde él.
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (mobileOpen) setMobileNav(false);
    });
  });

  // Estado inicial
  onScrollFrame();
})();
