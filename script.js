/**
 * ═══════════════════════════════════════════════════════
 *  КОМПЛЕКСНЫЙ JS-МОДУЛЬ ДЛЯ ПОРТФОЛИО
 *  - Анимации при скролле (Intersection Observer)
 *  - Умная фильтрация с кэшированием
 *  - Модальное окно для сертификатов
 *  - Динамическая подсветка навигации
 *  - Плавный скролл с учётом хедера
 *  - Состояние загрузки и обработка ошибок
 *  - Ленивая загрузка изображений
 *  - Система уведомлений (toast)
 *  - Работа с localStorage (сохранение фильтра)
 *  - Дебаунс для оптимизации событий
 * ═══════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ─── Конфигурация ──────────────────────────────────────
    const CONFIG = {
        SCROLL_OFFSET: 80,          // Смещение для якорных ссылок
        ANIMATION_DELAY: 100,       // Задержка перед анимацией
        DEBOUNCE_DELAY: 250,        // Задержка дебаунса
        STORAGE_KEY: 'portfolio_filter', // Ключ для localStorage
        TOAST_DURATION: 3000,       // Длительность уведомлений
        LAZY_LOAD_CLASS: 'lazy-load', // Класс для ленивой загрузки
    };

    // ─── DOM-ссылки ──────────────────────────────────────
    const DOM = {
        body: document.body,
        navbar: document.querySelector('.navbar'),
        navMenu: document.getElementById('navMenu'),
        navToggle: document.getElementById('navToggle'),
        navLinks: document.querySelectorAll('.nav-link'),
        hero: document.querySelector('.hero'),
        sections: document.querySelectorAll('.section'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        courseCards: document.querySelectorAll('.course-card'),
        certificateImgs: document.querySelectorAll('.certificate-img'),
        courseLinks: document.querySelectorAll('.course-link'),
        projectLinks: document.querySelectorAll('.project-link'),
        socialLinks: document.querySelectorAll('.social-link'),
        practiceImages: document.querySelectorAll('.practice-img-container img'),
        roadmapBranches: document.querySelectorAll('.roadmap-branch'),
        skillBars: document.querySelectorAll('.level-bar'),
        allImages: document.querySelectorAll('img'),
    };

    // ─── Состояние приложения ──────────────────────────
    const State = {
        currentFilter: 'all',
        isMenuOpen: false,
        isModalOpen: false,
        isLoaded: false,
        observer: null,
        modalObserver: null,
        scrollLocked: false,
    };

    // ─── Утилиты ────────────────────────────────────────
    const Utils = {
        // Дебаунс для оптимизации частых событий
        debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        },

        // Генерация уникального ID
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).slice(2);
        },

        // Проверка, находится ли элемент в видимой области
        isElementInViewport(el, offset = 50) {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight - offset && rect.bottom > 0;
        },

        // Плавный скролл к элементу
        smoothScrollTo(target, offset = CONFIG.SCROLL_OFFSET) {
            const element = typeof target === 'string' ? document.querySelector(target) : target;
            if (!element) return;
            
            const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        },

        // Форматирование даты
        formatDate(date) {
            return new Date(date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        },

        // Сохранение в localStorage с обработкой ошибок
        setStorage(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage save error:', e);
            }
        },

        // Получение из localStorage
        getStorage(key) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.warn('Storage read error:', e);
                return null;
            }
        },
    };

    // ─── Система уведомлений (Toast) ──────────────────
    const Toast = {
        container: null,

        init() {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 360px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        },

        show(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
            if (!this.container) this.init();

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                background: var(--bg-card, #1a1f2b);
                border: 1px solid var(--border-subtle, #2a3346);
                border-radius: 12px;
                padding: 16px 20px;
                color: var(--text-primary, #f0f3fa);
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 0.9rem;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
                transform: translateX(120%);
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                cursor: pointer;
                backdrop-filter: blur(12px);
                border-left: 4px solid ${type === 'success' ? '#34d9b0' : type === 'error' ? '#ff6b6b' : '#6c8cff'};
            `;

            const iconMap = {
                success: '✅',
                error: '❌',
                info: 'ℹ️',
                warning: '⚠️',
            };

            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.2rem;">${iconMap[type] || 'ℹ️'}</span>
                    <span>${message}</span>
                </div>
            `;

            this.container.appendChild(toast);

            // Анимация появления
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
            });

            // Автоматическое закрытие
            const timeoutId = setTimeout(() => {
                this.hide(toast);
            }, duration);

            // Закрытие по клику
            toast.addEventListener('click', () => {
                clearTimeout(timeoutId);
                this.hide(toast);
            });

            return toast;
        },

        hide(toast) {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 400);
        },

        success(msg) { return this.show(msg, 'success'); },
        error(msg) { return this.show(msg, 'error'); },
        info(msg) { return this.show(msg, 'info'); },
        warning(msg) { return this.show(msg, 'warning'); },
    };

    // ─── Модальное окно для сертификатов ──────────────
    const Modal = {
        overlay: null,
        content: null,
        image: null,
        closeBtn: null,
        caption: null,

        init() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'modal-overlay';
            this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(16px);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 40px;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            this.content = document.createElement('div');
            this.content.style.cssText = `
                position: relative;
                max-width: 80%;
                max-height: 80%;
                background: var(--bg-card, #1a1f2b);
                border-radius: 16px;
                padding: 24px;
                border: 1px solid var(--border-subtle, #2a3346);
                box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7);
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            `;

            this.image = document.createElement('img');
            this.image.style.cssText = `
                max-width: 100%;
                max-height: 70vh;
                border-radius: 8px;
                display: block;
            `;

            this.caption = document.createElement('p');
            this.caption.style.cssText = `
                margin-top: 16px;
                color: var(--text-secondary, #a6b3cf);
                font-size: 0.9rem;
                text-align: center;
            `;

            this.closeBtn = document.createElement('button');
            this.closeBtn.innerHTML = '✕';
            this.closeBtn.style.cssText = `
                position: absolute;
                top: 12px;
                right: 16px;
                background: none;
                border: none;
                color: var(--text-secondary, #a6b3cf);
                font-size: 1.8rem;
                cursor: pointer;
                transition: color 0.2s;
                padding: 4px 8px;
                border-radius: 8px;
            `;
            this.closeBtn.addEventListener('mouseenter', () => {
                this.closeBtn.style.color = '#fff';
            });
            this.closeBtn.addEventListener('mouseleave', () => {
                this.closeBtn.style.color = 'var(--text-secondary, #a6b3cf)';
            });

            this.content.appendChild(this.closeBtn);
            this.content.appendChild(this.image);
            this.content.appendChild(this.caption);
            this.overlay.appendChild(this.content);
            document.body.appendChild(this.overlay);

            // Закрытие по клику на фон
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });

            // Закрытие по Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && State.isModalOpen) this.close();
            });
        },

        open(src, caption = 'Сертификат') {
            if (!this.overlay) this.init();
            
            this.image.src = src;
            this.image.alt = caption;
            this.caption.textContent = caption;
            
            this.overlay.style.display = 'flex';
            State.isModalOpen = true;
            
            // Блокировка скролла
            document.body.style.overflow = 'hidden';
            
            // Анимация появления
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
                this.content.style.transform = 'scale(1)';
            });
        },

        close() {
            this.overlay.style.opacity = '0';
            this.content.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                this.overlay.style.display = 'none';
                State.isModalOpen = false;
                document.body.style.overflow = '';
            }, 300);
        },
    };

    // ─── Анимации при скролле ──────────────────────────
    const ScrollAnimations = {
        observer: null,
        animatedElements: [],

        init() {
            // Собираем все элементы для анимации
            this.animatedElements = [
                ...DOM.sections,
                ...DOM.courseCards,
                ...DOM.projectCards || [],
                ...DOM.roadmapBranches,
                ...DOM.practiceImages,
            ];

            // Добавляем классы для анимации
            this.animatedElements.forEach(el => {
                el.classList.add('scroll-animate');
                el.style.opacity = '0';
                el.style.transform = 'translateY(40px)';
                el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            });

            // Создаём наблюдатель
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const delay = Array.from(this.animatedElements).indexOf(entry.target) * 50;
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }, delay);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.15,
                rootMargin: '0px 0px -50px 0px',
            });

            // Начинаем наблюдение
            this.animatedElements.forEach(el => {
                this.observer.observe(el);
            });
        },

        // Анимация для новых элементов
        observeElement(el) {
            if (this.observer) {
                el.classList.add('scroll-animate');
                el.style.opacity = '0';
                el.style.transform = 'translateY(40px)';
                el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
                this.observer.observe(el);
            }
        },
    };

    // ─── Навигация ──────────────────────────────────────
    const Navigation = {
        init() {
            // Мобильное меню
            DOM.navToggle.addEventListener('click', () => {
                State.isMenuOpen = !State.isMenuOpen;
                DOM.navMenu.classList.toggle('active');
                DOM.navToggle.innerHTML = State.isMenuOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            });

            // Закрытие меню при клике на ссылку
            DOM.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('href');
                    
                    // Закрываем мобильное меню
                    if (State.isMenuOpen) {
                        DOM.navMenu.classList.remove('active');
                        DOM.navToggle.innerHTML = '<i class="fas fa-bars"></i>';
                        State.isMenuOpen = false;
                    }

                    // Плавный скролл
                    Utils.smoothScrollTo(target);
                });
            });

            // Подсветка активного раздела при скролле
            this.setupActiveLinkHighlight();
        },

        setupActiveLinkHighlight() {
            const sections = document.querySelectorAll('section[id]');
            
            const highlight = Utils.debounce(() => {
                let currentSection = '';
                const scrollPosition = window.scrollY + CONFIG.SCROLL_OFFSET + 50;

                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionBottom = sectionTop + section.offsetHeight;
                    
                    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                        currentSection = section.getAttribute('id');
                    }
                });

                DOM.navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href === `#${currentSection}`) {
                        link.style.color = '#fff';
                        link.style.fontWeight = '600';
                    } else {
                        link.style.color = '';
                        link.style.fontWeight = '';
                    }
                });
            }, 100);

            window.addEventListener('scroll', highlight);
            highlight(); // Первоначальная проверка
        },
    };

    // ─── Фильтрация курсов (с кэшированием) ────────────
    const CourseFilter = {
        cache: new Map(),
        currentFilter: 'all',

        init() {
            // Восстанавливаем фильтр из localStorage
            const savedFilter = Utils.getStorage(CONFIG.STORAGE_KEY);
            if (savedFilter && ['all', 'yandex', 'vk', 'future'].includes(savedFilter)) {
                this.currentFilter = savedFilter;
            }

            // Устанавливаем активную кнопку
            DOM.filterButtons.forEach(btn => {
                const filter = btn.dataset.filter;
                if (filter === this.currentFilter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Применяем фильтр
            this.applyFilter(this.currentFilter);

            // Добавляем обработчики
            DOM.filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = btn.dataset.filter;
                    this.setFilter(filter);
                });
            });
        },

        setFilter(filter) {
            if (this.currentFilter === filter) return;

            this.currentFilter = filter;
            
            // Обновляем кнопки
            DOM.filterButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });

            // Сохраняем в localStorage
            Utils.setStorage(CONFIG.STORAGE_KEY, filter);

            // Применяем фильтр с анимацией
            this.applyFilter(filter, true);

            // Уведомление
            const filterNames = {
                all: 'Все курсы',
                yandex: 'Яндекс',
                vk: 'MTC',
                future: 'VK Образование',
            };
            Toast.info(`Показаны: ${filterNames[filter] || filter}`);
        },

        applyFilter(filter, animate = false) {
            let visibleCount = 0;

            DOM.courseCards.forEach(card => {
                const category = card.dataset.category;
                const shouldShow = filter === 'all' || category === filter;

                if (shouldShow) {
                    card.style.display = 'flex';
                    visibleCount++;
                    if (animate) {
                        card.style.animation = 'fadeIn 0.3s ease forwards';
                        setTimeout(() => {
                            card.style.animation = '';
                        }, 400);
                    }
                } else {
                    card.style.display = 'none';
                }
            });

            // Показываем уведомление, если ничего не найдено
            if (visibleCount === 0 && filter !== 'all') {
                Toast.warning('По выбранному фильтру курсов не найдено');
            }
        },
    };

    // ─── Сертификаты (открытие в модалке) ──────────────
    const CertificateHandler = {
        init() {
            DOM.certificateImgs.forEach((img, index) => {
                img.addEventListener('click', () => {
                    const src = img.getAttribute('src');
                    const alt = img.getAttribute('alt') || `Сертификат ${index + 1}`;
                    Modal.open(src, alt);
                });

                // Добавляем индикатор кликабельности
                img.style.cursor = 'pointer';
                img.title = 'Нажмите для увеличения';
            });

            // Также обрабатываем ссылки "Посмотреть сертификат"
            DOM.courseLinks.forEach(link => {
                const originalClick = link.onclick;
                link.addEventListener('click', (e) => {
                    // Если ссылка ведёт на # или пустую, открываем модалку с ближайшим изображением
                    const href = link.getAttribute('href');
                    if (!href || href === '#') {
                        e.preventDefault();
                        const card = link.closest('.course-card');
                        if (card) {
                            const img = card.querySelector('.certificate-img');
                            if (img) {
                                const src = img.getAttribute('src');
                                const alt = img.getAttribute('alt') || 'Сертификат';
                                Modal.open(src, alt);
                            }
                        }
                    }
                });
            });
        },
    };

    // ─── Ленивая загрузка изображений ──────────────────
    const LazyLoader = {
        observer: null,

        init() {
            // Используем Intersection Observer для ленивой загрузки
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        img.classList.add('loaded');
                        this.observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '100px 0px',
            });

            // Находим все изображения с data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.observer.observe(img);
            });
        },

        // Метод для добавления новых изображений
        observe(img) {
            if (this.observer) {
                this.observer.observe(img);
            }
        },
    };

    // ─── Анимация шкал навыков ──────────────────────────
    const SkillBars = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const bar = entry.target;
                        const width = bar.style.width;
                        bar.style.width = '0%';
                        setTimeout(() => {
                            bar.style.width = width;
                        }, 300);
                        observer.unobserve(bar);
                    }
                });
            }, { threshold: 0.3 });

            DOM.skillBars.forEach(bar => {
                observer.observe(bar);
            });
        },
    };

    // ─── Динамическая подгрузка контента ──────────────
    const DynamicContent = {
        // Имитация загрузки дополнительных данных
        loadMoreProjects() {
            // В реальном проекте здесь был бы запрос к API
            // Для демонстрации просто показываем уведомление
            const projectsGrid = document.querySelector('.projects-grid');
            if (projectsGrid) {
                const existingCards = projectsGrid.querySelectorAll('.project-card');
                if (existingCards.length >= 4) {
                    Toast.info('Все проекты уже загружены');
                    return;
                }
            }
            Toast.info('Загрузка дополнительных проектов...');
            
            // Имитация асинхронной загрузки
            setTimeout(() => {
                // Создаём новую карточку проекта
                const newCard = document.createElement('div');
                newCard.className = 'project-card scroll-animate';
                newCard.style.cssText = 'opacity: 0; transform: translateY(40px); transition: opacity 0.7s ease, transform 0.7s ease;';
                newCard.innerHTML = `
                    <h3 class="project-title">Новый проект</h3>
                    <p class="project-description">Динамически загруженный проект с использованием JavaScript.</p>
                    <div class="project-role"><strong>Роль:</strong> Fullstack-разработчик</div>
                    <div class="project-tasks"><strong>Задачи:</strong> разработка, тестирование, деплой.</div>
                    <div class="project-links">
                        <a href="#" class="project-link"><i class="fab fa-github"></i> Репозиторий</a>
                    </div>
                `;
                
                const grid = document.querySelector('.projects-grid');
                if (grid) {
                    grid.appendChild(newCard);
                    ScrollAnimations.observeElement(newCard);
                    Toast.success('Новый проект добавлен!');
                }
            }, 1000);
        },

        // Бесконечный скролл (демо-версия)
        setupInfiniteScroll() {
            let isLoading = false;
            
            window.addEventListener('scroll', Utils.debounce(() => {
                if (isLoading) return;
                
                const scrollHeight = document.documentElement.scrollHeight;
                const scrollTop = window.scrollY + window.innerHeight;
                
                if (scrollTop >= scrollHeight - 300) {
                    // Достигнут низ страницы
                    isLoading = true;
                    Toast.info('Загрузка дополнительного контента...');
                    
                    setTimeout(() => {
                        const footer = document.querySelector('.footer');
                        if (footer) {
                            const newSection = document.createElement('div');
                            newSection.style.cssText = `
                                background: var(--bg-card, #1a1f2b);
                                border-radius: 16px;
                                padding: 40px;
                                margin: 40px 0;
                                border: 1px solid var(--border-subtle, #2a3346);
                                text-align: center;
                            `;
                            newSection.innerHTML = `
                                <h3 style="color: #fff; margin-bottom: 12px;">🚀 Дополнительный контент</h3>
                                <p style="color: var(--text-secondary, #a6b3cf);">Этот блок был загружен динамически при скролле.</p>
                            `;
                            footer.parentNode.insertBefore(newSection, footer);
                            isLoading = false;
                            Toast.success('Контент загружен!');
                        }
                    }, 1500);
                }
            }, 300));
        },
    };

    // ─── Обработка ошибок и глобальные события ──────────
    const ErrorHandler = {
        init() {
            // Перехват ошибок на уровне окна
            window.addEventListener('error', (e) => {
                console.error('Global error:', e.message);
                Toast.error('Произошла ошибка. Проверьте консоль.');
            });

            // Перехват необработанных Promise-ошибок
            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled Promise rejection:', e.reason);
                Toast.error('Необработанная ошибка Promise');
            });
        },
    };

    // ─── Аналитика и производительность ──────────────────
    const Performance = {
        init() {
            // Время загрузки страницы
            const loadTime = performance.now();
            console.log(`⏱ Страница загружена за ${Math.round(loadTime)}ms`);

            // Отслеживание взаимодействий
            document.addEventListener('click', (e) => {
                const target = e.target.closest('[data-track]');
                if (target) {
                    const action = target.dataset.track;
                    console.log(`📊 Аналитика: ${action}`);
                }
            });
        },
    };

    // ─── Инициализация приложения ──────────────────────
    const App = {
        init() {
            console.log('🚀 Запуск портфолио...');

            // Инициализация компонентов
            Modal.init();
            Toast.init();
            Navigation.init();
            CourseFilter.init();
            CertificateHandler.init();
            ScrollAnimations.init();
            SkillBars.init();
            LazyLoader.init();
            ErrorHandler.init();
            Performance.init();

            // Дополнительные функции
            DynamicContent.setupInfiniteScroll();

            // Обработчик для кнопки "Загрузить ещё" (если есть)
            document.addEventListener('click', (e) => {
                if (e.target.closest('.load-more-btn')) {
                    DynamicContent.loadMoreProjects();
                }
            });

            // Анимация появления для hero
            DOM.hero.querySelectorAll('.hero-content, .hero-image').forEach(el => {
                el.style.opacity = '0';
                el.style.animation = 'fadeIn 1s ease forwards';
            });

            // Состояние загрузки завершено
            State.isLoaded = true;
            console.log('✅ Портфолио загружено успешно!');

            // Уведомление о готовности
            setTimeout(() => {
                Toast.success('Добро пожаловать в портфолио! 👋');
            }, 800);

            // Добавляем динамические стили для анимаций
            this.injectDynamicStyles();
        },

        injectDynamicStyles() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .scroll-animate {
                    transition: opacity 0.7s ease, transform 0.7s ease !important;
                }
                .toast-container {
                    pointer-events: none;
                }
                .toast-container .toast {
                    pointer-events: auto;
                }
                .modal-overlay {
                    backdrop-filter: blur(16px) !important;
                }
            `;
            document.head.appendChild(style);
        },
    };

    // ─── Запуск после загрузки DOM ─────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // ─── Экспорт публичного API (для отладки) ──────────
    window.__portfolio = {
        App,
        State,
        Modal,
        Toast,
        Utils,
        CourseFilter,
        ScrollAnimations,
        DynamicContent,
    };

})();