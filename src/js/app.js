document.addEventListener('DOMContentLoaded', initApp);

let form, submitBtn, loader, resultsArea, connectionStatus, statusText, statusIndicator;

function initApp() {
    form = document.getElementById('paymentForm');
    submitBtn = document.getElementById('submitBtn');
    loader = document.getElementById('loader');
    resultsArea = document.getElementById('resultsArea');
    connectionStatus = document.getElementById('connectionStatus');
    statusText = document.getElementById('statusText');
    statusIndicator = document.getElementById('statusIndicator');

    form.addEventListener('submit', handleSubmit);
    checkConnection();
    registerServiceWorker();

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    document.getElementById('cardNumber').addEventListener('input', formatCard);
    document.getElementById('expiryDate').addEventListener('input', formatExpiry);
    document.getElementById('cvv').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
}

// =========================================================
// Registra el Service Worker de la PWA
// =========================================================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('js/sw.js')
            .then(reg => console.log('SW registrado:', reg.scope))
            .catch(err => console.error('Error SW:', err));
    }
}

// =========================================================
// Promise.resolve() y Promise.reject(): Verifica el estado de conexión a internet
// =========================================================
function checkConnection() {
    const connectionPromise = navigator.onLine 
        ? Promise.resolve('Conectado')
        : Promise.reject('Sin conexión');

    connectionPromise
        .then(msg => {
            statusText.textContent = 'Conectado a Internet';
            connectionStatus.className = 'status online';
        })
        .catch(err => {
            statusText.textContent = 'Sin conexión a Internet';
            connectionStatus.className = 'status offline';
        });
}

// === FORMATEO DE INPUTS ===
function formatCard(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formatted;
}

function formatExpiry(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
}

// === MANEJO DEL FORMULARIO ===
function handleSubmit(e) {
    e.preventDefault();
    
    showLoader();
    hideResults();

    const data = {
        customerName: document.getElementById('customerName').value,
        idNumber: document.getElementById('idNumber').value,
        cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, ''),
        expiryDate: document.getElementById('expiryDate').value,
        cvv: document.getElementById('cvv').value,
        amount: parseFloat(document.getElementById('amount').value),
        timestamp: new Date().toISOString()
    };

    // =========================================================
    // Encadenamiento de Promesas: Procesa el pago con manejo de éxito, error y finalización
    // =========================================================
    processPayment(data)
        .then(result => {
            console.log('Pago exitoso:', result);
            showSuccess(result);
        })
        .catch(error => {
            console.error('Error:', error);
            showError(error);
        })
        .finally(() => {
            hideLoader();
            console.log('Proceso finalizado');
        });
}

// =========================================================
// Promise.all(): Valida todas las condiciones en paralelo. Si una falla, todas fallan
// =========================================================
function processPayment(data) {
    console.log('Procesando pago...');

    return Promise.all([
        validateConnection(),
        validateCard(data.cardNumber),
        validateCVV(data.cvv),
        validateExpiry(data.expiryDate)
    ])
    .then(validations => {
        console.log('Validaciones OK:', validations);
        
        // =========================================================
        // Promise.race(): Compite entre el procesamiento y timeout
        // =========================================================
        return Promise.race([
            simulateProcessing(data),
            simulateTimeout(3000)
        ]);
    })
    .then(paymentResult => {
        console.log('Pago procesado:', paymentResult);
        
        // =========================================================
        // Promise.allSettled(): Ejecuta tareas post-pago sin importar si algunas fallan
        // =========================================================
        return executePostTasks(paymentResult);
    });
}

// =========================================================
// new Promise(): Crea Promises personalizadas para validaciones asíncronas
// =========================================================
function validateConnection() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (navigator.onLine) {
                resolve('Conexión OK');
            } else {
                reject(new Error('No hay conexión a internet'));
            }
        }, 100);
    });
}

function validateCard(cardNumber) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (cardNumber.length === 16 && /^\d+$/.test(cardNumber)) {
                resolve('Tarjeta válida');
            } else {
                reject(new Error('El número de tarjeta debe tener 16 dígitos'));
            }
        }, 100);
    });
}

