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

    getRuleForAmount(amount) {
      return (
        this.rules.find((r) => amount >= r.min && amount < r.max) ||
        this.rules[this.rules.length - 1]
      );
    }

    calculate(amount) {
      if (amount < this.minimumValue) {
        return {
          ok: false,
          minutes: 0,
          change: 0,
          basePrice: 0,
          message: 'Valor insuficiente. Mínimo `R$ 1,00`.',
        };
      }

      const rule = this.getRuleForAmount(amount);

      // Troco para qualquer faixa, mas nunca negativo
      const rawChange = amount - rule.basePrice;
      const change = rawChange > 0 ? rawChange : 0;

      return {
        ok: true,
        minutes: rule.minutes,
        change,
        basePrice: rule.basePrice,
        message: '',
      };
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

    formatDateTime(date) {
      return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    createTicketId() {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const y = now.getFullYear();
      const m = pad(now.getMonth() + 1);
      const d = pad(now.getDate());
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      const ss = pad(now.getSeconds());
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      return `PKM-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
    }

    buildQrPayload({
      ticketId,
      issuedAt,
      validUntil,
      paidAmount,
      change,
      minutes,
      basePrice,
    }) {
      return `TICKET=${ticketId}|ISSUED=${issuedAt.toISOString()}|UNTIL=${validUntil.toISOString()}|MIN=${minutes}|BASE=${basePrice.toFixed(
        2,
      )}|PAID=${paidAmount.toFixed(2)}|CHG=${change.toFixed(2)}`;
    }
  }

  // Main DOM
  const amountInput = document.getElementById('amount');
  const calculateButton = document.getElementById('calculate');
  const clearButton = document.getElementById('clear');
  const resultBox = document.getElementById('result');

  // Modal DOM
  const ticketModal = document.getElementById('ticketModal');
  const ticketCloseButton = document.getElementById('ticketClose');
  const ticketPrintButton = document.getElementById('ticketPrint');

  // Ticket fields
  const ticketIssuedAtEl = document.getElementById('ticketIssuedAt');
  const ticketIdEl = document.getElementById('ticketId');
  const ticketTariffEl = document.getElementById('ticketTariff');
  const ticketDurationEl = document.getElementById('ticketDuration');
  const ticketValidUntilEl = document.getElementById('ticketValidUntil');
  const ticketPaidEl = document.getElementById('ticketPaid');
  const ticketChangeEl = document.getElementById('ticketChange');
  const ticketQrPayloadEl = document.getElementById('ticketQrPayload');

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

  function openModal() {
    ticketModal.classList.add('is-open');
    ticketModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    ticketModal.classList.remove('is-open');
    ticketModal.setAttribute('aria-hidden', 'true');
  }

  function fillTicket({ minutes, paidAmount, change, basePrice }) {
    const issuedAt = new Date();
    const validUntil = new Date(issuedAt.getTime() + minutes * 60 * 1000);

    const ticketId = parkingMeter.createTicketId();
    const qrPayload = parkingMeter.buildQrPayload({
      ticketId,
      issuedAt,
      validUntil,
      paidAmount,
      change,
      minutes,
      basePrice,
    });

    ticketIssuedAtEl.textContent = `Emitido em: ${parkingMeter.formatDateTime(
      issuedAt,
    )}`;
    ticketIdEl.textContent = ticketId;
    ticketTariffEl.textContent = parkingMeter.formatCurrency(basePrice);
    ticketDurationEl.textContent = parkingMeter.formatDuration(minutes);
    ticketValidUntilEl.textContent = parkingMeter.formatDateTime(validUntil);
    ticketPaidEl.textContent = parkingMeter.formatCurrency(paidAmount);
    ticketChangeEl.textContent =
      change > 0 ? parkingMeter.formatCurrency(change) : 'Sem troco';
    ticketQrPayloadEl.textContent = qrPayload;
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

    fillTicket({
      minutes: result.minutes,
      paidAmount: validation.amount,
      change: result.change,
      basePrice: result.basePrice,
    });

    openModal();
  }

  function handleClear() {
    amountInput.value = '';
    setResultHtml('');
    updateCalculateButtonState();
    amountInput.focus();
  }

  function handlePrint() {
    window.print();
  }

  // Events
  amountInput.addEventListener('input', updateCalculateButtonState);

  amountInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !calculateButton.disabled) handleCalculate();
    if (event.key === 'Escape') handleClear();
  });

  calculateButton.addEventListener('click', handleCalculate);
  clearButton.addEventListener('click', handleClear);

  // Modal events
  ticketCloseButton.addEventListener('click', closeModal);
  ticketPrintButton.addEventListener('click', handlePrint);

  ticketModal.addEventListener('click', (event) => {
    const clickedBackdrop =
      event.target &&
      event.target.dataset &&
      event.target.dataset.close === 'true';
    if (clickedBackdrop) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  // Init
  updateCalculateButtonState();
})();
