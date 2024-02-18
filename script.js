function numberWithCommas(x) {
    // 숫자를 문자열로 변환 후, 정수 부분과 소수점 이하 부분을 분리
    const parts = x.toString().split(".");
    // 정수 부분에만 콤마를 적용
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // 정수 부분과 소수점 이하 부분을 다시 합쳐서 반환
    return parts.join(".");
}

// 코인 리스트를 가져오는 API 호출
async function fetchCoinList() {
  try {    
    const response = await fetch('https://api.upbit.com/v1/market/all');
    const data = await response.json();
    const selectElement = document.getElementById('coinName');
    // 가져온 코인 리스트를 셀렉트 박스에 추가
    data.forEach(coin => {
      if (coin.market.includes('KRW')) {
        const option = document.createElement('option');
        option.text = coin.market;
        option.value = coin.market;
        selectElement.appendChild(option);
      }
    });    
    fetchCurrentPrice(); // 페이지 로드 시 코인 시세 바로 조회
  } catch (error) {
    console.error('Error fetching coin list:', error);
  }
}

// 코인명 변경 이벤트 추가
const coinNameInput = document.getElementById('coinName');
coinNameInput.addEventListener('change', fetchCurrentPrice);

// 선택된 코인의 현재 시세를 가져오는 API 호출
async function fetchCurrentPrice() {
  try {   
    const coinName = document.getElementById('coinName').value;
    const response = await fetch(`https://api.upbit.com/v1/ticker?markets=${coinName}`);
    const data = await response.json();
    const currentPrice = data[0].trade_price;
    // 현재 시세를 입력란에 표시
    document.getElementById('currentPrice').value = numberWithCommas(currentPrice);
    calculateDecayRate(); // 코인 시세를 가져온 후 감식 공식을 계산합니다.
  } catch (error) {
    console.error('Error fetching current price:', error);
  }
}

// 감액공식
function calculateDecayRate() {
  try {
    const currentValue = parseFloat(document.getElementById('currentPrice').value.replace(/,/g, '')); // 초기값(코인 시세)
    const numberOfSteps = parseInt(document.getElementById('splits').value); // 단계수(분할횟수)
    const totalInterval = parseFloat(document.getElementById('interval').value) / 100; // 전체간격(변동율)

    // 계산된 감소율을 입력칸에 표시 (소수점 두 자리까지)
    const decayRate = (1 - Math.pow(1 - totalInterval, 1 / (numberOfSteps - 1))) * 100;
    document.getElementById('decayRate').value = decayRate.toFixed(2);

    // 주문 가격 계산 호출
    calculateOrderPrices();
  } catch (error) {
    console.error('Error calculating decay rate:', error);
  }
}

