// Переменная для отслеживания последнего активного поля
let lastActiveField = 'rub'; // по умолчанию рубли
let isCalculatorMode = false; // Флаг режима калькулятора
let calculatorInitialized = false; // Флаг инициализации калькулятора

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        console.log('ServiceWorker registered');
    }).catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
    });
}

// Установить последнее активное поле
function setLastActive(field) {
    lastActiveField = field;
}

// Format number with thousands separator
function formatNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value) {
        input.value = parseInt(value).toLocaleString('ru-RU');
    }
}

function formatAndCalculate(input) {
    formatNumber(input);
    calculate();
    updateConversion();
}

// Get numeric value from formatted input
function getNumericValue(id) {
    const value = document.getElementById(id).value.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(value) || 0;
}

// Format value for display with thousands separator
function formatDisplayValue(value) {
    if (value === '' || value === '0') return '0';
    
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    return num.toLocaleString('ru-RU', {
        maximumFractionDigits: 10
    });
}

// Format value for calculation (without separators)
function formatCalcValue(value) {
    if (!value) return '0';
    return value.toString().replace(/\s/g, '').replace(',', '.');
}

// Fetch exchange rates from API
async function fetchRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        const usdToVnd = Math.ceil(data.rates.VND);
        const eurToUsd = data.rates.EUR;
        const eurToVnd = Math.round(usdToVnd / eurToUsd);
        document.getElementById('marketUsdVnd').value = usdToVnd.toLocaleString('ru-RU');
        document.getElementById('marketEurVnd').value = eurToVnd.toLocaleString('ru-RU');
        calculate();
        updateConversion();
    } catch (error) {
        alert('Не удалось загрузить курсы валют. Проверьте интернет-соединение.');
    }
}

// Clear market rates
function clearMarketRates() {
    document.getElementById('marketUsdVnd').value = '';
    document.getElementById('marketEurVnd').value = '';
    calculate();
    updateConversion();
}

// Clear conversion fields
function clearConversion() {
    document.getElementById('rubAmount').value = '';
    document.getElementById('vndAmount').value = '';
    lastActiveField = 'rub';
    calculateDifference();
    
    if (isCalculatorMode && calculatorInitialized) {
        initCalculatorMode();
    }
}

// Clear all fields and cache
function clearAll() {
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
        input.value = '';
        localStorage.removeItem(input.id);
    });
    
    document.getElementById('newUsd').checked = false;
    document.querySelector('input[name="currency"][value="USD"]').checked = true;
    
    calculate();
    calculateDifference();
    
    if (isCalculatorMode && calculatorInitialized) {
        initCalculatorMode();
    }
}

// Convert RUB to VND
function convertRubToVnd() {
    const rub = getNumericValue('rubAmount');
    if (rub === 0) {
        if (lastActiveField === 'rub') {
            document.getElementById('vndAmount').value = '';
        }
        return;
    }
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    const isNewUsd = document.getElementById('newUsd').checked;
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    let exchangeRate;
    if (isUsd) {
        exchangeRate = isNewUsd ? getNumericValue('exchangeUsdVndNew') : getNumericValue('exchangeUsdVndOld');
    } else {
        exchangeRate = getNumericValue('exchangeEurVnd');
    }
    const price = isUsd ? usdPrice : eurPrice;
    if (price && exchangeRate) {
        const vnd = Math.round(rub / price * exchangeRate);
        document.getElementById('vndAmount').value = vnd.toLocaleString('ru-RU');
    }
}

// Convert VND to RUB
function convertVndToRub() {
    const vnd = getNumericValue('vndAmount');
    if (vnd === 0) {
        if (lastActiveField === 'vnd') {
            document.getElementById('rubAmount').value = '';
        }
        return;
    }
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    const isNewUsd = document.getElementById('newUsd').checked;
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    let exchangeRate;
    if (isUsd) {
        exchangeRate = isNewUsd ? getNumericValue('exchangeUsdVndNew') : getNumericValue('exchangeUsdVndOld');
    } else {
        exchangeRate = getNumericValue('exchangeEurVnd');
    }
    const price = isUsd ? usdPrice : eurPrice;
    if (price && exchangeRate) {
        const rub = vnd / exchangeRate * price;
        document.getElementById('rubAmount').value = rub.toLocaleString('ru-RU');
    }
}

