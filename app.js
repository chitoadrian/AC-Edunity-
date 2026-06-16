/* ============================================
   AC Edunity - LOGICA PRINCIPAL
   JavaScript puro - Funcionalidades SPA
   ============================================ */

// ============================================
// ESTADO GLOBAL
// ============================================

let currentUser = null;
let currentSection = 'dashboard';
let isDarkTheme = !localStorage.getItem('theme') || localStorage.getItem('theme') === 'dark';
let isTabletOrSmaller = window.innerWidth <= 768;
let calendarViewDate = new Date(2026, 5, 1);
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

// Datos simulados de usuarios. En el futuro esto puede conectarse con Supabase.
const defaultUsers = {
    'adrian@example.com': {
        password: 'password123',
        name: 'Adrian Maximiliano Chito Vargas'
    },
    'test@example.com': {
        password: 'test123',
        name: 'Usuario Prueba'
    }
};

function getUsers() {
    const storedUsers = localStorage.getItem('simulatedUsers');
    if (!storedUsers) return { ...defaultUsers };

    try {
        return { ...defaultUsers, ...JSON.parse(storedUsers) };
    } catch (error) {
        localStorage.removeItem('simulatedUsers');
        return { ...defaultUsers };
    }
}

function saveUsers(users) {
    localStorage.setItem('simulatedUsers', JSON.stringify(users));
}

function getPublicUser(email, userRecord = {}) {
    const { password, ...publicData } = userRecord;
    return { email, ...publicData };
}

// Mensajes visuales propios de AC Edunity. Evitan ventanas nativas del navegador.
let toastTimeout = null;

function notify(message, type = 'info') {
    let toast = document.getElementById('app-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `app-toast ${type} show`;

    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

function setAuthMessage(pageId, message, type = 'error') {
    const page = document.getElementById(`${pageId}-page`);
    const card = page ? page.querySelector('.auth-card') : null;
    if (!card) {
        notify(message, type);
        return;
    }

    let messageBox = card.querySelector('.auth-message');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.className = 'auth-message';
        messageBox.setAttribute('role', 'status');
        card.appendChild(messageBox);
    }

    messageBox.textContent = message;
    messageBox.className = `auth-message ${type}`;
}

function clearAuthMessages() {
    document.querySelectorAll('.auth-message').forEach(message => message.remove());
}

function openQuickForm(config) {
    const existingModal = document.querySelector('.quick-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'quick-modal';
    modal.innerHTML = `
        <div class="quick-modal-card" role="dialog" aria-modal="true" aria-label="${escapeHTML(config.title)}">
            <button class="quick-modal-close" type="button" aria-label="Cerrar">x</button>
            <h3>${escapeHTML(config.title)}</h3>
            <form class="quick-modal-form">
                ${config.fields.map(field => `
                    <label>
                        <span>${escapeHTML(field.label)}</span>
                        ${renderQuickField(field)}
                    </label>
                `).join('')}
                <div class="quick-modal-actions">
                    <button class="btn-primary btn-small" type="submit">${escapeHTML(config.submitLabel || 'Guardar')}</button>
                </div>
            </form>
        </div>
    `;

    const closeModal = () => modal.remove();
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.classList.contains('quick-modal-close')) {
            closeModal();
        }
    });

    modal.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = Object.fromEntries(formData.entries());
        closeModal();
        config.onSubmit(values);
    });

    document.body.appendChild(modal);
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) firstInput.focus();
}

function renderQuickField(field) {
    if (field.type === 'textarea') {
        return `
            <textarea
                name="${escapeHTML(field.name)}"
                placeholder="${escapeHTML(field.placeholder || '')}"
                rows="${field.rows || 4}"
                ${field.required === false ? '' : 'required'}
            >${escapeHTML(field.value || '')}</textarea>
        `;
    }

    if (field.type === 'select') {
        const options = (field.options || []).map(option => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            const selected = String(field.value || '') === String(value) ? 'selected' : '';
            return `<option value="${escapeHTML(value)}" ${selected}>${escapeHTML(label)}</option>`;
        }).join('');

        return `<select name="${escapeHTML(field.name)}" ${field.required === false ? '' : 'required'}>${options}</select>`;
    }

    if (field.type === 'choice-grid') {
        const options = (field.options || []).map((option, index) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            const tone = typeof option === 'string' ? '' : option.tone || '';
            const iconClass = typeof option === 'string' ? '' : option.iconClass || '';
            const checked = String(field.value || '') === String(value) || (!field.value && index === 0) ? 'checked' : '';
            return `
                <label class="choice-pill ${escapeHTML(iconClass)}" style="${tone ? `--choice-color:${escapeHTML(tone)}` : ''}">
                    <input type="radio" name="${escapeHTML(field.name)}" value="${escapeHTML(value)}" ${checked} ${field.required === false ? '' : 'required'}>
                    <span class="choice-dot" aria-hidden="true"></span>
                    <strong>${escapeHTML(label)}</strong>
                </label>
            `;
        }).join('');

        return `<div class="choice-grid">${options}</div>`;
    }

    if (field.type === 'checkbox') {
        return `
            <span class="quick-check">
                <input type="checkbox" name="${escapeHTML(field.name)}" value="yes" ${field.checked ? 'checked' : ''}>
                <span>${escapeHTML(field.help || 'Activar')}</span>
            </span>
        `;
    }

    if (field.type === 'file') {
        return `
            <input
                type="file"
                name="${escapeHTML(field.name)}"
                accept="${escapeHTML(field.accept || '')}"
                ${field.required === false ? '' : 'required'}
            >
        `;
    }

    return `
        <input
            type="${field.type || 'text'}"
            name="${escapeHTML(field.name)}"
            value="${escapeHTML(field.value || '')}"
            placeholder="${escapeHTML(field.placeholder || '')}"
            ${field.required === false ? '' : 'required'}
        >
    `;
}

// ============================================
// INICIALIZACION
// ============================================

function initializeApp() {
    // Cargar tema guardado
    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        updateThemeIcon('theme');
    } else {
        document.body.classList.add('light-theme');
        updateThemeIcon('theme');
    }

    // Al abrir el link publico siempre se muestra primero el menu principal.
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLanding();

    // Event listeners para responsive
    window.addEventListener('resize', handleWindowResize);

    // Generar calendario
    generateCalendar();
    renderSavedSubjects();
    renderSavedCalendarEvents();
    initStudyPet();
    initLandingReveal();
    initLandingWheelControl();
}

function initLandingReveal() {
    const revealItems = document.querySelectorAll(
        '#landing-page .reveal, #landing-page .reveal-left, #landing-page .reveal-right, #landing-page .reveal-scale'
    );

    if (!revealItems.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach(item => item.classList.add('active'));
        return;
    }

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            entry.target.classList.toggle('active', entry.isIntersecting);
        });
    }, {
        threshold: 0.16,
        rootMargin: '0px 0px -60px 0px'
    });

    revealItems.forEach(item => revealObserver.observe(item));
}

function resetLandingReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const revealItems = document.querySelectorAll(
        '#landing-page .reveal, #landing-page .reveal-left, #landing-page .reveal-right, #landing-page .reveal-scale'
    );

    revealItems.forEach(item => item.classList.remove('active'));

    window.requestAnimationFrame(() => {
        revealItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const visible = rect.top < window.innerHeight * 0.84 && rect.bottom > 0;
            item.classList.toggle('active', visible);
        });
    });
}

function initLandingWheelControl() {
    window.addEventListener('wheel', event => {
        if (!document.body.classList.contains('is-landing')) return;

        const scroller = document.scrollingElement || document.documentElement;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        if (maxScroll <= 0) return;

        event.preventDefault();
        scroller.scrollTop += event.deltaY;
    }, { passive: false, capture: true });
}

// ============================================
// NAVEGACION DE PAGINAS
// ============================================

function showPage(pageId) {
    const selectedPage = document.getElementById(pageId);
    if (!selectedPage) return;

    // Ocultar todas las paginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar pagina seleccionada
    selectedPage.classList.add('active');
    const isLanding = pageId === 'landing-page';
    const isDashboard = pageId === 'app-page';
    document.documentElement.classList.toggle('landing-mode', isLanding);
    document.documentElement.classList.toggle('is-landing', isLanding);
    document.documentElement.classList.toggle('is-dashboard', isDashboard);
    document.body.classList.toggle('landing-mode', isLanding);
    document.body.classList.toggle('is-landing', isLanding);
    document.body.classList.toggle('is-dashboard', isDashboard);
    window.scrollTo(0, 0);

    // Si es la app, mostrar la seccion por defecto
    if (pageId === 'app-page' && !currentUser) {
        showLanding();
    }

    if (pageId === 'app-page') {
        applySidebarCollapsedState();
    }
}

function showLanding() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('landing-page');
    resetLandingReveal();
}

function showLogin() {
    clearAuthMessages();
    showPage('login-page');
}

function showRegister() {
    clearAuthMessages();
    showPage('register-page');
}

function startPrototype() {
    showRegister();
}

function showApp() {
    showPage('app-page');
    updateDashboardGreeting();
    navigateTo('dashboard');
}

function updateDashboardGreeting() {
    const dashboardTitle = document.querySelector('#dashboard .section-header h1');
    if (dashboardTitle) {
        const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Adrian';
        dashboardTitle.textContent = `Hola ${firstName}`;
    }

    updateProfileInfo();
}

function updateProfileInfo() {
    const profileName = document.getElementById('profile-name');
    const profileAvatar = document.querySelector('.profile-avatar');

    if (profileName && currentUser?.name) {
        profileName.textContent = currentUser.name;
    }

    if (profileAvatar && currentUser?.name) {
        const initials = currentUser.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toUpperCase())
            .join('');
        profileAvatar.textContent = initials || 'AC';
    }
}

// ============================================
// AUTENTICACION
// ============================================

function handleLogin(event) {
    event.preventDefault();
    clearAuthMessages();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const users = getUsers();

    // Validar contra usuarios simulados
    if (users[email] && users[email].password === password) {
        currentUser = {
            email: email,
            name: users[email].name
        };

        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Limpiar formulario
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

        showApp();
        notify('Sesion iniciada correctamente.', 'success');
    } else {
        setAuthMessage('login', 'Email o contrasena incorrectos. Revisa tus datos o crea una cuenta nueva.', 'error');
    }
}

function handleRegister(event) {
    event.preventDefault();
    clearAuthMessages();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();

    if (!name || !email || !password) {
        setAuthMessage('register', 'Completa nombre, email y contrasena para crear tu cuenta.', 'error');
        return;
    }

    const users = getUsers();

    // Simular registro persistente en localStorage
    users[email] = {
        password: password,
        name: name
    };
    saveUsers(users);

    currentUser = {
        email: email,
        name: name
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Limpiar formulario
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';

    showApp();
    notify('Cuenta creada correctamente. Ya puedes personalizar AC Edunity.', 'success');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLanding();
    notify('Sesion cerrada.', 'info');
}

// ============================================
// NAVEGACION SPA
// ============================================

function navigateTo(sectionId, evt) {
    if (evt && evt.preventDefault) evt.preventDefault();

    // Remover clase active de secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remover clase active de nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Agregar clase active a la seccion seleccionada
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    } else {
        navigateTo('dashboard');
        return;
    }

    // Agregar clase active al nav item correspondiente
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    currentSection = sectionId;

    // Scroll al top en mobile
    if (isTabletOrSmaller) {
        document.querySelector('.main-content').scrollTop = 0;
        closeSidebar();
    }
}

// ============================================
// MODO CLARO/OSCURO
// ============================================

function toggleTheme() {
    isDarkTheme = !isDarkTheme;

    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('theme');
    } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('theme');
    }
}

function updateThemeIcon(icon) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = '';
        btn.setAttribute('aria-label', isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
        btn.classList.toggle('is-light', !isDarkTheme);
    });
}

// ============================================
// SIDEBAR RESPONSIVE
// ============================================

let sidebarOpen = false;

function applySidebarCollapsedState() {
    const appPage = document.getElementById('app-page');
    const control = document.querySelector('.app-sidebar-control');
    if (!appPage) return;

    const effectiveCollapsed = !isTabletOrSmaller && sidebarCollapsed;
    appPage.classList.toggle('sidebar-collapsed', effectiveCollapsed);
    if (control) {
        const label = isTabletOrSmaller
            ? (sidebarOpen ? 'Cerrar barra lateral' : 'Abrir barra lateral')
            : (effectiveCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral');
        control.setAttribute('title', label);
        control.setAttribute('aria-label', label);
    }
}

function toggleSidebarCollapse() {
    if (isTabletOrSmaller) {
        toggleSidebar();
        return;
    }

    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    applySidebarCollapsedState();
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
    }
    applySidebarCollapsedState();
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
    sidebarOpen = false;
    applySidebarCollapsedState();
}

function handleWindowResize() {
    isTabletOrSmaller = window.innerWidth <= 768;
    if (window.innerWidth > 768) {
        closeSidebar();
    }
    applySidebarCollapsedState();
}

// ============================================
// TAREAS
// ============================================

function toggleTask(checkbox) {
    const taskItem = checkbox.closest('.task-item');
    if (checkbox.checked) {
        taskItem.setAttribute('data-status', 'completed');
    } else {
        taskItem.setAttribute('data-status', 'pending');
    }
}

function filterTasks(filter, button) {
    // Actualizar boton activo
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }

    // Filtrar tareas
    const tasks = document.querySelectorAll('.task-item');
    tasks.forEach(task => {
        const status = task.getAttribute('data-status');
        if (filter === 'all') {
            task.style.display = 'flex';
        } else if (filter === status) {
            task.style.display = 'flex';
        } else {
            task.style.display = 'none';
        }
    });
}

function addTaskUI() {
    openQuickForm({
        title: 'Nueva tarea',
        submitLabel: 'Crear tarea',
        fields: [
            { name: 'topic', label: 'Tarea', placeholder: 'Ej: Resolver ejercicios' },
            { name: 'subject', label: 'Materia', placeholder: 'Ej: Matematica' }
        ],
        onSubmit: values => createTask(values.topic, values.subject)
    });
}

function createTask(topic, subject) {
    if (!topic || !subject) {
        notify('Completa la tarea y la materia.', 'error');
        return;
    }

    const tasksList = document.getElementById('tasks-list');

    const newTask = document.createElement('div');
    newTask.className = 'task-item';
    newTask.setAttribute('data-status', 'pending');
    newTask.innerHTML = `
        <div class="task-checkbox">
            <input type="checkbox" onclick="toggleTask(this)">
        </div>
        <div class="task-content">
            <h4>${escapeHTML(topic)}</h4>
            <p class="task-subject">Materia: ${escapeHTML(subject)}</p>
            <p class="task-date">Vence: Proximamente</p>
        </div>
        <div class="task-priority medium">Media</div>
    `;

    tasksList.appendChild(newTask);
    notify('Tarea agregada correctamente.', 'success');
}

// ============================================
// MATERIAS PERSONALIZADAS
// ============================================

function getSavedSubjects() {
    try {
        return JSON.parse(localStorage.getItem('customSubjects')) || [];
    } catch (error) {
        localStorage.removeItem('customSubjects');
        return [];
    }
}

function saveSubjects(subjects) {
    localStorage.setItem('customSubjects', JSON.stringify(subjects));
}

function addSubjectUI() {
    openQuickForm({
        title: 'Nueva materia',
        submitLabel: 'Crear materia',
        fields: [
            { name: 'name', label: 'Nombre de la materia', placeholder: 'Ej: Matematica' },
            { name: 'tasks', label: 'Tareas pendientes', type: 'number', value: '0' }
        ],
        onSubmit: values => {
            const subject = {
                name: values.name.trim(),
                tasks: values.tasks.trim() || '0',
                progress: 0,
                color: 'custom'
            };

            const subjects = getSavedSubjects();
            subjects.push(subject);
            saveSubjects(subjects);
            renderSubjectCard(subject);
            updateSubjectCounter();
            notify(`Materia "${subject.name}" creada correctamente.`, 'success');
        }
    });
}

function renderSavedSubjects() {
    getSavedSubjects().forEach(renderSubjectCard);
    updateSubjectCounter();
}

function renderSubjectCard(subject) {
    const grid = document.querySelector('.subjects-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'subject-card subject-custom';
    card.innerHTML = `
        <div class="subject-header">
            <h3>${escapeHTML(subject.name)}</h3>
            <span class="subject-icon"></span>
        </div>
        <div class="subject-stats">
            <div class="stat">
                <span class="stat-name">Promedio</span>
                <span class="stat-num">--</span>
            </div>
            <div class="stat">
                <span class="stat-name">Tareas</span>
                <span class="stat-num">${escapeHTML(subject.tasks)}</span>
            </div>
            <div class="stat">
                <span class="stat-name">Progreso</span>
                <span class="stat-num">${subject.progress}%</span>
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${subject.progress}%; background: linear-gradient(90deg, #7c3aed, #06b6d4)"></div>
        </div>
        <p class="last-activity">Ultima actividad: creada por el estudiante</p>
        <button class="btn-secondary btn-small" type="button">Acceder</button>
    `;

    const accessButton = card.querySelector('button');
    if (accessButton) {
        accessButton.addEventListener('click', () => openSubject(subject.name));
    }

    grid.appendChild(card);
}

function updateSubjectCounter() {
    const totalSubjects = 4 + getSavedSubjects().length;
    const cards = document.querySelectorAll('.stat-card');

    cards.forEach(card => {
        const label = card.querySelector('.stat-label');
        if (label && label.textContent.includes('Materias Activas')) {
            const value = card.querySelector('.stat-value');
            const subtext = card.querySelector('.stat-subtext');
            if (value) value.textContent = totalSubjects;
            if (subtext) subtext.textContent = 'Materias creadas y activas en tu cuenta';
        }
    });
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function openSubject(subjectName) {
    notify(`Abriendo ${subjectName}. En la siguiente version tendra su panel propio.`, 'info');
}

function openResource(resourceName) {
    notify(`Abriendo ${resourceName}. Vista simulada por ahora.`, 'info');
}

// ============================================
// NOTAS
// ============================================

function showAddGradeForm() {
    const form = document.getElementById('add-grade-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function hideAddGradeForm() {
    document.getElementById('add-grade-form').style.display = 'none';
}

function addGrade(event) {
    event.preventDefault();

    const subject = document.getElementById('grade-subject').value;
    const evaluation = document.getElementById('grade-evaluation').value;
    const value = parseFloat(document.getElementById('grade-value').value);

    if (value < 0 || value > 10) {
        notify('La nota debe estar entre 0 y 10.', 'error');
        return;
    }

    // Encontrar la tarjeta de la materia y agregar la nota
    const subjectEmojis = {
        'Matematica': '',
        'Fisica': '',
        'Programacion': '',
        'Ingles': ''
    };

    const gradeCard = Array.from(document.querySelectorAll('.grade-card')).find(card => {
        return card.textContent.includes(subject);
    });

    if (gradeCard) {
        const gradesList = gradeCard.querySelector('.grades-list');

        // Crear nuevo elemento de nota
        const newGrade = document.createElement('div');
        newGrade.className = 'grade-item';
        newGrade.innerHTML = `
            <span class="grade-name">${evaluation}</span>
            <span class="grade-value">${value.toFixed(1)}</span>
        `;

        // Insertar antes del promedio
        const averageItem = gradesList.querySelector('.grade-average').closest('.grade-item');
        if (averageItem) {
            gradesList.insertBefore(newGrade, averageItem);
            updateAverageGrade(gradeCard);
        }

        notify(`Nota ${value} registrada para ${subject}.`, 'success');
    }

    // Limpiar formulario
    document.getElementById('add-grade-form').reset();
    hideAddGradeForm();
}

function updateAverageGrade(gradeCard) {
    const grades = Array.from(gradeCard.querySelectorAll('.grade-item:not(:last-child) .grade-value'))
        .map(el => parseFloat(el.textContent))
        .filter(g => !isNaN(g));

    if (grades.length > 0) {
        const average = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
        gradeCard.querySelector('.grade-average').textContent = average;
    }
}

// ============================================
// ASISTENTE IA SIMULADO
// ============================================

function generateSummary() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const summaries = {
        default: ` Resumen de: ${topic}\n\n` +
            `Este es un resumen generado simuladamente sobre "${topic}".\n\n` +
            `Puntos principales:\n` +
            ` Definicion: Explicacion detallada del concepto\n` +
            ` Caracteristicas: Propiedades principales del tema\n` +
            ` Aplicaciones: Usos practicos en la vida real\n` +
            ` Ejemplos: Casos de estudio relevantes\n` +
            ` Importancia: Por que es importante aprender esto\n\n` +
            `Este resumen fue generado para ayudarte a estudiar de manera eficiente. ` +
            `Utiliza este contenido como base para tu aprendizaje.`
    };

    const summary = summaries.default;

    showAIResult(' Resumen Generado', summary);
}

function generateQuestions() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const questions = ` Preguntas de Practica: ${topic}\n\n` +
        `1. Cuales son los conceptos principales de ${topic}?\n` +
        `   Respuesta: [Tu respuesta aqui]\n\n` +
        `2. Como se aplica ${topic} en la practica?\n` +
        `   Respuesta: [Tu respuesta aqui]\n\n` +
        `3. Cuales son los errores comunes al estudiar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aqui]\n\n` +
        `4. Explica la relacion entre ${topic} y otros temas relacionados.\n` +
        `   Respuesta: [Tu respuesta aqui]\n\n` +
        `5. Por que es importante dominar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aqui]`;

    showAIResult(' Preguntas Generadas', questions);
}

function generateFlashcards() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const flashcards = ` Flashcards para ${topic}\n\n` +
        `\n` +
        ` TARJETA 1                       \n` +
        `\n` +
        ` PREGUNTA:                       \n` +
        ` Que es ${topic}?               \n` +
        `                                 \n` +
        ` RESPUESTA (Voltea):             \n` +
        ` Definicion detallada...         \n` +
        `\n\n` +
        `\n` +
        ` TARJETA 2                       \n` +
        `\n` +
        ` PREGUNTA:                       \n` +
        ` Caracteristicas de ${topic}      \n` +
        `                                 \n` +
        ` RESPUESTA (Voltea):             \n` +
        ` Listar caracteristicas clave... \n` +
        `\n\n` +
        `\n` +
        ` TARJETA 3                       \n` +
        `\n` +
        ` PREGUNTA:                       \n` +
        ` Aplicaciones practicas          \n` +
        `                                 \n` +
        ` RESPUESTA (Voltea):             \n` +
        ` Ejemplos de uso...              \n` +
        ``;

    showAIResult(' Flashcards Generadas', flashcards);
}

function showAIResult(title, content) {
    if (appendTutorMessage('bot', content, title)) {
        return;
    }

    const outputSection = document.getElementById('ai-output-section');
    if (!outputSection) return;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-content').textContent = content;
    outputSection.style.display = 'block';
}

function closeAIResult() {
    const outputSection = document.getElementById('ai-output-section');
    if (outputSection) outputSection.style.display = 'none';
}

function copyToClipboard() {
    const content = document.getElementById('result-content')?.textContent || '';
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(content).then(() => {
            notify('Contenido copiado al portapapeles.', 'success');
        }).catch(() => {
            fallbackCopy(content);
        });
        return;
    }

    fallbackCopy(content);
}

// ============================================
// CALENDARIO PERSONALIZADO
// ============================================

function getSavedEvents() {
    try {
        return JSON.parse(localStorage.getItem('customCalendarEvents')) || [];
    } catch (error) {
        localStorage.removeItem('customCalendarEvents');
        return [];
    }
}

function saveEvents(events) {
    localStorage.setItem('customCalendarEvents', JSON.stringify(events));
}

function addCalendarEventUI() {
    openQuickForm({
        title: 'Nuevo evento',
        submitLabel: 'Agregar evento',
        fields: [
            { name: 'title', label: 'Evento academico', placeholder: 'Ej: Examen de Matematica' },
            { name: 'day', label: 'Dia del mes', type: 'number', value: '18' },
            { name: 'type', label: 'Tipo', value: 'exposicion' },
            { name: 'time', label: 'Hora o detalle', value: 'Por definir' }
        ],
        onSubmit: values => {
            const event = {
                title: values.title.trim(),
                day: values.day.trim().padStart(2, '0'),
                type: values.type.trim() || 'evento',
                time: values.time.trim() || 'Por definir'
            };

            const events = getSavedEvents();
            events.push(event);
            saveEvents(events);
            renderCalendarEvent(event);
            notify(`Evento "${event.title}" agregado al calendario.`, 'success');
        }
    });
}

function renderSavedCalendarEvents() {
    getSavedEvents().forEach(renderCalendarEvent);
}

function renderCalendarEvent(event) {
    const list = document.getElementById('custom-events-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'event-item event-custom';
    item.innerHTML = `
        <div class="event-date">
            <span class="day">${escapeHTML(event.day)}</span>
            <span class="month">Jun</span>
        </div>
        <div class="event-content">
            <h4>${escapeHTML(event.title)}</h4>
            <p>${escapeHTML(event.time)}</p>
            <span class="event-badge">${escapeHTML(event.type)}</span>
        </div>
    `;

    list.appendChild(item);
}

function fallbackCopy(content) {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    notify('Contenido copiado al portapapeles.', 'success');
}

function downloadResult() {
    const title = document.getElementById('result-title')?.textContent || 'Tutor';
    const content = document.getElementById('result-content')?.textContent || '';

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${title}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// ============================================
// CALENDARIO
// ============================================

function generateCalendar() {
    const miniCalendar = document.getElementById('mini-calendar');
    const now = new Date(2026, 5, 5); // Junio 5, 2026

    // Crear estructura del calendario
    let html = `
        <div style="margin-bottom: 16px;">
            <h4 style="text-align: center; margin-bottom: 12px; color: var(--text-primary);">Junio 2026</h4>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
    `;

    // Dias de la semana
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    days.forEach(day => {
        html += `<div style="text-align: center; font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 8px 0;">${day}</div>`;
    });

    // Dias del mes
    const firstDay = new Date(2026, 5, 1).getDay();
    const daysInMonth = 30;

    // Espacios vacios antes del primer dia
    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 8px; text-align: center; font-size: 12px; color: var(--text-tertiary);">-</div>`;
    }

    // Dias del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === 5;
        const hasEvent = [8, 10, 12, 15, 20].includes(day);
        const bgColor = isToday ? 'var(--color-cyan)' : hasEvent ? 'var(--color-purple)' : 'transparent';
        const textColor = (isToday || hasEvent) ? 'white' : 'var(--text-primary)';

        html += `
            <div style="
                padding: 8px;
                text-align: center;
                font-size: 12px;
                font-weight: 600;
                background-color: ${bgColor};
                border-radius: 4px;
                color: ${textColor};
                cursor: pointer;
                transition: all 200ms;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                ${day}
            </div>
        `;
    }

    html += `</div></div>`;
    miniCalendar.innerHTML = html;
}

// ============================================
// MOCHILA DIGITAL
// ============================================

function downloadResource(filename) {
    notify(`Descarga simulada: ${filename}.`, 'info');
}

// ============================================
// ESPACIO PERSONAL DEL ESTUDIANTE
// ============================================

function getWorkspaceKey() {
    return `acStudyWorkspace:${currentUser?.email || 'guest'}`;
}

const gradebookResetVersion = 'period-gradebook-v1';

function renderSavedSubjects() {}

function renderSavedCalendarEvents() {}

function getEmptyWorkspace() {
    return {
        subjects: [],
        tasks: [],
        events: [],
        grades: [],
        attendance: [],
        resources: [],
        xp: 0,
        streak: 0,
        recent: []
    };
}

function loadWorkspace() {
    if (!currentUser?.email) return getEmptyWorkspace();

    try {
        const workspace = { ...getEmptyWorkspace(), ...JSON.parse(localStorage.getItem(getWorkspaceKey())) };
        if (workspace.gradebookResetVersion !== gradebookResetVersion) {
            workspace.grades = [];
            workspace.gradebookResetVersion = gradebookResetVersion;
            workspace.recent = [
                { text: 'La libreta de calificaciones inicio desde cero con el nuevo sistema por periodos.', time: 'Ahora' },
                ...(workspace.recent || [])
            ].slice(0, 6);
            localStorage.setItem(getWorkspaceKey(), JSON.stringify(workspace));
        }
        return workspace;
    } catch (error) {
        localStorage.removeItem(getWorkspaceKey());
        return getEmptyWorkspace();
    }
}

function saveWorkspace(workspace) {
    if (!currentUser?.email) return;
    localStorage.setItem(getWorkspaceKey(), JSON.stringify(workspace));
}

function ensureWorkspace() {
    if (!currentUser?.email) return;
    if (!localStorage.getItem(getWorkspaceKey())) {
        saveWorkspace(getEmptyWorkspace());
    }
}

function addRecent(workspace, text) {
    workspace.recent = [
        { text, time: 'Ahora' },
        ...(workspace.recent || [])
    ].slice(0, 6);
}

function addXP(workspace, amount) {
    workspace.xp = Math.max(0, (workspace.xp || 0) + amount);
    workspace.streak = workspace.xp > 0 ? Math.max(1, workspace.streak || 0) : 0;
}

function getLevel(xp) {
    return Math.max(1, Math.floor((xp || 0) / 250) + 1);
}

function getAverageGrade(workspace) {
    if (!workspace.grades.length) return 0;
    const grouped = workspace.grades.reduce((acc, grade) => {
        const subject = grade.subject || 'General';
        acc[subject] = acc[subject] || [];
        acc[subject].push(grade);
        return acc;
    }, {});
    const subjectAverages = Object.values(grouped)
        .map(grades => getSubjectGradeSummary(grades).average)
        .filter(value => value !== null);
    if (!subjectAverages.length) return 0;
    return subjectAverages.reduce((sum, value) => sum + value, 0) / subjectAverages.length;
}

function getNextEvent(workspace) {
    return workspace.events[0] || null;
}

function refreshWorkspaceUI() {
    const workspace = loadWorkspace();
    renderDashboard(workspace);
    renderSubjects(workspace);
    renderTasks(workspace);
    renderCalendarSection(workspace);
    renderGrades(workspace);
    renderAttendance(workspace);
    renderProgress(workspace);
    renderBackpack(workspace);
    updateGradeSubjectOptions(workspace);
}

function showApp() {
    ensureWorkspace();
    showPage('app-page');
    updateDashboardGreeting();
    refreshWorkspaceUI();
    navigateTo('dashboard');
}

function handleRegister(event) {
    event.preventDefault();
    clearAuthMessages();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();

    if (!name || !email || !password) {
        setAuthMessage('register', 'Completa nombre, email y contrasena para crear tu cuenta.', 'error');
        return;
    }

    const users = getUsers();
    const createdAt = new Date().toISOString();
    users[email] = {
        password,
        name,
        role: 'Estudiante',
        career: 'Informatica',
        bio: 'Construyendo mi camino de aprendizaje.',
        interests: 'Organizacion academica, IA educativa, productividad',
        avatarStyle: 'initials',
        avatarText: '',
        createdAt,
        goals: []
    };
    saveUsers(users);

    currentUser = getPublicUser(email, users[email]);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    saveWorkspace(getEmptyWorkspace());

    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';

    showApp();
    notify('Bienvenido a AC Edunity. Empieza creando tu primera materia.', 'success');
}

function handleLogin(event) {
    event.preventDefault();
    clearAuthMessages();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const users = getUsers();

    if (users[email] && users[email].password === password) {
        currentUser = getPublicUser(email, users[email]);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        ensureWorkspace();
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        showApp();
        notify('Sesion iniciada correctamente.', 'success');
    } else {
        setAuthMessage('login', 'Email o contrasena incorrectos. Revisa tus datos o crea una cuenta nueva.', 'error');
    }
}

