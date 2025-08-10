// Переменная для отслеживания последнего активного поля
let lastActiveField = 'rub'; // по умолчанию рубли

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        console.log('ServiceWorker registered');
    }).catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
    });
}

// Сохранение данных в localStorage
function saveData() {
    const data = {
        usdPrice: document.getElementById('usdPrice').value,
        eurPrice: document.getElementById('eurPrice').value,
        marketUsdVnd: document.getElementById('marketUsdVnd').value,
        marketEurVnd: document.getElementById('marketEurVnd').value,
        exchangeUsdVndNew: document.getElementById('exchangeUsdVndNew').value,
        exchangeUsdVndOld: document.getElementById('exchangeUsdVndOld').value,
        exchangeEurVnd: document.getElementById('exchangeEurVnd').value,
        rubAmount: document.getElementById('rubAmount').value,
        vndAmount: document.getElementById('vndAmount').value,
        newUsd: document.getElementById('newUsd').checked,
        currency: document.querySelector('input[name="currency"]:checked').value,
        lastActiveField: lastActiveField
    };
    
    try {
        localStorage.setItem('currencyCalculatorData', JSON.stringify(data));
    } catch (e) {
        console.warn('Не удалось сохранить данные в localStorage:', e);
    }
}

// Загрузка данных из localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('currencyCalculatorData');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            document.getElementById('usdPrice').value = data.usdPrice || '';
            document.getElementById('eurPrice').value = data.eurPrice || '';
            document.getElementById('marketUsdVnd').value = data.marketUsdVnd || '';
            document.getElementById('marketEurVnd').value = data.marketEurVnd || '';
            document.getElementById('exchangeUsdVndNew').value = data.exchangeUsdVndNew || '';
            document.getElementById('exchangeUsdVndOld').value = data.exchangeUsdVndOld || '';
            document.getElementById('exchangeEurVnd').value = data.exchangeEurVnd || '';
            document.getElementById('rubAmount').value = data.rubAmount || '';
            document.getElementById('vndAmount').value = data.vndAmount || '';
            document.getElementById('newUsd').checked = data.newUsd || false;
            
            // Установка радио-кнопки
            const currencyRadio = document.querySelector(`input[name="currency"][value="${data.currency || 'USD'}"]`);
            if (currencyRadio) {
                currencyRadio.checked = true;
            }
            
            lastActiveField = data.lastActiveField || 'rub';
            
            // Пересчет после загрузки данных
            calculate();
        }
    } catch (e) {
        console.warn('Не удалось загрузить данные из localStorage:', e);
    }
}

// Очистка всех данных
function clearAllData() {
    // Очищаем все поля
    document.getElementById('usdPrice').value = '';
    document.getElementById('eurPrice').value = '';
    document.getElementById('marketUsdVnd').value = '';
    document.getElementById('marketEurVnd').value = '';
    document.getElementById('exchangeUsdVndNew').value = '';
    document.getElementById('exchangeUsdVndOld').value = '';
    document.getElementById('exchangeEurVnd').value = '';
    document.getElementById('rubAmount').value = '';
    document.getElementById('vndAmount').value = '';
    document.getElementById('newUsd').checked = false;
    document.querySelector('input[name="currency"][value="USD"]').checked = true;
    
    lastActiveField = 'rub';
    
    // Очищаем localStorage
    try {
        localStorage.removeItem('currencyCalculatorData');
    } catch (e) {
        console.warn('Не удалось очистить localStorage:', e);
    }
    
    // Пересчитываем
    calculate();
    updateFloatingDifference();
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

// Проверка видимости элемента
function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Элемент считается скрытым, если его нижняя граница находится ниже видимой области
    return rect.bottom <= windowHeight;
}

