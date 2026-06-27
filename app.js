/**
 * FinancePulse AI - Core Application Script
 */

// Global State
let transactions = [];
let budgets = {
  Food: 6000,
  Rent: 15000,
  Bills: 4000,
  Transport: 3000,
  Shopping: 5000,
  Entertainment: 3000,
  Other: 2000
};
let currentDate = new Date(); // Tracks the current active month/year

// Charts references
let expenseChartInstance = null;
let budgetChartInstance = null;

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  // Load State from LocalStorage
  const savedTransactions = localStorage.getItem('fp_transactions');
  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
    cleanupOldTransactions(); // Keep only the last 3 months of logs
  } else {
    // Seed some mock data so the app looks beautiful on first load
    seedMockData();
  }

  const savedBudgets = localStorage.getItem('fp_budgets');
  if (savedBudgets) {
    budgets = JSON.parse(savedBudgets);
  }

  // Register Lucide Icons
  lucide.createIcons();

  // Set default form date to today
  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Attach Event Listeners
  setupEventListeners();

  // Refresh UI
  updateApp();
});

// Seed Initial Mock Data for visual excellence on first load
function seedMockData() {
  const now = new Date();
  const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(now.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  transactions = [
    { id: 'm1', amount: 65000, type: 'income', category: 'Salary', description: 'Monthly Salary Credit', date: getPastDate(15) },
    { id: 'm2', amount: 15000, type: 'expense', category: 'Rent', description: 'June Rent Payment', date: getPastDate(14) },
    { id: 'm3', amount: 3500, type: 'expense', category: 'Food', description: 'Weekly Groceries at DMart', date: getPastDate(10) },
    { id: 'm4', amount: 1200, type: 'expense', category: 'Transport', description: 'Petrol Refuel', date: getPastDate(8) },
    { id: 'm5', amount: 2500, type: 'expense', category: 'Bills', description: 'Electricity Bill Payment', date: getPastDate(5) },
    { id: 'm6', amount: 3200, type: 'expense', category: 'Shopping', description: 'Zara Summer Wear', date: getPastDate(3) },
    { id: 'm7', amount: 1800, type: 'expense', category: 'Entertainment', description: 'Movie & Dinner with friends', date: getPastDate(1) }
  ];
  localStorage.setItem('fp_transactions', JSON.stringify(transactions));
}

// Set up UI Event Listeners
function setupEventListeners() {
  // Month switcher
  document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));

  // AI NLP transaction submit
  document.getElementById('ai-nlp-submit').addEventListener('click', processNlpInput);
  document.getElementById('ai-nlp-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processNlpInput();
  });

  // AI Chat send
  document.getElementById('chat-send-btn').addEventListener('click', processChatInput);
  document.getElementById('chat-user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processChatInput();
  });

  // JSON backup export/import
  document.getElementById('export-data-btn').addEventListener('click', exportDataToJSON);
  document.getElementById('import-data-file').addEventListener('change', importDataFromJSON);
}

// Main Refresh Function
function updateApp() {
  renderMonthDisplay();
  
  // Filter transactions for currently selected month
  const filtered = getFilteredTransactions();

  calculateBalances(filtered);
  renderTransactions(filtered);
  renderBudgets(filtered);
  
  // Re-render charts if analytics tab is active or initialized
  renderCharts(filtered);
}

// 1. Render Active Month Title
function renderMonthDisplay() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthStr = months[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
  document.getElementById('current-month-display').innerText = monthStr;
}

// Change Active Month
function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  updateApp();
}

// Filter transactions by active month and year
function getFilteredTransactions() {
  const activeMonth = currentDate.getMonth();
  const activeYear = currentDate.getFullYear();

  return transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === activeMonth && tDate.getFullYear() === activeYear;
  });
}

// 2. Balance Summaries Calculations
function calculateBalances(filtered) {
  let income = 0;
  let expense = 0;

  filtered.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      income += amt;
    } else {
      expense += amt;
    }
  });

  const balance = income - expense;
  const savingsRate = income > 0 ? Math.max(0, ((balance / income) * 100).toFixed(0)) : 0;

  document.getElementById('total-income-val').innerText = '₹' + income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('total-expense-val').innerText = '₹' + expense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const balanceEl = document.getElementById('net-balance-val');
  balanceEl.innerText = (balance < 0 ? '-' : '') + '₹' + Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  balanceEl.style.color = balance < 0 ? 'var(--state-danger)' : 'var(--text-primary)';

  document.getElementById('savings-rate-badge').innerText = `Savings Rate: ${savingsRate}%`;
}

