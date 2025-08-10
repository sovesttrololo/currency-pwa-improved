// Переменная для отслеживания последнего активного поля
let lastActiveField = 'rub'; // по умолчанию рубли
let isCalculatorMode = false; // Флаг режима калькулятора
let calculatorInitialized = false; // Флаг инициализации калькулятора
let calculatorState = {
    currentInput: '0',
    operator: null,
    firstValue: null,
    waitingForSecondValue: false,
    expression: '',
    lastOperation: null
};

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
    updateConversion(); // Добавлено для обновления конвертации при изменении курсов
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
    
    // Для целых чисел
    if (Number.isInteger(num)) {
        return num.toLocaleString('ru-RU');
    }
    
    // Для дробных чисел
    return num.toLocaleString('ru-RU', {
        maximumFractionDigits: 10
    });
}

// Format value for calculation (without separators)
function formatCalcValue(value) {
    return value.replace(/\s/g, '').replace(',', '.');
}

// Fetch exchange rates from API
async function fetchRates() {
    try {
        // Using exchangerate-api as it's free and doesn't require API key
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        const usdToVnd = Math.ceil(data.rates.VND);
        const eurToUsd = data.rates.EUR;
        const eurToVnd = Math.round(usdToVnd / eurToUsd);
        document.getElementById('marketUsdVnd').value = usdToVnd.toLocaleString('ru-RU');
        document.getElementById('marketEurVnd').value = eurToVnd.toLocaleString('ru-RU');
        calculate();
        updateConversion(); // Обновить конвертацию после получения курсов
    } catch (error) {
        alert('Не удалось загрузить курсы валют. Проверьте интернет-соединение.');
    }
}

// Clear market rates
function clearMarketRates() {
    document.getElementById('marketUsdVnd').value = '';
    document.getElementById('marketEurVnd').value = '';
    calculate();
    updateConversion(); // Обновить конвертацию после очистки
}

// Clear conversion fields
function clearConversion() {
    document.getElementById('rubAmount').value = '';
    document.getElementById('vndAmount').value = '';
    lastActiveField = 'rub'; // Сбросить к значению по умолчанию
    calculateDifference(); // Пересчитать разницу
    
    // Если в калькуляторном режиме, обновить его
    if (isCalculatorMode && calculatorInitialized) {
        initCalculatorMode();
    }
}

// Clear all fields and cache
function clearAll() {
    // Очищаем все поля
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
        input.value = '';
        localStorage.removeItem(input.id);
    });
    
    // Сбрасываем чекбоксы и радиокнопки
    document.getElementById('newUsd').checked = false;
    document.querySelector('input[name="currency"][value="USD"]').checked = true;
    
    // Пересчитываем
    calculate();
    calculateDifference();
    
    // Если в калькуляторном режиме, обновить его
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
    // Calculate differences for exchange rates
    const marketUsd = getNumericValue('marketUsdVnd');
    const marketEur = getNumericValue('marketEurVnd');
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    const exchangeUsdNew = getNumericValue('exchangeUsdVndNew');
    const exchangeUsdOld = getNumericValue('exchangeUsdVndOld');
    const exchangeEur = getNumericValue('exchangeEurVnd');
    // USD New difference - corrected formula            
    exchangeDiff(marketUsd,exchangeUsdNew,usdPrice,'diffUsdNew');    
    // USD Old difference - corrected formula            
    exchangeDiff(marketUsd,exchangeUsdOld,usdPrice, 'diffUsdOld');
    // EUR difference - corrected formula     
    exchangeDiff(marketEur,exchangeEur,eurPrice, 'diffEur');
    // Calculate overall difference
    calculateDifference();
}

// Update conversion when currency or new USD checkbox changes
function updateConversion() {
    // Пересчитываем значения в зависимости от последнего активного поля
    if (lastActiveField === 'rub' && document.getElementById('rubAmount').value) {
        convertRubToVnd();
    } else if (lastActiveField === 'vnd' && document.getElementById('vndAmount').value) {
        convertVndToRub();
    }
    calculateDifference(); // Обязательно пересчитываем разницу
}

