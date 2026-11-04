// --- 1. CANDADO DE LICENCIA DEL DESARROLLADOR ---
const CLAVE_MAESTRA = "SITLAX26"; 

let appLicenciada = localStorage.getItem('app_licencia_maestra');

if (!appLicenciada) {
    let claveIngresada = prompt("⚠️ Esta app requiere una licencia de uso.\nIngresa el código de activación:");
    
    if (claveIngresada === CLAVE_MAESTRA) {
        localStorage.setItem('app_licencia_maestra', 'true');
        alert("✅ ¡Aplicación activada con éxito para este dispositivo!");
    } else {
        alert("❌ Código incorrecto. Contacta al desarrollador para adquirir tu licencia.");
        document.body.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
                <h2 style="color: #d9534f; font-size: 24px;">App No Autorizada</h2>
                <p style="color: #666; margin-top: 10px;">Esta copia de la aplicación requiere activación.</p>
                <p style="color: #666;">Comunícate con el desarrollador para obtener tu acceso.</p>
            </div>
        `;
        throw new Error("Aplicación bloqueada por falta de licencia.");
    }
}

// --- 2. TUS VARIABLES GLOBALES ---
let tasks = JSON.parse(localStorage.getItem('pwa_tasks')) || [];
let expenses = JSON.parse(localStorage.getItem('pwa_expenses')) || [];
let notes = JSON.parse(localStorage.getItem('pwa_notes')) || []; 
let currentPriorityFilter = 'all'; 
let signatureCanvas, signatureCtx;
let isDrawing = false;
let currentWorkForPDF = null;
let imagenBase64Temp = "";

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", () => {
    loadBusinessData();
    initDarkMode();
    renderTasks();
    initSignaturePad();
    
    // Verificamos si es la primera vez que se abre la app para cambiar el texto de la pantalla de inicio (PIN del negocio)
    const pinRegistrado = localStorage.getItem('business_pin');
    const tituloEl = document.getElementById('pin-titulo');
    const subtituloEl = document.getElementById('pin-subtitulo');
    
    if (!pinRegistrado) {
        if (tituloEl) tituloEl.innerText = "✨ Configura tu PIN";
        if (subtituloEl) subtituloEl.innerText = "Crea un PIN de al menos 4 dígitos para proteger tus datos.";
    } else {
        if (tituloEl) tituloEl.innerText = "🔒 Acceso al Sistema";
        if (subtituloEl) subtituloEl.innerText = "Ingresa tu PIN para desbloquear.";
    }

    // Cargar dirección del negocio guardada si existe
    const savedAddress = localStorage.getItem('business_address');
    if (savedAddress) {
        const input = document.getElementById('input-business-address');
        if (input) input.value = savedAddress;
    }

    // Cargar teléfono del negocio guardado si existe
    const savedPhone = localStorage.getItem('business_phone');
    if (savedPhone) {
        const inputPhone = document.getElementById('input-business-phone');
        if (inputPhone) inputPhone.value = savedPhone;
    }

    // Asignar fecha actual por defecto en el filtro de caja/control
    const filterDateEl = document.getElementById('filter-date');
    if (filterDateEl) filterDateEl.value = new Date().toISOString().split('T')[0];
});

// Función que se ejecuta al presionar el botón "Entrar al Sistema" en tu pantalla visual (PIN del negocio)
function validarPinPantalla() {
    const inputEl = document.getElementById('license-key-input');
    const errorEl = document.getElementById('activation-error');
    if (!inputEl) return;
    
    const ingreso = inputEl.value.trim();
    const pinRegistrado = localStorage.getItem('business_pin');

    if (!pinRegistrado) {
        // Primera vez: Guardamos el nuevo PIN del cliente
        if (ingreso.length < 4) {
            if (errorEl) {
                errorEl.innerText = "El PIN debe tener al menos 4 dígitos.";
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        localStorage.setItem('business_pin', ingreso);
        alert("¡PIN configurado con éxito!");
        abrirAplicacion();
    } else {
        // Veces siguientes: Validamos el PIN del cliente
        if (ingreso === pinRegistrado) {
            abrirAplicacion();
        } else {
            if (errorEl) {
                errorEl.innerText = "PIN incorrecto. Inténtalo de nuevo.";
                errorEl.classList.remove('hidden');
            }
            inputEl.value = "";
        }
    }
}

// Función para ocultar la pantalla de PIN y mostrar la app de trabajo
function abrirAplicacion() {
    const actScreen = document.getElementById('activation-screen');
    const mainApp = document.getElementById('main-app');
    
    if (actScreen) actScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

// Modo Oscuro / Claro
function initDarkMode() {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

function saveBusinessName() {
    const nameEl = document.getElementById('business-name');
    if (nameEl) localStorage.setItem('business_name', nameEl.value);
}

function saveBusinessAddress(address) {
    localStorage.setItem('business_address', address);
}

function loadBusinessData() {
    const savedName = localStorage.getItem('business_name');
    const savedLogo = localStorage.getItem('business_logo');
    const nameEl = document.getElementById('business-name');
    const logoEl = document.getElementById('business-logo');
    if (savedName && nameEl) nameEl.value = savedName;
    if (savedLogo && logoEl) logoEl.src = savedLogo;
}

function uploadLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoEl = document.getElementById('business-logo');
            if (logoEl) logoEl.src = e.target.result;
            localStorage.setItem('business_logo', e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Respaldo JSON: Exportar
function exportDataJSON() {
    const data = {
        tasks: tasks,
        expenses: expenses,
        business_name: localStorage.getItem('business_name'),
        business_logo: localStorage.getItem('business_logo'),
        business_address: localStorage.getItem('business_address')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_taller_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Respaldo JSON: Importar
function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tasks) { tasks = data.tasks; localStorage.setItem('pwa_tasks', JSON.stringify(tasks)); }
            if (data.expenses) { expenses = data.expenses; localStorage.setItem('pwa_expenses', JSON.stringify(expenses)); }
            if (data.business_name) localStorage.setItem('business_name', data.business_name);
            if (data.business_logo) localStorage.setItem('business_logo', data.business_logo);
            if (data.business_address) localStorage.setItem('business_address', data.business_address);
            loadBusinessData();
            renderTasks();
            alert('Backup importado correctamente.');
        } catch (err) {
            alert('Error al leer el archivo JSON de respaldo.');
        }
    };
    reader.readAsText(file);
}

function toggleConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) modal.classList.toggle('hidden');
}

function toggleDateFilterModal() {
    const panel = document.getElementById('date-filter-panel');
    if (panel) panel.classList.toggle('hidden');
}

function clearDateFilter() {
    const startEl = document.getElementById('filter-start-date');
    const endEl = document.getElementById('filter-end-date');
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
    renderTasks();
}
async function handleFormSubmit(event) {
    if (event) event.preventDefault();

    const price = parseFloat(document.getElementById('task-price').value) || 0;
    const advance = parseFloat(document.getElementById('task-advance').value) || 0;

    const imageInput = document.getElementById('task-image');
    let imageBase64 = null;

    // Convertimos la imagen cargada a Base64 si el usuario seleccionó una
    if (imageInput && imageInput.files && imageInput.files[0]) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(imageInput.files[0]);
        });
    }

    const newTask = {
        id: Date.now(),
        client: document.getElementById('client-name').value.trim(),
        phone: document.getElementById('client-phone').value.trim(),
        desc: document.getElementById('task-desc').value.trim(),
        price: price,
        advance: advance,
        rest: price - advance,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value,
        image: imageBase64, // Campo de imagen opcional integrado
        completedDate: null,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0]
    };

    tasks.push(newTask);
    saveAndRender();

    const form = document.getElementById('task-form') || document.querySelector('form');
    if (form) form.reset();
    if (imageInput) imageInput.value = '';
}

function saveAndRender() {
    try {
        localStorage.setItem('pwa_tasks', JSON.stringify(tasks));
        localStorage.setItem('pwa_expenses', JSON.stringify(expenses));
        renderTasks();
    } catch (e) {
        alert('⚠️ Almacenamiento lleno: El celular o navegador se quedó sin espacio para más fotos. Borra algunos registros antiguos o exporta tu respaldo JSON.');
        console.error("Error al guardar en LocalStorage:", e);
    }
}
function getTaskUrgencyStatus(dueDateStr, userPriority) {
    if (!dueDateStr) {
        if (userPriority === 'alta') return { label: '🔴 ALTA', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', isBlinking: false };
        if (userPriority === 'media') return { label: '🟡 MEDIA', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', isBlinking: false };
        return { label: '🟢 BAJA', colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', isBlinking: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: '🚨 VENCIDO', colorClass: 'bg-red-600 text-white font-bold', isBlinking: true };
    } else if (diffDays === 0) {
        return { label: '⚠️ ENTREGA HOY', colorClass: 'bg-red-500 text-white font-bold', isBlinking: true };
    } else if (diffDays === 1) {
        return { label: '⏳ ENTREGA MAÑANA', colorClass: 'bg-amber-500 text-white font-bold', isBlinking: false };
    } else {
        if (userPriority === 'alta') return { label: '🔴 ALTA', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', isBlinking: false };
        if (userPriority === 'media') return { label: '🟡 MEDIA', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', isBlinking: false };
        return { label: '🟢 BAJA', colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', isBlinking: false };
    }
}

// --- FILTRADO Y CONTADORES DE PRIORIDAD ---
function filterByPriority(priority) {
    currentPriorityFilter = priority;
    renderTasks();
}

function updatePriorityCounters(allTasks) {
    const activePendings = allTasks.filter(t => t.status === 'pending');
    const total = activePendings.length;
    const alta = activePendings.filter(t => t.priority === 'alta').length;
    const media = activePendings.filter(t => t.priority === 'media').length;
    const baja = activePendings.filter(t => t.priority === 'baja').length;

    if (document.getElementById('count-all')) document.getElementById('count-all').innerText = total;
    if (document.getElementById('count-alta')) document.getElementById('count-alta').innerText = alta;
    if (document.getElementById('count-media')) document.getElementById('count-media').innerText = media;
    if (document.getElementById('count-baja')) document.getElementById('count-baja').innerText = baja;
}

function renderTasks() {
    const listContainer = document.getElementById('tasks-list');
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    const startDateEl = document.getElementById('filter-start-date');
    const endDateEl = document.getElementById('filter-end-date');
    const startDate = startDateEl ? startDateEl.value : '';
    const endDate = endDateEl ? endDateEl.value : '';

    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    updatePriorityCounters(tasks);

    const pendingTasks = tasks.filter(t => {
        if (t.status !== 'pending') return false;
        if (currentPriorityFilter !== 'all' && t.priority !== currentPriorityFilter) return false;
        
        const matchesSearch = t.client.toLowerCase().includes(searchQuery) ||
                            t.phone.includes(searchQuery) ||
                            t.desc.toLowerCase().includes(searchQuery);
        if (!matchesSearch) return false;

        if (startDate && t.dueDate && t.dueDate < startDate) return false;
        if (endDate && t.dueDate && t.dueDate > endDate) return false;

        return true;
    });

    const pendingCountEl = document.getElementById('pending-count');
    if (pendingCountEl) pendingCountEl.innerText = tasks.filter(t => t.status === 'pending').length;

    if (pendingTasks.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-slate-400 text-xs py-6">No hay trabajos pendientes registrados con este filtro.</p>`;
        return;
    }

    pendingTasks.forEach(task => {
        const urgency = getTaskUrgencyStatus(task.dueDate, task.priority);
        const restAmount = task.price > 0 ? (task.price - task.advance) : 0;

        // Estructura de datos adaptada para que openSignatureModal reciba el objeto correctamente
        const taskObjStr = JSON.stringify(task).replace(/"/g, '&quot;');

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 ${urgency.isBlinking ? 'due-today' : ''}`;

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm">${task.client}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400">📱 ${task.phone || 'Sin número'}</p>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${urgency.colorClass}">${urgency.label}</span>
            </div>
            
            <p class="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">${task.desc}</p>

            ${task.image ? `
                <div class="mt-2 text-center">
                    <img src="${task.image}" alt="Evidencia" class="max-h-40 w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer" onclick="window.open('${task.image}', '_blank')">
                </div>
            ` : ''}

            ${task.price > 0 ? `
                <div class="flex justify-between text-xs bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-900 dark:text-blue-200 font-semibold border border-blue-100 dark:border-blue-800">
                    <span>Total: $${task.price.toFixed(2)}</span>
                    <span>Anticipo: $${task.advance.toFixed(2)}</span>
                    <span class="text-red-600 dark:text-red-400">Resta: $${restAmount.toFixed(2)}</span>
                </div>
            ` : ''}

            <div class="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>📅 Fecha Promesa: <strong>${task.dueDate || 'No asignada'}</strong></span>
            </div>

            <div class="grid grid-cols-5 gap-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onclick="editTask(${task.id})" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg text-[10px] flex items-center justify-center gap-0.5">✏️ Editar</button>
                <button onclick="sendWhatsApp(${task.id})" class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-[10px] flex items-center justify-center gap-0.5">💬 WA</button>
                <button onclick="openSignatureModal(${taskObjStr})" class="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-[10px] flex items-center justify-center gap-0.5">📄 PDF</button>
                <button onclick="generateThermalTicket(${task.id})" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg text-[10px] flex items-center justify-center gap-0.5">🖨️ Ticket</button>
                <button onclick="markAsCompleted(${task.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-[10px]">✅ Cobrar</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}
function markAsCompleted(id) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Encontramos el trabajo antes de actualizarlo para usar sus datos en el PDF
    const trabajoTerminado = tasks.find(t => t.id === id);

    // Actualizamos el estatus a completado
    tasks = tasks.map(t => t.id === id ? { ...t, status: 'completed', completedDate: todayStr } : t);
    saveAndRender();

    // Generamos y abrimos automáticamente el PDF de trabajo terminado y cobrado
    if (trabajoTerminado) {
        descargarReporteTerminadoPDF({ ...trabajoTerminado, completedDate: todayStr }, null);
    }
}
// --- PESTAÑAS Y CONTROL FINANCIERO ---
function switchTab(tabName) {
    const btnPending = document.getElementById('tab-pending-btn');
    const btnControl = document.getElementById('tab-control-btn');
    const btnNotes = document.getElementById('tab-notes-btn');
    
    const viewPending = document.getElementById('view-pending');
    const viewControl = document.getElementById('view-control');
    const viewNotes = document.getElementById('view-notes');

    // Ocultar todas las vistas
    if (viewPending) viewPending.classList.add('hidden');
    if (viewControl) viewControl.classList.add('hidden');
    if (viewNotes) viewNotes.classList.add('hidden');

    // Clases base para botones activos e inactivos
    const inactiveClass = "py-2 rounded-lg text-slate-600 dark:text-slate-400 transition";
    const activeClass = "py-2 rounded-lg bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white transition";

    // Resetear todos los botones a inactivo
    if (btnPending) btnPending.className = inactiveClass;
    if (btnControl) btnControl.className = inactiveClass;
    if (btnNotes) btnNotes.className = inactiveClass;

    // Activar la pestaña seleccionada
    if (tabName === 'pending') {
        if (btnPending) btnPending.className = activeClass;
        if (viewPending) viewPending.classList.remove('hidden');
        renderTasks();
    } else if (tabName === 'control') {
        if (btnControl) btnControl.className = activeClass;
        if (viewControl) viewControl.classList.remove('hidden');
        updateControlMetrics();
    } else if (tabName === 'notes') {
        if (btnNotes) btnNotes.className = activeClass;
        if (viewNotes) viewNotes.classList.remove('hidden');
        renderNotes();
    }
}
function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

function addExpense() {
    const reasonEl = document.getElementById('expense-reason');
    const amountEl = document.getElementById('expense-amount');
    const filterDateEl = document.getElementById('filter-date');

    const reason = reasonEl ? reasonEl.value.trim() : '';
    const amount = amountEl ? parseFloat(amountEl.value) : 0;
    const selectedDate = (filterDateEl && filterDateEl.value) ? filterDateEl.value : new Date().toISOString().split('T')[0];

    if (!reason || isNaN(amount) || amount <= 0) {
        alert('Por favor ingrese un motivo válido y un monto mayor a 0.');
        return;
    }

    expenses.push({ id: Date.now(), reason, amount, date: selectedDate });
    localStorage.setItem('pwa_expenses', JSON.stringify(expenses));

    if (reasonEl) reasonEl.value = '';
    if (amountEl) amountEl.value = '';
    updateControlMetrics();
}

function updateControlMetrics() {
    const filterDateEl = document.getElementById('filter-date');
    const selectedDate = (filterDateEl && filterDateEl.value) ? filterDateEl.value : new Date().toISOString().split('T')[0];
    
    if (filterDateEl && !filterDateEl.value) filterDateEl.value = selectedDate;

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    // Día
    const dayGross = tasks.filter(t => t.status === 'completed' && t.completedDate === selectedDate).reduce((s, t) => s + (t.price || 0), 0);
    const dayExpenses = expenses.filter(e => e.date === selectedDate).reduce((s, e) => s + e.amount, 0);
    const dayNet = dayGross - dayExpenses;

    // Semana
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekGross = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedDate) return false;
        const cDate = parseDate(t.completedDate);
        return cDate && cDate <= targetDate && cDate >= sevenDaysAgo;
    }).reduce((s, t) => s + (t.price || 0), 0);
    const weekExpenses = expenses.filter(e => {
        const eDate = parseDate(e.date);
        return eDate && eDate <= targetDate && eDate >= sevenDaysAgo;
    }).reduce((s, e) => s + e.amount, 0);
    const weekNet = weekGross - weekExpenses;

    // Mes
    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthGross = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedDate) return false;
        const cDate = parseDate(t.completedDate);
        return cDate && cDate <= targetDate && cDate >= thirtyDaysAgo;
    }).reduce((s, t) => s + (t.price || 0), 0);
    const monthExpenses = expenses.filter(e => {
        const eDate = parseDate(e.date);
        return eDate && eDate <= targetDate && eDate >= thirtyDaysAgo;
    }).reduce((s, e) => s + e.amount, 0);
    const monthNet = monthGross - monthExpenses;

    const setTxt = (id, txt) => { if (document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('badge-day-net', `$${dayNet.toFixed(2)}`);
    setTxt('day-gross', `$${dayGross.toFixed(2)}`);
    setTxt('day-expenses', `$${dayExpenses.toFixed(2)}`);
    setTxt('day-net', `$${dayNet.toFixed(2)}`);

    setTxt('badge-week-net', `$${weekNet.toFixed(2)}`);
    setTxt('week-gross', `$${weekGross.toFixed(2)}`);
    setTxt('week-expenses', `$${weekExpenses.toFixed(2)}`);
    setTxt('week-net', `$${weekNet.toFixed(2)}`);

    setTxt('badge-month-net', `$${monthNet.toFixed(2)}`);
    setTxt('month-gross', `$${monthGross.toFixed(2)}`);
    setTxt('month-expenses', `$${monthExpenses.toFixed(2)}`);
    setTxt('month-net', `$${monthNet.toFixed(2)}`);

    const updateGraph = (gross, exp, barIncId, barExpId, ratioTxtId) => {
        const total = gross + exp;
        let incPercent = 50, expPercent = 50;
        if (total > 0) {
            incPercent = Math.round((gross / total) * 100);
            expPercent = 100 - incPercent;
        } else {
            incPercent = 100;
            expPercent = 0;
        }
        if (document.getElementById(barIncId)) document.getElementById(barIncId).style.width = `${incPercent}%`;
        if (document.getElementById(barExpId)) document.getElementById(barExpId).style.width = `${expPercent}%`;
        if (document.getElementById(ratioTxtId)) document.getElementById(ratioTxtId).innerText = `${incPercent}% Ganancia / ${expPercent}% Gastos`;
    };

    updateGraph(dayGross, dayExpenses, 'day-bar-income', 'day-bar-expense', 'day-ratio-text');
    updateGraph(weekGross, weekExpenses, 'week-bar-income', 'week-bar-expense', 'week-ratio-text');
    updateGraph(monthGross, monthExpenses, 'month-bar-income', 'month-bar-expense', 'month-ratio-text');
}

// ==========================================
// REPORTE FINANCIERO DIARIO (Encabezado Unificado)
// ==========================================
function exportDailyReportPDF() {
    const filterDateEl = document.getElementById('filter-date');
    const selectedDate = (filterDateEl && filterDateEl.value) ? filterDateEl.value : new Date().toISOString().split('T')[0];
    
    const businessName = localStorage.getItem('business_name') || "Nombre del Negocio";
    const businessAddress = localStorage.getItem('business_address') || "Dirección no especificada";
    const businessPhone = localStorage.getItem('business_phone') || "Teléfono no especificado";
    const businessLogo = localStorage.getItem('business_logo') || "";
    const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const dayTasks = tasks.filter(t => t.status === 'completed' && t.completedDate === selectedDate);
    const dayOuts = expenses.filter(e => e.date === selectedDate);

    const totalIn = dayTasks.reduce((s, t) => s + (t.price || 0), 0);
    const totalOut = dayOuts.reduce((s, e) => s + e.amount, 0);
    const net = totalIn - totalOut;

    let tasksRows = dayTasks.map((t, i) => `
        <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${t.client}</strong></td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${t.desc}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #16a34a;">$${t.price.toFixed(2)}</td>
        </tr>
    `).join('');
    if (dayTasks.length === 0) tasksRows = `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #888;">Sin ingresos registrados en este día.</td></tr>`;

    let outsRows = dayOuts.map((e, i) => `
        <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${e.reason}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">-$${e.amount.toFixed(2)}</td>
        </tr>
    `).join('');
    if (dayOuts.length === 0) outsRows = `<tr><td colspan="3" style="text-align: center; padding: 10px; color: #888;">Sin salidas registradas en este día.</td></tr>`;

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Corte Diario - ${businessName} (${selectedDate})</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; font-size: 12px; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
                .header-left { max-width: 65%; }
                .doc-title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase; }
                .company-info { font-size: 11px; color: #475569; margin-bottom: 2px; }
                .header-right { text-align: right; }
                .logo { max-height: 55px; max-width: 110px; object-fit: contain; border-radius: 4px; }
                .section-title { background: #f1f5f9; padding: 6px 10px; font-weight: bold; margin-top: 15px; border-radius: 4px; border-left: 4px solid #0f172a; font-size: 11px; text-transform: uppercase; color: #1e293b; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { background: #1e293b; color: white; padding: 6px; text-align: left; font-size: 11px; }
                .summary { margin-top: 20px; background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1 class="doc-title">${businessName}</h1>
                    <div class="company-info" style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">📊 Reporte Financiero Diario</div>
                    <div class="company-info">📅 <strong>Emisión:</strong> ${fechaActual} | 🎯 <strong>Fecha del Corte:</strong> ${selectedDate}</div>
                    <div class="company-info">📍 <strong>Dirección:</strong> ${businessAddress}</div>
                    <div class="company-info">📞 <strong>Teléfono:</strong> ${businessPhone}</div>
                </div>
                <div class="header-right">
                    ${businessLogo ? `<img src="${businessLogo}" class="logo" alt="Logo">` : ''}
                </div>
            </div>

            <div class="section-title">1. Trabajos Cobrados / Ingresos</div>
            <table>
                <thead><tr><th style="text-align:center;">#</th><th>Cliente</th><th>Descripción</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>${tasksRows}</tbody>
            </table>

            <div class="section-title">2. Salidas / Gastos Registrados</div>
            <table>
                <thead><tr><th style="text-align:center;">#</th><th>Motivo / Concepto</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>${outsRows}</tbody>
            </table>

            <div class="summary">
                <div><strong>(+) Total Ingresos Brutos:</strong> $${totalIn.toFixed(2)}</div>
                <div><strong>(-) Total Salidas / Gastos:</strong> -$${totalOut.toFixed(2)}</div>
                <hr style="border: 0; border-top: 1px solid #ccc; margin: 8px 0;">
                <div style="font-size: 14px; color: #0f172a;"><strong>(=) Balance Neto del Día:</strong> $${net.toFixed(2)}</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}

// ==========================================
// REPORTE FINANCIERO SEMANAL (Encabezado Unificado)
// ==========================================
function exportWeeklyReportPDF() {
    const filterDateEl = document.getElementById('filter-date');
    const selectedDate = (filterDateEl && filterDateEl.value) ? filterDateEl.value : new Date().toISOString().split('T')[0];
    
    const businessName = localStorage.getItem('business_name') || "Nombre del Negocio";
    const businessAddress = localStorage.getItem('business_address') || "Dirección no especificada";
    const businessPhone = localStorage.getItem('business_phone') || "Teléfono no especificado";
    const businessLogo = localStorage.getItem('business_logo') || "";
    const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const parseDate = (dStr) => {
        if (!dStr) return null;
        const [y, m, d] = dStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const targetDate = parseDate(selectedDate);
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekTasks = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedDate) return false;
        const cDate = parseDate(t.completedDate);
        return cDate && cDate <= targetDate && cDate >= sevenDaysAgo;
    });

    const weekOuts = expenses.filter(e => {
        const eDate = parseDate(e.date);
        return eDate && eDate <= targetDate && eDate >= sevenDaysAgo;
    });

    const totalIn = weekTasks.reduce((s, t) => s + (t.price || 0), 0);
    const totalOut = weekOuts.reduce((s, e) => s + e.amount, 0);
    const net = totalIn - totalOut;

    let tasksRows = weekTasks.map((t, i) => `
        <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${t.completedDate}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${t.client}</strong></td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${t.desc}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #16a34a;">$${t.price.toFixed(2)}</td>
        </tr>
    `).join('');
    if (weekTasks.length === 0) tasksRows = `<tr><td colspan="5" style="text-align: center; padding: 10px; color: #888;">Sin ingresos registrados en esta semana.</td></tr>`;

    let outsRows = weekOuts.map((e, i) => `
        <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${e.date}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${e.reason}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">-$${e.amount.toFixed(2)}</td>
        </tr>
    `).join('');
    if (weekOuts.length === 0) outsRows = `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #888;">Sin salidas registradas en esta semana.</td></tr>`;

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Corte Semanal - ${businessName} (${selectedDate})</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; font-size: 12px; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
                .header-left { max-width: 65%; }
                .doc-title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase; }
                .company-info { font-size: 11px; color: #475569; margin-bottom: 2px; }
                .header-right { text-align: right; }
                .logo { max-height: 55px; max-width: 110px; object-fit: contain; border-radius: 4px; }
                .section-title { background: #f1f5f9; padding: 6px 10px; font-weight: bold; margin-top: 15px; border-radius: 4px; border-left: 4px solid #0f172a; font-size: 11px; text-transform: uppercase; color: #1e293b; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { background: #1e293b; color: white; padding: 6px; text-align: left; font-size: 11px; }
                .summary { margin-top: 20px; background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1 class="doc-title">${businessName}</h1>
                    <div class="company-info" style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">📈 Reporte Financiero Semanal</div>
                    <div class="company-info">📅 <strong>Emisión:</strong> ${fechaActual} | ⏳ <strong>Periodo (7 días hasta):</strong> ${selectedDate}</div>
                    <div class="company-info">📍 <strong>Dirección:</strong> ${businessAddress}</div>
                    <div class="company-info">📞 <strong>Teléfono:</strong> ${businessPhone}</div>
                </div>
                <div class="header-right">
                    ${businessLogo ? `<img src="${businessLogo}" class="logo" alt="Logo">` : ''}
                </div>
            </div>

            <div class="section-title">1. Trabajos Cobrados / Ingresos de la Semana</div>
            <table>
                <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Fecha</th><th>Cliente</th><th>Descripción</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>${tasksRows}</tbody>
            </table>

            <div class="section-title">2. Salidas / Gastos de la Semana</div>
            <table>
                <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Fecha</th><th>Motivo / Concepto</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>${outsRows}</tbody>
            </table>

            <div class="summary">
                <div><strong>(+) Total Ingresos Semanales:</strong> $${totalIn.toFixed(2)}</div>
                <div><strong>(-) Total Salidas Semanales:</strong> -$${totalOut.toFixed(2)}</div>
                <hr style="border: 0; border-top: 1px solid #ccc; margin: 8px 0;">
                <div style="font-size: 14px; color: #0f172a;"><strong>(=) Balance Neto Semanal:</strong> $${net.toFixed(2)}</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}
// ==========================================
// 2. MANEJO DEL CANVAS DE FIRMA DIGITAL
// ==========================================
function initSignaturePad() {
    signatureCanvas = document.getElementById('signature-pad');
    if (!signatureCanvas) return;
    
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth = 2;
    signatureCtx.strokeStyle = '#000000';

    // Eventos Mouse
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseleave', stopDrawing);

    // Eventos Táctiles (Celular / Tablet)
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY, rect });
    });
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    });
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function getCanvasCoords(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoords(e);
    signatureCtx.beginPath();
    signatureCtx.moveTo(coords.x, coords.y);
}

