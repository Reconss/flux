/*
 * GSAP Animation Engine - Scroll-Linked Effects
 * Theme: Chinese Resource Navigation
 */

// DOM element probes (reading before acting)
document.addEventListener('DOMContentLoaded', () => {
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  
  // Skip if reduced motion or if fine pointer not present
  if (reducedMotion || !finePointer) return;

  // Import GSAP and plugins
  gsap.registerPlugin(ScrollTrigger);

  // Hero animations on load
  if (document.querySelector('.hero')) {
    gsap.from('.hero-title', {
      duration: 1,
      opacity: 0,
      y: 60,
      ease: 'power4.out'
    });

    gsap.from('.hero-subtitle', {
      duration: 1,
      opacity: 0,
      y: 30,
      ease: 'power3.out',
      delay: 0.3
    });
  }

  // Card staggered arrival
  const cards = document.querySelectorAll('.card');
  if (cards.length > 0 && document.querySelector('.grid-4')) {
    gsap.from(cards, {
      duration: 0.8,
      opacity: 0,
      y: 30,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.grid-4',
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  // Category cards with word reveal for title
  const categoryCards = document.querySelectorAll('.category-card');
  if (categoryCards.length > 0) {
    categoryCards.forEach((card, index) => {
      // Title word reveal
      const titleElement = card.querySelector('.card-title') || card.querySelector('h3');
      if (titleElement) {
        const text = titleElement.textContent;
        titleElement.innerHTML = text.split('').map((char, i) => 
          `<span style="opacity: 0; transform: translateY(10px);">${char}</span>`
        ).join('');
        
        gsap.from(titleElement.querySelectorAll('span'), {
          duration: 0.5,
          opacity: 0,
          y: 10,
          stagger: 0.03,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        });
      }

      // Card entrance
      gsap.from(card, {
        duration: 0.6,
        opacity: 0,
        y: 20,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          toggleActions: 'play none none reverse'
        },
        delay: index * 0.1
      });
    });
  }

  // Section headers with reveal
  const sectionHeaders = document.querySelectorAll('.section-header');
  sectionHeaders.forEach(header => {
    gsap.from(header, {
      duration: 0.6,
      opacity: 0,
      x: -30,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: header,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Detail cards entrance
  const detailCards = document.querySelectorAll('.detail-card');
  if (detailCards.length > 0) {
    gsap.from(detailCards, {
      duration: 0.7,
      opacity: 0,
      x: -20,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: detailCards,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  // Source filter pills stagger
  const filterPills = document.querySelectorAll('.tag-pill');
  if (filterPills.length > 0) {
    gsap.from(filterPills, {
      duration: 0.5,
      opacity: 0,
      scale: 0.9,
      stagger: 0.05,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: filterPills,
        start: 'top 90%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  // Scroll-triggered background element parallax
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) {
    gsap.to(heroCanvas, {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      },
      yPercent: 30
    });
  }

  // Section divider fade-in
  const dividers = document.querySelectorAll('.divider');
  dividers.forEach(divider => {
    gsap.from(divider, {
      duration: 1,
      opacity: 0,
      scrollTrigger: {
        trigger: divider,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Footer fade-up
  const footer = document.querySelector('.footer');
  if (footer) {
    gsap.from(footer, {
      duration: 0.8,
      opacity: 0,
      y: 40,
      scrollTrigger: {
        trigger: footer,
        start: 'top 95%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  // Nav link hover intent (optional, debounced)
  const navLinks = document.querySelectorAll('.nav-link, .close-nav');
  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      if (finePointer) {
        gsap.to(link, {
          duration: 0.2,
          x: 5,
          ease: 'power2.out'
        });
      }
    });

    link.addEventListener('mouseleave', () => {
      gsap.to(link, {
        duration: 0.2,
        x: 0,
        ease: 'power2.out'
      });
    });
  });

  console.log('GSAP animations Initialized ✨');
});

// Resize handler
window.addEventListener('resize', () => {
  let finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!finePointer) return;
  
  // Reinitialize ScrollTrigger instances
  ScrollTrigger.refresh();
});