function exchangeDiff(market, exchange, prise, element) {
    if (market && exchange && prise) {
        const diff = market - exchange;
        const rubDiff = diff / (exchange / prise);
        document.getElementById(element).style.display = 'block';
        document.getElementById(element).innerHTML = 
            `Разница c биржевым курсом: ${diff.toLocaleString('ru-RU')} ₫ ≈ ${Math.abs(rubDiff).toFixed(2).replace('.', ',')} ₽`;
    } else {
        document.getElementById(element).style.display = 'none';
    }          
}

// Main calculation function
function calculate() {
    const marketUsd = getNumericValue('marketUsdVnd');
    const marketEur = getNumericValue('marketEurVnd');
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    const exchangeUsdNew = getNumericValue('exchangeUsdVndNew');
    const exchangeUsdOld = getNumericValue('exchangeUsdVndOld');
    const exchangeEur = getNumericValue('exchangeEurVnd');
    
    exchangeDiff(marketUsd,exchangeUsdNew,usdPrice,'diffUsdNew');    
    exchangeDiff(marketUsd,exchangeUsdOld,usdPrice, 'diffUsdOld');
    exchangeDiff(marketEur,exchangeEur,eurPrice, 'diffEur');
    
    calculateDifference();
}

// Обработчик изменения валюты
function handleCurrencyChange() {
    calculate();
    updateConversion();
    calculateDifference();
    
    // Обновляем калькулятор, если он активен
    if (isCalculatorMode && calculatorInitialized) {
        const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
        document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
        updateCurrencyButton();
    }
}

// Update conversion when currency or new USD checkbox changes
function updateConversion() {
    if (lastActiveField === 'rub' && document.getElementById('rubAmount').value) {
        convertRubToVnd();
    } else if (lastActiveField === 'vnd' && document.getElementById('vndAmount').value) {
        convertVndToRub();
    }
    calculateDifference();
    
    if (isCalculatorMode && calculatorInitialized) {
        updateCalculatorFromMain();
    }
}

// Calculate difference between USD and EUR
function calculateDifference() {
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    const isNewUsd = document.getElementById('newUsd').checked;
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    const rubAmount = getNumericValue('rubAmount');
    const vndAmount = getNumericValue('vndAmount');
    let usdExchange = isNewUsd ? getNumericValue('exchangeUsdVndNew') : getNumericValue('exchangeUsdVndOld');
    const eurExchange = getNumericValue('exchangeEurVnd');
    
    const hasRubOrVnd = rubAmount > 0 || vndAmount > 0;
    if (usdPrice && eurPrice && usdExchange && eurExchange && hasRubOrVnd) {
        const baseAmount = rubAmount > 0 ? rubAmount : 
            (vndAmount / (isUsd ? usdExchange : eurExchange) * (isUsd ? usdPrice : eurPrice));
        const vndViaUsd = baseAmount / usdPrice * usdExchange;
        const vndViaEur = baseAmount / eurPrice * eurExchange;
        const difference = isUsd ? (vndViaUsd - vndViaEur) : (vndViaEur - vndViaUsd);
        const rubDifference = Math.abs(difference / (isUsd ? vndViaUsd : vndViaEur) * baseAmount);
        const savingsOrLosses = difference < 0 ? 'Экономия' : 'Потери';
        const altCurrency = isUsd ? 'EUR' : 'USD';
        const resultText = 
            `<span class="${difference < 0 ? 'savings' : 'losses'}">${savingsOrLosses}</span> 
            ${Math.abs(Math.round(difference)).toLocaleString('ru-RU')} ₫ ⟹ 
            ${rubDifference.toFixed(2).replace('.', ',')} ₽, 
            если бы обмен был ${altCurrency}`;
            
        document.getElementById('differenceResult').innerHTML = resultText;
        
        if (isCalculatorMode && calculatorInitialized) {
            document.getElementById('calculatorDifferenceResult').innerHTML = resultText;
        }
    } else {
        const noDataText = 'Введите данные для расчета';
        document.getElementById('differenceResult').innerHTML = noDataText;
        if (isCalculatorMode && calculatorInitialized) {
            document.getElementById('calculatorDifferenceResult').innerHTML = noDataText;
        }
    }
}

