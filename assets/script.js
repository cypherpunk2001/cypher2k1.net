        // Set current year
        document.getElementById('current-year').textContent = new Date().getFullYear();

        const contentInner = document.getElementById('content-inner');
        const contentTitle = document.getElementById('content-title');
        const contentMeta = document.getElementById('content-meta');
        const navPath = document.getElementById('nav-path');
        const homeBtn = document.querySelector('[data-section="home"]');
        const readmeTrigger = document.getElementById('readme-trigger');
        const conceptArtTrigger = document.getElementById('concept-art-trigger');
        const devlogTrigger = document.getElementById('devlog-trigger');
        const specTrigger = document.getElementById('spec-trigger');
        const storyTrigger = document.getElementById('story-trigger');
        const mapTrigger = document.getElementById('map-trigger');
        const bountyTrigger = document.getElementById('bounty-trigger');

        // Fragment menu entries
        const fragments = [
            { section: 'readme', file: 'pages/00_README.txt', label: 'README' },
            { section: 'city', file: 'pages/01_CITY.txt', label: 'CITY' },
            { section: 'wilderness', file: 'pages/02_WILDERNESS.txt', label: 'NULLZONE' },
            { section: 'factions', file: 'pages/03_FACTIONS.txt', label: 'FACTIONS' },
            { section: 'reputation', file: 'pages/04_REPUTATION.txt', label: 'REPUTATION' },
            { section: 'fracture', file: 'pages/05_FRACTURE.txt', label: 'FRACTURE' },
            { section: 'scavenging', file: 'pages/06_SCAVENGING.txt', label: 'SCAVENGING' },
            { section: 'cooking', file: 'pages/07_COOKING.txt', label: 'COOKING' },
            { section: 'foodloop', file: 'pages/08_FOOD_LOOP.txt', label: 'FOOD_LOOP' },
            { section: 'salvage', file: 'pages/09_SALVAGE.txt', label: 'SALVAGE' },
            { section: 'ignition', file: 'pages/0A_IGNITION.txt', label: 'IGNITION' },
            { section: 'extraction', file: 'pages/0B_DEEP_EXTRACTION.txt', label: 'EXTRACTION' },
            { section: 'fabrication', file: 'pages/0C_FABRICATION.txt', label: 'FABRICATION' },
            { section: 'projectiles', file: 'pages/0D_PROJECTILES.txt', label: 'PROJECTILES' },
            { section: 'anomaly', file: 'pages/0E_ANOMALY.txt', label: 'ANOMALY' },
            { section: 'coreloops', file: 'pages/0F_CORE_LOOPS.txt', label: 'CORE_LOOPS' },
            { section: 'prompt', file: 'pages/FF_PROMPT.txt', label: '0xFF_PROMPT' },
            { section: 'error404', file: 'pages/404_ERROR.txt', label: '0x404' }
        ];

        const extensions = [
            '.txt', '.exe', '.dll', '.so', '.bin', '.dat', '.cfg', '.sys',
            '.rom', '.img', '.iso', '.tar.gz', '.elf', '.o', '.a', '.ko',
            '.conf', '.ini', '.log', '.dump', '.core', '.bak', '.old',
            '.swp', '.tmp', '.cache', '.db', '.idx', '.pak', '.wad',
            '.arc', '.lha', '.zoo', '.arj', '.mem', '.sav', '.state',
            '.asm', '.h', '.c', '.sh', '.pl', '.py', '.rb', '.lua',
            '.lisp', '.scm', '.forth', '.bf', '.mal', '.hex', '.srec',
            '.patch', '.diff', '.gpg', '.asc', '.sig', '.key', '.pem',
            '.crt', '.der', '.p12', '.jks', '.keystore', '.wallet',
            '.frag', '.vert', '.glsl', '.spv', '.wasm', '.bc', '.ll'
        ];

        const sectionExtCache = {};
        let menuVisible = false;

        function randomExt() {
            return extensions[Math.floor(Math.random() * extensions.length)];
        }

        function getExtForSection(section) {
            const key = section.toUpperCase();
            if (!sectionExtCache[key]) {
                sectionExtCache[key] = randomExt();
            }
            return sectionExtCache[key];
        }

        function updatePath(section) {
            navPath.textContent = `/sys/node7x/fragments/${section.toUpperCase()}${getExtForSection(section)}`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatContent(text) {
            let escaped = escapeHtml(text);

            // Hex addresses and markers [0x00], [0xFF], [BOOTYARD], etc. - MUST be before ALL CAPS
            escaped = escaped.replace(
                /\[0x[0-9A-Za-z_]+\]|\[[A-Z][A-Z\s]+\]/g,
                '\x00sec\x01$&\x00/sec\x01'
            );

            // ALL CAPS words (3+ chars) - after section markers so brackets are preserved
            escaped = escaped.replace(
                /\b([A-Z][A-Z0-9_]{2,})\b/g,
                '\x00emp\x01$1\x00/emp\x01'
            );

            // Divider lines (=== or ---)
            escaped = escaped.replace(
                /^(={3,}|-{3,})$/gm,
                '\x00div\x01$1\x00/div\x01'
            );

            // Header lines with = borders
            escaped = escaped.replace(
                /^(=\s+[^=]+\s+=)$/gm,
                '\x00hdr\x01$1\x00/hdr\x01'
            );

            // Quoted strings "..."
            escaped = escaped.replace(
                /"([^"]+)"/g,
                '\x00str\x01"$1"\x00/str\x01'
            );

            // Convert placeholders to spans
            escaped = escaped
                .replace(/\x00emp\x01/g, '<span class="emphasis-text">')
                .replace(/\x00\/emp\x01/g, '</span>')
                .replace(/\x00sec\x01/g, '<span class="section-marker">')
                .replace(/\x00\/sec\x01/g, '</span>')
                .replace(/\x00div\x01/g, '<span class="divider-line">')
                .replace(/\x00\/div\x01/g, '</span>')
                .replace(/\x00hdr\x01/g, '<span class="header-line">')
                .replace(/\x00\/hdr\x01/g, '</span>')
                .replace(/\x00str\x01/g, '<span class="string-text">')
                .replace(/\x00\/str\x01/g, '</span>');

            return escaped;
        }

        // Show fragment menu in content area
        async function showFragmentMenu() {
            menuVisible = true;
            homeBtn.classList.remove('active');
            readmeTrigger.classList.add('active');
            conceptArtTrigger.classList.remove('active');
            specTrigger.classList.remove('active');
            devlogTrigger.classList.remove('active');
            storyTrigger.classList.remove('active');
            mapTrigger.classList.remove('active');
            bountyTrigger.classList.remove('active');

            contentTitle.textContent = 'SELECT FRAGMENT';
            const menuFragments = fragments.filter(f => f.section !== 'readme');
            contentMeta.textContent = `${menuFragments.length} available`;
            updatePath('INDEX');

            // Fetch README content
            let readmeContent = '';
            try {
                const response = await fetch(`pages/00_README.txt?v=${Date.now()}`);
                if (response.ok) {
                    readmeContent = await response.text();
                }
            } catch (e) {
                readmeContent = 'README NOT FOUND';
            }

            const menuHtml = `<div class="content-menu-header">.:[FRAGMENT ARCHIVE INDEX]:.</div>
                <div class="content-menu open">
                    ${menuFragments.map(f => `<button class="menu-btn" data-section="${f.section}" data-file="${f.file}">[ <span class="menu-text">${f.label}</span> ]</button>`).join('')}
                </div>
                <div class="readme-preview">${formatContent(readmeContent)}</div>
            `;

            contentInner.classList.remove('pixelate-in');
            void contentInner.offsetWidth;
            contentInner.innerHTML = menuHtml;
            contentInner.classList.add('pixelate-in');

            // Attach click handlers to menu buttons
            contentInner.querySelectorAll('.menu-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    menuVisible = false;
                    loadContent(btn.dataset.file, btn.dataset.section);
                    history.pushState(null, '', `#${btn.dataset.section}`);
                });
            });
        }

        async function loadContent(filename, sectionName, preserveScroll = false) {
            // Save scroll position if requested
            const savedScrollY = preserveScroll ? window.scrollY : 0;

            menuVisible = false;
            homeBtn.classList.remove('active');
            readmeTrigger.classList.remove('active');
            conceptArtTrigger.classList.remove('active');
            specTrigger.classList.remove('active');
            devlogTrigger.classList.remove('active');
            storyTrigger.classList.remove('active');
            mapTrigger.classList.remove('active');
            bountyTrigger.classList.remove('active');

            // Highlight appropriate nav button
            if (sectionName === 'home') {
                homeBtn.classList.add('active');
            } else if (sectionName === 'spec') {
                specTrigger.classList.add('active');
            } else if (sectionName === 'devlog') {
                devlogTrigger.classList.add('active');
            } else if (sectionName === 'story') {
                storyTrigger.classList.add('active');
            } else if (sectionName === 'map') {
                mapTrigger.classList.add('active');
            } else if (sectionName === 'bounty') {
                bountyTrigger.classList.add('active');
            } else {
                readmeTrigger.classList.add('active');
            }

            contentInner.classList.add('loading');
            contentInner.innerHTML = 'ACCESSING ARCHIVE';
            contentTitle.textContent = `Loading: ${sectionName}`;
            contentMeta.textContent = '--';
            updatePath(sectionName);

            try {
                const response = await fetch(`${filename}?v=${Date.now()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const text = await response.text();
                const lines = text.split('\n').length;
                const bytes = new Blob([text]).size;

                contentInner.classList.remove('loading');
                contentInner.classList.remove('pixelate-in');
                void contentInner.offsetWidth;

                // For README fragment pages, show menu + content
                if (sectionName !== 'home' && sectionName !== 'spec' && sectionName !== 'devlog' && sectionName !== 'story' && sectionName !== 'map' && sectionName !== 'bounty') {
                    const menuFragments = fragments.filter(f => f.section !== 'readme');
                    const menuHtml = `<div class="content-menu-header">.:[FRAGMENT ARCHIVE INDEX]:.</div>
                        <div class="content-menu open">
                            ${menuFragments.map(f => `<button class="menu-btn${f.section === sectionName ? ' active' : ''}" data-section="${f.section}" data-file="${f.file}">[ <span class="menu-text">${f.label}</span> ]</button>`).join('')}
                        </div>
                        <div class="fragment-content"><span class="ps1-cursor"></span>${formatContent(text)}</div>
                    `;
                    contentInner.innerHTML = menuHtml;

                    // Restore scroll position if preserved (after content is rendered)
                    if (preserveScroll) {
                        window.scrollTo(0, savedScrollY);
                    }

                    // Attach click handlers to menu buttons
                    contentInner.querySelectorAll('.menu-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            loadContent(btn.dataset.file, btn.dataset.section, true);
                            history.pushState(null, '', `#${btn.dataset.section}`);
                        });
                    });
                } else if (sectionName === 'home') {
                    // Split content at [0x01] THE CITY to show only PREFACE initially
                    const splitMarker = '-------------------------------------------------------------------------------\n[0x01]';
                    const splitIndex = text.indexOf(splitMarker);

                    let prefaceText, remainingText;
                    if (splitIndex > -1) {
                        prefaceText = text.substring(0, splitIndex).trimEnd();
                        remainingText = text.substring(splitIndex);
                    } else {
                        prefaceText = text;
                        remainingText = '';
                    }

                    contentInner.innerHTML = `<div class="home-hero"><img src="assets/coming_soon.webp" alt="CYPHERPUNK 2001 - a future that already failed" class="hero-image" loading="lazy"></div><div class="home-content"><span class="ps1-cursor"></span>${formatContent(prefaceText)}</div>${remainingText ? `<button class="read-more-btn" id="read-more-btn">[ READ MORE ... ]</button><div class="home-content home-content-hidden" id="home-remaining">${formatContent(remainingText)}</div>` : ''}`;
                    // Make hero image clickable for lightbox
                    const heroImg = contentInner.querySelector('.hero-image');
                    if (heroImg) {
                        heroImg.style.cursor = 'pointer';
                        heroImg.addEventListener('click', () => {
                            openLightbox(heroImg.src, heroImg.alt);
                        });
                    }
                    // Read more button handler
                    const readMoreBtn = document.getElementById('read-more-btn');
                    if (readMoreBtn) {
                        readMoreBtn.addEventListener('click', () => {
                            document.getElementById('home-remaining').classList.remove('home-content-hidden');
                            readMoreBtn.style.display = 'none';
                        });
                    }
                } else if (sectionName === 'story' || sectionName === 'map' || sectionName === 'bounty') {
                    // Story/map page with jump menu
                    const headingRegex = /\[0x[0-9A-Za-z_]+\]\s+[^\n]+|\[[A-Z][A-Z\s]+\]\s+[^\n]+/g;
                    const headings = [];
                    let match;
                    while ((match = headingRegex.exec(text)) !== null) {
                        const full = match[0];
                        const codeMatch = full.match(/\[(0x[0-9A-Za-z_]+)\]/) || full.match(/\[([A-Z][A-Z\s]+)\]/);
                        const code = codeMatch ? codeMatch[1].trim() : '';
                        const title = full.replace(/\[0x[0-9A-Za-z_]+\]\s*/, '').replace(/\[[A-Z][A-Z\s]+\]\s*/, '');
                        if (code) headings.push({ code, title, id: code.toLowerCase().replace(/\s+/g, '-') });
                    }

                    // Build jump menu
                    const jumpMenu = `<div class="story-jump-menu"><div class="jump-menu-header">.:[SECTION INDEX]:.</div><div class="jump-menu-links">${headings.map(h => `<a href="#${h.id}" class="jump-link"><span class="jump-code">[${h.code}]</span> ${h.title}</a>`).join('')}</div></div>`;

                    // Format content and add IDs to section markers
                    let formattedText = formatContent(text);
                    headings.forEach(h => {
                        // Build pattern that matches code letters with possible HTML tags between them
                        const codeLetters = h.code.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?:<[^>]*>|\\s)*');
                        const markerRegex = new RegExp(`(<span class="section-marker">\\[(?:<[^>]*>)*${codeLetters}(?:<[^>]*>)*\\]</span>)`);
                        formattedText = formattedText.replace(markerRegex, `<span id="${h.id}" class="section-anchor"></span>$1`);
                    });

                    const mapHero = sectionName === 'map' ? `<div class="home-hero"><img src="assets/world_map.webp" alt="CYPHERPUNK 2001 - World Map" class="hero-image" loading="lazy"></div>` : '';
                    contentInner.innerHTML = `${mapHero}${jumpMenu}<div class="home-content"><span class="ps1-cursor"></span>${formattedText}</div>`;

                    // Make map image clickable for lightbox
                    if (sectionName === 'map') {
                        const heroImg = contentInner.querySelector('.hero-image');
                        if (heroImg) {
                            heroImg.style.cursor = 'pointer';
                            heroImg.addEventListener('click', () => {
                                openLightbox(heroImg.src, heroImg.alt);
                            });
                        }
                    }

                    // Smooth scroll for jump links
                    contentInner.querySelectorAll('.jump-link').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const targetId = link.getAttribute('href').slice(1);
                            const target = document.getElementById(targetId);
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        });
                    });
                } else {
                    // Devlog and other standalone pages
                    contentInner.innerHTML = `<div class="home-content"><span class="ps1-cursor"></span>${formatContent(text)}</div>`;
                }

                contentInner.classList.add('pixelate-in');
                contentTitle.textContent = `Fragment: ${sectionName.toUpperCase()}`;
                contentMeta.textContent = `${lines} lines // ${bytes} bytes`;

            } catch (error) {
                contentInner.classList.remove('loading');
                contentTitle.textContent = 'ERROR: ACCESS DENIED';
                contentMeta.textContent = 'FRAGMENT CORRUPTED';
                contentInner.innerHTML = `<span class="error-text">
ERROR: FAILED TO RETRIEVE FRAGMENT
TARGET: ${escapeHtml(filename)}
REASON: ${escapeHtml(error.message)}

===============================================================================
the archive is incomplete.
some fragments are lost.
some were never saved.
this is expected.
this is the point.
===============================================================================
</span>`;
            }
        }

        // HOME button click
        homeBtn.addEventListener('click', () => {
            menuVisible = false;
            loadContent(homeBtn.dataset.file, 'home');
            history.pushState(null, '', '#home');
        });

        // README button click - show menu
        readmeTrigger.addEventListener('click', () => {
            showFragmentMenu();
            history.pushState(null, '', '#readme');
        });

        // CONCEPT ART button click
        conceptArtTrigger.addEventListener('click', () => {
            showConceptArt();
            history.pushState(null, '', '#concept-art');
        });

        // SPEC button click
        specTrigger.addEventListener('click', () => {
            loadContent('pages/spec.txt', 'spec');
            history.pushState(null, '', '#spec');
        });

        // DEVLOG button click
        devlogTrigger.addEventListener('click', () => {
            loadContent('pages/devlog.txt', 'devlog');
            history.pushState(null, '', '#devlog');
        });

        // STORY button click
        storyTrigger.addEventListener('click', () => {
            loadContent('pages/a_story_about_rsc.txt', 'story');
            history.pushState(null, '', '#story');
        });

        // MAP button click
        mapTrigger.addEventListener('click', () => {
            loadContent('pages/world_map.txt', 'map');
            history.pushState(null, '', '#map');
        });

        // BUG BOUNTY button click
        bountyTrigger.addEventListener('click', () => {
            loadContent('pages/bug_bounty.txt', 'bounty');
            history.pushState(null, '', '#bounty');
        });

        function showConceptArt() {
            menuVisible = false;
            homeBtn.classList.remove('active');
            readmeTrigger.classList.remove('active');
            conceptArtTrigger.classList.add('active');
            specTrigger.classList.remove('active');
            devlogTrigger.classList.remove('active');
            storyTrigger.classList.remove('active');
            mapTrigger.classList.remove('active');
            bountyTrigger.classList.remove('active');

            contentTitle.textContent = 'CONCEPT ART';
            contentMeta.textContent = 'work in progress';
            updatePath('CONCEPTS');

            const slides = [
                { src: 'assets/albumcover.webp', alt: 'CYPHERPUNK 2001 - a future that already failed', caption: 'COVER_ART' },
                { src: 'assets/anomaly.webp', alt: 'Anomaly gameplay - electrical disturbances in the wasteland', caption: 'ANOMALY_SECTOR' },
                { src: 'assets/nightclub.webp', alt: 'Nightclub social hub - players gathering and trading', caption: 'SOCIAL_HUB' },
                { src: 'assets/pvp.webp', alt: 'PvP combat in the Wilderness', caption: 'WILDERNESS_PVP' }
            ];

            const conceptHtml = `<div class="concept-art-header">.:[CONCEPT ART // WORK IN PROGRESS]:.</div><div class="gallery-main"><img src="${slides[1].src}" alt="${slides[1].alt}" class="gallery-main-image" id="gallery-main-image" loading="lazy"><span class="gallery-main-caption" id="gallery-main-caption">${slides[1].caption}</span></div><div class="gallery-thumbnails">${slides.map((s, i) => `<div class="gallery-thumb${i === 1 ? ' active' : ''}" data-index="${i}"><img src="${s.src}" alt="${s.alt}" loading="lazy"></div>`).join('')}</div><div class="concept-art-intro">
        <span class="string-text">"these visions are not final.
         they are prophecies, still rendering."</span>

 the sprites are not yet made.
 these are glimpses of intent,
 fragments of a future
 still being compiled.

 consider this transmission
 classified: PREVIEW_ONLY.
</div>`;

            contentInner.classList.remove('pixelate-in');
            void contentInner.offsetWidth;
            contentInner.innerHTML = conceptHtml;
            contentInner.classList.add('pixelate-in');

            // Gallery functionality
            const mainImage = document.getElementById('gallery-main-image');
            const mainCaption = document.getElementById('gallery-main-caption');
            const thumbnails = contentInner.querySelectorAll('.gallery-thumb');

            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const index = parseInt(thumb.dataset.index);
                    mainImage.src = slides[index].src;
                    mainImage.alt = slides[index].alt;
                    mainCaption.textContent = slides[index].caption;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            // Click main image to open lightbox with navigation
            mainImage.style.cursor = 'pointer';
            mainImage.addEventListener('click', () => {
                openLightbox(mainImage.src, mainImage.alt, true);
            });
        }

        window.addEventListener('popstate', loadFromHash);

        function loadFromHash() {
            const hash = window.location.hash.slice(1);

            if (hash === 'readme') {
                showFragmentMenu();
                return;
            }

            if (hash === 'concept-art') {
                showConceptArt();
                return;
            }

            if (hash === 'spec') {
                loadContent('pages/spec.txt', 'spec');
                return;
            }

            if (hash === 'devlog') {
                loadContent('pages/devlog.txt', 'devlog');
                return;
            }

            if (hash === 'story') {
                loadContent('pages/a_story_about_rsc.txt', 'story');
                return;
            }

            if (hash === 'map') {
                loadContent('pages/world_map.txt', 'map');
                return;
            }

            if (hash === 'bounty') {
                loadContent('pages/bug_bounty.txt', 'bounty');
                return;
            }

            if (hash && hash !== 'home') {
                const frag = fragments.find(f => f.section === hash);
                if (frag) {
                    loadContent(frag.file, frag.section);
                    return;
                }
            }

            // Default to home
            loadContent(homeBtn.dataset.file, 'home');
        }

        loadFromHash();

        // Lightbox functionality
        const lightbox = document.getElementById('lightbox');
        const lightboxContent = document.getElementById('lightbox-content');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const lightboxMaximize = document.getElementById('lightbox-maximize');
        const lightboxClose = document.getElementById('lightbox-close');
        const lightboxPrev = document.getElementById('lightbox-prev');
        const lightboxNext = document.getElementById('lightbox-next');

        // Concept art slides for lightbox navigation
        const conceptSlides = [
            { src: 'assets/albumcover.webp', alt: 'CYPHERPUNK 2001 - a future that already failed', caption: 'COVER_ART' },
            { src: 'assets/anomaly.webp', alt: 'Anomaly gameplay - electrical disturbances in the wasteland', caption: 'ANOMALY_SECTOR' },
            { src: 'assets/nightclub.webp', alt: 'Nightclub social hub - players gathering and trading', caption: 'SOCIAL_HUB' },
            { src: 'assets/pvp.webp', alt: 'PvP combat in the Wilderness', caption: 'WILDERNESS_PVP' }
        ];
        let currentLightboxIndex = 0;
        let lightboxNavigable = false;

        function openLightbox(src, caption, navigable = false) {
            lightboxImg.src = src;
            lightboxCaption.textContent = caption || '';
            lightboxContent.classList.remove('maximized');
            lightboxMaximize.textContent = '[ MAXIMIZE ]';
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';

            // Enable navigation only for concept art gallery
            lightboxNavigable = navigable;
            if (navigable) {
                // Find current index based on src
                currentLightboxIndex = conceptSlides.findIndex(s => src.includes(s.src));
                if (currentLightboxIndex === -1) currentLightboxIndex = 0;
                lightboxPrev.style.display = 'block';
                lightboxNext.style.display = 'block';
            } else {
                lightboxPrev.style.display = 'none';
                lightboxNext.style.display = 'none';
            }
        }

        function lightboxNavigate(direction) {
            if (!lightboxNavigable) return;
            currentLightboxIndex += direction;
            if (currentLightboxIndex < 0) currentLightboxIndex = conceptSlides.length - 1;
            if (currentLightboxIndex >= conceptSlides.length) currentLightboxIndex = 0;

            const slide = conceptSlides[currentLightboxIndex];
            lightboxImg.src = slide.src;
            lightboxCaption.textContent = slide.caption;

            // Also update the main gallery view if visible
            const mainImage = document.getElementById('gallery-main-image');
            const mainCaption = document.getElementById('gallery-main-caption');
            if (mainImage && mainCaption) {
                mainImage.src = slide.src;
                mainImage.alt = slide.alt;
                mainCaption.textContent = slide.caption;
                document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
                    t.classList.toggle('active', i === currentLightboxIndex);
                });
            }
        }

        function closeLightbox() {
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
        }

        function toggleMaximize() {
            lightboxContent.classList.toggle('maximized');
            if (lightboxContent.classList.contains('maximized')) {
                lightboxMaximize.textContent = '[ RESTORE ]';
            } else {
                lightboxMaximize.textContent = '[ MAXIMIZE ]';
            }
        }

        // Click outside to close
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        lightboxClose.addEventListener('click', closeLightbox);
        lightboxMaximize.addEventListener('click', toggleMaximize);
        lightboxImg.addEventListener('click', closeLightbox);
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxNavigate(-1);
        });
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxNavigate(1);
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                lightboxNavigate(-1);
            } else if (e.key === 'ArrowRight') {
                lightboxNavigate(1);
            }
        });

        // Make hero image clickable
        document.querySelectorAll('.hero-image').forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                openLightbox(img.src, img.alt || '');
            });
        });

        // Music Player
        const musicPlayer = {
            tracks: [
                { name: 'TITLE_SCREEN', file: 'assets/retro_music_title_screen.mp3' },
                { name: 'LEVEL_1', file: 'assets/retro_music_level_1.mp3' },
                { name: 'LEVEL_2', file: 'assets/retro_music_level_2.mp3' },
                { name: 'LEVEL_3', file: 'assets/retro_music_level_3.mp3' },
                { name: 'ENDING', file: 'assets/retro_music_ending.mp3' }
            ],
            currentTrack: 0,
            isPlaying: false,
            audio: document.getElementById('audio-player'),
            isDragging: false,
            dragOffset: { x: 0, y: 0 },

            init() {
                this.renderPlaylist();
                this.attachEvents();
                this.audio.volume = 0.7;
                this.makeDraggable();
            },

            makeDraggable() {
                const player = document.getElementById('music-player');
                const header = player.querySelector('.player-header');

                header.addEventListener('mousedown', (e) => {
                    // Don't drag if clicking the toggle button
                    if (e.target.closest('.player-toggle') || e.target.closest('.player-close')) return;

                    this.isDragging = true;
                    player.classList.add('dragging');

                    const rect = player.getBoundingClientRect();
                    this.dragOffset.x = e.clientX - rect.left;
                    this.dragOffset.y = e.clientY - rect.top;

                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!this.isDragging) return;

                    const x = e.clientX - this.dragOffset.x;
                    const y = e.clientY - this.dragOffset.y;

                    // Keep player within viewport bounds
                    const maxX = window.innerWidth - player.offsetWidth;
                    const maxY = window.innerHeight - player.offsetHeight;

                    const boundedX = Math.max(0, Math.min(x, maxX));
                    const boundedY = Math.max(0, Math.min(y, maxY));

                    player.style.left = boundedX + 'px';
                    player.style.top = boundedY + 'px';
                    player.style.right = 'auto';
                    player.style.bottom = 'auto';
                });

                document.addEventListener('mouseup', () => {
                    if (this.isDragging) {
                        this.isDragging = false;
                        player.classList.remove('dragging');
                    }
                });
            },

            renderPlaylist() {
                const playlistEl = document.getElementById('playlist-tracks');
                playlistEl.innerHTML = this.tracks.map((track, index) =>
                    `<div class="playlist-track${index === this.currentTrack ? ' active' : ''}" data-index="${index}">
                        [ ${track.name} ]
                    </div>`
                ).join('');
            },

            attachEvents() {
                // Player toggle
                document.getElementById('player-toggle').addEventListener('click', () => {
                    const body = document.getElementById('player-body');
                    const toggle = document.getElementById('player-toggle');
                    body.classList.toggle('collapsed');
                    toggle.textContent = body.classList.contains('collapsed') ? '[ + ]' : '[ _ ]';
                });

                // Close player
                document.getElementById('player-close').addEventListener('click', () => {
                    this.audio.pause();
                    document.getElementById('music-player').style.display = 'none';
                });

                // Play/pause
                document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());

                // Previous track
                document.getElementById('prev-btn').addEventListener('click', () => this.prevTrack());

                // Next track
                document.getElementById('next-btn').addEventListener('click', () => this.nextTrack());

                // Volume control
                const volumeSlider = document.getElementById('volume-slider');
                const volumeValue = document.getElementById('volume-value');
                volumeSlider.addEventListener('input', (e) => {
                    this.audio.volume = e.target.value / 100;
                    volumeValue.textContent = e.target.value + '%';
                });

                // Progress bar
                const progressBar = document.getElementById('progress-bar');
                progressBar.addEventListener('click', (e) => {
                    const rect = progressBar.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    this.audio.currentTime = percent * this.audio.duration;
                });

                // Playlist tracks
                document.getElementById('playlist-tracks').addEventListener('click', (e) => {
                    const track = e.target.closest('.playlist-track');
                    if (track) {
                        this.loadTrack(parseInt(track.dataset.index));
                        this.play();
                    }
                });

                // Audio events
                this.audio.addEventListener('timeupdate', () => this.updateProgress());
                this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
                this.audio.addEventListener('ended', () => this.nextTrack());
            },

            loadTrack(index) {
                this.currentTrack = index;
                this.audio.src = this.tracks[index].file;
                document.getElementById('track-name').textContent = this.tracks[index].name;
                this.renderPlaylist();
            },

            play() {
                if (!this.audio.src) {
                    this.loadTrack(0);
                }
                this.audio.play();
                this.isPlaying = true;
                document.getElementById('play-btn').innerHTML = '&#9632;&#9632;';
            },

            pause() {
                this.audio.pause();
                this.isPlaying = false;
                document.getElementById('play-btn').innerHTML = '&#9654;';
            },

            togglePlay() {
                if (this.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            },

            nextTrack() {
                this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
                this.loadTrack(this.currentTrack);
                if (this.isPlaying) {
                    this.play();
                }
            },

            prevTrack() {
                this.currentTrack = (this.currentTrack - 1 + this.tracks.length) % this.tracks.length;
                this.loadTrack(this.currentTrack);
                if (this.isPlaying) {
                    this.play();
                }
            },

            updateProgress() {
                if (this.audio.duration) {
                    const percent = (this.audio.currentTime / this.audio.duration) * 100;
                    document.getElementById('progress-fill').style.width = percent + '%';
                    document.getElementById('current-time').textContent = this.formatTime(this.audio.currentTime);
                }
            },

            updateDuration() {
                document.getElementById('total-time').textContent = this.formatTime(this.audio.duration);
            },

            formatTime(seconds) {
                if (isNaN(seconds)) return '00:00';
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        };

        musicPlayer.init();