function draw(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    signatureCtx.lineTo(coords.x, coords.y);
    signatureCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearSignature() {
    if (signatureCtx && signatureCanvas) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

// Abrir el modal de firma al presionar "PDF" en un trabajo
function openSignatureModal(trabajo) {
    currentWorkForPDF = trabajo;
    clearSignature();
    const modal = document.getElementById('signature-modal');
    if (modal) modal.classList.remove('hidden');
}

// Opción 1: Generar con la firma dibujada
function confirmSinglePDFWithSignature() {
    if (!signatureCanvas) return;
    const signatureDataURL = signatureCanvas.toDataURL('image/png');
    closeSignatureModal();
    descargarReportePDF(currentWorkForPDF, signatureDataURL);
}

// Opción 2: Generar sin firma digital (para firmar a lapicero)
function closeSignatureModalWithoutSignature() {
    closeSignatureModal();
    descargarReportePDF(currentWorkForPDF, null);
}

function closeSignatureModal() {
    const modal = document.getElementById('signature-modal');
    if (modal) modal.classList.add('hidden');
}
// Guardar el teléfono del negocio en tiempo real desde la configuración
function saveBusinessPhone(phone) {
    localStorage.setItem('business_phone', phone);
}

// Cargar el teléfono guardado al iniciar la aplicación (agrégalo dentro de tu DOMContentLoaded)
// const savedPhone = localStorage.getItem('business_phone');
// if (savedPhone) { const inputPhone = document.getElementById('input-business-phone'); if (inputPhone) inputPhone.value = savedPhone; }
// ==========================================
// 3. GENERACIÓN Y DESCARGA DEL REPORTE PDF (General / Negocios)
// ==========================================

function descargarReportePDF(trabajo, dataURLFirma = null) {
    if (!trabajo) return;

    const businessName = localStorage.getItem('business_name') || "Nombre del Negocio";
    const businessAddress = localStorage.getItem('business_address') || "Dirección no especificada";
    const businessPhone = localStorage.getItem('business_phone') || "Teléfono no especificado";
    const businessLogo = localStorage.getItem('business_logo') || "";
    
    const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const total = parseFloat(trabajo.price || trabajo.total) || 0;
    const anticipo = parseFloat(trabajo.advance || trabajo.anticipo) || 0;
    const resto = total - anticipo;
    const estatusTexto = (trabajo.status === 'completed' || trabajo.estatus === 'Terminado') ? "🟢 TRABAJO FINALIZADO Y ENTREGADO" : "🟡 TRABAJO EN PROCESO / EN REVISIÓN";

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orden_Servicio_${trabajo.client || 'Cliente'}_${trabajo.id || '001'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; font-size: 12px; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
                .header-left { max-width: 65%; }
                .doc-title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase; }
                .company-info { font-size: 11px; color: #475569; margin-bottom: 2px; }
                .header-right { text-align: right; }
                .logo { max-height: 55px; max-width: 110px; object-fit: contain; border-radius: 4px; }
                .status-badge { background: #f1f5f9; padding: 5px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #0f172a; color: #334155; display: inline-block; }
                .section-title { background: #f8fafc; padding: 5px 8px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; border-radius: 4px; border-left: 4px solid #2563eb; font-size: 11px; text-transform: uppercase; color: #1e293b; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
                .info-item { margin-bottom: 3px; }
                .info-item strong { color: #334155; }
                .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 8px; min-height: 35px; }
                .totals-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 10px; border-radius: 6px; margin-top: 8px; font-size: 12px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .terms-text { font-size: 9px; color: #64748b; margin-top: 15px; text-align: justify; line-height: 1.3; border-top: 1px solid #e2e8f0; padding-top: 8px; }
                .signatures-section { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; }
                .sig-box { width: 42%; }
                .sig-line { border-bottom: 1px solid #64748b; padding-bottom: 30px; margin-bottom: 4px; }
                .sig-img { max-height: 50px; display: block; margin: 0 auto 2px auto; object-fit: contain; }
                .sig-label { font-size: 10px; color: #475569; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1 class="doc-title">${businessName}</h1>
                    <div class="company-info" style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">📝 Orden de Servicio y Contrato</div>
                    <div class="company-info">📅 <strong>Emisión:</strong> ${fechaActual}</div>
                    <div class="company-info">📍 <strong>Dirección:</strong> ${businessAddress}</div>
                    <div class="company-info">📞 <strong>Teléfono:</strong> ${businessPhone}</div>
                    <div class="company-info" style="margin-top: 4px;">🔖 <strong>Folio / ID:</strong> #${trabajo.id || '001'}</div>
                </div>
                <div class="header-right">
                    ${businessLogo ? `<img src="${businessLogo}" class="logo" alt="Logo Empresa">` : ''}
                </div>
            </div>

            <div class="status-badge">${estatusTexto}</div>

            <div class="section-title">Datos del Cliente y Servicio</div>
            <div class="info-grid">
                <div class="info-item"><strong>Cliente:</strong> ${trabajo.client || trabajo.cliente || 'General'}</div>
                <div class="info-item"><strong>Teléfono:</strong> ${trabajo.phone || trabajo.telefono || 'No registrado'}</div>
                <div class="info-item"><strong>Concepto / Artículo:</strong> ${trabajo.articulo || trabajo.vehiculo || 'Servicio General'}</div>
                <div class="info-item"><strong>Fecha Promesa:</strong> ${trabajo.dueDate || 'No asignada'}</div>
                <div class="info-item" style="grid-column: span 2;"><strong>Detalles / Especificaciones:</strong> ${trabajo.detallesExtra || trabajo.detallesAuto || 'N/A'}</div>
            </div>

<div class="section-title">Descripción del Trabajo Solicitado / Realizado</div>
            <div class="desc-box">
                ${trabajo.desc || trabajo.descripcion || 'Sin descripciones adicionales.'}
                
                <!-- AQUÍ AGREGAMOS LA IMAGEN PARA QUE SALGA EN EL PDF -->
                ${trabajo.image ? `<img src="${trabajo.image}" alt="Evidencia" width="80" style="width: 80px !important; max-width: 80px !important; height: auto !important; border-radius: 4px; display: block; margin-top: 8px;">` : ''}
                </div>
            <div class="totals-box">
                <div class="total-row"><span><strong>Costo Total del Servicio:</strong></span> <span>$${total.toFixed(2)} MXN</span></div>
                <div class="total-row"><span><strong>Anticipo / Depósito:</strong></span> <span>$${anticipo.toFixed(2)} MXN</span></div>
                <div class="total-row" style="color: #dc2626; font-size: 13px; border-top: 1px dashed #bfdbfe; padding-top: 4px; margin-top: 3px;">
                    <span><strong>Resta Pendiente a Pagar:</strong></span> <span><strong>$${resto.toFixed(2)} MXN</strong></span>
                </div>
            </div>

            <div class="terms-text">
                * <strong>Términos y Condiciones:</strong> El cliente autoriza la realización del servicio o trabajo especificado. La empresa no se hace responsable por artículos o equipos no retirados después de 30 días naturales posteriores a la fecha de aviso de terminación.
            </div>

            <div class="signatures-section">
                <div class="sig-box">
                    ${dataURLFirma ? `<img src="${dataURLFirma}" class="sig-img" alt="Firma Cliente">` : '<div class="sig-line"></div>'}
                    ${!dataURLFirma ? '' : '<div style="border-bottom: 1px solid #64748b; margin-bottom: 4px;"></div>'}
                    <div class="sig-label">Firma de Conformidad (Cliente)</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Firma / Sello del Establecimiento</div>
                </div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}// ==========================================
// REPORTE PDF DE TRABAJO TERMINADO / ENTREGADO
// ==========================================
function descargarReporteTerminadoPDF(trabajo, dataURLFirma = null) {
    if (!trabajo) return;

    const businessName = localStorage.getItem('business_name') || "Nombre del Negocio";
    const businessAddress = localStorage.getItem('business_address') || "Dirección no especificada";
    const businessPhone = localStorage.getItem('business_phone') || "Teléfono no especificado";
    const businessLogo = localStorage.getItem('business_logo') || "";
    
    const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const fechaEntrega = trabajo.completedDate || fechaActual;
    const total = parseFloat(trabajo.price || trabajo.total) || 0;
    const anticipo = parseFloat(trabajo.advance || trabajo.anticipo) || 0;
    const resto = total - anticipo;

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobante_Terminado_${trabajo.client || 'Cliente'}_${trabajo.id || '001'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; font-size: 12px; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
                .header-left { max-width: 65%; }
                .doc-title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase; }
                .company-info { font-size: 11px; color: #475569; margin-bottom: 2px; }
                .header-right { text-align: right; }
                .logo { max-height: 55px; max-width: 110px; object-fit: contain; border-radius: 4px; }
                .status-badge { background: #dcfce7; color: #166534; padding: 6px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid #16a34a; display: inline-block; }
                .section-title { background: #f1f5f9; padding: 6px 10px; font-weight: bold; margin-top: 15px; border-radius: 4px; border-left: 4px solid #16a34a; font-size: 11px; text-transform: uppercase; color: #1e293b; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
                .info-item { margin-bottom: 3px; }
                .info-item strong { color: #334155; }
                .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 8px; min-height: 35px; }
                .totals-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 6px; margin-top: 12px; font-size: 12px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .signatures-section { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
                .sig-box { width: 42%; }
                .sig-line { border-bottom: 1px solid #64748b; padding-bottom: 30px; margin-bottom: 4px; }
                .sig-img { max-height: 50px; display: block; margin: 0 auto 2px auto; object-fit: contain; }
                .sig-label { font-size: 10px; color: #475569; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1 class="doc-title">${businessName}</h1>
                    <div class="company-info" style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">✅ Comprobante de Trabajo Terminado y Entregado</div>
                    <div class="company-info">📅 <strong>Fecha de Emisión:</strong> ${fechaActual} | 🏁 <strong>Entrega:</strong> ${fechaEntrega}</div>
                    <div class="company-info">📍 <strong>Dirección:</strong> ${businessAddress}</div>
                    <div class="company-info">📞 <strong>Teléfono:</strong> ${businessPhone}</div>
                    <div class="company-info" style="margin-top: 4px;">🔖 <strong>Folio / ID:</strong> #${trabajo.id || '001'}</div>
                </div>
                <div class="header-right">
                    ${businessLogo ? `<img src="${businessLogo}" class="logo" alt="Logo Empresa">` : ''}
                </div>
            </div>

            <div class="status-badge">🟢 SERVICIO CONCLUIDO Y ENTREGADO SATISFACTORIAMENTE</div>

            <div class="section-title">Datos del Cliente y Servicio Realizado</div>
            <div class="info-grid">
                <div class="info-item"><strong>Cliente:</strong> ${trabajo.client || trabajo.cliente || 'General'}</div>
                <div class="info-item"><strong>Teléfono:</strong> ${trabajo.phone || trabajo.telefono || 'No registrado'}</div>
                <div class="info-item"><strong>Concepto / Artículo:</strong> ${trabajo.articulo || trabajo.vehiculo || 'Servicio General'}</div>
                <div class="info-item"><strong>Fecha de Solicitud:</strong> ${trabajo.dueDate || 'N/A'}</div>
                <div class="info-item" style="grid-column: span 2;"><strong>Detalles / Especificaciones:</strong> ${trabajo.detallesExtra || trabajo.detallesAuto || 'N/A'}</div>
            </div>

<div class="section-title">Descripción del Trabajo Ejecutado</div>
            <div class="desc-box">
                ${trabajo.desc || trabajo.descripcion || 'Sin descripciones adicionales.'}
                
                <!-- Foto adjunta en el Reporte Terminado -->
               ${trabajo.image ? `<img src="${trabajo.image}" alt="Evidencia" width="80" style="width: 80px !important; max-width: 80px !important; height: auto !important; border-radius: 4px; display: block; margin-top: 8px;">` : ''}
                </div>
            <div class="totals-box">
                <div class="total-row"><span><strong>Costo Total del Servicio:</strong></span> <span>$${total.toFixed(2)} MXN</span></div>
                <div class="total-row"><span><strong>Anticipo Abonado Anteriormente:</strong></span> <span>-$${anticipo.toFixed(2)} MXN</span></div>
                <div class="total-row" style="color: #16a34a; font-size: 13px; border-top: 1px dashed #bbf7d0; padding-top: 6px; margin-top: 4px;">
                    <span><strong>Total Liquidado / Pagado:</strong></span> <span><strong>$${resto > 0 ? resto.toFixed(2) : total.toFixed(2)} MXN</strong></span>
                </div>
            </div>

            <div class="signatures-section">
                <div class="sig-box">
                    ${dataURLFirma ? `<img src="${dataURLFirma}" class="sig-img" alt="Firma Recibido">` : '<div class="sig-line"></div>'}
                    ${!dataURLFirma ? '' : '<div style="border-bottom: 1px solid #64748b; margin-bottom: 4px;"></div>'}
                    <div class="sig-label">Recibió de Conformidad (Cliente)</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Firma / Sello del Establecimiento</div>
                </div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}

// ==========================================
// 4. TICKETS Y WHATSAPP
// ==========================================
function generateThermalTicket(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const businessName = localStorage.getItem('business_name') || "Mi Negocio / Taller";
    const restAmount = task.price > 0 ? (task.price - task.advance) : 0;

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket - ${task.client}</title>
            <style>
                body { font-family: monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                hr { border: dashed 1px #000; margin: 8px 0; }
            </style>
        </head>
        <body>
            <div class="center bold" style="font-size: 14px;">${businessName}</div>
            <div class="center">TICKET DE SERVICIO</div>
            <hr>
            <div><strong>Cliente:</strong> ${task.client}</div>
            <div><strong>Tel:</strong> ${task.phone || 'N/A'}</div>
            <div><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
            <hr>
            <div><strong>Servicio:</strong></div>
            <div>${task.desc}</div>
            <hr>
            <div>Total: $${task.price.toFixed(2)}</div>
            <div>Anticipo: $${task.advance.toFixed(2)}</div>
            <div class="bold">Resta: $${restAmount.toFixed(2)}</div>
            <hr>
            <div class="center" style="font-size: 10px; margin-top: 10px;">¡Gracias por su preferencia!</div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
}

function sendWhatsApp(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.phone) return alert("Sin teléfono registrado.");
    const rest = task.price > 0 ? (task.price - task.advance) : 0;
    const msg = `¡Hola ${task.client}! Su trabajo ("${task.desc}") ya está listo. Restante: $${rest.toFixed(2)}.`;
    window.open(`https://wa.me/52${task.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openSupportWhatsApp() {
    const myNumber = "9531647937";
    const businessName = localStorage.getItem('business_name') || "Taller Sin Nombre";
    const message = `¡Hola! 👋🏼 Necesito soporte técnico o mantenimiento con la aplicación.\n\n` +
                    `🏢 *Negocio:* ${businessName}\n` +
                    `💬 *Duda o problema:* `;
    window.open(`https://wa.me/${myNumber}?text=${encodeURIComponent(message)}`, '_blank');
}// ==========================================
// REGISTRO DEL SERVICE WORKER (Modo Offline)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado correctamente:', reg.scope))
            .catch(err => console.log('Error al registrar el Service Worker:', err));
    });
}
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newClient = prompt("Cliente:", task.client);
    if (newClient === null) return;

    const newPhone = prompt("Teléfono:", task.phone || "");
    if (newPhone === null) return;

    const newDesc = prompt("Descripción del trabajo:", task.desc);
    if (newDesc === null) return;

    const newPrice = prompt("Costo total ($):", task.price);
    if (newPrice === null) return;

    const newAdvance = prompt("Anticipo ($):", task.advance);
    if (newAdvance === null) return;

    // Actualizamos los datos de texto y montos
    task.client = newClient.trim() || task.client;
    task.phone = newPhone.trim();
    task.desc = newDesc.trim() || task.desc;
    task.price = parseFloat(newPrice) || 0;
    task.advance = parseFloat(newAdvance) || 0;
    task.rest = task.price - task.advance;

    // Opción para adjuntar o cambiar foto/evidencia
    if (confirm("¿Deseas cambiar o agregar una foto/evidencia a este registro?")) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400;  
                        const MAX_HEIGHT = 400; 
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Comprimimos a JPEG con calidad 0.5 (ocupa mínimos KB y se sigue viendo bien)
                        task.image = canvas.toDataURL('image/jpeg', 0.4);
                        saveAndRender();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                saveAndRender();
            }   
        }; // <-- Aquí cierra el onchange
        fileInput.click();
    } else {
        saveAndRender();
    }
} // <-- Aquí cierra la función editTask

function saveNote() {
    const input = document.getElementById('note-input');
    if (!input || !input.value.trim()) {
        alert('Por favor escribe algo en la nota.');
        return;
    }

    const newNote = {
        id: Date.now(),
        text: input.value.trim(),
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };

    notes.unshift(newNote);
    localStorage.setItem('pwa_notes', JSON.stringify(notes));
    input.value = '';
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notes-list');
    if (!container) return;
    container.innerHTML = '';

    if (notes.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 text-xs py-6">No hay notas guardadas.</p>`;
        return;
    }

    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2";
        
        card.innerHTML = `
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>🕒 ${note.date}</span>
                <div class="flex gap-2">
                    <button onclick="editNote(${note.id})" class="text-blue-500 hover:text-blue-600 font-bold">✏️ Editar</button>
                    <button onclick="deleteNote(${note.id})" class="text-red-500 hover:text-red-600 font-bold">🗑️ Borrar</button>
                </div>
            </div>
            <p class="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">${note.text}</p>
        `;
        container.appendChild(card);
    });
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const newText = prompt("Editar nota:", note.text);
    if (newText !== null && newText.trim() !== "") {
        note.text = newText.trim();
        localStorage.setItem('pwa_notes', JSON.stringify(notes));
        renderNotes();
    }
}

function deleteNote(id) {
    if (confirm('¿Deseas eliminar esta nota?')) {
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('pwa_notes', JSON.stringify(notes));
        renderNotes();
    }
}
document.getElementById('task-image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;  
                const MAX_HEIGHT = 400; 
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Guardar comprimida en la variable temporal
                imagenBase64Temp = canvas.toDataURL('image/jpeg', 0.4);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});