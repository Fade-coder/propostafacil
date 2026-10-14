(() => {
  'use strict';

  const STORAGE_KEY = 'propostafacil.proposals.v1';
  const MAX_ITEM_QUANTITY = 100000;
  const MAX_UNIT_PRICE = 1000000;
  const MAX_PROPOSAL_TOTAL = 10000000;
  const form = document.getElementById('proposalForm');
  const itemsList = document.getElementById('itemsList');
  const toast = document.getElementById('toast');
  let proposals = readProposals();
  let editingId = null;
  let toastTimer;
  let itemSequence = 0;

  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const lineTotal = item => roundMoney(item.quantity * item.unitPrice);
  const dateLabel = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function readProposals() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item === 'object' && item.id && Array.isArray(item.items)) : [];
    } catch { return []; }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
      return true;
    } catch {
      showToast('Não foi possível salvar neste navegador. Verifique o espaço disponível.');
      return false;
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  function addItem(item = {}) {
    const row = document.createElement('div');
    row.className = 'item-row';
    const itemId = ++itemSequence;
    row.innerHTML = `<input type="text" class="item-description" aria-label="Descrição do item" aria-describedby="itemDescriptionError${itemId}" aria-invalid="false" placeholder="Ex.: Identidade visual" value="${escapeHtml(item.description || '')}"><input type="number" class="item-quantity" aria-label="Quantidade" aria-describedby="itemQuantityError${itemId}" aria-invalid="false" min="0.01" max="${MAX_ITEM_QUANTITY}" step="0.01" placeholder="1" value="${escapeHtml(item.quantity ?? '')}"><input type="number" class="item-price" aria-label="Preço unitário em reais" aria-describedby="itemPriceError${itemId}" aria-invalid="false" min="0" max="${MAX_UNIT_PRICE}" step="0.01" placeholder="0,00" value="${escapeHtml(item.unitPrice ?? '')}"><button class="remove-item" type="button" aria-label="Remover item" title="Remover item">×</button><div class="item-errors"><small class="item-error" id="itemDescriptionError${itemId}"></small><small class="item-error" id="itemQuantityError${itemId}"></small><small class="item-error" id="itemPriceError${itemId}"></small></div>`;
    row.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateItemRow(row);
      updatePreview();
    }));
    row.querySelector('.remove-item').addEventListener('click', () => {
      row.remove();
      updatePreview();
    });
    itemsList.append(row);
    updatePreview();
  }

  function getItems() {
    return [...itemsList.querySelectorAll('.item-row')].map(row => ({
      description: row.querySelector('.item-description').value.trim(),
      quantity: Number(row.querySelector('.item-quantity').value) || 0,
      unitPrice: Number(row.querySelector('.item-price').value) || 0
    }));
  }

  function totalOf(items) { return roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0)); }

  function setError(input, errorElement, message) {
    errorElement.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function hasAtMostTwoDecimals(value) {
    return Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
  }

  function validateItemRow(row) {
    const description = row.querySelector('.item-description');
    const quantity = row.querySelector('.item-quantity');
    const price = row.querySelector('.item-price');
    const errors = row.querySelectorAll('.item-error');
    const quantityValue = Number(quantity.value);
    const priceValue = Number(price.value);
    let descriptionError = '';
    let quantityError = '';
    let priceError = '';

    if (!description.value.trim()) descriptionError = 'Descrição: informe o nome do item.';
    if (!quantity.value || !Number.isFinite(quantityValue)) quantityError = 'Quantidade: informe um número válido.';
    else if (quantityValue <= 0) quantityError = 'Quantidade: deve ser maior que zero.';
    else if (quantityValue > MAX_ITEM_QUANTITY) quantityError = `Quantidade: o limite é ${MAX_ITEM_QUANTITY.toLocaleString('pt-BR')}.`;
    else if (!hasAtMostTwoDecimals(quantityValue)) quantityError = 'Quantidade: use no máximo duas casas decimais.';

    if (price.value === '' || !Number.isFinite(priceValue)) priceError = 'Preço: informe um número válido.';
    else if (priceValue < 0) priceError = 'Preço: não pode ser negativo.';
    else if (priceValue > MAX_UNIT_PRICE) priceError = `Preço: o máximo é ${money(MAX_UNIT_PRICE)} por unidade.`;
    else if (!hasAtMostTwoDecimals(priceValue)) priceError = 'Preço: use no máximo duas casas decimais.';

    setError(description, errors[0], descriptionError);
    setError(quantity, errors[1], quantityError);
    setError(price, errors[2], priceError);
    return !descriptionError && !quantityError && !priceError;
  }

  function currentData() {
    return {
      clientName: document.getElementById('clientName').value.trim(),
      providerName: document.getElementById('providerName').value.trim(),
      serviceDescription: document.getElementById('serviceDescription').value.trim(),
      deadline: document.getElementById('deadline').value.trim(),
      notes: document.getElementById('notes').value.trim(),
      items: getItems()
    };
  }

  function updatePreview() {
    const data = currentData();
    document.getElementById('previewClient').textContent = data.clientName || 'Nome do cliente';
    document.getElementById('previewProvider').textContent = data.providerName || 'Seu nome ou empresa';
    document.getElementById('previewDescription').textContent = data.serviceDescription || 'A descrição do seu serviço aparecerá aqui.';
    document.getElementById('previewDeadline').textContent = data.deadline || 'A definir';
    document.getElementById('previewFooterProvider').textContent = data.providerName || 'PropostaFácil';
    document.getElementById('previewNotes').textContent = data.notes;
    document.getElementById('previewNotesWrap').hidden = !data.notes;
    document.getElementById('formTotal').textContent = money(totalOf(data.items));
    document.getElementById('previewTotal').textContent = money(totalOf(data.items));
    const previewItems = document.getElementById('previewItems');
    const filled = data.items.filter(item => item.description || item.quantity || item.unitPrice);
    previewItems.innerHTML = filled.length ? filled.map(item => `<div class="preview-item"><span>${escapeHtml(item.description || 'Item sem descrição')}<small>${item.quantity || 0} × ${money(item.unitPrice)}</small></span><span>${money(lineTotal(item))}</span></div>`).join('') : '<div class="preview-empty">Seus itens aparecerão aqui.</div>';
  }

  function validate() {
    let valid = true;
    let firstInvalid = null;
    form.querySelectorAll('.field').forEach(field => {
      const input = field.querySelector('input, textarea');
      if (!input) return;
      let message = '';
      if (input.required && !input.value.trim()) message = 'Este campo é obrigatório.';
      field.classList.toggle('invalid', Boolean(message));
      const error = field.querySelector('.field-error');
      if (error) setError(input, error, message);
      if (message) { valid = false; firstInvalid ||= input; }
    });
    const rows = [...itemsList.querySelectorAll('.item-row')];
    if (!rows.length) {
      valid = false;
    }
    let proposalTotal = 0;
    let overLimitPrice = null;
    rows.forEach(row => {
      const price = row.querySelector('.item-price');
      if (!validateItemRow(row)) {
        valid = false;
        firstInvalid ||= row.querySelector('[aria-invalid="true"]');
        return;
      }
      const item = {
        quantity: Number(row.querySelector('.item-quantity').value),
        unitPrice: Number(price.value)
      };
      proposalTotal = roundMoney(proposalTotal + lineTotal(item));
      if (proposalTotal > MAX_PROPOSAL_TOTAL && !overLimitPrice) overLimitPrice = price;
    });
    if (overLimitPrice) {
      const error = overLimitPrice.closest('.item-row').querySelector('.item-error:last-child');
      setError(overLimitPrice, error, `O total da proposta não pode ultrapassar ${money(MAX_PROPOSAL_TOTAL)}.`);
      valid = false;
      firstInvalid ||= overLimitPrice;
    }
    if (!valid) {
      showToast(!rows.length ? 'Adicione pelo menos um item à proposta.' : 'Confira os campos destacados. Os valores devem respeitar os limites e os centavos.');
      firstInvalid?.focus();
    }
    return valid;
  }

  function clearForm() {
    form.reset();
    itemsList.replaceChildren();
    addItem();
    editingId = null;
    document.querySelector('.save-button span').textContent = 'Salvar proposta';
    document.getElementById('previewNumber').textContent = 'PROPOSTA';
    document.getElementById('previewDate').textContent = dateLabel(new Date());
    form.querySelectorAll('.field').forEach(field => {
      field.classList.remove('invalid');
      const input = field.querySelector('input, textarea');
      const error = field.querySelector('.field-error');
      if (input && error) setError(input, error, '');
    });
    updatePreview();
  }

  function renderHistory() {
    const list = document.getElementById('historyList');
    document.getElementById('historyCount').textContent = proposals.length;
    if (!proposals.length) {
      list.innerHTML = '<div class="history-empty">Suas propostas salvas vão aparecer aqui.<br>Comece preenchendo os detalhes ao lado.</div>';
      return;
    }
    list.innerHTML = proposals.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(proposal => `<article class="history-card" data-id="${escapeHtml(proposal.id)}"><span class="history-symbol">▤</span><div class="history-info"><strong>${escapeHtml(proposal.clientName)}</strong><small>${escapeHtml(proposal.providerName)} · ${dateLabel(proposal.updatedAt)}</small></div><strong class="history-price">${money(totalOf(proposal.items))}</strong><div class="history-tools"><button type="button" data-action="edit" title="Editar" aria-label="Editar proposta">✎</button><button type="button" data-action="view" title="Visualizar" aria-label="Visualizar proposta">◉</button><button type="button" class="delete" data-action="delete" title="Excluir" aria-label="Excluir proposta">×</button></div></article>`).join('');
    list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      const card = button.closest('[data-id]');
      const proposal = proposals.find(item => item.id === card.dataset.id);
      if (!proposal) return;
      if (button.dataset.action === 'delete') {
        if (!window.confirm(`Excluir a proposta para ${proposal.clientName}?`)) return;
        const previousProposals = proposals;
        proposals = proposals.filter(item => item.id !== proposal.id);
        if (!persist()) {
          proposals = previousProposals;
          renderHistory();
          showToast('Não foi possível excluir. A proposta continua salva neste navegador.');
          return;
        }
        renderHistory();
        if (editingId === proposal.id) clearForm();
        showToast('Proposta excluída.');
      } else {
        loadProposal(proposal, button.dataset.action === 'edit');
      }
    }));
  }

  function loadProposal(proposal, edit) {
    document.getElementById('clientName').value = proposal.clientName;
    document.getElementById('providerName').value = proposal.providerName;
    document.getElementById('serviceDescription').value = proposal.serviceDescription;
    document.getElementById('deadline').value = proposal.deadline;
    document.getElementById('notes').value = proposal.notes || '';
    itemsList.replaceChildren();
    proposal.items.forEach(item => addItem(item));
    editingId = edit ? proposal.id : null;
    document.querySelector('.save-button span').textContent = edit ? 'Atualizar proposta' : 'Salvar como nova';
    document.getElementById('previewNumber').textContent = `PROPOSTA · ${String(proposals.indexOf(proposal) + 1).padStart(3, '0')}`;
    document.getElementById('previewDate').textContent = dateLabel(proposal.updatedAt);
    updatePreview();
    document.getElementById('proposalPreview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!edit) showToast('Proposta carregada na pré-visualização.');
  }

  form.addEventListener('input', event => {
    const field = event.target.closest('.field');
    if (field && event.target.value.trim()) {
      field.classList.remove('invalid');
      const error = field.querySelector('.field-error');
      if (error) setError(event.target, error, '');
    }
    updatePreview();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) return;
    const data = currentData();
    const now = new Date().toISOString();
    if (editingId) {
      const index = proposals.findIndex(item => item.id === editingId);
      if (index !== -1) proposals[index] = { ...proposals[index], ...data, updatedAt: now };
    } else {
      const id = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      proposals.push({ ...data, id, createdAt: now, updatedAt: now });
      editingId = id;
    }
    if (!persist()) return;
    renderHistory();
    document.querySelector('.save-button span').textContent = 'Atualizar proposta';
    document.getElementById('previewDate').textContent = dateLabel(now);
    document.getElementById('previewNumber').textContent = `PROPOSTA · ${String(proposals.length).padStart(3, '0')}`;
    showToast('Proposta salva com sucesso neste dispositivo.');
  });
  document.getElementById('addItem').addEventListener('click', () => addItem());
  document.getElementById('newProposalTop').addEventListener('click', () => { clearForm(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.getElementById('printButton').addEventListener('click', () => window.print());

  document.getElementById('previewDate').textContent = dateLabel(new Date());
  addItem();
  renderHistory();
  updatePreview();
})();
