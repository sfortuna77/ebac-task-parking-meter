(() => {
  class ParkingMeter {
    constructor() {
      this.minimumValue = 1.0;

      this.rules = [
        { min: 1.0, max: 1.75, minutes: 30, basePrice: 1.0 },
        { min: 1.75, max: 3.0, minutes: 60, basePrice: 1.75 },
        { min: 3.0, max: Infinity, minutes: 120, basePrice: 3.0 },
      ];
    }

    // Accepts "2,50" or "2.50", trims spaces and validates number
    parseAmount(rawInput) {
      if (typeof rawInput !== 'string') return NaN;
      const normalized = rawInput.trim().replace(/\s+/g, '').replace(',', '.');
      return Number(normalized);
    }

    validateAmount(rawInput) {
      const amount = this.parseAmount(rawInput);

      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          ok: false,
          amount: null,
          message: 'Valor inválido. Digite um número positivo.',
        };
      }

      return { ok: true, amount, message: '' };
    }

    calculate(amount) {
      if (amount < this.minimumValue) {
        return {
          ok: false,
          minutes: 0,
          change: 0,
          message: 'Valor insuficiente. Mínimo `R$ 1,00`.',
        };
      }

      const rule =
        this.rules.find((r) => amount >= r.min && amount < r.max) ||
        this.rules[this.rules.length - 1];

      const change = amount - rule.basePrice;

      return { ok: true, minutes: rule.minutes, change, message: '' };
    }

    formatCurrency(value) {
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    }

    formatDuration(minutes) {
      return minutes === 120
        ? '120 minutos (máximo permitido)'
        : `${minutes} minutos`;
    }
  }

  const amountInput = document.getElementById('amount');
  const calculateButton = document.getElementById('calculate');
  const clearButton = document.getElementById('clear');
  const resultBox = document.getElementById('result');

  const parkingMeter = new ParkingMeter();

  function setResultHtml(html) {
    resultBox.innerHTML = html;
  }

  function updateCalculateButtonState() {
    calculateButton.disabled = amountInput.value.trim() === '';
  }

  function renderError(message) {
    setResultHtml(`<p class="msg msg--error">${message}</p>`);
  }

  function renderSuccess(minutes, change) {
    const durationText = parkingMeter.formatDuration(minutes);
    const changeText =
      change > 0 ? parkingMeter.formatCurrency(change) : 'Sem troco';

    setResultHtml(
      `<p class="msg msg--ok"><strong>Tempo:</strong> ${durationText}<br><strong>Troco:</strong> ${changeText}</p>
       <p class="msg msg__muted">Dica: pressione Enter para calcular rapidamente.</p>`,
    );
  }

  function handleCalculate() {
    const rawInput = amountInput.value;
    const validation = parkingMeter.validateAmount(rawInput);

    if (!validation.ok) {
      renderError(validation.message);
      return;
    }

    const result = parkingMeter.calculate(validation.amount);

    if (!result.ok) {
      renderError(result.message);
      return;
    }

    renderSuccess(result.minutes, result.change);
  }

  function handleClear() {
    amountInput.value = '';
    setResultHtml('');
    updateCalculateButtonState();
    amountInput.focus();
  }

  // Events
  amountInput.addEventListener('input', updateCalculateButtonState);

  amountInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !calculateButton.disabled) handleCalculate();
    if (event.key === 'Escape') handleClear();
  });

  calculateButton.addEventListener('click', handleCalculate);
  clearButton.addEventListener('click', handleClear);

  // Init
  updateCalculateButtonState();
})();
