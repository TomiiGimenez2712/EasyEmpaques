/**
 * UI Component for custom Modals and Alerts
 * Adapted for Empaque Sapucay
 */
const UI = {
    showModal: function({ title, message, type = 'info', confirmText = 'Aceptar', cancelText = 'Cancelar', onConfirm = null }) {
        // Eliminar modal anterior si existe
        const existing = document.getElementById('ui-global-modal');
        if (existing) existing.remove();

        // Determinar colores y botón de confirmación basados en tipo
        let icon = 'info';
        let colorClass = 'text-brand-500';
        let bgIconClass = 'bg-brand-50';
        let btnConfirmClass = 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30';

        if (type === 'error') {
            icon = 'error';
            colorClass = 'text-red-500';
            bgIconClass = 'bg-red-50';
            btnConfirmClass = 'bg-red-600 hover:bg-red-700 shadow-red-500/30';
        } else if (type === 'success') {
            icon = 'check_circle';
            colorClass = 'text-green-500';
            bgIconClass = 'bg-green-50';
            btnConfirmClass = 'bg-green-600 hover:bg-green-700 shadow-green-500/30';
        } else if (type === 'confirm') {
            icon = 'help';
            colorClass = 'text-amber-500';
            bgIconClass = 'bg-amber-50';
            btnConfirmClass = 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 text-white';
        }

        const overlay = document.createElement('div');
        overlay.id = 'ui-global-modal';
        overlay.className = 'fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 opacity-0';

        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl transform scale-95 transition-all duration-300 relative';
        
        // Contenido
        modal.innerHTML = `
            <div class="w-16 h-16 ${bgIconClass} ${colorClass} rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <span class="material-symbols-rounded text-3xl">${icon}</span>
            </div>
            <h3 class="text-xl font-bold mb-2 text-center text-gray-900">${title}</h3>
            <div class="text-sm text-gray-500 font-medium mb-6 text-center leading-relaxed">${message}</div>
            <div class="flex gap-3" id="ui-modal-actions">
                ${type === 'confirm' ? `<button id="ui-btn-cancel" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all active:scale-95 text-sm">
                    ${cancelText}
                </button>` : ''}
                <button id="ui-btn-confirm" class="flex-1 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 text-sm ${btnConfirmClass}">
                    ${confirmText}
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeFunc = () => {
            overlay.classList.add('opacity-0');
            modal.classList.add('scale-95');
            setTimeout(() => overlay.remove(), 300);
        };

        // Eventos
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            modal.classList.remove('scale-95');
        });

        document.getElementById('ui-btn-confirm').addEventListener('click', () => {
            closeFunc();
            if (onConfirm) onConfirm();
        });

        if (type === 'confirm') {
            document.getElementById('ui-btn-cancel').addEventListener('click', closeFunc);
        }
    },

    alert: function(message, title = 'Aviso', type = 'info') {
        this.showModal({ title, message, type });
    },

    success: function(message, title = 'Éxito') {
        this.showModal({ title, message, type: 'success' });
    },

    error: function(message, title = 'Error') {
        this.showModal({ title, message, type: 'error' });
    },

    confirm: function(message, onConfirm, title = 'Confirmar Acción') {
        this.showModal({ title, message, type: 'confirm', confirmText: 'Si, seguro', onConfirm });
    },

    prompt: function(message, onConfirm, title = 'Ingresar Dato', defaultValue = '') {
        const inputHtml = `
            <div class="mt-4">
                <input type="text" id="ui-prompt-input" value="${defaultValue}" 
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-center font-bold text-gray-800 text-lg shadow-inner">
            </div>
        `;
        
        this.showModal({ 
            title, 
            message: message + inputHtml, 
            type: 'confirm', 
            confirmText: 'Aceptar', 
            onConfirm: () => {
                const val = document.getElementById('ui-prompt-input')?.value;
                if (onConfirm) onConfirm(val);
            } 
        });

        // Auto-focus and select
        setTimeout(() => {
            const input = document.getElementById('ui-prompt-input');
            if (input) {
                input.focus();
                input.select();
                // Enable Enter to submit
                input.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        document.getElementById('ui-btn-confirm').click();
                    }
                });
            }
        }, 100);
    }
};
