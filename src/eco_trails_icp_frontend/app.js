/**
 * EcoTrails Bulgaria - Основен JavaScript модул
 * 
 * Този модул управлява цялата клиентска логика на туристическото приложение,
 * включително навигация между слайдове, чатбот функционалност и интерактивни карти.
 * 
 * Основни функционалности:
 * - Слайдер навигация с плавни преходи
 * - AI-базиран чатбот за туристически съвети
 * - Интерактивни карти с Leaflet.js
 * - Геолокация и маршрутизация
 * - Адаптивен дизайн и достъпност
 * 
 * Автор: EcoTrails Team
 * Версия: 2.0
 * Дата: 2025
 */

// ============================================================================
// ГЛОБАЛНИ ПРОМЕНЛИВИ И КОНФИГУРАЦИЯ
// ============================================================================

/**
 * Основни конфигурационни константи за приложението
 */
const CONFIG = {
    // API endpoints
    API_ENDPOINTS: {
        CHAT: '/querydata',
        TRAILS_BY_ID: '/trails/by_id',
        ADVANCED_SEARCH: '/trails/advanced_search',
        ALL_TRAILS: '/trails/all',
        CALCULATE_ROUTE: '/route/calculate'
    },
    
    // Карта настройки
    MAP_SETTINGS: {
        DEFAULT_CENTER: [42.7339, 25.4858], // Центъра на България
        DEFAULT_ZOOM: 7,
        MIN_ZOOM: 6,
        MAX_ZOOM: 18,
        TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        TILE_LAYER_ATTRIBUTION: '© OpenStreetMap contributors'
    },
    
    // Анимации и времена
    ANIMATION_DURATIONS: {
        SLIDE_TRANSITION: 500,
        CHAT_MESSAGE: 300,
        MAP_TRANSITION: 400,
        LOADING_DELAY: 1000
    },
    
    // Лимити и ограничения
    LIMITS: {
        MAX_MESSAGE_LENGTH: 500,
        MAX_CHAT_HISTORY: 50,
        TYPING_INDICATOR_DELAY: 2000
    }
};

/**
 * Глобални променливи за състоянието на приложението
 */
let applicationState = {
    // Текущ активен слайд
    currentSlide: 'home',
    
    // Карти инстанции
    maps: {
        main: null,           // Основна карта в map слайда
        chat: null           // Карта в чат слайда (ако е необходима)
    },
    
    // Слоеве и маркери на картата
    mapLayers: {
        trails: null,         // Слой с маршрути
        userLocation: null,   // Маркер за местоположението на потребителя
        currentRoute: null,   // Текущ маршрут
        markers: []          // Масив с всички маркери
    },
    
    // Състояние на чата
    chat: {
        isLoading: false,
        messageHistory: [],
        lastCoordinates: null,
        currentContext: null
    },
    
    // Филтри и търсене
    filters: {
        region: null,
        difficulty: null,
        season: null,
        searchQuery: ''
    },
    
    // Потребителски настройки
    userPreferences: {
        mapStyle: 'standard',
        notifications: true,
        autoLocation: false
    }
};

/**
 * Кеш за данни и оптимизация на производителността
 */
const dataCache = {
    trails: new Map(),           // Кеш за маршрути
    searchResults: new Map(),    // Кеш за резултати от търсене
    geocoding: new Map(),        // Кеш за геокодиране
    lastFetch: new Map()         // Времена на последни заявки
};

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ НА ПРИЛОЖЕНИЕТО
// ============================================================================

/**
 * Главна функция за инициализация на приложението
 * Извиква се при зареждане на страницата
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация на EcoTrails приложението...');
    
    try {
        // Инициализация на основните компоненти
        initializeNavigation();
        initializeChat();
        initializeMap();
        initializeEventListeners();
        initializeAccessibility();
        
        // Зареждане на началните данни
        loadInitialData();
        
        console.log('✅ Приложението е успешно инициализирано');
        
    } catch (error) {
        console.error('❌ Грешка при инициализация:', error);
        showErrorNotification('Възникна грешка при зареждане на приложението');
    }
});

/**
 * Инициализира навигационната система между слайдовете
 */
function initializeNavigation() {
    console.log('🧭 Инициализация на навигационната система...');
    
    const navigationButtons = document.querySelectorAll('.nav-btn');
    const slides = document.querySelectorAll('.slide');
    
    // Валидация на DOM елементите
    if (navigationButtons.length === 0 || slides.length === 0) {
        throw new Error('Липсват необходими DOM елементи за навигацията');
    }
    
    // Добавяне на event listeners за навигационните бутони
    navigationButtons.forEach(button => {
        button.addEventListener('click', handleNavigationClick);
        button.addEventListener('keydown', handleNavigationKeydown);
    });
    
    // Инициализация на първоначалното състояние
    setActiveSlide('home');
    
    console.log('✅ Навигационната система е инициализирана');
}

/**
 * Инициализира чатбот функционалността
 */
function initializeChat() {
    console.log('🤖 Инициализация на чатбот системата...');
    
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    
    // Валидация на чат елементите
    if (!chatForm || !userInput || !sendButton) {
        console.warn('⚠️ Чат елементите не са намерени - чатът няма да работи');
        return;
    }
    
    // Event listeners за чата
    chatForm.addEventListener('submit', handleChatSubmit);
    userInput.addEventListener('keydown', handleChatKeydown);
    userInput.addEventListener('input', handleInputChange);
    
    // Инициализация на приветствено съобщение
    displayWelcomeMessage();
    
    console.log('✅ Чатбот системата е инициализирана');
}