// Обработчик изменения валюты
function handleCurrencyChange() {
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    
    // Обновляем отображение кнопки валюты в калькуляторном режиме
    if (isCalculatorMode && calculatorInitialized) {
        document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
        updateCurrencyExchangeButton();
    }
    
    // Пересчитываем конвертацию и разницу
    calculate();
    updateConversion();
    calculateDifference();
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
    // Используем любое из заполненных значений для расчета
    const hasRubOrVnd = rubAmount > 0 || vndAmount > 0;
    if (usdPrice && eurPrice && usdExchange && eurExchange && hasRubOrVnd) {
        // Определяем базовую сумму в рублях
        const baseAmount = rubAmount > 0 ? rubAmount : 
            (vndAmount / (isUsd ? usdExchange : eurExchange) * (isUsd ? usdPrice : eurPrice));
        const vndViaUsd = baseAmount / usdPrice * usdExchange;
        const vndViaEur = baseAmount / eurPrice * eurExchange;
        const difference = isUsd ? (vndViaUsd - vndViaEur) : (vndViaEur - vndViaUsd);
        const rubDifference = Math.abs(difference / (isUsd ? vndViaUsd : vndViaEur) * baseAmount);
        const savingsOrLosses = difference < 0 ? 'Экономия' : 'Потери';
        const altCurrency = isUsd ? 'EUR' : 'USD';
        document.getElementById('differenceResult').innerHTML = 
            `<span class="${difference < 0 ? 'savings' : 'losses'}">${savingsOrLosses}</span> 
            ${Math.abs(Math.round(difference)).toLocaleString('ru-RU')} ₫ ⟹ 
            ${rubDifference.toFixed(2).replace('.', ',')} ₽, 
            если бы обмен был ${altCurrency}`;
            
        // Обновляем блок разницы в калькуляторном режиме, если он активен
        if (isCalculatorMode && calculatorInitialized) {
            document.getElementById('calculatorDifferenceResult').innerHTML = document.getElementById('differenceResult').innerHTML;
            document.getElementById('calculatorDifferenceResult').style.display = 'block';
        }
    } else {
        document.getElementById('differenceResult').innerHTML = 'Введите данные для расчета';
        if (isCalculatorMode && calculatorInitialized) {
            document.getElementById('calculatorDifferenceResult').innerHTML = 'Введите данные для расчета';
            document.getElementById('calculatorDifferenceResult').style.display = 'block';
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
        // Переключаемся в режим калькулятора
        calculatorMode.style.display = 'flex';
        conversionBlock.style.display = 'none';
        differenceBlock.style.display = 'none';
        toggleButton.textContent = 'Показать всё';
        
        // Инициализируем калькулятор
        initCalculatorMode();
        calculatorInitialized = true;
    } else {
        // Возвращаемся к обычному режиму
        calculatorMode.style.display = 'none';
        conversionBlock.style.display = 'block';
        differenceBlock.style.display = 'block';
        toggleButton.textContent = 'Оставить только конвертор';
        calculatorInitialized = false;
    }
}

// Инициализация калькуляторного режима
function initCalculatorMode() {
    // Копируем значения из обычных полей
    const vndValue = document.getElementById('vndAmount').value.replace(/\s/g, '') || '0';
    const rubValue = document.getElementById('rubAmount').value.replace(/\s/g, '') || '0';
    
    document.getElementById('vndCalculatorValue').textContent = vndValue === '' ? '0' : formatDisplayValue(vndValue);
    document.getElementById('rubCalculatorValue').textContent = rubValue === '' ? '0' : formatDisplayValue(rubValue);
    
    // Устанавливаем активное поле
    const activeField = lastActiveField === 'vnd' ? 'vnd' : 'rub';
    setActiveCalculatorField(activeField);
    
    // Устанавливаем текущую валюту
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    document.getElementById('currentCurrency').value = isUsd ? 'USD' : 'EUR';
    updateCurrencyExchangeButton();
    
    // Инициализируем состояние калькулятора
    resetCalculatorState();
    
    // Обновляем блок разницы
    calculateDifference();
}

// Установка активного поля в калькуляторе
function setActiveCalculatorField(field) {
    document.getElementById('activeCalculatorField').value = field;
    document.getElementById('calculatorLastActive').value = field;
    
    // Обновляем визуальное отображение
    document.getElementById('vndCalculatorField').classList.toggle('active', field === 'vnd');
    document.getElementById('rubCalculatorField').classList.toggle('active', field === 'rub');
}

// Сброс состояния калькулятора
function resetCalculatorState() {
    calculatorState = {
        currentInput: '0',
        operator: null,
        firstValue: null,
        waitingForSecondValue: false,
        expression: '',
        lastOperation: null
    };
}

// Добавление цифры
function addDigit(digit) {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    // Если текущее значение - результат, сбрасываем его
    if (calculatorState.waitingForSecondValue) {
        value = '0';
        calculatorState.waitingForSecondValue = false;
    }
    
    // Если текущее значение 0, заменяем его
    if (value === '0' && digit !== '.') {
        value = '';
    }
    
    // Добавляем цифру
    if (digit === '.' && value.includes('.')) return; // Не добавляем вторую точку
    
    value += digit;
    
    // Обновляем отображение
    display.textContent = formatDisplayValue(value);
    
    // Обновляем состояние
    calculatorState.currentInput = value;
    
    // Обновляем основные поля
    updateMainFields();
}

// Добавление оператора
function addOperator(operator) {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    const value = formatCalcValue(display.textContent);
    
    // Если это первый оператор
    if (!calculatorState.operator) {
        calculatorState.firstValue = parseFloat(value);
        calculatorState.operator = operator;
        calculatorState.waitingForSecondValue = true;
        return;
    }
    
    // Если уже есть оператор, вычисляем промежуточный результат
    if (calculatorState.waitingForSecondValue) {
        calculatorState.operator = operator;
        return;
    }
    
    // Вычисляем промежуточный результат
    const secondValue = parseFloat(value);
    const result = performCalculation(calculatorState.firstValue, secondValue, calculatorState.operator);
    
    // Обновляем отображение
    display.textContent = formatDisplayValue(result.toString());
    
    // Обновляем состояние
    calculatorState.firstValue = result;
    calculatorState.currentInput = result.toString();
    calculatorState.operator = operator;
    calculatorState.waitingForSecondValue = true;
}

// Вычисление выражения
function calculateExpression() {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    const value = formatCalcValue(display.textContent);
    
    if (!calculatorState.operator || !calculatorState.firstValue) {
        return;
    }
    
    const secondValue = parseFloat(value);
    const result = performCalculation(calculatorState.firstValue, secondValue, calculatorState.operator);
    
    // Обновляем отображение
    display.textContent = formatDisplayValue(result.toString());
    
    // Обновляем состояние
    calculatorState.currentInput = result.toString();
    calculatorState.firstValue = result;
    calculatorState.operator = null;
    calculatorState.waitingForSecondValue = false;
    
    // Обновляем основные поля
    updateMainFields();
    
    // Пересчитываем разницу
    calculateDifference();
}

// Выполнение вычисления
function performCalculation(firstValue, secondValue, operator) {
    switch (operator) {
        case '+':
            return firstValue + secondValue;
        case '-':
            return firstValue - secondValue;
        case '×':
        case '*':
            return firstValue * secondValue;
        case '÷':
        case '/':
            return firstValue / secondValue;
        default:
            return secondValue;
    }
}

// Обмен значениями между полями
function swapValues() {
    const vndValue = document.getElementById('vndCalculatorValue').textContent;
    const rubValue = document.getElementById('rubCalculatorValue').textContent;
    
    document.getElementById('vndCalculatorValue').textContent = rubValue;
    document.getElementById('rubCalculatorValue').textContent = vndValue;
    
    // Меняем активное поле
    const activeField = document.getElementById('activeCalculatorField').value;
    setActiveCalculatorField(activeField === 'vnd' ? 'rub' : 'vnd');
    
    // Обновляем основные поля
    updateMainFields();
    
    // Пересчитываем разницу
    calculateDifference();
}

// Удаление последнего символа
function backspace() {
    const field = document.getElementById('activeCalculatorField').value;
    const display = document.getElementById(`${field}CalculatorValue`);
    let value = formatCalcValue(display.textContent);
    
    if (value.length > 1) {
        value = value.slice(0, -1);
    } else {
        value = '0';
    }
    
    // Обновляем отображение
    display.textContent = formatDisplayValue(value);
    
    // Обновляем состояние
    calculatorState.currentInput = value;
    
    // Обновляем основные поля
    updateMainFields();
}

// Очистка активного поля
function clearActiveField() {
    const field = document.getElementById('activeCalculatorField').value;
    document.getElementById(`${field}CalculatorValue`).textContent = '0';
    
    // Сброс состояния калькулятора
    resetCalculatorState();
    
    // Обновляем основные поля
    updateMainFields();
}

// Очистка всех полей
function clearAllFields() {
    document.getElementById('vndCalculatorValue').textContent = '0';
    document.getElementById('rubCalculatorValue').textContent = '0';
    
    // Сброс состояния калькулятора
    resetCalculatorState();
    
    // Обновляем основные поля
    updateMainFields();
    
    // Пересчитываем разницу
    calculateDifference();
}

// Переключение валюты (USD/EUR)
function toggleCurrency() {
    const currencyBtn = document.querySelector('.currency-exchange');
    const currentCurrency = document.getElementById('currentCurrency').value;
    
    // Переключаем класс для анимации
    currencyBtn.classList.toggle('flipped');
    
    // Меняем значение
    const newCurrency = currentCurrency === 'USD' ? 'EUR' : 'USD';
    document.getElementById('currentCurrency').value = newCurrency;
    
    // Обновляем радиокнопки в основном режиме
    if (document.querySelector(`input[name="currency"][value="${newCurrency}"]`)) {
        document.querySelector(`input[name="currency"][value="${newCurrency}"]`).checked = true;
        handleCurrencyChange();
    }
    
    updateCurrencyExchangeButton();
}

// Обновление текста кнопки валют
function updateCurrencyExchangeButton() {
    const currentCurrency = document.getElementById('currentCurrency').value;
    const currencyBtn = document.querySelector('.currency-exchange');
    
    // Удаляем классы перед добавлением новых
    currencyBtn.classList.remove('usd', 'eur');
    currencyBtn.classList.add(currentCurrency.toLowerCase());
}

// Обновление основных полей из калькулятора
function updateMainFields() {
    const vndValue = formatCalcValue(document.getElementById('vndCalculatorValue').textContent);
    const rubValue = formatCalcValue(document.getElementById('rubCalculatorValue').textContent);
    
    // Обновляем основные поля
    document.getElementById('vndAmount').value = vndValue === '0' ? '' : formatDisplayValue(vndValue);
    document.getElementById('rubAmount').value = rubValue === '0' ? '' : formatDisplayValue(rubValue);
    
    // Обновляем последнее активное поле
    const lastActive = document.getElementById('calculatorLastActive').value;
    lastActiveField = lastActive;
    
    // Пересчитываем
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
  
  // Добавляем обработчик для фокуса на полях калькулятора
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
    
    // Если в калькуляторном режиме, обновить валюту
    if (isCalculatorMode && calculatorInitialized) {
      initCalculatorMode();
    }
  });
});