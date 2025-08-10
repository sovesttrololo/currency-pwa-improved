// Переменная для отслеживания последнего активного поля
let lastActiveField = 'rub'; // по умолчанию рубли
let isCalculatorMode = false; // Флаг режима калькулятора
let calculatorInitialized = false; // Флаг инициализации калькулятора

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(function(registration) {
            console.log('ServiceWorker registered with scope:', registration.scope);
        })
        .catch(function(err) {
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
    handleCurrencyChange();
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
        handleCurrencyChange();
    } catch (error) {
        alert('Не удалось загрузить курсы валют. Проверьте интернет-соединение.');
    }
}

// Clear market rates
function clearMarketRates() {
    document.getElementById('marketUsdVnd').value = '';
    document.getElementById('marketEurVnd').value = '';
    handleCurrencyChange();
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
    
    handleCurrencyChange();
    
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

// Обработчик изменения валюты и других параметров
function handleCurrencyChange() {
    calculate();
    updateConversion();
    calculateDifference();
    saveSelectedCurrency();
    
    // Обновляем калькулятор, если он активен
    if (isCalculatorMode && calculatorInitialized) {
        const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
        if (document.getElementById('currentCurrency')) {
            document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
        }
        updateCurrencyButton();
        // Также пересчитываем значения в калькуляторе
        updateCalculatorFromMain();
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
            if (document.getElementById('calculatorDifferenceResult')) {
                document.getElementById('calculatorDifferenceResult').innerHTML = resultText;
            }
        }
    } else {
        const noDataText = 'Введите данные для расчета';
        document.getElementById('differenceResult').innerHTML = noDataText;
        if (isCalculatorMode && calculatorInitialized) {
            if (document.getElementById('calculatorDifferenceResult')) {
                document.getElementById('calculatorDifferenceResult').innerHTML = noDataText;
            }
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
        // Если калькулятор еще не создан, создаем его
        if (!document.getElementById('calculatorMode')) {
            createCalculator();
        }
        calculatorMode.style.display = 'flex';
        conversionBlock.style.display = 'none';
        differenceBlock.style.display = 'none';
        toggleButton.textContent = 'Показать всё';
        
        initCalculatorMode();
        calculatorInitialized = true;
    } else {
        if (calculatorMode) {
            calculatorMode.style.display = 'none';
        }
        conversionBlock.style.display = 'block';
        differenceBlock.style.display = 'block';
        toggleButton.textContent = 'Оставить только конвертор';
        calculatorInitialized = false;
        
        // Скроллим вниз
        window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
    }
}

// Создание HTML калькулятора
function createCalculator() {
    const calculatorHTML = `
    <!-- Калькуляторный режим (скрыт по умолчанию) -->
    <div class="calculator-mode" id="calculatorMode" style="display: none;">
        <div class="calculator-header">
            <div id="calculatorDifferenceResult" class="result-block">
                Введите данные для расчета
            </div>
            <div class="input-field-container">
                <div class="input-field" id="vndCalculatorField">
                    <span class="currency-icon">₫</span>
                    <div class="input-value" id="vndCalculatorValue" contenteditable="false">0</div>
                </div>
                <div class="exchange-icon-container">
                    <div class="exchange-icon" id="exchangeIcon">⇵</div>
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
                <button class="key action-key" id="backspaceBtn">⌫</button>
                <button class="key action-key" id="clearActiveBtn">C</button>
                <button class="key action-key" id="clearAllBtn">AC</button>
                <button class="key math-key" id="divideBtn">÷</button>
            </div>
            <!-- Вторая строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" id="digit7Btn">7</button>
                <button class="key digit-key" id="digit8Btn">8</button>
                <button class="key digit-key" id="digit9Btn">9</button>
                <button class="key math-key" id="multiplyBtn">×</button>
            </div>
            <!-- Третья строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" id="digit4Btn">4</button>
                <button class="key digit-key" id="digit5Btn">5</button>
                <button class="key digit-key" id="digit6Btn">6</button>
                <button class="key math-key" id="subtractBtn">−</button>
            </div>
            <!-- Четвертая строка кнопок -->
            <div class="keypad-row">
                <button class="key digit-key" id="digit1Btn">1</button>
                <button class="key digit-key" id="digit2Btn">2</button>
                <button class="key digit-key" id="digit3Btn">3</button>
                <button class="key math-key" id="addBtn">+</button>
            </div>
            <!-- Пятая строка кнопок -->
            <div class="keypad-row">
                <button class="key action-key exchange-currency" id="currencyToggleButton">
                    USD => VND
                </button>
                <button class="key digit-key" id="digit0Btn">0</button>
                <button class="key digit-key" id="decimalBtn">,</button>
                <button class="key math-key" id="equalsBtn">=</button>
            </div>
        </div>
        
        <div class="calculator-footer">
            <button id="clearAllFooterBtn" class="conversion-button-calculator">Сбросить все</button>
            <button id="showAllFooterBtn" class="conversion-button-calculator">Показать всё</button>
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
    
    // Добавляем обработчики событий после создания элементов
    setTimeout(() => {
        if (document.getElementById('vndCalculatorField')) {
            document.getElementById('vndCalculatorField').addEventListener('click', () => {
                setActiveCalculatorField('vnd');
            });
        }
        if (document.getElementById('rubCalculatorField')) {
            document.getElementById('rubCalculatorField').addEventListener('click', () => {
                setActiveCalculatorField('rub');
            });
        }
        if (document.getElementById('exchangeIcon')) {
            document.getElementById('exchangeIcon').addEventListener('click', swapValues);
        }
        
        // Кнопки калькулятора
        if (document.getElementById('backspaceBtn')) {
            document.getElementById('backspaceBtn').addEventListener('click', backspace);
        }
        if (document.getElementById('clearActiveBtn')) {
            document.getElementById('clearActiveBtn').addEventListener('click', clearActiveField);
        }
        if (document.getElementById('clearAllBtn')) {
            document.getElementById('clearAllBtn').addEventListener('click', clearAllFields);
        }
        if (document.getElementById('divideBtn')) {
            document.getElementById('divideBtn').addEventListener('click', () => addOperator('/'));
        }
        if (document.getElementById('multiplyBtn')) {
            document.getElementById('multiplyBtn').addEventListener('click', () => addOperator('*'));
        }
        if (document.getElementById('subtractBtn')) {
            document.getElementById('subtractBtn').addEventListener('click', () => addOperator('-'));
        }
        if (document.getElementById('addBtn')) {
            document.getElementById('addBtn').addEventListener('click', () => addOperator('+'));
        }
        if (document.getElementById('digit7Btn')) {
            document.getElementById('digit7Btn').addEventListener('click', () => addDigit('7'));
        }
        if (document.getElementById('digit8Btn')) {
            document.getElementById('digit8Btn').addEventListener('click', () => addDigit('8'));
        }
        if (document.getElementById('digit9Btn')) {
            document.getElementById('digit9Btn').addEventListener('click', () => addDigit('9'));
        }
        if (document.getElementById('digit4Btn')) {
            document.getElementById('digit4Btn').addEventListener('click', () => addDigit('4'));
        }
        if (document.getElementById('digit5Btn')) {
            document.getElementById('digit5Btn').addEventListener('click', () => addDigit('5'));
        }
        if (document.getElementById('digit6Btn')) {
            document.getElementById('digit6Btn').addEventListener('click', () => addDigit('6'));
        }
        if (document.getElementById('digit1Btn')) {
            document.getElementById('digit1Btn').addEventListener('click', () => addDigit('1'));
        }
        if (document.getElementById('digit2Btn')) {
            document.getElementById('digit2Btn').addEventListener('click', () => addDigit('2'));
        }
        if (document.getElementById('digit3Btn')) {
            document.getElementById('digit3Btn').addEventListener('click', () => addDigit('3'));
        }
        if (document.getElementById('digit0Btn')) {
            document.getElementById('digit0Btn').addEventListener('click', () => addDigit('0'));
        }
        if (document.getElementById('decimalBtn')) {
            document.getElementById('decimalBtn').addEventListener('click', () => addDigit('.'));
        }
        if (document.getElementById('equalsBtn')) {
            document.getElementById('equalsBtn').addEventListener('click', calculateExpression);
        }
        if (document.getElementById('currencyToggleButton')) {
            document.getElementById('currencyToggleButton').addEventListener('click', toggleCurrency);
        }
        
        // Кнопки в футере
        if (document.getElementById('clearAllFooterBtn')) {
            document.getElementById('clearAllFooterBtn').addEventListener('click', clearAll);
        }
        if (document.getElementById('showAllFooterBtn')) {
            document.getElementById('showAllFooterBtn').addEventListener('click', toggleCalculatorMode);
        }
    }, 100); // Небольшая задержка для уверенности в создании DOM
}

// Инициализация калькуляторного режима
function initCalculatorMode() {
    const vndValue = document.getElementById('vndAmount').value.replace(/\s/g, '') || '0';
    const rubValue = document.getElementById('rubAmount').value.replace(/\s/g, '') || '0';
    
    if (document.getElementById('vndCalculatorValue')) {
        document.getElementById('vndCalculatorValue').textContent = formatDisplayValue(vndValue);
    }
    if (document.getElementById('rubCalculatorValue')) {
        document.getElementById('rubCalculatorValue').textContent = formatDisplayValue(rubValue);
    }
    
    const activeField = lastActiveField === 'vnd' ? 'vnd' : 'rub';
    setActiveCalculatorField(activeField);
    
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    if (document.getElementById('currentCurrency')) {
        document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
    }
    updateCurrencyButton();
    
    calculateDifference();
}

// Обновление калькулятора из основного экрана
function updateCalculatorFromMain() {
    if (!isCalculatorMode || !calculatorInitialized) return;
    
    const vndValue = document.getElementById('vndAmount').value.replace(/\s/g, '') || '0';
    const rubValue = document.getElementById('rubAmount').value.replace(/\s/g, '') || '0';
    
    if (document.getElementById('vndCalculatorValue')) {
        document.getElementById('vndCalculatorValue').textContent = formatDisplayValue(vndValue);
    }
    if (document.getElementById('rubCalculatorValue')) {
        document.getElementById('rubCalculatorValue').textContent = formatDisplayValue(rubValue);
    }
    
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    if (document.getElementById('currentCurrency')) {
        document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
    }
    updateCurrencyButton();
}

// Установка активного поля в калькуляторе
function setActiveCalculatorField(field) {
    if (document.getElementById('activeCalculatorField')) {
        document.getElementById('activeCalculatorField').value = field;
    }
    if (document.getElementById('calculatorLastActive')) {
        document.getElementById('calculatorLastActive').value = field;
    }
    
    if (document.getElementById('vndCalculatorField')) {
        document.getElementById('vndCalculatorField').classList.toggle('active', field === 'vnd');
    }
    if (document.getElementById('rubCalculatorField')) {
        document.getElementById('rubCalculatorField').classList.toggle('active', field === 'rub');
    }
}

// Получение состояния калькулятора
function getCalculatorState() {
    const stateInput = document.getElementById('calculatorState');
    if (!stateInput) return {
        currentInput: '0',
        operator: null,
        firstValue: null,
        waitingForSecondValue: false
    };
    
    try {
        return JSON.parse(stateInput.value);
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
    const stateInput = document.getElementById('calculatorState');
    if (stateInput) {
        stateInput.value = JSON.stringify(state);
    }
}

// Добавление цифры
function addDigit(digit) {
    const fieldElement = document.getElementById('activeCalculatorField');
    const displayElement = fieldElement ? 
        document.getElementById(`${fieldElement.value}CalculatorValue`) : null;
    
    if (!displayElement) return;
    
    let value = formatCalcValue(displayElement.textContent);
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
    displayElement.textContent = formatDisplayValue(value);
    
    state.currentInput = value;
    setCalculatorState(state);
    
    updateMainFields();
}

// Добавление оператора
function addOperator(operator) {
    const fieldElement = document.getElementById('activeCalculatorField');
    const displayElement = fieldElement ? 
        document.getElementById(`${fieldElement.value}CalculatorValue`) : null;
    
    if (!displayElement) return;
    
    let value = formatCalcValue(displayElement.textContent);
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
    
    displayElement.textContent = formatDisplayValue(result.toString());
    
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
    const fieldElement = document.getElementById('activeCalculatorField');
    const displayElement = fieldElement ? 
        document.getElementById(`${fieldElement.value}CalculatorValue`) : null;
    
    if (!displayElement) return;
    
    let value = formatCalcValue(displayElement.textContent);
    const state = getCalculatorState();
    
    if (!state.operator || state.firstValue === null) {
        return;
    }
    
    const secondValue = parseFloat(value);
    const result = performCalculation(state.firstValue, secondValue, state.operator);
    
    displayElement.textContent = formatDisplayValue(result.toString());
    
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
    const vndElement = document.getElementById('vndCalculatorValue');
    const rubElement = document.getElementById('rubCalculatorValue');
    
    if (!vndElement || !rubElement) return;
    
    const vndValue = vndElement.textContent;
    const rubValue = rubElement.textContent;
    
    vndElement.textContent = rubValue;
    rubElement.textContent = vndValue;
    
    const activeFieldElement = document.getElementById('activeCalculatorField');
    const activeField = activeFieldElement ? activeFieldElement.value : 'vnd';
    setActiveCalculatorField(activeField === 'vnd' ? 'rub' : 'vnd');
    
    updateMainFields();
    calculateDifference();
}

// Удаление последнего символа
function backspace() {
    const fieldElement = document.getElementById('activeCalculatorField');
    const displayElement = fieldElement ? 
        document.getElementById(`${fieldElement.value}CalculatorValue`) : null;
    
    if (!displayElement) return;
    
    let value = formatCalcValue(displayElement.textContent);
    const state = getCalculatorState();
    
    if (value.length > 1) {
        value = value.slice(0, -1);
    } else {
        value = '0';
    }
    
    displayElement.textContent = formatDisplayValue(value);
    
    state.currentInput = value;
    setCalculatorState(state);
    
    updateMainFields();
}

// Очистка активного поля
function clearActiveField() {
    const fieldElement = document.getElementById('activeCalculatorField');
    const displayElement = fieldElement ? 
        document.getElementById(`${fieldElement.value}CalculatorValue`) : null;
    
    if (!displayElement) return;
    
    displayElement.textContent = '0';
    
    const state = getCalculatorState();
    state.currentInput = '0';
    setCalculatorState(state);
    
    updateMainFields();
}

// Очистка всех полей
function clearAllFields() {
    const vndElement = document.getElementById('vndCalculatorValue');
    const rubElement = document.getElementById('rubCalculatorValue');
    const stateElement = document.getElementById('calculatorState');
    
    if (vndElement) vndElement.textContent = '0';
    if (rubElement) rubElement.textContent = '0';
    
    if (stateElement) {
        stateElement.value = JSON.stringify({
            currentInput: '0',
            operator: null,
            firstValue: null,
            waitingForSecondValue: false
        });
    }
    
    updateMainFields();
    calculateDifference();
}

// Переключение валюты (USD/EUR)
function toggleCurrency() {
    const currencyElement = document.getElementById('currentCurrency');
    if (!currencyElement) return;
    
    const currentCurrency = currencyElement.value;
    const newCurrency = currentCurrency === 'USD' ? 'EUR' : 'USD';
    
    currencyElement.value = newCurrency;
    
    // Обновляем радиокнопки в основном режиме
    const radioToCheck = document.querySelector(`input[name="currency"][value="${newCurrency}"]`);
    if (radioToCheck) {
        radioToCheck.checked = true;
        handleCurrencyChange();
    }
    
    updateCurrencyButton();
}

// Обновление текста кнопки валюты
function updateCurrencyButton() {
    const currencyElement = document.getElementById('currentCurrency');
    const buttonElement = document.getElementById('currencyToggleButton');
    
    if (!currencyElement || !buttonElement) return;
    
    const currentCurrency = currencyElement.value;
    buttonElement.textContent = currentCurrency === 'USD' ? 'USD => VND' : 'EUR => VND';
}

// Обновление основных полей из калькулятора
function updateMainFields() {
    const vndElement = document.getElementById('vndCalculatorValue');
    const rubElement = document.getElementById('rubCalculatorValue');
    const lastActiveElement = document.getElementById('calculatorLastActive');
    
    if (!vndElement || !rubElement) return;
    
    const vndValue = formatCalcValue(vndElement.textContent);
    const rubValue = formatCalcValue(rubElement.textContent);
    
    document.getElementById('vndAmount').value = vndValue === '0' ? '' : formatDisplayValue(vndValue);
    document.getElementById('rubAmount').value = rubValue === '0' ? '' : formatDisplayValue(rubValue);
    
    if (lastActiveElement) {
        lastActiveField = lastActiveElement.value;
    }
    
    handleCurrencyChange(); // Используем обновленный обработчик
}

function saveSelectedCurrency() {
    const selectedCurrency = document.querySelector('input[name="currency"]:checked').value;
    localStorage.setItem('selectedCurrency', selectedCurrency);
}

// Восстанавливаем выбранную валюту из localStorage
function restoreSelectedCurrency() {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
        document.querySelector(`input[name="currency"][value="${savedCurrency}"]`).checked = true;
    }
}
  
// При вводе сохраняем значение поля
document.querySelectorAll('input').forEach(input => {
    const eventType = input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
        if (input.type === 'checkbox') {
        localStorage.setItem(input.id, input.checked);
      } else {
        const valueToStore = input.value;
        const keyToStoe = input.key;
         if (keyToStoe !== null && keyToStoe !== undefined && keyToStoe.trim() !== '') {
             localStorage.setItem(input.id, valueToStore);
         }
        }
    });
});

document.querySelectorAll('input[name="currency"]').forEach(radio => {
  radio.addEventListener('change', handleCurrencyChange);
});

// При загрузке страницы восстанавливаем значения
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input').forEach(input => {      
      const savedValue = localStorage.getItem(input.id);
      if (input.type === 'checkbox') {
          input.checked = savedValue === 'true';
        } else {
      if (savedValue !== null) {
        input.value = savedValue;
      }
      }
  });
    calculate();
  updateConversion();
  calculateDifference();
});
  // Инициализация при загрузке
  handleCurrencyChange();
 restoreSelectedCurrency();
    // Добавляем обработчики для радиокнопок
  document.querySelectorAll('input[name="currency"]').forEach(radio => {
    radio.addEventListener('change', handleCurrencyChange);
  });
  
  // Добавляем обработчик для чекбокса новых долларов
  const newUsdCheckbox = document.getElementById('newUsd');
  if (newUsdCheckbox) {
    newUsdCheckbox.addEventListener('change', handleCurrencyChange);
  }