/**
 * Инициализира картографската функционалност
 */
function initializeMap() {
    console.log('🗺️ Инициализация на картографската система...');
    
    try {
        // Проверка за наличие на Leaflet библиотеката
        if (typeof L === 'undefined') {
            throw new Error('Leaflet библиотеката не е заредена');
        }
        
        // Инициализация на основната карта
        initializeMainMap();
        
        // Инициализация на контролите за картата
        initializeMapControls();
        
        // Зареждане на данни за маршрутите
        loadTrailsData();
        
        console.log('✅ Картографската система е инициализирана');
        
    } catch (error) {
        console.error('❌ Грешка при инициализация на картата:', error);
        showMapErrorState();
    }
}

/**
 * Инициализира основната карта в map слайда
 */
function initializeMainMap() {
    const mapContainer = document.getElementById('main-map');
    
    if (!mapContainer) {
        throw new Error('Контейнерът за картата не е намерен');
    }
    
    // Създаване на Leaflet карта
    applicationState.maps.main = L.map('main-map', {
        center: CONFIG.MAP_SETTINGS.DEFAULT_CENTER,
        zoom: CONFIG.MAP_SETTINGS.DEFAULT_ZOOM,
        minZoom: CONFIG.MAP_SETTINGS.MIN_ZOOM,
        maxZoom: CONFIG.MAP_SETTINGS.MAX_ZOOM,
        zoomControl: true,
        attributionControl: true
    });
    
    // Добавяне на tile layer
    L.tileLayer(CONFIG.MAP_SETTINGS.TILE_LAYER_URL, {
        attribution: CONFIG.MAP_SETTINGS.TILE_LAYER_ATTRIBUTION,
        maxZoom: CONFIG.MAP_SETTINGS.MAX_ZOOM
    }).addTo(applicationState.maps.main);
    
    // Инициализация на слоевете
    initializeMapLayers();
    
    // Event listeners за картата
    applicationState.maps.main.on('click', handleMapClick);
    applicationState.maps.main.on('zoomend', handleMapZoom);
    applicationState.maps.main.on('moveend', handleMapMove);
    
    console.log('🗺️ Основната карта е създадена успешно');
}

/**
 * Инициализира слоевете на картата
 */
function initializeMapLayers() {
    const map = applicationState.maps.main;
    
    if (!map) return;
    
    // Слой за маршрути
    applicationState.mapLayers.trails = L.layerGroup().addTo(map);
    
    // Слой за потребителско местоположение
    applicationState.mapLayers.userLocation = L.layerGroup().addTo(map);
    
    // Слой за маршрути
    applicationState.mapLayers.currentRoute = L.layerGroup().addTo(map);
    
    console.log('🗺️ Слоевете на картата са инициализирани');
}

/**
 * Инициализира контролите за картата
 */
function initializeMapControls() {
    // Бутон за показване на всички маршрути
    const showAllTrailsBtn = document.getElementById('show-all-trails');
    if (showAllTrailsBtn) {
        showAllTrailsBtn.addEventListener('click', handleShowAllTrails);
    }
    
    // Бутон за намиране на потребителското местоположение
    const locateUserBtn = document.getElementById('locate-user');
    if (locateUserBtn) {
        locateUserBtn.addEventListener('click', handleLocateUser);
    }
    
    // Бутон за превключване на сателитен изглед
    const toggleSatelliteBtn = document.getElementById('toggle-satellite');
    if (toggleSatelliteBtn) {
        toggleSatelliteBtn.addEventListener('click', handleToggleSatellite);
    }
    
    // Филтри за картата
    const difficultyFilter = document.getElementById('difficulty-filter');
    const regionFilter = document.getElementById('region-filter');
    
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', handleDifficultyFilter);
    }
    
    if (regionFilter) {
        regionFilter.addEventListener('change', handleRegionFilter);
    }
    
    console.log('🎛️ Контролите за картата са инициализирани');
}

/**
 * Инициализира общите event listeners
 */
function initializeEventListeners() {
    // Resize handler за адаптивност
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Visibility change за оптимизация
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Unload handler за почистване
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    console.log('🎧 Глобалните event listeners са инициализирани');
}

/**
 * Инициализира функции за достъпност
 */
function initializeAccessibility() {
    // ARIA labels и роли
    updateAriaLabels();
    
    // Focus management
    setupFocusManagement();
    
    // Screen reader съвместимост
    setupScreenReaderSupport();
    
    console.log('♿ Функциите за достъпност са инициализирани');
}

// ============================================================================
// НАВИГАЦИОННА СИСТЕМА
// ============================================================================

/**
 * Обработва кликове върху навигационните бутони
 * @param {Event} event - DOM събитието
 */
function handleNavigationClick(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const targetSlide = button.getAttribute('data-slide');
    
    if (!targetSlide) {
        console.warn('⚠️ Липсва data-slide атрибут на навигационния бутон');
        return;
    }
    
    console.log(`🧭 Навигация към слайд: ${targetSlide}`);
    
    // Анимация на бутона
    animateButtonClick(button);
    
    // Преминаване към новия слайд
    setActiveSlide(targetSlide);
    
    // Проследяване на навигацията (analytics)
    trackNavigation(targetSlide);
}

