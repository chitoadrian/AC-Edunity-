/* ============================================
   AC STUDY - LÓGICA PRINCIPAL
   JavaScript puro - Funcionalidades SPA
   ============================================ */

// ============================================
// ESTADO GLOBAL
// ============================================

let currentUser = null;
let currentSection = 'dashboard';
let isDarkTheme = !localStorage.getItem('theme') || localStorage.getItem('theme') === 'dark';
let isTabletOrSmaller = window.innerWidth <= 768;

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

// Mensajes visuales propios de AC Study. Evitan ventanas nativas del navegador.
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
                        <input
                            type="${field.type || 'text'}"
                            name="${escapeHTML(field.name)}"
                            value="${escapeHTML(field.value || '')}"
                            placeholder="${escapeHTML(field.placeholder || '')}"
                            required
                        >
                    </label>
                `).join('')}
                <button class="btn-primary btn-small" type="submit">${escapeHTML(config.submitLabel || 'Guardar')}</button>
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
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
}

// ============================================
// INICIALIZACIÓN
// ============================================

function initializeApp() {
    // Cargar tema guardado
    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        updateThemeIcon('🌙');
    } else {
        document.body.classList.add('light-theme');
        updateThemeIcon('☀️');
    }

    // Verificar si hay usuario en localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
        } catch (error) {
            localStorage.removeItem('currentUser');
            showLanding();
        }
    } else {
        showLanding();
    }

    // Event listeners para responsive
    window.addEventListener('resize', handleWindowResize);

    // Generar calendario
    generateCalendar();
    renderSavedSubjects();
    renderSavedCalendarEvents();
}

// ============================================
// NAVEGACIÓN DE PÁGINAS
// ============================================

function showPage(pageId) {
    const selectedPage = document.getElementById(pageId);
    if (!selectedPage) return;

    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar página seleccionada
    selectedPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Si es la app, mostrar la sección por defecto
    if (pageId === 'app-page' && !currentUser) {
        showLanding();
    }
}

function showLanding() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('landing-page');
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
        dashboardTitle.textContent = `Hola ${firstName} 👋`;
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
// AUTENTICACIÓN
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
    notify('Cuenta creada correctamente. Ya puedes personalizar AC Study.', 'success');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLanding();
    notify('Sesion cerrada.', 'info');
}

// ============================================
// NAVEGACIÓN SPA
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

    // Agregar clase active a la sección seleccionada
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
        updateThemeIcon('🌙');
    } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('☀️');
    }
}

function updateThemeIcon(icon) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = icon;
    });
}

// ============================================
// SIDEBAR RESPONSIVE
// ============================================

let sidebarOpen = false;

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
    sidebarOpen = false;
}

function handleWindowResize() {
    isTabletOrSmaller = window.innerWidth <= 768;
    if (window.innerWidth > 768) {
        closeSidebar();
    }
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
    // Actualizar botón activo
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
            { name: 'topic', label: 'Tarea', placeholder: 'Ej: Resolver ejercicios de algebra' },
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
            <p class="task-date">Vence: Próximamente</p>
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
            { name: 'name', label: 'Nombre de la materia', placeholder: 'Ej: Quimica' },
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
            <span class="subject-icon">📘</span>
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
        <p class="last-activity">Última actividad: creada por el estudiante</p>
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
        'Matemática': '📐',
        'Física': '⚛️',
        'Programación': '💻',
        'Inglés': '🌐'
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
        default: `📚 Resumen de: ${topic}\n\n` +
            `Este es un resumen generado simuladamente sobre "${topic}".\n\n` +
            `Puntos principales:\n` +
            `• Definición: Explicación detallada del concepto\n` +
            `• Características: Propiedades principales del tema\n` +
            `• Aplicaciones: Usos prácticos en la vida real\n` +
            `• Ejemplos: Casos de estudio relevantes\n` +
            `• Importancia: Por qué es importante aprender esto\n\n` +
            `Este resumen fue generado para ayudarte a estudiar de manera eficiente. ` +
            `Utiliza este contenido como base para tu aprendizaje.`
    };

    const summary = summaries.default;

    showAIResult('📝 Resumen Generado', summary);
}

function generateQuestions() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const questions = `❓ Preguntas de Práctica: ${topic}\n\n` +
        `1. ¿Cuáles son los conceptos principales de ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquí]\n\n` +
        `2. ¿Cómo se aplica ${topic} en la práctica?\n` +
        `   Respuesta: [Tu respuesta aquí]\n\n` +
        `3. ¿Cuáles son los errores comunes al estudiar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquí]\n\n` +
        `4. Explica la relación entre ${topic} y otros temas relacionados.\n` +
        `   Respuesta: [Tu respuesta aquí]\n\n` +
        `5. ¿Por qué es importante dominar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquí]`;

    showAIResult('❓ Preguntas Generadas', questions);
}

function generateFlashcards() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const flashcards = `🎴 Flashcards para ${topic}\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ TARJETA 1                       │\n` +
        `├─────────────────────────────────┤\n` +
        `│ PREGUNTA:                       │\n` +
        `│ ¿Qué es ${topic}?               │\n` +
        `│                                 │\n` +
        `│ RESPUESTA (Voltea):             │\n` +
        `│ Definición detallada...         │\n` +
        `└─────────────────────────────────┘\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ TARJETA 2                       │\n` +
        `├─────────────────────────────────┤\n` +
        `│ PREGUNTA:                       │\n` +
        `│ Características de ${topic}      │\n` +
        `│                                 │\n` +
        `│ RESPUESTA (Voltea):             │\n` +
        `│ Listar características clave... │\n` +
        `└─────────────────────────────────┘\n\n` +
        `┌─────────────────────────────────┐\n` +
        `│ TARJETA 3                       │\n` +
        `├─────────────────────────────────┤\n` +
        `│ PREGUNTA:                       │\n` +
        `│ Aplicaciones prácticas          │\n` +
        `│                                 │\n` +
        `│ RESPUESTA (Voltea):             │\n` +
        `│ Ejemplos de uso...              │\n` +
        `└─────────────────────────────────┘`;

    showAIResult('🎴 Flashcards Generadas', flashcards);
}

function showAIResult(title, content) {
    const outputSection = document.getElementById('ai-output-section');
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-content').textContent = content;
    outputSection.style.display = 'block';
}

function closeAIResult() {
    document.getElementById('ai-output-section').style.display = 'none';
}

function copyToClipboard() {
    const content = document.getElementById('result-content').textContent;
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
            { name: 'title', label: 'Evento academico', placeholder: 'Ej: Exposicion de proyecto' },
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
    const title = document.getElementById('result-title').textContent;
    const content = document.getElementById('result-content').textContent;

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

    // Días de la semana
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    days.forEach(day => {
        html += `<div style="text-align: center; font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 8px 0;">${day}</div>`;
    });

    // Días del mes
    const firstDay = new Date(2026, 5, 1).getDay();
    const daysInMonth = 30;

    // Espacios vacíos antes del primer día
    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 8px; text-align: center; font-size: 12px; color: var(--text-tertiary);">-</div>`;
    }

    // Días del mes
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
// UTILIDADES
// ============================================

// Prevenir envío de formularios con Enter en ciertos contextos
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.closest('.form-group textarea')) {
        // Permitir saltos de línea en textareas
        return;
    }
});

// Inicializar la aplicación cuando se carga la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
