// DOM Elements
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const navClose = document.getElementById('nav-close');
const navLinks = document.querySelectorAll('.nav__link');
const header = document.getElementById('header');
const faqItems = document.querySelectorAll('.faq-item');
const statValues = document.querySelectorAll('.stat-value');
const newsletterForm = document.querySelector('.newsletter-form');

// Mobile Navigation Toggle
function toggleMobileMenu() {
    navMenu.classList.toggle('show');
}

function closeMobileMenu() {
    navMenu.classList.remove('show');
}

// Event Listeners for Mobile Navigation
if (navToggle) {
    navToggle.addEventListener('click', toggleMobileMenu);
}

if (navClose) {
    navClose.addEventListener('click', closeMobileMenu);
}

// Close mobile menu when clicking nav links
navLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
});

// Header scroll effect
function handleHeaderScroll() {
    const scrollTop = window.pageYOffset;
    
    if (scrollTop > 100) {
        header.style.background = 'rgba(15, 15, 15, 0.95)';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
    } else {
        header.style.background = 'rgba(15, 15, 15, 0.9)';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    }
}

// FAQ Accordion
function toggleFAQ(item) {
    const isActive = item.classList.contains('active');
    
    // Close all FAQ items
    faqItems.forEach(faq => {
        faq.classList.remove('active');
    });
    
    // Open clicked item if it wasn't already active
    if (!isActive) {
        item.classList.add('active');
    }
}

// Add event listeners to FAQ items
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => toggleFAQ(item));
});

// Animated Counter
function animateCounter(element, target, duration = 2000, hasPrefix = '', hasSuffix = '') {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Format number with commas for large numbers
        const displayValue = Math.floor(current).toLocaleString();
        element.textContent = hasPrefix + displayValue + hasSuffix;
    }, 16);
}

// Initialize counters when they come into view
function initializeCounters() {
    statValues.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const suffix = stat.parentNode.querySelector('.stat-suffix');
        
        if (target) {
            animateCounter(stat, target, 2000);
        }
    });
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

function handleIntersection(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Trigger counters when stats section is visible
            if (entry.target.classList.contains('stats')) {
                setTimeout(initializeCounters, 300);
            }
        }
    });
}

const observer = new IntersectionObserver(handleIntersection, observerOptions);

// Elements to animate on scroll
function initializeScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.feature-card, .step, .benefit-card, .pricing-card, .faq-item, .section-header'
    );
    
    animatedElements.forEach((element, index) => {
        element.classList.add('fade-in');
        element.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(element);
    });

    // Observe stats section for counter animation
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        observer.observe(statsSection);
    }
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Newsletter form handling
function handleNewsletterSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
    
    if (email) {
        // Simulate form submission
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        submitButton.textContent = 'Subscribing...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            submitButton.textContent = 'Subscribed!';
            submitButton.style.background = 'linear-gradient(135deg, #00ff88, #00cc70)';
            
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                submitButton.style.background = '';
                e.target.reset();
            }, 2000);
        }, 1000);
    }
}

// Particle animation enhancement
function createParticles() {
    const heroSection = document.querySelector('.hero');
    const particlesContainer = document.querySelector('.hero__particles');
    
    if (!particlesContainer) return;
    
    // Add more particles dynamically
    for (let i = 5; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Add glowing effect to energy grid nodes
function animateEnergyGrid() {
    const gridNodes = document.querySelectorAll('.grid-node');
    
    setInterval(() => {
        gridNodes.forEach((node, index) => {
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    node.classList.add('active');
                    setTimeout(() => {
                        node.classList.remove('active');
                    }, Math.random() * 2000 + 1000);
                }
            }, index * 200);
        });
    }, 3000);
}

// Button hover effects
function initializeButtonEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Parallax effect for hero section
function initializeParallax() {
    const hero = document.querySelector('.hero');
    const heroVisual = document.querySelector('.hero__visual');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (heroVisual && scrolled < window.innerHeight) {
            heroVisual.style.transform = `translate3d(0, ${rate}px, 0)`;
        }
    });
}

// Lazy loading for better performance
function initializeLazyLoading() {
    const lazyElements = document.querySelectorAll('.feature-card, .pricing-card, .benefit-card');
    
    const lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.willChange = 'transform, opacity';
                lazyObserver.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    lazyElements.forEach(element => {
        lazyObserver.observe(element);
    });
}

// Keyboard navigation for accessibility
function initializeKeyboardNavigation() {
    // FAQ keyboard navigation
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFAQ(item);
            }
        });
    });
    
    // Mobile menu keyboard navigation
    if (navToggle) {
        navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMobileMenu();
            }
        });
    }
}

// Performance optimization: throttle scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize core functionality
    initializeSmoothScrolling();
    initializeScrollAnimations();
    initializeButtonEffects();
    initializeKeyboardNavigation();
    initializeLazyLoading();
    
    // Initialize visual effects
    createParticles();
    animateEnergyGrid();
    initializeParallax();
    
    // Add newsletter form listener
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
    
    // Add throttled scroll listener
    window.addEventListener('scroll', throttle(handleHeaderScroll, 10));
    
    // Preload critical animations
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Handle window resize
window.addEventListener('resize', throttle(() => {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
}, 250));

// Handle visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is hidden
        document.querySelectorAll('.particle').forEach(particle => {
            particle.style.animationPlayState = 'paused';
        });
    } else {
        // Resume animations when tab is visible
        document.querySelectorAll('.particle').forEach(particle => {
            particle.style.animationPlayState = 'running';
        });
    }
});

// Add loading states for better UX
function showLoading(element) {
    element.style.opacity = '0.7';
    element.style.pointerEvents = 'none';
}

function hideLoading(element) {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
}

// Export functions for potential external use
window.EnergyFlowApp = {
    toggleMobileMenu,
    closeMobileMenu,
    initializeCounters,
    animateCounter,
    showLoading,
    hideLoading
};

// Add some easter eggs for fun
let konamiCode = [];
const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.code);
    
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        // Easter egg: make all grid nodes active and glow
        document.querySelectorAll('.grid-node').forEach(node => {
            node.classList.add('active');
            node.style.animation = 'pulse 0.5s infinite alternate';
        });
        
        // Show a fun message
        const message = document.createElement('div');
        message.textContent = '⚡ ENERGY OVERLOAD! ⚡';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #0f0f0f;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 24px;
            font-weight: 800;
            z-index: 10000;
            animation: pulse 1s infinite;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
            document.querySelectorAll('.grid-node').forEach(node => {
                node.style.animation = '';
            });
        }, 3000);
        
        konamiCode = [];
    }
});

// Console welcome message
console.log(`
⚡ Welcome to EnergyFlow! ⚡
Trade energy directly with your neighbors using blockchain technology.
Visit us at: https://energyflow.example.com

Built with modern web technologies:
- Intersection Observer API for scroll animations
- CSS Grid & Flexbox for responsive layouts
- ES6+ JavaScript features
- Accessible design patterns

Happy energy trading! 🌱
`);