// 1. 주문가격
function calculateOrderPrices() {
  try {
    const currentValue = parseFloat(document.getElementById('currentPrice').value.replace(/,/g, '')); // 초기값(코인 시세)
    const numberOfSteps = parseInt(document.getElementById('splits').value); // 단계수(분할횟수)
    const totalInterval = parseFloat(document.getElementById('interval').value) / 100; // 전체간격(변동율)
    const decayRate = parseFloat(document.getElementById('decayRate').value) / 100; // 감소율

    const orderPrices = [];
    let orderPrice = currentValue; // 초기값으로 설정

    // 각 단계별 주문가격 계산
    for (let i = 0; i < numberOfSteps; i++) {
      orderPrices.push(orderPrice.toFixed(0)); // 현재 주문가격을 배열에 추가
      orderPrice -= orderPrice * decayRate; // 감소율을 적용하여 다음 주문가격 계산
    }

    // 계산된 주문가격 배열 반환
    return orderPrices;
  } catch (error) {
    console.error('Error calculating order prices:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

// 2. 주문간격%
function calculateOrderIntervals(orderPrices) {
  try {
    const orderIntervals = [];   
    for (let i = 0; i < orderPrices.length; i++) {
      const interval = ((orderPrices[i] - orderPrices[0]) / orderPrices[0]) * 100;
      orderIntervals.push(interval.toFixed(2));
    }
    return orderIntervals;
  } catch (error) {
    console.error('Error calculating order intervals:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

// 3. 주문금액
function calculateOrderAmounts() {
  try {
    // 사용자가 입력한 값 가져오기
    const margin = parseFloat(document.getElementById('margin').value.replace(/,/g, ''));
    const leverage = parseFloat(document.getElementById('leverage').value);
    const amountRatio = parseFloat(document.getElementById('amountRatio').value);
    const splits = parseInt(document.getElementById('splits').value);

    // 총 자금 계산
    const totalAmount = margin * leverage;

    // 첫 번째 주문 금액 계산
    const firstOrderAmount = totalAmount / ((1 - Math.pow(amountRatio, splits)) / (1 - amountRatio));

    // 각 분할 주문 금액 계산 및 저장
    let orderAmounts = [];
    for (let i = 0; i < splits; i++) {
      const orderAmount = firstOrderAmount * Math.pow(amountRatio, i);
      orderAmounts.push(orderAmount.toFixed(0)); // 소수점 4자리까지 표시
    }
    return orderAmounts;
  } catch (error) {
    console.error('Error calculating order amounts:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

// 4. 주문수량
function calculateOrderQuantities(orderAmounts, orderPrices) {
  try {
    const orderQuantities = [];
    for (let i = 0; i < orderAmounts.length; i++) {
      const quantity = orderAmounts[i] / orderPrices[i];
      orderQuantities.push(quantity.toFixed(4));
    }
    return orderQuantities;
  } catch (error) {
    console.error('Error calculating order quantities:', error);
    return [];
  }
}

// 5. 주문누적금액
function calculateAccumulatedOrderAmounts(orderAmounts) {
  try {
    const accumulatedOrderAmounts = [];
    let accumulatedAmount = 0;

    for (let i = 0; i < orderAmounts.length; i++) {
      accumulatedAmount += parseFloat(orderAmounts[i]);
      accumulatedOrderAmounts.push(accumulatedAmount.toFixed(0));
    }

    return accumulatedOrderAmounts;
  } catch (error) {
    console.error('Error calculating accumulated order amounts:', error);
    return [];
  }
}

// 6. 주문누적수량
function calculateAccumulatedOrderQuantities(orderQuantities) {
  try {
    const accumulatedOrderQuantities = [];
    let accumulatedQuantity = 0;
    for (let i = 0; i < orderQuantities.length; i++) {
      accumulatedQuantity += parseFloat(orderQuantities[i]);
      accumulatedOrderQuantities.push(accumulatedQuantity.toFixed(4));
    }
    return accumulatedOrderQuantities;
  } catch (error) {
    console.error('Error calculating accumulated order quantities:', error);
    return [];
  }
}

// 평균매수가 계산 함수
function calculateAveragePurchasePrices(accumulatedOrderAmounts, accumulatedOrderQuantities) {
  try {
    const averagePurchasePrices = [];
    for (let i = 0; i < accumulatedOrderAmounts.length; i++) {
      const averagePrice = parseFloat(accumulatedOrderAmounts[i]) / parseFloat(accumulatedOrderQuantities[i]);
      averagePurchasePrices.push(averagePrice.toFixed(2));
    }
    return averagePurchasePrices;
  } catch (error) {
    console.error('Error calculating average purchase prices:', error);
    return [];
  }
}

// 평단가변동율 계산 함수
function calculateAveragePriceFluctuation(orderPrices, averagePurchasePrices) {
  try {
    const averagePriceFluctuations = [];
    for (let i = 0; i < orderPrices.length; i++) {
      const priceFluctuation = ((parseFloat(orderPrices[i]) - parseFloat(averagePurchasePrices[i])) / parseFloat(averagePurchasePrices[i])) * 100;
      averagePriceFluctuations.push(priceFluctuation.toFixed(2));
    }
    return averagePriceFluctuations;
  } catch (error) {
    console.error('Error calculating average price fluctuations:', error);
    return [];
  }
}

function calculateTakeProfitValues(takeProfit, takeProfitIncrease, averagePurchasePrices) {
  const takeProfitValues = [];
  let currentTakeProfit = takeProfit;

  for (let i = 0; i < averagePurchasePrices.length; i++) {
    const takeProfitPrice = parseFloat(averagePurchasePrices[i]) * (1 + currentTakeProfit / 100);
    takeProfitValues.push({ takeProfitPrice: takeProfitPrice.toFixed(2), takeProfitPercentage: currentTakeProfit.toFixed(2) });
    currentTakeProfit += takeProfitIncrease;
  }

  return takeProfitValues;
}

// 하락반등폭 계산 함수
function calculateDeclineRebound(orderPrices, takeProfitPrices) {
  try {
    const declineRebounds = [];
    for (let i = 0; i < orderPrices.length; i++) {
      const declineReboundPercentage = ((parseFloat(takeProfitPrices[i]) - parseFloat(orderPrices[i])) / parseFloat(orderPrices[i])) * 100;
      declineRebounds.push(declineReboundPercentage.toFixed(2)); // 소수점 둘째 자리까지 표시
    }
    return declineRebounds;
  } catch (error) {
    console.error('Error calculating decline rebound:', error);
    return [];
  }
}

// 수익금액을 계산하는 함수
function calculateProfitAmount(accumulatedOrderAmounts, takeProfitValues) {
  try {
    const profitAmounts = [];
    for (let i = 0; i < accumulatedOrderAmounts.length; i++) {
      const profitAmount = accumulatedOrderAmounts[i] * parseFloat(takeProfitValues[i].takeProfitPercentage) / 100;
      profitAmounts.push(profitAmount.toFixed(0));
    }
    return profitAmounts;
  } catch (error) {
    console.error('Error calculating profit amounts:', error);
    return [];
  }
}

// 수익률을 계산하는 함수
function calculateProfitRates(margin, profitAmounts) {
  try {
    const profitRates = [];
    for (let i = 0; i < profitAmounts.length; i++) {
      const profitRate = (profitAmounts[i] / margin) * 100;
      profitRates.push(profitRate.toFixed(2));
    }
    return profitRates;
  } catch (error) {
    console.error('Error calculating profit rates:', error);
    return [];
  }
}

// 수익금액을 계산하는 함수
function calculateProfitAmount(accumulatedOrderAmounts, takeProfitValues) {
  try {
    const profitAmounts = [];
    for (let i = 0; i < accumulatedOrderAmounts.length; i++) {
      const profitAmount = accumulatedOrderAmounts[i] * parseFloat(takeProfitValues[i].takeProfitPercentage) / 100;
      profitAmounts.push(profitAmount.toFixed(0));
    }
    return profitAmounts;
  } catch (error) {
    console.error('Error calculating profit amounts:', error);
    return [];
  }
}

function calculate() {
  fetchCurrentPrice();
  const splits = parseInt(document.getElementById('splits').value); // splits 변수 정의

  // 주문가격, 주문간격, 주문금액, 주문수량 계산
  const orderPrices = calculateOrderPrices();
  const orderIntervals = calculateOrderIntervals(orderPrices);
  const orderAmounts = calculateOrderAmounts(); // 필요한 인자들이 함수 내에서 계산됨

  // 주문수량, 주문누적수량 계산
  const orderQuantities = calculateOrderQuantities(orderAmounts, orderPrices);
  const accumulatedOrderAmounts = calculateAccumulatedOrderAmounts(orderAmounts);
  const accumulatedOrderQuantities = calculateAccumulatedOrderQuantities(orderQuantities);

  // 평균매수가 계산, 평단가변동율 계산
  const averagePurchasePrices = calculateAveragePurchasePrices(accumulatedOrderAmounts, accumulatedOrderQuantities); 
  const averagePriceFluctuations = calculateAveragePriceFluctuation(orderPrices, averagePurchasePrices);

  // 익절가격, 익절간격 계산, 하락반등폭 계산
  const takeProfit = parseFloat(document.getElementById('takeProfit').value);
  const takeProfitIncrease = parseFloat(document.getElementById('takeProfitIncrease').value);
  const takeProfitValues = calculateTakeProfitValues(takeProfit, takeProfitIncrease, averagePurchasePrices);
  const declineRebounds = calculateDeclineRebound(orderPrices, takeProfitValues.map(value => parseFloat(value.takeProfitPrice))); // 수정된 부분

  // 수익금액 계산
  const profitAmounts = calculateProfitAmount(accumulatedOrderAmounts, takeProfitValues);

  // 수익률 계산
  const margin = parseFloat(document.getElementById('margin').value.replace(/,/g, '')); // 마진값 가져오기
  const profitRates = calculateProfitRates(margin, profitAmounts);

  // 테이블에 출력할 테이블 요소 가져오기
  const resultsTable = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
  resultsTable.innerHTML = '';

  // 각 단계별 주문가격, 주문간격, 주문금액, 주문수량, 주문누적수량, 평균매수가, 평단가변동율, 익절가격, 익절간격, 하락반등폭, 수익금액, 수익률을 테이블에 추가
  for (let i = 0; i < splits; i++) {
    const row = resultsTable.insertRow();
    const orderCell = row.insertCell(0);
    const orderPriceCell = row.insertCell(1);
    const orderIntervalCell = row.insertCell(2);
    const orderAmountCell = row.insertCell(3);
    const orderQuantityCell = row.insertCell(4);
    const accumulatedOrderAmountCell = row.insertCell(5);
    const accumulatedOrderQuantityCell = row.insertCell(6);
    const averagePurchasePriceCell = row.insertCell(7);
    const averagePriceFluctuationCell = row.insertCell(8);
    const takeProfitPriceCell = row.insertCell(9);
    const takeProfitIntervalCell = row.insertCell(10);
    const declineReboundCell = row.insertCell(11);
    const profitAmountCell = row.insertCell(12); // 수정된 부분
    const profitRateCell = row.insertCell(13); // 수정된 부분

    // 주문가격, 주문간격, 주문금액, 주문수량, 주문누적수량, 평균매수가, 평단가변동율, 익절가격, 익절간격, 하락반등폭, 수익금액, 수익률을 테이블에 표시 (소수점 둘째 자리까지)
    orderCell.textContent = i + 1;
    orderPriceCell.textContent = numberWithCommas(orderPrices[i]);
    orderIntervalCell.textContent = orderIntervals[i] + "%";
    orderAmountCell.textContent = numberWithCommas(orderAmounts[i]);
    orderQuantityCell.textContent = orderQuantities[i];
    accumulatedOrderAmountCell.textContent = numberWithCommas(accumulatedOrderAmounts[i]);
    accumulatedOrderQuantityCell.textContent = numberWithCommas(accumulatedOrderQuantities[i]);
    averagePurchasePriceCell.textContent = numberWithCommas(averagePurchasePrices[i]);
    averagePriceFluctuationCell.textContent = averagePriceFluctuations[i] + "%";
    takeProfitPriceCell.textContent = takeProfitValues[i].takeProfitPrice;
    takeProfitIntervalCell.textContent = takeProfitValues[i].takeProfitPercentage + "%"; // 수정된 부분
    declineReboundCell.textContent = declineRebounds[i] + "%";
    profitAmountCell.textContent = numberWithCommas(profitAmounts[i]); // 수정된 부분
    profitRateCell.textContent = profitRates[i] + "%"; // 수정된 부분
  }
}

// 페이지 로드시 코인 리스트 가져오기
fetchCoinList();