/**
 * Обработва keyboard навигация
 * @param {KeyboardEvent} event - Keyboard събитието
 */
function handleNavigationKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNavigationClick(event);
    }
}

/**
 * Задава активен слайд с плавна анимация
 * @param {string} slideId - ID на слайда за активиране
 */
function setActiveSlide(slideId) {
    const slides = document.querySelectorAll('.slide');
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // Валидация на входния параметър
    if (!slideId || typeof slideId !== 'string') {
        console.error('❌ Невалиден ID на слайд:', slideId);
        return;
    }
    
    // Намиране на целевия слайд
    const targetSlide = document.getElementById(`${slideId}-slide`);
    if (!targetSlide) {
        console.error(`❌ Слайд с ID "${slideId}-slide" не е намерен`);
        return;
    }
    
    console.log(`🎬 Активиране на слайд: ${slideId}`);
    
    // Деактивиране на всички слайдове
    slides.forEach(slide => {
        slide.classList.remove('active');
        slide.setAttribute('aria-hidden', 'true');
    });
    
    // Деактивиране на всички навигационни бутони
    navButtons.forEach(button => {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
    });
    
    // Активиране на целевия слайд
    targetSlide.classList.add('active');
    targetSlide.setAttribute('aria-hidden', 'false');
    
    // Активиране на съответния навигационен бутон
    const activeButton = document.querySelector(`[data-slide="${slideId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-pressed', 'true');
    }
    
    // Актуализиране на състоянието
    applicationState.currentSlide = slideId;
    
    // Специфични действия за различните слайдове
    handleSlideSpecificActions(slideId);
    
    // Актуализиране на URL без презареждане
    updateURLState(slideId);
}

/**
 * Изпълнява специфични действия при активиране на различни слайдове
 * @param {string} slideId - ID на активирания слайд
 */
function handleSlideSpecificActions(slideId) {
    switch (slideId) {
        case 'map':
            handleMapSlideActivation();
            break;
        case 'chat':
            handleChatSlideActivation();
            break;
        case 'home':
            handleHomeSlideActivation();
            break;
        default:
            console.log(`ℹ️ Няма специфични действия за слайд: ${slideId}`);
    }
}

/**
 * Обработва активирането на map слайда
 */
function handleMapSlideActivation() {
    console.log('🗺️ Активиране на map слайд...');
    
    // Изчакване за завършване на анимацията
    setTimeout(() => {
        if (applicationState.maps.main) {
            // Преоразмеряване на картата
            applicationState.maps.main.invalidateSize();
            
            // Зареждане на маршрути ако не са заредени
            if (applicationState.mapLayers.markers.length === 0) {
                loadTrailsOnMap();
            }
            
            console.log('✅ Map слайдът е активиран успешно');
        }
    }, CONFIG.ANIMATION_DURATIONS.SLIDE_TRANSITION);
}

/**
 * Обработва активирането на chat слайда
 */
function handleChatSlideActivation() {
    console.log('💬 Активиране на chat слайд...');
    
    // Фокусиране на input полето
    setTimeout(() => {
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.focus();
        }
    }, CONFIG.ANIMATION_DURATIONS.SLIDE_TRANSITION);
}

/**
 * Обработва активирането на home слайда
 */
function handleHomeSlideActivation() {
    console.log('🏠 Активиране на home слайд...');
    
    // Актуализиране на статистиките
    updateStatistics();
}

// ============================================================================
// ЧАТБОТ ФУНКЦИОНАЛНОСТ
// ============================================================================

/**
 * Обработва изпращането на съобщения в чата
 * @param {Event} event - Form submit събитието
 */
async function handleChatSubmit(event) {
    event.preventDefault();
    
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    // Валидация на съобщението
    if (!message) {
        showInputError('Моля, въведете съобщение');
        return;
    }
    
    if (message.length > CONFIG.LIMITS.MAX_MESSAGE_LENGTH) {
        showInputError(`Съобщението е твърде дълго (максимум ${CONFIG.LIMITS.MAX_MESSAGE_LENGTH} символа)`);
        return;
    }
    
    console.log(`💬 Изпращане на съобщение: "${message}"`);
    
    try {
        // Показване на потребителското съобщение
        displayUserMessage(message);
        
        // Почистване на input полето
        userInput.value = '';
        
        // Показване на loading индикатор
        showTypingIndicator();
        
        // Изпращане на заявката към сървъра
        const response = await sendChatMessage(message);
        
        // Скриване на loading индикатора
        hideTypingIndicator();
        
        // Показване на отговора от AI
        displayAIResponse(response);
        
        // Обработка на координати ако има такива
        if (response.coords) {
            handleCoordinatesFromChat(response.coords);
        }
        
    } catch (error) {
        console.error('❌ Грешка при изпращане на съобщение:', error);
        hideTypingIndicator();
        displayErrorMessage('Възникна грешка при обработката на съобщението. Моля, опитайте отново.');
    }
}

/**
 * Изпраща съобщение към чатбот API
 * @param {string} message - Съобщението за изпращане
 * @returns {Promise<Object>} - Отговор от сървъра
 */
async function sendChatMessage(message) {
    const response = await fetch(CONFIG.API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP грешка: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Показва съобщение от потребителя в чата
 * @param {string} message - Съобщението за показване
 */
function displayUserMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageElement = createMessageElement(message, 'user');
    chatMessages.appendChild(messageElement);
    
    // Скролиране до дъното
    scrollToBottom(chatMessages);
    
    // Добавяне към историята
    applicationState.chat.messageHistory.push({
        type: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
}

/**
 * Показва отговор от AI в чата
 * @param {Object} response - Отговорът от сървъра
 */
function displayAIResponse(response) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const message = response.response || 'Извинявам се, но не мога да обработя заявката ви в момента.';
    const messageElement = createMessageElement(message, 'ai');
    
    // Анимация при появяване
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    chatMessages.appendChild(messageElement);
    
    // Анимация
    setTimeout(() => {
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 50);
    
    // Скролиране до дъното
    scrollToBottom(chatMessages);
    
    // Добавяне към историята
    applicationState.chat.messageHistory.push({
        type: 'ai',
        content: message,
        timestamp: new Date().toISOString(),
        coords: response.coords || null
    });
}

/**
 * Създава DOM елемент за съобщение
 * @param {string} content - Съдържанието на съобщението
 * @param {string} type - Типът на съобщението ('user' или 'ai')
 * @returns {HTMLElement} - DOM елементът на съобщението
 */
function createMessageElement(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = formatTimestamp(new Date());
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);
    
    return messageDiv;
}

/**
 * Показва приветствено съобщение в чата
 */
function displayWelcomeMessage() {
    const welcomeMessage = `
        Здравейте! 👋 Аз съм вашият интелигентен туристически асистент за екопътеки в България.
        
        Мога да ви помогна с:
        🗺️ Намиране на подходящи маршрути
        📍 Информация за местоположения
        🥾 Съвети за подготовка
        🌟 Препоръки според вашите предпочитания
        
        Как мога да ви помогна днес?
    `;
    
    displayAIResponse({ response: welcomeMessage });
}

/**
 * Показва typing индикатор
 */
function showTypingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
        applicationState.chat.isLoading = true;
    }
}

/**
 * Скрива typing индикатора
 */
function hideTypingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        applicationState.chat.isLoading = false;
    }
}

/**
 * Обработва keyboard събития в чата
 * @param {KeyboardEvent} event - Keyboard събитието
 */
function handleChatKeydown(event) {
    // Ctrl/Cmd + Enter за изпращане
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleChatSubmit(event);
    }
}

/**
 * Обработва промени в input полето
 * @param {Event} event - Input събитието
 */
function handleInputChange(event) {
    const input = event.target;
    const charCount = input.value.length;
    const maxLength = CONFIG.LIMITS.MAX_MESSAGE_LENGTH;
    
    // Показване на брояч на символите
    updateCharacterCount(charCount, maxLength);
    
    // Валидация в реално време
    if (charCount > maxLength) {
        input.classList.add('error');
    } else {
        input.classList.remove('error');
    }
}

// ============================================================================
// КАРТОГРАФСКА ФУНКЦИОНАЛНОСТ
// ============================================================================

/**
 * Зарежда данни за маршрутите от сървъра
 */
async function loadTrailsData() {
    console.log('📊 Зареждане на данни за маршрутите...');
    
    try {
        const response = await fetch(CONFIG.API_ENDPOINTS.ALL_TRAILS);
        
        if (!response.ok) {
            throw new Error(`HTTP грешка: ${response.status}`);
        }
        
        const data = await response.json();
        const trails = data.trails || data;
        
        // Кеширане на данните
        trails.forEach(trail => {
            dataCache.trails.set(trail.id, trail);
        });
        
        console.log(`✅ Заредени ${trails.length} маршрута`);
        
        return trails;
        
    } catch (error) {
        console.error('❌ Грешка при зареждане на маршрути:', error);
        throw error;
    }
}

/**
 * Показва всички маршрути на картата
 */
async function loadTrailsOnMap() {
    console.log('🗺️ Зареждане на маршрути на картата...');
    
    try {
        const trails = await loadTrailsData();
        
        // Почистване на съществуващите маркери
        clearMapMarkers();
        
        // Добавяне на нови маркери
        trails.forEach(trail => {
            if (trail.location && trail.location.coordinates) {
                addTrailMarker(trail);
            }
        });
        
        // Центриране на картата за да покаже всички маркери
        fitMapToMarkers();
        
        console.log('✅ Маршрутите са заредени на картата');
        
    } catch (error) {
        console.error('❌ Грешка при зареждане на маршрути на картата:', error);
        showMapErrorState();
    }
}

/**
 * Добавя маркер за маршрут на картата
 * @param {Object} trail - Данни за маршрута
 */
function addTrailMarker(trail) {
    const map = applicationState.maps.main;
    const coords = trail.location.coordinates;
    
    if (!map || !coords || !coords.lat || !coords.lng) {
        console.warn('⚠️ Невалидни координати за маршрут:', trail.name);
        return;
    }
    
    // Създаване на маркер
    const marker = L.marker([coords.lat, coords.lng])
        .bindPopup(createTrailPopupContent(trail))
        .on('click', () => handleTrailMarkerClick(trail));
    
    // Добавяне към слоя
    marker.addTo(applicationState.mapLayers.trails);
    
    // Запазване в масива с маркери
    applicationState.mapLayers.markers.push({
        marker: marker,
        trail: trail
    });
}

/**
 * Създава съдържание за popup на маршрут
 * @param {Object} trail - Данни за маршрута
 * @returns {string} - HTML съдържание за popup
 */
function createTrailPopupContent(trail) {
    const difficulty = trail.trail_details?.difficulty || 'Неопределена';
    const region = trail.location?.region || 'Неизвестен регион';
    const duration = trail.trail_details?.duration || 'Неопределена';
    
    return `
        <div class="trail-popup">
            <h3 class="trail-popup-title">${trail.name}</h3>
            <p class="trail-popup-description">${trail.description || 'Няма описание'}</p>
            <div class="trail-popup-details">
                <div class="detail-row">
                    <strong>Регион:</strong> ${region}
                </div>
                <div class="detail-row">
                    <strong>Трудност:</strong> ${difficulty}
                </div>
                <div class="detail-row">
                    <strong>Продължителност:</strong> ${duration}
                </div>
            </div>
            <div class="trail-popup-actions">
                <button class="popup-btn primary" onclick="showTrailDetails('${trail.id}')">
                    📍 Детайли
                </button>
                <button class="popup-btn secondary" onclick="getDirectionsToTrail('${trail.id}')">
                    🧭 Навигация
                </button>
            </div>
        </div>
    `;
}

/**
 * Обработва кликове върху маркери на маршрути
 * @param {Object} trail - Данни за маршрута
 */
function handleTrailMarkerClick(trail) {
    console.log(`🎯 Кликнат маршрут: ${trail.name}`);
    
    // Показване на информационния панел
    showTrailInfoPanel(trail);
    
    // Центриране на картата върху маркера
    const coords = trail.location.coordinates;
    applicationState.maps.main.setView([coords.lat, coords.lng], 14);
    
    // Проследяване на взаимодействието
    trackMapInteraction('trail_marker_click', trail.id);
}

/**
 * Показва информационния панел за маршрут
 * @param {Object} trail - Данни за маршрута
 */
function showTrailInfoPanel(trail) {
    const infoPanel = document.getElementById('map-info-panel');
    
    if (!infoPanel) {
        console.warn('⚠️ Информационният панел не е намерен');
        return;
    }
    
    // Попълване на данните
    const titleElement = document.getElementById('trail-name');
    const descriptionElement = document.getElementById('trail-description');
    const difficultyElement = document.getElementById('trail-difficulty');
    const durationElement = document.getElementById('trail-duration');
    const regionElement = document.getElementById('trail-region');
    
    if (titleElement) titleElement.textContent = trail.name;
    if (descriptionElement) descriptionElement.textContent = trail.description || 'Няма описание';
    if (difficultyElement) difficultyElement.textContent = trail.trail_details?.difficulty || 'Неопределена';
    if (durationElement) durationElement.textContent = trail.trail_details?.duration || 'Неопределена';
    if (regionElement) regionElement.textContent = trail.location?.region || 'Неизвестен регион';
    
    // Показване на панела
    infoPanel.style.display = 'block';
    
    // Анимация на появяване
    setTimeout(() => {
        infoPanel.classList.add('visible');
    }, 10);
    
    // Event listener за затваряне
    const closeBtn = document.getElementById('close-info-panel');
    if (closeBtn) {
        closeBtn.onclick = hideTrailInfoPanel;
    }
    
    // Event listeners за действията
    const directionsBtn = document.getElementById('get-directions');
    const saveBtn = document.getElementById('save-trail');
    
    if (directionsBtn) {
        directionsBtn.onclick = () => getDirectionsToTrail(trail.id);
    }
    
    if (saveBtn) {
        saveBtn.onclick = () => saveTrailToFavorites(trail.id);
    }
}

/**
 * Скрива информационния панел за маршрут
 */
function hideTrailInfoPanel() {
    const infoPanel = document.getElementById('map-info-panel');
    
    if (infoPanel) {
        infoPanel.classList.remove('visible');
        setTimeout(() => {
            infoPanel.style.display = 'none';
        }, 300);
    }
}

/**
 * Обработва показването на всички маршрути
 */
function handleShowAllTrails() {
    console.log('🗺️ Показване на всички маршрути...');
    
    loadTrailsOnMap().catch(error => {
        console.error('❌ Грешка при показване на всички маршрути:', error);
        showNotification('Възникна грешка при зареждане на маршрутите', 'error');
    });
}

/**
 * Обработва намирането на потребителското местоположение
 */
function handleLocateUser() {
    console.log('📍 Намиране на потребителското местоположение...');
    
    if (!navigator.geolocation) {
        showNotification('Геолокацията не се поддържа от вашия браузър', 'warning');
        return;
    }
    
    // Показване на loading състояние
    const locateBtn = document.getElementById('locate-user');
    if (locateBtn) {
        locateBtn.classList.add('loading');
        locateBtn.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log(`📍 Местоположение намерено: ${lat}, ${lng}`);
            
            // Добавяне на маркер за потребителското местоположение
            addUserLocationMarker(lat, lng);
            
            // Центриране на картата
            applicationState.maps.main.setView([lat, lng], 15);
            
            showNotification('Вашето местоположение е намерено успешно', 'success');
            
            // Премахване на loading състоянието
            if (locateBtn) {
                locateBtn.classList.remove('loading');
                locateBtn.disabled = false;
            }
        },
        (error) => {
            console.error('❌ Грешка при намиране на местоположение:', error);
            
            let errorMessage = 'Не може да се определи вашето местоположение';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Достъпът до местоположението е отказан';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Информацията за местоположението не е достъпна';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Заявката за местоположение изтече';
                    break;
            }
            
            showNotification(errorMessage, 'error');
            
            // Премахване на loading състоянието
            if (locateBtn) {
                locateBtn.classList.remove('loading');
                locateBtn.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 минути
        }
    );
}

/**
 * Добавя маркер за потребителското местоположение
 * @param {number} lat - Географска ширина
 * @param {number} lng - Географска дължина
 */
function addUserLocationMarker(lat, lng) {
    // Почистване на предишния маркер
    applicationState.mapLayers.userLocation.clearLayers();
    
    // Създаване на нов маркер
    const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '📍',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    const marker = L.marker([lat, lng], { icon: userIcon })
        .bindPopup('Вашето местоположение')
        .addTo(applicationState.mapLayers.userLocation);
    
    // Добавяне на кръг за точност
    const accuracyCircle = L.circle([lat, lng], {
        radius: 100, // 100 метра приблизителна точност
        fillColor: '#3388ff',
        fillOpacity: 0.1,
        color: '#3388ff',
        weight: 2
    }).addTo(applicationState.mapLayers.userLocation);
}

/**
 * Обработва превключването на сателитен изглед
 */
function handleToggleSatellite() {
    console.log('🛰️ Превключване на сателитен изглед...');
    
    const map = applicationState.maps.main;
    const currentStyle = applicationState.userPreferences.mapStyle;
    
    if (currentStyle === 'standard') {
        // Превключване към сателитен изглед
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
        }).addTo(map);
        
        applicationState.userPreferences.mapStyle = 'satellite';
        
        // Актуализиране на бутона
        const toggleBtn = document.getElementById('toggle-satellite');
        if (toggleBtn) {
            toggleBtn.querySelector('.control-text').textContent = 'Стандартен изглед';
        }
        
    } else {
        // Превключване към стандартен изглед
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        L.tileLayer(CONFIG.MAP_SETTINGS.TILE_LAYER_URL, {
            attribution: CONFIG.MAP_SETTINGS.TILE_LAYER_ATTRIBUTION
        }).addTo(map);
        
        applicationState.userPreferences.mapStyle = 'standard';
        
        // Актуализиране на бутона
        const toggleBtn = document.getElementById('toggle-satellite');
        if (toggleBtn) {
            toggleBtn.querySelector('.control-text').textContent = 'Сателитен изглед';
        }
    }
}

/**
 * Обработва филтриране по трудност
 * @param {Event} event - Change събитието
 */
function handleDifficultyFilter(event) {
    const selectedDifficulty = event.target.value;
    console.log(`🔍 Филтриране по трудност: ${selectedDifficulty || 'всички'}`);
    
    applicationState.filters.difficulty = selectedDifficulty || null;
    applyMapFilters();
}

/**
 * Обработва филтриране по регион
 * @param {Event} event - Change събитието
 */
function handleRegionFilter(event) {
    const selectedRegion = event.target.value;
    console.log(`🔍 Филтриране по регион: ${selectedRegion || 'всички'}`);
    
    applicationState.filters.region = selectedRegion || null;
    applyMapFilters();
}

/**
 * Прилага активните филтри върху картата
 */
function applyMapFilters() {
    console.log('🔍 Прилагане на филтри...');
    
    const { difficulty, region } = applicationState.filters;
    
    applicationState.mapLayers.markers.forEach(({ marker, trail }) => {
        let shouldShow = true;
        
        // Филтър по трудност
        if (difficulty && trail.trail_details?.difficulty) {
            shouldShow = shouldShow && trail.trail_details.difficulty.toLowerCase().includes(difficulty.toLowerCase());
        }
        
        // Филтър по регион
        if (region && trail.location?.region) {
            shouldShow = shouldShow && trail.location.region.toLowerCase().includes(region.toLowerCase());
        }
        
        // Показване/скриване на маркера
        if (shouldShow) {
            marker.addTo(applicationState.mapLayers.trails);
        } else {
            applicationState.mapLayers.trails.removeLayer(marker);
        }
    });
    
    console.log('✅ Филтрите са приложени');
}

/**
 * Обработва координати получени от чата
 * @param {Object} coords - Координатите {lat, lng}
 */
function handleCoordinatesFromChat(coords) {
    console.log('📍 Получени координати от чата:', coords);
    
    // Запазване на координатите
    applicationState.chat.lastCoordinates = coords;
    
    // Показване на бутон за визуализация на картата
    showMapVisualizationButton(coords);
}

/**
 * Показва бутон за визуализация на картата
 * @param {Object} coords - Координатите за показване
 */
function showMapVisualizationButton(coords) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Проверка дали вече има такъв бутон
    const existingButton = chatMessages.querySelector('.map-visualization-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Създаване на бутон за визуализация
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'message ai-message map-visualization-container';
    
    const button = document.createElement('button');
    button.className = 'map-visualization-button';
    button.innerHTML = '🗺️ Покажи на картата';
    button.onclick = () => visualizeLocationOnMap(coords);
    
    const description = document.createElement('p');
    description.className = 'map-visualization-description';
    description.textContent = 'Кликнете за да видите местоположението на интерактивната карта';
    
    buttonContainer.appendChild(description);
    buttonContainer.appendChild(button);
    
    chatMessages.appendChild(buttonContainer);
    scrollToBottom(chatMessages);
}

/**
 * Визуализира местоположение на картата
 * @param {Object} coords - Координатите за показване
 */
function visualizeLocationOnMap(coords) {
    console.log('🗺️ Визуализация на местоположение на картата:', coords);
    
    // Преминаване към map слайда
    setActiveSlide('map');
    
    // Изчакване за активиране на слайда
    setTimeout(() => {
        const map = applicationState.maps.main;
        
        if (map) {
            // Центриране на картата
            map.setView([coords.lat, coords.lng], 15);
            
            // Добавяне на маркер
            const marker = L.marker([coords.lat, coords.lng])
                .bindPopup('Местоположение от чата')
                .addTo(map)
                .openPopup();
            
            // Анимация на маркера
            setTimeout(() => {
                marker.bounce();
            }, 500);
            
            showNotification('Местоположението е показано на картата', 'success');
        }
    }, CONFIG.ANIMATION_DURATIONS.SLIDE_TRANSITION + 100);
}

// ============================================================================
// ПОМОЩНИ ФУНКЦИИ
// ============================================================================

/**
 * Debounce функция за оптимизация на performance
 * @param {Function} func - Функцията за изпълнение
 * @param {number} wait - Време за изчакване в милисекунди
 * @returns {Function} - Debounced функция
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Форматира timestamp за показване
 * @param {Date} date - Датата за форматиране
 * @returns {string} - Форматиран timestamp
 */
function formatTimestamp(date) {
    return date.toLocaleTimeString('bg-BG', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Скролира до дъното на контейнер
 * @param {HTMLElement} container - Контейнерът за скролиране
 */
function scrollToBottom(container) {
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Показва notification съобщение
 * @param {string} message - Съобщението за показване
 * @param {string} type - Типът на съобщението ('success', 'error', 'warning', 'info')
 */
function showNotification(message, type = 'info') {
    console.log(`📢 Notification (${type}): ${message}`);
    
    // Тук може да се добави логика за показване на toast notifications
    // За момента използваме console.log
}

/**
 * Актуализира URL състоянието без презареждане
 * @param {string} slideId - ID на активния слайд
 */
function updateURLState(slideId) {
    if (history.pushState) {
        const newUrl = `${window.location.pathname}#${slideId}`;
        history.pushState({ slide: slideId }, '', newUrl);
    }
}

