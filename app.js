/* ============================================
   AC STUDY - LÃ“GICA PRINCIPAL
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
// INICIALIZACIÃ“N
// ============================================

function initializeApp() {
    // Cargar tema guardado
    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        updateThemeIcon('ðŸŒ™');
    } else {
        document.body.classList.add('light-theme');
        updateThemeIcon('â˜€ï¸');
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
}

// ============================================
// NAVEGACIÃ“N DE PÃGINAS
// ============================================

function showPage(pageId) {
    const selectedPage = document.getElementById(pageId);
    if (!selectedPage) return;

    // Ocultar todas las pÃ¡ginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar pÃ¡gina seleccionada
    selectedPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Si es la app, mostrar la secciÃ³n por defecto
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
        dashboardTitle.textContent = `Hola ${firstName} ðŸ‘‹`;
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
// AUTENTICACIÃ“N
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
// NAVEGACIÃ“N SPA
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

    // Agregar clase active a la secciÃ³n seleccionada
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
        updateThemeIcon('ðŸŒ™');
    } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('â˜€ï¸');
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
    // Actualizar botÃ³n activo
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
            <p class="task-date">Vence: PrÃ³ximamente</p>
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
            <span class="subject-icon">ðŸ“˜</span>
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
        <p class="last-activity">Ãšltima actividad: creada por el estudiante</p>
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
        'MatemÃ¡tica': 'ðŸ“',
        'FÃ­sica': 'âš›ï¸',
        'ProgramaciÃ³n': 'ðŸ’»',
        'InglÃ©s': 'ðŸŒ'
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
        default: `ðŸ“š Resumen de: ${topic}\n\n` +
            `Este es un resumen generado simuladamente sobre "${topic}".\n\n` +
            `Puntos principales:\n` +
            `â€¢ DefiniciÃ³n: ExplicaciÃ³n detallada del concepto\n` +
            `â€¢ CaracterÃ­sticas: Propiedades principales del tema\n` +
            `â€¢ Aplicaciones: Usos prÃ¡cticos en la vida real\n` +
            `â€¢ Ejemplos: Casos de estudio relevantes\n` +
            `â€¢ Importancia: Por quÃ© es importante aprender esto\n\n` +
            `Este resumen fue generado para ayudarte a estudiar de manera eficiente. ` +
            `Utiliza este contenido como base para tu aprendizaje.`
    };

    const summary = summaries.default;

    showAIResult('ðŸ“ Resumen Generado', summary);
}

function generateQuestions() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const questions = `â“ Preguntas de PrÃ¡ctica: ${topic}\n\n` +
        `1. Â¿CuÃ¡les son los conceptos principales de ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquÃ­]\n\n` +
        `2. Â¿CÃ³mo se aplica ${topic} en la prÃ¡ctica?\n` +
        `   Respuesta: [Tu respuesta aquÃ­]\n\n` +
        `3. Â¿CuÃ¡les son los errores comunes al estudiar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquÃ­]\n\n` +
        `4. Explica la relaciÃ³n entre ${topic} y otros temas relacionados.\n` +
        `   Respuesta: [Tu respuesta aquÃ­]\n\n` +
        `5. Â¿Por quÃ© es importante dominar ${topic}?\n` +
        `   Respuesta: [Tu respuesta aquÃ­]`;

    showAIResult('â“ Preguntas Generadas', questions);
}

function generateFlashcards() {
    const topic = document.getElementById('ai-topic').value.trim();

    if (!topic) {
        notify('Ingresa un tema para usar el asistente IA.', 'error');
        return;
    }

    const flashcards = `ðŸŽ´ Flashcards para ${topic}\n\n` +
        `â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”\n` +
        `â”‚ TARJETA 1                       â”‚\n` +
        `â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤\n` +
        `â”‚ PREGUNTA:                       â”‚\n` +
        `â”‚ Â¿QuÃ© es ${topic}?               â”‚\n` +
        `â”‚                                 â”‚\n` +
        `â”‚ RESPUESTA (Voltea):             â”‚\n` +
        `â”‚ DefiniciÃ³n detallada...         â”‚\n` +
        `â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜\n\n` +
        `â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”\n` +
        `â”‚ TARJETA 2                       â”‚\n` +
        `â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤\n` +
        `â”‚ PREGUNTA:                       â”‚\n` +
        `â”‚ CaracterÃ­sticas de ${topic}      â”‚\n` +
        `â”‚                                 â”‚\n` +
        `â”‚ RESPUESTA (Voltea):             â”‚\n` +
        `â”‚ Listar caracterÃ­sticas clave... â”‚\n` +
        `â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜\n\n` +
        `â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”\n` +
        `â”‚ TARJETA 3                       â”‚\n` +
        `â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤\n` +
        `â”‚ PREGUNTA:                       â”‚\n` +
        `â”‚ Aplicaciones prÃ¡cticas          â”‚\n` +
        `â”‚                                 â”‚\n` +
        `â”‚ RESPUESTA (Voltea):             â”‚\n` +
        `â”‚ Ejemplos de uso...              â”‚\n` +
        `â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜`;

    showAIResult('ðŸŽ´ Flashcards Generadas', flashcards);
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

    // DÃ­as de la semana
    const days = ['Dom', 'Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b'];
    days.forEach(day => {
        html += `<div style="text-align: center; font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 8px 0;">${day}</div>`;
    });

    // DÃ­as del mes
    const firstDay = new Date(2026, 5, 1).getDay();
    const daysInMonth = 30;

    // Espacios vacÃ­os antes del primer dÃ­a
    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 8px; text-align: center; font-size: 12px; color: var(--text-tertiary);">-</div>`;
    }

    // DÃ­as del mes
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
        return { ...getEmptyWorkspace(), ...JSON.parse(localStorage.getItem(getWorkspaceKey())) };
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
    users[email] = { password, name };
    saveUsers(users);

    currentUser = { email, name };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    saveWorkspace(getEmptyWorkspace());

    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';

    showApp();
    notify('Bienvenido a AC Study. Empieza creando tu primera materia.', 'success');
}

function handleLogin(event) {
    event.preventDefault();
    clearAuthMessages();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const users = getUsers();

    if (users[email] && users[email].password === password) {
        currentUser = { email, name: users[email].name };
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
            <h1>Hola ${escapeHTML(firstName)} ðŸ‘‹</h1>
            <p class="subtitle">${isEmpty ? 'Bienvenido a AC Study. Empieza creando tu primera materia.' : 'Este es el resumen actualizado de tu espacio academico.'}</p>
        </div>

        <div class="dashboard-grid">
            ${dashboardCard('ðŸ“š', 'Materias Activas', workspace.subjects.length, workspace.subjects.length ? 'Materias creadas por ti' : 'Sin materias todavia', workspace.subjects.length ? 100 : 0)}
            ${dashboardCard('âœ“', 'Tareas Pendientes', pending, `${completed} completadas`, workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0)}
            ${dashboardCard('ðŸ“…', 'Proximo Evento', nextEvent ? nextEvent.title : 'Sin eventos', nextEvent ? `${nextEvent.day} - ${nextEvent.type}` : 'Agenda tu primer examen o entrega', nextEvent ? 70 : 0)}
            ${dashboardCard('ðŸ“Š', 'Promedio Actual', average ? average.toFixed(2) : '--', workspace.grades.length ? `${workspace.grades.length} notas registradas` : 'Aun no hay notas', average ? average * 10 : 0)}
            ${dashboardCard('âš¡', 'XP Acumulado', workspace.xp || 0, `Nivel ${level}`, Math.min(100, ((workspace.xp || 0) % 250) / 2.5))}
            ${dashboardCard('ðŸ”¥', 'Racha de Estudio', workspace.streak || 0, 'dias activos', workspace.streak ? 100 : 0)}
            ${dashboardCard('AI', 'Recomendacion IA', workspace.resources.length ? 'Repasa un PDF' : 'Sube un apunte', workspace.resources.length ? 'AC Assistant puede crear cuestionarios' : 'Sube tus apuntes y estudia con ayuda de AC Assistant', workspace.resources.length ? 85 : 25)}
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
            <div class="empty-icon">ï¼‹</div>
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
                <div class="subject-header"><h3>${escapeHTML(subject.name)}</h3><span class="subject-icon">ðŸ“˜</span></div>
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
            { name: 'title', label: 'Tarea', placeholder: 'Ej: Resolver ejercicios' },
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
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    document.querySelectorAll('.task-item').forEach(task => {
        const status = task.getAttribute('data-status');
        task.style.display = filter === 'all' || filter === status ? 'flex' : 'none';
    });
}

function addCalendarEventUI() {
    openQuickForm({
        title: 'Agendar evento',
        submitLabel: 'Guardar evento',
        fields: [
            { name: 'title', label: 'Evento academico', placeholder: 'Ej: Examen de fisica' },
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

function generateCalendar() {
    const miniCalendar = document.getElementById('mini-calendar');
    if (!miniCalendar) return;

    const workspace = loadWorkspace();
    const eventDays = workspace.events.map(event => parseInt(event.day, 10)).filter(Boolean);
    let html = '<div class="calendar-title">Junio 2026</div><div class="calendar-grid">';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(day => {
        html += `<div class="calendar-day-label">${day}</div>`;
    });
    for (let i = 0; i < 35; i++) {
        const day = i - 1;
        if (day < 1 || day > 30) {
            html += '<div class="calendar-day muted">-</div>';
        } else {
            html += `<div class="calendar-day ${eventDays.includes(day) ? 'has-event' : ''}">${day}</div>`;
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
    const workspace = loadWorkspace();
    openQuickForm({
        title: 'Registrar asistencia',
        submitLabel: 'Guardar asistencia',
        fields: [
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace) },
            { name: 'date', label: 'Fecha', type: 'date', value: normalizeDate(new Date().toISOString()) },
            { name: 'status', label: 'Estado', type: 'select', options: attendanceStatusOptions }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            fresh.attendance.push({
                id: createId(),
                subject: values.subject,
                date: values.date,
                status: values.status
            });
            addXP(fresh, values.status === 'Asisti' ? 10 : 0);
            addRecent(fresh, `Registraste asistencia en ${values.subject}.`);
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify('Asistencia registrada.', 'success');
        }
    });
}

function renderAttendance(workspace) {
    const container = document.getElementById('attendance-container');
    if (!container) return;

    container.innerHTML = workspace.attendance.length ? `
        <div class="attendance-grid">
            ${workspace.attendance.map(item => `
                <div class="attendance-card">
                    <h3>${escapeHTML(item.subject)}</h3>
                    <p>${escapeHTML(item.date || 'Sin fecha')}</p>
                    <span class="event-badge">${escapeHTML(item.status || 'Pendiente')}</span>
                </div>
            `).join('')}
        </div>
    ` : emptyStateHTML('No hay registros de asistencia.', 'Registrar asistencia', 'addAttendanceUI()');
}

function addResourceUI() {
    const workspace = loadWorkspace();
    const subjectOptions = workspace.subjects.length ? workspace.subjects.map(subject => subject.name) : ['General'];
    openQuickForm({
        title: 'Subir apunte simulado',
        submitLabel: 'Guardar apunte',
        fields: [
            { name: 'title', label: 'Titulo', placeholder: 'Ej: Apuntes de formulas' },
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
            <div class="resource-icon">ðŸ“„</div>
            <h4>${escapeHTML(resource.title)}</h4>
            <p class="resource-type">${escapeHTML(resource.subject)} â€¢ Apunte simulado</p>
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
        return `${prefix}:\n\nTarjeta 1\nPregunta: Que significa el tema?\nRespuesta: Explicalo con tus palabras.\n\nTarjeta 2\nPregunta: Cual es el punto clave?\nRespuesta: Identifica la idea central.\n\nTarjeta 3\nPregunta: Como lo usarias en clase?\nRespuesta: Crea un ejemplo corto.\n\nReferencia:\n${reference}`;
    }

    if (type === 'simple') {
        return `${prefix}:\n\nExplicacion sencilla:\nImagina que este contenido es una guia de estudio. Primero identifica la idea central, luego separa los conceptos importantes y finalmente practica con un ejemplo propio.\n\nReferencia:\n${reference}`;
    }

    return `${prefix}:\n\nResumen:\nEl contenido trata sobre los puntos principales del tema. Para estudiarlo mejor, divide la informacion en definiciones, ejemplos y posibles preguntas de examen.\n\nIdeas clave:\n- Tema central identificado\n- Conceptos importantes organizados\n- Recomendacion: crear preguntas y flashcards\n\nReferencia:\n${reference}`;
}

function generateSummary() {
    const topic = getAIInput();
    if (!topic) {
        notify('Ingresa un tema o carga un apunte desde la mochila digital.', 'error');
        return;
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
    Amarillo: '#f59e0b'
};

const subjectColorOptions = [
    { value: 'Morado', label: 'Morado creativo' },
    { value: 'Azul', label: 'Azul concentracion' },
    { value: 'Rosado', label: 'Rosado energia' },
    { value: 'Cian', label: 'Cian tecnologia' },
    { value: 'Verde', label: 'Verde avance' },
    { value: 'Amarillo', label: 'Amarillo importante' }
];

const subjectBookOptions = [
    { value: 'book-blue', label: 'Libro azul' },
    { value: 'book-orange', label: 'Libro naranja' },
    { value: 'book-yellow', label: 'Libro amarillo' },
    { value: 'book-green', label: 'Libro verde' },
    { value: 'book-purple', label: 'Libro morado' },
    { value: 'book-pink', label: 'Libro rosado' }
];

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

const eventTypeOptions = [
    { value: 'examen', label: 'Examen' },
    { value: 'tarea', label: 'Tarea' },
    { value: 'exposicion', label: 'Exposicion' },
    { value: 'recordatorio', label: 'Recordatorio' }
];

const attendanceStatusOptions = [
    { value: 'Asisti', label: 'Asisti' },
    { value: 'Falta', label: 'Falta' },
    { value: 'Atraso', label: 'Atraso' }
];

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
    if (status === 'upcoming') return 'Proxima / mas tarde';
    return 'Pendiente ahora';
}

function getTaskPriorityLabel(priority) {
    if (priority === 'alta') return 'Importante';
    if (priority === 'baja') return 'Mas tarde';
    return 'Normal';
}

function normalizeDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
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
            { name: 'icon', label: 'Icono o etiqueta', value: subject?.icon || 'ðŸ“˜', placeholder: 'Ej: ðŸ“, FIS, PROG' },
            { name: 'color', label: 'Color identificador', type: 'select', options: subjectColorOptions, value: subject?.color || 'Morado' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (subjectId) {
                const item = fresh.subjects.find(entry => entry.id === subjectId);
                if (item) {
                    const oldName = item.name;
                    item.name = values.name.trim();
                    item.icon = values.icon.trim() || 'ðŸ“˜';
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
                    icon: values.icon.trim() || 'ðŸ“˜',
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
                    <h3><span class="subject-icon">${escapeHTML(subject.icon || 'ðŸ“˜')}</span> ${escapeHTML(subject.name)}</h3>
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
            { name: 'title', label: 'Titulo', value: task?.title || '', placeholder: 'Ej: Resolver ejercicios' },
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: task?.subject || '' },
            { name: 'description', label: 'Descripcion', type: 'textarea', value: task?.description || '', placeholder: 'Detalles de la tarea' },
            { name: 'due', label: 'Fecha limite', type: 'date', value: normalizeDate(task?.due) },
            { name: 'priority', label: 'Prioridad', type: 'select', options: taskPriorityOptions, value: task?.priority || 'media' },
            { name: 'status', label: 'Estado', type: 'select', options: taskStatusOptions, value: task?.status || 'pending' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (taskId) {
                const item = fresh.tasks.find(entry => entry.id === taskId);
                if (item) Object.assign(item, values, { title: values.title.trim(), description: values.description.trim(), due: values.due });
                addRecent(fresh, `Editaste la tarea ${values.title.trim()}.`);
            } else {
                fresh.tasks.push({
                    id: createId(),
                    title: values.title.trim(),
                    subject: values.subject,
                    description: values.description.trim(),
                    due: values.due,
                    priority: values.priority || 'media',
                    status: values.status || 'pending'
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

function renderTasks(workspace) {
    const list = document.getElementById('tasks-list');
    if (!list) return;

    if (!workspace.tasks.length) {
        list.innerHTML = emptyStateHTML('No tienes tareas pendientes.', 'Agregar tarea', 'addTaskUI()');
        return;
    }

    const groups = [
        ['pending', 'Pendientes'],
        ['upcoming', 'Proximas'],
        ['completed', 'Completadas']
    ];

    list.innerHTML = `<div class="task-board">${groups.map(([status, title]) => {
        const tasks = workspace.tasks.filter(task => task.status === status);
        return `
            <div class="task-column" data-task-column="${status}">
                <h3>${title} <span>${tasks.length}</span></h3>
                ${tasks.length ? tasks.map(task => `
                    <div class="task-item" data-status="${escapeHTML(task.status)}" data-id="${escapeHTML(task.id)}">
                        <div class="task-checkbox"><input type="checkbox" onclick="toggleTask(this)" ${task.status === 'completed' ? 'checked' : ''}></div>
                        <div class="task-content">
                            <h4>${escapeHTML(task.title)}</h4>
                            <p class="task-subject">${escapeHTML(task.subject)}</p>
                            <p class="task-date">${escapeHTML(task.due || 'Sin fecha limite')}</p>
                            <p class="task-description">${escapeHTML(task.description || 'Sin descripcion')}</p>
                        </div>
                        <div class="task-priority ${escapeHTML(task.priority || 'media')}">${escapeHTML(getTaskPriorityLabel(task.priority || 'media'))}</div>
                        <div class="card-actions">
                            <button class="btn-secondary btn-small" data-task-edit="${escapeHTML(task.id)}">Editar</button>
                            <button class="btn-danger btn-small" data-task-delete="${escapeHTML(task.id)}">Eliminar</button>
                        </div>
                    </div>
                `).join('') : '<p class="muted-panel">Sin tareas en esta seccion.</p>'}
            </div>
        `;
    }).join('')}</div>`;

    list.querySelectorAll('[data-task-edit]').forEach(button => button.addEventListener('click', () => openTaskForm(button.dataset.taskEdit)));
    list.querySelectorAll('[data-task-delete]').forEach(button => button.addEventListener('click', () => deleteTask(button.dataset.taskDelete)));
}

function addCalendarEventUI() {
    openEventForm();
}

function openEventForm(eventId = null) {
    const workspace = loadWorkspace();
    const event = workspace.events.find(item => item.id === eventId);
    openQuickForm({
        title: event ? 'Editar evento' : 'Crear evento',
        submitLabel: event ? 'Actualizar evento' : 'Guardar evento',
        fields: [
            { name: 'title', label: 'Titulo del evento', value: event?.title || '', placeholder: 'Ej: Examen de fisica' },
            { name: 'type', label: 'Tipo', type: 'select', options: eventTypeOptions, value: event?.type || 'recordatorio' },
            { name: 'date', label: 'Fecha', type: 'date', value: normalizeDate(event?.date) },
            { name: 'time', label: 'Hora', type: 'time', value: event?.time || '08:00' },
            { name: 'email', label: 'Correo del usuario', type: 'email', value: event?.email || currentUser?.email || '', placeholder: 'usuario@email.com' },
            { name: 'emailReminder', label: 'Recordatorio por correo', type: 'checkbox', checked: Boolean(event?.emailReminder), help: 'Activar recordatorio por correo' }
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
                emailReminder: values.emailReminder === 'yes'
            };

            if (eventId) {
                const item = fresh.events.find(entry => entry.id === eventId);
                if (item) Object.assign(item, payload);
                addRecent(fresh, `Editaste el evento ${payload.title}.`);
            } else {
                fresh.events.push({ id: createId(), ...payload });
                addXP(fresh, 20);
                addRecent(fresh, `Agendaste ${payload.title}.`);
            }

            fresh.events.sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
            saveWorkspace(fresh);
            refreshWorkspaceUI();
            notify(payload.emailReminder ? getReminderMessage(payload) : 'Evento guardado correctamente.', 'success');

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
        <div class="calendar-mini" id="mini-calendar"></div>
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
                                <p>${escapeHTML(event.date || 'Sin fecha')} â€¢ ${escapeHTML(event.time || 'Sin hora')}</p>
                                <span class="event-badge">${escapeHTML(event.type)}</span>
                                ${isEventSoon(event) ? '<p class="event-alert">Evento cercano</p>' : ''}
                                ${reminder ? `<p class="email-simulation">${escapeHTML(reminder)}</p>` : ''}
                                <div class="card-actions">
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
        button.addEventListener('click', () => openGradeForm(null, {
            subject: button.dataset.subject,
            period: button.dataset.period,
            category: button.dataset.category
        }));
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
            { name: 'title', label: 'Titulo del recurso', value: resource?.title || '', placeholder: 'Ej: Guia de cinematica' },
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
            <div class="resource-icon">ðŸ“„</div>
            <h4>${escapeHTML(resource.title)}</h4>
            <p class="resource-type">${escapeHTML(resource.subject)} â€¢ ${escapeHTML(resource.fileName || 'PDF simulado')}</p>
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
    showAIResult('Respuesta simulada de AC Assistant', buildResourceAIResponse(resource, 'summary'));
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
    if (type === 'quiz') {
        return `Cuestionario simulado sobre ${reference}:\n\n1. Cual es la definicion principal?\n2. Que ejemplo puedes resolver?\n3. Cual es el error mas comun?\n4. Como lo explicarias en clase?\n5. Que debes repasar antes del examen?`;
    }
    if (type === 'open') {
        return `Preguntas abiertas:\n\n1. Explica ${reference} con tus palabras.\n2. Crea un ejemplo propio.\n3. Relaciona el tema con una situacion real.`;
    }
    if (type === 'truefalse') {
        return `Verdadero/Falso:\n\n1. El tema tiene conceptos clave que se pueden resumir. (V)\n2. No hace falta practicar. (F)\n3. Crear preguntas ayuda a estudiar. (V)\n4. Las flashcards sirven para repasar rapido. (V)`;
    }
    if (type === 'flashcards') {
        return `Flashcards:\n\nTarjeta 1\nPregunta: Que es ${reference}?\nRespuesta: Escribe una definicion corta.\n\nTarjeta 2\nPregunta: Cual es un ejemplo?\nRespuesta: Crea un caso practico.\n\nTarjeta 3\nPregunta: Que debo recordar?\nRespuesta: La idea central y sus aplicaciones.`;
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
// UTILIDADES
// ============================================

// Prevenir envÃ­o de formularios con Enter en ciertos contextos
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.closest('.form-group textarea')) {
        // Permitir saltos de lÃ­nea en textareas
        return;
    }
});

// Inicializar la aplicaciÃ³n cuando se carga la pÃ¡gina
// Dashboard limpio sin emojis para evitar caracteres rotos por codificacion.
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
    const taskProgress = workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0;
    const gradeProgress = average ? average * 10 : 0;
    const xpProgress = Math.min(100, ((workspace.xp || 0) % 250) / 2.5);
    const recentItems = (workspace.recent || []).slice(0, 3);
    const steps = [
        { label: 'Crea una materia', done: workspace.subjects.length > 0, action: 'addSubjectUI()', hint: 'Define tus clases y organiza tu espacio.' },
        { label: 'Agrega una tarea', done: workspace.tasks.length > 0, action: 'addTaskUI()', hint: 'Anota pendientes, deberes y entregas.' },
        { label: 'Agenda un examen', done: workspace.events.length > 0, action: 'addCalendarEventUI()', hint: 'Planifica pruebas, exposiciones y entregas.' },
        { label: 'Sube un apunte', done: workspace.resources.length > 0, action: 'addResourceUI()', hint: 'Guarda tus PDFs y recursos importantes.' },
        { label: 'Pregunta a AC Assistant', done: workspace.resources.some(resource => resource.usedAI), action: "navigateTo('ai-assistant')", hint: 'Practica con resumenes, preguntas y flashcards.' }
    ];

    section.innerHTML = `
        <div class="dashboard-hero">
            <div>
                <span class="dashboard-eyebrow">Panel academico</span>
                <h1>Hola ${escapeHTML(firstName)}</h1>
                <p>${isEmpty ? 'Bienvenido a AC Study. Empieza creando tu primera materia y construye tu espacio de estudio desde cero.' : 'Este es el resumen actualizado de tu espacio academico. Revisa pendientes, progreso y actividad reciente en un solo lugar.'}</p>
            </div>
            <div class="dashboard-hero-actions">
                <button class="btn-primary btn-small" type="button" onclick="navigateTo('tasks')">Ir a tareas</button>
                <button class="btn-secondary btn-small" type="button" onclick="navigateTo('subjects')">Ir a materias</button>
            </div>
        </div>

        <div class="dashboard-grid">
            ${dashboardCard('subjects', 'Materias activas', workspace.subjects.length, workspace.subjects.length ? 'Materias creadas por ti' : 'Crea tu primera materia', workspace.subjects.length ? 100 : 0)}
            ${dashboardCard('tasks', 'Tareas pendientes', pending, workspace.tasks.length ? `${completed} completadas de ${workspace.tasks.length}` : 'Agrega tu primer pendiente', taskProgress)}
            ${dashboardCard('calendar', 'Proximo evento', nextEvent ? nextEvent.title : 'Sin eventos', nextEvent ? `${nextEvent.day || nextEvent.date || 'Sin fecha'} - ${nextEvent.type || 'Evento'}` : 'Agenda tu primer examen', nextEvent ? 70 : 0)}
            ${dashboardCard('grades', 'Promedio actual', average ? average.toFixed(2) : '--', workspace.grades.length ? `${workspace.grades.length} calificaciones registradas` : 'Registra tus calificaciones', gradeProgress)}
            ${dashboardCard('xp', 'XP acumulado', workspace.xp || 0, `Nivel ${level}`, xpProgress)}
            ${dashboardCard('streak', 'Racha de estudio', workspace.streak || 0, `${workspace.streak === 1 ? 'dia activo' : 'dias activos'}`, workspace.streak ? 100 : 0)}
            ${dashboardCard('assistant', 'Recomendacion IA', workspace.resources.length ? 'Practica con tus apuntes' : 'Sube un apunte', workspace.resources.length ? 'AC Assistant puede ayudarte a repasar' : 'Conecta tu mochila con el asistente', workspace.resources.length ? 85 : 25)}
        </div>

        <div class="dashboard-row dashboard-row-main">
            <div class="card starter-card dashboard-panel-card">
                <div class="panel-title">
                    <span class="panel-icon panel-icon-steps"></span>
                    <div>
                        <h3>Centro del estudiante</h3>
                        <p>Completa estos pasos para preparar tu espacio academico.</p>
                    </div>
                </div>
                <ol class="starter-list dashboard-steps">
                    ${steps.map((step, index) => `
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
                ` : emptyStateHTML('Tu actividad aparecera cuando empieces a usar la plataforma.', 'Crear primera materia', 'addSubjectUI()')}
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
            { name: 'icon', label: 'Libro de la materia', type: 'select', options: subjectBookOptions, value: normalizeSubjectIcon(subject?.icon) },
            { name: 'color', label: 'Color identificador', type: 'select', options: subjectColorOptions, value: subject?.color || 'Morado' }
        ],
        onSubmit: values => {
            const fresh = loadWorkspace();
            if (subjectId) {
                const item = fresh.subjects.find(entry => entry.id === subjectId);
                if (item) {
                    const oldName = item.name;
                    item.name = values.name.trim();
                    item.icon = normalizeSubjectIcon(values.icon);
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
                    icon: normalizeSubjectIcon(values.icon),
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

function renderSubjects(workspace) {
    const grid = document.querySelector('.subjects-grid');
    if (!grid) return;

    grid.innerHTML = workspace.subjects.length ? workspace.subjects.map(subject => {
        const taskCount = workspace.tasks.filter(task => task.subject === subject.name).length;
        const completed = workspace.tasks.filter(task => task.subject === subject.name && task.status === 'completed').length;
        const progress = taskCount ? Math.round((completed / taskCount) * 100) : 0;
        const average = getSubjectAverage(workspace, subject.name);
        const color = subjectColorMap[subject.color] || subjectColorMap.Morado;
        const bookIcon = normalizeSubjectIcon(subject.icon);
        return `
            <div class="subject-card subject-custom ac-colored-card" style="--subject-color:${color}">
                <div class="subject-header">
                    <h3><span class="subject-icon subject-book ${escapeHTML(bookIcon)}" aria-hidden="true"></span> ${escapeHTML(subject.name)}</h3>
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

    const level = getLevel(workspace.xp);
    const xpProgress = Math.min(100, ((workspace.xp || 0) % 250) / 2.5);
    const achievements = [
        { name: 'Primera materia', icon: 'subject', unlocked: workspace.subjects.length > 0 },
        { name: 'Primera tarea', icon: 'task', unlocked: workspace.tasks.length > 0 },
        { name: 'Tarea completada', icon: 'done', unlocked: workspace.tasks.some(task => task.status === 'completed') },
        { name: 'Primer apunte', icon: 'note', unlocked: workspace.resources.length > 0 },
        { name: 'Uso de IA', icon: 'ai', unlocked: workspace.resources.some(resource => resource.usedAI) }
    ];

    container.innerHTML = `
        <div class="level-display">
            <div class="level-card">
                <div class="level-number">${level}</div>
                <p>NIVEL ACTUAL</p>
                <div class="xp-bar"><div class="xp-fill" style="width:${xpProgress}%"></div></div>
                <p class="xp-text">${workspace.xp || 0} XP acumulado</p>
            </div>
            <div class="stats-row">
                <div class="progress-stat"><span class="stat-label">Racha Actual</span><span class="stat-value">${workspace.streak || 0} dias</span></div>
                <div class="progress-stat"><span class="stat-label">Logros</span><span class="stat-value">${achievements.filter(item => item.unlocked).length}/${achievements.length}</span></div>
                <div class="progress-stat"><span class="stat-label">Estado</span><span class="stat-value">${workspace.xp ? 'En progreso' : 'Inicial'}</span></div>
            </div>
        </div>
        ${workspace.xp ? '' : `<div class="card">${emptyStateHTML('Tu progreso aparecera cuando empieces a usar la plataforma.', 'Crear primera materia', 'addSubjectUI()')}</div>`}
        <div class="achievements-section">
            <h3>Logros</h3>
            <div class="achievements-grid">
                ${achievements.map(item => `
                    <div class="achievement ${item.unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon achievement-${escapeHTML(item.icon)}" aria-hidden="true"></div>
                        <p>${escapeHTML(item.name)}</p>
                    </div>
                `).join('')}
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
        title: resource ? 'Editar PDF simulado' : 'Subir PDF simulado',
        submitLabel: resource ? 'Actualizar recurso' : 'Guardar recurso',
        fields: [
            { name: 'title', label: 'Titulo del recurso', value: resource?.title || '', placeholder: 'Ej: Guia de cinematica' },
            { name: 'subject', label: 'Materia', type: 'select', options: getSubjectOptions(workspace), value: resource?.subject || '' },
            { name: 'file', label: 'Archivo PDF', type: 'file', accept: '.pdf,application/pdf', required: !resource },
            { name: 'description', label: 'Descripcion del apunte', type: 'textarea', value: resource?.description || resource?.content || '', placeholder: 'Describe de que trata el PDF' }
        ],
        onSubmit: async values => {
            const fresh = loadWorkspace();
            const uploadedFile = values.file && values.file.name ? values.file : null;
            const fileName = uploadedFile?.name || resource?.fileName || `${values.title.trim()}.pdf`;
            let fileDataUrl = resource?.fileDataUrl || '';

            try {
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
                type: 'PDF'
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

function renderBackpack(workspace) {
    const section = document.getElementById('backpack');
    const container = document.querySelector('.backpack-container');
    if (!section || !container) return;

    const header = section.querySelector('.section-header');
    if (header && !header.querySelector('[data-action="add-resource"]')) {
        header.insertAdjacentHTML('beforeend', '<button class="btn-primary btn-small" data-action="add-resource" onclick="addResourceUI()">+ Subir PDF</button>');
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
                        <p class="resource-type">${escapeHTML(resource.subject)} - ${escapeHTML(resource.fileName || 'PDF')}</p>
                    </div>
                </div>
                <p class="resource-date">${escapeHTML(shortDescription)}</p>
                <div class="resource-actions">
                    <button class="btn-secondary btn-small" data-resource-ai="${escapeHTML(resource.id)}">Preguntar a la IA</button>
                    <button class="btn-secondary btn-small" data-resource-practice="${escapeHTML(resource.id)}">Practicar con PDF</button>
                    <button class="btn-secondary btn-small" data-resource-edit="${escapeHTML(resource.id)}">Editar</button>
                    <button class="btn-danger btn-small" data-resource-delete="${escapeHTML(resource.id)}">Eliminar</button>
                </div>
            </div>
        `;
    }).join('') : emptyStateHTML('No has subido apuntes todavia.', 'Subir primer PDF', 'addResourceUI()');

    container.querySelectorAll('[data-resource-ai]').forEach(button => button.addEventListener('click', () => askAIAboutResource(button.dataset.resourceAi)));
    container.querySelectorAll('[data-resource-practice]').forEach(button => button.addEventListener('click', () => practiceWithResource(button.dataset.resourcePractice)));
    container.querySelectorAll('[data-resource-edit]').forEach(button => button.addEventListener('click', () => openResourceForm(button.dataset.resourceEdit)));
    container.querySelectorAll('[data-resource-delete]').forEach(button => button.addEventListener('click', () => deleteResource(button.dataset.resourceDelete)));
}

function practiceWithResource(resourceId) {
    const resource = markResourceAIUsed(resourceId, 'Abriste un PDF desde Mochila Digital.');
    if (!resource) return;

    if (resource.fileDataUrl) {
        const tab = window.open(resource.fileDataUrl, '_blank', 'noopener');
        if (!tab) {
            notify('El navegador bloqueo la pestaña nueva. Permite ventanas emergentes para abrir el PDF.', 'error');
            return;
        }
        notify('PDF abierto en una nueva pestaña.', 'success');
        return;
    }

    notify('Este recurso no tiene el archivo PDF guardado. Editalo y vuelve a subir el PDF.', 'error');
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

function practiceWithResource(resourceId) {
    const resource = loadWorkspace().resources.find(item => item.id === resourceId);
    if (!resource) return;

    if (!resource.fileDataUrl) {
        notify('Este recurso no tiene el archivo PDF guardado. Editalo y vuelve a subir el PDF.', 'error');
        return;
    }

    let pdfUrl = '';
    try {
        pdfUrl = createPdfObjectUrl(resource.fileDataUrl, resource.fileMime || 'application/pdf');
    } catch (error) {
        notify('No se pudo preparar el PDF. Vuelve a subir el archivo.', 'error');
        return;
    }

    const tab = window.open('', '_blank');
    if (tab) {
        tab.document.title = resource.fileName || resource.title || 'PDF';
        tab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 24px;">Abriendo PDF...</p>';
        tab.location.href = pdfUrl;
        markResourceAIUsed(resourceId, 'Abriste un PDF desde Mochila Digital.');
        notify('PDF abierto en una nueva pestaña.', 'success');
        return;
    }

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
    markResourceAIUsed(resourceId, 'Abriste un PDF desde Mochila Digital.');
    notify('PDF abierto. Si no aparece, permite ventanas emergentes para esta pagina.', 'info');
}

function getDisplayStreak(workspace) {
    return currentUser?.email ? Math.max(1, Number(workspace.streak || 0)) : 0;
}

function renderProfile(workspace) {
    const profileLayout = document.querySelector('#profile .profile-layout');
    if (!profileLayout) return;

    const name = currentUser?.name || 'Estudiante AC';
    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join('') || 'AC';
    const level = getLevel(workspace.xp);
    const average = getAverageGrade(workspace);
    const streak = getDisplayStreak(workspace);

    profileLayout.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">${escapeHTML(initials)}</div>
            <div class="profile-details">
                <span class="profile-role">Estudiante</span>
                <h2 id="profile-name">${escapeHTML(name)}</h2>
                <p>Estudiante de Informatica desarrollando AC Study como proyecto de grado.</p>
                <div class="profile-tags">
                    <span>Organizacion academica</span>
                    <span>IA educativa</span>
                    <span>Productividad</span>
                </div>
            </div>
        </div>

        <div class="profile-metrics">
            <div class="profile-metric">
                <span>Nivel</span>
                <strong>${level}</strong>
            </div>
            <div class="profile-metric">
                <span>XP</span>
                <strong>${workspace.xp || 0}</strong>
            </div>
            <div class="profile-metric">
                <span>Racha</span>
                <strong>${streak} ${streak === 1 ? 'dia' : 'dias'}</strong>
            </div>
            <div class="profile-metric">
                <span>Promedio</span>
                <strong class="${workspace.grades.length ? '' : 'empty-profile-value'}">${workspace.grades.length ? average.toFixed(2) : 'Sin calificaciones'}</strong>
            </div>
        </div>
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