function renderDashboard(workspace) {
    const section = document.getElementById('dashboard');
    if (!section) return;

    const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Estudiante';
    const pending = workspace.tasks.filter(task => task.status !== 'completed').length;
    const completed = workspace.tasks.filter(task => task.status === 'completed').length;
    const nextEvent = getNextEvent(workspace);
    const average = getAverageGrade(workspace);
    const level = getLevel(workspace.xp);
    const isEmpty = !workspace.subjects.length && !workspace.tasks.length && !workspace.events.length && !workspace.grades.length && !workspace.resources.length;

    section.innerHTML = `
        <div class="section-header">
            <h1>Hola ${escapeHTML(firstName)}</h1>
            <p class="subtitle">${isEmpty ? 'Bienvenido a AC Edunity. Empieza creando tu primera materia.' : 'Este es el resumen actualizado de tu espacio academico.'}</p>
        </div>

        <div class="dashboard-grid">
            ${dashboardCard('subjects', 'Materias Activas', workspace.subjects.length, workspace.subjects.length ? 'Materias creadas por ti' : 'Sin materias todavia', workspace.subjects.length ? 100 : 0)}
            ${dashboardCard('tasks', 'Tareas Pendientes', pending, `${completed} completadas`, workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0)}
            ${dashboardCard('calendar', 'Proximo Evento', nextEvent ? nextEvent.title : 'Sin eventos', nextEvent ? `${nextEvent.day} - ${nextEvent.type}` : 'Agenda tu primer examen o entrega', nextEvent ? 70 : 0)}
            ${dashboardCard('grades', 'Promedio Actual', average ? average.toFixed(2) : '--', workspace.grades.length ? `${workspace.grades.length} notas registradas` : 'Aun no hay notas', average ? average * 10 : 0)}
            ${dashboardCard('xp', 'XP Acumulado', workspace.xp || 0, `Nivel ${level}`, Math.min(100, ((workspace.xp || 0) % 250) / 2.5))}
            ${dashboardCard('streak', 'Racha de Estudio', workspace.streak || 0, 'dias activos', workspace.streak ? 100 : 0)}
            ${dashboardCard('AI', 'Recomendacion IA', workspace.resources.length ? 'Repasa un PDF' : 'Sube un apunte', workspace.resources.length ? 'Tutor puede crear cuestionarios' : 'Sube tus apuntes y estudia con ayuda de Tutor', workspace.resources.length ? 85 : 25)}
        </div>

        <div class="dashboard-row">
            <div class="card starter-card">
                <h3>Centro del estudiante</h3>
                <ol class="starter-list">
                    <li class="${workspace.subjects.length ? 'done' : ''}">Crea una materia</li>
                    <li class="${workspace.tasks.length ? 'done' : ''}">Agrega una tarea</li>
                    <li class="${workspace.events.length ? 'done' : ''}">Agenda un examen</li>
                    <li class="${workspace.resources.length ? 'done' : ''}">Sube un apunte</li>
                    <li class="${workspace.resources.some(resource => resource.usedAI) ? 'done' : ''}">Pregunta a la IA</li>
                </ol>
            </div>

            <div class="card">
                <h3>Actividad reciente</h3>
                ${workspace.recent.length ? `
                    <ul class="activity-list">${workspace.recent.map(item => `
                        <li><span class="activity-time">${escapeHTML(item.time)}</span><span class="activity-text">${escapeHTML(item.text)}</span></li>
                    `).join('')}</ul>
                ` : emptyStateHTML('Tu actividad aparecera cuando empieces a usar la plataforma.', 'Crear primera materia', 'addSubjectUI()')}
            </div>



            <div class="card weekly-progress-card">
                <h3>Progreso semanal</h3>
                <div class="weekly-chart" aria-label="Progreso semanal simulado">
                    ${[15, 20, 25, 30, 35, 40, Math.min(95, 20 + completed * 12)].map(value => `<span class="week-day" style="height:${value}%"></span>`).join('')}
                </div>
                <p class="chart-caption">${completed ? `Has completado ${completed} tarea(s).` : 'Tu grafico crecera cuando completes actividades.'}</p>
            </div>
        </div>
    `;
}

function dashboardCard(icon, label, value, subtext, progress) {
    return `
        <div class="stat-card">
            <div class="stat-header"><span class="stat-icon">${icon}</span><span class="stat-label">${escapeHTML(label)}</span></div>
            <div class="stat-value">${escapeHTML(value)}</div>
            <div class="stat-subtext">${escapeHTML(subtext)}</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, progress))}%"></div></div>
        </div>
    `;
}

function emptyStateHTML(message, buttonText, action) {
    return `
        <div class="empty-state">
            <div class="empty-icon"></div>
            <h3>${escapeHTML(message)}</h3>
            <button class="btn-primary btn-small" onclick="${action}">${escapeHTML(buttonText)}</button>
        </div>
    `;
}

function addSubjectUI() {
    openQuickForm({
        title: 'Crear materia',
        submitLabel: 'Guardar materia',
        fields: [
            { name: 'name', label: 'Nombre de la materia', placeholder: 'Ej: Matematica' },
            { name: 'color', label: 'Color identificador', type: 'select', options: subjectColorOptions }
        ],
        onSubmit: values => {
            const workspace = loadWorkspace();
            const subject = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                name: values.name.trim(),
                color: values.color || 'Morado',
                createdAt: new Date().toISOString()
            };
            workspace.subjects.push(subject);
            addXP(workspace, 30);
            addRecent(workspace, `Creaste la materia ${subject.name}.`);
            saveWorkspace(workspace);
            refreshWorkspaceUI();
            notify(`Materia "${subject.name}" creada correctamente.`, 'success');
        }
    });
}

function renderSubjects(workspace) {
    const grid = document.querySelector('.subjects-grid');
    if (!grid) return;

    grid.innerHTML = workspace.subjects.length ? workspace.subjects.map(subject => {
        const taskCount = workspace.tasks.filter(task => task.subject === subject.name).length;
        const completed = workspace.tasks.filter(task => task.subject === subject.name && task.status === 'completed').length;
        const progress = taskCount ? Math.round((completed / taskCount) * 100) : 0;
        return `
            <div class="subject-card subject-custom">
                <div class="subject-header"><h3>${escapeHTML(subject.name)}</h3><span class="subject-icon"></span></div>
                <div class="subject-stats">
                    <div class="stat"><span class="stat-name">Progreso</span><span class="stat-num">${progress}%</span></div>
                    <div class="stat"><span class="stat-name">Tareas</span><span class="stat-num">${taskCount}</span></div>
                    <div class="stat"><span class="stat-name">Color</span><span class="stat-num">${escapeHTML(subject.color)}</span></div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
                <p class="last-activity">Ultima actividad: creada por el estudiante</p>
                <button class="btn-secondary btn-small" data-subject-id="${escapeHTML(subject.id)}">Acceder</button>
            </div>
        `;
    }).join('') : emptyStateHTML('No tienes materias registradas todavia.', 'Crear primera materia', 'addSubjectUI()');

    grid.querySelectorAll('[data-subject-id]').forEach(button => {
        button.addEventListener('click', () => {
            const subject = workspace.subjects.find(item => item.id === button.dataset.subjectId);
            if (subject) openSubject(subject.name);
        });
    });
}

function addTaskUI() {
    const workspace = loadWorkspace();
    const subjectOptions = workspace.subjects.length ? workspace.subjects.map(subject => subject.name) : ['General'];
    openQuickForm({
        title: 'Agregar tarea',
        submitLabel: 'Guardar tarea',
        fields: [
            { name: 'title', label: 'Tarea', placeholder: 'Ej: Taller de funciones' },
            { name: 'subject', label: 'Materia', type: 'select', options: subjectOptions },
            { name: 'due', label: 'Fecha o detalle', value: 'Proximamente' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            fresh.tasks.push({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                title: values.title.trim(),
                subject: values.subject,
                due: values.due.trim(),
                status: 'pending'
            });
            addXP(fresh, 15);
            addRecent(fresh, `Agregaste la tarea ${values.title.trim()}.`);
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify('Tarea agregada correctamente.', 'success');
        }
    });
}

function renderTasks(workspace) {
    const list = document.getElementById('tasks-list');
    if (!list) return;

    list.innerHTML = workspace.tasks.length ? workspace.tasks.map(task => `
        <div class="task-item" data-status="${escapeHTML(task.status)}" data-id="${escapeHTML(task.id)}">
            <div class="task-checkbox"><input type="checkbox" onclick="toggleTask(this)" ${task.status === 'completed' ? 'checked' : ''}></div>
            <div class="task-content">
                <h4>${escapeHTML(task.title)}</h4>
                <p class="task-subject">Materia: ${escapeHTML(task.subject)}</p>
                <p class="task-date">${task.status === 'completed' ? 'Completada' : `Vence: ${escapeHTML(task.due)}`}</p>
            </div>
            <div class="task-priority ${task.status === 'completed' ? 'low' : 'medium'}">${task.status === 'completed' ? 'Completada' : 'Pendiente'}</div>
        </div>
    `).join('') : emptyStateHTML('No tienes tareas pendientes.', 'Agregar tarea', 'addTaskUI()');
}

function toggleTask(checkbox) {
    const taskItem = checkbox.closest('.task-item');
    const taskId = taskItem?.dataset.id;
    const workspace = loadWorkspace();
    const task = workspace.tasks.find(item => item.id === taskId);
    if (!task) return;

    task.status = checkbox.checked ? 'completed' : 'pending';
    if (checkbox.checked) {
        addXP(workspace, 25);
        addRecent(workspace, `Completaste la tarea ${task.title}.`);
    }
    saveWorkspace(workspace);
    refreshWorkspaceUI();
}

function filterTasks(filter, button) {
    currentTaskFilter = filter || 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    renderTasks(loadWorkspace());
}

function addCalendarEventUI() {
    openQuickForm({
        title: 'Agendar evento',
        submitLabel: 'Guardar evento',
        fields: [
            { name: 'title', label: 'Evento academico', placeholder: 'Ej: Examen de Matematica' },
            { name: 'day', label: 'Fecha o dia', value: 'Por definir' },
            { name: 'type', label: 'Tipo', type: 'select', options: eventTypeOptions },
            { name: 'time', label: 'Hora o detalle', value: 'Por definir' }
        ],
        onSubmit: values => {
            const workspace = loadWorkspace();
            workspace.events.push({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                title: values.title.trim(),
                day: values.day.trim(),
                type: values.type,
                time: values.time.trim()
            });
            addXP(workspace, 20);
            addRecent(workspace, `Agendaste ${values.title.trim()}.`);
            saveWorkspace(workspace);
            refreshWorkspaceUI();
            notify('Evento agregado al calendario.', 'success');
        }
    });
}

function renderCalendarSection(workspace) {
    const container = document.querySelector('.calendar-container');
    if (!container) return;

    container.innerHTML = `
        <div class="calendar-mini" id="mini-calendar"></div>
        <div class="events-list">
            <h3>Agenda academica</h3>
            <div id="custom-events-list">
                ${workspace.events.length ? workspace.events.map(event => `
                    <div class="event-item event-custom">
                        <div class="event-date"><span class="day">${escapeHTML(event.day)}</span><span class="month">AC</span></div>
                        <div class="event-content"><h4>${escapeHTML(event.title)}</h4><p>${escapeHTML(event.time)}</p><span class="event-badge">${escapeHTML(event.type)}</span></div>
                    </div>
                `).join('') : emptyStateHTML('No tienes eventos programados.', 'Agendar evento', 'addCalendarEventUI()')}
            </div>
        </div>
    `;
    generateCalendar();
}

function getCalendarDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEventDateKey(event) {
    const source = String(event.date || event.day || '').trim();
    const match = source.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
}

function changeCalendarMonth(offset) {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + offset, 1);
    generateCalendar();
}

function generateCalendar() {
    const miniCalendar = document.getElementById('mini-calendar');
    if (!miniCalendar) return;

    const workspace = loadWorkspace();
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const visibleCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const todayKey = getCalendarDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const eventsByDate = workspace.events.reduce((acc, event) => {
        const dateKey = getEventDateKey(event);
        if (dateKey) {
            acc[dateKey] = acc[dateKey] || [];
            acc[dateKey].push(event);
        }
        return acc;
    }, {});

    let html = `
        <div class="calendar-toolbar">
            <button class="calendar-month-btn" type="button" onclick="changeCalendarMonth(-1)" aria-label="Mes anterior">‹</button>
            <div class="calendar-title-block">
                <div class="calendar-title">${monthNames[month]} ${year}</div>
                <p>Calendario academico mensual</p>
            </div>
            <button class="calendar-month-btn" type="button" onclick="changeCalendarMonth(1)" aria-label="Mes siguiente">›</button>
        </div>
        <div class="calendar-grid calendar-grid-wide">
    `;
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(day => {
        html += `<div class="calendar-day-label">${day}</div>`;
    });
    for (let i = 0; i < visibleCells; i++) {
        const day = i - firstWeekday + 1;
        if (day < 1 || day > daysInMonth) {
            html += '<div class="calendar-day muted">-</div>';
        } else {
            const dateKey = getCalendarDateKey(year, month, day);
            const dayEvents = eventsByDate[dateKey] || [];
            const title = dayEvents.map(event => event.title).join(', ');
            html += `
                <div class="calendar-day ${dayEvents.length ? 'has-event' : ''} ${dateKey === todayKey ? 'is-today' : ''}" title="${escapeHTML(title)}">
                    <span class="calendar-day-number">${day}</span>
                    ${dayEvents.length ? `<span class="calendar-event-marker">${dayEvents.length}</span>` : ''}
                </div>
            `;
        }
    }
    html += '</div>';
    miniCalendar.innerHTML = html;
}

function showAddGradeForm() {
    const workspace = loadWorkspace();
    const subjectOptions = workspace.subjects.length ? workspace.subjects.map(subject => subject.name) : ['General'];
    openQuickForm({
        title: 'Agregar nota',
        submitLabel: 'Guardar nota',
        fields: [
            { name: 'subject', label: 'Materia', type: 'select', options: subjectOptions },
            { name: 'evaluation', label: 'Evaluacion', placeholder: 'Ej: Parcial 1' },
            { name: 'value', label: 'Nota (0-10)', type: 'number', placeholder: '8.5' }
        ],
        onSubmit: values => {
            const value = Number(values.value);
            if (Number.isNaN(value) || value < 0 || value > 10) {
                notify('La nota debe estar entre 0 y 10.', 'error');
                return;
            }
            const fresh = loadWorkspace();
            fresh.grades.push({ id: String(Date.now()), subject: values.subject, evaluation: values.evaluation.trim(), value });
            addXP(fresh, 20);
            addRecent(fresh, `Registraste una nota en ${values.subject}.`);
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify('Nota guardada correctamente.', 'success');
        }
    });
}

function hideAddGradeForm() {}

function renderGrades(workspace) {
    const container = document.querySelector('.grades-container');
    if (!container) return;

    if (!workspace.grades.length) {
        container.innerHTML = emptyStateHTML('No has registrado calificaciones.', 'Agregar calificacion', 'showAddGradeForm()');
        return;
    }

    const average = getAverageGrade(workspace);
    const grouped = workspace.grades.reduce((acc, grade) => {
        const subject = grade.subject || 'General';
        acc[subject] = acc[subject] || [];
        acc[subject].push(grade);
        return acc;
    }, {});

    const subjectRows = Object.entries(grouped).map(([subject, grades]) => {
        const sortedGrades = [...grades].sort((a, b) => {
            if (gradeSortMode === 'date') return (b.date || '').localeCompare(a.date || '');
            if (gradeSortMode === 'high') return getGradeFinalValue(b) - getGradeFinalValue(a);
            if (gradeSortMode === 'low') return getGradeFinalValue(a) - getGradeFinalValue(b);
            return (a.evaluation || '').localeCompare(b.evaluation || '');
        });
        const subjectAverage = sortedGrades.reduce((sum, grade) => sum + getGradeFinalValue(grade), 0) / sortedGrades.length;
        return { subject, grades: sortedGrades, average: subjectAverage };
    }).sort((a, b) => a.subject.localeCompare(b.subject));

    if (gradeSortMode === 'high') subjectRows.sort((a, b) => b.average - a.average);
    if (gradeSortMode === 'low') subjectRows.sort((a, b) => a.average - b.average);

    container.innerHTML = `
        <div class="grades-toolbar">
            <div class="grade-summary">
                <strong>Promedio general: ${average.toFixed(2)}</strong>
                <span class="grade-status ${getGradeStatus(average).replace(' ', '-')}">${getGradeStatus(average)}</span>
            </div>
            <select onchange="setGradeSort(this.value)">
                <option value="subject" ${gradeSortMode === 'subject' ? 'selected' : ''}>Ordenar por materia</option>
                <option value="date" ${gradeSortMode === 'date' ? 'selected' : ''}>Ordenar por fecha</option>
                <option value="high" ${gradeSortMode === 'high' ? 'selected' : ''}>Nota mayor</option>
                <option value="low" ${gradeSortMode === 'low' ? 'selected' : ''}>Nota menor</option>
            </select>
        </div>
        <div class="gradebook-panel">
            <div class="gradebook-header">
                <span>Materia</span>
                <span>Calificaciones registradas</span>
                <span>Promedio</span>
            </div>
            <div class="gradebook-body">
                ${subjectRows.map(row => `
                    <div class="gradebook-row">
                        <div class="gradebook-subject">
                            <strong>${escapeHTML(row.subject)}</strong>
                            <small>${row.grades.length} ${row.grades.length === 1 ? 'calificacion' : 'calificaciones'}</small>
                        </div>
                        <div class="gradebook-scores">
                            ${row.grades.map(grade => {
                                const items = getGradeItems(grade);
                                const value = getGradeFinalValue(grade);
                                const status = getGradeStatus(value).replace(' ', '-');
                                const itemLabel = items.length === 1 ? '1 actividad' : `${items.length} actividades`;
                                return `
                                    <div class="gradebook-score ${status} ${items.length > 1 ? 'has-items' : ''}" title="${escapeHTML(grade.evaluation || 'Calificacion')} - ${escapeHTML(itemLabel)}">
                                        <button class="score-action score-edit" data-grade-edit="${escapeHTML(grade.id)}" aria-label="Editar calificacion">Editar</button>
                                        <span class="score-value">${formatGradeValue(value)}</span>
                                        <span class="score-label">${escapeHTML(grade.evaluation || 'Nota')}</span>
                                        <span class="score-count">${escapeHTML(itemLabel)}</span>
                                        <button class="score-action score-delete" data-grade-delete="${escapeHTML(grade.id)}" aria-label="Eliminar calificacion">Eliminar</button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="gradebook-average">
                            <strong>${row.average.toFixed(2)}</strong>
                            <span class="grade-status ${getGradeStatus(row.average).replace(' ', '-')}">${getGradeStatus(row.average)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('[data-grade-edit]').forEach(button => button.addEventListener('click', () => openGradeForm(button.dataset.gradeEdit)));
    container.querySelectorAll('[data-grade-delete]').forEach(button => button.addEventListener('click', () => deleteGrade(button.dataset.gradeDelete)));
}

function updateGradeSubjectOptions() {}

function addAttendanceUI() {
    openAttendanceForm();
}

function getAttendanceStatusLabel(status) {
    if (status === 'Asisti') return 'Presente';
    if (status === 'Falta') return 'Falta';
    if (status === 'Atraso') return 'Atraso';
    if (status === 'Justificado') return 'Justificado';
    return 'Pendiente';
}

function getAttendanceStatusKey(status) {
    if (status === 'Asisti') return 'present';
    if (status === 'Falta') return 'absent';
    if (status === 'Atraso') return 'late';
    if (status === 'Justificado') return 'justified';
    return 'pending';
}

function isAttendancePositive(status) {
    return status === 'Asisti' || status === 'Atraso' || status === 'Justificado';
}

function getAttendanceStats(records) {
    const total = records.length;
    const present = records.filter(item => item.status === 'Asisti').length;
    const absent = records.filter(item => item.status === 'Falta').length;
    const late = records.filter(item => item.status === 'Atraso').length;
    const justified = records.filter(item => item.status === 'Justificado').length;
    const positive = records.filter(item => isAttendancePositive(item.status)).length;
    const percentage = total ? Math.round((positive / total) * 100) : 0;
    return { total, present, absent, late, justified, positive, percentage };
}

function getAttendanceSubjectStats(workspace) {
    return getSubjectOptions(workspace).map(subject => {
        const records = workspace.attendance.filter(item => item.subject === subject);
        const stats = getAttendanceStats(records);
        return { subject, records, ...stats };
    }).filter(item => item.records.length);
}

function openAttendanceForm(attendanceId = null) {
    const workspace = loadWorkspace();
    const attendance = workspace.attendance.find(item => item.id === attendanceId);
    openQuickForm({
        title: attendance ? 'Editar asistencia' : 'Registrar asistencia',
        submitLabel: attendance ? 'Actualizar asistencia' : 'Guardar asistencia',
        fields: [
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: attendance?.subject || '' },
            { name: 'date', label: 'Fecha', type: 'date', value: normalizeDate(attendance?.date || new Date().toISOString()) },
            { name: 'status', label: 'Estado', type: 'choice-grid', options: attendanceStatusOptions, value: attendance?.status || 'Asisti' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (attendanceId) {
                const item = fresh.attendance.find(entry => entry.id === attendanceId);
                if (item) {
                    item.subject = values.subject;
                    item.date = values.date;
                    item.status = values.status;
                    addRecent(fresh, `Editaste asistencia en ${values.subject}.`);
                }
            } else {
                fresh.attendance.push({
                    id: createId(),
                    subject: values.subject,
                    date: values.date,
                    status: values.status,
                    createdAt: new Date().toISOString()
                });
                addXP(fresh, values.status === 'Asisti' ? 10 : 4);
                addRecent(fresh, `Registraste asistencia en ${values.subject}.`);
            }
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(attendanceId ? 'Asistencia actualizada.' : 'Asistencia registrada.', 'success');
        }
    });
}

function deleteAttendance(attendanceId) {
    const workspace = loadWorkspace();
    const attendance = workspace.attendance.find(item => item.id === attendanceId);
    workspace.attendance = workspace.attendance.filter(item => item.id !== attendanceId);
    if (attendance) addRecent(workspace, `Eliminaste asistencia de ${attendance.subject}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Registro de asistencia eliminado.', 'info');
}

function filterAttendance(filter, button) {
    currentAttendanceFilter = filter || 'all';
    document.querySelectorAll('#attendance .filter-btn').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    renderAttendance(loadWorkspace());
}

function getAttendanceCalendarDays(records) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let i = 0; i < offset; i += 1) {
        cells.push({ empty: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = records.find(item => normalizeDate(item.date) === iso);
        cells.push({ day, record });
    }
    return cells;
}

function renderAttendance(workspace) {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    if (!workspace.attendance.length) {
        container.innerHTML = emptyStateHTML('Todavia no registras asistencias. Comienza agregando tu primera clase.', '+ Registrar asistencia', 'addAttendanceUI()');
        return;
    }

    const stats = getAttendanceStats(workspace.attendance);
    const subjectStats = getAttendanceSubjectStats(workspace);
    const filterTabs = [
        ['all', 'Todos'],
        ['present', 'Presentes'],
        ['absent', 'Faltas'],
        ['late', 'Atrasos'],
        ['justified', 'Justificados']
    ];
    const filteredRecords = workspace.attendance
        .map(item => ({ ...item, statusKey: getAttendanceStatusKey(item.status) }))
        .filter(item => currentAttendanceFilter === 'all' || item.statusKey === currentAttendanceFilter)
        .sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)));
    const calendarDays = getAttendanceCalendarDays(workspace.attendance);
    const lowSubject = subjectStats.find(item => item.percentage < 80);
    const bestSubject = subjectStats.find(item => item.percentage >= 90 && item.total >= 3);

    container.innerHTML = `
        <div class="attendance-overview">
            ${attendanceStatCard('classes', 'Clases', stats.total)}
            ${attendanceStatCard('present', 'Asistencias', stats.present)}
            ${attendanceStatCard('absent', 'Faltas', stats.absent)}
            ${attendanceStatCard('late', 'Atrasos', stats.late)}
            ${attendanceStatCard('percent', 'Asistencia general', `${stats.percentage}%`)}
        </div>

        <div class="attendance-alert ${lowSubject ? 'warning' : 'success'}">
            <strong>${lowSubject ? `Tu asistencia en ${escapeHTML(lowSubject.subject)} bajo de 80%.` : 'Llevas una buena racha de asistencia.'}</strong>
            <span>${lowSubject ? 'Revisa tus faltas y registra justificaciones si corresponde.' : (bestSubject ? `Excelente avance en ${escapeHTML(bestSubject.subject)}.` : 'Sigue registrando tus clases para medir tu progreso.')}</span>
        </div>

        <div class="attendance-layout">
            <section class="attendance-panel attendance-history-panel">
                <div class="attendance-panel-head">
                    <div>
                        <h3>Historial de asistencia</h3>
                        <p>Filtra tus clases por estado.</p>
                    </div>
                </div>
                <div class="attendance-filter task-filter-modern">
                    ${filterTabs.map(([key, label]) => `
                        <button class="filter-btn ${currentAttendanceFilter === key ? 'active' : ''}" type="button" data-attendance-filter="${key}">
                            ${label}
                        </button>
                    `).join('')}
                </div>
                <div class="attendance-grid">
                    ${filteredRecords.length ? filteredRecords.map(item => {
                        const key = getAttendanceStatusKey(item.status);
                        return `
                            <article class="attendance-card attendance-${key}">
                                <div class="attendance-card-icon" aria-hidden="true"></div>
                                <div class="attendance-card-main">
                                    <h3>${escapeHTML(item.subject || 'General')}</h3>
                                    <span class="attendance-status">${escapeHTML(getAttendanceStatusLabel(item.status))}</span>
                                    <p class="attendance-date">${escapeHTML(item.date || 'Sin fecha')}</p>
                                    <p class="attendance-note">${key === 'present' ? 'Clase asistida correctamente.' : key === 'absent' ? 'Clase marcada como falta.' : key === 'late' ? 'Llegada tarde registrada.' : 'Registro justificado.'}</p>
                                </div>
                                <div class="card-actions">
                                    <button class="btn-secondary btn-small" data-attendance-edit="${escapeHTML(item.id)}">Editar</button>
                                    <button class="btn-danger btn-small" data-attendance-delete="${escapeHTML(item.id)}">Eliminar</button>
                                </div>
                            </article>
                        `;
                    }).join('') : '<div class="dashboard-empty-note"><strong>No hay registros en este filtro.</strong><span>Cambia el filtro o registra una nueva clase.</span></div>'}
                </div>
            </section>

            <aside class="attendance-side">
                <section class="attendance-panel attendance-calendar-panel">
                    <h3>Calendario del mes</h3>
                    <div class="attendance-calendar-weekdays"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
                    <div class="attendance-calendar-grid">
                        ${calendarDays.map(cell => cell.empty ? '<span class="attendance-day empty"></span>' : `<span class="attendance-day ${cell.record ? `day-${getAttendanceStatusKey(cell.record.status)}` : ''}">${cell.day}</span>`).join('')}
                    </div>
                </section>

                <section class="attendance-panel attendance-subject-panel">
                    <h3>Seguimiento por materia</h3>
                    ${subjectStats.length ? subjectStats.map(item => `
                        <div class="attendance-subject-row">
                            <div>
                                <strong>${escapeHTML(item.subject)}</strong>
                                <span>${item.total} clases - ${item.present} presentes - ${item.absent} faltas</span>
                            </div>
                            <em>${item.percentage}%</em>
                            <div class="progress-bar"><div class="progress-fill" style="width:${item.percentage}%"></div></div>
                        </div>
                    `).join('') : '<p class="muted-panel">Cuando registres clases, apareceran aqui.</p>'}
                </section>
            </aside>
        </div>
    `;

    container.querySelectorAll('[data-attendance-filter]').forEach(button => button.addEventListener('click', () => filterAttendance(button.dataset.attendanceFilter, button)));
    container.querySelectorAll('[data-attendance-edit]').forEach(button => button.addEventListener('click', () => openAttendanceForm(button.dataset.attendanceEdit)));
    container.querySelectorAll('[data-attendance-delete]').forEach(button => button.addEventListener('click', () => deleteAttendance(button.dataset.attendanceDelete)));
}

function attendanceStatCard(type, label, value) {
    return `
        <div class="attendance-stat-card stat-${type}">
            <span class="attendance-stat-icon" aria-hidden="true"></span>
            <div>
                <strong>${escapeHTML(value)}</strong>
                <p>${escapeHTML(label)}</p>
            </div>
        </div>
    `;
}

