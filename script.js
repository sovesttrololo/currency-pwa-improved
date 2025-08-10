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

       function exchangeDiff(market, exchange, prise, element) {
             if (market && exchange && prise) {
                const diff = market - exchange;
                const rubDiff = diff / (exchange / prise);
                document.getElementById(element).style.display = 'block';
                document.getElementById(element).innerHTML = 
                    `Разница c биржевым курсом: ${diff.toLocaleString('ru-RU')} ₫ ≈ ${Math.abs(rubDiff).toFixed(2).replace('.', ',')} ₽`;
            } else {
                document.getElementById('element').style.display = 'none';
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
            } else {
                document.getElementById('differenceResult').innerHTML = 'Введите данные для расчета';
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Set default values for testing
            // Remove these lines in production
        });