function validateCVV(cvv) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (cvv.length === 3 && /^\d+$/.test(cvv)) {
                resolve('CVV válido');
            } else {
                reject(new Error('El CVV debe tener 3 dígitos'));
            }
        }, 100);
    });
}

function validateExpiry(expiry) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
            if (!regex.test(expiry)) {
                reject(new Error('Formato de fecha inválido (MM/AA)'));
                return;
            }

            const [month, year] = expiry.split('/');
            const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
            
            if (expiryDate > new Date()) {
                resolve('Fecha válida');
            } else {
                reject(new Error('La tarjeta ha expirado'));
            }
        }, 100);
    });
}

function simulateProcessing(data) {
    return new Promise((resolve) => {
        console.log('Procesando...');
        setTimeout(() => {
            const txnId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            resolve({
                success: true,
                transactionId: txnId,
                amount: data.amount,
                customerName: data.customerName,
                timestamp: new Date().toISOString(),
                message: 'Pago procesado exitosamente'
            });
        }, 2000);
    });
}

function simulateTimeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout: El servidor tardó demasiado'));
        }, ms);
    });
}

function executePostTasks(paymentResult) {
    console.log('Ejecutando tareas post-pago...');

    return Promise.allSettled([
        sendEmail(paymentResult),
        updateInventory(paymentResult),
        logTransaction(paymentResult),
        notifyWarehouse(paymentResult)
    ])
    .then(results => {
        console.log('Tareas completadas:', results);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        return {
            ...paymentResult,
            postTasks: {
                total: results.length,
                successful: successful
            }
        };
    });
}

function sendEmail(result) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            Math.random() > 0.1 
                ? resolve('Email enviado') 
                : reject(new Error('Error email'));
        }, 500);
    });
}

function updateInventory(result) {
    return new Promise(resolve => {
        setTimeout(() => resolve('Inventario actualizado'), 300);
    });
}

function logTransaction(result) {
    return new Promise(resolve => {
        setTimeout(() => resolve('Transacción registrada'), 400);
    });
}

function notifyWarehouse(result) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            Math.random() > 0.2 
                ? resolve('Almacén notificado') 
                : reject(new Error('Error almacén'));
        }, 600);
    });
}

// === UI HELPERS ===
function showLoader() {
    loader.classList.remove('hidden');
    submitBtn.disabled = true;
}

function hideLoader() {
    loader.classList.add('hidden');
    submitBtn.disabled = false;
}

function hideResults() {
    resultsArea.classList.add('hidden');
}

function showSuccess(result) {
    resultsArea.className = 'results success';
    resultsArea.innerHTML = `
        <div class="result-icon">✅</div>
        <div class="result-message">${result.message}</div>
        <div class="result-item">
            <strong>ID Transacción:</strong> ${result.transactionId}
        </div>
        <div class="result-item">
            <strong>Cliente:</strong> ${result.customerName}
        </div>
        <div class="result-item">
            <strong>Monto:</strong> $${result.amount.toFixed(2)}
        </div>
        <div class="result-item">
            <strong>Fecha:</strong> ${new Date(result.timestamp).toLocaleString('es-ES')}
        </div>
        ${result.postTasks ? `
        <div class="result-item">
            <strong>Tareas completadas:</strong> ${result.postTasks.successful}/${result.postTasks.total}
        </div>` : ''}
    `;
    resultsArea.classList.remove('hidden');
    setTimeout(() => form.reset(), 1000);
}

function showError(error) {
    resultsArea.className = 'results error';
    resultsArea.innerHTML = `
        <div class="result-icon">❌</div>
        <div class="result-message">Error en el procesamiento</div>
        <div class="result-item">
            <strong>Error:</strong> ${error.message || error}
        </div>
        <div class="result-item">
            <strong>Recomendación:</strong> Verifica los datos e intenta nuevamente
        </div>
    `;
    resultsArea.classList.remove('hidden');
}

console.log('App cargada - Promises listas');