// Переключение режима калькулятора
function toggleCalculatorMode() {
    const calculatorMode = document.getElementById('calculatorMode');
    const conversionBlock = document.getElementById('conversionBlock');
    const differenceBlock = document.getElementById('differenceBlock');
    const toggleButton = document.getElementById('toggleModeButton');
    
    isCalculatorMode = !isCalculatorMode;
    
    if (isCalculatorMode) {
        calculatorMode.style.display = 'flex';
        conversionBlock.style.display = 'none';
        differenceBlock.style.display = 'none';
        toggleButton.textContent = 'Показать всё';
        
        initCalculatorMode();
        calculatorInitialized = true;
    } else {
        calculatorMode.style.display = 'none';
        conversionBlock.style.display = 'block';
        differenceBlock.style.display = 'block';
        toggleButton.textContent = 'Оставить только конвертор';
        calculatorInitialized = false;
        
        // Скроллим вниз
        window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
    }
}

// Инициализация калькуляторного режима
function initCalculatorMode() {
    const vndValue = document.getElementById('vndAmount').value.replace(/\s/g, '') || '0';
    const rubValue = document.getElementById('rubAmount').value.replace(/\s/g, '') || '0';
    
    document.getElementById('vndCalculatorValue').textContent = formatDisplayValue(vndValue);
    document.getElementById('rubCalculatorValue').textContent = formatDisplayValue(rubValue);
    
    const activeField = lastActiveField === 'vnd' ? 'vnd' : 'rub';
    setActiveCalculatorField(activeField);
    
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
    updateCurrencyButton();
    
    calculateDifference();
}

// Обновление калькулятора из основного экрана
function updateCalculatorFromMain() {
    if (!isCalculatorMode || !calculatorInitialized) return;
    
    const vndValue = document.getElementById('vndAmount').value.replace(/\s/g, '') || '0';
    const rubValue = document.getElementById('rubAmount').value.replace(/\s/g, '') || '0';
    
    document.getElementById('vndCalculatorValue').textContent = formatDisplayValue(vndValue);
    document.getElementById('rubCalculatorValue').textContent = formatDisplayValue(rubValue);
    
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
    updateCurrencyButton();
}

// Установка активного поля в калькуляторе
function setActiveCalculatorField(field) {
    document.getElementById('activeCalculatorField').value = field;
    document.getElementById('calculatorLastActive').value = field;
    
    document.getElementById('vndCalculatorField').classList.toggle('active', field === 'vnd');
    document.getElementById('rubCalculatorField').classList.toggle('active', field === 'rub');
}

// Получение состояния калькулятора
function getCalculatorState() {
    try {
        return JSON.parse(document.getElementById('calculatorState').value);
    } catch (e) {
        return {
            currentInput: '0',
            operator: null,
            firstValue: null,
            waitingForSecondValue: false
        };
    }
}

// Сохранение состояния калькулятора
function setCalculatorState(state) {
    document.getElementById('calculatorState').value = JSON.stringify(state);
}

// Добавление цифры
function addDigit(digit) {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    const state = getCalculatorState();
    
    // Если ждем второе значение, начинаем новое
    if (state.waitingForSecondValue) {
        value = '0';
        state.waitingForSecondValue = false;
        state.currentInput = '0';
    }
    
    if (value === '0' && digit !== '.') {
        value = '';
    }
    
    if (digit === '.' && value.includes('.')) return;
    
    value += digit;
    display.textContent = formatDisplayValue(value);
    
    state.currentInput = value;
    setCalculatorState(state);
    
    updateMainFields();
}

// Добавление оператора
function addOperator(operator) {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    const state = getCalculatorState();
    
    // Если это первый оператор
    if (!state.operator) {
        state.firstValue = parseFloat(value);
        state.operator = operator;
        state.waitingForSecondValue = true;
        setCalculatorState(state);
        return;
    }
    
    // Если уже есть оператор и ждем второе значение
    if (state.waitingForSecondValue) {
        state.operator = operator;
        setCalculatorState(state);
        return;
    }
    
    // Вычисляем промежуточный результат
    const secondValue = parseFloat(value);
    const result = performCalculation(state.firstValue, secondValue, state.operator);
    
    display.textContent = formatDisplayValue(result.toString());
    
    state.firstValue = result;
    state.currentInput = result.toString();
    state.operator = operator;
    state.waitingForSecondValue = true;
    setCalculatorState(state);
    
    updateMainFields();
}