// 3. Render Transaction List
function renderTransactions(filtered) {
  const listContainer = document.getElementById('dashboard-transactions-list');
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="receipt"></i>
        <p>No transactions registered for this month.</p>
        <span>Tap the '+' button to log your first record!</span>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Sort transactions by date descending
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  const categoryIcons = {
    Food: 'utensils',
    Rent: 'home',
    Bills: 'zap',
    Transport: 'car',
    Shopping: 'shopping-bag',
    Entertainment: 'clapperboard',
    Salary: 'banknote',
    Other: 'help-circle'
  };

  listContainer.innerHTML = sorted.map(t => {
    const iconName = categoryIcons[t.category] || 'help-circle';
    const amountFormatted = (t.type === 'income' ? '+' : '-') + ' ₹' + parseFloat(t.amount).toLocaleString('en-IN');
    const dateFormatted = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return `
      <div class="tx-item" onclick="editTransaction('${t.id}')">
        <div class="tx-item-left">
          <div class="tx-category-icon">
            <i data-lucide="${iconName}"></i>
          </div>
          <div class="tx-details">
            <span class="tx-desc">${t.description}</span>
            <span class="tx-meta">${t.category} &bull; ${dateFormatted}</span>
          </div>
        </div>
        <div class="tx-amount-label ${t.type}">
          ${amountFormatted}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// 4. Render Budgets List & Progress Bars
function renderBudgets(filtered) {
  const container = document.getElementById('budgets-progress-list');
  
  // Calculate spent amounts per category
  const categorySpent = {};
  filtered.forEach(t => {
    if (t.type === 'expense') {
      categorySpent[t.category] = (categorySpent[t.category] || 0) + parseFloat(t.amount);
    }
  });

  const categories = Object.keys(budgets);

  container.innerHTML = categories.map(cat => {
    const limit = budgets[cat] || 0;
    const spent = categorySpent[cat] || 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    
    let statusClass = 'normal';
    if (pct >= 100) statusClass = 'danger';
    else if (pct >= 80) statusClass = 'warning';

    return `
      <div class="budget-progress-row">
        <div class="budget-row-meta">
          <span class="budget-category-label">${cat}</span>
          <span class="budget-numbers-label">
            <strong>₹${spent.toLocaleString('en-IN')}</strong> of ₹${limit.toLocaleString('en-IN')}
          </span>
        </div>
        <div class="budget-progress-bar-bg">
          <div class="budget-progress-bar-fill ${statusClass}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// 5. Render Analytical Charts (Chart.js)
function renderCharts(filtered) {
  const activeTab = document.querySelector('.mobile-bottom-nav button.active');
  const isAnalyticsTab = activeTab && activeTab.outerHTML.includes('tab-analytics');
  if (!isAnalyticsTab) return; // Render only when user looks at charts to save performance

  // A. Expense Pie Chart
  const expenseCategories = {};
  filtered.forEach(t => {
    if (t.type === 'expense') {
      expenseCategories[t.category] = (expenseCategories[t.category] || 0) + parseFloat(t.amount);
    }
  });

  const pieCtx = document.getElementById('expense-pie-chart').getContext('2d');
  
  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  const pieLabels = Object.keys(expenseCategories);
  const pieData = Object.values(expenseCategories);

  if (pieData.length === 0) {
    // Show dummy placeholder chart
    expenseChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['No Data'],
        datasets: [{
          data: [100],
          backgroundColor: ['rgba(255,255,255,0.05)'],
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  } else {
    expenseChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: pieLabels,
        datasets: [{
          data: pieData,
          backgroundColor: [
            '#0d9488', '#0ea5e9', '#6366f1', '#ec4899', 
            '#f43f5e', '#eab308', '#8b5cf6', '#10b981'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // B. Budget Bar Comparison Chart
  const barCtx = document.getElementById('budget-comparison-chart').getContext('2d');
  
  if (budgetChartInstance) {
    budgetChartInstance.destroy();
  }

  const barLabels = Object.keys(budgets);
  const barLimitData = Object.values(budgets);
  const barSpentData = barLabels.map(cat => expenseCategories[cat] || 0);

  budgetChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [
        {
          label: 'Limit',
          data: barLimitData,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Spent',
          data: barSpentData,
          backgroundColor: '#0d9488',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      }
    }
  });
}

// 6. Navigation router
function switchMobileTab(tabId, element) {
  // Hide all panels
  document.querySelectorAll('.mobile-tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Deactivate all nav tabs
  document.querySelectorAll('.mobile-bottom-nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Activate target
  document.getElementById(tabId).classList.add('active');
  element.classList.add('active');

  // Trigger charts rendering if analytics tab
  if (tabId === 'tab-analytics') {
    renderCharts(getFilteredTransactions());
  }
}

// 7. AI NLP Input Handler
function processNlpInput() {
  const inputEl = document.getElementById('ai-nlp-input');
  const text = inputEl.value.trim();
  if (!text) return;

  // Run the parser library
  const parsed = parseNaturalLanguage(text);
  
  if (parsed.amount <= 0) {
    alert("I couldn't detect a valid transaction amount. Try typing something like 'spent 450 on food'.");
    return;
  }

  // Pre-fill manual entry modal to let the user review
  openTransactionModal(parsed);
  
  // Clear field
  inputEl.value = '';

  // Show dynamic message to user
  showToast(`Parsed: ${parsed.category} - ₹${parsed.amount.toLocaleString()}`);
}

function fillPrompt(val) {
  document.getElementById('ai-nlp-input').value = val;
  document.getElementById('ai-nlp-input').focus();
}

// 8. Advisor AI Chat Handler
function processChatInput() {
  const inputEl = document.getElementById('chat-user-input');
  const userText = inputEl.value.trim();
  if (!userText) return;

  // Append user bubble
  appendChatMessage(userText, 'user');
  inputEl.value = '';

  // Simulate bot thinking
  const container = document.getElementById('ai-chat-messages-container');
  const thinkingId = 'thinking-' + Date.now();
  const thinkingBubble = document.createElement('div');
  thinkingBubble.className = 'chat-message bot';
  thinkingBubble.id = thinkingId;
  thinkingBubble.innerHTML = `<p>Analyzing records...</p>`;
  container.appendChild(thinkingBubble);
  container.scrollTop = container.scrollHeight;

  // Generate bot reply using transaction logs
  setTimeout(() => {
    thinkingBubble.remove();
    const botReply = generateAdvisorResponse(userText, transactions, budgets);
    appendChatMessage(botReply, 'bot');
  }, 1000);
}

function askAdvisor(query) {
  document.getElementById('chat-user-input').value = query;
  processChatInput();
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('ai-chat-messages-container');
  const messageBubble = document.createElement('div');
  messageBubble.className = `chat-message ${sender}`;
  
  // Parse markdown-like bold text in advisor response for clean rendering
  const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  messageBubble.innerHTML = `
    <p>${formattedText}</p>
    <span class="message-time">Just Now</span>
  `;
  container.appendChild(messageBubble);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// 9. Manual Transaction CRUD Modal Management
function openTransactionModal(prefillData = null) {
  const modal = document.getElementById('transaction-modal');
  modal.classList.add('active');

  // Reset Form
  document.getElementById('transaction-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('modal-title-text').innerText = 'Add Transaction';

  // Set default date
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];

  if (prefillData) {
    // Populate form with NLP parsed data
    const radioBtn = document.querySelector(`input[name="tx-type"][value="${prefillData.type}"]`);
    if (radioBtn) radioBtn.checked = true;
    
    document.getElementById('tx-amount').value = prefillData.amount;
    document.getElementById('tx-category').value = prefillData.category;
    document.getElementById('tx-desc').value = prefillData.description;
    document.getElementById('tx-date').value = prefillData.date;
  }
  
  toggleFormType();
}

function closeTransactionModal() {
  document.getElementById('transaction-modal').classList.remove('active');
}

function toggleFormType() {
  const typeSelected = document.querySelector('input[name="tx-type"]:checked').value;
  const categorySelect = document.getElementById('tx-category');

  // Adjust categories automatically based on type selection to keep it clean
  if (typeSelected === 'income') {
    categorySelect.value = 'Salary';
  } else {
    if (categorySelect.value === 'Salary') {
      categorySelect.value = 'Food';
    }
  }
}

// Save/Update Transaction
function saveTransaction(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-id').value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const category = document.getElementById('tx-category').value;
  const description = document.getElementById('tx-desc').value.trim();
  const date = document.getElementById('tx-date').value;

  if (amount <= 0) {
    alert("Please enter a valid amount greater than zero.");
    return;
  }

  if (id) {
    // Update existing transaction
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { id, amount, type, category, description, date };
      showToast('Transaction updated successfully');
    }
  } else {
    // Create new transaction
    const newTx = {
      id: 'tx-' + Date.now(),
      amount,
      type,
      category,
      description,
      date
    };
    transactions.push(newTx);
    showToast('Transaction logged successfully');
  }

  // Save to LocalStorage & Refresh
  localStorage.setItem('fp_transactions', JSON.stringify(transactions));
  closeTransactionModal();
  updateApp();
}

// Edit existing transaction (or delete it)
function editTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  openTransactionModal();
  
  document.getElementById('edit-id').value = tx.id;
  document.getElementById('modal-title-text').innerText = 'Modify Transaction';
  
  const radioBtn = document.querySelector(`input[name="tx-type"][value="${tx.type}"]`);
  if (radioBtn) radioBtn.checked = true;
  
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-category').value = tx.category;
  document.getElementById('tx-desc').value = tx.description;
  document.getElementById('tx-date').value = tx.date;

  // Add temporary delete option in header
  const headerEl = document.getElementById('modal-title-text');
  headerEl.innerHTML = `Modify Transaction <button type="button" class="btn-text-action" style="color: var(--state-danger); font-size: 0.72rem; margin-left: 12px;" onclick="deleteTransaction('${tx.id}')"><i data-lucide="trash-2" style="width: 14px; height: 14px; vertical-align: middle;"></i> Delete</button>`;
  
  lucide.createIcons();
}

// Delete transaction
function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction record?")) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('fp_transactions', JSON.stringify(transactions));
    closeTransactionModal();
    showToast('Transaction removed');
    updateApp();
  }
}

// 10. Category Budgets Modal Management
function openBudgetModal() {
  const modal = document.getElementById('budget-modal');
  modal.classList.add('active');

  const container = document.getElementById('budget-fields-list-container');
  const categories = Object.keys(budgets);

  container.innerHTML = categories.map(cat => {
    const limit = budgets[cat] || 0;
    return `
      <div class="form-group">
        <label>${cat} Limit (₹)</label>
        <input type="number" name="budget-${cat}" value="${limit}" required>
      </div>
    `;
  }).join('');
}

function closeBudgetModal() {
  document.getElementById('budget-modal').classList.remove('active');
}

function saveBudgets(e) {
  e.preventDefault();
  
  const categories = Object.keys(budgets);
  categories.forEach(cat => {
    const inputVal = document.querySelector(`input[name="budget-${cat}"]`).value;
    budgets[cat] = parseFloat(inputVal) || 0;
  });

  localStorage.setItem('fp_budgets', JSON.stringify(budgets));
  closeBudgetModal();
  showToast('Budgets saved');
  updateApp();
}

// 11. Helper Toast Message Alert
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-alert';
  toast.innerText = message;
  
  // Style toast dynamically
  Object.assign(toast.style, {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(13, 148, 136, 0.95)',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    zIndex: 300,
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out'
  });

  document.querySelector('.app-container').appendChild(toast);
  
  // Fade in
  setTimeout(() => toast.style.opacity = 1, 50);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

// 12. Backup: Export Data to JSON File
function exportDataToJSON() {
  const backupData = {
    transactions,
    budgets,
    version: '1.0',
    exportDate: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `financepulse_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Backup JSON exported');
}

// 13. Backup: Import Data from JSON File
function importDataFromJSON(e) {
  const fileReader = new FileReader();
  const file = e.target.files[0];
  if (!file) return;

  fileReader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.transactions && parsed.budgets) {
        transactions = parsed.transactions;
        budgets = parsed.budgets;
        
        // Save state and update app
        localStorage.setItem('fp_transactions', JSON.stringify(transactions));
        localStorage.setItem('fp_budgets', JSON.stringify(budgets));
        
        showToast('Backup restored successfully');
        updateApp();
      } else {
        alert("Invalid backup file format.");
      }
    } catch (err) {
      alert("Failed to parse JSON file.");
    }
  };
  
  fileReader.readAsText(file);
}

// 14. Auto-Cleanup: Keep only last 3 months of transactions
function cleanupOldTransactions() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 3); // exactly 3 months ago
  
  const originalLength = transactions.length;
  // Filter out transactions older than 3 months
  transactions = transactions.filter(t => new Date(t.date) >= cutoffDate);
  
  if (transactions.length !== originalLength) {
    localStorage.setItem('fp_transactions', JSON.stringify(transactions));
    console.log(`[Auto-Cleanup] Cleared ${originalLength - transactions.length} old transactions exceeding 3 months limit.`);
  }
}

// 15. Clear All Database Data
function clearAllData() {
  if (confirm("Are you sure you want to delete all transactions and reset your balance to ₹0.00? This cannot be undone!")) {
    transactions = [];
    localStorage.setItem('fp_transactions', JSON.stringify(transactions));
    showToast('All transaction data cleared');
    updateApp();
  }
}