/**
 * Проследява навигационни събития за analytics
 * @param {string} slideId - ID на слайда
 */
function trackNavigation(slideId) {
    // Тук може да се добави логика за analytics
    console.log(`📊 Navigation tracked: ${slideId}`);
}

/**
 * Проследява взаимодействия с картата
 * @param {string} action - Действието
 * @param {string} data - Допълнителни данни
 */
function trackMapInteraction(action, data) {
    console.log(`📊 Map interaction tracked: ${action}`, data);
}

/**
 * Зарежда началните данни за приложението
 */
async function loadInitialData() {
    console.log('📊 Зареждане на начални данни...');
    
    try {
        // Зареждане на статистики
        await updateStatistics();
        
        console.log('✅ Началните данни са заредени');
        
    } catch (error) {
        console.error('❌ Грешка при зареждане на начални данни:', error);
    }
}

/**
 * Актуализира статистиките на началната страница
 */
async function updateStatistics() {
    try {
        const trails = await loadTrailsData();
        
        // Актуализиране на броя маршрути
        const trailCountElement = document.querySelector('.stat-number');
        if (trailCountElement) {
            trailCountElement.textContent = `${trails.length}+`;
        }
        
        console.log('📊 Статистиките са актуализирани');
        
    } catch (error) {
        console.error('❌ Грешка при актуализиране на статистики:', error);
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Обработва промяна на размера на прозореца
 */
function handleWindowResize() {
    // Преоразмеряване на картите
    if (applicationState.maps.main) {
        applicationState.maps.main.invalidateSize();
    }
    
    console.log('📐 Прозорецът е преоразмерен');
}

/**
 * Обработва глобални keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard събитието
 */
function handleGlobalKeydown(event) {
    // Escape за затваряне на панели
    if (event.key === 'Escape') {
        hideTrailInfoPanel();
    }
    
    // Цифрови клавиши за навигация
    if (event.key >= '1' && event.key <= '5') {
        const slideIndex = parseInt(event.key) - 1;
        const slides = ['home', 'about', 'instructions', 'chat', 'map'];
        
        if (slides[slideIndex]) {
            setActiveSlide(slides[slideIndex]);
        }
    }
}

/**
 * Обработва промяна на visibility на страницата
 */
function handleVisibilityChange() {
    if (document.hidden) {
        console.log('📱 Приложението е скрито');
        // Пауза на анимации и таймери
    } else {
        console.log('📱 Приложението е видимо');
        // Възобновяване на анимации
    }
}

/**
 * Обработва затварянето на страницата
 */
function handleBeforeUnload() {
    console.log('👋 Приложението се затваря...');
    
    // Почистване на ресурси
    if (applicationState.maps.main) {
        applicationState.maps.main.remove();
    }
}

/**
 * Обработва кликове върху картата
 * @param {Object} event - Leaflet click събитието
 */
function handleMapClick(event) {
    const { lat, lng } = event.latlng;
    console.log(`🗺️ Кликната позиция: ${lat}, ${lng}`);
    
    // Скриване на информационния панел
    hideTrailInfoPanel();
}

/**
 * Обработва промяна на zoom нивото
 * @param {Object} event - Leaflet zoom събитието
 */
function handleMapZoom(event) {
    const zoomLevel = event.target.getZoom();
    console.log(`🔍 Ново zoom ниво: ${zoomLevel}`);
}

/**
 * Обработва движение на картата
 * @param {Object} event - Leaflet move събитието
 */
function handleMapMove(event) {
    const center = event.target.getCenter();
    console.log(`🗺️ Нов център: ${center.lat}, ${center.lng}`);
}

// ============================================================================
// ДОПЪЛНИТЕЛНИ ФУНКЦИИ
// ============================================================================

/**
 * Почиства всички маркери от картата
 */
function clearMapMarkers() {
    if (applicationState.mapLayers.trails) {
        applicationState.mapLayers.trails.clearLayers();
    }
    
    applicationState.mapLayers.markers = [];
    console.log('🧹 Маркерите са изчистени от картата');
}

/**
 * Центрира картата за да покаже всички маркери
 */
function fitMapToMarkers() {
    const map = applicationState.maps.main;
    const markers = applicationState.mapLayers.markers;
    
    if (!map || markers.length === 0) return;
    
    const group = new L.featureGroup(markers.map(m => m.marker));
    map.fitBounds(group.getBounds().pad(0.1));
    
    console.log('🎯 Картата е центрирана към всички маркери');
}

/**
 * Показва състояние на грешка за картата
 */
function showMapErrorState() {
    const mapContainer = document.getElementById('main-map');
    
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="map-error-state">
                <div class="error-icon">🗺️</div>
                <h3>Картата не може да бъде заредена</h3>
                <p>Възникна техническа грешка. Моля, опитайте отново.</p>
                <button onclick="initializeMap()" class="retry-btn">
                    🔄 Опитай отново
                </button>
            </div>
        `;
    }
}

/**
 * Анимира клик на бутон
 * @param {HTMLElement} button - Бутонът за анимиране
 */
function animateButtonClick(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

/**
 * Показва грешка в input полето
 * @param {string} message - Съобщението за грешка
 */
function showInputError(message) {
    const userInput = document.getElementById('user-input');
    
    if (userInput) {
        userInput.classList.add('error');
        userInput.setAttribute('aria-invalid', 'true');
        
        // Премахване на грешката след 3 секунди
        setTimeout(() => {
            userInput.classList.remove('error');
            userInput.removeAttribute('aria-invalid');
        }, 3000);
    }
    
    showNotification(message, 'error');
}

/**
 * Показва съобщение за грешка в чата
 * @param {string} message - Съобщението за грешка
 */
function displayErrorMessage(message) {
    displayAIResponse({
        response: `❌ ${message}`
    });
}

/**
 * Актуализира брояча на символите
 * @param {number} current - Текущ брой символи
 * @param {number} max - Максимален брой символи
 */
function updateCharacterCount(current, max) {
    // Тук може да се добави логика за показване на брояч
    console.log(`📝 Символи: ${current}/${max}`);
}

/**
 * Актуализира ARIA labels за достъпност
 */
function updateAriaLabels() {
    const slides = document.querySelectorAll('.slide');
    
    slides.forEach(slide => {
        const isActive = slide.classList.contains('active');
        slide.setAttribute('aria-hidden', !isActive);
    });
}

/**
 * Настройва focus management
 */
function setupFocusManagement() {
    // Trap focus в активния слайд
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            trapFocusInActiveSlide(event);
        }
    });
}

/**
 * Настройва поддръжка за screen readers
 */
function setupScreenReaderSupport() {
    // Добавяне на live regions за динамично съдържание
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.setAttribute('aria-live', 'polite');
        chatMessages.setAttribute('aria-label', 'Съобщения от чата');
    }
}

/**
 * Ограничава focus в активния слайд
 * @param {KeyboardEvent} event - Tab събитието
 */
function trapFocusInActiveSlide(event) {
    const activeSlide = document.querySelector('.slide.active');
    if (!activeSlide) return;
    
    const focusableElements = activeSlide.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
        if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
        }
    } else {
        if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
        }
    }
}

// ============================================================================
// ГЛОБАЛНИ ФУНКЦИИ (достъпни от HTML)
// ============================================================================

/**
 * Показва детайли за маршрут (извиква се от popup)
 * @param {string} trailId - ID на маршрута
 */
window.showTrailDetails = function(trailId) {
    console.log(`📋 Показване на детайли за маршрут: ${trailId}`);
    
    const trail = dataCache.trails.get(trailId);
    if (trail) {
        showTrailInfoPanel(trail);
    } else {
        showNotification('Маршрутът не е намерен', 'error');
    }
};

/**
 * Получава навигация до маршрут (извиква се от popup)
 * @param {string} trailId - ID на маршрута
 */
window.getDirectionsToTrail = function(trailId) {
    console.log(`🧭 Навигация до маршрут: ${trailId}`);
    
    const trail = dataCache.trails.get(trailId);
    if (!trail || !trail.location?.coordinates) {
        showNotification('Координатите на маршрута не са налични', 'error');
        return;
    }
    
    // Проверка за геолокация
    if (!navigator.geolocation) {
        showNotification('Геолокацията не се поддържа', 'warning');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const trailCoords = trail.location.coordinates;
            
            // Отваряне на Google Maps за навигация
            const googleMapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${trailCoords.lat},${trailCoords.lng}`;
            window.open(googleMapsUrl, '_blank');
            
            showNotification('Навигацията е отворена в нов прозорец', 'success');
        },
        (error