// Выполнение вычисления
function performCalculation(firstValue, secondValue, operator) {
    switch (operator) {
        case '+':
            return firstValue + secondValue;
        case '-':
            return firstValue - secondValue;
        case '*':
        case '×':
            return firstValue * secondValue;
        case '/':
        case '÷':
            return firstValue / secondValue;
        default:
            return secondValue;
    }
}

// Вычисление выражения
function calculateExpression() {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    const state = getCalculatorState();
    
    if (!state.operator || state.firstValue === null) {
        return;
    }
    
    const secondValue = parseFloat(value);
    const result = performCalculation(state.firstValue, secondValue, state.operator);
    
    display.textContent = formatDisplayValue(result.toString());
    
    state.currentInput = result.toString();
    state.firstValue = result;
    state.operator = null;
    state.waitingForSecondValue = false;
    setCalculatorState(state);
    
    updateMainFields();
    calculateDifference();
}

// Обмен значениями между полями
function swapValues() {
    const vndValue = document.getElementById('vndCalculatorValue').textContent;
    const rubValue = document.getElementById('rubCalculatorValue').textContent;
    
    document.getElementById('vndCalculatorValue').textContent = rubValue;
    document.getElementById('rubCalculatorValue').textContent = vndValue;
    
    const activeField = document.getElementById('activeCalculatorField').value;
    setActiveCalculatorField(activeField === 'vnd' ? 'rub' : 'vnd');
    
    updateMainFields();
    calculateDifference();
}

// Удаление последнего символа
function backspace() {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    const state = getCalculatorState();
    
    if (value.length > 1) {
        value = value.slice(0, -1);
    } else {
        value = '0';
    }
    
    display.textContent = formatDisplayValue(value);
    
    state.currentInput = value;
    setCalculatorState(state);
    
    updateMainFields();
}

// Очистка активного поля
function clearActiveField() {
    const field = document.getElementById('activeCalculatorField').value;
    document.getElementById(`${field}CalculatorValue`).textContent = '0';
    
    const state = getCalculatorState();
    state.currentInput = '0';
    setCalculatorState(state);
    
    updateMainFields();
}

// Очистка всех полей
function clearAllFields() {
    document.getElementById('vndCalculatorValue').textContent = '0';
    document.getElementById('rubCalculatorValue').textContent = '0';
    
    document.getElementById('calculatorState').value = JSON.stringify({
        currentInput: '0',
        operator: null,
        firstValue: null,
        waitingForSecondValue: false
    });
    
    updateMainFields();
    calculateDifference();
}

// Переключение валюты (USD/EUR)
function toggleCurrency() {
    const currentCurrency = document.getElementById('currentCurrency').value;
    const newCurrency = currentCurrency === 'USD' ? 'EUR' : 'USD';
    
    document.getElementById('currentCurrency').value = newCurrency;
    
    // Обновляем радиокнопки в основном режиме
    if (document.querySelector(`input[name="currency"][value="${newCurrency}"]`)) {
        document.querySelector(`input[name="currency"][value="${newCurrency}"]`).checked = true;
        handleCurrencyChange();
    }
    
    updateCurrencyButton();
}

// Обновление текста кнопки валюты
function updateCurrencyButton() {
    const currentCurrency = document.getElementById('currentCurrency').value;
    const button = document.getElementById('currencyToggleButton');
    button.textContent = currentCurrency === 'USD' ? 'USD => VND' : 'EUR => VND';
}

// Обновление основных полей из калькулятора
function updateMainFields() {
    const vndValue = formatCalcValue(document.getElementById('vndCalculatorValue').textContent);
    const rubValue = formatCalcValue(document.getElementById('rubCalculatorValue').textContent);
    
    document.getElementById('vndAmount').value = vndValue === '0' ? '' : formatDisplayValue(vndValue);
    document.getElementById('rubAmount').value = rubValue === '0' ? '' : formatDisplayValue(rubValue);
    
    const lastActive = document.getElementById('calculatorLastActive').value;
    lastActiveField = lastActive;
    
    calculate();
    updateConversion();
    calculateDifference();
}

// При вводе сохраняем значение поля
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', () => {
    localStorage.setItem(input.id, input.value);
  });
});