function addResourceUI() {
    const workspace = loadWorkspace();
    const subjectOptions = workspace.subjects.length ? workspace.subjects.map(subject => subject.name) : ['General'];
    openQuickForm({
        title: 'Subir apunte simulado',
        submitLabel: 'Guardar apunte',
        fields: [
            { name: 'title', label: 'Titulo', placeholder: 'Ej: Apunte de biologia' },
            { name: 'subject', label: 'Materia', type: 'select', options: subjectOptions },
            { name: 'content', label: 'Contenido del apunte', type: 'textarea', placeholder: 'Escribe aqui el contenido del apunte...' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            fresh.resources.push({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                title: values.title.trim(),
                subject: values.subject,
                content: values.content.trim(),
                usedAI: false
            });
            addXP(fresh, 20);
            addRecent(fresh, `Subiste el apunte ${values.title.trim()}.`);
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify('Apunte guardado en la mochila digital.', 'success');
        }
    });
}

function renderBackpack(workspace) {
    const section = document.getElementById('backpack');
    const container = document.querySelector('.backpack-container');
    if (!section || !container) return;

    const header = section.querySelector('.section-header');
    if (header && !header.querySelector('[data-action="add-resource"]')) {
        header.insertAdjacentHTML('beforeend', '<button class="btn-primary btn-small" data-action="add-resource" onclick="addResourceUI()">+ Subir apunte</button>');
    }

    container.innerHTML = workspace.resources.length ? workspace.resources.map(resource => `
        <div class="resource-card">
            <div class="resource-icon resource-pdf-icon"></div>
            <h4>${escapeHTML(resource.title)}</h4>
            <p class="resource-type">${escapeHTML(resource.subject)}  Apunte simulado</p>
            <p class="resource-date">${escapeHTML(resource.content).slice(0, 120)}${resource.content.length > 120 ? '...' : ''}</p>
            <div class="resource-actions">
                <button class="btn-secondary btn-small" data-resource-view="${escapeHTML(resource.id)}">Ver</button>
                <button class="btn-secondary btn-small" data-resource-ai="${escapeHTML(resource.id)}">Preguntar a la IA</button>
            </div>
        </div>
    `).join('') : emptyStateHTML('No has subido apuntes todavia.', 'Subir primer apunte', 'addResourceUI()');

    container.querySelectorAll('[data-resource-view]').forEach(button => {
        button.addEventListener('click', () => {
            const resource = workspace.resources.find(item => item.id === button.dataset.resourceView);
            if (resource) openResource(resource.title);
        });
    });

    container.querySelectorAll('[data-resource-ai]').forEach(button => {
        button.addEventListener('click', () => askAIAboutResource(button.dataset.resourceAi));
    });
}

function askAIAboutResource(resourceId) {
    const workspace = loadWorkspace();
    const resource = workspace.resources.find(item => item.id === resourceId);
    if (!resource) return;

    resource.usedAI = true;
    addXP(workspace, 30);
    addRecent(workspace, `Usaste la IA con el apunte ${resource.title}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();

    navigateTo('ai-assistant');
    const topic = document.getElementById('ai-topic');
    if (topic) {
        topic.value = `Analiza este apunte de ${resource.subject}: ${resource.title}\n\n${resource.content}`;
    }
    showAIResult('Analisis IA del apunte', buildAIResponse('explicacion', topic?.value || resource.content));
    notify('El apunte fue cargado en el asistente IA.', 'success');
}

function getAIInput() {
    return document.getElementById('ai-topic')?.value.trim() || '';
}

function buildAIResponse(type, topic) {
    const reference = topic.length > 380 ? `${topic.slice(0, 380)}...` : topic;
    const prefix = topic.includes('Analiza este apunte') ? 'Usando el apunte cargado como referencia simulada' : 'Usando el tema escrito por el estudiante';

    if (type === 'questions') {
        return `${prefix}:\n\n1. Cual es la idea principal?\n2. Que conceptos debes memorizar?\n3. Como se aplica en un ejemplo?\n4. Que duda le preguntarias al profesor?\n\nReferencia:\n${reference}`;
    }

    if (type === 'flashcards') {
        return `${prefix}:\n\nTarjeta 1\nPregunta: Que significa el contenido?\nRespuesta: Explicalo con tus palabras.\n\nTarjeta 2\nPregunta: Cual es el dato mas importante?\nRespuesta: Identifica la informacion central.\n\nTarjeta 3\nPregunta: Como lo usarias?\nRespuesta: Crea un ejemplo corto.\n\nReferencia:\n${reference}`;
    }

    if (type === 'simple') {
        return `${prefix}:\n\nExplicacion sencilla:\nLee el contenido, ubica la informacion mas importante y practica con un ejemplo propio.\n\nReferencia:\n${reference}`;
    }

    return `${prefix}:\n\nResumen:\nEl contenido se organiza en informacion principal, ejemplos y posibles preguntas de examen.\n\nReferencia:\n${reference}`;
}

function generateSummary() {
    const topic = getAIInput() || (currentTutorPdf?.name ? `resumen del pdf ${currentTutorPdf.name}` : '');
    if (!topic) {
        notify('Ingresa un tema o sube un PDF para resumir.', 'error');
        return;
    }
    if (currentTutorPdf && !getAIInput()) {
        appendTutorMessage('user', `Hazme un resumen del PDF ${currentTutorPdf.name}`);
    }
    showAIResult('Resumen generado', buildAIResponse('summary', topic));
}

function generateQuestions() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un apunte desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Preguntas de practica', buildAIResponse('questions', topic));
}

function generateFlashcards() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un apunte desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Flashcards generadas', buildAIResponse('flashcards', topic));
}

function generateSimpleExplanation() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un apunte desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Explicacion sencilla', buildAIResponse('simple', topic));
}

// ============================================
// GESTION ACADEMICA AVANZADA
// ============================================

let gradeSortMode = 'subject';

const subjectColorMap = {
    Morado: '#7c3aed',
    Azul: '#2563eb',
    Rosado: '#ec4899',
    Cian: '#06b6d4',
    Verde: '#22c55e',
    Amarillo: '#f59e0b',
    Rojo: '#ef4444',
    Naranja: '#f97316'
};

const subjectColorOptions = [
    { value: 'Azul', label: 'Azul', tone: '#2563eb' },
    { value: 'Morado', label: 'Morado', tone: '#7c3aed' },
    { value: 'Verde', label: 'Verde', tone: '#22c55e' },
    { value: 'Rojo', label: 'Rojo', tone: '#ef4444' },
    { value: 'Naranja', label: 'Naranja', tone: '#f97316' },
    { value: 'Amarillo', label: 'Amarillo', tone: '#f59e0b' },
    { value: 'Rosado', label: 'Rosa', tone: '#ec4899' }
];

const subjectBookOptions = [
    { value: 'math', label: 'Matematicas', iconClass: 'choice-icon-math' },
    { value: 'chemistry', label: 'Quimica', iconClass: 'choice-icon-chemistry' },
    { value: 'history', label: 'Historia', iconClass: 'choice-icon-history' },
    { value: 'programming', label: 'Programacion', iconClass: 'choice-icon-programming' },
    { value: 'robotics', label: 'Robotica', iconClass: 'choice-icon-robotics' },
    { value: 'literature', label: 'Literatura', iconClass: 'choice-icon-literature' },
    { value: 'sports', label: 'Educacion fisica', iconClass: 'choice-icon-sports' },
    { value: 'art', label: 'Arte', iconClass: 'choice-icon-art' },
    { value: 'biology', label: 'Biologia', iconClass: 'choice-icon-biology' },
    { value: 'book-blue', label: 'Libro azul', iconClass: 'choice-icon-book' }
];

let subjectFilterText = '';
let subjectSortMode = 'name';
let backpackFilterText = '';
let backpackSubjectFilter = 'all';
let backpackTypeFilter = 'all';
let backpackSortMode = 'recent';

const taskPriorityOptions = [
    { value: 'alta', label: 'Importante' },
    { value: 'media', label: 'Normal' },
    { value: 'baja', label: 'Mas tarde' }
];

const taskStatusOptions = [
    { value: 'pending', label: 'Pendiente ahora' },
    { value: 'upcoming', label: 'Proxima / mas tarde' },
    { value: 'completed', label: 'Completada' }
];

let currentTaskFilter = 'all';

const eventTypeOptions = [
    { value: 'examen', label: 'Examen' },
    { value: 'tarea', label: 'Tarea' },
    { value: 'exposicion', label: 'Exposicion' },
    { value: 'recordatorio', label: 'Recordatorio' }
];

const attendanceStatusOptions = [
    { value: 'Asisti', label: 'Presente', tone: '#00c875', iconClass: 'choice-icon-present' },
    { value: 'Falta', label: 'Falta', tone: '#fd71af', iconClass: 'choice-icon-absent' },
    { value: 'Atraso', label: 'Atraso', tone: '#ffc800', iconClass: 'choice-icon-late' },
    { value: 'Justificado', label: 'Justificado', tone: '#49ccf9', iconClass: 'choice-icon-justified' }
];

let currentAttendanceFilter = 'all';

function createId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSubjectOptions(workspace) {
    return workspace.subjects.length ? workspace.subjects.map(subject => subject.name) : ['General'];
}

function getSubjectAverage(workspace, subjectName) {
    const grades = workspace.grades.filter(grade => grade.subject === subjectName);
    if (!grades.length) return 0;
    return grades.reduce((sum, grade) => sum + Number(grade.value || 0), 0) / grades.length;
}

function getGradeStatus(value) {
    if (value >= 9) return 'excelente';
    if (value >= 7) return 'aprobado';
    return 'necesita mejorar';
}

function getTaskStatusLabel(status) {
    if (status === 'completed') return 'Completada';
    if (status === 'overdue') return 'Vencida';
    if (status === 'upcoming') return 'Proxima / mas tarde';
    return 'Pendiente ahora';
}

function getTaskPriorityLabel(priority) {
    if (priority === 'alta') return 'Alta';
    if (priority === 'baja') return 'Baja';
    if (priority === 'normal') return 'Normal';
    return 'Media';
}

function normalizeDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function parseTaskDate(value) {
    if (!value) return null;
    const parsed = new Date(`${normalizeDate(value)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTaskDaysRemaining(task) {
    const dueDate = parseTaskDate(task.due);
    if (!dueDate) return null;
    return Math.ceil((dueDate.getTime() - getTodayStart().getTime()) / 86400000);
}

function getTaskVisualStatus(task) {
    if (task.status === 'completed') return 'completed';
    const days = getTaskDaysRemaining(task);
    if (days === null) return 'pending';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'upcoming';
    return 'pending';
}

function getTaskDaysText(task) {
    const days = getTaskDaysRemaining(task);
    if (days === null) return 'Sin fecha limite';
    if (task.status === 'completed') return 'Completada';
    if (days < 0) return `Vencio hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Falta 1 dia';
    return `Faltan ${days} dias`;
}

function getTaskPriorityClass(priority) {
    if (priority === 'alta') return 'high';
    if (priority === 'baja') return 'low';
    if (priority === 'normal') return 'normal';
    return 'medium';
}

function getTaskReminderAlert(task) {
    // Futuro backend: aqui se puede conectar Supabase + Gmail API para enviar recordatorios reales.
    const visualStatus = getTaskVisualStatus(task);
    if (!task.emailReminder || !task.email || task.status === 'completed') return '';
    if (visualStatus !== 'upcoming' && visualStatus !== 'overdue') return '';
    return `Se enviaria un recordatorio a ${task.email} para la tarea: ${task.title}`;
}

function isEventSoon(event) {
    const dateValue = `${event.date || event.day || ''}T${event.time || '00:00'}`;
    const eventDate = new Date(dateValue);
    if (Number.isNaN(eventDate.getTime())) return false;
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();
    return diff >= 0 && diff <= 1000 * 60 * 60 * 48;
}

function getReminderMessage(event) {
    if (!event.emailReminder || !event.email) return '';
    return `Se enviaria un correo a ${event.email} recordando el evento.`;
}

function addSubjectUI() {
    openSubjectForm();
}

function openSubjectForm(subjectId = null) {
    const workspace = loadWorkspace();
    const subject = workspace.subjects.find(item => item.id === subjectId);

    openQuickForm({
        title: subject ? 'Editar materia' : 'Crear materia',
        submitLabel: subject ? 'Actualizar materia' : 'Guardar materia',
        fields: [
            { name: 'name', label: 'Nombre de la materia', value: subject?.name || '', placeholder: 'Ej: Matematica' },
            { name: 'icon', label: 'Icono o etiqueta', value: subject?.icon || '', placeholder: 'Ej: FIS, PROG' },
            { name: 'color', label: 'Color identificador', type: 'select', options: subjectColorOptions, value: subject?.color || 'Morado' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (subjectId) {
                const item = fresh.subjects.find(entry => entry.id === subjectId);
                if (item) {
                    const oldName = item.name;
                    item.name = values.name.trim();
                    item.icon = values.icon.trim() || '';
                    item.color = values.color || 'Morado';
                    fresh.tasks.forEach(task => {
                        if (task.subject === oldName) task.subject = item.name;
                    });
                    fresh.grades.forEach(grade => {
                        if (grade.subject === oldName) grade.subject = item.name;
                    });
                    fresh.resources.forEach(resource => {
                        if (resource.subject === oldName) resource.subject = item.name;
                    });
                    addRecent(fresh, `Editaste la materia ${item.name}.`);
                }
            } else {
                fresh.subjects.push({
                    id: createId(),
                    name: values.name.trim(),
                    icon: values.icon.trim() || '',
                    color: values.color || 'Morado',
                    createdAt: new Date().toISOString()
                });
                addXP(fresh, 30);
                addRecent(fresh, `Creaste la materia ${values.name.trim()}.`);
            }
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(subjectId ? 'Materia actualizada.' : 'Materia creada correctamente.', 'success');
        }
    });
}

function deleteSubject(subjectId) {
    const workspace = loadWorkspace();
    const subject = workspace.subjects.find(item => item.id === subjectId);
    if (!subject) return;

    workspace.subjects = workspace.subjects.filter(item => item.id !== subjectId);
    workspace.tasks = workspace.tasks.filter(task => task.subject !== subject.name);
    workspace.grades = workspace.grades.filter(grade => grade.subject !== subject.name);
    workspace.resources = workspace.resources.filter(resource => resource.subject !== subject.name);
    addRecent(workspace, `Eliminaste la materia ${subject.name}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Materia eliminada junto con sus datos relacionados.', 'info');
}

function renderSubjects(workspace) {
    const grid = document.querySelector('.subjects-grid');
    if (!grid) return;

    grid.innerHTML = workspace.subjects.length ? workspace.subjects.map(subject => {
        const taskCount = workspace.tasks.filter(task => task.subject === subject.name).length;
        const completed = workspace.tasks.filter(task => task.subject === subject.name && task.status === 'completed').length;
        const progress = taskCount ? Math.round((completed / taskCount) * 100) : 0;
        const average = getSubjectAverage(workspace, subject.name);
        const color = subjectColorMap[subject.color] || subjectColorMap.Morado;
        return `
            <div class="subject-card subject-custom ac-colored-card" style="--subject-color:${color}">
                <div class="subject-header">
                    <h3><span class="subject-icon"></span> ${escapeHTML(subject.name)}</h3>
                    <span class="subject-chip">${escapeHTML(subject.color || 'Morado')}</span>
                </div>
                <div class="subject-stats">
                    <div class="stat"><span class="stat-name">Progreso</span><span class="stat-num">${progress}%</span></div>
                    <div class="stat"><span class="stat-name">Tareas</span><span class="stat-num">${taskCount}</span></div>
                    <div class="stat"><span class="stat-name">Promedio</span><span class="stat-num">${average ? average.toFixed(2) : '--'}</span></div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${progress}%; background:linear-gradient(90deg, ${color}, #06b6d4)"></div></div>
                <p class="last-activity">${taskCount ? `${completed} de ${taskCount} tareas completadas` : 'Sin tareas relacionadas todavia'}</p>
                <div class="card-actions">
                    <button class="btn-secondary btn-small" data-subject-edit="${escapeHTML(subject.id)}">Editar</button>
                    <button class="btn-danger btn-small" data-subject-delete="${escapeHTML(subject.id)}">Eliminar</button>
                </div>
            </div>
        `;
    }).join('') : emptyStateHTML('No tienes materias registradas todavia.', 'Crear primera materia', 'addSubjectUI()');

    grid.querySelectorAll('[data-subject-edit]').forEach(button => button.addEventListener('click', () => openSubjectForm(button.dataset.subjectEdit)));
    grid.querySelectorAll('[data-subject-delete]').forEach(button => button.addEventListener('click', () => deleteSubject(button.dataset.subjectDelete)));
}

function addTaskUI() {
    openTaskForm();
}

function openTaskForm(taskId = null) {
    const workspace = loadWorkspace();
    const task = workspace.tasks.find(item => item.id === taskId);
    openQuickForm({
        title: task ? 'Editar tarea' : 'Crear tarea',
        submitLabel: task ? 'Actualizar tarea' : 'Guardar tarea',
        fields: [
            { name: 'title', label: 'Titulo', value: task?.title || '', placeholder: 'Ej: Taller de funciones' },
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: task?.subject || '' },
            { name: 'description', label: 'Descripcion', type: 'textarea', value: task?.description || '', placeholder: 'Detalles de la tarea' },
            { name: 'due', label: 'Fecha limite', type: 'date', value: normalizeDate(task?.due) },
            { name: 'priority', label: 'Prioridad', type: 'select', options: taskPriorityOptions, value: task?.priority || 'media' },
            { name: 'emailReminder', label: 'Recordarme por Gmail', type: 'checkbox', checked: !!task?.emailReminder, required: false, help: 'Mostrar alerta visual cuando este proxima a vencer' },
            { name: 'email', label: 'Correo para notificacion', type: 'email', value: task?.email || currentUser?.email || '', required: false, placeholder: 'usuario@gmail.com' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (taskId) {
                const item = fresh.tasks.find(entry => entry.id === taskId);
                if (item) {
                    Object.assign(item, values, {
                        title: values.title.trim(),
                        description: values.description.trim(),
                        due: values.due,
                        priority: values.priority || 'media',
                        emailReminder: values.emailReminder === 'yes',
                        email: values.email.trim(),
                        status: item.status === 'completed' ? 'completed' : 'pending'
                    });
                }
                addRecent(fresh, `Editaste la tarea ${values.title.trim()}.`);
            } else {
                fresh.tasks.push({
                    id: createId(),
                    title: values.title.trim(),
                    subject: values.subject,
                    description: values.description.trim(),
                    due: values.due,
                    priority: values.priority || 'media',
                    emailReminder: values.emailReminder === 'yes',
                    email: values.email.trim(),
                    status: 'pending'
                });
                addXP(fresh, 15);
                addRecent(fresh, `Agregaste la tarea ${values.title.trim()}.`);
            }
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(taskId ? 'Tarea actualizada.' : 'Tarea creada correctamente.', 'success');
        }
    });
}

function deleteTask(taskId) {
    const workspace = loadWorkspace();
    const task = workspace.tasks.find(item => item.id === taskId);
    workspace.tasks = workspace.tasks.filter(item => item.id !== taskId);
    if (task) addRecent(workspace, `Eliminaste la tarea ${task.title}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Tarea eliminada.', 'info');
}

function completeTask(taskId) {
    const workspace = loadWorkspace();
    const task = workspace.tasks.find(item => item.id === taskId);
    if (!task) return;
    task.status = 'completed';
    addXP(workspace, 25);
    addRecent(workspace, `Completaste la tarea ${task.title}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Tarea marcada como completada.', 'success');
}

function getTaskGoogleCalendarUrl(task) {
    // Futuro backend: este enlace puede reemplazarse por Google Calendar API con OAuth del usuario.
    const date = normalizeDate(task.due) || normalizeDate(new Date().toISOString());
    const start = toGoogleCalendarDate(date, '08:00');
    const end = toGoogleCalendarDate(date, '09:00');
    const details = [
        task.description || 'Tarea academica creada en AC Edunity.',
        `Materia: ${task.subject || 'General'}`,
        `Prioridad: ${getTaskPriorityLabel(task.priority || 'media')}`
    ].join('\n');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
}

function openTaskInGoogleCalendar(taskId) {
    const workspace = loadWorkspace();
    const task = workspace.tasks.find(item => item.id === taskId);
    if (!task) return;
    const opened = window.open(getTaskGoogleCalendarUrl(task), '_blank', 'noopener,noreferrer');
    if (!opened) {
        notify('Permite ventanas emergentes para abrir Google Calendar.', 'info');
    }
}

function renderTasks(workspace) {
    const list = document.getElementById('tasks-list');
    if (!list) return;

    if (!workspace.tasks.length) {
        list.innerHTML = emptyStateHTML('No tienes tareas todavia. Crea tu primera tarea para organizar tus estudios.', '+ Crear tarea', 'addTaskUI()');
        return;
    }

    const counts = {
        all: workspace.tasks.length,
        pending: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'pending').length,
        upcoming: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'upcoming').length,
        completed: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'completed').length,
        overdue: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'overdue').length
    };
    const filteredTasks = workspace.tasks
        .map(task => ({ ...task, visualStatus: getTaskVisualStatus(task) }))
        .filter(task => currentTaskFilter === 'all' || task.visualStatus === currentTaskFilter)
        .sort((a, b) => {
            if (a.visualStatus === 'overdue' && b.visualStatus !== 'overdue') return -1;
            if (a.visualStatus !== 'overdue' && b.visualStatus === 'overdue') return 1;
            const dateA = parseTaskDate(a.due)?.getTime() || Number.MAX_SAFE_INTEGER;
            const dateB = parseTaskDate(b.due)?.getTime() || Number.MAX_SAFE_INTEGER;
            return dateA - dateB;
        });

    const filterTabs = [
        ['all', 'Todas'],
        ['pending', 'Pendientes'],
        ['upcoming', 'Proximas'],
        ['completed', 'Completadas'],
        ['overdue', 'Vencidas']
    ];

    list.innerHTML = `
        <div class="task-filter task-filter-modern">
            ${filterTabs.map(([key, label]) => `
                <button class="filter-btn ${currentTaskFilter === key ? 'active' : ''}" type="button" data-task-filter="${key}">
                    ${label}<span>${counts[key]}</span>
                </button>
            `).join('')}
        </div>
        <div class="task-summary-strip">
            <div><strong>${counts.pending}</strong><span>Pendientes</span></div>
            <div><strong>${counts.upcoming}</strong><span>Proximas</span></div>
            <div><strong>${counts.completed}</strong><span>Completadas</span></div>
            <div><strong>${counts.overdue}</strong><span>Vencidas</span></div>
        </div>
        <div class="task-board task-list-modern">
            ${filteredTasks.length ? filteredTasks.map(task => {
                const visualStatus = task.visualStatus;
                const reminder = getTaskReminderAlert(task);
                const priorityClass = getTaskPriorityClass(task.priority || 'media');
                return `
                    <article class="task-item task-card-modern priority-${priorityClass}" data-status="${escapeHTML(visualStatus)}" data-id="${escapeHTML(task.id)}">
                        <div class="task-card-main">
                            <label class="task-checkbox task-check-modern" title="Marcar como completada">
                                <input type="checkbox" onclick="toggleTask(this)" ${task.status === 'completed' ? 'checked' : ''}>
                                <span></span>
                            </label>
                            <div class="task-content">
                                <div class="task-title-row">
                                    <h4>${escapeHTML(task.title)}</h4>
                                    <span class="task-status status-${escapeHTML(visualStatus)}">${escapeHTML(getTaskStatusLabel(visualStatus))}</span>
                                </div>
                                <p class="task-subject">${escapeHTML(task.subject || 'General')}</p>
                                <p class="task-description">${escapeHTML(task.description || 'Sin descripcion registrada.')}</p>
                                <div class="task-meta-grid">
                                    <span><strong>Fecha:</strong> ${escapeHTML(task.due || 'Sin fecha')}</span>
                                    <span><strong>Tiempo:</strong> ${escapeHTML(getTaskDaysText(task))}</span>
                                    <span><strong>Prioridad:</strong> <em class="task-priority ${priorityClass}">${escapeHTML(getTaskPriorityLabel(task.priority || 'media'))}</em></span>
                                    <span><strong>Gmail:</strong> ${task.emailReminder ? escapeHTML(task.email || 'correo pendiente') : 'Sin recordatorio'}</span>
                                </div>
                                ${reminder ? `<div class="task-reminder-alert">${escapeHTML(reminder)}</div>` : ''}
                            </div>
                        </div>
                        <div class="card-actions task-actions">
                            <button class="btn-secondary btn-small" data-task-edit="${escapeHTML(task.id)}">Editar</button>
                            ${task.status !== 'completed' ? `<button class="btn-primary btn-small" data-task-complete="${escapeHTML(task.id)}">Completar</button>` : ''}
                            <button class="btn-secondary btn-small" data-task-calendar="${escapeHTML(task.id)}">Google Calendar</button>
                            <button class="btn-danger btn-small" data-task-delete="${escapeHTML(task.id)}">Eliminar</button>
                        </div>
                    </article>
                `;
            }).join('') : '<div class="dashboard-empty-note task-empty-filter"><strong>No hay tareas en este filtro.</strong><span>Cambia de filtro o crea una nueva tarea.</span></div>'}
        </div>
    `;

    list.querySelectorAll('[data-task-filter]').forEach(button => button.addEventListener('click', () => filterTasks(button.dataset.taskFilter, button)));
    list.querySelectorAll('[data-task-edit]').forEach(button => button.addEventListener('click', () => openTaskForm(button.dataset.taskEdit)));
    list.querySelectorAll('[data-task-delete]').forEach(button => button.addEventListener('click', () => deleteTask(button.dataset.taskDelete)));
    list.querySelectorAll('[data-task-complete]').forEach(button => button.addEventListener('click', () => completeTask(button.dataset.taskComplete)));
    list.querySelectorAll('[data-task-calendar]').forEach(button => button.addEventListener('click', () => openTaskInGoogleCalendar(button.dataset.taskCalendar)));
}

function addCalendarEventUI() {
    openEventForm();
}

function toGoogleCalendarDate(date, time) {
    if (!date) return '';
    const cleanTime = time || '08:00';
    return `${date.replaceAll('-', '')}T${cleanTime.replace(':', '')}00`;
}

function addMinutesToTime(time, minutes) {
    const [hours = 8, mins = 0] = (time || '08:00').split(':').map(Number);
    const date = new Date(2026, 0, 1, hours, mins + minutes, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getGoogleCalendarUrl(event) {
    const start = toGoogleCalendarDate(event.date, event.time || '08:00');
    const end = toGoogleCalendarDate(event.date, addMinutesToTime(event.time || '08:00', 60));
    const details = [
        `Evento creado desde AC Edunity.`,
        `Tipo: ${event.type || 'Evento academico'}.`,
        event.emailReminder ? 'Activa las notificaciones de Google Calendar para recibir avisos en correo y celular.' : ''
    ].filter(Boolean).join('\n');
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title || 'Evento AC Edunity',
        dates: `${start}/${end}`,
        details,
        trp: 'true'
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function openGoogleCalendarEvent(eventId) {
    const workspace = loadWorkspace();
    const event = workspace.events.find(item => item.id === eventId);
    if (!event) return;
    if (!event.date) {
        notify('Agrega una fecha antes de abrir Google Calendar.', 'error');
        return;
    }
    window.open(getGoogleCalendarUrl(event), '_blank', 'noopener');
    notify('Google Calendar se abrio con el evento listo para guardar.', 'info');
}

function openEventForm(eventId = null) {
    const workspace = loadWorkspace();
    const event = workspace.events.find(item => item.id === eventId);
    openQuickForm({
        title: event ? 'Editar evento' : 'Crear evento',
        submitLabel: event ? 'Actualizar evento' : 'Guardar evento',
        fields: [
            { name: 'title', label: 'Titulo del evento', value: event?.title || '', placeholder: 'Ej: Examen final' },
            { name: 'type', label: 'Tipo', type: 'select', options: eventTypeOptions, value: event?.type || 'recordatorio' },
            { name: 'date', label: 'Fecha', type: 'date', value: normalizeDate(event?.date) },
            { name: 'time', label: 'Hora', type: 'time', value: event?.time || '08:00' },
            { name: 'email', label: 'Correo del usuario', type: 'email', value: event?.email || currentUser?.email || '', placeholder: 'usuario@email.com' },
            { name: 'emailReminder', label: 'Recordatorio por correo', type: 'checkbox', checked: Boolean(event?.emailReminder), help: 'Activar recordatorio por correo' },
            { name: 'googleCalendar', label: 'Abrir tambien en Google Calendar', type: 'checkbox', checked: !eventId, help: 'Se abrira Google Calendar para guardar el evento y activar notificaciones reales.' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            const payload = {
                title: values.title.trim(),
                type: values.type,
                date: values.date,
                day: values.date,
                time: values.time,
                email: values.email.trim(),
                emailReminder: values.emailReminder === 'yes',
                googleCalendar: values.googleCalendar === 'yes'
            };
            let savedEventId = eventId;

            if (eventId) {
                const item = fresh.events.find(entry => entry.id === eventId);
                if (item) Object.assign(item, payload);
                addRecent(fresh, `Editaste el evento ${payload.title}.`);
            } else {
                savedEventId = createId();
                fresh.events.push({ id: savedEventId, ...payload });
                addXP(fresh, 20);
                addRecent(fresh, `Agendaste ${payload.title}.`);
            }

            fresh.events.sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(payload.emailReminder ? getReminderMessage(payload) : 'Evento guardado correctamente.', 'success');
            if (payload.googleCalendar) {
                openGoogleCalendarEvent(savedEventId);
            }

            // Futuro real: aqui se podria conectar EmailJS, un backend propio,
            // funciones de Supabase o servicios desplegados en Hostinger para enviar correos reales.
        }
    });
}

function deleteEvent(eventId) {
    const workspace = loadWorkspace();
    const event = workspace.events.find(item => item.id === eventId);
    workspace.events = workspace.events.filter(item => item.id !== eventId);
    if (event) addRecent(workspace, `Eliminaste el evento ${event.title}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Evento eliminado.', 'info');
}

function renderCalendarSection(workspace) {
    const container = document.querySelector('.calendar-container');
    if (!container) return;

    const events = [...workspace.events].sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
    container.innerHTML = `
        <div class="calendar-side">
            <div class="calendar-sync-card">
                <span class="calendar-sync-icon"></span>
                <h3>Conecta tus fechas con Google Calendar</h3>
                <p>Crea eventos en AC Edunity y abre Google Calendar para guardarlos con notificaciones en correo y celular.</p>
                <button class="btn-primary btn-small" type="button" onclick="addCalendarEventUI()">+ Crear evento</button>
            </div>
            <div class="calendar-mini" id="mini-calendar"></div>
        </div>
        <div class="events-list">
            <h3>Agenda academica</h3>
            <div id="custom-events-list">
                ${events.length ? events.map(event => {
                    const reminder = getReminderMessage(event);
                    return `
                        <div class="event-item event-custom ${isEventSoon(event) ? 'event-soon' : ''}">
                            <div class="event-date"><span class="day">${escapeHTML((event.date || event.day || '--').slice(-2))}</span><span class="month">${escapeHTML((event.date || '').slice(5, 7) || 'AC')}</span></div>
                            <div class="event-content">
                                <h4>${escapeHTML(event.title)}</h4>
                                <p>${escapeHTML(event.date || 'Sin fecha')}  ${escapeHTML(event.time || 'Sin hora')}</p>
                                <span class="event-badge">${escapeHTML(event.type)}</span>
                                ${isEventSoon(event) ? '<p class="event-alert">Evento cercano</p>' : ''}
                                ${reminder ? `<p class="email-simulation">${escapeHTML(reminder)}</p>` : ''}
                                <div class="card-actions">
                                    <button class="btn-secondary btn-small google-calendar-btn" data-google-event="${escapeHTML(event.id)}">Google Calendar</button>
                                    <button class="btn-secondary btn-small" data-event-edit="${escapeHTML(event.id)}">Editar</button>
                                    <button class="btn-danger btn-small" data-event-delete="${escapeHTML(event.id)}">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : emptyStateHTML('No tienes eventos programados.', 'Agendar evento', 'addCalendarEventUI()')}
            </div>
        </div>
    `;
    generateCalendar();
    container.querySelectorAll('[data-google-event]').forEach(button => button.addEventListener('click', () => openGoogleCalendarEvent(button.dataset.googleEvent)));
    container.querySelectorAll('[data-event-edit]').forEach(button => button.addEventListener('click', () => openEventForm(button.dataset.eventEdit)));
    container.querySelectorAll('[data-event-delete]').forEach(button => button.addEventListener('click', () => deleteEvent(button.dataset.eventDelete)));
}

function showAddGradeForm() {
    openGradeForm();
}

function getGradeItems(grade) {
    if (Array.isArray(grade?.items) && grade.items.length) {
        return grade.items
            .map(item => ({
                activity: item.activity || item.name || '',
                date: item.date || '',
                value: Number(item.value)
            }))
            .filter(item => !Number.isNaN(item.value));
    }

    if (grade && grade.value !== undefined && grade.value !== '') {
        return [{
            activity: grade.evaluation || 'Calificacion',
            date: grade.date || '',
            value: Number(grade.value)
        }].filter(item => !Number.isNaN(item.value));
    }

    return [];
}

function getGradeFinalValue(grade) {
    const items = getGradeItems(grade);
    if (!items.length) return Number(grade?.value || 0);
    return items.reduce((sum, item) => sum + Number(item.value || 0), 0) / items.length;
}

function formatGradeValue(value) {
    const numeric = Number(value || 0);
    return numeric.toFixed(numeric % 1 === 0 ? 0 : 2).replace(/\.00$/, '');
}

const gradePeriods = [
    { value: 'p1', label: 'Periodo 1' },
    { value: 'p2', label: 'Periodo 2' },
    { value: 'p3', label: 'Periodo 3' }
];

const gradeCategories = [
    { value: 'partial1', label: 'Parcial 1' },
    { value: 'partial2', label: 'Parcial 2' },
    { value: 'exam', label: 'Examen del periodo' }
];

function getGradePeriod(grade) {
    return grade?.period || 'p1';
}

function getGradeCategory(grade) {
    if (grade?.category) return grade.category;
    const text = `${grade?.evaluation || ''}`.toLowerCase();
    if (text.includes('examen')) return 'exam';
    if (text.includes('parcial 2') || text.includes('parcial dos')) return 'partial2';
    return 'partial1';
}

function getGradeCategoryLabel(category) {
    return gradeCategories.find(item => item.value === category)?.label || 'Parcial 1';
}

function getGradePeriodLabel(period) {
    return gradePeriods.find(item => item.value === period)?.label || 'Periodo 1';
}

function averageNumbers(values) {
    const valid = values.filter(value => value !== null && !Number.isNaN(Number(value)));
    if (!valid.length) return null;
    return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function getCategoryGrades(grades, period, category) {
    return grades.filter(grade => getGradePeriod(grade) === period && getGradeCategory(grade) === category);
}

function getCategoryAverage(grades, period, category) {
    const values = getCategoryGrades(grades, period, category).map(getGradeFinalValue);
    return averageNumbers(values);
}

function calculatePeriodAverage(partial1, partial2, exam) {
    const partialAverage = averageNumbers([partial1, partial2]);
    if (partialAverage !== null && exam !== null) return partialAverage * 0.70 + exam * 0.30;
    if (partialAverage !== null) return partialAverage;
    if (exam !== null) return exam;
    return null;
}

function getSubjectGradeSummary(grades) {
    const periods = gradePeriods.map(period => {
        const partial1 = getCategoryAverage(grades, period.value, 'partial1');
        const partial2 = getCategoryAverage(grades, period.value, 'partial2');
        const exam = getCategoryAverage(grades, period.value, 'exam');
        const average = calculatePeriodAverage(partial1, partial2, exam);
        return { ...period, partial1, partial2, exam, average };
    });
    const average = averageNumbers(periods.map(period => period.average));
    return { periods, average };
}

function openGradeForm(gradeId = null, defaults = {}) {
    const workspace = loadWorkspace();
    const grade = workspace.grades.find(item => item.id === gradeId);
    const selectedPeriod = grade ? getGradePeriod(grade) : (defaults.period || 'p1');
    const selectedCategory = grade ? getGradeCategory(grade) : (defaults.category || 'partial1');
    const selectedSubject = grade?.subject || defaults.subject || '';
    const suggestedEvaluation = `${getGradeCategoryLabel(selectedCategory)} - ${getGradePeriodLabel(selectedPeriod)}`;
    const subjectOptions = getSubjectOptions(workspace).map(option => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return `<option value="${escapeHTML(value)}" ${String(selectedSubject) === String(value) ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    }).join('');
    const periodOptions = gradePeriods.map(option => `<option value="${option.value}" ${selectedPeriod === option.value ? 'selected' : ''}>${option.label}</option>`).join('');
    const categoryOptions = gradeCategories.map(option => `<option value="${option.value}" ${selectedCategory === option.value ? 'selected' : ''}>${option.label}</option>`).join('');
    const items = getGradeItems(grade);
    const initialItems = items.length ? items : [{ activity: '', date: '', value: '' }];

    const existingModal = document.querySelector('.quick-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'quick-modal';
    modal.innerHTML = `
        <div class="quick-modal-card grade-modal-card" role="dialog" aria-modal="true" aria-label="${grade ? 'Editar calificacion' : 'Registrar calificacion'}">
            <button class="quick-modal-close" type="button" aria-label="Cerrar">x</button>
            <h3>${grade ? 'Editar calificacion' : 'Registrar calificacion'}</h3>
            <form class="quick-modal-form grade-modal-form">
                <label>
                    <span>Materia</span>
                    <select name="subject" required>${subjectOptions}</select>
                </label>
                <div class="grade-period-row">
                    <label>
                        <span>Periodo</span>
                        <select name="period" required>${periodOptions}</select>
                    </label>
                    <label>
                        <span>Tipo de nota</span>
                        <select name="category" required>${categoryOptions}</select>
                    </label>
                </div>
                <label>
                    <span>Grupo de calificacion</span>
                    <input name="evaluation" value="${escapeHTML(grade?.evaluation || suggestedEvaluation)}" placeholder="Ej: Tarea 100% del Parcial 1" required>
                </label>
                <div class="grade-items-builder">
                    <div class="grade-items-head">
                        <strong>Casilleros de actividades</strong>
                        <button type="button" class="btn-secondary btn-small" id="add-grade-item">+ Agregar casillero</button>
                    </div>
                    <div class="grade-items-list">
                        ${initialItems.map(item => `
                            <div class="grade-item-row">
                                <input name="itemActivity" value="${escapeHTML(item.activity || '')}" placeholder="Actividad: divisiones, suma, lectura..." required>
                                <input name="itemDate" type="date" value="${escapeHTML(normalizeDate(item.date))}">
                                <input name="itemValue" type="number" min="0" max="10" step="0.01" value="${item.value !== '' ? escapeHTML(String(item.value)) : ''}" placeholder="Nota" required>
                                <button type="button" class="remove-grade-item" aria-label="Quitar casillero">x</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="grade-calculated-average">Promedio: <strong>--</strong></div>
                </div>
                <label>
                    <span>Observacion</span>
                    <textarea name="observation" rows="3" placeholder="Comentario opcional">${escapeHTML(grade?.observation || '')}</textarea>
                </label>
                <div class="quick-modal-actions">
                    <button class="btn-primary btn-small" type="submit">${grade ? 'Actualizar calificacion' : 'Guardar calificacion'}</button>
                </div>
            </form>
        </div>
    `;

    const closeModal = () => modal.remove();
    const list = modal.querySelector('.grade-items-list');
    const averageOutput = modal.querySelector('.grade-calculated-average strong');
    const rowTemplate = () => {
        const row = document.createElement('div');
        row.className = 'grade-item-row';
        row.innerHTML = `
            <input name="itemActivity" placeholder="Actividad: divisiones, suma, lectura..." required>
            <input name="itemDate" type="date">
            <input name="itemValue" type="number" min="0" max="10" step="0.01" placeholder="Nota" required>
            <button type="button" class="remove-grade-item" aria-label="Quitar casillero">x</button>
        `;
        return row;
    };

    const updateAveragePreview = () => {
        const values = Array.from(list.querySelectorAll('[name="itemValue"]'))
            .map(input => Number(input.value))
            .filter(value => !Number.isNaN(value));
        averageOutput.textContent = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '--';
    };

    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.classList.contains('quick-modal-close')) closeModal();
        if (event.target.id === 'add-grade-item') {
            list.appendChild(rowTemplate());
            updateAveragePreview();
        }
        if (event.target.classList.contains('remove-grade-item')) {
            if (list.children.length > 1) event.target.closest('.grade-item-row').remove();
            updateAveragePreview();
        }
    });

    modal.addEventListener('input', event => {
        if (event.target.name === 'itemValue') updateAveragePreview();
    });

    modal.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        const activities = Array.from(form.querySelectorAll('[name="itemActivity"]'));
        const dates = Array.from(form.querySelectorAll('[name="itemDate"]'));
        const values = Array.from(form.querySelectorAll('[name="itemValue"]'));
        const gradeItems = activities.map((input, index) => ({
            activity: input.value.trim(),
            date: dates[index].value,
            value: Number(values[index].value)
        })).filter(item => item.activity && !Number.isNaN(item.value));

        if (!gradeItems.length || gradeItems.some(item => item.value < 0 || item.value > 10)) {
            notify('Completa los casilleros con notas entre 0 y 10.', 'error');
            return;
        }

        const value = gradeItems.reduce((sum, item) => sum + item.value, 0) / gradeItems.length;
        const fresh = loadWorkspace();
        const payload = {
            subject: form.subject.value,
            period: form.period.value,
            category: form.category.value,
            evaluation: form.evaluation.value.trim(),
            value,
            date: gradeItems[0]?.date || '',
            observation: form.observation.value.trim(),
            items: gradeItems
        };

        if (gradeId) {
            const item = fresh.grades.find(entry => entry.id === gradeId);
            if (item) Object.assign(item, payload);
            addRecent(fresh, `Editaste una calificacion de ${payload.subject}.`);
        } else {
            fresh.grades.push({ id: createId(), ...payload });
            addXP(fresh, 20);
            addRecent(fresh, `Registraste una calificacion en ${payload.subject}.`);
        }

        saveWorkspace(fresh);
        refreshWorkspaceUI();
        closeModal();
        notify(gradeId ? 'Calificacion actualizada.' : 'Calificacion registrada.', 'success');
    });

    document.body.appendChild(modal);
    updateAveragePreview();
    modal.querySelector('input, textarea, select')?.focus();
}

function deleteGrade(gradeId) {
    const workspace = loadWorkspace();
    const grade = workspace.grades.find(item => item.id === gradeId);
    workspace.grades = workspace.grades.filter(item => item.id !== gradeId);
    if (grade) addRecent(workspace, `Eliminaste una calificacion de ${grade.subject}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Calificacion eliminada.', 'info');
}

function openGradeBucket(subject, period, category) {
    const workspace = loadWorkspace();
    const grades = workspace.grades.filter(grade => (
        (grade.subject || 'General') === subject &&
        getGradePeriod(grade) === period &&
        getGradeCategory(grade) === category
    ));

    if (!grades.length) {
        openGradeForm(null, { subject, period, category });
        return;
    }

    const existingModal = document.querySelector('.quick-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'quick-modal';
    modal.innerHTML = `
        <div class="quick-modal-card grade-bucket-card" role="dialog" aria-modal="true" aria-label="Calificaciones registradas">
            <button class="quick-modal-close" type="button" aria-label="Cerrar">x</button>
            <div class="grade-bucket-header">
                <div>
                    <h3>${escapeHTML(getGradeCategoryLabel(category))}</h3>
                    <p>${escapeHTML(subject)} - ${escapeHTML(getGradePeriodLabel(period))}</p>
                </div>
                <button class="btn-primary btn-small" type="button" data-grade-bucket-add>+ Agregar nota</button>
            </div>
            <div class="grade-bucket-list">
                ${grades.map(grade => {
                    const items = getGradeItems(grade);
                    const value = getGradeFinalValue(grade);
                    return `
                        <div class="grade-bucket-item">
                            <div>
                                <strong>${escapeHTML(grade.evaluation || 'Calificacion')}</strong>
                                <span>${items.length} ${items.length === 1 ? 'casillero' : 'casilleros'} - Promedio ${formatGradeValue(value)}</span>
                            </div>
                            <div class="grade-bucket-actions">
                                <button class="btn-secondary btn-small" type="button" data-grade-bucket-edit="${escapeHTML(grade.id)}">Editar</button>
                                <button class="btn-danger btn-small" type="button" data-grade-bucket-delete="${escapeHTML(grade.id)}">Eliminar</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const closeModal = () => modal.remove();
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.classList.contains('quick-modal-close')) closeModal();
        if (event.target.closest('[data-grade-bucket-add]')) {
            closeModal();
            openGradeForm(null, { subject, period, category });
        }
        const editButton = event.target.closest('[data-grade-bucket-edit]');
        if (editButton) {
            closeModal();
            openGradeForm(editButton.dataset.gradeBucketEdit);
        }
        const deleteButton = event.target.closest('[data-grade-bucket-delete]');
        if (deleteButton) {
            closeModal();
            deleteGrade(deleteButton.dataset.gradeBucketDelete);
        }
    });

    document.body.appendChild(modal);
}

function setGradeSort(mode) {
    gradeSortMode = mode;
    renderGrades(loadWorkspace());
}

function renderGrades(workspace) {
    const container = document.querySelector('.grades-container');
    if (!container) return;

    if (!workspace.grades.length) {
        container.innerHTML = emptyStateHTML('No has registrado calificaciones.', 'Agregar calificacion', 'showAddGradeForm()');
        return;
    }

    const average = getAverageGrade(workspace);
    const grouped = workspace.grades.reduce((acc, grade) => {
        const subject = grade.subject || 'General';
        acc[subject] = acc[subject] || [];
        acc[subject].push(grade);
        return acc;
    }, {});

    const subjectRows = Object.entries(grouped).map(([subject, grades]) => {
        const summary = getSubjectGradeSummary(grades);
        return { subject, grades, summary, average: summary.average };
    }).sort((a, b) => a.subject.localeCompare(b.subject));

    if (gradeSortMode === 'high') subjectRows.sort((a, b) => (b.average || 0) - (a.average || 0));
    if (gradeSortMode === 'low') subjectRows.sort((a, b) => (a.average || 0) - (b.average || 0));

    const renderCell = (row, period, category = null) => {
        const value = category ? getCategoryAverage(row.grades, period.value, category) : period.average;
        const grades = category ? getCategoryGrades(row.grades, period.value, category) : [];
        const status = value === null ? 'empty' : getGradeStatus(value).replace(' ', '-');
        const label = category ? getGradeCategoryLabel(category) : period.label;
        const title = category ? `${row.subject} - ${period.label} - ${label}` : `${row.subject} - ${period.label}`;
        return `
            <button class="period-grade-cell ${status}" type="button" data-grade-add="true" data-subject="${escapeHTML(row.subject)}" data-period="${escapeHTML(period.value)}" data-category="${escapeHTML(category || 'partial1')}" title="${escapeHTML(title)}">
                <strong>${value === null ? '--' : formatGradeValue(value)}</strong>
                <span>${category ? (grades.length ? `${grades.length} nota${grades.length === 1 ? '' : 's'}` : 'Agregar') : 'Periodo'}</span>
            </button>
        `;
    };

    container.innerHTML = `
        <div class="grades-toolbar">
            <div class="grade-summary">
                <strong>Promedio general: ${average.toFixed(2)}</strong>
                <span class="grade-status ${getGradeStatus(average).replace(' ', '-')}">${getGradeStatus(average)}</span>
            </div>
            <div class="grade-formula-note">Formula: promedio de parciales 70% + examen 30%.</div>
            <select onchange="setGradeSort(this.value)">
                <option value="subject" ${gradeSortMode === 'subject' ? 'selected' : ''}>Ordenar por materia</option>
                <option value="high" ${gradeSortMode === 'high' ? 'selected' : ''}>Promedio mayor</option>
                <option value="low" ${gradeSortMode === 'low' ? 'selected' : ''}>Promedio menor</option>
            </select>
        </div>
        <div class="period-gradebook-panel">
            <div class="period-gradebook-table">
                <div class="period-head subject-head">Asignatura</div>
                <div class="period-head average-head">Promedio</div>
                ${gradePeriods.map(period => `
                    <div class="period-head period-average-head">${escapeHTML(period.label)}</div>
                    <div class="period-head partial-head">Parcial 1</div>
                    <div class="period-head partial-head">Parcial 2</div>
                    <div class="period-head exam-head">Examen</div>
                `).join('')}
                ${subjectRows.map(row => `
                    <div class="period-subject-cell">
                        <strong>${escapeHTML(row.subject)}</strong>
                        <small>${row.grades.length} ${row.grades.length === 1 ? 'calificacion' : 'calificaciones'}</small>
                    </div>
                    <div class="period-average-cell ${row.average === null ? 'empty' : getGradeStatus(row.average).replace(' ', '-')}">
                        <strong>${row.average === null ? '--' : row.average.toFixed(2)}</strong>
                        <span>${row.average === null ? 'Sin datos' : getGradeStatus(row.average)}</span>
                    </div>
                    ${row.summary.periods.map(period => `
                        ${renderCell(row, period)}
                        ${renderCell(row, period, 'partial1')}
                        ${renderCell(row, period, 'partial2')}
                        ${renderCell(row, period, 'exam')}
                    `).join('')}
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('[data-grade-add]').forEach(button => {
        button.addEventListener('click', () => openGradeBucket(
            button.dataset.subject,
            button.dataset.period,
            button.dataset.category
        ));
    });
}
function addResourceUI() {
    openResourceForm();
}

function openResourceForm(resourceId = null) {
    const workspace = loadWorkspace();
    const resource = workspace.resources.find(item => item.id === resourceId);
    openQuickForm({
        title: resource ? 'Editar PDF simulado' : 'Subir PDF simulado',
        submitLabel: resource ? 'Actualizar recurso' : 'Guardar recurso',
        fields: [
            { name: 'title', label: 'Titulo del recurso', value: resource?.title || '', placeholder: 'Ej: Guia de estudio' },
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: resource?.subject || '' },
            { name: 'file', label: 'Archivo PDF simulado', type: 'file', accept: '.pdf', required: !resource },
            { name: 'description', label: 'Descripcion del apunte', type: 'textarea', value: resource?.description || resource?.content || '', placeholder: 'Describe de que trata el PDF' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            const fileName = values.file?.name || resource?.fileName || `${values.title.trim()}.pdf`;
            const payload = {
                title: values.title.trim(),
                subject: values.subject,
                fileName,
                description: values.description.trim(),
                content: values.description.trim(),
                type: 'PDF simulado'
            };

            if (resourceId) {
                const item = fresh.resources.find(entry => entry.id === resourceId);
                if (item) Object.assign(item, payload);
                addRecent(fresh, `Editaste el recurso ${payload.title}.`);
            } else {
                fresh.resources.push({ id: createId(), usedAI: false, ...payload });
                addXP(fresh, 20);
                addRecent(fresh, `Subiste el PDF simulado ${payload.title}.`);
            }
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(resourceId ? 'Recurso actualizado.' : 'PDF simulado guardado.', 'success');
        }
    });
}

function deleteResource(resourceId) {
    const workspace = loadWorkspace();
    const resource = workspace.resources.find(item => item.id === resourceId);
    workspace.resources = workspace.resources.filter(item => item.id !== resourceId);
    if (resource) addRecent(workspace, `Eliminaste el recurso ${resource.title}.`);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    notify('Recurso eliminado.', 'info');
}

function renderBackpack(workspace) {
    const section = document.getElementById('backpack');
    const container = document.querySelector('.backpack-container');
    if (!section || !container) return;

    const header = section.querySelector('.section-header');
    if (header && !header.querySelector('[data-action="add-resource"]')) {
        header.insertAdjacentHTML('beforeend', '<button class="btn-primary btn-small" data-action="add-resource" onclick="addResourceUI()">+ Subir PDF simulado</button>');
    }

    container.innerHTML = workspace.resources.length ? workspace.resources.map(resource => `
        <div class="resource-card">
            <div class="resource-icon resource-pdf-icon"></div>
            <h4>${escapeHTML(resource.title)}</h4>
            <p class="resource-type">${escapeHTML(resource.subject)}  ${escapeHTML(resource.fileName || 'PDF simulado')}</p>
            <p class="resource-date">${escapeHTML(resource.description || resource.content || 'Sin descripcion').slice(0, 130)}${(resource.description || resource.content || '').length > 130 ? '...' : ''}</p>
            <div class="resource-actions">
                <button class="btn-secondary btn-small" data-resource-view="${escapeHTML(resource.id)}">Ver</button>
                <button class="btn-secondary btn-small" data-resource-ai="${escapeHTML(resource.id)}">Preguntar a la IA</button>
                <button class="btn-secondary btn-small" data-resource-practice="${escapeHTML(resource.id)}">Practicar con PDF</button>
                <button class="btn-secondary btn-small" data-resource-edit="${escapeHTML(resource.id)}">Editar</button>
                <button class="btn-danger btn-small" data-resource-delete="${escapeHTML(resource.id)}">Eliminar</button>
            </div>
        </div>
    `).join('') : emptyStateHTML('No has subido apuntes todavia.', 'Subir primer PDF', 'addResourceUI()');

    container.querySelectorAll('[data-resource-view]').forEach(button => button.addEventListener('click', () => viewResource(button.dataset.resourceView)));
    container.querySelectorAll('[data-resource-ai]').forEach(button => button.addEventListener('click', () => askAIAboutResource(button.dataset.resourceAi)));
    container.querySelectorAll('[data-resource-practice]').forEach(button => button.addEventListener('click', () => practiceWithResource(button.dataset.resourcePractice)));
    container.querySelectorAll('[data-resource-edit]').forEach(button => button.addEventListener('click', () => openResourceForm(button.dataset.resourceEdit)));
    container.querySelectorAll('[data-resource-delete]').forEach(button => button.addEventListener('click', () => deleteResource(button.dataset.resourceDelete)));
}

function viewResource(resourceId) {
    const resource = loadWorkspace().resources.find(item => item.id === resourceId);
    if (!resource) return;
    showAIResult(`Vista simulada: ${resource.title}`, `Archivo: ${resource.fileName}\nMateria: ${resource.subject}\n\nDescripcion:\n${resource.description || resource.content || 'Sin descripcion'}\n\nNota: en una version real aqui se abriria el PDF desde almacenamiento en Supabase, Hostinger o un backend propio.`);
    navigateTo('ai-assistant');
}

function markResourceAIUsed(resourceId, actionText) {
    const workspace = loadWorkspace();
    const resource = workspace.resources.find(item => item.id === resourceId);
    if (!resource) return null;
    resource.usedAI = true;
    addXP(workspace, 30);
    addRecent(workspace, actionText);
    saveWorkspace(workspace);
    refreshWorkspaceUI();
    return resource;
}

function askAIAboutResource(resourceId) {
    const resource = markResourceAIUsed(resourceId, 'Preguntaste a la IA sobre un PDF.');
    if (!resource) return;
    navigateTo('ai-assistant');
    setAIContextFromResource(resource);
    showAIResult('Respuesta de Tutor', buildResourceAIResponse(resource, 'summary'));
}

function practiceWithResource(resourceId) {
    const resource = markResourceAIUsed(resourceId, 'Iniciaste practica con un PDF.');
    if (!resource) return;
    navigateTo('ai-assistant');
    setAIContextFromResource(resource);
    showAIResult('Zona de practica con PDF', buildResourceAIResponse(resource, 'quiz'));
    notify('PDF cargado en la zona de estudio IA.', 'success');
}

function setAIContextFromResource(resource) {
    const topic = document.getElementById('ai-topic');
    if (topic) {
        topic.value = `PDF simulado: ${resource.title}\nMateria: ${resource.subject}\nArchivo: ${resource.fileName}\nDescripcion: ${resource.description || resource.content}`;
    }
}

function buildResourceAIResponse(resource, type) {
    const base = `Basado en tu PDF de ${resource.subject}, "${resource.title}" (${resource.fileName}), `;
    const description = resource.description || resource.content || 'sin descripcion detallada';

    if (type === 'quiz') {
        return `${base}aqui tienes 5 preguntas de practica:\n\n1. Cual es la idea principal del PDF?\n2. Que concepto se repite mas en el apunte?\n3. Como explicarias este tema a un companero?\n4. Que ejemplo practico puedes crear?\n5. Que pregunta podria aparecer en un examen?\n\nReferencia simulada: ${description}`;
    }
    if (type === 'open') {
        return `${base}aqui tienes preguntas abiertas:\n\n1. Explica con tus palabras el tema central.\n2. Relaciona el contenido con una clase anterior.\n3. Escribe una conclusion corta.\n\nReferencia simulada: ${description}`;
    }
    if (type === 'truefalse') {
        return `${base}practica verdadero/falso:\n\n1. El apunte tiene una idea principal identificable. (V)\n2. No es necesario repasar ejemplos. (F)\n3. Las definiciones ayudan a organizar el estudio. (V)\n4. El contenido no se puede convertir en preguntas. (F)\n\nReferencia simulada: ${description}`;
    }
    if (type === 'flashcards') {
        return `${base}flashcards sugeridas:\n\nTarjeta 1: Tema central / ${resource.title}\nTarjeta 2: Materia / ${resource.subject}\nTarjeta 3: Punto clave / ${description.slice(0, 100)}...`;
    }
    if (type === 'simple') {
        return `${base}explicacion sencilla:\n\nEste PDF puede estudiarse separando primero el tema, luego las ideas importantes y finalmente practicando con preguntas cortas.\n\nReferencia simulada: ${description}`;
    }
    return `${base}resumen simulado:\n\nEl recurso contiene informacion util para estudiar ${resource.subject}. Conviene convertirlo en preguntas, flashcards y ejemplos para reforzar el aprendizaje.\n\nReferencia simulada: ${description}`;
}

function getResourceFromAIInput() {
    const text = getAIInput();
    const title = (text.match(/PDF simulado: (.*)/) || [])[1]?.split('\n')[0];
    if (!title) return null;
    return loadWorkspace().resources.find(resource => resource.title === title) || null;
}

let currentTutorPdf = null;
let currentTutorTopic = getStoredTutorTopic();

function getStoredTutorTopic() {
    try {
        return localStorage.getItem('acStudyTutorTopic') || '';
    } catch (error) {
        return '';
    }
}

function setTutorTopic(topic) {
    currentTutorTopic = String(topic || '').trim();
    if (typeof tutorState !== 'undefined') {
        tutorState.topic = currentTutorTopic;
    }
    try {
        if (currentTutorTopic) {
            localStorage.setItem('acStudyTutorTopic', currentTutorTopic);
        }
    } catch (error) {
        // localStorage puede no estar disponible en algunos navegadores privados.
    }
}

function normalizeTutorText(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function appendTutorMessage(type, content, title = '') {
    const messages = document.getElementById('tutor-messages');
    if (!messages) return false;

    const message = document.createElement('div');
    message.className = `tutor-message ${type === 'user' ? 'tutor-user' : 'tutor-bot'}`;

    const safeContent = escapeHTML(String(content || '')).replace(/\n/g, '<br>');
    const safeTitle = title ? `<strong>${escapeHTML(title)}</strong>` : '';
    message.innerHTML = `${safeTitle}<p>${safeContent}</p>`;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return true;
}

function appendTutorPracticeCards(topic) {
    const messages = document.getElementById('tutor-messages');
    if (!messages) return false;

    const cleanTopic = escapeHTML(topic || 'tu tema');
    const lowerTopic = String(topic || '').toLowerCase();
    const isLimits = /limite|limites/.test(lowerTopic);
    const questions = isLimits
        ? [
            'Que significa que una funcion se acerque a un valor?',
            'Cuando existe un limite por izquierda y por derecha?',
            'Como reconocerias una discontinuidad en una grafica?',
            'Resuelve un ejemplo sencillo usando sustitucion directa.',
            'Explica con tus palabras para que sirven los limites.'
        ]
        : [
            `Que es ${topic} con tus propias palabras?`,
            `Cual es la idea principal de ${topic}?`,
            `Menciona un ejemplo practico de ${topic}.`,
            `Que parte de ${topic} te parece mas dificil y por que?`,
            `Como explicarias ${topic} a un companero en un minuto?`
        ];

    const message = document.createElement('div');
    message.className = 'tutor-message tutor-bot tutor-practice-response';
    message.innerHTML = `
        <strong>Practica sobre ${cleanTopic}</strong>
        <p>Responde estas tarjetas una por una. Cuando termines, puedes pedirme que revise tus respuestas.</p>
        <div class="tutor-practice-grid">
            ${questions.map((question, index) => `
                <article class="tutor-practice-card">
                    <span>${index + 1}</span>
                    <p>${escapeHTML(question)}</p>
                </article>
            `).join('')}
        </div>
    `;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return true;
}

function appendTutorFileMessage(file) {
    const messages = document.getElementById('tutor-messages');
    if (!messages || !file) return false;

    const card = document.createElement('div');
    card.className = 'tutor-file-card tutor-user';
    card.innerHTML = `
        <span class="tutor-file-icon" aria-hidden="true">PDF</span>
        <div>
            <strong>${escapeHTML(file.name)}</strong>
            <small>PDF agregado al chat - ${(file.size / 1024).toFixed(1)} KB</small>
        </div>
    `;

    messages.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
    return true;
}

function loadTutorPDF(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const topic = document.getElementById('ai-topic');
    currentTutorPdf = {
        name: file.name,
        size: file.size,
        loadedAt: new Date().toISOString(),
        topic: file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
    };
    setTutorTopic(currentTutorPdf.topic);

    appendTutorFileMessage(file);
    if (topic) topic.focus();

    notify(`PDF "${file.name}" agregado al chat.`, 'success');
}

function generateTutorAnswer() {
    const topic = getAIInput();
    if (!topic) {
        notify('Escribe una pregunta o sube un PDF simulado.', 'error');
        return;
    }

    const answer = buildAIResponse('tutor', topic);
    appendTutorMessage('user', topic);
    showAIResult('Tutor', answer);

    const input = document.getElementById('ai-topic');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function extractStudyTopic(prompt) {
    return normalizeTutorText(prompt)
        .replace(/pdf simulado cargado:[\s\S]*/g, '')
        .replace(/ayudame a|ayudame|por favor|porfa|explicame|explica|dime|hazme|hacer|investiga|ensename|dame|un resumen de|resumen de/g, '')
        .replace(/paso a paso|lo paso a paso|con detalle|detalladamente/g, '')
        .replace(/que es|que son|cual es|sobre|acerca de|este pdf|del pdf|de este pdf|mi pdf/g, '')
        .replace(/conceptos|concepto|debo aprender|aprender|del tema|tema/g, '')
        .replace(/\b(el|la|los|las|un|una|unos|unas|de|del)\b/g, ' ')
        .replace(/[?.,;:!]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isTutorFollowUp(prompt) {
    const text = normalizeTutorText(prompt);
    return Boolean(currentTutorTopic) && /(utilizarlo|usarlo|aplicarlo|eso|esto|lo anterior|vida cotidiana|ocasiones|ejemplo|sirve|para que|cuando se usa|donde se usa|como se usa|ejercicios|conceptos|debo aprender|tema)/.test(text);
}

function isConceptRequest(prompt) {
    return /(concepto|conceptos|ideas clave|puntos clave|debo aprender|que debo aprender|aprender del tema)/.test(normalizeTutorText(prompt));
}

function isEmptyTutorTopic(topic) {
    const clean = normalizeTutorText(topic)
        .replace(/el tema que estas estudiando|tema que estas estudiando/g, '')
        .replace(/\b(tema|concepto|conceptos|dame|quiero|saber|aprender)\b/g, '')
        .trim();
    return clean.length < 3;
}

function getTutorConcepts(topic) {
    const plain = normalizeTutorText(topic);

    if (/interes compuesto|interes|compuesto/.test(plain)) {
        setTutorTopic('interes compuesto');
        return `Conceptos que debes aprender sobre interes compuesto:\n\n1. Capital inicial:\nEs el dinero con el que empiezas una inversion, ahorro o deuda.\n\n2. Tasa de interes:\nEs el porcentaje que se aplica en cada periodo. Por ejemplo, 10% se escribe como 0.10.\n\n3. Tiempo o periodos:\nEs la cantidad de veces que se aplica el interes. Puede ser en anos, meses o dias, segun el caso.\n\n4. Monto final:\nEs el dinero total que queda despues de aplicar el interes compuesto.\n\n5. Formula:\nA = P(1 + r)^t\nP es capital inicial, r es tasa, t es tiempo y A es monto final.\n\n6. Interes sobre interes:\nEs la idea mas importante: los intereses ganados se suman al capital y luego tambien generan nuevos intereses.\n\n7. Diferencia con interes simple:\nEn interes simple, el interes siempre se calcula sobre el capital inicial. En interes compuesto, se calcula sobre el capital mas los intereses acumulados.\n\n8. Uso real:\nSe usa en ahorros, inversiones, prestamos, tarjetas de credito y planes de retiro.\n\nSi dominas esos conceptos, ya puedes resolver ejercicios basicos de interes compuesto.`;
    }

    if (/limite|limites/.test(plain)) {
        setTutorTopic('limites');
        return `Conceptos que debes aprender sobre limites:\n\n1. Funcion:\nEs la expresion o regla que estas analizando.\n\n2. Variable x:\nEs el valor que se acerca a un numero determinado.\n\n3. Valor al que se acerca la funcion:\nEs el resultado que la funcion va tomando cuando x se aproxima al punto.\n\n4. Limite lateral izquierdo:\nAnaliza que pasa cuando x se acerca desde valores menores.\n\n5. Limite lateral derecho:\nAnaliza que pasa cuando x se acerca desde valores mayores.\n\n6. Existencia del limite:\nEl limite existe si el lado izquierdo y el lado derecho llegan al mismo valor.\n\n7. Continuidad:\nUna funcion es continua si no presenta saltos, huecos o cortes en el punto analizado.\n\n8. Uso real:\nLos limites sirven para entender continuidad, derivadas, graficas y cambios en funciones.`;
    }

    return `Para darte conceptos correctos necesito el tema exacto.\n\nEscribe, por ejemplo:\n- Dame conceptos de interes compuesto\n- Dame conceptos de limites\n- Dame conceptos de fotosintesis\n\nAsi te respondo con conceptos reales del tema, no con una plantilla general.`;
}

function getTutorExplanation(topic, originalPrompt) {
    const normalized = topic || currentTutorTopic || 'el tema que estas estudiando';
    const plainTopic = normalizeTutorText(normalized);
    const prompt = normalizeTutorText(originalPrompt);
    const pdfName = currentTutorPdf?.name || '';
    const pdfTopic = pdfName ? pdfName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : '';

    if (isConceptRequest(originalPrompt)) {
        if (currentTutorTopic && isEmptyTutorTopic(topic)) {
            return getTutorConcepts(currentTutorTopic);
        }
        if (!isEmptyTutorTopic(normalized)) {
            return getTutorConcepts(normalized);
        }
        return getTutorConcepts('');
    }

    if (currentTutorPdf && /ejercicio|ejercicios|pregunta|preguntas|practica|practicar/.test(prompt)) {
        const pdfPlain = normalizeTutorText(`${pdfTopic} ${prompt}`);
        if (/limite|limites/.test(pdfPlain)) {
            setTutorTopic('limites');
            return `Ejercicios de practica basados en el PDF "${pdfName}":\n\n1. Concepto basico:\nExplica con tus palabras que significa que una funcion se acerque a un valor.\n\n2. Limite directo:\nSi f(x) = x + 3, cual es el limite cuando x se acerca a 2?\nRespuesta esperada: 5.\n\n3. Limites laterales:\nSi por la izquierda la funcion se acerca a 4 y por la derecha tambien se acerca a 4, el limite existe? Cual es?\nRespuesta esperada: Si existe, y es 4.\n\n4. Caso donde no existe:\nSi por la izquierda la funcion se acerca a 2 y por la derecha se acerca a 6, existe el limite?\nRespuesta esperada: No existe, porque los dos lados no llegan al mismo valor.\n\n5. Aplicacion grafica:\nMira una grafica y observa hacia donde se acercan los valores de y cuando x se acerca al punto indicado.\n\nConsejo:\nPara resolver limites, primero intenta sustitucion directa. Si no funciona, revisa la grafica, simplifica la expresion o analiza los lados.`;
        }

        return `Ejercicios de practica basados en el PDF "${pdfName}":\n\n1. Explica el tema principal del PDF con tus palabras.\n2. Escribe tres conceptos importantes que aparezcan en el documento.\n3. Crea un ejemplo relacionado con ${pdfTopic || normalized}.\n4. Responde: para que sirve este tema en clase?\n5. Resume el contenido en cinco lineas.\n\nCuando respondas, puedo ayudarte a revisar si esta correcto.`;
    }

    if (currentTutorPdf && /explica|explicame|que es|que son|entender|no entiendo/.test(prompt)) {
        const pdfPlain = normalizeTutorText(`${pdfTopic} ${prompt}`);
        if (/limite|limites/.test(pdfPlain)) {
            setTutorTopic('limites');
            return `Te explico el PDF "${pdfName}" de forma sencilla.\n\nEl tema es limites.\n\nUn limite sirve para saber a que valor se acerca una funcion cuando x se acerca a un numero. No se trata siempre de reemplazar y ya; muchas veces se trata de observar el comportamiento de la funcion cerca de ese punto.\n\nEjemplo sencillo:\nImagina que x se acerca a 2. Si al mirar la funcion, los valores de y se acercan a 5, entonces decimos que el limite es 5.\n\nLo mas importante:\n1. Mira el numero al que se acerca x.\n2. Observa a que valor se acerca la funcion.\n3. Revisa si por la izquierda y por la derecha se llega al mismo resultado.\n4. Si ambos lados coinciden, el limite existe.\n\nPara que sirve:\nLos limites sirven para entender continuidad, derivadas, graficas y cambios. Son una base importante del calculo.`;
        }
    }

    if (currentTutorPdf && /resumen|resume|resumir|pdf|apunte/.test(prompt)) {
        const sourceTopic = pdfTopic || normalized;
        if (/limite|limites/.test(normalizeTutorText(`${sourceTopic} ${prompt}`))) {
            setTutorTopic('limites');
            return `Resumen del PDF "${pdfName}":\n\nTema central:\nEl PDF trata sobre limites, un concepto de matematica que explica a que valor se acerca una funcion cuando la variable se aproxima a un numero.\n\nQue es un limite:\nUn limite sirve para estudiar el comportamiento de una funcion cerca de un punto. No siempre importa el valor exacto en ese punto; lo importante es hacia donde se acerca la funcion.\n\nIdea principal:\nSi x se acerca a un numero y los valores de la funcion se acercan a un mismo resultado, entonces ese resultado es el limite.\n\nLimites laterales:\n1. Limite por la izquierda: observa que pasa cuando x se acerca desde valores menores.\n2. Limite por la derecha: observa que pasa cuando x se acerca desde valores mayores.\n3. Si los dos lados llegan al mismo numero, el limite existe.\n4. Si llegan a numeros diferentes, el limite no existe.\n\nEjemplo:\nSi cuando x se acerca a 2, la funcion se acerca a 5 por ambos lados, entonces el limite es 5.\n\nPara que sirve:\nLos limites se usan para entender continuidad, cambios en funciones, derivadas, graficas y problemas donde una funcion se acerca a un valor sin tocarlo exactamente.\n\nResumen final:\nEl PDF explica que los limites ayudan a analizar tendencias. La clave es mirar que pasa cerca de un punto, comparar izquierda y derecha, y confirmar si ambos lados llegan al mismo valor.`;
        }

        return `Resumen del PDF "${pdfName}":\n\nTema central:\nEl documento se enfoca en ${sourceTopic}. Presenta conceptos principales, ejemplos y puntos que el estudiante debe organizar para estudiar mejor.\n\nIdeas principales:\n1. El tema se puede dividir en definicion, caracteristicas y ejemplos.\n2. Las partes importantes son los conceptos que se repiten o que aparecen como base para ejercicios.\n3. Los ejemplos ayudan a comprobar si el contenido fue entendido.\n4. Las preguntas de repaso sirven para practicar antes de una prueba.\n\nResumen corto:\nEste PDF explica ${sourceTopic} de manera introductoria. La idea principal es entender que significa el tema, reconocer sus elementos mas importantes y aplicarlo en ejercicios o situaciones de clase.\n\nConclusiones:\n- Identifica las definiciones clave.\n- Separa ejemplos de teoria.\n- Practica con preguntas cortas.\n- Explica el tema con tus propias palabras para comprobar que lo entendiste.\n\nPregunta de practica:\nCual es la idea principal de ${sourceTopic} y que ejemplo podrias resolver para demostrarlo?`;
    }

    if (/interes compuesto|interes|compuesto/.test(plainTopic)) {
        setTutorTopic('interes compuesto');
        if (/ejercicio|ejercicios|practica|practicar|respuesta|respuestas|comprobar|resolver/.test(prompt)) {
            return `Claro. Aqui tienes 5 ejercicios de interes compuesto para resolver. Primero intenta hacerlos tu, y al final te dejo las respuestas para comprobar.\n\nFormula:\nA = P(1 + r)^t\n\nDonde:\nA = monto final\nP = capital inicial\nr = tasa de interes en decimal\nt = tiempo o numero de periodos\n\nEjercicios:\n\n1. Una persona deposita 100 dolares al 10% anual durante 2 anos. Cuanto dinero tendra al final?\n\n2. Si inviertes 250 dolares al 8% anual durante 3 anos, cual sera el monto final?\n\n3. Un estudiante ahorra 500 dolares en una cuenta que paga 5% anual durante 4 anos. Cuanto tendra despues de ese tiempo?\n\n4. Una deuda de 300 dolares crece con interes compuesto del 12% anual durante 2 anos. Cuanto se debera pagar al final?\n\n5. Si una inversion de 1000 dolares crece al 6% anual durante 5 anos, cual sera el monto final aproximado?\n\nRespuestas para comprobar:\n\n1. A = 100(1 + 0.10)^2 = 121.00 dolares.\n\n2. A = 250(1 + 0.08)^3 = 314.93 dolares aproximadamente.\n\n3. A = 500(1 + 0.05)^4 = 607.75 dolares aproximadamente.\n\n4. A = 300(1 + 0.12)^2 = 376.32 dolares.\n\n5. A = 1000(1 + 0.06)^5 = 1338.23 dolares aproximadamente.\n\nComo comprobarlos:\nConvierte el porcentaje a decimal, suma 1, eleva al tiempo y multiplica por el capital inicial.`;
        }

        if (/vida cotidiana|ocasiones|utilizar|usar|sirve|aplicar|aplicarlo/.test(prompt)) {
            return `El interes compuesto se usa en muchas situaciones de la vida cotidiana porque explica como crece una cantidad cuando se acumulan intereses sobre intereses.\n\nOcasiones donde se utiliza:\n1. Ahorros bancarios:\nSi guardas dinero en una cuenta que genera intereses, cada periodo el banco calcula intereses sobre el dinero inicial mas lo que ya ganaste.\n\n2. Inversiones:\nCuando inviertes en fondos, certificados o planes de ahorro, el dinero puede crecer con interes compuesto si las ganancias se reinvierten.\n\n3. Prestamos:\nAlgunos prestamos calculan intereses sobre saldos acumulados. Por eso, si no pagas a tiempo, la deuda puede aumentar mas rapido.\n\n4. Tarjetas de credito:\nSi dejas una deuda pendiente, los intereses pueden sumarse al saldo y luego generar mas intereses. Esto hace que la deuda crezca.\n\n5. Planes de retiro:\nMientras mas temprano empiezas a ahorrar, mas tiempo tiene el interes compuesto para hacer crecer el dinero.\n\nEjemplo de vida diaria:\nSi ahorras 100 dolares al 10% anual y no retiras las ganancias, despues del primer ano tienes 110. En el segundo ano ya no ganas interes sobre 100, sino sobre 110. Por eso crece mas rapido.\n\nConclusion:\nEl interes compuesto sirve para entender como crece el dinero con el tiempo, tanto para ganar mas en ahorros e inversiones como para evitar que una deuda aumente demasiado.`;
        }

        return `Interes compuesto\n\nQue es:\nEl interes compuesto es una forma de calcular ganancias o deudas donde los intereses se suman al capital inicial y despues tambien generan nuevos intereses. Por eso se dice que es "interes sobre interes".\n\nFormula principal:\nMonto final = Capital inicial x (1 + tasa) ^ tiempo\n\nTambien se puede escribir asi:\nA = P(1 + r)^t\n\nDonde:\nP = capital inicial, es decir, el dinero con el que empiezas.\nr = tasa de interes por periodo, escrita en decimal. Por ejemplo, 10% = 0.10.\nt = numero de periodos.\nA = monto final despues de aplicar el interes compuesto.\n\nComo funciona:\nSi inviertes 100 dolares al 10% anual durante 3 anos:\nAno 1: 100 x 1.10 = 110\nAno 2: 110 x 1.10 = 121\nAno 3: 121 x 1.10 = 133.10\n\nResultado:\nAl final tendrias 133.10 dolares. La ganancia no fue solo 30, porque cada ano el interes se calculo sobre una cantidad mas grande.\n\nEn que se usa:\n1. Ahorros e inversiones.\n2. Prestamos y deudas.\n3. Tarjetas de credito.\n4. Cuentas bancarias.\n5. Crecimiento de dinero en el tiempo.\n\nDiferencia con interes simple:\nEn el interes simple, el interes siempre se calcula sobre el capital inicial.\nEn el interes compuesto, el interes se calcula sobre el capital inicial mas los intereses acumulados.\n\nEjemplo rapido:\nSi tienes 200 dolares al 5% durante 2 anos:\nA = 200(1 + 0.05)^2\nA = 200(1.05)^2\nA = 200 x 1.1025\nA = 220.50\n\nConclusion:\nEl interes compuesto es importante porque muestra como el dinero puede crecer mas rapido con el tiempo. Mientras mayor sea la tasa o mas largo sea el tiempo, mas grande sera el monto final.`;
    }

    if (/termica|termodinamica|calor|temperatura/.test(plainTopic)) {
        return `La termica es una parte de la fisica que estudia el calor, la temperatura y como la energia se transfiere entre los cuerpos.\n\nExplicacion sencilla:\nCuando un cuerpo esta caliente, sus particulas se mueven con mas energia. Cuando esta frio, se mueven con menos energia. La termica ayuda a entender como cambia esa energia y por que el calor pasa de un cuerpo caliente a uno mas frio.\n\nConceptos importantes:\n1. Temperatura: indica que tan caliente o frio esta un cuerpo.\n2. Calor: es energia que se transfiere por diferencia de temperatura.\n3. Equilibrio termico: ocurre cuando dos cuerpos llegan a la misma temperatura.\n4. Dilatacion: algunos materiales aumentan su tamano cuando se calientan.\n\nEjemplo:\nSi pones una cuchara fria dentro de una taza de cafe caliente, la cuchara se calienta porque recibe energia termica del cafe.\n\nEn resumen:\nLa termica explica como se comporta el calor y como afecta a los objetos.`;
    }

    if (/limite|limites/.test(plainTopic)) {
        setTutorTopic('limites');
        return `Un limite en matematica describe a que valor se acerca una funcion cuando la variable se aproxima a un numero.\n\nExplicacion sencilla:\nNo siempre importa el valor exacto de la funcion en un punto. A veces importa hacia donde se acerca. Eso es un limite.\n\nEjemplo:\nSi x se acerca a 2 y la funcion se acerca a 5, decimos que el limite es 5.\n\nPara entender limites:\n1. Mira a que numero se acerca x.\n2. Observa a que valor se acerca la funcion.\n3. Revisa el comportamiento por la izquierda y por la derecha.\n4. Si ambos lados llegan al mismo valor, el limite existe.\n\nEn resumen:\nLos limites sirven para estudiar continuidad, derivadas y cambios en funciones.`;
    }

    if (/fisica/.test(plainTopic)) {
        return `La fisica es la ciencia que estudia la materia, la energia, el movimiento, las fuerzas y los fenomenos naturales.\n\nExplicacion sencilla:\nLa fisica intenta responder preguntas como: por que cae un objeto, como se mueve un carro, como viaja la luz o como se transfiere el calor.\n\nRamas importantes:\n1. Mecanica: estudia movimiento y fuerzas.\n2. Termica: estudia calor y temperatura.\n3. Electricidad: estudia cargas y corriente electrica.\n4. Optica: estudia la luz.\n\nEjemplo:\nCuando lanzas una pelota, la fisica explica su velocidad, su trayectoria y por que vuelve a caer.\n\nEn resumen:\nLa fisica ayuda a entender como funciona el mundo que nos rodea.`;
    }

    if (isEmptyTutorTopic(normalized)) {
        return `Necesito que me digas el tema exacto para responder bien.\n\nPor ejemplo:\n- Que es el interes compuesto?\n- Dame conceptos de limites\n- Explicame la fotosintesis\n- Dame ejercicios de ecuaciones\n\nAsi puedo darte una respuesta real sobre el tema, no una plantilla generica.`;
    }

    setTutorTopic(normalized);
    return fallbackInteligente(normalized, detectTutorIntent(originalPrompt));
}

function buildAIResponse(type, topic) {
    const resource = getResourceFromAIInput();
    if (resource) {
        if (type === 'questions') return buildResourceAIResponse(resource, 'quiz');
        if (type === 'flashcards') return buildResourceAIResponse(resource, 'flashcards');
        if (type === 'simple') return buildResourceAIResponse(resource, 'simple');
        if (type === 'open') return buildResourceAIResponse(resource, 'open');
        if (type === 'truefalse') return buildResourceAIResponse(resource, 'truefalse');
        return buildResourceAIResponse(resource, 'summary');
    }

    const reference = topic.length > 380 ? `${topic.slice(0, 380)}...` : topic;
    if (type === 'tutor') {
        const contextReference = isTutorFollowUp(reference)
            ? `${currentTutorTopic}. Pregunta del estudiante: ${reference}`
            : reference;
        const extractedTopic = isTutorFollowUp(reference)
            ? currentTutorTopic
            : extractStudyTopic(reference);
        return getTutorExplanation(extractedTopic, contextReference);
    }
    if (currentTutorPdf && type === 'summary') {
        return getTutorExplanation(extractStudyTopic(reference), reference);
    }
    if (type === 'quiz') {
        return `Cuestionario simulado sobre ${reference}:\n\n1. Explica el tema con tus palabras.\n2. Que ejemplo puedes resolver?\n3. Cual es el error mas comun?\n4. Como lo explicarias en clase?\n5. Que debes repasar antes del examen?`;
    }
    if (type === 'open') {
        return `Preguntas abiertas:\n\n1. Explica ${reference} con tus palabras.\n2. Crea un ejemplo propio.\n3. Relaciona el tema con una situacion real.`;
    }
    if (type === 'truefalse') {
        return `Verdadero/Falso:\n\n1. El tema tiene conceptos clave que se pueden resumir. (V)\n2. No hace falta practicar. (F)\n3. Crear preguntas ayuda a estudiar. (V)\n4. Las flashcards sirven para repasar rapido. (V)`;
    }
    if (type === 'flashcards') {
        return `Flashcards:\n\nTarjeta 1\nPregunta: Que es ${reference}?\nRespuesta: Escribe una definicion corta.\n\nTarjeta 2\nPregunta: Cual es un ejemplo?\nRespuesta: Crea un caso practico.\n\nTarjeta 3\nPregunta: Que debo recordar?\nRespuesta: La informacion principal y sus aplicaciones.`;
    }
    if (type === 'simple') {
        return `Explicacion sencilla:\n\nPiensa en este tema como una idea principal con varias piezas alrededor. Primero entiende la definicion, luego mira ejemplos y finalmente practica respondiendo preguntas.`;
    }
    return `Resumen:\n\nEl contenido sobre ${reference} puede organizarse en definiciones, ideas clave, ejemplos y preguntas de practica. Para estudiar mejor, conviertelo en una lista corta y repasala con flashcards.`;
}

function generateQuiz() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un PDF desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Cuestionario generado', buildAIResponse('quiz', topic));
}

function generatePracticeCards() {
    const input = document.getElementById('ai-topic');
    const typedTopic = getAIInput();
    const pdfTopic = currentTutorPdf?.name
        ? currentTutorPdf.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
        : '';
    const topic = typedTopic || pdfTopic;

    if (!topic) {
        notify('Escribe un tema o sube un PDF para practicar.', 'error');
        return;
    }

    appendTutorMessage('user', `Practicar: ${topic}`);
    appendTutorPracticeCards(extractStudyTopic(topic) || topic);

    if (input) {
        input.value = '';
        input.focus();
    }
}

function generateOpenQuestions() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un PDF desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Preguntas abiertas', buildAIResponse('open', topic));
}

function generateTrueFalse() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un PDF desde la mochila digital.', 'error');
        return;
    }
    showAIResult('Verdadero/Falso', buildAIResponse('truefalse', topic));
}

// ============================================
// TUTOR EDUCATIVO SIMULADO CON CONTEXTO
// Punto central para conectar el asistente con un servicio externo mas adelante.
// ============================================

const tutorState = {
    mode: getTutorStorageValue('acStudyTutorMode') || 'explain',
    topic: getTutorStorageValue('acStudyTutorTopic') || '',
    history: getTutorHistory(),
    pendingQuestion: getTutorPendingQuestion()
};
let lastTopic = tutorState.topic;
let lastSubtopic = getTutorStorageValue('acStudyTutorSubtopic') || '';
let lastIntent = '';
let chatHistory = tutorState.history;
let lastTutorResponse = getTutorStorageValue('acStudyLastTutorResponse') || '';

function getTutorStorageValue(key) {
    try {
        return localStorage.getItem(key) || '';
    } catch (error) {
        return '';
    }
}

function setTutorStorageValue(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // El prototipo puede ejecutarse en navegadores sin almacenamiento disponible.
    }
}

function getTutorHistory() {
    try {
        return JSON.parse(localStorage.getItem('acStudyTutorHistory') || '[]');
    } catch (error) {
        return [];
    }
}

function saveTutorHistory() {
    try {
        localStorage.setItem('acStudyTutorHistory', JSON.stringify(tutorState.history.slice(-16)));
    } catch (error) {
        // Historial solo local y opcional.
    }
}

function getTutorPendingQuestion() {
    try {
        return JSON.parse(localStorage.getItem('acStudyTutorPendingQuestion') || 'null');
    } catch (error) {
        return null;
    }
}

function saveTutorPendingQuestion() {
    try {
        if (tutorState.pendingQuestion) {
            localStorage.setItem('acStudyTutorPendingQuestion', JSON.stringify(tutorState.pendingQuestion));
        } else {
            localStorage.removeItem('acStudyTutorPendingQuestion');
        }
    } catch (error) {
        // Preguntas pendientes solo viven en el navegador.
    }
}

function rememberTutorTopic(topic) {
    const cleanTopic = String(topic || '').trim();
    if (!cleanTopic) return;
    tutorState.topic = cleanTopic;
    lastTopic = cleanTopic;
    currentTutorTopic = cleanTopic;
    setTutorStorageValue('acStudyTutorTopic', cleanTopic);
}

function rememberTutorSubtopic(subtopic) {
    const cleanSubtopic = String(subtopic || '').trim();
    if (!cleanSubtopic) return;
    lastSubtopic = cleanSubtopic;
    setTutorStorageValue('acStudyTutorSubtopic', cleanSubtopic);
}

function setTutorMode(mode, button) {
    tutorState.mode = mode || 'explain';
    setTutorStorageValue('acStudyTutorMode', tutorState.mode);

    document.querySelectorAll('.tutor-tabs button').forEach(tab => tab.classList.remove('active'));
    if (button) button.classList.add('active');

    const label = document.getElementById('tutor-mode-label');
    if (label) label.textContent = `Modo ${getTutorModeName(tutorState.mode)}`;
}

function getTutorModeName(mode) {
    const names = {
        explain: 'explicar',
        practice: 'practicar',
        review: 'repasar',
        flashcards: 'flashcards',
        exam: 'examen'
    };
    return names[mode] || 'explicar';
}

function clearTutorChat() {
    const messages = document.getElementById('tutor-messages');
    if (!messages) return;

    tutorState.history = [];
    tutorState.pendingQuestion = null;
    saveTutorHistory();
    saveTutorPendingQuestion();

    messages.innerHTML = `
        <div class="tutor-message tutor-bot">
            <strong>Tutor</strong>
            <p>Chat limpio. Escribe un tema o una pregunta y seguire el contexto de la conversacion.</p>
        </div>
    `;
}

function addTutorHistory(role, content) {
    tutorState.history.push({
        role,
        content,
        topic: tutorState.topic,
        mode: tutorState.mode,
        at: new Date().toISOString()
    });
    tutorState.history = tutorState.history.slice(-16);
    chatHistory = tutorState.history;
    saveTutorHistory();
}

function showTutorThinking() {
    const messages = document.getElementById('tutor-messages');
    if (!messages) return null;

    const thinking = document.createElement('div');
    thinking.className = 'tutor-message tutor-bot tutor-thinking';
    thinking.innerHTML = '<strong>Tutor</strong><p>Tutor esta pensando...</p>';
    messages.appendChild(thinking);
    messages.scrollTop = messages.scrollHeight;
    return thinking;
}

function detectTutorIntent(message) {
    const text = normalizeTutorText(message);

    if (tutorState.pendingQuestion && !/(otra pregunta|hazme preguntas|preguntas|cuestionario|examen|flashcards|resumen|explica|ejercicio)/.test(text)) {
        return 'answer-check';
    }
    if (/flashcard|tarjeta|tarjetas/.test(text)) return 'flashcards';
    if (/formula|formulas|ecuacion|regla/.test(text)) return 'formula';
    if (/cuestionario|examen|preparar examen|evaluacion/.test(text)) return 'exam';
    if (/pregunta|preguntas|practicar|practica/.test(text)) return 'practice';
    if (/ejercicio|ejercicios|resolver|problema|problemas/.test(text)) return 'exercises';
    if (/resumen|resume|resumir|repasar|repaso/.test(text)) return 'review';
    if (/ejemplo|ejemplos|vida cotidiana|utilizar|usar|aplicar|sirve|uso/.test(text)) return 'example';
    if (/paso|pasos|procedimiento|como se resuelve/.test(text)) return 'steps';
    if (/concepto|conceptos|ideas clave|puntos clave|debo aprender/.test(text)) return 'concepts';
    if (/que es|que son|definicion|define/.test(text)) return 'definition';
    if (/que es|definicion|define|explicame|explica|no entiendo|ayuda/.test(text)) return 'explain';

    if (tutorState.mode === 'practice') return 'practice';
    if (tutorState.mode === 'review') return 'review';
    if (tutorState.mode === 'flashcards') return 'flashcards';
    if (tutorState.mode === 'exam') return 'exam';
    return 'explain';
}

function extractTutorTopic(message, intent) {
    const text = normalizeTutorText(message);
    const foundTopic = findKnowledgeTopic(text);
    if (foundTopic) return foundTopic;

    if (tutorState.topic) {
        const currentProfile = getTopicProfile(tutorState.topic);
        if (findTutorSubtopic(text, currentProfile)) return tutorState.topic;
    }

    const followUp = /(eso|esto|lo anterior|del tema|este tema|utilizarlo|usarlo|aplicarlo|dame conceptos tema|conceptos tema|dame ejemplos|hazme preguntas|ahora ejercicios|resumelo|resumen|conceptos|ejemplos|ejercicios|flashcards|en que casos|cuando se usa|para que sirve)/.test(text);
    if (followUp && tutorState.topic) return tutorState.topic;

    const clean = text
        .replace(/ayudame|por favor|porfa|explicame|explica|dime|hazme|hacer|dame|quiero|necesito|puedes/g, ' ')
        .replace(/que es|que son|definicion|resumen|resumir|ejemplos|ejemplo|ejercicios|ejercicio|preguntas|pregunta|flashcards|cuestionario|conceptos|concepto|tema|del tema|debo aprender|pasos|paso a paso/g, ' ')
        .replace(/\b(el|la|los|las|un|una|unos|unas|de|del|en|para|con|sobre|acerca|mi|este|esta)\b/g, ' ')
        .replace(/[?.,;:!]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (clean.length >= 3) return clean;
    return tutorState.topic || '';
}

const knowledgeBase = {
    'fisica termica': {
        aliases: ['fisica termica', 'termica', 'termodinamica', 'calor y temperatura', 'cambio de estado', 'equilibrio termico', 'conduccion', 'conveccion', 'radiacion'],
        title: 'fisica termica',
        definition: 'La fisica termica es la rama de la fisica que estudia el calor, la temperatura y los cambios de energia termica entre los cuerpos.',
        explanation: 'La temperatura indica que tan caliente o frio esta un cuerpo. El calor es energia que se transfiere de un cuerpo a otro por diferencia de temperatura. El equilibrio termico ocurre cuando dos cuerpos alcanzan la misma temperatura. En algunos procesos puede haber cambio de temperatura y en otros puede haber cambio de estado.',
        characteristics: ['La temperatura mide el estado termico de un cuerpo', 'El calor se transfiere por diferencia de temperatura', 'El equilibrio termico ocurre cuando dos cuerpos llegan a la misma temperatura', 'Puede existir cambio de temperatura o cambio de estado', 'Relaciona masa, calor especifico y calor latente'],
        concepts: ['Calor', 'Temperatura', 'Equilibrio termico', 'Energia termica', 'Calor especifico', 'Calor latente', 'Cambio de estado'],
        formula: 'Q = m * c * DeltaT\nQ = m * L\n\nDonde:\nQ es el calor.\nm es la masa.\nc es el calor especifico.\nDeltaT es el cambio de temperatura.\nL es el calor latente.',
        example: 'Si calientas agua en una olla, la energia del fuego pasa al agua como calor. Por eso aumenta su temperatura. Si sigue recibiendo calor, puede llegar a hervir y cambiar de liquido a vapor.',
        uses: 'Sirve para explicar calentamiento, enfriamiento, cambios de estado, equilibrio termico, cocina, clima, motores, refrigeracion y procesos industriales.',
        exercises: ['Cual es la diferencia entre calor y temperatura?', 'Que significa equilibrio termico?', 'Para que sirve la formula Q = m * c * DeltaT?', 'Que ocurre cuando una sustancia cambia de estado?', 'Que representa el calor latente?'],
        answers: ['La temperatura mide que tan caliente o frio esta un cuerpo; el calor es energia transferida.', 'Que dos cuerpos alcanzan la misma temperatura.', 'Para calcular calor cuando cambia la temperatura.', 'La sustancia cambia de fase, por ejemplo de liquido a vapor.', 'La energia necesaria para cambiar de estado sin cambiar temperatura.'],
        flashcards: [['Que estudia la fisica termica?', 'Calor, temperatura y energia termica entre cuerpos.'], ['Que es calor?', 'Energia que se transfiere por diferencia de temperatura.'], ['Formula con cambio de temperatura', 'Q = m * c * DeltaT'], ['Formula con cambio de estado', 'Q = m * L']],
        subtopics: {
            calor: {
                definition: 'El calor es energia que se transfiere de un cuerpo a otro por diferencia de temperatura.',
                explanation: 'El calor siempre fluye espontaneamente del cuerpo con mayor temperatura al de menor temperatura hasta acercarse al equilibrio termico.',
                example: 'Si tocas una taza caliente, el calor pasa de la taza a tu mano.',
                question: 'Cual es la diferencia entre calor y temperatura?'
            },
            temperatura: {
                definition: 'La temperatura indica que tan caliente o frio esta un cuerpo.',
                explanation: 'Esta relacionada con la energia de movimiento de las particulas de una sustancia.',
                example: 'Un vaso con agua a 80 grados Celsius tiene mayor temperatura que uno a 20 grados Celsius.',
                question: 'Que mide la temperatura en un cuerpo?'
            },
            'equilibrio termico': {
                definition: 'El equilibrio termico ocurre cuando dos cuerpos en contacto alcanzan la misma temperatura.',
                explanation: 'Cuando se llega al equilibrio termico, deja de haber transferencia neta de calor entre los cuerpos.',
                example: 'Una cuchara fria dentro de sopa caliente se calienta hasta acercarse a la temperatura de la sopa.',
                question: 'Que ocurre cuando dos cuerpos alcanzan equilibrio termico?'
            },
            'cambio de estado': {
                definition: 'El cambio de estado es la transformacion de una sustancia de solido a liquido, liquido a gas, gas a liquido u otro estado por ganancia o perdida de calor.',
                explanation: 'Durante el cambio de estado, la energia recibida o liberada se usa para cambiar la estructura de la sustancia, no necesariamente para aumentar o disminuir la temperatura.',
                example: 'Cuando el hielo recibe calor, se derrite y pasa de solido a liquido. Cuando el agua hierve, pasa de liquido a vapor.',
                question: 'Que ocurre con la temperatura durante un cambio de estado?'
            },
            'calor especifico': {
                definition: 'El calor especifico es la cantidad de calor necesaria para aumentar en un grado la temperatura de una unidad de masa de una sustancia.',
                explanation: 'Un material con calor especifico alto necesita mas energia para calentarse.',
                example: 'El agua tiene calor especifico alto, por eso tarda mas en calentarse que algunos metales.',
                question: 'Que representa c en Q = m * c * DeltaT?'
            },
            'calor latente': {
                definition: 'El calor latente es la energia necesaria para que una sustancia cambie de estado sin cambiar su temperatura.',
                explanation: 'Se usa en procesos como fusion, vaporizacion, condensacion y solidificacion.',
                example: 'El agua puede seguir recibiendo calor mientras hierve, pero su temperatura se mantiene casi constante durante el cambio a vapor.',
                question: 'Que representa L en Q = m * L?'
            },
            conduccion: {
                definition: 'La conduccion es la transferencia de calor por contacto directo entre particulas.',
                explanation: 'Ocurre con facilidad en solidos, especialmente en metales.',
                example: 'Una cuchara metalica se calienta cuando queda dentro de una olla caliente.',
                question: 'Por que los metales conducen bien el calor?'
            },
            conveccion: {
                definition: 'La conveccion es la transferencia de calor por movimiento de un fluido, como liquidos o gases.',
                explanation: 'Las zonas calientes suben y las frias bajan, generando corrientes.',
                example: 'El agua caliente sube dentro de una olla mientras el agua mas fria baja.',
                question: 'En que estados de la materia ocurre principalmente la conveccion?'
            },
            radiacion: {
                definition: 'La radiacion es la transferencia de energia termica mediante ondas, sin necesitar contacto directo.',
                explanation: 'Puede ocurrir incluso en el vacio.',
                example: 'El Sol calienta la Tierra por radiacion.',
                question: 'Por que la radiacion no necesita contacto directo?'
            }
        }
    },
    'calor especifico': {
        aliases: ['calor especifico'],
        title: 'calor especifico',
        definition: 'El calor especifico es la cantidad de calor que necesita una unidad de masa de una sustancia para aumentar su temperatura en un grado.',
        explanation: 'Cada material necesita distinta energia para calentarse. Por eso el agua tarda mas en calentarse que otros materiales: tiene calor especifico alto.',
        characteristics: ['Depende del material', 'Se relaciona con cambios de temperatura', 'Aparece en la formula Q = m * c * DeltaT', 'Mientras mayor es c, mas calor se necesita'],
        concepts: ['Calor', 'Masa', 'Cambio de temperatura', 'Material', 'Energia termica'],
        formula: 'Q = m * c * DeltaT',
        example: 'Para calentar una masa de agua se necesita mas energia que para calentar una masa similar de metal, porque el agua tiene mayor calor especifico.',
        uses: 'Se usa para calcular energia necesaria al calentar o enfriar sustancias.',
        exercises: ['Que representa c en Q = m * c * DeltaT?', 'Si c aumenta, se necesita mas o menos calor?', 'En que procesos se usa el calor especifico?'],
        answers: ['El calor especifico.', 'Mas calor.', 'En calentamiento o enfriamiento con cambio de temperatura.'],
        flashcards: [['c', 'Calor especifico'], ['Formula', 'Q = m * c * DeltaT'], ['Idea clave', 'Materiales distintos requieren distinta energia']]
    },
    'calor latente': {
        aliases: ['calor latente'],
        title: 'calor latente',
        definition: 'El calor latente es la energia que una sustancia absorbe o libera para cambiar de estado sin cambiar su temperatura.',
        explanation: 'Durante un cambio de estado, como hielo a agua o agua a vapor, la energia se usa para romper o formar enlaces, no para subir la temperatura.',
        characteristics: ['Ocurre en cambios de estado', 'No cambia la temperatura durante el proceso', 'Depende de la sustancia', 'Puede ser de fusion o vaporizacion'],
        concepts: ['Cambio de estado', 'Fusion', 'Vaporizacion', 'Energia', 'Masa'],
        formula: 'Q = m * L',
        example: 'Cuando el agua hierve, sigue recibiendo calor, pero su temperatura se mantiene cerca de 100 grados Celsius mientras cambia a vapor.',
        uses: 'Se usa para estudiar ebullicion, fusion, evaporacion, refrigeracion y cambios de fase.',
        exercises: ['Que representa L?', 'Por que no cambia la temperatura durante el cambio de estado?', 'Que formula usa calor latente?'],
        answers: ['El calor latente.', 'Porque la energia se usa para cambiar de estado.', 'Q = m * L.'],
        flashcards: [['Calor latente', 'Energia para cambiar de estado'], ['Formula', 'Q = m * L'], ['Ejemplo', 'Agua hirviendo que pasa a vapor']]
    },
    'funciones geometricas': {
        aliases: ['funciones geometricas', 'funcion geometrica', 'geometricas', 'geometria con funciones'],
        title: 'funciones geometricas',
        definition: 'Las funciones geometricas son relaciones matematicas que ayudan a representar figuras, medidas y comportamientos graficos. Permiten estudiar rectas, curvas, areas, perimetros, volumenes, puntos, transformaciones y patrones dentro del plano o del espacio.',
        explanation: 'En geometria, una funcion puede describir como cambia una medida cuando cambia otra. Por ejemplo, una recta puede representarse con una funcion lineal, una parabola con una funcion cuadratica y el area de una figura puede depender de una variable como el lado o el radio.',
        characteristics: ['Relacionan variables con figuras o medidas', 'Se pueden representar en graficas', 'Ayudan a estudiar rectas, curvas y superficies', 'Permiten calcular areas, perimetros o volumenes', 'Conectan algebra y geometria'],
        concepts: ['Plano cartesiano', 'Puntos', 'Rectas', 'Curvas', 'Area', 'Perimetro', 'Funcion lineal', 'Funcion cuadratica', 'Transformaciones'],
        formula: 'Ejemplos: recta y = mx + b, parabola y = ax^2 + bx + c, area de un cuadrado A = l^2, perimetro P = 4l.',
        example: 'Una funcion lineal como y = 2x + 1 representa una recta. Una funcion cuadratica como y = x^2 representa una parabola. Si el lado de un cuadrado es x, su area se puede representar como A(x) = x^2.',
        uses: 'Sirven para interpretar graficas, resolver problemas de medidas, modelar figuras, calcular areas y entender como cambian las formas cuando cambian sus dimensiones.',
        exercises: ['Representa y = 2x + 1 en una grafica y describe que figura forma.', 'Si el lado de un cuadrado mide x, escribe la funcion de su area.', 'Explica por que y = x^2 forma una parabola.', 'Da un ejemplo de una funcion que represente un perimetro.', 'Identifica si y = 3x + 2 es lineal o cuadratica.'],
        answers: ['Forma una recta.', 'A(x) = x^2.', 'Porque al elevar x al cuadrado, los valores forman una curva simetrica.', 'P(x) = 4x para un cuadrado.', 'Es lineal.'],
        flashcards: [
            ['Que son funciones geometricas?', 'Relaciones matematicas que representan figuras, medidas o graficas.'],
            ['Que funcion representa una recta?', 'Una funcion lineal: y = mx + b.'],
            ['Que funcion representa una parabola?', 'Una funcion cuadratica: y = ax^2 + bx + c.'],
            ['Como se representa el area de un cuadrado?', 'A(x) = x^2.']
        ]
    },
    'funciones cuadraticas': {
        aliases: ['funciones cuadraticas', 'funcion cuadratica', 'parabolas', 'parabola'],
        title: 'funciones cuadraticas',
        definition: 'Una funcion cuadratica es una funcion polinomica de segundo grado cuya grafica es una parabola.',
        explanation: 'Se usa para representar situaciones donde hay crecimiento curvo, trayectoria, areas o maximos y minimos.',
        characteristics: ['Tiene una variable elevada al cuadrado', 'Su grafica es una parabola', 'Puede abrir hacia arriba o hacia abajo', 'Tiene vertice', 'Puede cortar al eje x en cero, uno o dos puntos'],
        concepts: ['Parabola', 'Vertice', 'Eje de simetria', 'Raices', 'Concavidad'],
        formula: 'f(x) = ax^2 + bx + c, con a diferente de 0.',
        example: 'f(x) = x^2 - 4 tiene una parabola que corta al eje x en x = -2 y x = 2.',
        uses: 'Se usa en fisica para trayectorias, en economia para ganancias y en geometria para areas.',
        exercises: ['Identifica a, b y c en f(x)=2x^2+3x-1.', 'Que forma tiene la grafica de una cuadratica?', 'Si a es positivo, hacia donde abre la parabola?'],
        answers: ['a=2, b=3, c=-1.', 'Una parabola.', 'Hacia arriba.'],
        flashcards: [['Formula general', 'f(x)=ax^2+bx+c'], ['Grafica', 'Parabola'], ['Vertice', 'Punto minimo o maximo de la parabola']]
    },
    'funciones lineales': {
        aliases: ['funciones lineales', 'funcion lineal', 'rectas', 'recta'],
        title: 'funciones lineales',
        definition: 'Una funcion lineal representa una relacion de cambio constante y su grafica es una recta.',
        explanation: 'Cada vez que x aumenta una cantidad, y cambia siempre en la misma proporcion.',
        characteristics: ['Grafica recta', 'Cambio constante', 'Tiene pendiente', 'Puede cortar el eje y'],
        concepts: ['Pendiente', 'Intercepto', 'Plano cartesiano', 'Variacion constante'],
        formula: 'y = mx + b, donde m es la pendiente y b es el corte con el eje y.',
        example: 'y = 2x + 1 significa que por cada aumento de 1 en x, y aumenta 2.',
        uses: 'Se usa para costos fijos y variables, velocidad constante y comparaciones proporcionales.',
        exercises: ['En y=3x+2, cual es la pendiente?', 'Grafica y=x+1.', 'Que representa b en y=mx+b?'],
        answers: ['La pendiente es 3.', 'Una recta que corta en 1.', 'El corte con el eje y.'],
        flashcards: [['Funcion lineal', 'Relacion con grafica recta'], ['Pendiente', 'Indica inclinacion'], ['Formula', 'y=mx+b']]
    },
    'interes compuesto': {
        aliases: ['interes compuesto', 'interes', 'compuesto'],
        title: 'interes compuesto',
        definition: 'El interes compuesto es el calculo donde los intereses se suman al capital inicial y luego tambien generan nuevos intereses.',
        explanation: 'Se llama interes sobre interes porque cada periodo se calcula sobre una cantidad mayor.',
        characteristics: ['Crecimiento acumulativo', 'Depende del capital inicial', 'Depende de la tasa', 'Depende del tiempo', 'Crece mas rapido que el interes simple'],
        concepts: ['Capital inicial', 'Tasa de interes', 'Tiempo', 'Monto final', 'Interes sobre interes'],
        formula: 'M = C(1 + i)^t o A = P(1 + r)^t.',
        example: 'Si inviertes 100 dolares al 10% por 2 anos: M = 100(1.10)^2 = 121 dolares.',
        uses: 'Se usa en ahorros, inversiones, prestamos, tarjetas de credito y planes de retiro.',
        exercises: ['Calcula 100 dolares al 10% por 2 anos.', 'Calcula 250 dolares al 8% por 3 anos.', 'Calcula 500 dolares al 5% por 4 anos.', 'Explica la diferencia con interes simple.', 'Convierte 12% a decimal.'],
        answers: ['121.00 dolares.', '314.93 dolares aproximadamente.', '607.75 dolares aproximadamente.', 'El simple calcula sobre capital inicial; el compuesto sobre capital mas intereses.', '0.12.'],
        flashcards: [['Formula', 'M = C(1+i)^t'], ['Capital', 'Dinero inicial'], ['Tasa', 'Porcentaje aplicado por periodo'], ['Clave', 'Interes sobre interes']]
    },
    'logica matematica': {
        aliases: ['logica matematica', 'logica', 'proposiciones'],
        title: 'logica matematica',
        definition: 'La logica matematica estudia razonamientos, proposiciones y reglas para determinar si un argumento es valido.',
        explanation: 'Ayuda a analizar enunciados verdaderos o falsos usando conectores como y, o, no, entonces y si y solo si.',
        characteristics: ['Usa proposiciones', 'Trabaja con valores de verdad', 'Usa conectores logicos', 'Permite construir tablas de verdad'],
        concepts: ['Proposicion', 'Negacion', 'Conjuncion', 'Disyuncion', 'Implicacion', 'Tabla de verdad'],
        formula: 'Ejemplo: p -> q significa si p entonces q.',
        example: 'p: estudio. q: apruebo. p -> q significa: si estudio, entonces apruebo.',
        uses: 'Se usa en matematica, programacion, circuitos y pensamiento critico.',
        exercises: ['Niega la proposicion: hoy llueve.', 'Que significa p y q?', 'Crea una tabla de verdad para p o q.'],
        answers: ['Hoy no llueve.', 'Que p y q son verdaderas al mismo tiempo.', 'Es falsa solo cuando p y q son falsas.'],
        flashcards: [['Proposicion', 'Enunciado verdadero o falso'], ['Negacion', 'Cambia el valor de verdad'], ['Implicacion', 'Si p entonces q']]
    },
    porcentajes: {
        aliases: ['porcentajes', 'porcentaje', 'tanto por ciento'],
        title: 'porcentajes',
        definition: 'Un porcentaje representa una parte de cada 100.',
        explanation: 'Sirve para comparar cantidades, descuentos, aumentos, notas y proporciones.',
        characteristics: ['Se expresa con %', 'Relaciona una parte con 100', 'Puede convertirse a decimal', 'Se usa en descuentos e incrementos'],
        concepts: ['Parte', 'Total', 'Porcentaje', 'Decimal', 'Proporcion'],
        formula: 'Porcentaje = (parte / total) x 100.',
        example: '20% de 50 es 10, porque 0.20 x 50 = 10.',
        uses: 'Descuentos, impuestos, estadisticas, notas y finanzas.',
        exercises: ['Calcula 15% de 200.', 'Que porcentaje es 25 de 100?', 'Convierte 8% a decimal.'],
        answers: ['30.', '25%.', '0.08.'],
        flashcards: [['Porcentaje', 'Parte de 100'], ['20%', '0.20'], ['Formula', '(parte/total)x100']]
    },
    calorimetria: {
        aliases: ['calorimetria'],
        title: 'calorimetria',
        definition: 'La calorimetria estudia la cantidad de calor que gana o pierde un cuerpo.',
        explanation: 'Relaciona calor, masa, calor especifico y cambio de temperatura.',
        characteristics: ['Mide transferencia de calor', 'Usa masa y temperatura', 'Depende del material', 'Se aplica en cambios termicos'],
        concepts: ['Calor', 'Masa', 'Calor especifico', 'Temperatura', 'Equilibrio termico'],
        formula: 'Q = m c DeltaT.',
        example: 'Si calientas agua, el calor necesario depende de la masa del agua y cuanto sube su temperatura.',
        uses: 'Laboratorio, cocina, fisica termica e ingenieria.',
        exercises: ['Identifica m, c y DeltaT en Q=mcDeltaT.', 'Que pasa si aumenta la masa?', 'Que mide Q?'],
        answers: ['Masa, calor especifico y cambio de temperatura.', 'Se necesita mas calor.', 'Cantidad de calor.'],
        flashcards: [['Q', 'Calor'], ['c', 'Calor especifico'], ['DeltaT', 'Cambio de temperatura']]
    },
    'movimiento rectilineo': {
        aliases: ['movimiento rectilineo', 'mru'],
        title: 'movimiento rectilineo',
        definition: 'El movimiento rectilineo ocurre cuando un objeto se desplaza en linea recta.',
        explanation: 'Puede tener velocidad constante o aceleracion, dependiendo del tipo de movimiento.',
        characteristics: ['Trayectoria recta', 'Puede tener velocidad constante', 'Puede tener aceleracion', 'Relaciona distancia y tiempo'],
        concepts: ['Posicion', 'Distancia', 'Tiempo', 'Velocidad', 'Aceleracion'],
        formula: 'MRU: v = d/t. MRUA: vf = vi + at.',
        example: 'Un carro que avanza 100 m en linea recta durante 10 s tiene velocidad media de 10 m/s.',
        uses: 'Analizar autos, trenes, caidas idealizadas y desplazamientos simples.',
        exercises: ['Calcula v si d=100m y t=10s.', 'Que significa trayectoria recta?', 'Diferencia MRU y MRUA.'],
        answers: ['10 m/s.', 'Que se mueve en linea recta.', 'MRU velocidad constante; MRUA aceleracion.'],
        flashcards: [['MRU', 'Movimiento rectilineo uniforme'], ['Velocidad', 'Distancia / tiempo'], ['Aceleracion', 'Cambio de velocidad']]
    },
    energia: {
        aliases: ['energia'],
        title: 'energia',
        definition: 'La energia es la capacidad de realizar trabajo o producir cambios.',
        explanation: 'Puede aparecer como energia cinetica, potencial, termica, electrica, quimica y mas.',
        characteristics: ['Se transforma', 'No se crea ni se destruye', 'Puede almacenarse', 'Puede transferirse'],
        concepts: ['Trabajo', 'Energia cinetica', 'Energia potencial', 'Transformacion', 'Conservacion'],
        formula: 'Energia cinetica: Ec = 1/2 mv^2. Energia potencial: Ep = mgh.',
        example: 'Una pelota en altura tiene energia potencial; al caer, se transforma en energia cinetica.',
        uses: 'Fisica, electricidad, maquinas, movimiento y vida diaria.',
        exercises: ['Da un ejemplo de energia cinetica.', 'Que energia tiene un objeto elevado?', 'Que dice la conservacion de energia?'],
        answers: ['Un carro en movimiento.', 'Energia potencial.', 'La energia se transforma, no desaparece.'],
        flashcards: [['Energia', 'Capacidad de producir cambios'], ['Cinetica', 'Energia por movimiento'], ['Potencial', 'Energia por posicion']]
    },
    fuerza: {
        aliases: ['fuerza', 'newton', 'ley de newton'],
        title: 'fuerza',
        definition: 'La fuerza es una interaccion capaz de cambiar el movimiento o la forma de un cuerpo.',
        explanation: 'Puede empujar, jalar, acelerar, frenar o deformar un objeto.',
        characteristics: ['Tiene magnitud', 'Tiene direccion', 'Se mide en newtons', 'Puede cambiar la velocidad'],
        concepts: ['Masa', 'Aceleracion', 'Newton', 'Peso', 'Friccion'],
        formula: 'F = m a.',
        example: 'Si empujas una caja, aplicas una fuerza que puede moverla si supera la friccion.',
        uses: 'Movimiento, maquinas, deportes, transporte y estructuras.',
        exercises: ['Calcula F si m=5kg y a=2m/s2.', 'Que unidad mide la fuerza?', 'Da un ejemplo de fuerza.'],
        answers: ['10 N.', 'Newton.', 'Empujar una puerta.'],
        flashcards: [['Fuerza', 'Interaccion que cambia movimiento'], ['Formula', 'F=ma'], ['Unidad', 'Newton']]
    },
    'base de datos': {
        aliases: ['base de datos', 'bases de datos', 'database'],
        title: 'base de datos',
        definition: 'Una base de datos es un sistema organizado para almacenar, consultar y administrar informacion.',
        explanation: 'Permite guardar usuarios, tareas, calificaciones, recursos y otros datos de forma estructurada.',
        characteristics: ['Organiza datos', 'Usa tablas o colecciones', 'Permite consultas', 'Puede relacionar informacion'],
        concepts: ['Tabla', 'Registro', 'Campo', 'Clave primaria', 'Consulta', 'Relacion'],
        formula: 'Ejemplo SQL: SELECT * FROM usuarios;',
        example: 'AC Edunity podria tener tablas de usuarios, materias, tareas, notas y recursos.',
        uses: 'Aplicaciones web, bancos, tiendas, escuelas y plataformas educativas.',
        exercises: ['Nombra tres tablas para AC Edunity.', 'Que es un registro?', 'Para que sirve una clave primaria?'],
        answers: ['Usuarios, materias y tareas.', 'Una fila de datos.', 'Para identificar un registro.'],
        flashcards: [['Tabla', 'Conjunto de datos'], ['Registro', 'Fila'], ['Campo', 'Columna']]
    },
    html: {
        aliases: ['html'],
        title: 'HTML',
        definition: 'HTML es el lenguaje de marcado que estructura el contenido de una pagina web.',
        explanation: 'Define titulos, parrafos, botones, formularios, imagenes, enlaces y secciones.',
        characteristics: ['Usa etiquetas', 'Estructura contenido', 'No es lenguaje de programacion', 'Trabaja junto a CSS y JavaScript'],
        concepts: ['Etiqueta', 'Atributo', 'Elemento', 'Formulario', 'Enlace'],
        formula: '<h1>Titulo</h1>',
        example: '<button>Enviar</button> crea un boton.',
        uses: 'Crear la estructura de sitios y aplicaciones web.',
        exercises: ['Que etiqueta crea un titulo principal?', 'Para que sirve <a>?', 'Crea un parrafo HTML.'],
        answers: ['<h1>.', 'Para enlaces.', '<p>Texto</p>.'],
        flashcards: [['HTML', 'Estructura web'], ['Etiqueta', 'Marca contenido'], ['Atributo', 'Agrega informacion']]
    },
    css: {
        aliases: ['css'],
        title: 'CSS',
        definition: 'CSS es el lenguaje que da estilo visual a una pagina web.',
        explanation: 'Controla colores, fuentes, tamanos, bordes, sombras, layouts y responsive.',
        characteristics: ['Estiliza HTML', 'Usa selectores', 'Permite responsive', 'Controla animaciones'],
        concepts: ['Selector', 'Propiedad', 'Valor', 'Clase', 'Flexbox', 'Grid'],
        formula: '.card { color: blue; }',
        example: 'button { background: purple; } cambia el fondo de los botones.',
        uses: 'Diseno visual, interfaces, adaptacion movil y animaciones.',
        exercises: ['Que propiedad cambia color de texto?', 'Para que sirve display flex?', 'Crea una clase .box.'],
        answers: ['color.', 'Para alinear elementos.', '.box { padding: 10px; }.'],
        flashcards: [['CSS', 'Estilos web'], ['Selector', 'Elige elementos'], ['Grid', 'Layout en filas y columnas']]
    },
    javascript: {
        aliases: ['javascript', 'js'],
        title: 'JavaScript',
        definition: 'JavaScript es un lenguaje de programacion que permite agregar interactividad a paginas web.',
        explanation: 'Sirve para responder clics, guardar datos locales, cambiar contenido, validar formularios y crear logica.',
        characteristics: ['Es dinamico', 'Manipula el DOM', 'Responde eventos', 'Puede guardar datos en localStorage'],
        concepts: ['Variable', 'Funcion', 'Evento', 'DOM', 'Array', 'Objeto'],
        formula: 'function saludar() { console.log("Hola"); }',
        example: 'Un boton puede ejecutar JavaScript cuando el usuario hace clic.',
        uses: 'Apps web, juegos, formularios, dashboards y asistentes simulados.',
        exercises: ['Que es una variable?', 'Para que sirve addEventListener?', 'Crea una funcion simple.'],
        answers: ['Un espacio para guardar datos.', 'Para escuchar eventos.', 'function hola() { return "hola"; }.'],
        flashcards: [['JS', 'Interactividad web'], ['DOM', 'Documento HTML manipulable'], ['Evento', 'Accion del usuario']]
    },
    redes: {
        aliases: ['redes', 'redes informaticas', 'internet'],
        title: 'redes informaticas',
        definition: 'Una red informatica conecta dispositivos para compartir informacion y recursos.',
        explanation: 'Permite comunicacion entre computadoras, servidores, celulares e internet.',
        characteristics: ['Conecta dispositivos', 'Usa protocolos', 'Puede ser local o global', 'Comparte datos'],
        concepts: ['IP', 'Router', 'Servidor', 'Cliente', 'Protocolo', 'LAN', 'WAN'],
        formula: 'Ejemplo de IP: 192.168.1.1.',
        example: 'Cuando entras a una pagina, tu equipo se comunica con un servidor mediante internet.',
        uses: 'Internet, escuelas, empresas, videojuegos, correos y plataformas web.',
        exercises: ['Que es una IP?', 'Diferencia LAN y WAN.', 'Para que sirve un router?'],
        answers: ['Direccion de un dispositivo.', 'LAN local, WAN amplia.', 'Conecta y dirige trafico.'],
        flashcards: [['Red', 'Dispositivos conectados'], ['Router', 'Dirige datos'], ['IP', 'Direccion de red']]
    }
};

function findKnowledgeTopic(text) {
    const normalizedText = normalizeTutorText(text);
    return Object.keys(knowledgeBase).find(key => {
        const topic = knowledgeBase[key];
        return topic.aliases.some(alias => normalizedText.includes(normalizeTutorText(alias)));
    }) || '';
}

function getTopicProfile(topic) {
    const key = normalizeTutorText(topic);
    const knownKey = findKnowledgeTopic(key) || key;

    return knowledgeBase[knownKey] || {
        title: topic,
        unknown: true
    };
}

function getTutorResponse(userMessage) {
    const response = buildTutorSimulatedReply(userMessage);
    return finalizeTutorResponse(response);
}

function detectIntent(message) {
    return detectTutorIntent(message);
}

function findTutorSubtopic(message, profile) {
    if (!profile?.subtopics) return '';
    const text = normalizeTutorText(message);
    return Object.keys(profile.subtopics).find(subtopic => text.includes(normalizeTutorText(subtopic))) || '';
}

function shouldUseLastSubtopic(intent, message) {
    if (!lastSubtopic) return false;
    const text = normalizeTutorText(message);
    if (findKnowledgeTopic(text)) return false;
    if (/concepto|conceptos|ideas clave|puntos clave/.test(text)) return false;
    return ['example', 'practice', 'exercises', 'flashcards', 'review', 'definition', 'explain', 'steps'].includes(intent);
}

function buildSubtopicReply(profile, subtopic, intent) {
    const data = profile.subtopics?.[subtopic];
    if (!data) return '';
    rememberTutorSubtopic(subtopic);

    if (intent === 'example') {
        return `Ejemplo de ${subtopic} en ${profile.title}:\n\n${data.example}\n\nExplicacion:\n${data.explanation}`;
    }
    if (intent === 'practice' || intent === 'exercises') {
        tutorState.pendingQuestion = {
            topic: subtopic,
            question: data.question,
            expected: data.definition,
            keywords: [subtopic].concat(data.definition.split(' ').slice(0, 5)).map(normalizeTutorText)
        };
        saveTutorPendingQuestion();
        return `Vamos a practicar ${subtopic}.\n\nPregunta:\n${data.question}\n\nResponde con tus palabras y te dire si esta bien.`;
    }
    if (intent === 'flashcards') {
        return `Flashcards de ${subtopic}:\n\nTarjeta 1\nPregunta: Que es ${subtopic}?\nRespuesta: ${data.definition}\n\nTarjeta 2\nPregunta: Dame un ejemplo.\nRespuesta: ${data.example}\n\nTarjeta 3\nPregunta: Que debo recordar?\nRespuesta: ${data.explanation}`;
    }
    if (intent === 'review' || intent === 'summary') {
        return `Resumen de ${subtopic}:\n\n${data.definition}\n\n${data.explanation}\n\nEjemplo:\n${data.example}`;
    }

    return `${subtopic} en ${profile.title}:\n\nDefinicion:\n${data.definition}\n\nExplicacion sencilla:\n${data.explanation}\n\nEjemplo:\n${data.example}\n\nPregunta de practica:\n${data.question}`;
}

function fallbackInteligente(topic, intent = 'explain') {
    const cleanTopic = cleanFallbackTopic(topic);
    rememberTutorTopic(cleanTopic);

    if (intent === 'practice' || intent === 'exercises') {
        return `Practica sobre ${cleanTopic}:\n\n1. Explica con tus palabras que significa ${cleanTopic}.\n2. Menciona una situacion donde se use ${cleanTopic}.\n3. Identifica una ventaja o utilidad de ${cleanTopic}.\n4. Crea un ejemplo corto relacionado con ${cleanTopic}.\n5. Escribe una duda que todavia tengas sobre ${cleanTopic}.\n\nResponde la pregunta 1 y te ayudo a revisar tu respuesta.`;
    }

    if (intent === 'flashcards') {
        return `Flashcards sobre ${cleanTopic}:\n\nTarjeta 1\nPregunta: Que es ${cleanTopic}?\nRespuesta: Es un concepto que representa una idea, proceso o medida importante dentro de su materia y permite analizar una situacion concreta.\n\nTarjeta 2\nPregunta: Para que sirve ${cleanTopic}?\nRespuesta: Sirve para interpretar datos, tomar decisiones, resolver actividades o explicar un fenomeno segun el contexto.\n\nTarjeta 3\nPregunta: Como se estudia ${cleanTopic}?\nRespuesta: Primero se entiende la definicion, luego se revisa un ejemplo y finalmente se practica con ejercicios o preguntas.`;
    }

    if (intent === 'review') {
        return `Resumen de ${cleanTopic}:\n\n${cleanTopic} es un tema que se entiende mejor observando que representa, como se aplica y que decisiones permite tomar. La idea principal es reconocer sus elementos, relacionarlos con un ejemplo y practicar con preguntas cortas.\n\nPuntos clave:\n1. Identifica su definicion.\n2. Reconoce sus partes o variables.\n3. Mira como se aplica en una situacion real.\n4. Practica explicandolo con tus propias palabras.`;
    }

    if (intent === 'example') {
        return `Ejemplo de ${cleanTopic}:\n\nImagina que estas analizando ${cleanTopic} en una actividad de clase. Primero identificas el dato principal, luego revisas que significa y finalmente lo usas para tomar una decision o resolver una pregunta.\n\nEjemplo aplicado:\nSi el tema se relaciona con emprendimiento, puede ayudarte a comparar costos, beneficios, riesgos o resultados. Si se relaciona con ciencias, puede ayudarte a explicar una causa y una consecuencia. Si se relaciona con matematica, puede ayudarte a calcular o interpretar un valor.`;
    }

    return `${cleanTopic}:\n\nDefinicion:\n${buildProbableDefinition(cleanTopic)}\n\nExplicacion sencilla:\nPiensa en ${cleanTopic} como una idea que ayuda a entender, medir o explicar una situacion. Para estudiarlo bien, conviene separar que significa, donde aparece y como se usa en un caso real.\n\nEjemplo:\nSi hablamos de ${cleanTopic} en una actividad academica, puedes tomar una situacion concreta, identificar los datos importantes y explicar que resultado o decision se obtiene a partir de ese concepto.\n\nPara que sirve:\nSirve para comprender mejor el tema, resolver tareas, preparar exposiciones, responder preguntas de examen y conectar la teoria con situaciones practicas.\n\nPreguntas de practica:\n1. Que significa ${cleanTopic} con tus propias palabras?\n2. En que situacion real se puede usar ${cleanTopic}?\n3. Que dato o idea es mas importante para entender ${cleanTopic}?\n4. Como explicarias ${cleanTopic} a un companero?\n5. Que ejemplo sencillo podrias crear sobre ${cleanTopic}?`;
}

function isFallbackFollowUpMessage(message) {
    const text = normalizeTutorText(message);
    return /^(dame|hazme|quiero|necesito|ahora|puedes|muestrame|explica|explicame)?\s*(ejemplo|ejemplos|pregunta|preguntas|ejercicio|ejercicios|resumen|resumelo|flashcards|tarjetas|conceptos|practica|practicar)\b/.test(text)
        || /(del tema|este tema|lo anterior|eso|esto)/.test(text);
}

function cleanFallbackTopic(topic) {
    const clean = normalizeTutorText(topic)
        .replace(/ayudame|por favor|porfa|explicame|explica|dime|hazme|hacer|dame|quiero|necesito|puedes/g, ' ')
        .replace(/que es|que son|definicion|resumen|resumir|ejemplos|ejemplo|ejercicios|ejercicio|preguntas|pregunta|flashcards|cuestionario|conceptos|concepto|tema|del tema|debo aprender|pasos|paso a paso/g, ' ')
        .replace(/\b(el|la|los|las|un|una|unos|unas|de|del|sobre|acerca)\b/g, ' ')
        .replace(/[?.,;:!]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || 'este tema';
}

function buildProbableDefinition(topic) {
    if (/tasa|interes|rendimiento|financiamiento|prestamo/.test(topic)) {
        return `La ${topic} es un porcentaje o medida que permite entender el costo, ganancia o rendimiento real de una operacion durante un periodo determinado.`;
    }
    if (/emprendimiento|negocio|empresa|ventas|mercado/.test(topic)) {
        return `${topic} se relaciona con la forma de organizar, evaluar o mejorar una idea de negocio para tomar mejores decisiones.`;
    }
    if (/fisica|calor|energia|movimiento|fuerza/.test(topic)) {
        return `${topic} es un concepto de fisica que ayuda a explicar como ocurre un fenomeno natural y que variables participan en el proceso.`;
    }
    if (/matematica|funcion|ecuacion|numero|porcentaje/.test(topic)) {
        return `${topic} es un concepto matematico que permite representar, calcular o comparar cantidades para resolver problemas.`;
    }
    if (/html|css|javascript|programacion|base de datos|redes|software/.test(topic)) {
        return `${topic} es un concepto de informatica que sirve para crear, organizar o hacer funcionar sistemas digitales.`;
    }
    return `${topic} es un concepto que se estudia para comprender una idea principal, aplicarla en ejemplos y usarla para resolver preguntas o actividades.`;
}

function similarityScore(a, b) {
    const wordsA = new Set(normalizeTutorText(a).split(/\s+/).filter(word => word.length > 3));
    const wordsB = new Set(normalizeTutorText(b).split(/\s+/).filter(word => word.length > 3));
    if (!wordsA.size || !wordsB.size) return 0;
    let shared = 0;
    wordsA.forEach(word => {
        if (wordsB.has(word)) shared += 1;
    });
    return shared / Math.max(wordsA.size, wordsB.size);
}

function finalizeTutorResponse(response) {
    let finalResponse = response;
    if (lastTutorResponse && similarityScore(lastTutorResponse, finalResponse) > 0.82) {
        finalResponse = `${finalResponse}\n\nPara verlo de otra forma:\nPiensa en un ejemplo concreto y responde: que cambia, que se conserva y que formula o idea explica ese cambio?`;
    }
    lastTutorResponse = finalResponse;
    setTutorStorageValue('acStudyLastTutorResponse', finalResponse);
    return finalResponse;
}

function buildTutorSimulatedReply(message) {
    const intent = detectTutorIntent(message);
    lastIntent = intent;
    const topic = extractTutorTopic(message, intent);

    if (intent === 'answer-check') {
        return checkTutorPracticeAnswer(message);
    }

    const activeTopic = topic || tutorState.topic || lastTopic || currentTutorPdf?.topic || '';
    if (!activeTopic && !currentTutorPdf) {
        return fallbackInteligente(message, intent);
    }

    if (activeTopic) rememberTutorTopic(activeTopic);
    const profile = getTopicProfile(activeTopic || currentTutorPdf?.topic || 'tu apunte');
    const pdfIntro = currentTutorPdf ? `Segun tu PDF "${currentTutorPdf.name}", ` : '';
    const directSubtopic = findTutorSubtopic(message, profile);
    const activeSubtopic = directSubtopic || (shouldUseLastSubtopic(intent, message) ? lastSubtopic : '');

    if (profile.unknown) {
        const fallbackSource = isFallbackFollowUpMessage(message) ? activeTopic : message;
        return fallbackInteligente(fallbackSource || activeTopic, intent);
    }

    if (activeSubtopic && profile.subtopics?.[activeSubtopic]) {
        return buildSubtopicReply(profile, activeSubtopic, intent);
    }

    if (intent === 'concepts') {
        return `${pdfIntro}estos son los conceptos principales de ${profile.title}:\n\n${profile.concepts.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nExplicacion central:\n${profile.definition}`;
    }
    if (intent === 'definition') {
        return `${pdfIntro}${profile.title}:\n\nDefinicion:\n${profile.definition}\n\nExplicacion clara:\n${profile.explanation}\n\nEjemplo:\n${profile.example}`;
    }
    if (intent === 'review') {
        return `${pdfIntro}resumen de ${profile.title}:\n\n${profile.definition}\n\n${profile.explanation}\n\nIdeas clave:\n${profile.concepts.slice(0, 5).map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nEjemplo:\n${profile.example}`;
    }
    if (intent === 'example') {
        return `${pdfIntro}ejemplo de ${profile.title}:\n\n${profile.example}\n\nUso en la vida cotidiana:\n${profile.uses}`;
    }
    if (intent === 'formula') {
        return `${pdfIntro}formula o regla de ${profile.title}:\n\n${profile.formula}\n\nComo interpretarla:\n${profile.explanation}\n\nEjemplo:\n${profile.example}`;
    }
    if (intent === 'steps') {
        return `Pasos para trabajar ${profile.title}:\n\n1. Lee la definicion: ${profile.definition}\n2. Identifica los conceptos clave: ${profile.concepts.slice(0, 4).join(', ')}.\n3. Revisa la regla o formula: ${profile.formula}\n4. Mira un ejemplo: ${profile.example}\n5. Practica con un ejercicio parecido.`;
    }
    if (intent === 'exercises') {
        const wantsAnswers = /respuesta|respuestas|comprobar|solucion|soluciones/.test(normalizeTutorText(message));
        return `Ejercicios de ${profile.title}:\n\n${profile.exercises.map((item, index) => `${index + 1}. ${item}`).join('\n')}${wantsAnswers ? `\n\nRespuestas para comprobar:\n${profile.answers.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '\n\nIntenta resolverlos primero. Si quieres, luego escribe "dame las respuestas" y las revisamos.'}`;
    }
    if (intent === 'flashcards') {
        const cards = profile.flashcards || [
            [`Que es ${profile.title}?`, profile.definition],
            ['Cuales son conceptos clave?', profile.concepts.slice(0, 4).join(', ')],
            ['Donde se usa?', profile.uses]
        ];
        return `Flashcards de ${profile.title}:\n\n${cards.map((card, index) => `Tarjeta ${index + 1}\nPregunta: ${card[0]}\nRespuesta: ${card[1]}`).join('\n\n')}`;
    }
    if (intent === 'exam') {
        return `Cuestionario para examen sobre ${profile.title}:\n\n1. Define ${profile.title}.\n2. Menciona tres conceptos clave.\n3. Explica un ejemplo.\n4. Para que sirve este tema?\n5. Resuelve o analiza: ${profile.exercises[0]}\n\nCuando respondas, puedo revisar tus respuestas una por una.`;
    }
    if (intent === 'practice') {
        const questions = profile.exercises.slice(0, 5);
        const question = questions[0] || `Explica ${profile.title} con tus palabras.`;
        tutorState.pendingQuestion = {
            topic: profile.title,
            question,
            expected: profile.answers[0] || profile.definition,
            keywords: profile.concepts.concat(profile.title.split(' ')).map(normalizeTutorText)
        };
        saveTutorPendingQuestion();
        return `Vamos a practicar ${profile.title}.\n\nPreguntas:\n${questions.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nResponde la pregunta 1 con tus palabras y te dire si esta bien. No te muestro respuestas todavia para que puedas practicar.`;
    }

    return `${pdfIntro}te explico ${profile.title}:\n\nDefinicion:\n${profile.definition}\n\nExplicacion:\n${profile.explanation}\n\nCaracteristicas:\n${profile.characteristics.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nFormula o regla:\n${profile.formula}\n\nEjemplo:\n${profile.example}\n\nPara que sirve:\n${profile.uses}\n\nPuedes pedirme: ejemplos, ejercicios, resumen, flashcards o preguntas para practicar.`;
}

function checkTutorPracticeAnswer(answer) {
    const pending = tutorState.pendingQuestion;
    if (!pending) return buildTutorSimulatedReply(answer);

    const normalizedAnswer = normalizeTutorText(answer);
    const hits = pending.keywords.filter(keyword => keyword && normalizedAnswer.includes(keyword)).length;
    const looksGood = hits > 0 || normalizedAnswer.length > 35;

    tutorState.pendingQuestion = null;
    saveTutorPendingQuestion();

    if (looksGood) {
        return `Vas bien. Tu respuesta se relaciona con ${pending.topic}.\n\nLo que esta correcto:\nMencionaste ideas conectadas con el tema o diste una explicacion con sentido.\n\nRespuesta esperada:\n${pending.expected}\n\nPara mejorar:\nAgrega una definicion breve y un ejemplo concreto.`;
    }

    return `Aun falta un poco. Tu respuesta no menciona claramente la idea principal de ${pending.topic}.\n\nRespuesta esperada:\n${pending.expected}\n\nIntenta responder otra vez usando una definicion y un ejemplo corto.`;
}

function generateTutorAnswer() {
    const input = document.getElementById('ai-topic');
    const topic = getAIInput();
    if (!topic) {
        notify('Escribe una pregunta o sube un PDF simulado.', 'error');
        return;
    }

    appendTutorMessage('user', topic);
    addTutorHistory('user', topic);
    if (input) input.value = '';

    const thinking = showTutorThinking();
    setTimeout(() => {
        const answer = getTutorResponse(topic);
        if (thinking) thinking.remove();
        appendTutorMessage('bot', answer, 'Tutor');
        addTutorHistory('assistant', answer);
        if (input) input.focus();
    }, 450);
}

function buildAIResponse(type, topic) {
    if (type === 'questions' || type === 'quiz' || type === 'open' || type === 'truefalse') {
        return getTutorResponse(`hazme preguntas sobre ${topic || tutorState.topic}`);
    }
    if (type === 'flashcards') {
        return getTutorResponse(`flashcards sobre ${topic || tutorState.topic}`);
    }
    if (type === 'simple' || type === 'tutor') {
        return getTutorResponse(topic || tutorState.topic);
    }
    return getTutorResponse(`resumen de ${topic || tutorState.topic}`);
}

function generateSummary() {
    const topic = getAIInput() || tutorState.topic || currentTutorPdf?.topic || currentTutorPdf?.name || '';
    if (!topic) {
        notify('Ingresa un tema o sube un PDF para resumir.', 'error');
        return;
    }
    appendTutorMessage('user', `Resumen de ${topic}`);
    const answer = getTutorResponse(`resumen de ${topic}`);
    appendTutorMessage('bot', answer, 'Tutor');
    addTutorHistory('assistant', answer);
}

function generateQuestions() {
    const topic = getAIInput() || tutorState.topic || currentTutorPdf?.topic || '';
    if (!topic) {
        notify('Ingresa un tema para practicar.', 'error');
        return;
    }
    appendTutorMessage('user', `Preguntas sobre ${topic}`);
    const answer = getTutorResponse(`hazme preguntas sobre ${topic}`);
    appendTutorMessage('bot', answer, 'Tutor');
    addTutorHistory('assistant', answer);
}

function generateFlashcards() {
    const topic = getAIInput() || tutorState.topic || currentTutorPdf?.topic || '';
    if (!topic) {
        notify('Ingresa un tema para crear flashcards.', 'error');
        return;
    }
    appendTutorMessage('user', `Flashcards de ${topic}`);
    const answer = getTutorResponse(`flashcards de ${topic}`);
    appendTutorMessage('bot', answer, 'Tutor');
    addTutorHistory('assistant', answer);
}

function generateSimpleExplanation() {
    const topic = getAIInput() || tutorState.topic || currentTutorPdf?.topic || '';
    if (!topic) {
        notify('Ingresa un tema para explicar.', 'error');
        return;
    }
    appendTutorMessage('user', `Explicame ${topic}`);
    const answer = getTutorResponse(`explicame ${topic}`);
    appendTutorMessage('bot', answer, 'Tutor');
    addTutorHistory('assistant', answer);
}

function generatePracticeCards() {
    const topic = getAIInput() || tutorState.topic || currentTutorPdf?.topic || '';
    if (!topic) {
        notify('Escribe un tema o sube un PDF para practicar.', 'error');
        return;
    }
    appendTutorMessage('user', `Practicar ${topic}`);
    const answer = getTutorResponse(`preguntas para practicar ${topic}`);
    appendTutorMessage('bot', answer, 'Tutor');
    addTutorHistory('assistant', answer);
}

// ============================================
// UTILIDADES
// ============================================

// Prevenir envio de formularios con Enter en ciertos contextos
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.closest('.form-group textarea')) {
        // Permitir saltos de linea en textareas
        return;
    }
});

document.addEventListener('keydown', (event) => {
    if (event.target?.id === 'ai-topic' && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        generateTutorAnswer();
    }
});

// Inicializar la aplicacion cuando se carga la pagina
// Dashboard limpio sin emojis para evitar caracteres rotos por codificacion.
function renderDashboard(workspace) {
    const section = document.getElementById('dashboard');
    if (!section) return;

    const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Estudiante';
    const taskCounts = {
        pending: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'pending').length,
        upcoming: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'upcoming').length,
        completed: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'completed').length,
        overdue: workspace.tasks.filter(task => getTaskVisualStatus(task) === 'overdue').length
    };
    const pending = taskCounts.pending + taskCounts.upcoming + taskCounts.overdue;
    const completed = taskCounts.completed;
    const nextEvent = getNextEvent(workspace);
    const average = getAverageGrade(workspace);
    const level = getLevel(workspace.xp);
    const isEmpty = !workspace.subjects.length && !workspace.tasks.length && !workspace.events.length && !workspace.grades.length && !workspace.resources.length;
    const taskProgress = workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0;
    const gradeProgress = average ? average * 10 : 0;
    const xpProgress = Math.min(100, ((workspace.xp || 0) % 250) / 2.5);
    const xpCurrent = (workspace.xp || 0) % 1000;
    const recentItems = (workspace.recent || []).slice(0, 3);
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const readableDate = today.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    const tasksToday = workspace.tasks.filter(task => task.status !== 'completed' && normalizeDate(task.due) === todayISO).slice(0, 3);
    const upcomingTasks = workspace.tasks.filter(task => task.status !== 'completed').slice(0, 3);
    const upcomingEvents = workspace.events.slice(0, 3);
    const dayItems = [
        ...tasksToday.map(task => ({ title: task.title, meta: `${task.subject || 'General'} - vence hoy`, type: 'Tarea' })),
        ...upcomingEvents.map(event => ({ title: event.title, meta: `${event.day || event.date || 'Sin fecha'} - ${event.type || 'Evento'}`, type: 'Evento' })),
        ...(!tasksToday.length && !upcomingEvents.length ? upcomingTasks.map(task => ({ title: task.title, meta: `${task.subject || 'General'} - ${task.due || 'Sin fecha'}`, type: 'Pendiente' })) : [])
    ].slice(0, 4);
    const steps = [
        { label: 'Crea una materia', done: workspace.subjects.length > 0, action: "navigateTo('subjects')", hint: 'Define tus clases y organiza tu espacio.' },
        { label: 'Agrega una tarea', done: workspace.tasks.length > 0, action: "navigateTo('tasks')", hint: 'Anota pendientes, deberes y entregas.' },
        { label: 'Agenda un evento', done: workspace.events.length > 0, action: "navigateTo('calendar')", hint: 'Planifica pruebas, exposiciones y entregas.' },
        { label: 'Sube un apunte', done: workspace.resources.length > 0, action: "navigateTo('backpack')", hint: 'Guarda tus PDFs y recursos importantes.' },
        { label: 'Pregunta a Tutor', done: workspace.resources.some(resource => resource.usedAI), action: "navigateTo('ai-assistant')", hint: 'Practica con resumenes, preguntas y flashcards.' }
    ];

    section.innerHTML = `
        <div class="dashboard-hero dashboard-student-hero">
            <div class="dashboard-hero-copy">
                <span class="dashboard-eyebrow">Panel academico</span>
                <h1>Hola, ${escapeHTML(firstName)} <span aria-hidden="true">&#128075;</span></h1>
                <p>${isEmpty ? 'Empieza configurando tu espacio academico.' : 'Listo para seguir aprendiendo hoy.'}</p>
                <div class="dashboard-hero-meta">
                    <span>${escapeHTML(readableDate)}</span>
                    <span>Un avance pequeno tambien cuenta.</span>
                </div>
            </div>
            <div class="dashboard-hero-widget">
                <span class="hero-widget-icon stat-icon stat-icon-assistant" aria-hidden="true"></span>
                <div>
                    <strong>Tutor IA</strong>
                    <p>Pregunta, resume apuntes o prepara un examen.</p>
                </div>
                <button class="btn-primary btn-small" type="button" onclick="navigateTo('ai-assistant')">Abrir Tutor</button>
            </div>
        </div>

        <div class="quick-actions-bar">
            <button type="button" onclick="navigateTo('subjects')">+ Nueva materia</button>
            <button type="button" onclick="navigateTo('tasks')">+ Nueva tarea</button>
            <button type="button" onclick="navigateTo('calendar')">+ Nuevo evento</button>
            <button type="button" onclick="navigateTo('backpack')">+ Subir apunte</button>
        </div>

        <div class="dashboard-grid">
            ${dashboardCard('subjects', 'Materias activas', workspace.subjects.length, workspace.subjects.length ? 'Materias creadas por ti' : 'Crea tu primera materia', workspace.subjects.length ? 100 : 0)}
            ${dashboardCard('tasks', 'Tareas pendientes', pending, workspace.tasks.length ? `${taskCounts.upcoming} proximas - ${taskCounts.overdue} vencidas - ${completed} completadas` : 'Agrega tu primer pendiente', taskProgress)}
            ${dashboardCard('calendar', 'Proximo evento', nextEvent ? nextEvent.title : 'Sin eventos', nextEvent ? `${nextEvent.day || nextEvent.date || 'Sin fecha'} - ${nextEvent.type || 'Evento'}` : 'Agenda tu primer examen', nextEvent ? 70 : 0)}
            ${dashboardCard('grades', 'Promedio actual', average ? average.toFixed(2) : '--', workspace.grades.length ? `${workspace.grades.length} calificaciones registradas` : 'Registra tus calificaciones', gradeProgress)}
        </div>

        <div class="dashboard-layout dashboard-clean-layout">
            <div class="dashboard-column dashboard-column-main">
                <div class="card dashboard-panel-card dashboard-day-card">
                    <div class="panel-title">
                        <span class="panel-icon panel-icon-day"></span>
                        <div>
                            <h3>Mi dia</h3>
                            <p>Tareas, eventos y recordatorios importantes.</p>
                        </div>
                    </div>
                    ${dayItems.length ? `
                        <ul class="dashboard-day-list">
                            ${dayItems.map(item => `
                                <li>
                                    <span>${escapeHTML(item.type)}</span>
                                    <div>
                                        <strong>${escapeHTML(item.title)}</strong>
                                        <small>${escapeHTML(item.meta)}</small>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <div class="dashboard-empty-note">
                            <strong>No tienes pendientes hoy.</strong>
                            <span>Buen momento para adelantar una materia o preguntarle algo a Tutor.</span>
                        </div>
                    `}
                </div>

                <div class="card starter-card dashboard-panel-card">
                    <div class="panel-title">
                        <span class="panel-icon panel-icon-steps"></span>
                        <div>
                            <h3>${isEmpty ? 'Empieza configurando tu espacio academico' : 'Centro del estudiante'}</h3>
                            <p>${isEmpty ? 'Sigue estos pasos para construir tu plataforma desde cero.' : 'Completa estos pasos para mantener tu espacio al dia.'}</p>
                        </div>
                    </div>
                    <ol class="starter-list dashboard-steps">
                        ${steps.slice(0, 4).map((step, index) => `
                            <li class="${step.done ? 'done' : ''}">
                                <span class="step-number">${step.done ? 'OK' : index + 1}</span>
                                <div>
                                    <strong>${escapeHTML(step.label)}</strong>
                                    <small>${escapeHTML(step.hint)}</small>
                                </div>
                                <button type="button" onclick="${step.action}">${step.done ? 'Listo' : 'Abrir'}</button>
                            </li>
                        `).join('')}
                    </ol>
                </div>
            </div>

            <div class="dashboard-column dashboard-column-middle">
                <div class="card dashboard-panel-card dashboard-progress-card">
                    <div class="panel-title">
                        <span class="panel-icon panel-icon-chart"></span>
                        <div>
                            <h3>Tu progreso</h3>
                            <p>Nivel ${level} - ${xpCurrent}/1000 XP</p>
                        </div>
                    </div>
                    <div class="dashboard-xp-ring" style="--xp:${xpProgress}%">
                        <span>${Math.round(xpProgress)}%</span>
                        <small>avance</small>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${xpProgress}%"></div></div>
                    <div class="dashboard-achievements">
                        <span>${workspace.subjects.length ? 'Materia creada' : 'Primera materia pendiente'}</span>
                        <span>${completed ? 'Tarea completada' : 'Completa tu primera tarea'}</span>
                        <span>${workspace.resources.length ? 'Apunte subido' : 'Sube un apunte'}</span>
                    </div>
                </div>

                <div class="card weekly-progress-card dashboard-panel-card">
                    <div class="panel-title">
                        <span class="panel-icon panel-icon-chart"></span>
                        <div>
                            <h3>Progreso semanal</h3>
                            <p>Vista simulada de tu avance durante la semana.</p>
                        </div>
                    </div>
                    <div class="weekly-chart" aria-label="Progreso semanal simulado">
                        ${[15, 20, 25, 30, 35, 40, Math.min(95, 20 + completed * 12)].map(value => `<span class="week-day" style="height:${value}%"></span>`).join('')}
                    </div>
                    <p class="chart-caption">${completed ? `Has completado ${completed} tarea(s).` : 'Tu grafico crecera cuando completes actividades.'}</p>
                </div>
            </div>

            <div class="dashboard-column dashboard-column-side">
                <div class="card dashboard-panel-card activity-card">
                    <div class="panel-title">
                        <span class="panel-icon panel-icon-activity"></span>
                        <div>
                            <h3>Actividad reciente</h3>
                            <p>Ultimos movimientos guardados en tu cuenta.</p>
                        </div>
                    </div>
                    ${recentItems.length ? `
                        <ul class="activity-list dashboard-activity">${recentItems.map(item => `
                            <li><span class="activity-time">${escapeHTML(item.time)}</span><span class="activity-text">${escapeHTML(item.text)}</span></li>
                        `).join('')}</ul>
                    ` : `
                        <div class="dashboard-empty-note">
                            <strong>Tu actividad aparecera aqui cuando empieces.</strong>
                            <span>Crea una materia, registra tareas o sube un apunte.</span>
                        </div>
                    `}
                </div>
            </div>

        </div>
    `;
}

function dashboardCard(icon, label, value, subtext, progress) {
    return `
        <div class="stat-card dashboard-stat-card">
            <div class="stat-header">
                <span class="stat-icon stat-icon-${escapeHTML(icon)}" aria-hidden="true"></span>
                <span class="stat-label">${escapeHTML(label)}</span>
            </div>
            <div class="stat-value">${escapeHTML(value)}</div>
            <div class="stat-subtext">${escapeHTML(subtext)}</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, progress))}%"></div></div>
        </div>
    `;
}

function emptyStateHTML(message, buttonText, action) {
    return `
        <div class="empty-state">
            <div class="empty-icon" aria-hidden="true"></div>
            <h3>${escapeHTML(message)}</h3>
            <button class="btn-primary btn-small" onclick="${action}">${escapeHTML(buttonText)}</button>
        </div>
    `;
}

function normalizeSubjectIcon(icon) {
    return subjectBookOptions.some(option => option.value === icon) ? icon : 'book-blue';
}

function addSubjectUI() {
    openSubjectForm();
}

function openSubjectForm(subjectId = null) {
    const workspace = loadWorkspace();
    const subject = workspace.subjects.find(item => item.id === subjectId);

    openQuickForm({
        title: subject ? 'Editar materia' : 'Crear materia',
        submitLabel: subject ? 'Actualizar materia' : 'Guardar materia',
        fields: [
            { name: 'name', label: 'Nombre de la materia', value: subject?.name || '', placeholder: 'Ej: Matematica' },
            { name: 'icon', label: 'Icono de la materia', type: 'choice-grid', options: subjectBookOptions, value: normalizeSubjectIcon(subject?.icon) },
            { name: 'customIcon', label: 'Icono personalizado opcional', value: subject?.customIcon || '', required: false, placeholder: 'Ej: MAT, BIO, AI' },
            { name: 'color', label: 'Color identificador', type: 'choice-grid', options: subjectColorOptions, value: subject?.color || 'Azul' },
            { name: 'description', label: 'Descripcion corta', type: 'textarea', rows: 3, value: subject?.description || '', required: false, placeholder: 'Ej: Algebra, geometria y resolucion de problemas.' },
            { name: 'goal', label: 'Objetivo de la materia', type: 'textarea', rows: 3, value: subject?.goal || '', required: false, placeholder: 'Ej: Subir mi promedio y entregar tareas a tiempo.' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (subjectId) {
                const item = fresh.subjects.find(entry => entry.id === subjectId);
                if (item) {
                    const oldName = item.name;
                    item.name = values.name.trim();
                    item.icon = normalizeSubjectIcon(values.icon);
                    item.customIcon = values.customIcon.trim();
                    item.color = values.color || 'Azul';
                    item.description = values.description.trim();
                    item.goal = values.goal.trim();
                    fresh.tasks.forEach(task => {
                        if (task.subject === oldName) task.subject = item.name;
                    });
                    fresh.grades.forEach(grade => {
                        if (grade.subject === oldName) grade.subject = item.name;
                    });
                    fresh.resources.forEach(resource => {
                        if (resource.subject === oldName) resource.subject = item.name;
                    });
                    addRecent(fresh, `Editaste la materia ${item.name}.`);
                }
            } else {
                fresh.subjects.push({
                    id: createId(),
                    name: values.name.trim(),
                    icon: normalizeSubjectIcon(values.icon),
                    customIcon: values.customIcon.trim(),
                    color: values.color || 'Azul',
                    description: values.description.trim(),
                    goal: values.goal.trim(),
                    createdAt: new Date().toISOString()
                });
                addXP(fresh, 30);
                addRecent(fresh, `Creaste la materia ${values.name.trim()}.`);
            }
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(subjectId ? 'Materia actualizada.' : 'Materia creada correctamente.', 'success');
        }
    });
}

function getSubjectMetrics(workspace, subject) {
    const tasks = workspace.tasks.filter(task => task.subject === subject.name);
    const pendingTasks = tasks.filter(task => task.status !== 'completed');
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const grades = workspace.grades.filter(grade => grade.subject === subject.name);
    const resources = workspace.resources.filter(resource => resource.subject === subject.name);
    const subjectKey = normalizeTutorText(subject.name);
    const events = workspace.events.filter(event => normalizeTutorText(`${event.title || ''} ${event.subject || ''}`).includes(subjectKey));
    const progress = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    const average = getSubjectAverage(workspace, subject.name);
    const nextEvent = events[0] || workspace.events.find(event => normalizeTutorText(event.title || '').includes(subjectKey)) || null;
    const recent = (workspace.recent || []).find(item => normalizeTutorText(item.text).includes(subjectKey));

    return {
        tasks,
        pendingTasks,
        completedTasks,
        grades,
        resources,
        events,
        progress,
        average,
        nextEvent,
        recentText: recent ? recent.text : (subject.createdAt ? 'Materia creada por el estudiante.' : 'Sin actividad registrada.')
    };
}

function getSubjectIconMarkup(subject) {
    const custom = String(subject.customIcon || '').trim().slice(0, 4);
    if (custom) {
        return `<span class="subject-icon subject-custom-label" aria-hidden="true">${escapeHTML(custom.toUpperCase())}</span>`;
    }
    return `<span class="subject-icon subject-symbol subject-icon-${escapeHTML(normalizeSubjectIcon(subject.icon))}" aria-hidden="true"></span>`;
}

function ensureSubjectsToolbar(grid) {
    const section = document.getElementById('subjects');
    if (!section || section.querySelector('.subjects-toolbar')) return;
    grid.insertAdjacentHTML('beforebegin', `
        <div class="subjects-toolbar">
            <label class="subjects-search">
                <span>Buscar</span>
                <input type="search" id="subject-search" placeholder="Buscar materia..." value="${escapeHTML(subjectFilterText)}">
            </label>
            <label class="subjects-sort">
                <span>Ordenar por</span>
                <select id="subject-sort">
                    <option value="name" ${subjectSortMode === 'name' ? 'selected' : ''}>Nombre</option>
                    <option value="progress" ${subjectSortMode === 'progress' ? 'selected' : ''}>Progreso</option>
                    <option value="average" ${subjectSortMode === 'average' ? 'selected' : ''}>Mejor promedio</option>
                    <option value="tasks" ${subjectSortMode === 'tasks' ? 'selected' : ''}>Mas tareas</option>
                </select>
            </label>
        </div>
    `);
}

function bindSubjectsToolbar() {
    const search = document.getElementById('subject-search');
    const sort = document.getElementById('subject-sort');
    if (search && !search.dataset.bound) {
        search.dataset.bound = 'true';
        search.addEventListener('input', event => {
            subjectFilterText = event.target.value;
            renderSubjects(loadWorkspace());
        });
    }
    if (sort && !sort.dataset.bound) {
        sort.dataset.bound = 'true';
        sort.addEventListener('change', event => {
            subjectSortMode = event.target.value;
            renderSubjects(loadWorkspace());
        });
    }
}

function sortSubjectsForView(subjects, workspace) {
    return [...subjects].sort((a, b) => {
        const metricsA = getSubjectMetrics(workspace, a);
        const metricsB = getSubjectMetrics(workspace, b);
        if (subjectSortMode === 'progress') return metricsB.progress - metricsA.progress;
        if (subjectSortMode === 'average') return metricsB.average - metricsA.average;
        if (subjectSortMode === 'tasks') return metricsB.tasks.length - metricsA.tasks.length;
        return a.name.localeCompare(b.name);
    });
}

function renderSubjects(workspace) {
    const grid = document.querySelector('.subjects-grid');
    if (!grid) return;
    ensureSubjectsToolbar(grid);
    const filteredSubjects = sortSubjectsForView(workspace.subjects.filter(subject => normalizeTutorText(subject.name).includes(normalizeTutorText(subjectFilterText))), workspace);

    grid.innerHTML = workspace.subjects.length ? (filteredSubjects.length ? filteredSubjects.map(subject => {
        const metrics = getSubjectMetrics(workspace, subject);
        const color = subjectColorMap[subject.color] || subjectColorMap.Morado;
        return `
            <div class="subject-card subject-custom ac-colored-card subject-space-card" style="--subject-color:${color}">
                <div class="subject-orbit" aria-hidden="true"></div>
                <div class="subject-header">
                    <div class="subject-title">
                        ${getSubjectIconMarkup(subject)}
                        <div>
                            <h3>${escapeHTML(subject.name)}</h3>
                            <p>${escapeHTML(subject.description || 'Espacio academico personalizado')}</p>
                        </div>
                    </div>
                    <span class="subject-chip">${escapeHTML(subject.color || 'Morado')}</span>
                </div>
                <div class="subject-progress-block">
                    <div><span>Progreso</span><strong>${metrics.progress}%</strong></div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${metrics.progress}%; background:linear-gradient(90deg, ${color}, #49ccf9)"></div></div>
                </div>
                <div class="subject-metric-grid">
                    <div><span>Pendientes</span><strong>${metrics.pendingTasks.length}</strong></div>
                    <div><span>Completadas</span><strong>${metrics.completedTasks.length}</strong></div>
                    <div><span>Promedio</span><strong>${metrics.average ? metrics.average.toFixed(2) : '--'}</strong></div>
                    <div><span>Apuntes</span><strong>${metrics.resources.length}</strong></div>
                </div>
                <div class="subject-card-footer">
                    <p><strong>Proxima entrega:</strong> ${metrics.nextEvent ? escapeHTML(`${metrics.nextEvent.title} - ${metrics.nextEvent.date || metrics.nextEvent.day || 'Sin fecha'}`) : 'Sin entregas programadas'}</p>
                    <p><strong>Ultima actividad:</strong> ${escapeHTML(metrics.recentText)}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-primary btn-small" data-subject-open="${escapeHTML(subject.id)}">Abrir materia</button>
                    <button class="btn-secondary btn-small" data-subject-edit="${escapeHTML(subject.id)}">Editar</button>
                    <button class="btn-danger btn-small" data-subject-delete="${escapeHTML(subject.id)}">Eliminar</button>
                </div>
            </div>
        `;
    }).join('') : emptyStateHTML('No se encontraron materias con esa busqueda.', 'Limpiar busqueda', "clearSubjectSearch()")) : emptyStateHTML('No tienes materias todavia. Organiza tu aprendizaje creando tu primera materia.', '+ Crear materia', 'addSubjectUI()');

    bindSubjectsToolbar();
    grid.querySelectorAll('[data-subject-open]').forEach(button => button.addEventListener('click', () => openSubjectDetails(button.dataset.subjectOpen)));
    grid.querySelectorAll('[data-subject-edit]').forEach(button => button.addEventListener('click', () => openSubjectForm(button.dataset.subjectEdit)));
    grid.querySelectorAll('[data-subject-delete]').forEach(button => button.addEventListener('click', () => deleteSubject(button.dataset.subjectDelete)));
}

function clearSubjectSearch() {
    subjectFilterText = '';
    const search = document.getElementById('subject-search');
    if (search) search.value = '';
    renderSubjects(loadWorkspace());
}

function openSubjectDetails(subjectId) {
    const workspace = loadWorkspace();
    const subject = workspace.subjects.find(item => item.id === subjectId);
    if (!subject) return;
    const metrics = getSubjectMetrics(workspace, subject);
    const color = subjectColorMap[subject.color] || subjectColorMap.Morado;
    const modal = document.createElement('div');
    modal.className = 'quick-modal subject-detail-modal';
    modal.innerHTML = `
        <div class="quick-modal-card subject-detail-card" style="--subject-color:${color}" role="dialog" aria-modal="true" aria-label="Detalle de ${escapeHTML(subject.name)}">
            <button class="quick-modal-close" type="button" aria-label="Cerrar">x</button>
            <div class="subject-detail-hero">
                ${getSubjectIconMarkup(subject)}
                <div>
                    <span class="subject-chip">${escapeHTML(subject.color || 'Morado')}</span>
                    <h3>${escapeHTML(subject.name)}</h3>
                    <p>${escapeHTML(subject.goal || subject.description || 'Espacio de estudio de la materia.')}</p>
                </div>
            </div>
            <div class="subject-detail-stats">
                <div><span>Progreso</span><strong>${metrics.progress}%</strong></div>
                <div><span>Pendientes</span><strong>${metrics.pendingTasks.length}</strong></div>
                <div><span>Completadas</span><strong>${metrics.completedTasks.length}</strong></div>
                <div><span>Promedio</span><strong>${metrics.average ? metrics.average.toFixed(2) : '--'}</strong></div>
            </div>
            <div class="subject-detail-columns">
                <section>
                    <h4>Tareas</h4>
                    ${metrics.tasks.length ? metrics.tasks.slice(0, 5).map(task => `<p><strong>${escapeHTML(task.title)}</strong><span>${escapeHTML(getTaskStatusLabel(task.status))} - ${escapeHTML(task.due || 'Sin fecha')}</span></p>`).join('') : '<p class="muted-panel">Sin tareas relacionadas.</p>'}
                </section>
                <section>
                    <h4>Calificaciones</h4>
                    ${metrics.grades.length ? metrics.grades.slice(0, 5).map(grade => `<p><strong>${escapeHTML(grade.activity || 'Actividad')}</strong><span>${escapeHTML(String(grade.value || '--'))}</span></p>`).join('') : '<p class="muted-panel">Sin calificaciones registradas.</p>'}
                </section>
                <section>
                    <h4>Mochila</h4>
                    ${metrics.resources.length ? metrics.resources.slice(0, 5).map(resource => `<p><strong>${escapeHTML(resource.title)}</strong><span>${escapeHTML(resource.fileName || 'PDF simulado')}</span></p>`).join('') : '<p class="muted-panel">Sin apuntes de esta materia.</p>'}
                </section>
                <section>
                    <h4>Actividad</h4>
                    <p><strong>Ultimo movimiento</strong><span>${escapeHTML(metrics.recentText)}</span></p>
                    <p><strong>Proximo evento</strong><span>${metrics.nextEvent ? escapeHTML(metrics.nextEvent.title) : 'Sin eventos programados'}</span></p>
                </section>
            </div>
        </div>
    `;
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.classList.contains('quick-modal-close')) modal.remove();
    });
    document.body.appendChild(modal);
}

function renderBackpack(workspace) {
    const section = document.getElementById('backpack');
    const container = document.querySelector('.backpack-container');
    if (!section || !container) return;

    const header = section.querySelector('.section-header');
    if (header && !header.querySelector('[data-action="add-resource"]')) {
        header.insertAdjacentHTML('beforeend', '<button class="btn-primary btn-small" data-action="add-resource" onclick="addResourceUI()">+ Subir PDF simulado</button>');
    }

    container.innerHTML = workspace.resources.length ? workspace.resources.map(resource => {
        const description = resource.description || resource.content || 'Sin descripcion';
        const shortDescription = description.length > 130 ? `${description.slice(0, 130)}...` : description;
        return `
            <div class="resource-card">
                <div class="resource-top">
                    <div class="resource-icon resource-pdf-icon" aria-hidden="true"></div>
                    <div class="resource-info">
                        <h4>${escapeHTML(resource.title)}</h4>
                        <p class="resource-type">${escapeHTML(resource.subject)} - ${escapeHTML(resource.fileName || 'PDF simulado')}</p>
                    </div>
                </div>
                <p class="resource-date">${escapeHTML(shortDescription)}</p>
                <div class="resource-actions">
                    <button class="btn-secondary btn-small" data-resource-view="${escapeHTML(resource.id)}">Ver</button>
                    <button class="btn-secondary btn-small" data-resource-ai="${escapeHTML(resource.id)}">Preguntar a la IA</button>
                    <button class="btn-secondary btn-small" data-resource-practice="${escapeHTML(resource.id)}">Practicar con PDF</button>
                    <button class="btn-secondary btn-small" data-resource-edit="${escapeHTML(resource.id)}">Editar</button>
                    <button class="btn-danger btn-small" data-resource-delete="${escapeHTML(resource.id)}">Eliminar</button>
                </div>
            </div>
        `;
    }).join('') : emptyStateHTML('No has subido apuntes todavia.', 'Subir primer PDF', 'addResourceUI()');

    container.querySelectorAll('[data-resource-view]').forEach(button => button.addEventListener('click', () => viewResource(button.dataset.resourceView)));
    container.querySelectorAll('[data-resource-ai]').forEach(button => button.addEventListener('click', () => askAIAboutResource(button.dataset.resourceAi)));
    container.querySelectorAll('[data-resource-practice]').forEach(button => button.addEventListener('click', () => practiceWithResource(button.dataset.resourcePractice)));
    container.querySelectorAll('[data-resource-edit]').forEach(button => button.addEventListener('click', () => openResourceForm(button.dataset.resourceEdit)));
    container.querySelectorAll('[data-resource-delete]').forEach(button => button.addEventListener('click', () => deleteResource(button.dataset.resourceDelete)));
}

function renderProgress(workspace) {
    const container = document.querySelector('.progress-container');
    if (!container) return;

    const xp = workspace.xp || 0;
    const level = getLevel(xp);
    const xpPerLevel = 250;
    const xpCurrent = xp % xpPerLevel;
    const xpToNext = xpPerLevel - xpCurrent;
    const xpProgress = Math.min(100, (xpCurrent / xpPerLevel) * 100);
    const completedTasks = workspace.tasks.filter(task => task.status === 'completed').length;
    const attendancePositive = workspace.attendance.filter(item => isAttendancePositive(item.status)).length;
    const achievements = [
        { name: 'Primera materia', detail: 'Crea tu primera clase', icon: 'subject', unlocked: workspace.subjects.length > 0 },
        { name: 'Primera tarea', detail: 'Agrega un pendiente', icon: 'task', unlocked: workspace.tasks.length > 0 },
        { name: 'Tarea completada', detail: 'Marca una tarea como lista', icon: 'done', unlocked: completedTasks > 0 },
        { name: 'Primer apunte', detail: 'Sube un PDF o recurso', icon: 'note', unlocked: workspace.resources.length > 0 },
        { name: 'Uso de Tutor', detail: 'Pregunta con un apunte', icon: 'ai', unlocked: workspace.resources.some(resource => resource.usedAI) },
        { name: '7 dias de racha', detail: 'Mantente constante', icon: 'streak', unlocked: (workspace.streak || 0) >= 7 },
        { name: 'Nivel 5 alcanzado', detail: 'Acumula suficiente XP', icon: 'level', unlocked: level >= 5 },
        { name: 'Estudiante constante', detail: 'Registra asistencia', icon: 'attendance', unlocked: attendancePositive >= 5 }
    ];
    const unlocked = achievements.filter(item => item.unlocked).length;
    const pathLevels = [1, 2, 3, 4, 5];

    container.innerHTML = `
        <div class="progress-hero premium-border">
            <div class="progress-hero-copy">
                <span class="progress-eyebrow">Camino academico</span>
                <h2>Nivel ${level}</h2>
                <p>${xp ? 'Estas cerca del siguiente nivel.' : 'Completa actividades para desbloquear logros.'}</p>
                <div class="progress-xp-meta">
                    <span>${xp} XP acumulado</span>
                    <span>${xpToNext} XP para nivel ${level + 1}</span>
                </div>
                <div class="xp-bar progress-xp-bar" aria-label="Progreso de XP">
                    <div class="xp-fill" style="width:${xpProgress}%"></div>
                </div>
                <small>${xpCurrent}/${xpPerLevel} XP en este nivel</small>
            </div>
            <div class="progress-level-orb" style="--xp:${xpProgress}%">
                <strong>${level}</strong>
                <span>Nivel actual</span>
            </div>
        </div>

        <div class="progress-stat-grid">
            ${progressStatCard('streak', 'Racha actual', `${workspace.streak || 0}`, 'dias activos')}
            ${progressStatCard('trophy', 'Logros desbloqueados', `${unlocked}/${achievements.length}`, 'insignias premium')}
            ${progressStatCard('status', 'Estado', xp ? 'En progreso' : 'Inicial', xp ? 'sigue avanzando' : 'empieza desde cero')}
            ${progressStatCard('activity', 'Actividad academica', workspace.subjects.length + workspace.tasks.length + workspace.resources.length, 'acciones registradas')}
            ${progressStatCard('tasks', 'Tareas completadas', completedTasks, 'retos terminados')}
        </div>

        <section class="progress-path premium-border">
            <div class="progress-section-title">
                <h3>Camino del estudiante</h3>
                <p>Avanza por niveles mientras usas AC Edunity.</p>
            </div>
            <div class="student-path">
                ${pathLevels.map(pathLevel => `
                    <div class="path-step ${level >= pathLevel ? 'active' : ''} ${level === pathLevel ? 'current' : ''}">
                        <span>${pathLevel}</span>
                        <small>Nivel ${pathLevel}</small>
                    </div>
                `).join('')}
            </div>
        </section>

        ${xp ? '' : `
            <div class="progress-empty-callout premium-border">
                <strong>Completa actividades para desbloquear logros.</strong>
                <span>Crea materias, termina tareas, sube apuntes, usa Tutor y registra asistencia.</span>
            </div>
        `}

        <section class="achievements-section progress-achievements premium-border">
            <div class="progress-section-title">
                <h3>Logros desbloqueados</h3>
                <p>Insignias que reflejan tu avance real dentro de la plataforma.</p>
            </div>
            <div class="achievements-grid premium-achievements-grid">
                ${achievements.map(item => `
                    <div class="achievement premium-achievement ${item.unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon achievement-${escapeHTML(item.icon)}" aria-hidden="true"></div>
                        <p>${escapeHTML(item.name)}</p>
                        <small>${item.unlocked ? escapeHTML(item.detail) : 'Bloqueado'}</small>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function progressStatCard(type, label, value, detail) {
    return `
        <div class="progress-stat premium-progress-stat stat-${escapeHTML(type)} premium-border">
            <span class="progress-stat-icon" aria-hidden="true"></span>
            <div>
                <span class="stat-label">${escapeHTML(label)}</span>
                <span class="stat-value">${escapeHTML(value)}</span>
                <small>${escapeHTML(detail)}</small>
            </div>
        </div>
    `;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.name) {
            resolve('');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function openResourceForm(resourceId = null) {
    const workspace = loadWorkspace();
    const resource = workspace.resources.find(item => item.id === resourceId);
    openQuickForm({
        title: resource ? 'Editar recurso' : 'Subir PDF',
        submitLabel: resource ? 'Actualizar recurso' : 'Guardar recurso',
        fields: [
            { name: 'title', label: 'Titulo del recurso', value: resource?.title || '', placeholder: 'Ej: Guia de estudio' },
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: resource?.subject || '' },
            { name: 'file', label: 'Archivo PDF', type: 'file', accept: '.pdf,application/pdf', required: !resource },
            { name: 'description', label: 'Descripcion corta', type: 'textarea', value: resource?.description || resource?.content || '', placeholder: 'Describe de que trata el PDF' },
            { name: 'tag', label: 'Etiqueta', type: 'select', options: ['Apunte', 'Guia', 'Informe', 'Proyecto', 'Tarea'], value: resource?.tag || 'Apunte' },
            { name: 'useWithTutor', label: 'Tutor', type: 'checkbox', checked: resource?.useWithTutor !== false, help: 'Usar con Tutor' }
        ],
        onSubmit: async values => {
            const fresh = loadWorkspace();
            const uploadedFile = values.file && values.file.name ? values.file : null;
            const fileName = uploadedFile?.name || resource?.fileName || `${values.title.trim()}.pdf`;
            let fileDataUrl = resource?.fileDataUrl || '';

            try {
                // Futuro: reemplazar este DataURL local por subida a Google Drive o Supabase Storage.
                if (uploadedFile) fileDataUrl = await readFileAsDataUrl(uploadedFile);
            } catch (error) {
                notify('No se pudo leer el PDF. Intenta subirlo otra vez.', 'error');
                return;
            }

            const payload = {
                title: values.title.trim(),
                subject: values.subject,
                fileName,
                fileDataUrl,
                fileMime: uploadedFile?.type || resource?.fileMime || 'application/pdf',
                description: values.description.trim(),
                content: values.description.trim(),
                type: 'PDF',
                tag: values.tag || 'Apunte',
                useWithTutor: values.useWithTutor === 'yes',
                uploadedAt: resource?.uploadedAt || new Date().toISOString()
            };

            try {
                if (resourceId) {
                    const item = fresh.resources.find(entry => entry.id === resourceId);
                    if (item) Object.assign(item, payload);
                    addRecent(fresh, `Editaste el recurso ${payload.title}.`);
                } else {
                    fresh.resources.push({ id: createId(), usedAI: false, ...payload });
                    addXP(fresh, 20);
                    addRecent(fresh, `Subiste el PDF ${payload.title}.`);
                }
                saveWorkspace(fresh);
            } catch (error) {
                notify('El PDF es muy pesado para guardarlo en este prototipo. Prueba con un archivo mas pequeno.', 'error');
                return;
            }

            refreshWorkspaceUI();
            notify(resourceId ? 'Recurso actualizado.' : 'PDF guardado correctamente.', 'success');
        }
    });
}

function getResourceSubject(workspace, resource) {
    return workspace.subjects.find(subject => subject.name === resource.subject) || null;
}

function getResourceColor(workspace, resource) {
    const subject = getResourceSubject(workspace, resource);
    return subjectColorMap[subject?.color] || subjectColorMap[resource.color] || '#49ccf9';
}

function formatResourceDate(dateValue) {
    if (!dateValue) return 'Sin fecha';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRelativeResourceDate(dateValue) {
    if (!dateValue) return 'Recien agregado';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Recien agregado';
    const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 dia';
    return `Hace ${diffDays} dias`;
}

function getResourceStatus(resource) {
    if (resource.usedAI) return { label: 'Usado con Tutor', className: 'used' };
    const uploaded = new Date(resource.uploadedAt || 0).getTime();
    if (uploaded && Date.now() - uploaded < 3 * 86400000) return { label: 'Nuevo', className: 'new' };
    return { label: 'Pendiente de repasar', className: 'pending' };
}

function ensureBackpackToolbar(section, workspace) {
    if (!section || section.querySelector('.backpack-toolbar')) return;
    const header = section.querySelector('.section-header');
    if (!header) return;

    const subjectOptions = ['<option value="all">Todas las materias</option>']
        .concat(workspace.subjects.map(subject => `<option value="${escapeHTML(subject.name)}">${escapeHTML(subject.name)}</option>`))
        .join('');

    header.insertAdjacentHTML('afterend', `
        <div class="backpack-toolbar">
            <label class="backpack-search">
                <span>Buscar recurso</span>
                <input type="search" id="backpack-search" placeholder="Buscar PDF, apunte o proyecto..." value="${escapeHTML(backpackFilterText)}">
            </label>
            <label>
                <span>Materia</span>
                <select id="backpack-subject-filter">${subjectOptions}</select>
            </label>
            <label>
                <span>Tipo</span>
                <select id="backpack-type-filter">
                    <option value="all">PDF / Apunte / Guia / Proyecto</option>
                    <option value="PDF">PDF</option>
                    <option value="Apunte">Apunte</option>
                    <option value="Guia">Guia</option>
                    <option value="Informe">Informe</option>
                    <option value="Proyecto">Proyecto</option>
                    <option value="Tarea">Tarea</option>
                </select>
            </label>
            <label>
                <span>Ordenar</span>
                <select id="backpack-sort">
                    <option value="recent">Mas reciente</option>
                    <option value="oldest">Mas antiguo</option>
                    <option value="subject">Materia</option>
                    <option value="title">Titulo</option>
                </select>
            </label>
            <button class="btn-primary btn-small" type="button" onclick="addResourceUI()">+ Subir PDF</button>
        </div>
    `);
}

function bindBackpackToolbar() {
    const search = document.getElementById('backpack-search');
    const subject = document.getElementById('backpack-subject-filter');
    const type = document.getElementById('backpack-type-filter');
    const sort = document.getElementById('backpack-sort');

    if (subject) subject.value = backpackSubjectFilter;
    if (type) type.value = backpackTypeFilter;
    if (sort) sort.value = backpackSortMode;

    if (search && !search.dataset.bound) {
        search.dataset.bound = 'true';
        search.addEventListener('input', event => {
            backpackFilterText = event.target.value;
            renderBackpack(loadWorkspace());
        });
    }
    if (subject && !subject.dataset.bound) {
        subject.dataset.bound = 'true';
        subject.addEventListener('change', event => {
            backpackSubjectFilter = event.target.value;
            renderBackpack(loadWorkspace());
        });
    }
    if (type && !type.dataset.bound) {
        type.dataset.bound = 'true';
        type.addEventListener('change', event => {
            backpackTypeFilter = event.target.value;
            renderBackpack(loadWorkspace());
        });
    }
    if (sort && !sort.dataset.bound) {
        sort.dataset.bound = 'true';
        sort.addEventListener('change', event => {
            backpackSortMode = event.target.value;
            renderBackpack(loadWorkspace());
        });
    }
}

function getBackpackResourcesForView(workspace) {
    const query = normalizeTutorText(backpackFilterText);
    return [...workspace.resources]
        .filter(resource => {
            const haystack = normalizeTutorText(`${resource.title || ''} ${resource.subject || ''} ${resource.fileName || ''} ${resource.description || ''} ${resource.tag || ''}`);
            const type = resource.tag || resource.type || 'PDF';
            const matchesSearch = !query || haystack.includes(query);
            const matchesSubject = backpackSubjectFilter === 'all' || resource.subject === backpackSubjectFilter;
            const matchesType = backpackTypeFilter === 'all' || resource.type === backpackTypeFilter || type === backpackTypeFilter;
            return matchesSearch && matchesSubject && matchesType;
        })
        .sort((a, b) => {
            if (backpackSortMode === 'oldest') return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
            if (backpackSortMode === 'subject') return String(a.subject || '').localeCompare(String(b.subject || ''));
            if (backpackSortMode === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
            return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        });
}

function renderBackpack(workspace) {
    const section = document.getElementById('backpack');
    const container = document.querySelector('.backpack-container');
    if (!section || !container) return;

    const header = section.querySelector('.section-header');
    if (header) {
        header.innerHTML = `
            <div>
                <h1>Mochila Digital</h1>
                <p class="subtitle">Biblioteca digital conectada con tus materias y Tutor.</p>
            </div>
        `;
    }
    section.querySelector('.backpack-toolbar')?.remove();
    ensureBackpackToolbar(section, workspace);
    bindBackpackToolbar();

    const resources = getBackpackResourcesForView(workspace);
    container.innerHTML = workspace.resources.length ? (resources.length ? resources.map(resource => {
        const description = resource.description || resource.content || 'Sin descripcion';
        const shortDescription = description.length > 120 ? `${description.slice(0, 120)}...` : description;
        const color = getResourceColor(workspace, resource);
        const status = getResourceStatus(resource);
        const uploadedAt = resource.uploadedAt || resource.createdAt || new Date().toISOString();
        return `
            <article class="resource-card library-resource-card" style="--resource-color:${escapeHTML(color)}">
                <div class="resource-top">
                    <div class="resource-icon resource-pdf-icon" aria-hidden="true"></div>
                    <div class="resource-info">
                        <h4>${escapeHTML(resource.title)}</h4>
                        <p class="resource-type">${escapeHTML(resource.subject || 'General')} - ${escapeHTML(resource.fileName || 'PDF')}</p>
                    </div>
                </div>
                <div class="resource-meta-row">
                    <span class="resource-subject-chip">${escapeHTML(resource.subject || 'General')}</span>
                    <span class="resource-status ${escapeHTML(status.className)}">${escapeHTML(status.label)}</span>
                </div>
                <p class="resource-description">${escapeHTML(shortDescription)}</p>
                <div class="resource-data">
                    <span>${escapeHTML(resource.tag || resource.type || 'PDF')}</span>
                    <span>Subido el: ${escapeHTML(formatResourceDate(uploadedAt))}</span>
                    <span>${escapeHTML(getRelativeResourceDate(uploadedAt))}</span>
                </div>
                <div class="resource-actions">
                    <button class="btn-secondary btn-small" data-resource-view="${escapeHTML(resource.id)}">Ver</button>
                    <button class="btn-secondary btn-small" data-resource-ai="${escapeHTML(resource.id)}">Preguntar a Tutor</button>
                    <button class="btn-secondary btn-small" data-resource-edit="${escapeHTML(resource.id)}">Editar</button>
                    <button class="btn-danger btn-small" data-resource-delete="${escapeHTML(resource.id)}">Eliminar</button>
                </div>
            </article>
        `;
    }).join('') : emptyStateHTML('No encontramos recursos con esos filtros.', 'Limpiar busqueda', 'resetBackpackFilters()')) : emptyStateHTML('No tienes apuntes todavia 🎒', 'Subir primer PDF', 'addResourceUI()');

    container.querySelectorAll('[data-resource-view]').forEach(button => button.addEventListener('click', () => viewResource(button.dataset.resourceView)));
    container.querySelectorAll('[data-resource-ai]').forEach(button => button.addEventListener('click', () => askAIAboutResource(button.dataset.resourceAi)));
    container.querySelectorAll('[data-resource-edit]').forEach(button => button.addEventListener('click', () => openResourceForm(button.dataset.resourceEdit)));
    container.querySelectorAll('[data-resource-delete]').forEach(button => button.addEventListener('click', () => deleteResource(button.dataset.resourceDelete)));
}

function resetBackpackFilters() {
    backpackFilterText = '';
    backpackSubjectFilter = 'all';
    backpackTypeFilter = 'all';
    backpackSortMode = 'recent';
    renderBackpack(loadWorkspace());
}

function viewResource(resourceId) {
    const resource = loadWorkspace().resources.find(item => item.id === resourceId);
    if (!resource) return;

    if (resource.fileDataUrl) {
        openPdfResource(resource, 'Abriste un PDF desde Mochila Digital.');
        return;
    }

    showAIResult(`Vista del recurso: ${resource.title}`, `Materia: ${resource.subject || 'General'}\nArchivo: ${resource.fileName || 'PDF'}\nTipo: ${resource.tag || resource.type || 'PDF'}\n\nDescripcion:\n${resource.description || resource.content || 'Sin descripcion'}\n\nCuando conectes Google Drive o Supabase Storage, esta vista podra abrir el archivo real desde la nube.`);
}

function createPdfObjectUrl(dataUrl, fallbackMime = 'application/pdf') {
    const [header, data] = String(dataUrl || '').split(',');
    if (!header || !data) throw new Error('Invalid PDF data URL');

    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const binary = atob(data);
    const bytes = [];

    for (let index = 0; index < binary.length; index += 1024) {
        const slice = binary.slice(index, index + 1024);
        const numbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i += 1) {
            numbers[i] = slice.charCodeAt(i);
        }
        bytes.push(new Uint8Array(numbers));
    }

    return URL.createObjectURL(new Blob(bytes, { type: mime || fallbackMime }));
}

function openPdfResource(resource, recentText = 'Abriste un PDF desde Mochila Digital.') {
    if (!resource.fileDataUrl) {
        notify('Este recurso no tiene el archivo PDF guardado. Editalo y vuelve a subir el PDF.', 'error');
        return false;
    }

    let pdfUrl = '';
    try {
        pdfUrl = createPdfObjectUrl(resource.fileDataUrl, resource.fileMime || 'application/pdf');
    } catch (error) {
        notify('No se pudo preparar el PDF. Vuelve a subir el archivo.', 'error');
        return false;
    }

    const tab = window.open('', '_blank');
    if (tab) {
        tab.document.title = resource.fileName || resource.title || 'PDF';
        tab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 24px;">Abriendo PDF...</p>';
        tab.location.href = pdfUrl;
        markResourceAIUsed(resource.id, recentText);
        notify('PDF abierto en una nueva pestana.', 'success');
        return true;
    }

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
    markResourceAIUsed(resource.id, recentText);
    notify('PDF abierto. Si no aparece, permite ventanas emergentes para esta pagina.', 'info');
    return true;
}

function askAIAboutResource(resourceId) {
    const resource = loadWorkspace().resources.find(item => item.id === resourceId);
    if (!resource) return;

    const updated = markResourceAIUsed(resourceId, `Preguntaste a Tutor sobre ${resource.title}.`) || resource;
    // Futuro: enviar el archivo y su metadata a una API real de IA para leer el PDF completo.
    setAIContextFromResource(updated);
    navigateTo('ai-assistant');
    appendTutorMessage('bot', `Vamos a estudiar tu PDF de ${updated.subject || 'General'}: ${updated.title}.\n\nPuedes pedirme un resumen, una explicacion sencilla, preguntas abiertas, verdadero/falso, flashcards o un cuestionario.`, 'Tutor');
    notify('PDF cargado en Tutor.', 'success');
}

function practiceWithResource(resourceId) {
    const resource = loadWorkspace().resources.find(item => item.id === resourceId);
    if (!resource) return;

    const updated = markResourceAIUsed(resourceId, `Iniciaste practica con ${resource.title}.`) || resource;
    setAIContextFromResource(updated);
    navigateTo('ai-assistant');
    appendTutorMessage('bot', `Vamos a practicar con tu PDF de ${updated.subject || 'General'}: ${updated.title}.\n\nElige que quieres generar:\n1. Resumen\n2. Preguntas abiertas\n3. Verdadero/falso\n4. Flashcards\n5. Cuestionario\n\nTambien puedes escribir tu propia duda sobre este PDF.`, 'Tutor');
    notify('PDF listo para practicar con Tutor.', 'success');
}

function getDisplayStreak(workspace) {
    return currentUser?.email ? Math.max(1, Number(workspace.streak || 0)) : 0;
}

function getCurrentUserProfile() {
    const users = getUsers();
    const stored = currentUser?.email ? users[currentUser.email] || {} : {};
    return {
        name: currentUser?.name || stored.name || 'Estudiante AC',
        role: stored.role || currentUser?.role || 'Estudiante',
        career: stored.career || currentUser?.career || '',
        bio: stored.bio || currentUser?.bio || '',
        interests: stored.interests || currentUser?.interests || '',
        avatarStyle: stored.avatarStyle || currentUser?.avatarStyle || 'initials',
        avatarText: stored.avatarText || currentUser?.avatarText || '',
        createdAt: stored.createdAt || currentUser?.createdAt || '',
        goals: Array.isArray(stored.goals) ? stored.goals : []
    };
}

function saveCurrentUserProfile(profileUpdates) {
    if (!currentUser?.email) return;
    const users = getUsers();
    const previous = users[currentUser.email] || {};
    users[currentUser.email] = { ...previous, ...profileUpdates };
    saveUsers(users);
    currentUser = getPublicUser(currentUser.email, users[currentUser.email]);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function getProfileInitials(name) {
    return String(name || 'AC')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join('') || 'AC';
}

function getProfileAvatarContent(profile) {
    if (profile.avatarStyle === 'photo' && profile.avatarText.trim()) {
        return `<img src="${escapeHTML(profile.avatarText.trim())}" alt="Foto de perfil">`;
    }
    if (profile.avatarStyle === 'custom' && profile.avatarText.trim()) return escapeHTML(profile.avatarText.trim().slice(0, 4));
    if (profile.avatarStyle === 'rocket') return '🚀';
    if (profile.avatarStyle === 'book') return '📚';
    if (profile.avatarStyle === 'code') return '💻';
    if (profile.avatarStyle === 'star') return '⭐';
    return escapeHTML(getProfileInitials(profile.name));
}

function getProfileAchievements(workspace) {
    const completedTasks = workspace.tasks.filter(task => task.status === 'completed').length;
    const level = getLevel(workspace.xp);
    return [
        { name: 'Primera materia', icon: '📚', unlocked: workspace.subjects.length > 0 },
        { name: 'Primera racha', icon: '🔥', unlocked: getDisplayStreak(workspace) > 0 },
        { name: 'Uso de Tutor', icon: '🤖', unlocked: workspace.resources.some(resource => resource.usedAI) },
        { name: 'Primer PDF', icon: '📂', unlocked: workspace.resources.length > 0 },
        { name: 'Buen promedio', icon: '⭐', unlocked: getAverageGrade(workspace) >= 8 },
        { name: 'Tarea completada', icon: '✅', unlocked: completedTasks > 0 },
        { name: 'Nivel 5', icon: '🏆', unlocked: level >= 5 }
    ];
}

function openProfileForm() {
    const profile = getCurrentUserProfile();
    openQuickForm({
        title: 'Editar perfil',
        submitLabel: 'Guardar perfil',
        fields: [
            { name: 'name', label: 'Nombre', value: profile.name, placeholder: 'Tu nombre' },
            { name: 'career', label: 'Carrera o area de estudio', value: profile.career, placeholder: 'Ej: Informatica' },
            { name: 'bio', label: 'Descripcion personal', type: 'textarea', rows: 3, value: profile.bio, placeholder: 'Ej: Construyendo mi camino de aprendizaje.' },
            { name: 'interests', label: 'Intereses', value: profile.interests, placeholder: 'Ej: IA educativa, programacion, robotica' },
            { name: 'avatarStyle', label: 'Avatar', type: 'select', options: [
                { value: 'initials', label: 'Iniciales' },
                { value: 'rocket', label: 'Cohete' },
                { value: 'book', label: 'Libros' },
                { value: 'code', label: 'Programacion' },
                { value: 'star', label: 'Estrella' },
                { value: 'photo', label: 'URL de foto' },
                { value: 'custom', label: 'Texto o emoji propio' }
            ], value: profile.avatarStyle },
            { name: 'avatarText', label: 'Foto o avatar personalizado', value: profile.avatarText, required: false, placeholder: 'Ej: AC, 🚀 o https://...' }
        ],
        onSubmit: values => {
            saveCurrentUserProfile({
                name: values.name.trim(),
                career: values.career.trim(),
                bio: values.bio.trim(),
                interests: values.interests.trim(),
                avatarStyle: values.avatarStyle || 'initials',
                avatarText: values.avatarText.trim()
            });
            refreshWorkspaceUI();
            notify('Perfil actualizado.', 'success');
        }
    });
}

function openAvatarForm() {
    openProfileForm();
}

function openGoalForm() {
    openQuickForm({
        title: 'Agregar meta',
        submitLabel: 'Guardar meta',
        fields: [
            { name: 'goal', label: 'Nueva meta personal', placeholder: 'Ej: Estudiar 30 minutos diarios' }
        ],
        onSubmit: values => {
            const profile = getCurrentUserProfile();
            const text = values.goal.trim();
            if (!text) return;
            saveCurrentUserProfile({
                goals: [{ id: createId(), text, done: false }, ...profile.goals].slice(0, 6)
            });
            refreshWorkspaceUI();
            notify('Meta agregada.', 'success');
        }
    });
}

function toggleProfileGoal(goalId) {
    const profile = getCurrentUserProfile();
    saveCurrentUserProfile({
        goals: profile.goals.map(goal => goal.id === goalId ? { ...goal, done: !goal.done } : goal)
    });
    renderProfile(loadWorkspace());
}

function renderProfile(workspace) {
    const profileLayout = document.querySelector('#profile .profile-layout');
    if (!profileLayout) return;

    const profile = getCurrentUserProfile();
    const name = profile.name || 'Estudiante AC';
    const level = getLevel(workspace.xp);
    const average = getAverageGrade(workspace);
    const streak = getDisplayStreak(workspace);
    const completedTasks = workspace.tasks.filter(task => task.status === 'completed').length;
    const achievements = getProfileAchievements(workspace);
    const unlockedAchievements = achievements.filter(item => item.unlocked).length;
    const xp = workspace.xp || 0;
    const xpPerLevel = 250;
    const xpCurrent = xp % xpPerLevel;
    const xpToNext = xpPerLevel - xpCurrent;
    const xpProgress = Math.min(100, (xpCurrent / xpPerLevel) * 100);
    const goals = profile.goals.length ? profile.goals : [
        { id: 'default-weekly', text: 'Completar tareas semanales', done: completedTasks > 0 },
        { id: 'default-average', text: 'Mejorar promedio', done: average >= 8 },
        { id: 'default-streak', text: 'Mantener racha de estudio', done: streak > 1 }
    ];
    const recentItems = (workspace.recent || []).slice(0, 5);
    const interests = String(profile.interests || 'Organizacion academica, IA educativa, Productividad')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 4);

    profileLayout.innerHTML = `
        <section class="profile-hero premium-profile-card">
            <div class="profile-avatar-zone">
                <div class="profile-avatar profile-avatar-premium">${getProfileAvatarContent(profile)}</div>
                <button class="btn-secondary btn-small" type="button" onclick="openAvatarForm()">Cambiar avatar</button>
            </div>
            <div class="profile-details profile-details-premium">
                <span class="profile-role">${escapeHTML(profile.role || 'Estudiante')}</span>
                <h2 id="profile-name">${escapeHTML(name)}</h2>
                <p class="profile-career">${escapeHTML(profile.career || 'Personaliza tu carrera o area de estudio')}</p>
                <p>${escapeHTML(profile.bio || 'Personaliza tu perfil para empezar.')}</p>
                <div class="profile-tags">
                    ${interests.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}
                </div>
                <button class="btn-primary btn-small" type="button" onclick="openProfileForm()">Editar perfil</button>
            </div>
        </section>

        <section class="profile-stats-grid">
            ${profileStatCard('⭐', 'Nivel actual', level, 'avance academico')}
            ${profileStatCard('🔥', 'Racha', `${streak} ${streak === 1 ? 'dia' : 'dias'}`, 'constancia')}
            ${profileStatCard('⚡', 'XP acumulado', xp, 'experiencia')}
            ${profileStatCard('🏆', 'Logros', `${unlockedAchievements}/${achievements.length}`, 'insignias')}
            ${profileStatCard('📚', 'Materias', workspace.subjects.length, 'creadas')}
            ${profileStatCard('📝', 'Tareas', completedTasks, 'completadas')}
            ${profileStatCard('📂', 'PDFs', workspace.resources.length, 'subidos')}
        </section>

        <section class="profile-progress-card premium-profile-card">
            <div>
                <span class="profile-section-kicker">Mi camino academico</span>
                <h3>Nivel ${level}</h3>
                <p>${xp ? `Te faltan ${xpToNext} XP para subir al nivel ${level + 1}.` : 'Completa actividades para ganar XP y desbloquear logros.'}</p>
            </div>
            <div class="profile-xp-track">
                <div class="profile-xp-fill" style="width:${xpProgress}%"></div>
            </div>
            <div class="profile-xp-meta">
                <span>${xpCurrent} / ${xpPerLevel} XP</span>
                <span>${xp} XP acumulado</span>
            </div>
        </section>

        <section class="profile-achievements-card premium-profile-card">
            <div class="profile-section-header">
                <div>
                    <span class="profile-section-kicker">Mis logros</span>
                    <h3>Insignias destacadas</h3>
                </div>
            </div>
            <div class="profile-badges-grid">
                ${achievements.map(item => `
                    <article class="profile-badge ${item.unlocked ? 'unlocked' : 'locked'}">
                        <span>${escapeHTML(item.icon)}</span>
                        <strong>${escapeHTML(item.name)}</strong>
                        <small>${item.unlocked ? 'Desbloqueado' : 'Bloqueado'}</small>
                    </article>
                `).join('')}
            </div>
        </section>

        <section class="profile-goals-card premium-profile-card">
            <div class="profile-section-header">
                <div>
                    <span class="profile-section-kicker">Mis metas</span>
                    <h3>Objetivos personales</h3>
                </div>
                <button class="btn-secondary btn-small" type="button" onclick="openGoalForm()">+ Meta</button>
            </div>
            <div class="profile-goals-list">
                ${goals.map(goal => `
                    <button class="profile-goal ${goal.done ? 'done' : ''}" type="button" onclick="${String(goal.id).startsWith('default-') ? '' : `toggleProfileGoal('${escapeHTML(goal.id)}')`}">
                        <span>${goal.done ? '✓' : '+'}</span>
                        <strong>${escapeHTML(goal.text)}</strong>
                    </button>
                `).join('')}
            </div>
        </section>

        <section class="profile-activity-card premium-profile-card">
            <span class="profile-section-kicker">Actividad reciente</span>
            <h3>Historial del estudiante</h3>
            ${recentItems.length ? `
                <ul class="profile-activity-list">
                    ${recentItems.map(item => `<li><span>${escapeHTML(item.time)}</span><strong>${escapeHTML(item.text)}</strong></li>`).join('')}
                </ul>
            ` : `
                <div class="profile-empty-note">
                    <strong>Tu actividad aparecera aqui cuando empieces.</strong>
                    <span>Crea materias, completa tareas, usa Tutor o sube PDFs.</span>
                </div>
            `}
        </section>
    `;
}

function profileStatCard(icon, label, value, detail) {
    return `
        <article class="profile-stat-card premium-profile-card">
            <span class="profile-stat-icon">${escapeHTML(icon)}</span>
            <div>
                <small>${escapeHTML(label)}</small>
                <strong>${escapeHTML(value)}</strong>
                <em>${escapeHTML(detail)}</em>
            </div>
        </article>
    `;
}

function refreshWorkspaceUI() {
    const workspace = loadWorkspace();
    renderDashboard(workspace);
    renderSubjects(workspace);
    renderTasks(workspace);
    renderCalendarSection(workspace);
    renderGrades(workspace);
    renderAttendance(workspace);
    renderProgress(workspace);
    renderBackpack(workspace);
    renderProfile(workspace);
    updateGradeSubjectOptions(workspace);
}

function initStudyPet() {
    const pet = document.getElementById('study-pet');
    if (!pet || pet.dataset.ready === 'true') return;

    pet.dataset.ready = 'true';
    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const updateEyeDirection = event => {
        const parrot = pet.querySelector('.pet-parrot');
        if (!parrot) return;

        const rect = parrot.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.56;
        const centerY = rect.top + rect.height * 0.32;
        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;
        const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
        const maxMove = window.innerWidth < 720 ? 3 : 4;

        pet.style.setProperty('--pet-eye-x', `${(deltaX / distance) * maxMove}px`);
        pet.style.setProperty('--pet-eye-y', `${(deltaY / distance) * maxMove}px`);
    };

    const resetEyeDirection = () => {
        pet.style.setProperty('--pet-eye-x', '0px');
        pet.style.setProperty('--pet-eye-y', '0px');
    };

    document.addEventListener('pointermove', updateEyeDirection);
    document.addEventListener('pointerleave', resetEyeDirection);

    pet.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        moved = false;
        pet.classList.add('dragging');
        pet.setPointerCapture(event.pointerId);

        const rect = pet.getBoundingClientRect();
        startX = event.clientX;
        startY = event.clientY;
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
    });

    pet.addEventListener('pointermove', event => {
        if (!dragging) return;
        const distance = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY);
        if (distance > 6) moved = true;

        const width = pet.offsetWidth;
        const height = pet.offsetHeight;
        const left = clamp(event.clientX - offsetX, 8, window.innerWidth - width - 8);
        const top = clamp(event.clientY - offsetY, 8, window.innerHeight - height - 8);

        pet.style.left = `${left}px`;
        pet.style.top = `${top}px`;
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
    });

    const stopDrag = event => {
        if (!dragging) return;
        dragging = false;
        pet.classList.remove('dragging');
        if (pet.hasPointerCapture(event.pointerId)) pet.releasePointerCapture(event.pointerId);
    };

    pet.addEventListener('pointerup', stopDrag);
    pet.addEventListener('pointercancel', stopDrag);

    pet.addEventListener('click', () => {
        if (moved) return;
        showRegister();
    });

    pet.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            showRegister();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