// Проверка необходимости показать плавающий блок
function shouldShowFloatingDifference() {
    // Проверяем, что все необходимые поля заполнены для расчета
    const isUsd = document.querySelector('input[name="currency"]:checked').value === 'USD';
    const isNewUsd = document.getElementById('newUsd').checked;
    
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    const rubAmount = getNumericValue('rubAmount');
    const vndAmount = getNumericValue('vndAmount');
    
    let usdExchange = isNewUsd ? getNumericValue('exchangeUsdVndNew') : getNumericValue('exchangeUsdVndOld');
    const eurExchange = getNumericValue('exchangeEurVnd');
    
    const hasAllData = usdPrice && eurPrice && usdExchange && eurExchange && (rubAmount > 0 || vndAmount > 0);
    
    if (!hasAllData) return false;
    
    // Проверяем, скрыто ли поле vndAmount
    const vndAmountGroup = document.getElementById('vndAmountGroup');
    return !isElementVisible(vndAmountGroup);
}

// Обновление плавающего блока разности
function updateFloatingDifference() {
    const floatingBlock = document.getElementById('floatingDifference');
    const floatingResult = document.getElementById('floatingDifferenceResult');
    const mainResult = document.getElementById('differenceResult');
    
    // Копируем содержимое из основного блока
    floatingResult.innerHTML = mainResult.innerHTML;
    
    // Показываем или скрываем плавающий блок
    if (shouldShowFloatingDifference()) {
        floatingBlock.classList.add('show');
    } else {
        floatingBlock.classList.remove('show');
    }
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
        
        saveData();
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
    saveData();
    calculate();
    updateConversion(); // Обновить конвертацию после очистки
}

// Clear conversion fields
function clearConversion() {
    document.getElementById('rubAmount').value = '';
    document.getElementById('vndAmount').value = '';
    lastActiveField = 'rub'; // Сбросить к значению по умолчанию
    saveData();
    calculateDifference(); // Пересчитать разницу
    updateFloatingDifference();
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
        document.getElementById('rubAmount').value = rub.toFixed(2).replace('.', ',');
    }
}

// Main calculation function
function calculate() {
    // Calculate differences for exchange rates
    const marketUsd = getNumericValue('marketUsdVnd');
    const marketEur = getNumericValue('marketEurVnd');
    const usdPrice = getNumericValue('usdPrice');
    const eurPrice = getNumericValue('eurPrice');
    
    // USD New difference - corrected formula
    const exchangeUsdNew = getNumericValue('exchangeUsdVndNew');
    if (marketUsd && exchangeUsdNew && usdPrice) {
        const diff = marketUsd - exchangeUsdNew;
        const rubDiff = diff / (exchangeUsdNew / usdPrice);
        document.getElementById('diffUsdNew').style.display = 'block';
        document.getElementById('diffUsdNew').innerHTML = 
            `Разница c биржевым курсом: ${diff.toLocaleString('ru-RU')} ₫ ≈ ${Math.abs(rubDiff).toFixed(2).replace('.', ',')} ₽`;
    } else {
        document.getElementById('diffUsdNew').style.display = 'none';
    }
    
    // USD Old difference - corrected formula
    const exchangeUsdOld = getNumericValue('exchangeUsdVndOld');
    if (marketUsd && exchangeUsdOld && usdPrice) {
        const diff = marketUsd - exchangeUsdOld;
        const rubDiff = diff / (exchangeUsdOld / usdPrice);
        document.getElementById('diffUsdOld').style.display = 'block';
        document.getElementById('diffUsdOld').innerHTML = 
            `Разница c биржевым курсом: ${diff.toLocaleString('ru-RU')} ₫ ≈ ${Math.abs(rubDiff).toFixed(2).replace('.', ',')} ₽`;
    } else {
        document.getElementById('diffUsdOld').style.display = 'none';
    }
    
    // EUR difference - corrected formula
    const exchangeEur = getNumericValue('exchangeEurVnd');
    if (marketEur && exchangeEur && eurPrice) {
        const diff = marketEur - exchangeEur;
        const rubDiff =