// При загрузке страницы восстанавливаем значения
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input').forEach(input => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue !== null) {
      input.value = savedValue;
    }
  });
  
  // Добавляем обработчик для клика на полях калькулятора
  document.getElementById('vndCalculatorField').addEventListener('click', () => {
    setActiveCalculatorField('vnd');
  });
  
  document.getElementById('rubCalculatorField').addEventListener('click', () => {
    setActiveCalculatorField('rub');
  });
  
  // Инициализация при загрузке
  calculate();
  updateConversion();
  calculateDifference();
  
  // Добавляем обработчики для радиокнопок
  document.querySelectorAll('input[name="currency"]').forEach(radio => {
    radio.addEventListener('change', handleCurrencyChange);
  });
  
  // Добавляем обработчик для чекбокса новых долларов
  document.getElementById('newUsd').addEventListener('change', () => {
    calculate();
    updateConversion();
    calculateDifference();
  });
});

// Добавим HTML калькулятора в конец body
document.addEventListener('DOMContentLoaded', function() {
    const calculatorHTML = `
    <!-- Калькуляторный режим (скрыт по умолчанию) -->
    <div class="calculator-mode" id="calculatorMode" style="display: none;">
        <div class="calculator-header">
            <div id="calculatorDifferenceResult" class="result-block" style="margin-bottom: 15px;">
                Введите данные для расчета
            </div>
            <div class="input-field-container">
                <div class="input-field" id="vndCalculatorField">
                    <span class="currency-icon">₫</span>
                    <div class="input-value" id="vndCalculatorValue" contenteditable="false">0</div>
                </div>
                <div class="exchange-icon-container">
                    <div class="exchange-icon" onclick="swapValues()">⇵</div>
                </div>
                <div class="input-field" id="rubCalculatorField">
                    <span class="currency-icon">₽</span>
                    <div class="input-value" id="rubCalculatorValue" contenteditable="false">0</div>
                </div>
            </div>
        </div>
        
        <div class="calculator-keypad">
            <!-- Первая строка кнопок -->
            <div class="keypad-row">
                <button class="key action-key" onclick="backspace()">⌫</button>
                <button class="key action-key" onclick="clearActiveField()">C</button>
                <button class="key action-key" onclick="clearAllFields()">AC</button>
                <button class="key math-key" onclick="addOperator('/')">÷</button>
            </div>
            <!-- Вторая строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" onclick="addDigit(7)">7</button>
                <button class="key digit-key" onclick="addDigit(8)">8</button>
                <button class="key digit-key" onclick="addDigit(9)">9</button>
                <button class="key math-key" onclick="addOperator('*')">×</button>
            </div>
            <!-- Третья строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" onclick="addDigit(4)">4</button>
                <button class="key digit-key" onclick="addDigit(5)">5</button>
                <button class="key digit-key" onclick="addDigit(6)">6</button>
                <button class="key math-key" onclick="addOperator('-')">−</button>
            </div>
            <!-- Четвертая строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" onclick="addDigit(1)">1</button>
                <button class="key digit-key" onclick="addDigit(2)">2</button>
                <button class="key digit-key" onclick="addDigit(3)">3</button>
                <button class="key math-key" onclick="addOperator('+')">+</button>
            </div>
            <!-- Пятая строка кнопок -->
            <div class="keypad-row">
                <button class="key action-key exchange-currency" onclick="toggleCurrency()" id="currencyToggleButton">
                    USD => VND
                </button>
                <button class="key digit-key" onclick="addDigit(0)">0</button>
                <button class="key digit-key" onclick="addDigit('.')">,</button>
                <button class="key math-key" onclick="calculateExpression()">=</button>
            </div>
        </div>
        
        <div class="calculator-footer">
            <button onclick="clearAll()" class="conversion-button-calculator">Сбросить все</button>
            <button onclick="toggleCalculatorMode()" class="conversion-button-calculator">Показать всё</button>
        </div>
        
        <!-- Скрытые поля для калькулятора -->
        <input type="hidden" id="activeCalculatorField" value="vnd">
        <input type="hidden" id="currentExpression" value="">
        <input type="hidden" id="currentCurrency" value="USD">
        <input type="hidden" id="calculatorLastActive" value="vnd">
        <input type="hidden" id="calculatorState" value='{"currentInput":"0","operator":null,"firstValue":null,"waitingForSecondValue":false}'>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', calculatorHTML);
});
